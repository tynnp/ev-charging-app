/* SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
 * This file is part of ev-charging-app and is licensed under the
 * MIT License. See the LICENSE file in the project root for details.
 */

import type { Station } from '../../types/ev'
import {
  Loader2,
  Plug,
  CheckCircle2,
  XCircle,
  Wrench,
  MapPin,
  Globe,
  Zap,
  Car,
} from 'lucide-react'

type StationListProps = {
  stations: Station[]
  selectedStationId?: string
  loading: boolean
  onSelectStation: (stationId: string) => void
}

export function StationList({
  stations,
  selectedStationId,
  loading,
  onSelectStation,
}: StationListProps) {
  if (loading && stations.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 rounded-xl bg-slate-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#124874] mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-600">Đang tải danh sách trạm...</p>
        </div>
      </div>
    )
  }

  if (!loading && stations.length === 0) {
    return (
      <div className="rounded-xl bg-slate-50 p-6 text-center">
        <p className="text-sm font-medium text-slate-600">Không có trạm nào phù hợp với bộ lọc hiện tại.</p>
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {stations.map((station) => {
        const isSelected = station.id === selectedStationId
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

        const baseClasses =
          'group cursor-pointer rounded-xl border px-4 py-4 text-sm transition-all duration-200'
        const stateClasses = isSelected
          ? ' border-[#124874] bg-gradient-to-br from-[#124874]/10 to-[#0f3a5a]/5 shadow-md ring-2 ring-[#124874]/20'
          : ' border-slate-200 bg-white hover:border-[#124874]/40 hover:shadow-md hover:bg-slate-50/50'

        return (
          <li
            key={station.id}
            onClick={() => onSelectStation(station.id)}
            className={`${baseClasses}${stateClasses}`}
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 flex-1">
                <Plug className="h-5 w-5 mt-0.5 text-[#124874]" />
                <div className="flex-1">
                  <div className="font-bold text-slate-900 group-hover:text-[#124874] transition-colors">
                    {station.name}
                  </div>
                </div>
              </div>
              <span className={statusClasses}>
                {station.status === 'operational' && (
                  <CheckCircle2 className="h-3 w-3 inline mr-1" />
                )}
                {station.status === 'outOfService' && (
                  <XCircle className="h-3 w-3 inline mr-1" />
                )}
                {station.status === 'maintenance' && (
                  <Wrench className="h-3 w-3 inline mr-1" />
                )}
                {station.status || 'unknown'}
              </span>
            </div>
            <div className="mb-3 flex items-center gap-1.5 text-sm text-slate-600">
              <MapPin className="h-3.5 w-3.5 text-slate-500" />
              <span>{addressText || 'Không có địa chỉ'}</span>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
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
                  Công suất: {station.capacity}kW
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
          </li>
        )
      })}
    </ul>
  )
}
