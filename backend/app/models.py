# SPDX-License-Identifier: MIT
# Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
# This file is part of ev-charging-app and is licensed under the
# MIT License. See the LICENSE file in the project root for details.

from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, EmailStr

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
    user_id: Optional[str] = None
    vehicle_type: Optional[str] = None
    charging_unit_id: Optional[str] = None
    transaction_id: Optional[str] = None
    transaction_type: Optional[str] = None
    session_status: Optional[str] = None
    duration_minutes: Optional[float] = None
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

class CitizenProfile(BaseModel):
    id: str
    name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None

class CitizenProfileInDB(CitizenProfile):
    raw: Any

class CitizenSessionsStats(BaseModel):
    user_id: str
    total_sessions: int
    total_energy_kwh: float
    total_amount_vnd: float
    total_tax_vnd: float
    total_duration_minutes: float
    average_session_duration_minutes: float
    average_energy_kwh: float
    average_amount_vnd: float

class UserRegister(BaseModel):
    username: str
    password: str
    email: EmailStr
    name: Optional[str] = None
    role: str = "citizen"  # "citizen" or "manager"

class UserRegisterVerify(BaseModel):
    username: str
    otp: str

class OTPInitiateResponse(BaseModel):
    message: str
    otp_expires_in: int

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    email: Optional[str] = None
    name: Optional[str] = None
    role: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None