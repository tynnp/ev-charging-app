@echo off
REM SPDX-License-Identifier: MIT
REM Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
REM This file is part of ev-charging-app and is licensed under the
REM MIT License. See the LICENSE file in the project root for details.

REM Set console to use UTF-8
chcp 65001 >nul
title EV Charging App - Docker Setup

echo ========================================
echo EV Charging App - Docker Setup (Windows)
echo ========================================

REM Check if Docker is running
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not installed or not running!
    echo Please start Docker Desktop and try again.
    echo Vui lòng khởi động Docker Desktop và thử lại.
    pause
    exit /b 1
)

REM Kiểm tra xem docker-compose có sẵn không
docker-compose version >nul 2>&1
if %errorlevel% neq 0 (
    echo LỖI: Không tìm thấy docker-compose!
    echo Vui lòng cài đặt Docker Compose và thử lại.
    pause
    exit /b 1
)

echo.
echo Chọn tùy chọn:
echo 1. Khởi động tất cả dịch vụ (mongo, backend, frontend)
echo 2. Dừng tất cả dịch vụ
echo 3. Khởi động lại tất cả dịch vụ
echo 4. Xem nhật ký
echo 5. Dọn dẹp (xóa containers, images, volumes)
echo 6. Thoát
echo.

set /p choice="Nhập lựa chọn của bạn (1-6): "

if "%choice%"=="1" goto start
if "%choice%"=="2" goto stop
if "%choice%"=="3" goto restart
if "%choice%"=="4" goto logs
if "%choice%"=="5" goto cleanup
if "%choice%"=="6" goto exit

echo Lựa chọn không hợp lệ! Vui lòng thử lại.
pause
goto :eof

:start
echo.
echo Đang khởi động các dịch vụ...
docker-compose up -d
if %errorlevel% equ 0 (
    echo Đã khởi động các dịch vụ thành công!
    echo Giao diện người dùng: http://localhost:5173
    echo API Backend: http://localhost:8000
    echo MongoDB: localhost:27017
) else (
    echo Không thể khởi động các dịch vụ!
)
pause
goto :eof

:stop
echo.
echo Đang dừng tất cả dịch vụ...
docker-compose down
if %errorlevel% equ 0 (
    echo Đã dừng các dịch vụ thành công!
) else (
    echo Không thể dừng các dịch vụ!
)
pause
goto :eof

:restart
echo.
echo Đang khởi động lại các dịch vụ...
docker-compose down
docker-compose up -d
if %errorlevel% equ 0 (
    echo Đã khởi động lại các dịch vụ thành công!
    echo Giao diện người dùng: http://localhost:5173
    echo API Backend: http://localhost:8000
    echo MongoDB: localhost:27017
) else (
    echo Không thể khởi động lại các dịch vụ!
)
pause
goto :eof

:logs
echo.
echo Đang hiển thị nhật ký (nhấn Ctrl+C để thoát):
docker-compose logs -f
pause
goto :eof

:cleanup
echo.
echo CẢNH BÁO: Hành động này sẽ xóa tất cả containers, images và volumes!
set /p confirm="Bạn có chắc chắn không? (y/N): "
if /i "%confirm%" neq "y" goto :eof

echo Đang dọn dẹp...
docker-compose down -v --rmi all
docker system prune -f
echo Đã dọn dẹp xong!
pause
goto :eof

:exit
echo.
echo Tạm biệt!
pause
goto :eof
