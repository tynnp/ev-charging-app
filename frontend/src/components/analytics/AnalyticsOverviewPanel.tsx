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
    return <p className="text-sm text-slate-500">Đang tải thống kê tổng quan...</p>
  }

  if (!overview) {
    return <p className="text-sm text-slate-500">Chưa có dữ liệu thống kê tổng quan.</p>
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">Tổng quan hệ thống</h2>
      <div className="mt-1 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Tổng số phiên sạc
          </div>
          <div className="mt-1 text-xl font-semibold text-slate-900">
            {overview.total_sessions.toLocaleString('vi-VN')}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Tổng năng lượng (kWh)
          </div>
          <div className="mt-1 text-xl font-semibold text-slate-900">
            {formatNumber(overview.total_energy_kwh)}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Doanh thu
          </div>
          <div className="mt-1 text-xl font-semibold text-slate-900">
            {formatCurrency(overview.total_amount_vnd)}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Thuế thu được
          </div>
          <div className="mt-1 text-xl font-semibold text-slate-900">
            {formatCurrency(overview.total_tax_vnd)}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Số trạm sạc
          </div>
          <div className="mt-1 text-xl font-semibold text-slate-900">
            {overview.stations_count.toLocaleString('vi-VN')}
          </div>
        </div>
      </div>
      {overview.top_stations_by_sessions.length > 0 ? (
        <div className="mt-2 text-sm text-slate-600">
          <strong>Top trạm theo số phiên sạc:</strong>{' '}
          {overview.top_stations_by_sessions
            .map((item) => `${item.station_id} (${item.session_count})`)
            .join(', ')}
        </div>
      ) : null}
    </section>
  )
}
