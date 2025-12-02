#!/bin/sh
# SPDX-License-Identifier: MIT
# Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
# This file is part of ev-charging-app and is licensed under the
# MIT License. See the LICENSE file in the project root for details.

set -e

: "${EV_OPEN_DATA_DIR:=/opt/open-data/data}"
export EV_OPEN_DATA_DIR

: "${RUN_ETL:=true}"

if [ "$RUN_ETL" = "true" ]; then
  echo "[backend] Running ETL to load sample data from $EV_OPEN_DATA_DIR ..."
  python -m app.etl || echo "[backend] ETL failed or partially completed; continuing"
fi

exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
