# SPDX-License-Identifier: MIT
# Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
# This file is part of ev-charging-app and is licensed under the
# MIT License. See the LICENSE file in the project root for details.

from typing import Any, Dict, List
import asyncio
import json
import logging
import os
import re
from datetime import datetime, timedelta
from math import asin, cos, radians, sin, sqrt

import httpx
from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.security import OAuth2PasswordRequestForm
import secrets
from bson import ObjectId
from bson.errors import InvalidId

from .db import (
    get_citizens_collection,
    get_sessions_collection,
    get_sensors_collection,
    get_stations_collection,
    get_favorites_collection,
    get_users_collection,
    get_pending_registrations_collection,
)
from .etl import (
    get_default_data_dir,
    get_property_value,
    import_session_entity,
    import_station_entity,
    import_sensor_entity,
)
from .models import (
    CitizenProfile,
    CitizenSessionsStats,
    StationBase,
    SessionBase,
    StationRealtime,
    UserRegister,
    UserLogin,
    UserRegisterVerify,
    UserResponse,
    UserUpdate,
    UserUpdateRole,
    UserListResponse,
    Token,
    OTPInitiateResponse,
)
from .auth import (
    authenticate_user,
    create_access_token,
    get_password_hash,
    get_current_active_user,
    get_current_admin,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from .email import send_otp_email

OTP_EXPIRATION_SECONDS = 5 * 60  # 5 minutes
logger = logging.getLogger(__name__)

def _normalize_email(email: str) -> str:
    return email.strip().lower()

def _find_user_by_id(users_collection, user_id: str) -> dict | None:
    """Find user by ID, trying both ObjectId and string formats"""

    try:
        user_doc = users_collection.find_one({"_id": ObjectId(user_id)})
        if user_doc:
            return user_doc
    except (InvalidId, ValueError):
        pass
    
    user_doc = users_collection.find_one({"_id": user_id})
    if user_doc:
        return user_doc
    
    user_doc = users_collection.find_one({"username": user_id})
    return user_doc

def _ensure_email_available(email: str, username: str) -> None:
    normalized_email = _normalize_email(email)
    users_collection = get_users_collection()
    pending_collection = get_pending_registrations_collection()

    email_pattern = re.compile(f"^{re.escape(email)}$", re.IGNORECASE)

    existing_user = users_collection.find_one({"email": email_pattern})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email đã tồn tại",
        )

    existing_pending = pending_collection.find_one({"email": email_pattern})
    if existing_pending and existing_pending.get("username") != username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email đang được sử dụng cho một đăng ký khác",
        )

def _dispatch_otp(username: str, email: str, otp: str) -> bool:
    sent = send_otp_email(username, email, otp)
    if not sent:
        logger.error("Dispatching OTP email failed for %s (%s)", username, email)
    return sent

def _generate_otp() -> str:
    return f"{secrets.randbelow(1000000):06d}"

def _store_pending_registration(user_data: UserRegister, otp: str) -> int:
    pending_collection = get_pending_registrations_collection()
    now = datetime.utcnow()
    pending_collection.update_one(
        {"username": user_data.username},
        {
            "$set": {
                "username": user_data.username,
                "password": user_data.password,
                "email": user_data.email,
                "email_normalized": _normalize_email(user_data.email),
                "name": user_data.name,
                "role": user_data.role,
                "otp": otp,
                "created_at": now,
                "expires_at": now + timedelta(seconds=OTP_EXPIRATION_SECONDS),
            }
        },
        upsert=True,
    )
    return OTP_EXPIRATION_SECONDS

def _validate_pending_registration(username: str, otp: str) -> dict:
    pending_collection = get_pending_registrations_collection()
    pending = pending_collection.find_one({"username": username})
    if not pending or pending.get("otp") != otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP không hợp lệ",
        )
    expires_at = pending.get("expires_at")
    if expires_at and expires_at < datetime.utcnow():
        pending_collection.delete_one({"_id": pending["_id"]})
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP đã hết hạn",
        )
    return pending

def _finalize_registration(pending: dict) -> UserResponse:
    users_collection = get_users_collection()
    existing_user = users_collection.find_one({"username": pending["username"]})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên đăng nhập đã được đăng ký",
        )

    _ensure_email_available(pending.get("email", ""), pending["username"])

    hashed_password = get_password_hash(pending["password"])
    user_doc = {
        "username": pending["username"],
        "hashed_password": hashed_password,
        "email": pending.get("email"),
        "email_normalized": pending.get("email_normalized") or _normalize_email(pending.get("email", "")),
        "name": pending.get("name"),
        "role": pending.get("role", "citizen"),
        "is_locked": False,
        "created_at": datetime.utcnow(),
    }

    result = users_collection.insert_one(user_doc)
    get_pending_registrations_collection().delete_one({"_id": pending["_id"]})

    return UserResponse(
        id=str(result.inserted_id),
        username=user_doc["username"],
        email=user_doc.get("email"),
        name=user_doc.get("name"),
        role=user_doc["role"],
        is_locked=user_doc.get("is_locked", False),
    )

app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: Dict[str, Any]) -> None:
        stale: List[WebSocket] = []
        for websocket in self.active_connections:
            try:
                await websocket.send_json(message)
            except Exception:
                stale.append(websocket)
        for websocket in stale:
            self.disconnect(websocket)

manager = ConnectionManager()
REALTIME_SLEEP_SECONDS = 2.0
REALTIME_CONTEXT: Any | None = None

@app.get("/health", tags=["System"], summary="Health check")
def health() -> Dict[str, str]:
    return {"status": "ok"}

@app.post(
    "/auth/register",
    response_model=OTPInitiateResponse,
    tags=["Auth"],
    summary="Initiate registration and send OTP",
)
def register(user_data: UserRegister) -> OTPInitiateResponse:
    users_collection = get_users_collection()

    existing_user = users_collection.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên đăng nhập đã được đăng ký",
        )

    if user_data.role not in ["citizen", "manager", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vai trò phải là 'citizen', 'manager' hoặc 'admin'",
        )

    _ensure_email_available(user_data.email, user_data.username)

    otp = _generate_otp()
    expires_in = _store_pending_registration(user_data, otp)

    sent = _dispatch_otp(user_data.username, user_data.email, otp)
    if not sent:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể gửi OTP, vui lòng thử lại",
        )

    return OTPInitiateResponse(
        message="OTP đã được gửi tới email xác thực. Vui lòng kiểm tra và xác nhận.",
        otp_expires_in=expires_in,
    )

@app.post(
    "/auth/register/verify",
    response_model=UserResponse,
    tags=["Auth"],
    summary="Verify OTP and complete registration",
)
def verify_registration(payload: UserRegisterVerify) -> UserResponse:
    pending = _validate_pending_registration(payload.username, payload.otp)
    return _finalize_registration(pending)

@app.post(
    "/auth/login",
    response_model=Token,
    tags=["Auth"],
    summary="Login and get access token",
)
def login(form_data: OAuth2PasswordRequestForm = Depends()) -> Token:
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tên đăng nhập hoặc mật khẩu không đúng",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"]}, expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=str(user.get("_id", user.get("id", ""))),
            username=user.get("username", ""),
            email=user.get("email"),
            name=user.get("name"),
            role=user.get("role", "citizen"),
            is_locked=user.get("is_locked", False),
        ),
    )

@app.get(
    "/auth/me",
    response_model=UserResponse,
    tags=["Auth"],
    summary="Get current user information",
)
def get_current_user_info(
    current_user: UserResponse = Depends(get_current_active_user),
) -> UserResponse:
    return current_user

@app.patch(
    "/auth/me",
    response_model=UserResponse,
    tags=["Auth"],
    summary="Update current user information",
)
def update_current_user_info(
    user_update: UserUpdate,
    current_user: UserResponse = Depends(get_current_active_user),
) -> UserResponse:
    users_collection = get_users_collection()
    
    user_doc = users_collection.find_one({"_id": current_user.id})
    if not user_doc:
        user_doc = users_collection.find_one({"username": current_user.username})
    
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy người dùng",
        )
    
    updates: Dict[str, Any] = {}
    if user_update.name is not None:
        updates["name"] = user_update.name
    if user_update.email is not None:
        updates["email"] = user_update.email
    if user_update.phone_number is not None:
        updates["phone_number"] = user_update.phone_number
    
    if not updates:
        return current_user
    
    updates["updated_at"] = datetime.now()
    users_collection.update_one({"_id": user_doc["_id"]}, {"$set": updates})
    
    # Fetch updated user
    updated_doc = users_collection.find_one({"_id": user_doc["_id"]})
    return UserResponse(
        id=str(updated_doc.get("_id", user_doc["_id"])),
        username=updated_doc.get("username", current_user.username),
        email=updated_doc.get("email"),
        name=updated_doc.get("name"),
        role=updated_doc.get("role", current_user.role),
        is_locked=updated_doc.get("is_locked", False),
    )

def load_realtime_events() -> List[Dict[str, Any]]:
    global REALTIME_CONTEXT
    data_dir = get_default_data_dir()
    path = data_dir / "realtime_sample.json"
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    REALTIME_CONTEXT = data.get("@context")
    events: List[Dict[str, Any]] = data.get("events", [])
    return events

def get_ngsi_context_value() -> Any:
    global REALTIME_CONTEXT
    if REALTIME_CONTEXT is None:
        load_realtime_events()
    return REALTIME_CONTEXT

def _doc_to_ngsi_entity(doc: Dict[str, Any]) -> Dict[str, Any]:
    raw = doc.get("raw")
    if isinstance(raw, dict):
        entity: Dict[str, Any] = dict(raw)
    else:
        entity = {k: v for k, v in doc.items() if k not in {"_id"}}

    ctx = get_ngsi_context_value()
    if "@context" not in entity:
        entity = {"@context": ctx, **entity}
    return entity

def _get_citizen_profile_or_404(user_id: str) -> CitizenProfile:
    collection = get_citizens_collection()
    doc = collection.find_one({"_id": user_id})
    if not doc:
        doc = collection.find_one({"id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy công dân")
    return CitizenProfile(**doc)

def _apply_citizen_time_filters(
    query: Dict[str, Any], start_date: datetime | None, end_date: datetime | None
) -> Dict[str, Any]:
    time_filter: Dict[str, Any] = {}
    if start_date is not None:
        time_filter["$gte"] = start_date
    if end_date is not None:
        time_filter["$lte"] = end_date
    if time_filter:
        query["start_date_time"] = time_filter
    return query

async def apply_realtime_event(event: Dict[str, Any]) -> None:
    entity = event.get("entity", {})
    operation = event.get("operation")
    entity_type = entity.get("type")

    if entity_type == "EVChargingStation" and operation == "update":
        stations_collection = get_stations_collection()
        station_id = entity.get("id")
        if not station_id:
            return

        updates: Dict[str, Any] = {}
        raw_updates: Dict[str, Any] = {}
        available_attr = entity.get("availableCapacity")
        if isinstance(available_attr, dict):
            value = available_attr.get("value")
            if value is not None:
                updates["available_capacity"] = value
                raw_updates["raw.availableCapacity.value"] = value
            observed_at_available = available_attr.get("observedAt")
            if observed_at_available is not None:
                raw_updates["raw.availableCapacity.observedAt"] = observed_at_available

        status_attr = entity.get("status")
        observed_at = None
        if isinstance(status_attr, dict):
            status_value = status_attr.get("value")
            if status_value is not None:
                updates["status"] = status_value
            observed_at = status_attr.get("observedAt")
            if status_value is not None:
                raw_updates["raw.status.value"] = status_value
            if observed_at is not None:
                raw_updates["raw.status.observedAt"] = observed_at

        power_attr = entity.get("instantaneousPower")
        if isinstance(power_attr, dict):
            value = power_attr.get("value")
            if value is not None:
                updates["instantaneous_power"] = value
                raw_updates["raw.instantaneousPower.value"] = value

        queue_attr = entity.get("queueLength")
        if isinstance(queue_attr, dict):
            value = queue_attr.get("value")
            if value is not None:
                updates["queue_length"] = value
                raw_updates["raw.queueLength.value"] = value

        if not updates:
            return

        mongo_update: Dict[str, Any] = {"$set": updates}
        if raw_updates:
            mongo_update["$set"].update(raw_updates)

        stations_collection.update_one({"_id": station_id}, mongo_update)

        payload: Dict[str, Any] = {
            "type": "station_update",
            "stationId": station_id,
            "payload": {
                "available_capacity": updates.get("available_capacity"),
                "status": updates.get("status"),
                "instantaneous_power": updates.get("instantaneous_power"),
                "queue_length": updates.get("queue_length"),
                "observedAt": observed_at,
            },
        }
        await manager.broadcast(payload)

    elif entity_type == "EVChargingSession" and operation == "upsert":
        sessions_collection = get_sessions_collection()
        import_session_entity(entity, sessions_collection)

        session_id = entity.get("id")
        station_id = entity.get("refFeatureOfInterest", {}).get("object")
        vehicle_type = get_property_value(entity, "vehicleType")
        start_time = get_property_value(entity, "startDateTime")
        end_time = get_property_value(entity, "endDateTime")
        power_kwh = get_property_value(entity, "powerConsumption")
        amount_vnd = get_property_value(entity, "amountCollected")
        tax_vnd = get_property_value(entity, "taxAmountCollected")

        payload = {
            "type": "session_upsert",
            "sessionId": session_id,
            "stationId": station_id,
            "payload": {
                "vehicle_type": vehicle_type,
                "start_date_time": start_time,
                "end_date_time": end_time,
                "power_consumption_kwh": power_kwh,
                "amount_collected_vnd": amount_vnd,
                "tax_amount_collected_vnd": tax_vnd,
            },
        }
        await manager.broadcast(payload)

async def realtime_worker() -> None:
    events = load_realtime_events()
    if not events:
        return
    while True:
        for event in events:
            await apply_realtime_event(event)
            await asyncio.sleep(REALTIME_SLEEP_SECONDS)

def create_default_users() -> None:
    """Create default users if they don't exist"""
    try:
        users_collection = get_users_collection()
        
        default_users = [
            {
                "username": "citizen",
                "password": "citizen123",
                "name": "Nguyễn Uyên Vy",
                "email": "citizen1@example.org",
                "role": "citizen",
                "user_id": "citizen_user_1",
            },
            {
                "username": "citizen2",
                "password": "citizen123",
                "name": "Cao Võ Tuấn Kiệt",
                "email": "citizen2@example.org",
                "role": "citizen",
                "user_id": "citizen_user_2",
            },
            {
                "username": "manager",
                "password": "manager123",
                "name": "Nguyễn Ngọc Phú Tỷ",
                "email": "manager@example.com",
                "role": "manager",
                "user_id": None,
            },
            {
                "username": "admin",
                "password": "admin123",
                "name": "Quản trị viên",
                "email": "admin@example.com",
                "role": "admin",
                "user_id": None,
            },
        ]
        
        for user_data in default_users:
            existing = users_collection.find_one({"username": user_data["username"]})
            if not existing:
                hashed_password = get_password_hash(user_data["password"])
                user_doc = {
                    "username": user_data["username"],
                    "hashed_password": hashed_password,
                    "email": user_data["email"],
                    "name": user_data["name"],
                    "role": user_data["role"],
                    "is_locked": False,
                    "created_at": datetime.now(),
                }
                # Set _id to match citizen_user_1 for citizen account to align with session data
                if user_data.get("user_id"):
                    user_doc["_id"] = user_data["user_id"]
                    user_doc["id"] = user_data["user_id"]
                
                users_collection.insert_one(user_doc)
                print(f"Created default user: {user_data['username']} (role: {user_data['role']}, id: {user_doc.get('_id', 'auto')})")
            else:
                print(f"Default user '{user_data['username']}' already exists")
    except Exception as e:
        print(f"Warning: Could not create default users: {e}")

@app.on_event("startup")
async def on_startup() -> None:
    create_default_users()
    asyncio.create_task(realtime_worker())

@app.websocket("/ws/realtime")
async def websocket_realtime(websocket: WebSocket) -> None:
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

@app.get(
    "/stations",
    response_model=List[StationBase],
    tags=["Stations"],
    summary="List charging stations",
)
def list_stations(
    status: str | None = Query(None),
    network: str | None = Query(None),
    vehicle_type: str | None = Query(None),
    min_available_capacity: int | None = Query(None, ge=0),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> List[StationBase]:
    collection = get_stations_collection()
    query: Dict[str, Any] = {}

    if status is not None:
        query["status"] = status
    if network is not None:
        query["network"] = network
    if vehicle_type is not None:
        query["allowed_vehicle_types"] = vehicle_type
    if min_available_capacity is not None:
        query["available_capacity"] = {"$gte": min_available_capacity}

    cursor = collection.find(query).skip(offset).limit(limit)
    return [StationBase(**doc) for doc in cursor]

@app.get(
    "/stations/near",
    response_model=List[StationBase],
    tags=["Stations"],
    summary="Find nearby charging stations",
)
def get_stations_near(
    lat: float = Query(..., description="Latitude of reference point"),
    lng: float = Query(..., description="Longitude of reference point"),
    radius_km: float = Query(5.0, gt=0.0, description="Search radius in kilometers"),
    limit: int = Query(20, ge=1, le=200),
) -> List[StationBase]:
    collection = get_stations_collection()
    cursor = collection.find({})

    candidates: List[Dict[str, Any]] = []
    for doc in cursor:
        location = doc.get("location") or {}
        coordinates = location.get("coordinates")
        if not isinstance(coordinates, list) or len(coordinates) != 2:
            continue
        lon2, lat2 = coordinates
        distance = _haversine_km(lat, lng, lat2, lon2)
        if distance <= radius_km:
            candidates.append(doc)

    return [StationBase(**doc) for doc in candidates[:limit]]

@app.get(
    "/stations/search",
    response_model=List[StationBase],
    tags=["Stations"],
    summary="Advanced search for charging stations",
)
def search_stations(
    status: str | None = Query(None),
    network: str | None = Query(None),
    vehicle_type: str | None = Query(None),
    charge_type: str | None = Query(None),
    payment_method: str | None = Query(None),
    socket_type: str | None = Query(None),
    min_capacity: int | None = Query(None, ge=0),
    max_capacity: int | None = Query(None, ge=0),
    min_available_capacity: int | None = Query(None, ge=0),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> List[StationBase]:
    collection = get_stations_collection()
    query: Dict[str, Any] = {}

    if status is not None:
        query["status"] = status
    if network is not None:
        query["network"] = network
    if vehicle_type is not None:
        query["allowed_vehicle_types"] = vehicle_type
    if charge_type is not None:
        query["charge_types"] = charge_type
    if payment_method is not None:
        query["accepted_payment_methods"] = payment_method
    if socket_type is not None:
        query["socket_types"] = socket_type

    if min_available_capacity is not None:
        query["available_capacity"] = {"$gte": min_available_capacity}

    capacity_range: Dict[str, Any] = {}
    if min_capacity is not None:
        capacity_range["$gte"] = min_capacity
    if max_capacity is not None:
        capacity_range["$lte"] = max_capacity
    if capacity_range:
        query["capacity"] = capacity_range

    cursor = collection.find(query).skip(offset).limit(limit)
    return [StationBase(**doc) for doc in cursor]

@app.get(
    "/stations/{station_id}",
    response_model=StationBase,
    tags=["Stations"],
    summary="Get details of a charging station",
)
def get_station(station_id: str) -> StationBase:
    collection = get_stations_collection()
    doc = collection.find_one({"_id": station_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy trạm sạc")
    return StationBase(**doc)

@app.get(
    "/stations/{station_id}/realtime",
    response_model=StationRealtime,
    tags=["Stations"],
    summary="Get realtime status of a charging station",
)
def get_station_realtime(station_id: str) -> StationRealtime:
    collection = get_stations_collection()
    doc = collection.find_one({"_id": station_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy trạm sạc")
    return StationRealtime(
        id=doc.get("id", station_id),
        status=doc.get("status"),
        available_capacity=doc.get("available_capacity"),
        instantaneous_power=doc.get("instantaneous_power"),
        queue_length=doc.get("queue_length"),
    )

@app.get(
    "/stations/{station_id}/sessions",
    response_model=List[SessionBase],
    tags=["Sessions", "Stations"],
    summary="List charging sessions for a station",
)
def list_station_sessions(
    station_id: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> List[SessionBase]:
    sessions_collection = get_sessions_collection()
    cursor = (
        sessions_collection.find({"station_id": station_id})
        .skip(offset)
        .limit(limit)
    )
    return [SessionBase(**doc) for doc in cursor]

@app.get(
    "/citizens/{user_id}",
    response_model=CitizenProfile,
    tags=["Citizens"],
    summary="Get citizen profile",
)
def get_citizen_profile(user_id: str) -> CitizenProfile:
    return _get_citizen_profile_or_404(user_id)

@app.get(
    "/citizens/{user_id}/sessions",
    response_model=List[SessionBase],
    tags=["Citizens", "Sessions"],
    summary="List citizen charging sessions",
)
def list_citizen_sessions(
    user_id: str,
    station_id: str | None = Query(None),
    start_date: datetime | None = Query(
        None, description="Filter sessions starting at or after this ISO timestamp"
    ),
    end_date: datetime | None = Query(
        None, description="Filter sessions starting at or before this ISO timestamp"
    ),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> List[SessionBase]:
    if start_date and end_date and start_date > end_date:
        raise HTTPException(status_code=400, detail="Ngày bắt đầu phải trước ngày kết thúc")

    _get_citizen_profile_or_404(user_id)

    sessions_collection = get_sessions_collection()
    query: Dict[str, Any] = {"user_id": user_id}
    if station_id is not None:
        query["station_id"] = station_id
    query = _apply_citizen_time_filters(query, start_date, end_date)

    cursor = (
        sessions_collection.find(query)
        .sort("start_date_time", -1)
        .skip(offset)
        .limit(limit)
    )
    return [SessionBase(**doc) for doc in cursor]

@app.get(
    "/citizens/{user_id}/sessions/stats",
    response_model=CitizenSessionsStats,
    tags=["Citizens", "Analytics"],
    summary="Get citizen charging session statistics",
)
def get_citizen_sessions_stats(
    user_id: str,
    station_id: str | None = Query(None),
    start_date: datetime | None = Query(
        None, description="Filter sessions starting at or after this ISO timestamp"
    ),
    end_date: datetime | None = Query(
        None, description="Filter sessions starting at or before this ISO timestamp"
    ),
) -> CitizenSessionsStats:
    if start_date and end_date and start_date > end_date:
        raise HTTPException(status_code=400, detail="Ngày bắt đầu phải trước ngày kết thúc")

    _get_citizen_profile_or_404(user_id)

    sessions_collection = get_sessions_collection()
    query: Dict[str, Any] = {"user_id": user_id}
    if station_id is not None:
        query["station_id"] = station_id
    query = _apply_citizen_time_filters(query, start_date, end_date)

    sessions = list(sessions_collection.find(query))

    total_sessions = len(sessions)
    total_energy_kwh = 0.0
    total_amount_vnd = 0.0
    total_tax_vnd = 0.0
    total_duration_minutes = 0.0

    for doc in sessions:
        energy = float(doc.get("power_consumption_kwh") or 0.0)
        amount = float(doc.get("amount_collected_vnd") or 0.0)
        tax = float(doc.get("tax_amount_collected_vnd") or 0.0)
        duration = doc.get("duration_minutes")
        if duration is None:
            start_dt = doc.get("start_date_time")
            end_dt = doc.get("end_date_time")
            if isinstance(start_dt, datetime) and isinstance(end_dt, datetime):
                duration = (end_dt - start_dt).total_seconds() / 60.0
        total_energy_kwh += energy
        total_amount_vnd += amount
        total_tax_vnd += tax
        total_duration_minutes += float(duration or 0.0)

    average_session_duration_minutes = (
        total_duration_minutes / total_sessions if total_sessions else 0.0
    )
    average_energy_kwh = total_energy_kwh / total_sessions if total_sessions else 0.0
    average_amount_vnd = total_amount_vnd / total_sessions if total_sessions else 0.0

    return CitizenSessionsStats(
        user_id=user_id,
        total_sessions=total_sessions,
        total_energy_kwh=total_energy_kwh,
        total_amount_vnd=total_amount_vnd,
        total_tax_vnd=total_tax_vnd,
        total_duration_minutes=total_duration_minutes,
        average_session_duration_minutes=average_session_duration_minutes,
        average_energy_kwh=average_energy_kwh,
        average_amount_vnd=average_amount_vnd,
    )

@app.get(
    "/analytics/overview",
    tags=["Analytics"],
    summary="Get global EV charging analytics",
)
def analytics_overview() -> Dict[str, Any]:
    sessions_collection = get_sessions_collection()
    stations_collection = get_stations_collection()

    total_sessions = 0
    total_energy_kwh = 0.0
    total_amount_vnd = 0.0
    total_tax_vnd = 0.0

    sessions_by_station: Dict[str, int] = {}

    for doc in sessions_collection.find({}):
        total_sessions += 1
        energy = doc.get("power_consumption_kwh") or 0.0
        amount = doc.get("amount_collected_vnd") or 0.0
        tax = doc.get("tax_amount_collected_vnd") or 0.0
        total_energy_kwh += float(energy)
        total_amount_vnd += float(amount)
        total_tax_vnd += float(tax)

        station_id = doc.get("station_id")
        if station_id:
            sessions_by_station[station_id] = sessions_by_station.get(station_id, 0) + 1

    stations_count = stations_collection.count_documents({})

    top_stations = sorted(
        [
            {"station_id": sid, "session_count": count}
            for sid, count in sessions_by_station.items()
        ],
        key=lambda x: x["session_count"],
        reverse=True,
    )[:5]

    return {
        "total_sessions": total_sessions,
        "total_energy_kwh": total_energy_kwh,
        "total_amount_vnd": total_amount_vnd,
        "total_tax_vnd": total_tax_vnd,
        "stations_count": stations_count,
        "top_stations_by_sessions": top_stations,
    }

@app.get(
    "/analytics/revenue-timeline",
    tags=["Analytics"],
    summary="Get system-wide revenue statistics by day or week with time milestones",
)
def analytics_revenue_timeline(
    period: str = Query("day", description="Time period: 'day' or 'week'"),
    start_date: datetime | None = Query(
        None, description="Start date for filtering (ISO timestamp). If not provided, defaults to last 30 days for 'day' or last 12 weeks for 'week'"
    ),
    end_date: datetime | None = Query(
        None, description="End date for filtering (ISO timestamp). If not provided, defaults to now"
    ),
) -> Dict[str, Any]:
    if period not in ["day", "week"]:
        raise HTTPException(status_code=400, detail="Chu kỳ phải là 'day' hoặc 'week'")
    
    if start_date and end_date and start_date > end_date:
        raise HTTPException(status_code=400, detail="Ngày bắt đầu phải trước ngày kết thúc")
    
    sessions_collection = get_sessions_collection()
    
    now = datetime.now()
    if end_date is None:
        end_date = now
    
    if start_date is None:
        if period == "day":
            start_date = now - timedelta(days=30)
        else:
            start_date = now - timedelta(weeks=12)
    
    query: Dict[str, Any] = {
        "start_date_time": {
            "$gte": start_date,
            "$lte": end_date,
        }
    }
    
    sessions = list(sessions_collection.find(query))
    
    revenue_by_period: Dict[str, Dict[str, Any]] = {}
    
    for doc in sessions:
        start_dt = doc.get("start_date_time")
        if not isinstance(start_dt, datetime):
            continue
        
        amount = float(doc.get("amount_collected_vnd") or 0.0)
        tax = float(doc.get("tax_amount_collected_vnd") or 0.0)
        energy = float(doc.get("power_consumption_kwh") or 0.0)
        
        if period == "day":
            period_key = start_dt.strftime("%Y-%m-%d")
            period_label = start_dt.strftime("%d/%m/%Y")
        else:
            year, week, _ = start_dt.isocalendar()
            period_key = f"{year}-W{week:02d}"
            week_start = start_dt - timedelta(days=start_dt.weekday())
            week_end = week_start + timedelta(days=6)
            period_label = f"{week_start.strftime('%d/%m')} - {week_end.strftime('%d/%m/%Y')}"
        
        if period_key not in revenue_by_period:
            revenue_by_period[period_key] = {
                "period": period_key,
                "period_label": period_label,
                "timestamp": start_dt.isoformat() if period == "day" else week_start.isoformat(),
                "total_amount_vnd": 0.0,
                "total_tax_vnd": 0.0,
                "total_energy_kwh": 0.0,
                "session_count": 0,
            }
        
        revenue_by_period[period_key]["total_amount_vnd"] += amount
        revenue_by_period[period_key]["total_tax_vnd"] += tax
        revenue_by_period[period_key]["total_energy_kwh"] += energy
        revenue_by_period[period_key]["session_count"] += 1
    
    timeline_data = sorted(
        list(revenue_by_period.values()),
        key=lambda x: x["timestamp"]
    )
    
    total_amount = sum(item["total_amount_vnd"] for item in timeline_data)
    total_tax = sum(item["total_tax_vnd"] for item in timeline_data)
    total_energy = sum(item["total_energy_kwh"] for item in timeline_data)
    total_sessions = sum(item["session_count"] for item in timeline_data)
    
    return {
        "period": period,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "timeline": timeline_data,
        "summary": {
            "total_amount_vnd": total_amount,
            "total_tax_vnd": total_tax,
            "total_energy_kwh": total_energy,
            "total_sessions": total_sessions,
            "period_count": len(timeline_data),
        },
    }

@app.get(
    "/analytics/stations/{station_id}",
    tags=["Analytics", "Stations"],
    summary="Get analytics for a specific station",
)
def analytics_station(station_id: str) -> Dict[str, Any]:
    sessions_collection = get_sessions_collection()
    stations_collection = get_stations_collection()

    station_doc = stations_collection.find_one({"_id": station_id})
    if not station_doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy trạm sạc")

    sessions = list(sessions_collection.find({"station_id": station_id}))

    total_sessions = len(sessions)
    total_energy_kwh = 0.0
    total_amount_vnd = 0.0
    total_tax_vnd = 0.0
    total_duration_minutes = 0.0
    vehicle_stats: Dict[str, Dict[str, Any]] = {}

    for doc in sessions:
        energy = doc.get("power_consumption_kwh") or 0.0
        amount = doc.get("amount_collected_vnd") or 0.0
        tax = doc.get("tax_amount_collected_vnd") or 0.0
        total_energy_kwh += float(energy)
        total_amount_vnd += float(amount)
        total_tax_vnd += float(tax)

        start = doc.get("start_date_time")
        end = doc.get("end_date_time")
        if start and end:
            duration = (end - start).total_seconds() / 60.0
            total_duration_minutes += duration

        vtype = doc.get("vehicle_type") or "unknown"
        stats = vehicle_stats.get(vtype)
        if stats is None:
            stats = {
                "vehicle_type": vtype,
                "session_count": 0,
                "total_energy_kwh": 0.0,
            }
            vehicle_stats[vtype] = stats
        stats["session_count"] += 1
        stats["total_energy_kwh"] += float(energy)

    average_session_duration_minutes = (
        total_duration_minutes / total_sessions if total_sessions > 0 else 0.0
    )
    average_energy_kwh = total_energy_kwh / total_sessions if total_sessions > 0 else 0.0

    return {
        "station_id": station_id,
        "station_name": station_doc.get("name"),
        "total_sessions": total_sessions,
        "total_energy_kwh": total_energy_kwh,
        "total_amount_vnd": total_amount_vnd,
        "total_tax_vnd": total_tax_vnd,
        "average_session_duration_minutes": average_session_duration_minutes,
        "average_energy_kwh": average_energy_kwh,
        "vehicle_type_breakdown": list(vehicle_stats.values()),
    }

def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = (
        sin(dlat / 2) ** 2
        + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    )
    c = 2 * asin(sqrt(a))
    return r * c

@app.post(
    "/ngsi-ld/v1/entities",
    response_class=JSONResponse,
    tags=["NGSI-LD"],
    summary="Create or upsert a NGSI-LD entity",
)
def ngsi_upsert_entity(entity: Dict[str, Any]) -> JSONResponse:
    entity_type = entity.get("type")
    if not entity_type:
        raise HTTPException(status_code=400, detail="Thiếu trường 'type' trong entity")
    entity_id = entity.get("id")
    if not entity_id:
        raise HTTPException(status_code=400, detail="Thiếu trường 'id' trong entity")

    if entity_type == "EVChargingStation":
        collection = get_stations_collection()
        import_station_entity(entity, collection)
    elif entity_type == "EVChargingSession":
        collection = get_sessions_collection()
        import_session_entity(entity, collection)
    elif entity_type == "Sensor":
        collection = get_sensors_collection()
        import_sensor_entity(entity, collection)
    else:
        raise HTTPException(status_code=400, detail="Loại entity không được hỗ trợ")

    doc = collection.find_one({"_id": entity_id})
    if not doc:
        raise HTTPException(status_code=500, detail="Không thể cập nhật hoặc tạo entity")
    ngsi_entity = _doc_to_ngsi_entity(doc)
    return JSONResponse(
        content=ngsi_entity,
        media_type="application/ld+json",
        status_code=201,
    )

@app.get(
    "/ngsi-ld/v1/entities",
    response_class=JSONResponse,
    tags=["NGSI-LD"],
    summary="List NGSI-LD entities",
)
def ngsi_list_entities(
    entity_type: str = Query(..., alias="type"),
    entity_id: str | None = Query(None, alias="id"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> JSONResponse:
    if entity_type == "EVChargingStation":
        collection = get_stations_collection()
    elif entity_type == "EVChargingSession":
        collection = get_sessions_collection()
    elif entity_type == "Sensor":
        collection = get_sensors_collection()
    else:
        raise HTTPException(status_code=400, detail="Loại entity không được hỗ trợ")

    query: Dict[str, Any] = {}
    if entity_id is not None:
        query["_id"] = entity_id

    cursor = collection.find(query).skip(offset).limit(limit)
    entities = [_doc_to_ngsi_entity(doc) for doc in cursor]
    return JSONResponse(content=entities, media_type="application/ld+json")

@app.get(
    "/ngsi-ld/v1/entities/{entity_id}",
    response_class=JSONResponse,
    tags=["NGSI-LD"],
    summary="Get a NGSI-LD entity by id",
)
def ngsi_get_entity(entity_id: str) -> JSONResponse:
    collections = [
        get_stations_collection(),
        get_sessions_collection(),
        get_sensors_collection(),
    ]
    for collection in collections:
        doc = collection.find_one({"_id": entity_id})
        if doc:
            entity = _doc_to_ngsi_entity(doc)
            return JSONResponse(content=entity, media_type="application/ld+json")

    raise HTTPException(status_code=404, detail="Không tìm thấy entity")

@app.delete(
    "/ngsi-ld/v1/entities/{entity_id}",
    response_class=JSONResponse,
    tags=["NGSI-LD"],
    summary="Delete a NGSI-LD entity",
)
def ngsi_delete_entity(
    entity_id: str,
    current_user: UserResponse = Depends(get_current_admin),
) -> JSONResponse:
    collections = [
        get_stations_collection(),
        get_sessions_collection(),
        get_sensors_collection(),
    ]
    deleted = False
    for collection in collections:
        result = collection.delete_one({"_id": entity_id})
        if result.deleted_count > 0:
            deleted = True
            break
    
    if not deleted:
        raise HTTPException(status_code=404, detail="Không tìm thấy entity")
    
    return JSONResponse(
        content={"message": "Entity đã được xóa"},
        media_type="application/json",
    )

@app.get(
    "/ngsi-ld/v1/entities/{entity_id}/attrs",
    response_class=JSONResponse,
    tags=["NGSI-LD"],
    summary="Get all attributes of a NGSI-LD entity",
)
def ngsi_get_entity_attrs(entity_id: str) -> JSONResponse:
    collections = [
        get_stations_collection(),
        get_sessions_collection(),
        get_sensors_collection(),
    ]
    for collection in collections:
        doc = collection.find_one({"_id": entity_id})
        if doc:
            entity = _doc_to_ngsi_entity(doc)
            attrs = {k: v for k, v in entity.items() if k not in ["id", "type", "@context"]}
            return JSONResponse(content=attrs, media_type="application/ld+json")
    
    raise HTTPException(status_code=404, detail="Không tìm thấy entity")

@app.get(
    "/ngsi-ld/v1/entities/{entity_id}/attrs/{attr_name}",
    response_class=JSONResponse,
    tags=["NGSI-LD"],
    summary="Get a specific attribute of a NGSI-LD entity",
)
def ngsi_get_entity_attr(entity_id: str, attr_name: str) -> JSONResponse:
    collections = [
        get_stations_collection(),
        get_sessions_collection(),
        get_sensors_collection(),
    ]
    for collection in collections:
        doc = collection.find_one({"_id": entity_id})
        if doc:
            entity = _doc_to_ngsi_entity(doc)
            if attr_name not in entity:
                raise HTTPException(status_code=404, detail=f"Không tìm thấy attribute '{attr_name}'")
            return JSONResponse(
                content={attr_name: entity[attr_name]},
                media_type="application/ld+json",
            )
    
    raise HTTPException(status_code=404, detail="Không tìm thấy entity")

@app.patch(
    "/ngsi-ld/v1/entities/{entity_id}/attrs",
    response_class=JSONResponse,
    tags=["NGSI-LD"],
    summary="Update attributes of a NGSI-LD entity",
)
async def ngsi_update_entity_attrs(
    entity_id: str,
    attrs: Dict[str, Any],
) -> JSONResponse:
    event = {
        "operation": "update",
        "entity": {
            "id": entity_id,
            "type": "EVChargingStation",
            **attrs,
        },
    }
    await apply_realtime_event(event)

    collection = get_stations_collection()
    doc = collection.find_one({"_id": entity_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy entity")
    entity = _doc_to_ngsi_entity(doc)
    return JSONResponse(content=entity, media_type="application/ld+json")

@app.patch(
    "/ngsi-ld/v1/entities/{entity_id}/attrs/{attr_name}",
    response_class=JSONResponse,
    tags=["NGSI-LD"],
    summary="Update a specific attribute of a NGSI-LD entity",
)
async def ngsi_update_entity_attr(
    entity_id: str,
    attr_name: str,
    attr_value: Dict[str, Any],
) -> JSONResponse:
    collections = [
        get_stations_collection(),
        get_sessions_collection(),
        get_sensors_collection(),
    ]
    
    for collection in collections:
        doc = collection.find_one({"_id": entity_id})
        if doc:
            event = {
                "operation": "update",
                "entity": {
                    "id": entity_id,
                    "type": doc.get("type", "EVChargingStation"),
                    attr_name: attr_value,
                },
            }
            await apply_realtime_event(event)
            
            updated_doc = collection.find_one({"_id": entity_id})
            entity = _doc_to_ngsi_entity(updated_doc)
            return JSONResponse(
                content={attr_name: entity.get(attr_name)},
                media_type="application/ld+json",
            )
    
    raise HTTPException(status_code=404, detail="Không tìm thấy entity")

@app.post(
    "/ngsi-ld/v1/entities/{entity_id}/attrs",
    response_class=JSONResponse,
    tags=["NGSI-LD"],
    summary="Append new attributes to a NGSI-LD entity",
)
async def ngsi_append_entity_attrs(
    entity_id: str,
    attrs: Dict[str, Any],
) -> JSONResponse:
    collections = [
        get_stations_collection(),
        get_sessions_collection(),
        get_sensors_collection(),
    ]
    
    for collection in collections:
        doc = collection.find_one({"_id": entity_id})
        if doc:
            event = {
                "operation": "update",
                "entity": {
                    "id": entity_id,
                    "type": doc.get("type", "EVChargingStation"),
                    **attrs,
                },
            }
            await apply_realtime_event(event)
            
            updated_doc = collection.find_one({"_id": entity_id})
            entity = _doc_to_ngsi_entity(updated_doc)
            return JSONResponse(content=entity, media_type="application/ld+json")
    
    raise HTTPException(status_code=404, detail="Không tìm thấy entity")

@app.get(
    "/ngsi-ld/v1/types",
    response_class=JSONResponse,
    tags=["NGSI-LD"],
    summary="List all entity types",
)
def ngsi_list_types() -> JSONResponse:
    types_info = [
        {
            "type": "EVChargingStation",
            "description": "Trạm sạc xe điện",
            "count": get_stations_collection().count_documents({}),
        },
        {
            "type": "EVChargingSession",
            "description": "Phiên sạc xe điện",
            "count": get_sessions_collection().count_documents({}),
        },
        {
            "type": "Sensor",
            "description": "Cảm biến",
            "count": get_sensors_collection().count_documents({}),
        },
    ]
    return JSONResponse(content=types_info, media_type="application/json")

@app.get(
    "/ngsi-ld/v1/types/{type_name}",
    response_class=JSONResponse,
    tags=["NGSI-LD"],
    summary="Get information about an entity type",
)
def ngsi_get_type(type_name: str) -> JSONResponse:
    if type_name == "EVChargingStation":
        collection = get_stations_collection()
    elif type_name == "EVChargingSession":
        collection = get_sessions_collection()
    elif type_name == "Sensor":
        collection = get_sensors_collection()
    else:
        raise HTTPException(status_code=404, detail="Loại entity không được hỗ trợ")
    
    count = collection.count_documents({})
    sample_doc = collection.find_one({})
    
    type_info = {
        "type": type_name,
        "count": count,
        "description": {
            "EVChargingStation": "Trạm sạc xe điện",
            "EVChargingSession": "Phiên sạc xe điện",
            "Sensor": "Cảm biến",
        }.get(type_name, ""),
    }
    
    if sample_doc:
        entity = _doc_to_ngsi_entity(sample_doc)
        type_info["sample_attributes"] = list(entity.keys())
    
    return JSONResponse(content=type_info, media_type="application/json")

@app.get(
    "/datasets",
    response_class=JSONResponse,
    tags=["Datasets"],
    summary="List available datasets",
)
def list_datasets() -> JSONResponse:
    datasets = [
        {
            "id": "stations",
            "title": "EV charging stations dataset (JSON-LD)",
            "description": "Danh sách trạm sạc xe điện tại Thành phố X",
            "path": "/datasets/stations.jsonld",
            "mediaType": "application/ld+json",
        },
        {
            "id": "observations",
            "title": "EV charging observations dataset (JSON-LD)",
            "description": "Các phiên sạc (EVChargingSession) và cảm biến (Sensor)",
            "path": "/datasets/observations.jsonld",
            "mediaType": "application/ld+json",
        },
        {
            "id": "sessions",
            "title": "Citizen charging history dataset (JSON-LD)",
            "description": "Lịch sử sạc gắn người dùng (Person) và phiên sạc (EVChargingSession)",
            "path": "/datasets/sessions.jsonld",
            "mediaType": "application/ld+json",
        },
    ]
    return JSONResponse(content=datasets)

@app.get(
    "/datasets/stations.jsonld",
    response_class=FileResponse,
    tags=["Datasets"],
    summary="Download stations dataset (JSON-LD)",
)
def get_stations_dataset() -> FileResponse:
    data_dir = get_default_data_dir()
    path = data_dir / "stations.jsonld"
    return FileResponse(path, media_type="application/ld+json", filename="stations.jsonld")

@app.get(
    "/datasets/observations.jsonld",
    response_class=FileResponse,
    tags=["Datasets"],
    summary="Download observations dataset (JSON-LD)",
)
def get_observations_dataset() -> FileResponse:
    data_dir = get_default_data_dir()
    path = data_dir / "observations.jsonld"
    return FileResponse(path, media_type="application/ld+json", filename="observations.jsonld")

@app.get(
    "/datasets/sessions.jsonld",
    response_class=FileResponse,
    tags=["Datasets"],
    summary="Download sessions dataset (JSON-LD)",
)
def get_sessions_dataset() -> FileResponse:
    data_dir = get_default_data_dir()
    path = data_dir / "sessions.jsonld"
    return FileResponse(path, media_type="application/ld+json", filename="sessions.jsonld")

@app.post(
    "/citizen/favorites",
    tags=["Citizen"],
    summary="Add a station to favorites",
)
def add_favorite(
    station_id: str = Query(..., description="Station ID to favorite"),
    current_user: UserResponse = Depends(get_current_active_user),
) -> Dict[str, Any]:
    user_id = current_user.id
    favorites_collection = get_favorites_collection()
    
    # Check if station exists
    stations_collection = get_stations_collection()
    station = stations_collection.find_one({"_id": station_id})
    if not station:
        raise HTTPException(status_code=404, detail="Không tìm thấy trạm sạc")
    
    # Check if already favorited
    existing = favorites_collection.find_one({"user_id": user_id, "station_id": station_id})
    if existing:
        return {"message": "Trạm đã có trong danh sách yêu thích", "favorited": True}
    
    # Add to favorites
    favorite_doc = {
        "user_id": user_id,
        "station_id": station_id,
        "created_at": datetime.now(),
    }
    favorites_collection.insert_one(favorite_doc)
    
    return {"message": "Đã thêm trạm vào danh sách yêu thích", "favorited": True}

@app.delete(
    "/citizen/favorites",
    tags=["Citizen"],
    summary="Remove a station from favorites",
)
def remove_favorite(
    station_id: str = Query(..., description="Station ID to unfavorite"),
    current_user: UserResponse = Depends(get_current_active_user),
) -> Dict[str, Any]:
    user_id = current_user.id
    favorites_collection = get_favorites_collection()
    result = favorites_collection.delete_one({"user_id": user_id, "station_id": station_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Không tìm thấy trạm trong danh sách yêu thích")
    
    return {"message": "Đã xóa trạm khỏi danh sách yêu thích", "favorited": False}

@app.get(
    "/citizen/favorites",
    response_model=List[StationBase],
    tags=["Citizen"],
    summary="Get user's favorite stations",
)
def get_favorites(
    current_user: UserResponse = Depends(get_current_active_user),
) -> List[StationBase]:
    user_id = current_user.id
    favorites_collection = get_favorites_collection()
    stations_collection = get_stations_collection()
    
    favorites = list(favorites_collection.find({"user_id": user_id}))
    station_ids = [fav["station_id"] for fav in favorites]
    
    if not station_ids:
        return []
    
    stations = list(stations_collection.find({"_id": {"$in": station_ids}}))
    return [StationBase(**doc) for doc in stations]

@app.get(
    "/citizen/favorites/check",
    tags=["Citizen"],
    summary="Check if a station is favorited",
)
def check_favorite(
    station_id: str = Query(..., description="Station ID to check"),
    current_user: UserResponse = Depends(get_current_active_user),
) -> Dict[str, bool]:
    user_id = current_user.id
    favorites_collection = get_favorites_collection()
    favorite = favorites_collection.find_one({"user_id": user_id, "station_id": station_id})
    return {"favorited": favorite is not None}

@app.get(
    "/citizen/route",
    tags=["Citizen"],
    summary="Get route information to a station using OSRM",
)
async def get_route(
    from_lat: float = Query(..., description="Starting latitude"),
    from_lng: float = Query(..., description="Starting longitude"),
    to_station_id: str = Query(..., description="Destination station ID"),
) -> Dict[str, Any]:
    stations_collection = get_stations_collection()
    station = stations_collection.find_one({"_id": to_station_id})
    
    if not station:
        raise HTTPException(status_code=404, detail="Không tìm thấy trạm sạc")
    
    location = station.get("location") or {}
    coordinates = location.get("coordinates")
    if not isinstance(coordinates, list) or len(coordinates) != 2:
        raise HTTPException(status_code=400, detail="Vị trí trạm sạc không hợp lệ")
    
    to_lon, to_lat = coordinates
    
    # OSRM API endpoint (public demo server)
    # In production, you might want to use your own OSRM instance
    osrm_url = os.getenv(
        "OSRM_URL",
        "http://router.project-osrm.org/route/v1/driving",
    )
    
    # OSRM expects coordinates in format: lon,lat;lon,lat
    osrm_coords = f"{from_lng},{from_lat};{to_lon},{to_lat}"
    osrm_endpoint = f"{osrm_url}/{osrm_coords}"
    
    osrm_used = False
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                osrm_endpoint,
                params={
                    "overview": "full",
                    "geometries": "geojson",
                    "steps": "false",
                },
            )
            response.raise_for_status()
            osrm_data = response.json()
            
            if osrm_data.get("code") != "Ok" or not osrm_data.get("routes"):
                # Fallback to haversine if OSRM fails
                raise ValueError("OSRM route not found")
            
            route = osrm_data["routes"][0]
            distance_meters = route["distance"]
            duration_seconds = route["duration"]
            
            distance_km = distance_meters / 1000.0
            estimated_time_minutes = duration_seconds / 60.0
            
            # Extract route geometry (GeoJSON LineString coordinates)
            geometry = route.get("geometry", {})
            route_coordinates = geometry.get("coordinates", [])
            
            # Convert from GeoJSON format [lon, lat] to our format
            if not route_coordinates:
                # Fallback to straight line
                route_coordinates = [
                    [from_lng, from_lat],
                    [to_lon, to_lat],
                ]
            else:
                osrm_used = True
            
    except Exception as e:
        # Fallback to haversine calculation if OSRM is unavailable
        print(f"OSRM error: {e}, falling back to haversine")
        distance_km = _haversine_km(from_lat, from_lng, to_lat, to_lon)
        estimated_time_minutes = (distance_km / 40.0) * 60.0
        route_coordinates = [
            [from_lng, from_lat],
            [to_lon, to_lat],
        ]
    
    return {
        "from": {"lat": from_lat, "lng": from_lng},
        "to": {"lat": to_lat, "lng": to_lon, "station_id": to_station_id, "station_name": station.get("name")},
        "distance_km": round(distance_km, 2),
        "estimated_time_minutes": round(estimated_time_minutes, 1),
        "route_coordinates": route_coordinates,
        "osrm_used": osrm_used,
    }

@app.get(
    "/citizen/compare",
    tags=["Citizen"],
    summary="Compare multiple stations",
)
def compare_stations(
    station_ids: List[str] = Query(..., description="List of station IDs to compare"),
) -> Dict[str, Any]:
    stations_collection = get_stations_collection()
    sessions_collection = get_sessions_collection()
    
    stations = list(stations_collection.find({"_id": {"$in": station_ids}}))
    
    if len(stations) != len(station_ids):
        found_ids = {s["_id"] for s in stations}
        missing = set(station_ids) - found_ids
        raise HTTPException(
            status_code=404,
            detail=f"Không tìm thấy các trạm: {', '.join(missing)}",
        )
    
    comparison = []
    for station in stations:
        station_id = station["_id"]
        sessions = list(sessions_collection.find({"station_id": station_id}))
        
        total_sessions = len(sessions)
        total_energy = sum(float(s.get("power_consumption_kwh", 0)) for s in sessions)
        avg_energy = total_energy / total_sessions if total_sessions > 0 else 0
        
        comparison.append({
            "station_id": station_id,
            "station_name": station.get("name"),
            "status": station.get("status"),
            "available_capacity": station.get("available_capacity"),
            "capacity": station.get("capacity"),
            "network": station.get("network"),
            "total_sessions": total_sessions,
            "avg_energy_per_session_kwh": round(avg_energy, 2),
            "address": station.get("address"),
            "location": station.get("location"),
        })
    
    return {
        "stations": comparison,
        "count": len(comparison),
    }

@app.get(
    "/admin/users",
    response_model=UserListResponse,
    tags=["Admin"],
    summary="List all users (admin only)",
)
def list_users(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: UserResponse = Depends(get_current_admin),
) -> UserListResponse:
    users_collection = get_users_collection()
    cursor = users_collection.find({}).skip(offset).limit(limit)
    total = users_collection.count_documents({})
    
    users = []
    for doc in cursor:
        users.append(UserResponse(
            id=str(doc.get("_id", "")),
            username=doc.get("username", ""),
            email=doc.get("email"),
            name=doc.get("name"),
            role=doc.get("role", "citizen"),
            is_locked=doc.get("is_locked", False),
        ))
    
    return UserListResponse(users=users, total=total)

@app.patch(
    "/admin/users/{user_id}/role",
    response_model=UserResponse,
    tags=["Admin"],
    summary="Update user role (admin only)",
)
def update_user_role(
    user_id: str,
    role_update: UserUpdateRole,
    current_user: UserResponse = Depends(get_current_admin),
) -> UserResponse:
    if role_update.role not in ["citizen", "manager", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vai trò phải là 'citizen', 'manager' hoặc 'admin'",
        )
    
    users_collection = get_users_collection()
    user_doc = _find_user_by_id(users_collection, user_id)
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy người dùng",
        )
    
    if str(user_doc.get("_id", "")) == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể thay đổi vai trò của chính mình",
        )
    
    users_collection.update_one(
        {"_id": user_doc["_id"]},
        {"$set": {"role": role_update.role, "updated_at": datetime.utcnow()}},
    )
    
    updated_doc = users_collection.find_one({"_id": user_doc["_id"]})
    return UserResponse(
        id=str(updated_doc.get("_id", "")),
        username=updated_doc.get("username", ""),
        email=updated_doc.get("email"),
        name=updated_doc.get("name"),
        role=updated_doc.get("role", "citizen"),
        is_locked=updated_doc.get("is_locked", False),
    )

@app.patch(
    "/admin/users/{user_id}/lock",
    response_model=UserResponse,
    tags=["Admin"],
    summary="Lock or unlock user (admin only)",
)
def toggle_user_lock(
    user_id: str,
    is_locked: bool = Query(..., description="True to lock, False to unlock"),
    current_user: UserResponse = Depends(get_current_admin),
) -> UserResponse:
    users_collection = get_users_collection()
    user_doc = _find_user_by_id(users_collection, user_id)
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy người dùng",
        )
    
    if str(user_doc.get("_id", "")) == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể khóa tài khoản của chính mình",
        )
    
    users_collection.update_one(
        {"_id": user_doc["_id"]},
        {"$set": {"is_locked": is_locked, "updated_at": datetime.utcnow()}},
    )
    
    updated_doc = users_collection.find_one({"_id": user_doc["_id"]})
    return UserResponse(
        id=str(updated_doc.get("_id", "")),
        username=updated_doc.get("username", ""),
        email=updated_doc.get("email"),
        name=updated_doc.get("name"),
        role=updated_doc.get("role", "citizen"),
        is_locked=updated_doc.get("is_locked", False),
    )

@app.delete(
    "/admin/users/{user_id}",
    tags=["Admin"],
    summary="Delete user (admin only)",
)
def delete_user(
    user_id: str,
    current_user: UserResponse = Depends(get_current_admin),
) -> Dict[str, Any]:
    users_collection = get_users_collection()
    user_doc = _find_user_by_id(users_collection, user_id)
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy người dùng",
        )
    
    if str(user_doc.get("_id", "")) == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể xóa tài khoản của chính mình",
        )
    
    users_collection.delete_one({"_id": user_doc["_id"]})
    return {"message": "Đã xóa người dùng thành công"}