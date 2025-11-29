/* SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
 * This file is part of ev-charging-app and is licensed under the
 * MIT License. See the LICENSE file in the project root for details.
 */

const STATUS_LABELS: Record<string, string> = {
  operational: 'Đang hoạt động',
  working: 'Đang hoạt động',
  outofservice: 'Ngưng hoạt động',
  outoforder: 'Ngưng hoạt động',
  maintenance: 'Đang bảo trì',
  almostfull: 'Gần đầy',
  almostempty: 'Gần trống',
  withincidence: 'Đang gặp sự cố',
  planned: 'Đang được lên kế hoạch',
  underconstruction: 'Đang xây dựng',
  closed: 'Đã đóng cửa',
  inactive: 'Không hoạt động',
  unknown: 'Không xác định',
  finished: 'Đã hoàn tất',
  completed: 'Đã hoàn tất',
  success: 'Thành công',
  inprogress: 'Đang tiến hành',
  processing: 'Đang xử lý',
  pending: 'Đang chờ',
  queued: 'Đang chờ',
  cancelled: 'Đã huỷ',
  canceled: 'Đã huỷ',
  failed: 'Thất bại',
  error: 'Lỗi',
}

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  electriccar: 'Ô tô điện',
  electricmotorcycle: 'Xe máy điện',
  electricbus: 'Xe buýt điện',
  electrictruck: 'Xe tải điện',
  electricbike: 'Xe đạp điện',
}

export function getStationStatusLabel(status?: string | null): string {
  if (!status) {
    return 'Không xác định'
  }
  const normalized = status.trim()
  const key = normalized.toLowerCase().replace(/[^a-z0-9]/g, '')
  const label = STATUS_LABELS[key]
  if (label) {
    return label
  }
  return normalized
}

export function formatVehicleTypes(types?: string[] | null): string {
  if (!types || types.length === 0) {
    return ''
  }
  const labels = types.map((type) => {
    const normalized = type.trim()
    return VEHICLE_TYPE_LABELS[normalized.toLowerCase()] ?? normalized
  })
  const uniqueLabels = Array.from(new Set(labels))
  return uniqueLabels.join(', ')
}

export function formatVehicleType(type?: string | null): string {
  if (!type) {
    return 'Không xác định'
  }
  const normalized = type.trim()
  return VEHICLE_TYPE_LABELS[normalized.toLowerCase()] ?? normalized
}
