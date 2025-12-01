# SPDX-License-Identifier: MIT
# Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
# This file is part of ev-charging-app and is licensed under the
# MIT License. See the LICENSE file in the project root for details.

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

def get_favorites_collection() -> Collection:
    return get_db()["favorites"]

def get_citizens_collection() -> Collection:
    return get_db()["citizens"]

def get_users_collection() -> Collection:
    return get_db()["users"]