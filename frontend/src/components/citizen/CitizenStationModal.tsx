/* SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
 * This file is part of ev-charging-app and is licensed under the
 * MIT License. See the LICENSE file in the project root for details.
 */

import { useEffect, useState } from 'react'
import type { Station, StationRealtime } from '../../types/ev'
import { MapView } from '../stations/MapView'
import {
  X,
  Plug,
  MapPin,
  Zap,
  Car,
  CheckCircle2,
  Battery,
  Clock,
  Loader2,
  RefreshCw,
  Navigation,
  Globe,
} from 'lucide-react'
import { formatOpeningHours, formatVehicleTypes, getStationStatusLabel } from '../../utils/labels'

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000'

type CitizenStationModalProps = {
  station: Station | null
  distanceKm?: number | null
  onClose: () => void
}

function formatDistance(km: number | null | undefined): string {
  if (km == null) return ''
  if (km < 1) return `${Math.round(km * 1000)}m`
  return `${km.toFixed(1)}km`
}

export function CitizenStationModal({
  station,
  distanceKm,
  onClose,
}: CitizenStationModalProps) {
  const [realtime, setRealtime] = useState<StationRealtime | null>(null)
  const [loadingRealtime, setLoadingRealtime] = useState(false)

  useEffect(() => {
    if (station) {
      void loadRealtime()
    } else {
      setRealtime(null)
    }
  }, [station?.id])

  async function loadRealtime() {
    if (!station) return
    try {
      setLoadingRealtime(true)
      const res = await fetch(
        `${API_BASE_URL}/stations/${encodeURIComponent(station.id)}/realtime`,
      )
      if (res.ok) {
        const data = (await res.json()) as StationRealtime
        setRealtime(data)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoadingRealtime(false)
    }
  }

  if (!station) return null

  const addressParts = [
    station.address?.streetAddress,
    station.address?.addressLocality,
    station.address?.postalCode,
    station.address?.addressCountry,
  ].filter(Boolean)
  const addressText = addressParts.join(', ')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
      <div className="relative w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto rounded-xl sm:rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-[#CF373D] to-[#b82e33] px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <Plug className="h-5 w-5 sm:h-6 sm:w-6 text-white flex-shrink-0" />
            <h2 className="text-lg sm:text-xl font-bold text-white truncate">{station.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-white transition-colors hover:bg-white/20 flex-shrink-0"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        <div className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-4 md:space-y-6 overflow-y-auto">
          {distanceKm != null && (
            <div className="flex items-center gap-1.5 sm:gap-2 rounded-lg bg-blue-50 px-3 sm:px-4 py-2 sm:py-3 border border-blue-200">
              <Navigation className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-semibold text-blue-900 break-words">
                Khoảng cách: {formatDistance(distanceKm)}
              </span>
            </div>
          )}

          {addressText ? (
            <div className="flex items-start gap-1.5 sm:gap-2 rounded-lg bg-slate-50 p-3 sm:p-4 border border-slate-200">
              <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-slate-500 mb-1">Địa chỉ</div>
                <div className="text-xs sm:text-sm font-medium text-slate-900 break-words">{addressText}</div>
              </div>
            </div>
          ) : null}

          {Array.isArray(station.location?.coordinates) &&
          station.location.coordinates.length >= 2 ? (
            <div>
              <h3 className="mb-2 text-xs sm:text-sm font-bold text-slate-900">Vị trí trên bản đồ</h3>
              <div className="h-48 sm:h-64 overflow-hidden rounded-xl border-2 border-slate-200">
                <MapView
                  center={[
                    station.location.coordinates[0],
                    station.location.coordinates[1],
                  ]}
                  zoom={15}
                />
              </div>
            </div>
          ) : null}

          <div className="grid gap-2 sm:gap-3 md:gap-4 grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg bg-slate-50 p-3 sm:p-4 border border-slate-200">
              <div className="mb-1 flex items-center gap-1 sm:gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <Zap className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                Trạng thái
              </div>
              <div className="text-sm sm:text-base font-bold text-slate-900 break-words">
                {getStationStatusLabel(station.status)}
              </div>
            </div>
            {station.available_capacity != null ? (
              <div className="rounded-lg bg-emerald-50 p-3 sm:p-4 border border-emerald-200">
                <div className="mb-1 flex items-center gap-1 sm:gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                  Số chỗ trống
                </div>
                <div className="text-sm sm:text-base font-bold text-emerald-900 break-words">
                  {station.available_capacity}
                </div>
              </div>
            ) : null}
            {station.capacity != null ? (
              <div className="rounded-lg bg-purple-50 p-3 sm:p-4 border border-purple-200">
                <div className="mb-1 flex items-center gap-1 sm:gap-1.5 text-xs font-semibold uppercase tracking-wide text-purple-700">
                  <Battery className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                  Công suất thiết kế
                </div>
                <div className="text-sm sm:text-base font-bold text-purple-900 break-words">{station.capacity} kW</div>
              </div>
            ) : null}
            {station.socket_number != null ? (
              <div className="rounded-lg bg-blue-50 p-3 sm:p-4 border border-blue-200">
                <div className="mb-1 flex items-center gap-1 sm:gap-1.5 text-xs font-semibold uppercase tracking-wide text-blue-700">
                  <Plug className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                  Số ổ sạc
                </div>
                <div className="text-sm sm:text-base font-bold text-blue-900 break-words">{station.socket_number}</div>
              </div>
            ) : null}
            {station.network ? (
              <div className="rounded-lg bg-cyan-50 p-3 sm:p-4 border border-cyan-200">
                <div className="mb-1 flex items-center gap-1 sm:gap-1.5 text-xs font-semibold uppercase tracking-wide text-cyan-700">
                  <Globe className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                  Nhà mạng
                </div>
                <div className="text-sm sm:text-base font-bold text-cyan-900 break-words">{station.network}</div>
              </div>
            ) : null}
            {station.allowed_vehicle_types && station.allowed_vehicle_types.length > 0 ? (
              <div className="rounded-lg bg-amber-50 p-3 sm:p-4 border border-amber-200">
                <div className="mb-1 flex items-center gap-1 sm:gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700">
                  <Car className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                  Loại phương tiện
                </div>
                <div className="text-sm sm:text-base font-bold text-amber-900 break-words">
                  {formatVehicleTypes(station.allowed_vehicle_types)}
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-lg sm:rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 p-3 sm:p-4">
            <div className="mb-2 sm:mb-3 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base font-bold text-slate-900">
                <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                Trạng thái Realtime
              </h3>
              <button
                type="button"
                onClick={() => void loadRealtime()}
                disabled={loadingRealtime}
                className="rounded-lg p-1.5 sm:p-2 text-blue-600 transition-colors hover:bg-blue-100 disabled:opacity-50 flex-shrink-0"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${loadingRealtime ? 'animate-spin' : ''}`}
                />
              </button>
            </div>
            {loadingRealtime && !realtime ? (
              <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-slate-600">
                <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin flex-shrink-0" />
                <span className="break-words">Đang tải dữ liệu realtime...</span>
              </div>
            ) : realtime ? (
              <div className="grid gap-2 sm:gap-3 grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
                {realtime.status != null && (
                  <div className="rounded-lg bg-white p-3 border border-blue-200">
                    <div className="text-xs font-semibold text-blue-700 mb-1">Trạng thái</div>
                    <div className="text-sm font-bold text-blue-900">
                      {getStationStatusLabel(realtime.status)}
                    </div>
                  </div>
                )}
                {realtime.available_capacity != null && (
                  <div className="rounded-lg bg-white p-3 border border-emerald-200">
                    <div className="text-xs font-semibold text-emerald-700 mb-1">Chỗ trống</div>
                    <div className="text-sm font-bold text-emerald-900">
                      {realtime.available_capacity}
                    </div>
                  </div>
                )}
                {realtime.instantaneous_power != null && (
                  <div className="rounded-lg bg-white p-3 border border-amber-200">
                    <div className="text-xs font-semibold text-amber-700 mb-1">Công suất (kW)</div>
                    <div className="text-sm font-bold text-amber-900">
                      {realtime.instantaneous_power.toFixed(1)}
                    </div>
                  </div>
                )}
                {realtime.queue_length != null && (
                  <div className="rounded-lg bg-white p-3 border border-orange-200">
                    <div className="text-xs font-semibold text-orange-700 mb-1">Xe đang chờ</div>
                    <div className="text-sm font-bold text-orange-900">
                      {realtime.queue_length}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-slate-600">Chưa có dữ liệu realtime</div>
            )}
          </div>

          {station.opening_hours && (
            <div className="rounded-lg bg-slate-50 p-3 sm:p-4 border border-slate-200">
              <div className="mb-1 flex items-center gap-1 sm:gap-1.5 text-xs font-semibold text-slate-500">
                <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                Giờ mở cửa
              </div>
              <div className="whitespace-pre-line text-xs sm:text-sm font-medium text-slate-900 break-words">
                {formatOpeningHours(station.opening_hours)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

