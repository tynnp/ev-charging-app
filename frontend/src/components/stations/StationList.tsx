/* SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
 * This file is part of ev-charging-app and is licensed under the
 * MIT License. See the LICENSE file in the project root for details.
 */

import type { Station } from '../../types/ev'

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
    return <p className="text-sm text-slate-500">Đang tải danh sách trạm...</p>
  }

  if (!loading && stations.length === 0) {
    return <p className="text-sm text-slate-500">Không có trạm nào phù hợp với bộ lọc hiện tại.</p>
  }

  return (
    <ul className="space-y-2">
      {stations.map((station) => {
        const isSelected = station.id === selectedStationId
        const addressParts = [
          station.address?.streetAddress,
          station.address?.addressLocality,
        ].filter(Boolean)
        const addressText = addressParts.join(', ')

        let statusClasses =
          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium '
        if (station.status === 'operational') {
          statusClasses += 'bg-emerald-50 text-emerald-700'
        } else if (station.status === 'outOfService') {
          statusClasses += 'bg-red-50 text-red-700'
        } else if (station.status === 'maintenance') {
          statusClasses += 'bg-amber-50 text-amber-700'
        } else {
          statusClasses += 'bg-slate-100 text-slate-700'
        }

        const baseClasses =
          'cursor-pointer rounded-lg border px-3 py-3 text-sm transition hover:bg-slate-50 hover:shadow-sm'
        const stateClasses = isSelected
          ? ' border-indigo-500 bg-indigo-50'
          : ' border-slate-200 bg-white'

        return (
          <li
            key={station.id}
            onClick={() => onSelectStation(station.id)}
            className={`${baseClasses}${stateClasses}`}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="font-semibold text-slate-900">{station.name}</div>
              <span className={statusClasses}>{station.status || 'unknown'}</span>
            </div>
            <div className="mb-1 text-sm text-slate-500">
              {addressText || 'Không có địa chỉ'}
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
              {station.network && (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5">
                  Network: {station.network}
                </span>
              )}
              {station.available_capacity != null && (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5">
                  Còn trống: {station.available_capacity}
                </span>
              )}
              {station.capacity != null && (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5">
                  Công suất: {station.capacity}
                </span>
              )}
              {station.allowed_vehicle_types && station.allowed_vehicle_types.length > 0 && (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5">
                  Loại xe:{' '}
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
