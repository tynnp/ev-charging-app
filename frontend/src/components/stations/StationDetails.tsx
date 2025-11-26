/* SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
 * This file is part of ev-charging-app and is licensed under the
 * MIT License. See the LICENSE file in the project root for details.
 */

import type { Station, StationAnalytics, Session } from '../../types/ev'
import { MapView } from './MapView'

type StationDetailsProps = {
  station?: Station | null
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
  analytics,
  loadingAnalytics,
  sessions,
  loadingSessions,
  onReloadAnalytics,
}: StationDetailsProps) {
  if (!station) {
    return (
      <p className="text-sm text-slate-500">
        Chọn một trạm ở danh sách bên trái để xem chi tiết và thống kê.
      </p>
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
    <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
      <h3 className="mb-0.5 text-base font-semibold text-slate-900">{station.name}</h3>
      <p className="m-0 text-xs text-slate-500">
        ID: <code>{station.id}</code>
      </p>
      {addressText ? (
        <p className="mt-2 text-sm text-slate-600">Địa chỉ: {addressText}</p>
      ) : null}
      {Array.isArray(station.location?.coordinates) &&
      station.location.coordinates.length >= 2 ? (
        <div className="mt-3">
          <h4 className="m-0 text-sm font-semibold text-slate-900">Vị trí trên bản đồ</h4>
          <div className="mt-2 h-64 overflow-hidden rounded-lg border border-slate-200">
            <MapView
              center={[
                station.location.coordinates[0],
                station.location.coordinates[1],
              ]}
              zoom={14}
            />
          </div>
        </div>
      ) : null}
      <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Trạng thái</div>
          <div className="font-semibold text-slate-900">{station.status || 'unknown'}</div>
        </div>
        {station.available_capacity != null ? (
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-500">
              Số chỗ trống
            </div>
            <div className="font-semibold text-slate-900">{station.available_capacity}</div>
          </div>
        ) : null}
        {station.capacity != null ? (
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-500">
              Công suất thiết kế
            </div>
            <div className="font-semibold text-slate-900">{station.capacity}</div>
          </div>
        ) : null}
        {station.socket_number != null ? (
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-500">
              Số ổ sạc
            </div>
            <div className="font-semibold text-slate-900">{station.socket_number}</div>
          </div>
        ) : null}
        <div>
          <div className="text-[11px] uppercase tracking-wide text-slate-500">
            Công suất tức thời (kW)
          </div>
          <div className="font-semibold text-slate-900">
            {station.instantaneous_power != null
              ? formatNumber(station.instantaneous_power)
              : 'Không có dữ liệu'}
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide text-slate-500">
            Số xe đang chờ
          </div>
          <div className="font-semibold text-slate-900">
            {station.queue_length != null ? station.queue_length : 'Không có dữ liệu'}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onReloadAnalytics}
        className="mt-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
      >
        Tải lại thống kê
      </button>

      <div className="mt-4 border-t border-slate-200 pt-3">
        <h4 className="m-0 text-sm font-semibold text-slate-900">Thống kê theo trạm</h4>
        {loadingAnalytics && !analytics ? (
          <p className="mt-1 text-sm text-slate-600">Đang tải thống kê cho trạm...</p>
        ) : null}
        {!loadingAnalytics && !analytics ? (
          <p className="mt-1 text-sm text-slate-600">
            Chưa có thống kê cho trạm này. Bạn có thể thử bấm &quot;Tải lại thống kê&quot;.
          </p>
        ) : null}
        {analytics ? (
          <div className="mt-2 text-sm text-slate-700">
            <div className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-slate-500">
                  Tổng số phiên sạc
                </div>
                <div className="font-semibold text-slate-900">
                  {analytics.total_sessions.toLocaleString('vi-VN')}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-slate-500">
                  Tổng năng lượng (kWh)
                </div>
                <div className="font-semibold text-slate-900">
                  {formatNumber(analytics.total_energy_kwh)}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-slate-500">
                  Doanh thu
                </div>
                <div className="font-semibold text-slate-900">
                  {formatCurrency(analytics.total_amount_vnd)}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-slate-500">Thuế</div>
                <div className="font-semibold text-slate-900">
                  {formatCurrency(analytics.total_tax_vnd)}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-slate-500">
                  Thời lượng TB (phút)
                </div>
                <div className="font-semibold text-slate-900">
                  {formatNumber(analytics.average_session_duration_minutes)}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-slate-500">
                  Năng lượng TB/phiên (kWh)
                </div>
                <div className="font-semibold text-slate-900">
                  {formatNumber(analytics.average_energy_kwh)}
                </div>
              </div>
            </div>

            {analytics.vehicle_type_breakdown.length > 0 ? (
              <table className="mt-3 w-full border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="border-b border-slate-200 px-1.5 py-1 text-left font-medium text-slate-600">
                      Loại phương tiện
                    </th>
                    <th className="border-b border-slate-200 px-1.5 py-1 text-right font-medium text-slate-600">
                      Số phiên
                    </th>
                    <th className="border-b border-slate-200 px-1.5 py-1 text-right font-medium text-slate-600">
                      Tổng kWh
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.vehicle_type_breakdown.map((item) => (
                    <tr key={item.vehicle_type}>
                      <td className="border-b border-slate-100 px-1.5 py-1 text-slate-700">
                        {item.vehicle_type}
                      </td>
                      <td className="border-b border-slate-100 px-1.5 py-1 text-right text-slate-700">
                        {item.session_count.toLocaleString('vi-VN')}
                      </td>
                      <td className="border-b border-slate-100 px-1.5 py-1 text-right text-slate-700">
                        {formatNumber(item.total_energy_kwh)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-4 border-t border-slate-200 pt-3">
        <h4 className="m-0 text-sm font-semibold text-slate-900">Lịch sử phiên sạc</h4>
        {loadingSessions && (!sessions || sessions.length === 0) ? (
          <p className="mt-1 text-sm text-slate-600">Đang tải danh sách phiên sạc...</p>
        ) : null}
        {!loadingSessions && (!sessions || sessions.length === 0) ? (
          <p className="mt-1 text-sm text-slate-600">
            Chưa có phiên sạc nào cho trạm này.
          </p>
        ) : null}
        {sessions && sessions.length > 0 ? (
          <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="border-b border-slate-200 px-1.5 py-1 text-left font-medium text-slate-600">
                    Bắt đầu
                  </th>
                  <th className="border-b border-slate-200 px-1.5 py-1 text-left font-medium text-slate-600">
                    Kết thúc
                  </th>
                  <th className="border-b border-slate-200 px-1.5 py-1 text-left font-medium text-slate-600">
                    Loại xe
                  </th>
                  <th className="border-b border-slate-200 px-1.5 py-1 text-right font-medium text-slate-600">
                    kWh
                  </th>
                  <th className="border-b border-slate-200 px-1.5 py-1 text-right font-medium text-slate-600">
                    Doanh thu (VND)
                  </th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id}>
                    <td className="border-b border-slate-100 px-1.5 py-1 text-slate-700">
                      {formatDateTime(session.start_date_time)}
                    </td>
                    <td className="border-b border-slate-100 px-1.5 py-1 text-slate-700">
                      {formatDateTime(session.end_date_time)}
                    </td>
                    <td className="border-b border-slate-100 px-1.5 py-1 text-slate-700">
                      {session.vehicle_type ?? 'unknown'}
                    </td>
                    <td className="border-b border-slate-100 px-1.5 py-1 text-right text-slate-700">
                      {formatNumber(session.power_consumption_kwh)}
                    </td>
                    <td className="border-b border-slate-100 px-1.5 py-1 text-right text-slate-700">
                      {formatCurrency(session.amount_collected_vnd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  )
}
