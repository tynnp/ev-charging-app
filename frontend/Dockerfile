# SPDX-License-Identifier: MIT
# Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
# This file is part of ev-charging-app and is licensed under the
# MIT License. See the LICENSE file in the project root for details.

# Frontend - Vite React build and Nginx serve
FROM node:20-alpine AS builder
WORKDIR /app

# Install deps
COPY frontend/package*.json ./
RUN npm ci

# Build
COPY frontend ./
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

# Serve with nginx
FROM nginx:alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
