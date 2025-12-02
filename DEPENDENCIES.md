# Thư viện & Gói phụ thuộc

Tài liệu liệt kê các thư viện, phiên bản, giấy phép, mô tả và URL chính thức được sử dụng trong dự án **EV Charging App** (bao gồm backend và frontend). Phiên bản được ghi nhận tại thời điểm commit hiện tại.

## Backend (Python)

| Thư viện | Phiên bản | Giấy phép | Mô tả | URL |
|----------|-----------|-----------|-------|-----|
| fastapi | 0.118.2 | MIT | Web framework hiệu năng cao dựa trên Starlette & Pydantic | https://fastapi.tiangolo.com |
| uvicorn[standard] | 0.37.0 | BSD-3-Clause | ASGI server dùng chạy FastAPI | https://www.uvicorn.org |
| pydantic | 2.11.9 | MIT | Data validation & settings management | https://docs.pydantic.dev |
| pymongo | 4.15.4 | Apache-2.0 | MongoDB driver cho Python | https://www.mongodb.com/docs/drivers/pymongo |
| python-dateutil | 2.9.0.post0 | Apache-2.0/BSD-3-Clause | Xử lý thời gian nâng cao | https://dateutil.readthedocs.io |
| httpx | 0.28.1 | BSD-3-Clause | HTTP client async cho Python | https://www.python-httpx.org |
| python-jose[cryptography] | 3.5.0 | MIT | JWT & JOSE cho Python | https://python-jose.readthedocs.io |
| bcrypt | 5.0.0 | Apache-2.0 | Thuật toán băm mật khẩu | https://pypi.org/project/bcrypt |
| python-multipart | 0.0.20 | Apache-2.0 | Xử lý form-data multipart | https://andrew-d.github.io/python-multipart |
| pydantic | 2.11.9 | MIT | Data validation & settings management | https://docs.pydantic.dev

(*) Phiên bản từ `pip list` vào thời điểm cập nhật (căn cứ `requirements.txt`).

## Frontend (JavaScript/TypeScript)

| Thư viện | Phiên bản | Giấy phép | Mô tả | URL |
|----------|-----------|-----------|-------|-----|
| react | 19.2.0 | MIT | Thư viện xây dựng UI | https://react.dev |
| react-dom | 19.2.0 | MIT | DOM renderer cho React | https://react.dev |
| vite | 7.2.4 | MIT | Build tool & dev server cho SPA | https://vitejs.dev |
| typescript | 5.9.3 | Apache-2.0 | Ngôn ngữ superset của JavaScript | https://www.typescriptlang.org |
| tailwindcss | 3.4.15 | MIT | CSS framework dạng utility-first | https://tailwindcss.com |
| autoprefixer | 10.4.20 | MIT | Thêm vendor prefix CSS | https://github.com/postcss/autoprefixer |
| postcss | 8.4.49 | MIT | Công cụ xử lý CSS | https://postcss.org |
| leaflet | 1.9.4 | BSD-2-Clause | Thư viện bản đồ web mã nguồn mở | https://leafletjs.com |
| react-leaflet | 5.0.0 | MIT | Binding React cho Leaflet | https://react-leaflet.js.org |
| maplibre-gl | 5.13.0 | BSD-3-Clause | Render bản đồ vector 2D/3D | https://maplibre.org |
| lucide-react | 0.555.0 | ISC | Bộ icon cho React | https://lucide.dev |
| @vitejs/plugin-react | 5.1.1 | MIT | Plugin React cho Vite (SWC) | https://github.com/vitejs/vite-plugin-react |
| @types/react | 19.2.5 | MIT | Typings React cho TypeScript | https://github.com/DefinitelyTyped/DefinitelyTyped |
| @types/react-dom | 19.2.3 | MIT | Typings ReactDOM | https://github.com/DefinitelyTyped/DefinitelyTyped |
| @types/leaflet | 1.9.21 | MIT | Typings Leaflet | https://github.com/DefinitelyTyped/DefinitelyTyped |
| @types/node | 24.10.1 | MIT | Typings Node.js | https://github.com/DefinitelyTyped/DefinitelyTyped |
| eslint | 9.39.1 | MIT | Linter cho JavaScript/TypeScript | https://eslint.org |
| @eslint/js | 9.39.1 | MIT | Bộ rule mặc định cho ESLint | https://github.com/eslint/eslint |
| eslint-plugin-react-hooks | 7.0.1 | MIT | Quy tắc ESLint cho React Hooks | https://www.npmjs.com/package/eslint-plugin-react-hooks |
| eslint-plugin-react-refresh | 0.4.24 | MIT | Rule ESLint cho React Fast Refresh | https://www.npmjs.com/package/eslint-plugin-react-refresh |
| typescript-eslint | 8.46.4 | BSD-2-Clause | ESLint tooling cho TypeScript | https://typescript-eslint.io |
| globals | 16.5.0 | MIT | Danh sách biến global cho ESLint | https://github.com/sindresorhus/globals |

> **Ghi chú:** Bảng trên tập trung vào dependency cấp ứng dụng. Các dependency transitively hoặc toolchain nhỏ hơn (ví dụ quick-lru, picocolors ...) không liệt kê đầy đủ ở đây nhưng có thể tra cứu trong `package-lock.json`.

## Dữ liệu & công cụ đi kèm

| Thành phần | Phiên bản/Giấy phép | Mô tả | URL |
|------------|----------------------|-------|-----|
| ev-charging-open-data | CC BY 4.0 | Bộ dữ liệu JSON-LD (stations, observations, sessions) | https://github.com/tynnp/ev-charging-open-data |
| OSRM (demo server) | BSD-2-Clause | Dịch vụ định tuyến mã nguồn mở | http://project-osrm.org |
| MapLibre style (open) | BSD-style | Style bản đồ mặc định của MapLibre | https://maplibre.org |

## Quy tắc và nghĩa vụ giấy phép

- Tất cả thư viện mã nguồn mở bên thứ ba giữ nguyên giấy phép gốc. Khi phân phối/triển khai, cần **ghi công** rõ ràng (MIT, BSD, Apache, ISC, v.v.).
- Dữ liệu JSON-LD `ev-charging-open-data` phát hành dưới giấy phép **Creative Commons Attribution 4.0 International (CC BY 4.0)** – bắt buộc ghi công nguồn.