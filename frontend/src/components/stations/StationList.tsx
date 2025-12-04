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
import { formatVehicleTypes, getStationStatusLabel } from '../../utils/labels'

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
      <div className="flex items-center justify-center py-8 sm:py-12 rounded-lg sm:rounded-xl bg-slate-50">
        <div className="text-center px-4">
          <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-[#124874] mx-auto mb-2" />
          <p className="text-xs sm:text-sm font-medium text-slate-600 break-words">Đang tải danh sách trạm...</p>
        </div>
      </div>
    )
  }

  if (!loading && stations.length === 0) {
    return (
      <div className="rounded-lg sm:rounded-xl bg-slate-50 p-4 sm:p-6 text-center">
        <p className="text-xs sm:text-sm font-medium text-slate-600 break-words px-2">Không có trạm nào phù hợp với bộ lọc hiện tại.</p>
      </div>
    )
  }

  return (
    <ul className="space-y-2 sm:space-y-3">
      {stations.map((station) => {
        const isSelected = station.id === selectedStationId
        const addressParts = [
          station.address?.streetAddress,
          station.address?.addressLocality,
        ].filter(Boolean)
        const addressText = addressParts.join(', ')

        let statusClasses =
          'inline-flex items-center gap-0.5 sm:gap-1 rounded-full px-1.5 sm:px-2.5 py-0.5 sm:py-1 text-xs font-semibold flex-shrink-0 '
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
          'group cursor-pointer rounded-lg sm:rounded-xl border px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm transition-all duration-200'
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
              <div className="flex items-start gap-1.5 sm:gap-2 flex-1 min-w-0">
                <Plug className="h-4 w-4 sm:h-5 sm:w-5 mt-0.5 text-[#124874] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900 group-hover:text-[#124874] transition-colors break-words">
                    {station.name}
                  </div>
                </div>
              </div>
              <span className={statusClasses}>
                {station.status === 'operational' && (
                  <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                )}
                {station.status === 'outOfService' && (
                  <XCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                )}
                {station.status === 'maintenance' && (
                  <Wrench className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                )}
                <span className="hidden xs:inline">{getStationStatusLabel(station.status)}</span>
                <span className="xs:hidden">...</span>
              </span>
            </div>
            <div className="mb-2 sm:mb-3 flex items-start gap-1.5 text-xs sm:text-sm text-slate-600">
              <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
              <span className="break-words">{addressText || 'Không có địa chỉ'}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2 text-xs">
              {station.network && (
                <span className="inline-flex items-center gap-0.5 sm:gap-1 rounded-lg bg-blue-50 px-1.5 sm:px-2.5 py-0.5 sm:py-1 font-medium text-blue-700 border border-blue-100">
                  <Globe className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                  <span className="truncate max-w-[100px] sm:max-w-none">{station.network}</span>
                </span>
              )}
              {station.available_capacity != null && (
                <span className="inline-flex items-center gap-0.5 sm:gap-1 rounded-lg bg-emerald-50 px-1.5 sm:px-2.5 py-0.5 sm:py-1 font-medium text-emerald-700 border border-emerald-100">
                  <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                  <span className="hidden sm:inline">Còn trống: </span>
                  <span>{station.available_capacity}</span>
                </span>
              )}
              {station.capacity != null && (
                <span className="inline-flex items-center gap-0.5 sm:gap-1 rounded-lg bg-purple-50 px-1.5 sm:px-2.5 py-0.5 sm:py-1 font-medium text-purple-700 border border-purple-100">
                  <Zap className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                  <span className="hidden sm:inline">Công suất: </span>
                  <span>{station.capacity}kW</span>
                </span>
              )}
              {station.allowed_vehicle_types && station.allowed_vehicle_types.length > 0 && (
                <span className="inline-flex items-center gap-0.5 sm:gap-1 rounded-lg bg-amber-50 px-1.5 sm:px-2.5 py-0.5 sm:py-1 font-medium text-amber-700 border border-amber-100">
                  <Car className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                  <span className="truncate max-w-[80px] sm:max-w-none">{formatVehicleTypes(station.allowed_vehicle_types)}</span>
                </span>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
