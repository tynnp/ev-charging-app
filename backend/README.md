# Backend API – EV Charging App

Backend cung cấp REST API + WebSocket để quản lý và phân tích dữ liệu trạm sạc xe điện (EV Charging) cho Thành phố X, trong bối cảnh cuộc thi **Phần mềm nguồn mở – OLP 2025** với chủ đề *"Ứng dụng dữ liệu mở liên kết phục vụ chuyển đổi số"*.

Hệ thống tận dụng:

- **NGSI-LD** và **FIWARE Smart Data Models** cho mô hình `EVChargingStation`, `EVChargingSession`, `Sensor`.
- **SOSA/SSN** để mô hình hóa các phiên sạc như các quan trắc IoT.
- Bộ dữ liệu JSON-LD trong thư mục **`ev-charging-open-data`** (được clone từ một kho dữ liệu mở riêng, xem bên dưới).

## 1. Công nghệ sử dụng

- **Ngôn ngữ**: Python ≥ 3.10.
- **Web framework**: [FastAPI](https://fastapi.tiangolo.com/).
- **Web server**: [uvicorn](https://www.uvicorn.org/).
- **Cơ sở dữ liệu**: MongoDB (truy cập qua [PyMongo](https://pymongo.readthedocs.io/)).
- **Kiểu dữ liệu**: [Pydantic](https://docs.pydantic.dev/) (models cho station, session, sensor).

Các dependency chính nằm trong `backend/requirements.txt`:

- `fastapi`
- `uvicorn[standard]`
- `pydantic`
- `pymongo`
- `python-dateutil`

## 2. Cấu trúc thư mục backend

Trong thư mục `backend/`:

```text
backend/
├─ app/
│  ├─ __init__.py
│  ├─ db.py               # Kết nối MongoDB, trả về các collection
│  ├─ etl.py              # ETL nạp dữ liệu JSON-LD vào MongoDB
│  ├─ main.py             # FastAPI app, định nghĩa toàn bộ endpoints
│  └─ models.py           # Pydantic models (Station, Session, Sensor, ...)
├─ ev-charging-open-data/ # Kho dữ liệu mở clone về (JSON-LD, README, LICENSE)
│  ├─ data/
│  │  ├─ stations.jsonld
│  │  ├─ observations.jsonld
│  │  └─ realtime_sample.json
│  └─ README.md / LICENSE
├─ tests/
│  └─ test_app_basic.py   # Unit tests cho một số endpoint và utilities
├─ env.example            # Ví dụ biến môi trường cho MongoDB
├─ requirements.txt       # Danh sách dependency Python
└─ .env                   # (tùy chọn) file cấu hình thực tế, không commit
```

> **Lưu ý quan trọng:** Thư mục `ev-charging-open-data` là **clone từ một repo open data riêng**, dùng làm nguồn dữ liệu mẫu cho backend. Thư mục này **không được commit** trong kho mã nguồn chính (đã được thêm vào `.gitignore`); mỗi người dùng cần tự clone về khi setup project lần đầu, đồng thời **giữ nguyên LICENSE và README** của kho dữ liệu này và tôn trọng giấy phép của bộ dữ liệu.

### 2.1. Clone repo dữ liệu mở `ev-charging-open-data`

Để chuẩn bị dữ liệu mẫu cho backend, từ thư mục gốc của project hãy chạy:

```bash
cd backend
git clone https://github.com/tynnp/ev-charging-open-data.git ev-charging-open-data
```

Sau khi clone xong, cấu trúc sẽ giống như sơ đồ ở trên, và các bước ETL / chạy backend ở các mục tiếp theo có thể sử dụng trực tiếp thư mục `ev-charging-open-data/data`.

## 3. Luồng dữ liệu và kiến trúc logic

- Bộ dữ liệu JSON-LD trong `ev-charging-open-data/data/` gồm:
  - `stations.jsonld`: danh sách trạm sạc `EVChargingStation`.
  - `observations.jsonld`: các phiên sạc `EVChargingSession` + entity `Sensor` (mô hình quan trắc SOSA/SSN).
  - `sessions.jsonld`: lịch sử phiên sạc gắn với người dùng (`Person`) để phục vụ chức năng "Lịch sử sạc" của công dân.
  - `realtime_sample.json`: các sự kiện mẫu NGSI-LD để mô phỏng realtime.
- Module `app/etl.py`:
  - Đọc các tệp JSON-LD.
  - Ánh xạ entity sang các Pydantic model `StationInDB`, `SessionInDB`, `SensorInDB`, `CitizenProfileInDB`.
  - Ghi vào MongoDB qua các collection `stations`, `sessions`, `sensors`, `citizens`.
- Module `app/main.py`:
  - Khởi tạo FastAPI app và CORS cho frontend (port 5173).
  - Lập lịch một **worker realtime** đọc `realtime_sample.json` và liên tục:
    - Cập nhật trạng thái trạm (`availableCapacity`, `status`, `instantaneousPower`, `queueLength`).
    - Thêm mới các `EVChargingSession`.
    - Broadcast các cập nhật ra WebSocket `/ws/realtime`.
  - Expose các REST API cho trạm sạc, phiên sạc, analytics, datasets và NGSI-LD.

## 4. Chuẩn bị môi trường

### 4.1. Yêu cầu

- Python **3.10+**.
- Một instance **MongoDB** đang chạy (mặc định `mongodb://localhost:27017`).
- `pip` để cài đặt dependencies.

### 4.2. Cài đặt dependencies

Từ thư mục `backend/`:

```bash
# (Khuyến nghị) tạo virtualenv
python -m venv .venv
# Kích hoạt virtualenv (Windows)
.venv\Scripts\activate

# Cài đặt thư viện
pip install -r requirements.txt
```

## 5. Cấu hình biến môi trường

File ví dụ: `env.example`:

```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=ev_charging
```

Các biến:

- `MONGODB_URI` – URI kết nối MongoDB. Mặc định: `mongodb://localhost:27017`.
- `MONGODB_DB_NAME` – tên database MongoDB. Mặc định: `ev_charging`.
- `EV_OPEN_DATA_DIR` (tùy chọn) – đường dẫn thư mục chứa dữ liệu JSON-LD. Nếu **không đặt**, backend sẽ dùng mặc định:

  ```text
  ev-charging-open-data/data
  ```
- `OSRM_URL` (tùy chọn) – endpoint dịch vụ định tuyến OSRM cho API `/citizen/route`. Mặc định dùng public demo server: `http://router.project-osrm.org/route/v1/driving`.

### 5.1. Sử dụng file `.env`

Trên môi trường phát triển có thể tạo file `.env` từ `env.example` và để `uvicorn` load:

```bash
# Tạo file .env từ env.example (Windows)
copy env.example .env
```

Khi chạy server với `uvicorn[standard]`, có thể chỉ rõ `--env-file .env` để nạp biến môi trường.

## 6. Nạp dữ liệu mẫu vào MongoDB (ETL)

Trước khi chạy backend, cần nạp bộ dữ liệu mẫu vào MongoDB.

Từ thư mục `backend/`:

```bash
# Sử dụng đường dẫn dữ liệu mặc định (ev-charging-open-data/data)
python -m app.etl
```

Script `app/etl.py` sẽ:

1. Tìm thư mục dữ liệu qua `EV_OPEN_DATA_DIR` hoặc mặc định `ev-charging-open-data/data/`.
2. Đọc `stations.jsonld` và nạp vào collection `stations`.
3. Đọc `observations.jsonld` và nạp vào `sessions` + `sensors`.
4. Đọc `sessions.jsonld` và nạp `citizens` + các phiên sạc gắn với người dùng.

Có thể chạy lại script nhiều lần; dữ liệu được upsert theo `_id` nên không nhân bản.

## 7. Chạy ứng dụng backend

Sau khi cài đặt và nạp dữ liệu:

```bash
# Từ thư mục backend/
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --env-file .env
```

- Mặc định API sẽ sẵn sàng tại: `http://localhost:8000`.
- Tài liệu tự động của FastAPI:
  - Swagger UI: `http://localhost:8000/docs`
  - ReDoc: `http://localhost:8000/redoc`

## 8. Các nhóm API chính

### 8.1. System

- `GET /health`
  - Kiểm tra tình trạng service.
  - Trả về: `{ "status": "ok" }`.

### 8.2. Stations

- `GET /stations` Liệt kê trạm sạc, hỗ trợ filter:
    - `status`: trạng thái trạm.
    - `network`: nhà mạng/vận hành.
    - `vehicle_type`: loại phương tiện cho phép.
    - `min_available_capacity`: số cổng trống tối thiểu.
    - `limit`, `offset`.

- `GET /stations/near` Tìm trạm gần một tọa độ (dùng công thức Haversine):
    - `lat`, `lng`: tọa độ tham chiếu.
    - `radius_km`: bán kính tìm kiếm (km, mặc định 5.0).
    - `limit`: số trạm tối đa.

- `GET /stations/search` Tìm kiếm nâng cao:
    - `status`, `network`, `vehicle_type`.
    - `charge_type`, `payment_method`, `socket_type`.
    - `min_capacity`, `max_capacity`.
    - `min_available_capacity`.
    - `limit`, `offset`.

- `GET /stations/{station_id}` Lấy chi tiết một trạm.

- `GET /stations/{station_id}/realtime` Lấy snapshot realtime của trạm (trạng thái, công suất tức thời, hàng đợi).

- `GET /stations/{station_id}/sessions` Liệt kê các phiên sạc thuộc một trạm.

### 8.3. Analytics

- `GET /analytics/overview` Thống kê tổng quan toàn hệ thống:
    - Tổng số phiên sạc, tổng năng lượng (kWh), tổng doanh thu, tổng thuế.
    - Số lượng trạm.
    - Top trạm theo số phiên sạc.

- `GET /analytics/stations/{station_id}` Thống kê chi tiết cho một trạm:
    - Tổng số phiên, tổng năng lượng, tổng doanh thu, tổng thuế.
    - Thời lượng trung bình một phiên (phút).
    - Năng lượng trung bình một phiên.
    - Phân bổ theo `vehicle_type`.

### 8.4. NGSI-LD

Các endpoint này cung cấp lớp API NGSI-LD đơn giản, tương thích với mô hình dữ liệu trong `ev-charging-open-data`:

- `POST /ngsi-ld/v1/entities`
  - Tạo hoặc upsert một entity NGSI-LD.
  - Hỗ trợ các kiểu:
    - `EVChargingStation`
    - `EVChargingSession`
    - `Sensor`

- `GET /ngsi-ld/v1/entities?type=...&id=...` Liệt kê entity theo `type`, có thể filter theo `id`.

- `GET /ngsi-ld/v1/entities/{entity_id}` Lấy chi tiết một entity theo `id`.

- `PATCH /ngsi-ld/v1/entities/{entity_id}/attrs`
  - Cập nhật một số thuộc tính của `EVChargingStation`.
  - Logic cập nhật tái sử dụng hàm xử lý realtime (`apply_realtime_event`) để:
    - Ghi thay đổi vào MongoDB.
    - Broadcast payload cập nhật qua WebSocket.

### 8.5. Datasets (phục vụ open data)

- `GET /datasets` Trả về danh sách các dataset mà backend công bố:
    - Dataset trạm sạc (`stations.jsonld`).
    - Dataset quan trắc/phiên sạc + cảm biến (`observations.jsonld`).
    - Dataset lịch sử sạc gắn công dân (`sessions.jsonld`).

- `GET /datasets/stations.jsonld` Tải file dataset trạm sạc.

- `GET /datasets/observations.jsonld` Tải file dataset quan trắc.

- `GET /datasets/sessions.jsonld` Tải dataset lịch sử sạc gắn người dùng.

> **Lưu ý:** Các dataset được đóng gói dưới dạng JSON-LD `Dataset` có `mainEntity`. Khi cần nạp lại vào NGSI-LD broker, hãy: (1) tách `@context` và mảng entity trong `mainEntity`; (2) gửi từng entity qua `POST /ngsi-ld/v1/entities` hoặc batch `POST /ngsi-ld/v1/entityOperations/upsert`; (3) cung cấp context qua body hoặc header `Link` theo chuẩn NGSI-LD.

### 8.6. Realtime WebSocket

`GET /ws/realtime` (WebSocket)
  - Kênh realtime để client (ví dụ frontend) đăng ký nhận sự kiện:
    - Cập nhật trạng thái trạm (`station_update`).
    - Thêm mới phiên sạc (`session_upsert`).
  - Worker `realtime_worker` sẽ:
    - Đọc `realtime_sample.json` theo vòng lặp vô hạn.
    - Áp dụng từng event vào DB.
    - Gửi JSON qua tất cả kết nối WebSocket đang mở.

### 8.7. Citizens & Session history

- `GET /citizens/{user_id}`: Lấy thông tin hồ sơ người dùng (tên, email, số điện thoại) đã được ETL từ `sessions.jsonld`.
- `GET /citizens/{user_id}/sessions`: Liệt kê các phiên sạc của công dân, hỗ trợ filter theo `station_id`, `start_date`, `end_date`, `limit`, `offset`. Kết quả được sắp xếp mới nhất trước.
- `GET /citizens/{user_id}/sessions/stats`: Tổng hợp thống kê cho công dân (tổng phiên, tổng năng lượng, doanh thu, thuế, thời lượng trung bình...).
- `POST /citizen/favorites`: Thêm một trạm vào danh sách yêu thích của công dân (lưu trong collection `favorites`).
- `DELETE /citizen/favorites`: Gỡ một trạm khỏi danh sách yêu thích.
- `GET /citizen/favorites`: Trả về danh sách trạm yêu thích của người dùng.
- `GET /citizen/favorites/check`: Kiểm tra xem một trạm đã nằm trong danh sách yêu thích chưa.
- `GET /citizen/route`: Tính toán quãng đường, thời gian dự kiến từ vị trí nguồn đến trạm đích sử dụng dịch vụ OSRM (hoặc fallback Haversine nếu OSRM lỗi).
- `GET /citizen/compare`: So sánh nhanh nhiều trạm (trạng thái, dung lượng, số phiên sạc, năng lượng trung bình mỗi phiên,...).

Các trường trả về được chuẩn hóa theo Pydantic model `SessionBase`/`CitizenSessionsStats` nên đồng nhất với dữ liệu của các endpoint phân tích.

## 9. Chạy test

Các test cơ bản sử dụng `unittest` và FastAPI `TestClient`, đồng thời mock lớp truy cập DB bằng các collection giả.

Từ thư mục `backend/`:

```bash
python -m unittest tests.test_app_basic
```

Test cover:

- Endpoint `/health`.
- Endpoint `/datasets` và `/datasets/stations.jsonld` (kiểm tra content-type JSON-LD).
- Hàm tiện ích `_haversine_km` và `get_property_value`.
- Một số endpoint `/stations`, `/stations/near`, `/analytics/overview`, và các endpoint công dân `/citizens/...` với collection giả lập.

## 10. Thư mục `ev-charging-open-data`

Thư mục `ev-charging-open-data` **không phải** là phần logic chính của backend mà là một **repo dữ liệu mở** được clone riêng từ kho `tynnp/ev-charging-open-data`, dùng làm nguồn dữ liệu mẫu (xem thêm mục *2.1. Clone repo dữ liệu mở*). Thư mục này đã được thêm vào `.gitignore`, nên sẽ **không xuất hiện trong các commit**; mỗi người phát triển cần tự clone về khi thiết lập môi trường.

- Nội dung chính:
  - `data/stations.jsonld`, `data/observations.jsonld`, `data/sessions.jsonld`, `data/realtime_sample.json`.
  - `README.md`: mô tả chi tiết mô hình NGSI-LD, Smart Data Models, SOSA/SSN và cách nạp vào NGSI-LD broker.
  - `LICENSE`: giấy phép cho bộ dữ liệu (ví dụ CC BY 4.0, xem chi tiết trong file).
- Khi sử dụng hoặc tái phân phối dự án:
  - Giữ nguyên cấu trúc và giấy phép trong thư mục này.
  - Ghi công nguồn dữ liệu theo hướng dẫn trong `ev-charging-open-data/README.md`.

## 11. Giấy phép

- Mã nguồn backend (`backend/app`, `backend/tests`, v.v.) được phát hành theo giấy phép **MIT** (xem file `LICENSE` ở root dự án, và dòng `SPDX-License-Identifier: MIT` trong từng tệp Python).
- Bộ dữ liệu trong `ev-charging-open-data/` phát hành theo **Creative Commons Attribution 4.0 International (CC BY 4.0)**; khi tái sử dụng cần ghi nguồn theo gợi ý trong `ev-charging-open-data/README.md` và giữ nguyên file `LICENSE`.

Khi phát triển tiếp backend (thêm API, tích hợp NGSI-LD broker thật, mở rộng phân tích, v.v.), nên tiếp tục tuân thủ các giấy phép này và cập nhật README nếu có thay đổi lớn về kiến trúc hoặc cách triển khai.
