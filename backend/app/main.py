# SPDX-License-Identifier: MIT
# Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
# This file is part of ev-charging-app and is licensed under the
# MIT License. See the LICENSE file in the project root for details.
from typing import Any, Dict, List
import asyncio
import json
import os
from datetime import datetime
from math import asin, cos, radians, sin, sqrt
import httpx
from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from .db import (
    get_sessions_collection,
    get_sensors_collection,
    get_stations_collection,
    get_favorites_collection,
)
from .etl import (
    get_default_data_dir,
    get_property_value,
    import_session_entity,
    import_station_entity,
    import_sensor_entity,
)
from .models import StationBase, SessionBase, StationRealtime

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

@app.on_event("startup")
async def on_startup() -> None:
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
        raise HTTPException(status_code=404, detail="Station not found")
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
        raise HTTPException(status_code=404, detail="Station not found")
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
    "/analytics/stations/{station_id}",
    tags=["Analytics", "Stations"],
    summary="Get analytics for a specific station",
)
def analytics_station(station_id: str) -> Dict[str, Any]:
    sessions_collection = get_sessions_collection()
    stations_collection = get_stations_collection()

    station_doc = stations_collection.find_one({"_id": station_id})
    if not station_doc:
        raise HTTPException(status_code=404, detail="Station not found")

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
        raise HTTPException(status_code=400, detail="Missing 'type' in entity")
    entity_id = entity.get("id")
    if not entity_id:
        raise HTTPException(status_code=400, detail="Missing 'id' in entity")

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
        raise HTTPException(status_code=400, detail="Unsupported entity type")

    doc = collection.find_one({"_id": entity_id})
    if not doc:
        raise HTTPException(status_code=500, detail="Failed to upsert entity")
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
        raise HTTPException(status_code=400, detail="Unsupported entity type")

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

    raise HTTPException(status_code=404, detail="Entity not found")

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
        raise HTTPException(status_code=404, detail="Entity not found")
    entity = _doc_to_ngsi_entity(doc)
    return JSONResponse(content=entity, media_type="application/ld+json")

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

@app.post(
    "/citizen/favorites",
    tags=["Citizen"],
    summary="Add a station to favorites",
)
def add_favorite(
    user_id: str = Query(..., description="User identifier"),
    station_id: str = Query(..., description="Station ID to favorite"),
) -> Dict[str, Any]:
    favorites_collection = get_favorites_collection()
    
    # Check if station exists
    stations_collection = get_stations_collection()
    station = stations_collection.find_one({"_id": station_id})
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")
    
    # Check if already favorited
    existing = favorites_collection.find_one({"user_id": user_id, "station_id": station_id})
    if existing:
        return {"message": "Station already in favorites", "favorited": True}
    
    # Add to favorites
    favorite_doc = {
        "user_id": user_id,
        "station_id": station_id,
        "created_at": datetime.now(),
    }
    favorites_collection.insert_one(favorite_doc)
    
    return {"message": "Station added to favorites", "favorited": True}

@app.delete(
    "/citizen/favorites",
    tags=["Citizen"],
    summary="Remove a station from favorites",
)
def remove_favorite(
    user_id: str = Query(..., description="User identifier"),
    station_id: str = Query(..., description="Station ID to unfavorite"),
) -> Dict[str, Any]:
    favorites_collection = get_favorites_collection()
    result = favorites_collection.delete_one({"user_id": user_id, "station_id": station_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Favorite not found")
    
    return {"message": "Station removed from favorites", "favorited": False}

@app.get(
    "/citizen/favorites",
    response_model=List[StationBase],
    tags=["Citizen"],
    summary="Get user's favorite stations",
)
def get_favorites(
    user_id: str = Query(..., description="User identifier"),
) -> List[StationBase]:
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
    user_id: str = Query(..., description="User identifier"),
    station_id: str = Query(..., description="Station ID to check"),
) -> Dict[str, bool]:
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
        raise HTTPException(status_code=404, detail="Station not found")
    
    location = station.get("location") or {}
    coordinates = location.get("coordinates")
    if not isinstance(coordinates, list) or len(coordinates) != 2:
        raise HTTPException(status_code=400, detail="Station location invalid")
    
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
            detail=f"Stations not found: {', '.join(missing)}",
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