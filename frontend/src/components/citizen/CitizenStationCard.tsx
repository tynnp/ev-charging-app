/* SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
 * This file is part of ev-charging-app and is licensed under the
 * MIT License. See the LICENSE file in the project root for details.
 */

import type { Station } from '../../types/ev'
import {
  Plug,
  MapPin,
  CheckCircle2,
  XCircle,
  Wrench,
  Globe,
  Zap,
  Car,
  Navigation,
  Eye,
} from 'lucide-react'

type CitizenStationCardProps = {
  station: Station
  distanceKm?: number | null
  onSelect: (station: Station) => void
}

function formatDistance(km: number | null | undefined): string {
  if (km == null) return ''
  if (km < 1) return `${Math.round(km * 1000)}m`
  return `${km.toFixed(1)}km`
}

export function CitizenStationCard({ station, distanceKm, onSelect }: CitizenStationCardProps) {
  const addressParts = [
    station.address?.streetAddress,
    station.address?.addressLocality,
  ].filter(Boolean)
  const addressText = addressParts.join(', ')

  let statusClasses =
    'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold '
  if (station.status === 'operational') {
    statusClasses += 'bg-emerald-100 text-emerald-700 border border-emerald-200'
  } else if (station.status === 'outOfService') {
    statusClasses += 'bg-red-100 text-red-700 border border-red-200'
  } else if (station.status === 'maintenance') {
    statusClasses += 'bg-amber-100 text-amber-700 border border-amber-200'
  } else {
    statusClasses += 'bg-slate-100 text-slate-700 border border-slate-200'
  }

  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-[#CF373D]/40 hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1">
          <Plug className="h-5 w-5 mt-0.5 text-[#CF373D]" />
          <div className="flex-1">
            <div className="font-bold text-base text-slate-900 group-hover:text-[#CF373D] transition-colors mb-1">
              {station.name}
            </div>
            {distanceKm != null && (
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Navigation className="h-3 w-3" />
                <span>{formatDistance(distanceKm)}</span>
              </div>
            )}
          </div>
        </div>
        <span className={statusClasses}>
          {station.status === 'operational' && (
            <CheckCircle2 className="h-3 w-3 inline mr-1" />
          )}
          {station.status === 'outOfService' && <XCircle className="h-3 w-3 inline mr-1" />}
          {station.status === 'maintenance' && <Wrench className="h-3 w-3 inline mr-1" />}
          {station.status || 'unknown'}
        </span>
      </div>

      {addressText ? (
        <div className="mb-3 flex items-center gap-1.5 text-sm text-slate-600">
          <MapPin className="h-3.5 w-3.5 text-slate-500" />
          <span>{addressText}</span>
        </div>
      ) : null}

      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        {station.network && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 font-medium text-blue-700 border border-blue-100">
            <Globe className="h-3 w-3" />
            {station.network}
          </span>
        )}
        {station.available_capacity != null && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700 border border-emerald-100">
            <CheckCircle2 className="h-3 w-3" />
            Còn trống: {station.available_capacity}
          </span>
        )}
        {station.capacity != null && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-purple-50 px-2.5 py-1 font-medium text-purple-700 border border-purple-100">
            <Zap className="h-3 w-3" />
            {station.capacity}kW
          </span>
        )}
        {station.allowed_vehicle_types && station.allowed_vehicle_types.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 font-medium text-amber-700 border border-amber-100">
            <Car className="h-3 w-3" />
            {station.allowed_vehicle_types
              .map((value) => value.replace('electric', ''))
              .join(', ')}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => onSelect(station)}
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-[#CF373D]/30 bg-gradient-to-r from-[#CF373D] to-[#b82e33] px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[#CF373D] focus:ring-offset-2"
      >
        <Eye className="h-4 w-4" />
        Xem chi tiết
      </button>
    </div>
  )
}

