# Changelog

All notable changes to this project will be documented in this file.

## [v1.0.0] - 2025-12-04
Phát hành phiên bản đầu tiên với đầy đủ tính năng:

### Backend (FastAPI + MongoDB)
- REST API cho stations, analytics, citizens, datasets
- NGSI-LD endpoints tương thích FiWARE Smart Data Models
- WebSocket realtime updates
- JWT authentication với role-based access control
- ETL tự động từ ev-charging-open-data submodule
- Email OTP verification cho đăng ký người dùng

### Frontend (React 19 + TypeScript)
- Dashboard cho nhà quản lý với analytics, bản đồ, thống kê
- Giao diện người dân với tìm kiếm, lọc, lịch sử, yêu thích
- MapLibre GL JS và Leaflet integration
- Responsive design với Tailwind CSS
- Real-time updates qua WebSocket

### Features
- Bộ lọc tìm kiếm trạm sạc nâng cao với toggle ẩn/hiện
- Layout responsive (50% sidebar, 50% bản đồ)
- So sánh và lựa chọn trạm sạc
- Route planning và navigation

### Deployment
- Docker containerization với docker-compose
- Production build với nginx
- Environment variables configuration
- MongoDB persistence

### Open Data Compliance
- JSON-LD datasets theo chuẩn SOSA/SSN
- NGSI-LD compatibility
- CC BY 4.0 license cho dữ liệu
- MIT license cho mã nguồn