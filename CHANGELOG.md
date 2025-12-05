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

## [v1.1.0] - 2025-12-05
Cải tiến giao diện người dùng và trải nghiệm:

### Cải tiến
- Tối ưu hóa responsive cho mọi kích thước màn hình
- Cải thiện trải nghiệm người dùng trên thiết bị di động
- Làm mới giao diện với các thành phần UI/UX thân thiện hơn

### Thay đổi
- Chuyển đổi tất cả thông báo lỗi sang tiếng Việt
- Cập nhật nhãn và văn bản giao diện sang tiếng Việt
- Cải thiện hiển thị thông tin trạm sạc và lịch sử sạc

### Sửa lỗi
- Sửa lỗi hiển thị trên một số thiết bị di động
- Cập nhật thông báo lỗi rõ ràng và thân thiện hơn

## [v1.2.0] - 2025-12-05

### Added
- **Admin Dashboard**:
  - Quản lý người dùng: xem, cập nhật vai trò, khóa/mở tài khoản
  - Quản lý datasets: xem và tải các bộ dữ liệu JSON-LD
  - Quản lý NGSI-LD: xem và quản lý entities, types, API documentation

- **Phân quyền chi tiết**:
  - Thêm vai trò admin với toàn quyền hệ thống
  - Phân quyền chi tiết cho từng tính năng

- **UI/UX**:
  - Giao diện quản trị với bảng điều khiển trực quan
  - Toast notifications cho các thao tác
  - Xác nhận trước khi thực hiện các thao tác quan trọng

### Changed
- Cập nhật AuthContext để hỗ trợ phân quyền mới
- Tối ưu hiệu năng cho các bảng dữ liệu
- Cải thiện phản hồi lỗi và thông báo người dùng