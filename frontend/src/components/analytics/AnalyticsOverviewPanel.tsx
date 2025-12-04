/* SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
 * This file is part of ev-charging-app and is licensed under the
 * MIT License. See the LICENSE file in the project root for details.
 */

import { useState, useEffect } from 'react'
import type { AnalyticsOverview, RevenueTimeline } from '../../types/ev'
import {
  DollarSign,
  FileText,
  BarChart3,
  Zap,
  Battery,
  Plug,
  Trophy,
  Loader2,
  TrendingUp,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

type AnalyticsOverviewPanelProps = {
  overview: AnalyticsOverview | null
  revenueTimeline: RevenueTimeline | null
  loading: boolean
  loadingTimeline: boolean
  period: 'day' | 'week'
  onPeriodChange: (period: 'day' | 'week') => void
  stationNameLookup?: Record<string, string>
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

const ITEMS_PER_PAGE = 10

export function AnalyticsOverviewPanel({ 
  overview, 
  revenueTimeline, 
  loading, 
  loadingTimeline,
  period,
  onPeriodChange,
  stationNameLookup 
}: AnalyticsOverviewPanelProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [showRevenueDetails, setShowRevenueDetails] = useState(false)

  useEffect(() => {
    setCurrentPage(1)
  }, [period])

  const timelineItems = revenueTimeline?.timeline || []
  const totalPages = Math.max(1, Math.ceil(timelineItems.length / ITEMS_PER_PAGE))
  const pageStartIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedItems = timelineItems.slice(pageStartIndex, pageStartIndex + ITEMS_PER_PAGE)

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])
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
    <section className="space-y-4 sm:space-y-6 min-w-0 w-full">
      <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 min-w-0">
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#124874] via-[#0f3a5a] to-[#124874] px-4 sm:px-5 md:px-6 py-4 sm:py-5 text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
          <div className="absolute right-0 top-0 -mr-4 -mt-4 h-24 w-24 rounded-full bg-white/10 blur-2xl"></div>
          <div className="relative">
            <div className="mb-2 flex items-center gap-1.5 sm:gap-2">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-white flex-shrink-0" />
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-100/90 break-words">
                Doanh thu toàn hệ thống
              </p>
            </div>
            <p className="mt-2 text-xl sm:text-2xl md:text-3xl font-bold break-words">
              {formatCurrency(overview.total_amount_vnd)}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-100/80 break-words">
              Tổng doanh thu thu được từ tất cả các phiên sạc.
            </p>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#CF373D] via-[#b82e33] to-[#CF373D] px-4 sm:px-5 md:px-6 py-4 sm:py-5 text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
          <div className="absolute right-0 top-0 -mr-4 -mt-4 h-24 w-24 rounded-full bg-white/10 blur-2xl"></div>
          <div className="relative">
            <div className="mb-2 flex items-center gap-1.5 sm:gap-2">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-white flex-shrink-0" />
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-100/90 break-words">
                Thuế thu được
              </p>
            </div>
            <p className="mt-2 text-xl sm:text-2xl md:text-3xl font-bold break-words">
              {formatCurrency(overview.total_tax_vnd)}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-100/80 break-words">
              Số thuế ước tính đã thu từ doanh thu trạm sạc.
            </p>
          </div>
        </div>
      </div>

            {/* Revenue Timeline Section */}
      <div className="rounded-lg sm:rounded-xl border border-slate-200/50 bg-white px-3 sm:px-4 md:px-5 py-3 sm:py-4 shadow-sm overflow-hidden min-w-0">
        <div className="mb-3 sm:mb-4 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-[#124874] flex-shrink-0" />
            <p className="text-xs sm:text-sm font-bold text-slate-900 break-words">
              Doanh thu toàn hệ thống theo thời gian
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowRevenueDetails(!showRevenueDetails)}
            className="w-full xs:w-auto flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg border border-slate-300 bg-white px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:border-[#124874]/40 hover:text-[#124874] hover:bg-slate-50"
          >
            Chi tiết
            {showRevenueDetails ? (
              <ChevronUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            )}
          </button>
        </div>

        {showRevenueDetails && (
          <>
            <div className="mb-3 sm:mb-4 flex items-center justify-end">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-500 flex-shrink-0" />
                <label className="text-xs font-semibold text-slate-700">
                  Xem theo:
                </label>
                <select
                  value={period}
                  onChange={(e) => onPeriodChange(e.target.value as 'day' | 'week')}
                  className="rounded-lg border border-slate-300 bg-white px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium shadow-sm transition-all focus:border-[#124874] focus:outline-none focus:ring-2 focus:ring-[#124874]/20"
                >
                  <option value="day">Theo ngày</option>
                  <option value="week">Theo tuần</option>
                </select>
              </div>
            </div>

            {loadingTimeline ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[#124874]" />
            <p className="ml-2 text-xs sm:text-sm text-slate-600">Đang tải dữ liệu doanh thu...</p>
          </div>
        ) : revenueTimeline && timelineItems.length > 0 ? (
          <>
            <div className="w-full overflow-x-auto">
              <div className="min-w-[600px]">
                <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold text-slate-700">
                      {revenueTimeline.period === 'day' ? 'Ngày' : 'Tuần'}
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-right font-semibold text-slate-700">
                      Doanh thu
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-right font-semibold text-slate-700">
                      Thuế
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-right font-semibold text-slate-700">
                      <span className="hidden sm:inline">Năng lượng (kWh)</span>
                      <span className="sm:hidden">kWh</span>
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-right font-semibold text-slate-700">
                      Số phiên
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedItems.map((item) => (
                    <tr
                      key={item.period}
                      className="transition-colors hover:bg-slate-50/50"
                    >
                      <td className="px-2 sm:px-4 py-2 sm:py-3 font-medium text-slate-800 break-words min-w-0">
                        {item.period_label}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                        {formatCurrency(item.total_amount_vnd)}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-slate-600 whitespace-nowrap">
                        {formatCurrency(item.total_tax_vnd)}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-slate-600 whitespace-nowrap">
                        {formatNumber(item.total_energy_kwh, 2)}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-slate-600 whitespace-nowrap">
                        {item.session_count.toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {revenueTimeline.summary && (
                  <tfoot className="border-t-2 border-slate-300 bg-slate-50/50">
                    <tr>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        Tổng cộng:
                        {/* ({revenueTimeline.summary.period_count} {revenueTimeline.period === 'day' ? 'ngày' : 'tuần'}) */}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-[#124874]">
                        {formatCurrency(revenueTimeline.summary.total_amount_vnd)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700">
                        {formatCurrency(revenueTimeline.summary.total_tax_vnd)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700">
                        {formatNumber(revenueTimeline.summary.total_energy_kwh, 2)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700">
                        {revenueTimeline.summary.total_sessions.toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  </tfoot>
                )}
                </table>
              </div>
            </div>

            {/* Phân trang  */}
            <div className="mt-3 sm:mt-4 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2 border-t border-slate-200 pt-3 sm:pt-4">
              <span className="text-xs font-medium text-slate-600 break-words">
                Hiển thị {timelineItems.length === 0 ? 0 : pageStartIndex + 1}–
                {Math.min(pageStartIndex + paginatedItems.length, timelineItems.length)} / {timelineItems.length} {period === 'day' ? 'ngày' : 'tuần'}
              </span>
              <div className="flex items-center gap-1.5 sm:gap-2 w-full xs:w-auto">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1 || totalPages <= 1}
                  className="flex-1 xs:flex-none flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 hover:border-[#124874]/40 hover:text-[#124874] disabled:hover:border-slate-200 min-h-[36px] sm:min-h-[40px]"
                >
                  <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Trang trước</span>
                  <span className="sm:hidden">Trước</span>
                </button>
                <span className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium text-slate-700 whitespace-nowrap">
                  Trang {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages || totalPages <= 1}
                  className="flex-1 xs:flex-none flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 hover:border-[#124874]/40 hover:text-[#124874] disabled:hover:border-slate-200 min-h-[36px] sm:min-h-[40px]"
                >
                  <span className="hidden sm:inline">Trang sau</span>
                  <span className="sm:hidden">Sau</span>
                  <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              </div>
            </div>
          </>
            ) : (
              <div className="py-8 text-center text-sm text-slate-500">
                Chưa có dữ liệu doanh thu.
              </div>
            )}
          </>
        )}
      </div>

      <div className="rounded-lg sm:rounded-xl bg-white/60 p-3 sm:p-4 md:p-5 backdrop-blur-sm">
        <h2 className="flex items-center gap-1.5 sm:gap-2 text-lg sm:text-xl font-bold text-slate-900">
          <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-[#124874] flex-shrink-0" />
          Tổng quan hệ thống
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-600 break-words">
          Một số chỉ số chính về tải hệ thống, năng lượng và số lượng trạm sạc đang hoạt động.
        </p>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        <div className="group rounded-lg sm:rounded-xl border border-slate-200/50 bg-white px-3 sm:px-4 md:px-5 py-3 sm:py-4 shadow-sm transition-all duration-200 hover:border-[#124874]/30 hover:shadow-md">
          <div className="mb-2 flex items-center gap-1.5 sm:gap-2">
            <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-[#124874] flex-shrink-0" />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 break-words">
              Tổng số phiên sạc
            </p>
          </div>
          <p className="mt-2 text-xl sm:text-2xl font-bold text-slate-900 break-words">
            {overview.total_sessions.toLocaleString('vi-VN')}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500 break-words">
            Số phiên sạc đã ghi nhận trong hệ thống.
          </p>
        </div>
        <div className="group rounded-lg sm:rounded-xl border border-slate-200/50 bg-white px-3 sm:px-4 md:px-5 py-3 sm:py-4 shadow-sm transition-all duration-200 hover:border-[#124874]/30 hover:shadow-md">
          <div className="mb-2 flex items-center gap-1.5 sm:gap-2">
            <Battery className="h-4 w-4 sm:h-5 sm:w-5 text-[#124874] flex-shrink-0" />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 break-words">
              Tổng năng lượng (kWh)
            </p>
          </div>
          <p className="mt-2 text-xl sm:text-2xl font-bold text-slate-900 break-words">
            {formatNumber(overview.total_energy_kwh)}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500 break-words">
            Tổng kWh đã cung cấp cho các phiên sạc.
          </p>
        </div>
        <div className="group rounded-lg sm:rounded-xl border border-slate-200/50 bg-white px-3 sm:px-4 md:px-5 py-3 sm:py-4 shadow-sm transition-all duration-200 hover:border-[#124874]/30 hover:shadow-md">
          <div className="mb-2 flex items-center gap-1.5 sm:gap-2">
            <Plug className="h-4 w-4 sm:h-5 sm:w-5 text-[#124874] flex-shrink-0" />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 break-words">
              Số trạm sạc
            </p>
          </div>
          <p className="mt-2 text-xl sm:text-2xl font-bold text-slate-900 break-words">
            {overview.stations_count.toLocaleString('vi-VN')}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500 break-words">
            Số trạm sạc đang được hệ thống quản lý.
          </p>
        </div>
      </div>

      {overview.top_stations_by_sessions.length > 0 ? (
        <div className="rounded-lg sm:rounded-xl border border-slate-200/50 bg-white px-3 sm:px-4 md:px-5 py-3 sm:py-4 shadow-sm">
          <div className="mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
            <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 flex-shrink-0" />
            <p className="text-xs sm:text-sm font-bold text-slate-900 break-words">
              Top trạm theo số phiên sạc
            </p>
          </div>
          <ul className="divide-y divide-slate-100">
            {overview.top_stations_by_sessions.map((item, index) => (
              <li
                key={item.station_id}
                className="flex items-center justify-between py-2 sm:py-3 text-xs sm:text-sm transition-colors hover:bg-slate-50/50 gap-2"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#124874] to-[#0f3a5a] text-xs font-bold text-white flex-shrink-0">
                    {index + 1}
                  </span>
                  <span className="font-semibold text-slate-800 truncate">
                    {stationNameLookup?.[item.station_id] ?? item.station_id}
                  </span>
                </div>
                <span className="rounded-full bg-gradient-to-r from-[#124874] to-[#0f3a5a] px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-semibold text-white shadow-sm whitespace-nowrap flex-shrink-0">
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
