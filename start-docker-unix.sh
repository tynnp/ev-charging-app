#!/bin/bash
# SPDX-License-Identifier: MIT
# Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
# This file is part of ev-charging-app and is licensed under the
# MIT License. See the LICENSE file in the project root for details.

set -e

echo "========================================"
echo "EV Charging App - Docker Setup (Linux/macOS)"
echo "========================================"

# Kiểm tra xem Docker có đang chạy không
if ! docker info > /dev/null 2>&1; then
    echo "LỖI: Docker chưa được cài đặt hoặc chưa chạy!"
    echo "Vui lòng khởi động Docker và thử lại."
    exit 1
fi

# Kiểm tra xem docker-compose có sẵn không
if ! command -v docker-compose &> /dev/null; then
    echo "LỖI: Không tìm thấy docker-compose!"
    echo "Vui lòng cài đặt Docker Compose và thử lại."
    exit 1
fi

echo
echo "Chọn tùy chọn:"
echo "1. Khởi động tất cả dịch vụ (mongo, backend, frontend)"
echo "2. Dừng tất cả dịch vụ"
echo "3. Khởi động lại tất cả dịch vụ"
echo "4. Xem nhật ký"
echo "5. Dọn dẹp (xóa containers, images, volumes)"
echo "6. Thoát"
echo

read -p "Nhập lựa chọn của bạn (1-6): " choice

case $choice in
    1)
        echo
        echo "Đang khởi động các dịch vụ..."
        docker-compose up -d
        echo "Đã khởi động các dịch vụ thành công!"
        echo "Giao diện người dùng: http://localhost:5173"
        echo "API Backend: http://localhost:8000"
        echo "MongoDB: localhost:27017"
        ;;
    2)
        echo
        echo "Đang dừng tất cả dịch vụ..."
        docker-compose down
        echo "Đã dừng các dịch vụ thành công!"
        ;;
    3)
        echo
        echo "Đang khởi động lại các dịch vụ..."
        docker-compose down
        docker-compose up -d
        echo "Đã khởi động lại các dịch vụ thành công!"
        echo "Giao diện người dùng: http://localhost:5173"
        echo "API Backend: http://localhost:8000"
        echo "MongoDB: localhost:27017"
        ;;
    4)
        echo
        echo "Đang hiển thị nhật ký (nhấn Ctrl+C để thoát):"
        docker-compose logs -f
        ;;
    5)
        echo
        echo "CẢNH BÁO: Hành động này sẽ xóa tất cả containers, images và volumes!"
        read -p "Bạn có chắc chắn không? (y/N): " confirm
        if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
            echo "Đang dọn dẹp..."
            docker-compose down -v --rmi all
            docker system prune -f
            echo "Đã dọn dẹp xong!"
        else
            echo "Đã hủy thao tác dọn dẹp."
        fi
        ;;
    6)
        echo
        echo "Tạm biệt!"
        exit 0
        ;;
    *)
        echo "Lựa chọn không hợp lệ! Vui lòng thử lại."
        exit 1
        ;;
esac

echo
