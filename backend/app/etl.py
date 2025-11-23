# SPDX-License-Identifier: MIT
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional
from dateutil import parser as dt_parser

from .db import (
    get_sessions_collection,
    get_sensors_collection,
    get_stations_collection,
)
from .models import Address, GeoPoint, SensorInDB, SessionInDB, StationInDB

def load_jsonld(path: Path) -> Dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)

def get_property_value(entity: Dict[str, Any], name: str, default: Any = None) -> Any:
    prop = entity.get(name)
    if not isinstance(prop, dict):
        return default
    return prop.get("value", default)

def parse_iso(value: str) -> datetime:
    return dt_parser.isoparse(value)

def import_stations(path: Path) -> None:
    data = load_jsonld(path)
    entities = data.get("mainEntity", [])
    collection = get_stations_collection()

    for e in entities:
        station_id = e["id"]
        name = get_property_value(e, "name")
        status = get_property_value(e, "status")

        address_value = e.get("address", {}).get("value")
        address = Address(**address_value) if isinstance(address_value, dict) else None

        location_value = e.get("location", {}).get("value", {})
        location = GeoPoint(
            type=location_value.get("type", "Point"),
            coordinates=location_value.get("coordinates", []),
        )

        capacity = get_property_value(e, "capacity")
        socket_number = get_property_value(e, "socketNumber")
        available_capacity = get_property_value(e, "availableCapacity")
        allowed_vehicle_types = get_property_value(e, "allowedVehicleType", []) or []
        network = get_property_value(e, "network")
        operator = get_property_value(e, "operator")
        amperage = get_property_value(e, "amperage")
        voltage = get_property_value(e, "voltage")
        charge_types = get_property_value(e, "chargeType", []) or []
        accepted_payment_methods = get_property_value(
            e, "acceptedPaymentMethod", []
        ) or []
        opening_hours = get_property_value(e, "openingHours")
        socket_types = get_property_value(e, "socketType", []) or []

        station = StationInDB(
            id=station_id,
            name=name,
            status=status,
            address=address,
            location=location,
            capacity=capacity,
            socket_number=socket_number,
            available_capacity=available_capacity,
            allowed_vehicle_types=allowed_vehicle_types,
            network=network,
            operator=operator,
            amperage=amperage,
            voltage=voltage,
            charge_types=charge_types,
            accepted_payment_methods=accepted_payment_methods,
            opening_hours=opening_hours,
            socket_types=socket_types,
            instantaneous_power=None,
            queue_length=None,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            raw=e,
        )

        doc = station.model_dump()
        doc["_id"] = station_id
        collection.replace_one({"_id": station_id}, doc, upsert=True)

def import_observations(path: Path) -> None:
    data = load_jsonld(path)
    entities = data.get("mainEntity", [])
    sessions_collection = get_sessions_collection()
    sensors_collection = get_sensors_collection()

    for e in entities:
        entity_type = e.get("type")
        if entity_type == "EVChargingSession":
            import_session_entity(e, sessions_collection)
        elif entity_type == "Sensor":
            import_sensor_entity(e, sensors_collection)

def import_session_entity(entity: Dict[str, Any], collection) -> None:
    session_id = entity["id"]
    station_id = entity.get("refFeatureOfInterest", {}).get("object")
    sensor_id = entity.get("refSensor", {}).get("object")

    start = parse_iso(get_property_value(entity, "startDateTime"))
    end = parse_iso(get_property_value(entity, "endDateTime"))
    phenomenon_time = parse_iso(get_property_value(entity, "phenomenonTime"))
    result_time = parse_iso(get_property_value(entity, "resultTime"))

    vehicle_type = get_property_value(entity, "vehicleType")
    charging_unit_id = get_property_value(entity, "chargingUnitId")
    transaction_id = get_property_value(entity, "transactionId")
    transaction_type = get_property_value(entity, "transactionType")
    power_kwh = get_property_value(entity, "powerConsumption")
    amount_vnd = get_property_value(entity, "amountCollected")
    tax_vnd = get_property_value(entity, "taxAmountCollected")

    session = SessionInDB(
        id=session_id,
        station_id=station_id,
        sensor_id=sensor_id,
        vehicle_type=vehicle_type,
        charging_unit_id=charging_unit_id,
        transaction_id=transaction_id,
        transaction_type=transaction_type,
        start_date_time=start,
        end_date_time=end,
        phenomenon_time=phenomenon_time,
        result_time=result_time,
        power_consumption_kwh=power_kwh,
        amount_collected_vnd=amount_vnd,
        tax_amount_collected_vnd=tax_vnd,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        raw=entity,
    )

    doc = session.model_dump()
    doc["_id"] = session_id
    collection.replace_one({"_id": session_id}, doc, upsert=True)

def import_sensor_entity(entity: Dict[str, Any], collection) -> None:
    sensor_id = entity["id"]
    name = get_property_value(entity, "name")
    description = get_property_value(entity, "description")

    sensor = SensorInDB(
        id=sensor_id,
        name=name,
        description=description,
        raw=entity,
    )

    doc = sensor.model_dump()
    doc["_id"] = sensor_id
    collection.replace_one({"_id": sensor_id}, doc, upsert=True)

def get_default_data_dir() -> Path:
    env_dir = os.getenv("EV_OPEN_DATA_DIR")
    if env_dir:
        return Path(env_dir)
    base = Path(__file__).resolve()
    backend_root = base.parents[1]
    return backend_root / "ev-charging-open-data" / "data"

def run_etl(data_dir: Optional[Path] = None) -> None:
    if data_dir is None:
        data_dir = get_default_data_dir()
    import_stations(data_dir / "stations.jsonld")
    import_observations(data_dir / "observations.jsonld")

if __name__ == "__main__":
    run_etl()