# Frontend – EV Charging App

Giao diện người dùng của dự án **EV Charging App** được xây dựng bằng **React 19 + TypeScript** trên nền **Vite** và Tailwind CSS. Ứng dụng phục vụ hai vai trò chính trong đề thi PMNM – OLP 2025:

- **Nhà quản lý**: theo dõi thống kê tổng quan, realtime sessions, bản đồ trạm sạc, phân tích từng trạm.
- **Người dân**: tìm kiếm trạm sạc, xem lịch sử sử dụng, quản lý danh sách yêu thích, so sánh trạm và cập nhật thông tin cá nhân.

Frontend giao tiếp với backend FastAPI thông qua REST API và WebSocket `/ws/realtime`, đồng thời khai thác dữ liệu NGSI-LD/SOSA được ETL từ kho `ev-charging-open-data`.

## 1. Công nghệ

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite 7](https://vitejs.dev/) – build tool & dev server
- [Tailwind CSS 3](https://tailwindcss.com/) – utility-first styling
- [Lucide-react](https://lucide.dev/) – icon set
- [MapLibre GL JS](https://maplibre.org/) và [react-leaflet](https://react-leaflet.js.org/) – hiển thị bản đồ, marker trạm sạc
- [Leaflet](https://leafletjs.com/) – hỗ trợ các tiện ích bản đồ
- WebSocket native API – nhận sự kiện realtime từ backend

## 2. Yêu cầu hệ thống

- Node.js **>= 20** (khuyến nghị dùng bản LTS mới nhất)
- npm đi kèm Node (hoặc sử dụng pnpm/yarn nếu muốn, cần tự cập nhật script tương ứng)
- Backend FastAPI phải chạy và cung cấp API tại URL khai báo trong biến môi trường `VITE_API_BASE_URL`

## 3. Thiết lập nhanh

```bash
cd frontend
npm install

# Tạo file cấu hình môi trường
cp env.example .env  # hoặc copy env.example .env trên Windows

# Chỉnh sửa .env nếu backend không chạy ở http://localhost:8000
VITE_API_BASE_URL='http://localhost:8000'

# Khởi động backend (FastAPI) trước khi chạy frontend

# Chạy dev server (mặc định http://localhost:5173)
npm run dev
```

Các tài khoản mặc định do backend khởi tạo:

- Nhà quản lý: `manager` / `manager123`
- Người dân: `citizen` / `citizen123`

## 4. Các script npm

| Lệnh              | Mô tả |
|-------------------|------|
| `npm run dev`     | Khởi động Vite dev server với HMR |
| `npm run build`   | Build production (TypeScript project references + Vite build) |
| `npm run preview` | Xem thử build production trên máy local |
| `npm run lint`    | Chạy ESLint theo cấu hình `eslint.config.js` |

## 5. Cấu trúc thư mục chính

```text
frontend/
├─ public/                 # Tài nguyên tĩnh (favicon, manifest, ...)
├─ src/
│  ├─ App.tsx              # Entry chính, điều hướng giữa các trang/role
│  ├─ main.tsx             # Mount React, bọc AuthProvider
│  ├─ config.ts            # Hằng số API_BASE_URL, user mặc định
│  ├─ contexts/AuthContext.tsx
│  │                       # Quản lý token JWT, login/register/logout
│  ├─ components/
│  │  ├─ layout/AppLayout.tsx      # Layout sidebar + header + nav
│  │  ├─ auth/                     # Login, Profile, modal cập nhật
│  │  ├─ pages/DashboardPage.tsx   # Dashboard manager (overview / realtime / map / stations)
│  │  ├─ citizen/                  # Trang dành cho người dân (find/history/favorites/compare)
│  │  ├─ analytics/, stations/, datasets/
│  │  │                       # Thành phần con: biểu đồ, filters, danh sách, bảng dữ liệu
│  ├─ types/ev.ts          # Định nghĩa kiểu dữ liệu trạm, session, analytics
│  ├─ utils/               # Hàm gọi API, mapping label trạng thái/vehicle
│  ├─ mapConfig.ts         # Cấu hình MapLibre (style vector)
│  ├─ App.css & index.css  # Style toàn cục + Tailwind directives
├─ env.example             # Mẫu biến môi trường
├─ tailwind.config.js      # Cấu hình Tailwind
├─ vite.config.ts          # Cấu hình Vite + plugin React
└─ eslint.config.js        # ESLint flat config
```

## 6. Luồng và tính năng nổi bật

### 6.1 Xác thực & phiên làm việc

- `AuthContext` kiểm tra token trong `localStorage`, gọi `/auth/me` để xác thực.
- Hỗ trợ đăng ký tài khoản (citizen hoặc manager), đăng nhập bằng form data gửi lên `/auth/login`.
- Tự động xoá token & reload nếu API trả về `401 Unauthorized`.

### 6.2 Dashboard cho nhà quản lý

- **Tổng quan**: tổng phiên sạc, năng lượng, doanh thu, thuế, top trạm nhiều phiên.
- **Doanh thu theo thời gian**: gọi `/analytics/revenue-timeline?period=day|week`, hiển thị biểu đồ.
- **Realtime sessions**: kết nối WebSocket `/ws/realtime`, cập nhật bảng phiên sạc và trạng thái trạm tức thời.
- **Bản đồ & tra cứu**: MapLibre map với danh sách trạm tìm theo toạ độ/bán kính (`/stations/near`).
- **Chi tiết trạm**: lấy dữ liệu từ `/stations/{id}`, `/analytics/stations/{id}`, `/stations/{id}/sessions`, `/stations/{id}/realtime`.

### 6.3 Trải nghiệm người dân

- **Tìm trạm**: tìm nâng cao (`/stations/search`) hoặc theo vị trí hiện tại/bán kính.
- **Lịch sử sạc**: `/citizens/{user_id}/sessions` & `/citizens/{user_id}/sessions/stats`.
- **Danh sách yêu thích**: thêm/xoá thông qua `/citizen/favorites` (POST/DELETE) và kiểm tra trạng thái.
- **So sánh trạm**: gọi `/citizen/compare` với nhiều `station_ids` để so sánh công suất, lượt dùng.
- **Thông tin cá nhân**: cập nhật qua `/auth/me` (PATCH) thông qua modal ProfileSettings.

### 6.4 Khả năng tuỳ biến giao diện

- Sử dụng Tailwind CSS và component-based styling, dễ dàng đổi màu chủ đạo (`#124874` cho manager, `#CF373D` cho citizen).
- Icons từ lucide-react, gradients và shadow để phù hợp UI hiện đại.

## 7. API & môi trường

- **REST**: toàn bộ endpoint xem chi tiết tại backend README (`/stations`, `/analytics`, `/citizen/...`, `/datasets`, `/auth/...`).
- **WebSocket**: `/ws/realtime` phát sự kiện `station_update` và `session_upsert`; frontend tự xử lý và cập nhật UI.
- **Biến môi trường**: `VITE_API_BASE_URL` (bắt buộc). Nếu backend chạy bằng HTTPS, WebSocket sẽ tự chuyển sang `wss://`.

## 8. Build & triển khai

```bash
# Build production (output vào thư mục dist/)
npm run build

# Xem thử build (chạy preview server)
npm run preview
```

- Triển khai static: Copy nội dung `dist/` lên máy chủ tĩnh (Nginx, Netlify, Vercel, ...).
- Cần cấu hình reverse proxy để route các request `/auth`, `/stations`, ... tới backend FastAPI tương ứng.

## 9. Kiểm thử & chất lượng mã

- Dự án sử dụng ESLint (flat config) với rule cho React 19 và TypeScript.
- Có thể bổ sung testing (Vitest/React Testing Library) trong tương lai; hiện tại chưa cung cấp test tự động cho frontend.

## 10. Tài liệu tham khảo nội bộ

- Backend README: mô tả ETL dữ liệu mở, endpoint REST/WebSocket, tài khoản mặc định.
- Kho dữ liệu `ev-charging-open-data`: JSON-LD theo chuẩn NGSI-LD/SOSA, giấy phép CC BY 4.0.

---

## 11. Bản quyền

- Mã nguồn phát hành theo giấy phép MIT (xem file `LICENSE` ở root dự án).
- Icons và dữ liệu sử dụng theo giấy phép riêng của từng thư viện/nguồn dữ liệu. Hãy ghi công phù hợp khi tái sử dụng.
