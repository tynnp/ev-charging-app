/* SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
 * This file is part of ev-charging-app and is licensed under the
 * MIT License. See the LICENSE file in the project root for details.
 */

import { useState } from 'react'
import type { Station } from '../../types/ev'
import { StationList } from '../stations/StationList'
import {
  BarChart3,
  Loader2,
  AlertTriangle,
  X,
  Plug,
} from 'lucide-react'

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000'

type ComparisonResult = {
  station_id: string
  station_name?: string
  status: string
  available_capacity?: number
  capacity?: number
  network?: string
  total_sessions: number
  avg_energy_per_session_kwh: number
  address?: {
    streetAddress?: string
    addressLocality?: string
  }
  location?: {
    coordinates: number[]
  }
}

export function ComparisonPage() {
  const [selectedStations, setSelectedStations] = useState<Station[]>([])
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCompare() {
    if (selectedStations.length < 2) {
      setError('Vui lòng chọn ít nhất 2 trạm để so sánh.')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const stationIds = selectedStations.map((s) => s.id)
      const params = new URLSearchParams()
      stationIds.forEach((id) => {
        params.append('station_ids', id)
      })

      const res = await fetch(`${API_BASE_URL}/citizen/compare?${params.toString()}`)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const data = (await res.json()) as { stations: ComparisonResult[] }
      setComparisonResult(data.stations)
    } catch (e) {
      console.error(e)
      setError('Không thể so sánh các trạm. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  function removeStation(stationId: string) {
    setSelectedStations(selectedStations.filter((s) => s.id !== stationId))
    setComparisonResult(null)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200/50 bg-gradient-to-br from-white to-slate-50/50 p-6 shadow-lg">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-[#CF373D]" />
          <h3 className="text-lg font-bold text-slate-900">So sánh trạm sạc</h3>
        </div>

        <div className="mb-4 rounded-xl bg-blue-50 p-4 border border-blue-200">
          <p className="text-sm text-blue-800">
            Chọn ít nhất 2 trạm từ danh sách bên dưới để so sánh các thông tin như trạng thái,
            công suất, số phiên sạc, v.v.
          </p>
        </div>

        {selectedStations.length > 0 && (
          <div className="mb-4 space-y-2">
            <div className="text-sm font-semibold text-slate-700">
              Đã chọn ({selectedStations.length} trạm):
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedStations.map((station) => (
                <div
                  key={station.id}
                  className="flex items-center gap-2 rounded-lg bg-[#CF373D] px-3 py-2 text-sm font-medium text-white"
                >
                  <Plug className="h-4 w-4" />
                  <span>{station.name}</span>
                  <button
                    type="button"
                    onClick={() => removeStation(station.id)}
                    className="ml-1 rounded-full p-0.5 hover:bg-white/20 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void handleCompare()}
              disabled={loading || selectedStations.length < 2}
              className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-gradient-to-r from-[#CF373D] to-[#b82e33] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#CF373D] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang so sánh...
                </>
              ) : (
                <>
                  <BarChart3 className="h-4 w-4" />
                  So sánh {selectedStations.length} trạm
                </>
              )}
            </button>
          </div>
        )}

        {error ? (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 border border-red-200">
            <AlertTriangle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/50 bg-white p-6 shadow-lg">
          <h4 className="mb-4 text-base font-bold text-slate-900">Chọn trạm để so sánh</h4>
          <StationList
            stations={[]}
            selectedStationId={undefined}
            loading={false}
            onSelectStation={() => {
              // This would need to fetch station details
              // For now, we'll need a different approach
            }}
          />
          <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
            <p>
              Tính năng này yêu cầu tích hợp với trang tìm kiếm trạm. Vui lòng chọn trạm từ trang
              &quot;Tìm trạm&quot; và thêm vào so sánh.
            </p>
          </div>
        </div>

        {comparisonResult && comparisonResult.length > 0 && (
          <div className="rounded-2xl border border-slate-200/50 bg-white p-6 shadow-lg">
            <h4 className="mb-4 text-base font-bold text-slate-900">Kết quả so sánh</h4>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-200 bg-slate-50">
                    <th className="px-3 py-3 text-left font-semibold text-slate-700">Trạm</th>
                    <th className="px-3 py-3 text-center font-semibold text-slate-700">Trạng thái</th>
                    <th className="px-3 py-3 text-center font-semibold text-slate-700">Chỗ trống</th>
                    <th className="px-3 py-3 text-center font-semibold text-slate-700">Công suất</th>
                    <th className="px-3 py-3 text-center font-semibold text-slate-700">Số phiên</th>
                    <th className="px-3 py-3 text-center font-semibold text-slate-700">kWh/phiên</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonResult.map((result, index) => (
                    <tr
                      key={result.station_id}
                      className={`border-b border-slate-100 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                    >
                      <td className="px-3 py-3">
                        <div className="font-semibold text-slate-900">{result.station_name}</div>
                        {result.network && (
                          <div className="text-xs text-slate-500">{result.network}</div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                            result.status === 'operational'
                              ? 'bg-emerald-100 text-emerald-700'
                              : result.status === 'maintenance'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {result.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center font-semibold text-slate-700">
                        {result.available_capacity != null ? result.available_capacity : '-'}
                      </td>
                      <td className="px-3 py-3 text-center font-semibold text-slate-700">
                        {result.capacity != null ? `${result.capacity}kW` : '-'}
                      </td>
                      <td className="px-3 py-3 text-center font-semibold text-slate-700">
                        {result.total_sessions}
                      </td>
                      <td className="px-3 py-3 text-center font-semibold text-slate-700">
                        {result.avg_energy_per_session_kwh.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

