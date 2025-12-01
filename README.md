# EV Charging App

Ứng dụng EV Charging App cung cấp cổng dữ liệu mở và bảng điều khiển dành cho **nhà quản lý** và **người dân** nhằm theo dõi, phân tích hoạt động các trạm sạc xe điện trong đô thị. Dự án được phát triển theo yêu cầu OLP 2025 Smart City với trọng tâm **Linked Open Data** (SOSA/SSN, NGSI-LD, FiWARE Smart Data Models).

## 1. Kiến trúc tổng quan

```
├─ backend/  (FastAPI + MongoDB + ETL JSON-LD)
│   ├─ REST API (stations, analytics, citizens, datasets)
│   ├─ NGSI-LD endpoints & WebSocket realtime
│   └─ ETL dữ liệu mở từ ev-charging-open-data
├─ frontend/ (React 19 + TypeScript + Vite + Tailwind)
│   ├─ Dashboard cho nhà quản lý (overview, realtime, bản đồ, thống kê)
│   └─ Trải nghiệm người dân (tìm trạm, lịch sử, yêu thích, so sánh)
├─ ev-charging-open-data/ (submodule dữ liệu JSON-LD – CC BY 4.0)
└─ README.md, DEPENDENCIES.md, LICENSE
```

**Công nghệ chính**

- Backend: FastAPI, MongoDB, Pydantic, HTTPX, WebSocket, JWT auth
- Frontend: React 19, TypeScript, Tailwind CSS, MapLibre GL JS, React-Leaflet
- Dữ liệu mở: JSON-LD (SOSA/SSN), NGSI-LD, tương thích FiWARE Smart Data Models
- Phân phối: Giấy phép mã nguồn MIT, dữ liệu mở CC BY 4.0, phát hành qua GitHub

Chi tiết mỗi phần xem thêm tại:

- [`backend/README.md`](backend/README.md)
- [`frontend/README.md`](frontend/README.md)
- [`DEPENDENCIES.md`](DEPENDENCIES.md)

## 2. Dữ liệu và giấy phép

| Tài nguyên                         | Giấy phép | Ghi chú |
|-----------------------------------|-----------|--------|
| Mã nguồn (backend, frontend)      | MIT       | Xem file [`LICENSE`](LICENSE) |
| Dữ liệu JSON-LD (stations, sessions, sensors, citizens) | CC BY 4.0 | Từ repo [`tynnp/ev-charging-open-data`](https://github.com/tynnp/ev-charging-open-data) |

Ứng dụng hỗ trợ tải về bộ dữ liệu JSON-LD qua các endpoint `/datasets/*.jsonld`, đảm bảo tuân thủ yêu cầu FAIR/5-star open data.

## 3. Chuẩn bị môi trường

### 3.1. Yêu cầu chung

- **Python 3.11+** và `pip`
- **Node.js 20+** và `npm`
- **MongoDB** đang chạy tại `mongodb://localhost:27017` (có thể cấu hình lại)
- Git để clone và quản lý submodule dữ liệu

### 3.2. Thiết lập backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Cấu hình biến môi trường (tùy chỉnh SECRET_KEY, OSRM_URL nếu cần)
cp env.example .env

# Chạy ETL dữ liệu JSON-LD
python -m app.etl

# Khởi động API
uvicorn app.main:app --reload
```

Backend cung cấp REST, NGSI-LD, WebSocket realtime và bộ test cơ bản (`pytest` hoặc `python -m unittest`). Xem thêm trong [`backend/README.md`](backend/README.md).

### 3.3. Thiết lập frontend

```bash
cd frontend
npm install
cp env.example .env   # tùy chỉnh VITE_API_BASE_URL nếu backend không chạy tại localhost:8000
npm run dev           # mặc định http://localhost:5173
```

Frontend hỗ trợ phân quyền theo role, realtime qua WebSocket và tích hợp bản đồ. Chi tiết cấu trúc và tính năng tại [`frontend/README.md`](frontend/README.md).

## 4. Tài khoản mẫu & truy cập

| Vai trò        | Tên đăng nhập | Mật khẩu     |
|----------------|---------------|--------------|
| Nhà quản lý    | `manager`     | `manager123` |
| Người dân      | `citizen`     | `citizen123` |

Các tài khoản được tạo tự động khi backend khởi động lần đầu (`create_default_users`).

## 5. Kiểm thử & chất lượng

- Backend: `python -m unittest` (xem `backend/tests/test_app_basic.py`)
- Frontend: sử dụng ESLint (`npm run lint`) và Vite build để kiểm tra type (`npm run build`)
- Có thể bổ sung Vitest/React Testing Library cho frontend trong tương lai

## 6. Quy trình phát hành

1. **Mã nguồn công khai**: GitHub `tynnp/ev-charging-app`
2. **Giấy phép OSI**: MIT (mã nguồn) + CC BY 4.0 (dữ liệu)
3. **Build instructions**: mô tả ở README backend/frontend và mục 3 ở đây

## 7. Đóng góp & phát triển tiếp

- Tuân thủ style code (PEP8 cho Python, ESLint + Prettier conventions cho frontend)
- Tạo tính năng mới cần cập nhật tài liệu (README, DEPENDENCIES)
- Đảm bảo dữ liệu mới tuân thủ giấy phép mở và chuẩn NGSI-LD/SOSA

---

**Liên hệ**: Hồ sơ dự án & tài liệu bổ sung được cập nhật tại kho GitHub chính thức. Mọi câu hỏi liên hệ qua trang thông tin đội thi hoặc issues trên repo.
