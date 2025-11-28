# SPDX-License-Identifier: MIT
# Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
# This file is part of ev-charging-app and is licensed under the
# MIT License. See the LICENSE file in the project root for details.
import unittest
from datetime import datetime
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app, _haversine_km
from app.etl import get_property_value

class TestHealthEndpoint(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    def test_health_ok(self) -> None:
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

class TestDatasetsEndpoints(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    def test_list_datasets(self) -> None:
        response = self.client.get("/datasets")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertGreaterEqual(len(data), 2)
        ids = {item.get("id") for item in data}
        self.assertIn("stations", ids)
        self.assertIn("observations", ids)

    def test_get_stations_dataset_file(self) -> None:
        response = self.client.get("/datasets/stations.jsonld")
        self.assertEqual(response.status_code, 200)
        content_type = response.headers.get("content-type", "").split(";")[0]
        self.assertEqual(content_type, "application/ld+json")

class TestUtilities(unittest.TestCase):
    def test_haversine_zero_distance(self) -> None:
        distance = _haversine_km(10.0, 20.0, 10.0, 20.0)
        self.assertAlmostEqual(distance, 0.0, places=6)

    def test_get_property_value(self) -> None:
        entity = {
            "name": {"type": "Property", "value": "Station 001"},
            "status": {"type": "Property", "value": "active"},
        }
        self.assertEqual(get_property_value(entity, "name"), "Station 001")
        self.assertEqual(get_property_value(entity, "status"), "active")
        self.assertIsNone(get_property_value(entity, "nonexistent"))

class FakeCursor:
    def __init__(self, docs):
        self._docs = list(docs)

    def skip(self, n):
        self._docs = self._docs[n:]
        return self

    def limit(self, n):
        self._docs = self._docs[:n]
        return self

    def sort(self, key, direction):
        reverse = direction < 0
        self._docs = sorted(self._docs, key=lambda doc: doc.get(key), reverse=reverse)
        return self

    def __iter__(self):
        return iter(self._docs)

class FakeCollection:
    def __init__(self, docs):
        self._docs = list(docs)

    def find(self, query=None):
        if query is None:
            query = {}
        docs = self._docs
        if "_id" in query:
            value = query["_id"]
            docs = [d for d in docs if d.get("_id") == value]
        if "station_id" in query:
            value = query["station_id"]
            docs = [d for d in docs if d.get("station_id") == value]
        if "user_id" in query:
            value = query["user_id"]
            docs = [d for d in docs if d.get("user_id") == value]
        if "start_date_time" in query:
            time_filter = query["start_date_time"]
            gte = time_filter.get("$gte")
            lte = time_filter.get("$lte")
            filtered_docs = []
            for doc in docs:
                start_dt = doc.get("start_date_time")
                if start_dt is None:
                    continue
                if gte is not None and start_dt < gte:
                    continue
                if lte is not None and start_dt > lte:
                    continue
                filtered_docs.append(doc)
            docs = filtered_docs
        return FakeCursor(docs)

    def find_one(self, query):
        cursor = self.find(query)
        for doc in cursor:
            return doc
        return None

    def count_documents(self, query):
        if query is None:
            query = {}
        cursor = self.find(query)
        return sum(1 for _ in cursor)

class TestStationsEndpoints(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    def test_list_stations_with_mocked_db(self) -> None:
        fake_stations = [
            {
                "_id": "station-1",
                "id": "station-1",
                "name": "Station 1",
                "status": "active",
                "location": {"type": "Point", "coordinates": [106.7, 10.8]},
            },
            {
                "_id": "station-2",
                "id": "station-2",
                "name": "Station 2",
                "status": "inactive",
                "location": {"type": "Point", "coordinates": [106.8, 10.9]},
            },
        ]
        fake_collection = FakeCollection(fake_stations)
        with patch("app.main.get_stations_collection", return_value=fake_collection):
            response = self.client.get("/stations")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]["id"], "station-1")

    def test_get_stations_near_with_mocked_db(self) -> None:
        fake_stations = [
            {
                "_id": "station-near",
                "id": "station-near",
                "name": "Near Station",
                "status": "active",
                "location": {"type": "Point", "coordinates": [20.0, 10.0]},
            },
            {
                "_id": "station-far",
                "id": "station-far",
                "name": "Far Station",
                "status": "active",
                "location": {"type": "Point", "coordinates": [0.0, 0.0]},
            },
        ]
        fake_collection = FakeCollection(fake_stations)
        with patch("app.main.get_stations_collection", return_value=fake_collection):
            response = self.client.get(
                "/stations/near",
                params={"lat": 10.0, "lng": 20.0, "radius_km": 1.0},
            )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["id"], "station-near")

class TestAnalyticsEndpoints(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    def test_analytics_overview_with_mocked_db(self) -> None:
        sessions_docs = [
            {
                "_id": "session-1",
                "station_id": "station-1",
                "power_consumption_kwh": 10.0,
                "amount_collected_vnd": 100000.0,
                "tax_amount_collected_vnd": 10000.0,
            },
            {
                "_id": "session-2",
                "station_id": "station-1",
                "power_consumption_kwh": 20.0,
                "amount_collected_vnd": 200000.0,
                "tax_amount_collected_vnd": 20000.0,
            },
        ]
        stations_docs = [
            {"_id": "station-1"},
            {"_id": "station-2"},
        ]
        fake_sessions = FakeCollection(sessions_docs)
        fake_stations = FakeCollection(stations_docs)

        with patch("app.main.get_sessions_collection", return_value=fake_sessions), patch(
            "app.main.get_stations_collection", return_value=fake_stations
        ):
            response = self.client.get("/analytics/overview")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["total_sessions"], 2)
        self.assertAlmostEqual(data["total_energy_kwh"], 30.0)
        self.assertAlmostEqual(data["total_amount_vnd"], 300000.0)
        self.assertAlmostEqual(data["total_tax_vnd"], 30000.0)
        self.assertEqual(data["stations_count"], 2)
        self.assertEqual(len(data["top_stations_by_sessions"]), 1)
        self.assertEqual(
            data["top_stations_by_sessions"][0]["station_id"], "station-1"
        )
        self.assertEqual(
            data["top_stations_by_sessions"][0]["session_count"], 2
        )

class TestCitizenEndpoints(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    def test_get_citizen_profile(self) -> None:
        citizen_docs = [
            {
                "_id": "citizen_user_1",
                "id": "citizen_user_1",
                "name": "Citizen One",
                "email": "citizen1@example.org",
                "phone_number": "+84000000001",
            }
        ]
        with patch("app.main.get_citizens_collection", return_value=FakeCollection(citizen_docs)):
            response = self.client.get("/citizens/citizen_user_1")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["id"], "citizen_user_1")
        self.assertEqual(data["name"], "Citizen One")

    def test_list_citizen_sessions_with_filters(self) -> None:
        citizen_docs = [
            {
                "_id": "citizen_user_1",
                "id": "citizen_user_1",
            }
        ]
        base_time = datetime(2025, 11, 20, 1, 15)
        sessions_docs = [
            {
                "_id": "session-1",
                "id": "session-1",
                "user_id": "citizen_user_1",
                "station_id": "urn:ngsi-ld:EVChargingStation:001",
                "start_date_time": base_time,
                "end_date_time": datetime(2025, 11, 20, 2, 5),
                "phenomenon_time": base_time,
                "result_time": datetime(2025, 11, 20, 2, 5),
                "power_consumption_kwh": 28.5,
                "amount_collected_vnd": 170000.0,
                "tax_amount_collected_vnd": 17000.0,
            },
            {
                "_id": "session-2",
                "id": "session-2",
                "user_id": "citizen_user_1",
                "station_id": "urn:ngsi-ld:EVChargingStation:003",
                "start_date_time": datetime(2025, 11, 22, 7, 10),
                "end_date_time": datetime(2025, 11, 22, 8, 0),
                "phenomenon_time": datetime(2025, 11, 22, 7, 10),
                "result_time": datetime(2025, 11, 22, 8, 0),
                "power_consumption_kwh": 24.1,
                "amount_collected_vnd": 145000.0,
                "tax_amount_collected_vnd": 14500.0,
            },
        ]

        with patch("app.main.get_citizens_collection", return_value=FakeCollection(citizen_docs)), patch(
            "app.main.get_sessions_collection", return_value=FakeCollection(sessions_docs)
        ):
            response = self.client.get(
                "/citizens/citizen_user_1/sessions",
                params={
                    "station_id": "urn:ngsi-ld:EVChargingStation:001",
                    "start_date": base_time.isoformat(),
                    "end_date": datetime(2025, 11, 21, 0, 0).isoformat(),
                },
            )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["station_id"], "urn:ngsi-ld:EVChargingStation:001")

    def test_get_citizen_sessions_stats(self) -> None:
        citizen_docs = [
            {
                "_id": "citizen_user_1",
                "id": "citizen_user_1",
            }
        ]
        start1 = datetime(2025, 11, 20, 1, 15)
        end1 = datetime(2025, 11, 20, 2, 5)
        start2 = datetime(2025, 11, 20, 11, 30)
        end2 = datetime(2025, 11, 20, 12, 10)
        sessions_docs = [
            {
                "_id": "session-1",
                "id": "session-1",
                "user_id": "citizen_user_1",
                "station_id": "urn:ngsi-ld:EVChargingStation:001",
                "start_date_time": start1,
                "end_date_time": end1,
                "power_consumption_kwh": 28.5,
                "amount_collected_vnd": 170000,
                "tax_amount_collected_vnd": 17000,
            },
            {
                "_id": "session-2",
                "id": "session-2",
                "user_id": "citizen_user_1",
                "station_id": "urn:ngsi-ld:EVChargingStation:001",
                "start_date_time": start2,
                "end_date_time": end2,
                "power_consumption_kwh": 15.2,
                "amount_collected_vnd": 95000,
                "tax_amount_collected_vnd": 9500,
            },
        ]

        with patch("app.main.get_citizens_collection", return_value=FakeCollection(citizen_docs)), patch(
            "app.main.get_sessions_collection", return_value=FakeCollection(sessions_docs)
        ):
            response = self.client.get("/citizens/citizen_user_1/sessions/stats")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["total_sessions"], 2)
        self.assertAlmostEqual(data["total_energy_kwh"], 43.7)
        self.assertAlmostEqual(data["total_amount_vnd"], 265000)
        self.assertAlmostEqual(data["total_tax_vnd"], 26500)
        self.assertGreater(data["average_session_duration_minutes"], 0)

    def test_citizen_sessions_invalid_date_range(self) -> None:
        citizen_docs = [
            {
                "_id": "citizen_user_1",
                "id": "citizen_user_1",
            }
        ]

        with patch("app.main.get_citizens_collection", return_value=FakeCollection(citizen_docs)):
            response = self.client.get(
                "/citizens/citizen_user_1/sessions",
                params={
                    "start_date": "2025-11-21T00:00:00",
                    "end_date": "2025-11-20T00:00:00",
                },
            )

        self.assertEqual(response.status_code, 400)