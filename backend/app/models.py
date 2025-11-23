# SPDX-License-Identifier: MIT
from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel

class Address(BaseModel):
    streetAddress: Optional[str] = None
    addressLocality: Optional[str] = None
    postalCode: Optional[str] = None
    addressCountry: Optional[str] = None
    sameAs: Optional[str] = None

class GeoPoint(BaseModel):
    type: str
    coordinates: List[float]

class StationBase(BaseModel):
    id: str
    name: str
    status: str
    address: Optional[Address] = None
    location: GeoPoint
    capacity: Optional[int] = None
    socket_number: Optional[int] = None
    available_capacity: Optional[int] = None
    allowed_vehicle_types: List[str] = []
    network: Optional[str] = None
    operator: Optional[str] = None
    amperage: Optional[float] = None
    voltage: Optional[float] = None
    charge_types: List[str] = []
    accepted_payment_methods: List[str] = []
    opening_hours: Optional[str] = None
    socket_types: List[str] = []
    instantaneous_power: Optional[float] = None
    queue_length: Optional[int] = None

class StationInDB(StationBase):
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    raw: Any

class StationRealtime(BaseModel):
    id: str
    status: Optional[str] = None
    available_capacity: Optional[int] = None
    instantaneous_power: Optional[float] = None
    queue_length: Optional[int] = None

class SessionBase(BaseModel):
    id: str
    station_id: str
    sensor_id: Optional[str] = None
    vehicle_type: Optional[str] = None
    charging_unit_id: Optional[str] = None
    transaction_id: Optional[str] = None
    transaction_type: Optional[str] = None
    start_date_time: datetime
    end_date_time: datetime
    phenomenon_time: datetime
    result_time: datetime
    power_consumption_kwh: float
    amount_collected_vnd: float
    tax_amount_collected_vnd: float

class SessionInDB(SessionBase):
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    raw: Any

class SensorBase(BaseModel):
    id: str
    name: Optional[str] = None
    description: Optional[str] = None

class SensorInDB(SensorBase):
    raw: Any