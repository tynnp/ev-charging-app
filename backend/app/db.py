# SPDX-License-Identifier: MIT
import os
from typing import Optional
from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.database import Database

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "ev_charging")

_client: Optional[MongoClient] = None

def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(MONGODB_URI)
    return _client

def get_db() -> Database:
    return get_client()[MONGODB_DB_NAME]

def get_stations_collection() -> Collection:
    return get_db()["stations"]

def get_sessions_collection() -> Collection:
    return get_db()["sessions"]

def get_sensors_collection() -> Collection:
    return get_db()["sensors"]