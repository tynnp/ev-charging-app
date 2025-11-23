# SPDX-License-Identifier: MIT
from typing import Any, Dict, List
import asyncio
import json
from math import asin, cos, radians, sin, sqrt
from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from .db import get_sessions_collection, get_sensors_collection, get_stations_collection
from .etl import get_default_data_dir, get_property_value, import_session_entity
from .models import StationBase

app = FastAPI()

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

@app.get("/health")
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

@app.get("/stations", response_model=List[StationBase])
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

@app.get("/stations/near", response_model=List[StationBase])
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

@app.get("/stations/{station_id}", response_model=StationBase)
def get_station(station_id: str) -> StationBase:
    collection = get_stations_collection()
    doc = collection.find_one({"_id": station_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Station not found")
    return StationBase(**doc)

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

@app.get("/ngsi-ld/v1/entities", response_class=JSONResponse)
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

@app.get("/ngsi-ld/v1/entities/{entity_id}", response_class=JSONResponse)
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