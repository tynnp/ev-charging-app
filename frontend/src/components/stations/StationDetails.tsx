/* SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
 * This file is part of ev-charging-app and is licensed under the
 * MIT License. See the LICENSE file in the project root for details.
 */

import { useState } from 'react'
import type { Station, StationAnalytics, Session, StationRealtime } from '../../types/ev'
import { MapView } from './MapView'
import {
  Plug,
  MapPin,
  Map,
  BarChart3,
  CheckCircle2,
  Zap,
  Car,
  RefreshCw,
  Loader2,
  History,
  Battery,
  DollarSign,
  FileText,
  Clock,
  TrendingUp,
} from 'lucide-react'
import { formatVehicleType, getStationStatusLabel, formatVehicleTypes } from '../../utils/labels'

type StationDetailsProps = {
  station?: Station | null
  realtime?: StationRealtime | null
  loadingRealtime?: boolean
  analytics?: StationAnalytics | null
  loadingAnalytics: boolean
  sessions?: Session[]
  loadingSessions: boolean
  onReloadAnalytics: () => void
}

function formatCurrency(value: number) {
  return value.toLocaleString('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  })
}

function formatNumber(value: number, fractionDigits = 1) {
  return value.toLocaleString('vi-VN', {
    maximumFractionDigits: fractionDigits,
  })
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString('vi-VN')
}

export function StationDetails({
  station,
  realtime,
  loadingRealtime,
  analytics,
  loadingAnalytics,
  sessions,
  loadingSessions,
  onReloadAnalytics,
}: StationDetailsProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'realtime' | 'analytics' | 'sessions'>('info')
  if (!station) {
    return (
      <div className="rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/30 p-8 text-center border border-slate-200/50">
        <Plug className="h-16 w-16 text-[#124874] mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-700">
          Chọn một trạm ở danh sách bên trái để xem chi tiết và thống kê.
        </p>
      </div>
    )
  }

  const addressParts = [
    station.address?.streetAddress,
    station.address?.addressLocality,
    station.address?.postalCode,
    station.address?.addressCountry,
  ].filter(Boolean)
  const addressText = addressParts.join(', ')

  return (
    <section className="rounded-2xl border border-slate-200/50 bg-white p-4 sm:p-6 text-sm shadow-lg">
      <div className="mb-4 flex items-start gap-2 sm:gap-3">
        <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#124874] to-[#0f3a5a] shadow-md flex-shrink-0">
          <Plug className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="mb-1 text-base sm:text-lg font-bold text-slate-900 break-words">{station.name}</h3>
          <p className="text-xs text-slate-500 font-mono bg-slate-50 px-2 py-1 rounded inline-block break-all">
            {station.id}
          </p>
        </div>
      </div>
      {addressText ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-slate-50 p-3">
          <MapPin className="h-4 w-4 text-slate-600 mt-0.5" />
          <p className="text-sm font-medium text-slate-700">{addressText}</p>
        </div>
      ) : null}
      <div className="mb-4 flex flex-wrap gap-1 sm:gap-2 rounded-lg bg-slate-100/60 p-1">
        <button
          type="button"
          onClick={() => setActiveTab('info')}
          className={`flex items-center gap-1 sm:gap-2 rounded-md px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold transition ${activeTab === 'info' ? 'bg-white text-slate-900 shadow' : 'text-slate-700 hover:bg-white/50'}`}
        >
          <Map className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Tổng quan</span>
          <span className="sm:hidden">Tổng quan</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('realtime')}
          className={`flex items-center gap-1 sm:gap-2 rounded-md px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold transition ${activeTab === 'realtime' ? 'bg-white text-slate-900 shadow' : 'text-slate-700 hover:bg-white/50'}`}
        >
          <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          Realtime
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-1 sm:gap-2 rounded-md px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold transition ${activeTab === 'analytics' ? 'bg-white text-slate-900 shadow' : 'text-slate-700 hover:bg-white/50'}`}
        >
          <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Thống kê</span>
          <span className="sm:hidden">TK</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('sessions')}
          className={`flex items-center gap-1 sm:gap-2 rounded-md px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold transition ${activeTab === 'sessions' ? 'bg-white text-slate-900 shadow' : 'text-slate-700 hover:bg-white/50'}`}
        >
          <History className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Phiên sạc</span>
          <span className="sm:hidden">Phiên</span>
        </button>
      </div>

      {activeTab === 'info' ? (
        <>
          {Array.isArray(station.location?.coordinates) && station.location.coordinates.length >= 2 ? (
            <div className="mb-3 sm:mb-4">
              <h4 className="mb-2 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold text-slate-900">
                <Map className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#124874] flex-shrink-0" />
                Vị trí trên bản đồ
              </h4>
              <div className="h-48 sm:h-56 md:h-64 overflow-hidden rounded-lg sm:rounded-xl border-2 border-slate-200 shadow-md">
                <MapView
                  center={[station.location.coordinates[0], station.location.coordinates[1]]}
                  zoom={14}
                />
              </div>
            </div>
          ) : null}
          <div className="mb-3 sm:mb-4 grid gap-2 sm:gap-3 text-xs grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 p-2.5 sm:p-3 border border-slate-200">
              <div className="mb-1 flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <BarChart3 className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                Trạng thái
              </div>
              <div className="font-bold text-sm sm:text-base text-slate-900">{getStationStatusLabel(station.status) || 'Không xác định'}</div>
            </div>
            {station.available_capacity != null ? (
              <div className="rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 p-2.5 sm:p-3 border border-emerald-200">
                <div className="mb-1 flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                  <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                  Số chỗ trống
                </div>
                <div className="font-bold text-sm sm:text-base text-emerald-900 break-words">{station.available_capacity}</div>
              </div>
            ) : null}
            {station.capacity != null ? (
              <div className="rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 p-2.5 sm:p-3 border border-purple-200">
                <div className="mb-1 flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-purple-700">
                  <Zap className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                  Công suất thiết kế
                </div>
                <div className="font-bold text-sm sm:text-base text-purple-900 break-words">{station.capacity} kW</div>
              </div>
            ) : null}
            {station.socket_number != null ? (
              <div className="rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 p-2.5 sm:p-3 border border-blue-200">
                <div className="mb-1 flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                  <Plug className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                  Số ổ sạc
                </div>
                <div className="font-bold text-sm sm:text-base text-blue-900 break-words">{station.socket_number}</div>
              </div>
            ) : null}
            <div className="rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 p-2.5 sm:p-3 border border-amber-200">
              <div className="mb-1 flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                <Zap className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                <span className="break-words">Công suất tức thời (kW)</span>
              </div>
              <div className="font-bold text-sm sm:text-base text-amber-900 break-words">
                {station.instantaneous_power != null ? formatNumber(station.instantaneous_power) : 'Không có dữ liệu'}
              </div>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 p-2.5 sm:p-3 border border-orange-200">
              <div className="mb-1 flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-orange-700">
                <Car className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                Loại phương tiện
              </div>
              <div className="font-bold text-sm sm:text-base text-orange-900 break-words">
                {station.allowed_vehicle_types && station.allowed_vehicle_types.length > 0
                  ? station.allowed_vehicle_types.map(formatVehicleType).join(', ')
                  : 'Không có dữ liệu'}
              </div>
            </div>
          </div>
        </>
      ) : null}

      {activeTab === 'realtime' ? (
        realtime ? (
          <div className="mb-3 sm:mb-4 rounded-lg sm:rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 pt-3 sm:pt-4 pb-2.5 sm:pb-3 px-3 sm:px-4">
            <h4 className="mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base font-bold text-slate-900">
              <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
              Trạng thái Realtime
            </h4>
            {loadingRealtime ? (
              <div className="mt-2 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-slate-600">
                <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin flex-shrink-0" />
                <span className="break-words">Đang tải dữ liệu realtime...</span>
              </div>
            ) : (
              <div className="grid gap-2 sm:gap-3 text-xs grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
                {realtime.status != null ? (
                  <div className="rounded-lg bg-white p-3 border border-blue-200 shadow-sm">
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                      <BarChart3 className="h-3 w-3" />
                      Trạng thái
                    </div>
                    <div className="font-bold text-base text-blue-900">{getStationStatusLabel(realtime.status)}</div>
                  </div>
                ) : null}
                {realtime.available_capacity != null ? (
                  <div className="rounded-lg bg-white p-3 border border-emerald-200 shadow-sm">
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" />
                      Chỗ trống
                    </div>
                    <div className="font-bold text-base text-emerald-900">
                      {realtime.available_capacity}
                    </div>
                  </div>
                ) : null}
                {realtime.instantaneous_power != null ? (
                  <div className="rounded-lg bg-white p-3 border border-amber-200 shadow-sm">
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                      <Zap className="h-3 w-3" />
                      Công suất (kW)
                    </div>
                    <div className="font-bold text-base text-amber-900">
                      {formatNumber(realtime.instantaneous_power)}
                    </div>
                  </div>
                ) : null}
                {station.allowed_vehicle_types && station.allowed_vehicle_types.length > 0 ? (
                  <div className="rounded-lg bg-white p-3 border border-orange-200 shadow-sm">
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-orange-700">
                      <Car className="h-3 w-3" />
                      Loại phương tiện
                    </div>
                    <div className="font-bold text-base text-orange-900">
                      {formatVehicleTypes(station.allowed_vehicle_types)}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl bg-slate-50 p-6 text-center">
            <p className="text-sm font-medium text-slate-600">Không có dữ liệu realtime.</p>
          </div>
        )
      ) : null}

      {activeTab === 'analytics' ? (
        <>
          <button
            type="button"
            onClick={onReloadAnalytics}
            className="mb-3 sm:mb-4 w-full sm:w-auto inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg border border-[#124874]/30 bg-gradient-to-r from-[#124874] to-[#0f3a5a] px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold text-white shadow-md transition-all hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#124874] focus:ring-offset-2 min-h-[40px] sm:min-h-[44px]"
          >
            <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Tải lại thống kê
          </button>

          <div className="mb-3 sm:mb-4 rounded-lg sm:rounded-xl border-t-2 border-slate-200 bg-gradient-to-br from-slate-50 to-white pt-3 sm:pt-4 pb-2.5 sm:pb-3 px-3 sm:px-4">
            <h4 className="mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base font-bold text-slate-900">
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-[#124874] flex-shrink-0" />
              Thống kê theo trạm
            </h4>
            {loadingAnalytics && !analytics ? (
              <div className="mt-2 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-slate-600">
                <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin flex-shrink-0" />
                <span className="break-words">Đang tải thống kê cho trạm...</span>
              </div>
            ) : null}
            {!loadingAnalytics && !analytics ? (
              <div className="mt-2 rounded-lg bg-amber-50 p-2.5 sm:p-3 border border-amber-200">
                <p className="text-xs sm:text-sm font-medium text-amber-800 break-words">
                  Chưa có thống kê cho trạm này. Bạn có thể thử bấm &quot;Tải lại thống kê&quot;.
                </p>
              </div>
            ) : null}
            {analytics ? (
              <div className="mt-2 text-xs sm:text-sm text-slate-700">
                <div className="grid gap-2 sm:gap-3 text-xs grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-lg bg-white p-3 border border-slate-200 shadow-sm">
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <Zap className="h-3 w-3" />
                      Tổng số phiên sạc
                    </div>
                    <div className="font-bold text-base text-slate-900">
                      {analytics.total_sessions.toLocaleString('vi-VN')}
                    </div>
                  </div>
                  <div className="rounded-lg bg-white p-3 border border-slate-200 shadow-sm">
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <Battery className="h-3 w-3" />
                      Tổng năng lượng (kWh)
                    </div>
                    <div className="font-bold text-base text-slate-900">
                      {formatNumber(analytics.total_energy_kwh)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-white p-3 border border-slate-200 shadow-sm">
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <DollarSign className="h-3 w-3" />
                      Doanh thu
                    </div>
                    <div className="font-bold text-base text-slate-900">
                      {formatCurrency(analytics.total_amount_vnd)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-white p-3 border border-slate-200 shadow-sm">
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <FileText className="h-3 w-3" />
                      Thuế
                    </div>
                    <div className="font-bold text-base text-slate-900">
                      {formatCurrency(analytics.total_tax_vnd)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-white p-3 border border-slate-200 shadow-sm">
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <Clock className="h-3 w-3" />
                      Thời lượng TB (phút)
                    </div>
                    <div className="font-bold text-base text-slate-900">
                      {formatNumber(analytics.average_session_duration_minutes)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-white p-3 border border-slate-200 shadow-sm">
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <TrendingUp className="h-3 w-3" />
                      Năng lượng TB/phiên (kWh)
                    </div>
                    <div className="font-bold text-base text-slate-900">
                      {formatNumber(analytics.average_energy_kwh)}
                    </div>
                  </div>
                </div>

                {analytics.vehicle_type_breakdown.length > 0 ? (
                  <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <table className="w-full border-collapse text-xs">
                      <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                        <tr>
                          <th className="border-b border-slate-200 px-3 py-2.5 text-left font-semibold text-slate-700">
                            <span className="flex items-center gap-1.5">
                              <Car className="h-4 w-4" />
                              Loại phương tiện
                            </span>
                          </th>
                          <th className="border-b border-slate-200 px-3 py-2.5 text-right font-semibold text-slate-700">
                            Số phiên
                          </th>
                          <th className="border-b border-slate-200 px-3 py-2.5 text-right font-semibold text-slate-700">
                            Tổng kWh
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.vehicle_type_breakdown.map((item, index) => (
                          <tr key={item.vehicle_type} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                            <td className="border-b border-slate-100 px-3 py-2 font-medium text-slate-700">
                              {formatVehicleType(item.vehicle_type)}
                            </td>
                            <td className="border-b border-slate-100 px-3 py-2 text-right font-semibold text-slate-700">
                              {item.session_count.toLocaleString('vi-VN')}
                            </td>
                            <td className="border-b border-slate-100 px-3 py-2 text-right font-semibold text-slate-700">
                              {formatNumber(item.total_energy_kwh)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      {activeTab === 'sessions' ? (
        <div className="mb-3 sm:mb-4 rounded-lg sm:rounded-xl border-t-2 border-slate-200 bg-gradient-to-br from-slate-50 to-white pt-3 sm:pt-4 pb-2.5 sm:pb-3 px-3 sm:px-4">
          <h4 className="mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base font-bold text-slate-900">
            <History className="h-4 w-4 sm:h-5 sm:w-5 text-[#124874] flex-shrink-0" />
            Lịch sử phiên sạc
          </h4>
          {loadingSessions && (!sessions || sessions.length === 0) ? (
            <div className="mt-2 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-slate-600">
              <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin flex-shrink-0" />
              <span className="break-words">Đang tải danh sách phiên sạc...</span>
            </div>
          ) : null}
          {!loadingSessions && (!sessions || sessions.length === 0) ? (
            <div className="mt-2 rounded-lg bg-blue-50 p-2.5 sm:p-3 border border-blue-200">
              <p className="text-xs sm:text-sm font-medium text-blue-800 break-words">
                Chưa có phiên sạc nào cho trạm này.
              </p>
            </div>
          ) : null}
          {sessions && sessions.length > 0 ? (
            <div className="mt-2 w-full overflow-x-auto rounded-lg sm:rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="min-w-[600px]">
                <table className="w-full border-collapse text-xs">
                <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                  <tr>
                    <th className="border-b border-slate-200 px-3 py-2.5 text-left font-semibold text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        Bắt đầu
                      </span>
                    </th>
                    <th className="border-b border-slate-200 px-3 py-2.5 text-left font-semibold text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        Kết thúc
                      </span>
                    </th>
                    <th className="border-b border-slate-200 px-3 py-2.5 text-left font-semibold text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <Car className="h-4 w-4" />
                        Loại xe
                      </span>
                    </th>
                    <th className="border-b border-slate-200 px-3 py-2.5 text-right font-semibold text-slate-700">
                      <span className="flex items-center justify-end gap-1.5">
                        <Zap className="h-4 w-4" />
                        kWh
                      </span>
                    </th>
                    <th className="border-b border-slate-200 px-3 py-2.5 text-right font-semibold text-slate-700">
                      <span className="flex items-center justify-end gap-1.5">
                        <DollarSign className="h-4 w-4" />
                        Doanh thu (VND)
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session, index) => (
                    <tr key={session.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="border-b border-slate-100 px-3 py-2 font-medium text-slate-700">
                        {formatDateTime(session.start_date_time)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2 font-medium text-slate-700">
                        {formatDateTime(session.end_date_time)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2 font-medium text-slate-700">
                        {formatVehicleType(session.vehicle_type)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2 text-right font-semibold text-slate-700">
                        {formatNumber(session.power_consumption_kwh)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2 text-right font-semibold text-slate-700">
                        {formatCurrency(session.amount_collected_vnd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
