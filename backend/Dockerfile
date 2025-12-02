# SPDX-License-Identifier: MIT
# Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
# This file is part of ev-charging-app and is licensed under the
# MIT License. See the LICENSE file in the project root for details.

# Backend - FastAPI
FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# System deps (git for fetching open data, build tools for potential wheels)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git build-essential \
  && rm -rf /var/lib/apt/lists/*

# Install Python deps first for better caching
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Fetch open data at build-time for reproducibility
RUN git clone --depth=1 https://github.com/tynnp/ev-charging-open-data.git /opt/open-data

# Copy app source
COPY backend/app ./app

# Entrypoint
COPY backend/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh \
  && chmod +x /usr/local/bin/docker-entrypoint.sh

ENV EV_OPEN_DATA_DIR=/opt/open-data/data
EXPOSE 8000

CMD ["sh", "/usr/local/bin/docker-entrypoint.sh"]
