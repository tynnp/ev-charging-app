/* SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
 * This file is part of ev-charging-app and is licensed under the
 * MIT License. See the LICENSE file in the project root for details.
 */

import type { AnalyticsOverview } from '../../types/ev'

type AnalyticsOverviewPanelProps = {
  overview: AnalyticsOverview | null
  loading: boolean
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

export function AnalyticsOverviewPanel({ overview, loading }: AnalyticsOverviewPanelProps) {
  if (loading && !overview) {
    return <p className="text-base text-slate-500">Đang tải thống kê tổng quan...</p>
  }

  if (!overview) {
    return <p className="text-base text-slate-500">Chưa có dữ liệu thống kê tổng quan.</p>
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
        <div className="flex-1 rounded-xl bg-[#124874] px-5 py-4 text-white shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-100/80">
            Doanh thu toàn hệ thống
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {formatCurrency(overview.total_amount_vnd)}
          </p>
          <p className="mt-1 text-xs text-slate-100/80">
            Tổng doanh thu thu được từ tất cả các phiên sạc.
          </p>
        </div>
        <div className="flex-1 rounded-xl bg-[#CF373D] px-5 py-4 text-white shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-100/80">
            Thuế thu được
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {formatCurrency(overview.total_tax_vnd)}
          </p>
          <p className="mt-1 text-xs text-slate-100/80">
            Số thuế ước tính đã thu từ doanh thu trạm sạc.
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-slate-900">Tổng quan hệ thống</h2>
        <p className="mt-1 text-sm text-slate-600">
          Một số chỉ số chính về tải hệ thống, năng lượng và số lượng trạm sạc đang hoạt động.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Tổng số phiên sạc
          </p>
          <p className="mt-1 text-xl font-semibold text-slate-900">
            {overview.total_sessions.toLocaleString('vi-VN')}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Số phiên sạc đã ghi nhận trong hệ thống.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Tổng năng lượng (kWh)
          </p>
          <p className="mt-1 text-xl font-semibold text-slate-900">
            {formatNumber(overview.total_energy_kwh)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Tổng kWh đã cung cấp cho các phiên sạc.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Số trạm sạc
          </p>
          <p className="mt-1 text-xl font-semibold text-slate-900">
            {overview.stations_count.toLocaleString('vi-VN')}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Số trạm sạc đang được hệ thống quản lý.
          </p>
        </div>
      </div>

      {overview.top_stations_by_sessions.length > 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Top trạm theo số phiên sạc
          </p>
          <ul className="mt-2 divide-y divide-slate-100">
            {overview.top_stations_by_sessions.map((item) => (
              <li
                key={item.station_id}
                className="flex items-center justify-between py-1.5 text-sm text-slate-800"
              >
                <span className="font-medium">{item.station_id}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                  {item.session_count.toLocaleString('vi-VN')} phiên
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
