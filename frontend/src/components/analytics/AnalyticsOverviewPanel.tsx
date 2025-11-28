/* SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
 * This file is part of ev-charging-app and is licensed under the
 * MIT License. See the LICENSE file in the project root for details.
 */

import type { AnalyticsOverview } from '../../types/ev'
import {
  DollarSign,
  FileText,
  BarChart3,
  Zap,
  Battery,
  Plug,
  Trophy,
  Loader2,
} from 'lucide-react'

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
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#124874] mx-auto mb-4" />
          <p className="text-base font-medium text-slate-600">Đang tải thống kê tổng quan...</p>
        </div>
      </div>
    )
  }

  if (!overview) {
    return (
      <div className="rounded-xl bg-slate-50 p-8 text-center">
        <p className="text-base font-medium text-slate-600">Chưa có dữ liệu thống kê tổng quan.</p>
      </div>
    )
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#124874] via-[#0f3a5a] to-[#124874] px-6 py-5 text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
          <div className="absolute right-0 top-0 -mr-4 -mt-4 h-24 w-24 rounded-full bg-white/10 blur-2xl"></div>
          <div className="relative">
            <div className="mb-2 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-white" />
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-100/90">
                Doanh thu toàn hệ thống
              </p>
            </div>
            <p className="mt-2 text-3xl font-bold">
              {formatCurrency(overview.total_amount_vnd)}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-100/80">
              Tổng doanh thu thu được từ tất cả các phiên sạc.
            </p>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#CF373D] via-[#b82e33] to-[#CF373D] px-6 py-5 text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
          <div className="absolute right-0 top-0 -mr-4 -mt-4 h-24 w-24 rounded-full bg-white/10 blur-2xl"></div>
          <div className="relative">
            <div className="mb-2 flex items-center gap-2">
              <FileText className="h-5 w-5 text-white" />
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-100/90">
                Thuế thu được
              </p>
            </div>
            <p className="mt-2 text-3xl font-bold">
              {formatCurrency(overview.total_tax_vnd)}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-100/80">
              Số thuế ước tính đã thu từ doanh thu trạm sạc.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white/60 p-5 backdrop-blur-sm">
        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <BarChart3 className="h-5 w-5 text-[#124874]" />
          Tổng quan hệ thống
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Một số chỉ số chính về tải hệ thống, năng lượng và số lượng trạm sạc đang hoạt động.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="group rounded-xl border border-slate-200/50 bg-white px-5 py-4 shadow-sm transition-all duration-200 hover:border-[#124874]/30 hover:shadow-md">
          <div className="mb-2 flex items-center gap-2">
            <Zap className="h-5 w-5 text-[#124874]" />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Tổng số phiên sạc
            </p>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {overview.total_sessions.toLocaleString('vi-VN')}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            Số phiên sạc đã ghi nhận trong hệ thống.
          </p>
        </div>
        <div className="group rounded-xl border border-slate-200/50 bg-white px-5 py-4 shadow-sm transition-all duration-200 hover:border-[#124874]/30 hover:shadow-md">
          <div className="mb-2 flex items-center gap-2">
            <Battery className="h-5 w-5 text-[#124874]" />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Tổng năng lượng (kWh)
            </p>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatNumber(overview.total_energy_kwh)}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            Tổng kWh đã cung cấp cho các phiên sạc.
          </p>
        </div>
        <div className="group rounded-xl border border-slate-200/50 bg-white px-5 py-4 shadow-sm transition-all duration-200 hover:border-[#124874]/30 hover:shadow-md">
          <div className="mb-2 flex items-center gap-2">
            <Plug className="h-5 w-5 text-[#124874]" />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Số trạm sạc
            </p>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {overview.stations_count.toLocaleString('vi-VN')}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            Số trạm sạc đang được hệ thống quản lý.
          </p>
        </div>
      </div>

      {overview.top_stations_by_sessions.length > 0 ? (
        <div className="rounded-xl border border-slate-200/50 bg-white px-5 py-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <p className="text-sm font-bold text-slate-900">
              Top trạm theo số phiên sạc
            </p>
          </div>
          <ul className="divide-y divide-slate-100">
            {overview.top_stations_by_sessions.map((item, index) => (
              <li
                key={item.station_id}
                className="flex items-center justify-between py-3 text-sm transition-colors hover:bg-slate-50/50"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#124874] to-[#0f3a5a] text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <span className="font-semibold text-slate-800">{item.station_id}</span>
                </div>
                <span className="rounded-full bg-gradient-to-r from-[#124874] to-[#0f3a5a] px-3 py-1 text-xs font-semibold text-white shadow-sm">
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
