/* SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
 * This file is part of ev-charging-app and is licensed under the
 * MIT License. See the LICENSE file in the project root for details.
 */

import { useEffect, useMemo, useState } from 'react'
import type { SVGProps } from 'react'
import {
  AlertTriangle,
  BarChart3,
  Battery,
  CalendarRange,
  Clock,
  DollarSign,
  History,
  Loader2,
  RefreshCw,
  Search,
  TrendingUp,
  Zap,
  CalendarClock,
} from 'lucide-react'
import type { CitizenProfile, CitizenSessionsStats, Session, Station } from '../../types/ev'
import { useAuth } from '../../contexts/AuthContext'
import { apiFetch } from '../../utils/api'
import { formatVehicleType, getStationStatusLabel } from '../../utils/labels'

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString('vi-VN')
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—'
  return value.toLocaleString('vi-VN')
}

function formatNumber(value: number | null | undefined, fractionDigits = 1): string {
  if (value == null) return '—'
  return value.toLocaleString('vi-VN', { maximumFractionDigits: fractionDigits })
}

function formatDuration(minutes: number | null | undefined): string {
  if (!minutes || Number.isNaN(minutes)) return '—'
  if (minutes < 60) {
    return `${Math.round(minutes)} phút`
  }
  const hours = Math.floor(minutes / 60)
  const remaining = Math.round(minutes % 60)
  return `${hours}h${remaining > 0 ? ` ${remaining}p` : ''}`
}

function getDurationMinutes(session: Session): number | null {
  if (session.duration_minutes != null) {
    return session.duration_minutes
  }
  const start = new Date(session.start_date_time)
  const end = new Date(session.end_date_time)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null
  }
  return (end.getTime() - start.getTime()) / 60000
}

export function CitizenHistoryPage() {
  const { user } = useAuth()
  const [, setProfile] = useState<CitizenProfile | null>(null)
  const [stats, setStats] = useState<CitizenSessionsStats | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [loadingStats, setLoadingStats] = useState(true)
  const [hasFilters, setHasFilters] = useState(false)

  const [stationSearchFilter, setStationSearchFilter] = useState('')
  const [startDateFilter, setStartDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')
  const [limit, setLimit] = useState(20)

  const userId = user?.id || ''

  useEffect(() => {
    if (userId) {
      void loadProfile()
      void loadStats()
      void loadSessions()
    }
  }, [userId])

  async function loadProfile() {
    if (!userId) return
    try {
      setLoadingProfile(true)
      const res = await apiFetch(`/citizens/${userId}`)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const data = (await res.json()) as CitizenProfile
      setProfile(data)
    } catch (err) {
      console.error(err)
      const errorMessage = err instanceof Error && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))
        ? 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng của bạn.'
        : 'Không tải được thông tin người dùng.'
      setError(errorMessage)
    } finally {
      setLoadingProfile(false)
    }
  }

  async function loadStats(params?: URLSearchParams) {
    if (!userId) return
    try {
      setLoadingStats(true)
      setError(null)
      const query = params ? `?${params.toString()}` : ''
      const res = await apiFetch(`/citizens/${userId}/sessions/stats${query}`)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const data = (await res.json()) as CitizenSessionsStats
      setStats(data)
    } catch (err) {
      console.error(err)
      const errorMessage = err instanceof Error && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))
        ? 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng của bạn.'
        : 'Không tải được thống kê phiên sạc.'
      setError(errorMessage)
    } finally {
      setLoadingStats(false)
    }
  }

  async function loadSessions(params?: URLSearchParams) {
    if (!userId) return
    try {
      setLoadingSessions(true)
      setError(null)
      const query = params ? `?${params.toString()}` : ''
      const res = await apiFetch(`/citizens/${userId}/sessions${query}`)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const data = (await res.json()) as Session[]
      setSessions(data)
    } catch (err) {
      console.error(err)
      const errorMessage = err instanceof Error && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))
        ? 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng của bạn.'
        : err instanceof Error && err.message.includes('404')
          ? 'Bạn chưa có lịch sử sạc nào.'
          : `Không tải được lịch sử phiên sạc: ${err instanceof Error ? err.message : 'Lỗi không xác định'}`
      setError(errorMessage)
      setSessions([])
    } finally {
      setLoadingSessions(false)
    }
  }

  const stationNameLookup = useMemo<Record<string, string>>(() => {
    const entries = new globalThis.Map<string, string>()
    sessions.forEach((session) => {
      if (session.station_id && session.station_name) {
        entries.set(session.station_id, session.station_name)
      }
    })
    return Object.fromEntries(entries) as Record<string, string>
  }, [sessions])

  const stationNameSuggestions = useMemo(() => {
    const names = new Set<string>()
    sessions.forEach((session) => {
      if (session.station_name) {
        names.add(session.station_name)
      }
    })
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'vi'))
  }, [sessions])

  function normalizeText(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
  }


  function buildQueryParams() {
    const params = new URLSearchParams()
    if (startDateFilter) params.set('start_date', startDateFilter)
    if (endDateFilter) params.set('end_date', endDateFilter)
    if (stationSearchFilter) params.set('station_name', stationSearchFilter)
    params.set('limit', limit.toString())

    // Update hasFilters state based on whether any filters are active
    setHasFilters(!!startDateFilter || !!endDateFilter || !!stationSearchFilter)
    if (startDateFilter) {
      const startIso = new Date(`${startDateFilter}T00:00:00Z`).toISOString()
      params.append('start_date', startIso)
    }
    if (endDateFilter) {
      const endIso = new Date(`${endDateFilter}T23:59:59Z`).toISOString()
      params.append('end_date', endIso)
    }
    return params
  }

  async function handleApplyFilters(e: React.FormEvent) {
    e.preventDefault()
    const params = buildQueryParams()
    await Promise.all([loadSessions(params), loadStats(params)])
  }

  async function handleResetFilters() {
    setStationSearchFilter('')
    setStartDateFilter('')
    setEndDateFilter('')
    setLimit(20)
    await Promise.all([loadSessions(), loadStats()])
  }

  async function handleRefresh() {
    const params = buildQueryParams()
    await Promise.all([loadProfile(), loadSessions(params), loadStats(params)])
  }

  const filteredSessions = useMemo(() => {
    const keyword = normalizeText(stationSearchFilter.trim())
    if (!keyword) {
      return sessions
    }
    return sessions.filter((session) => {
      const displayName = stationNameLookup[session.station_id] ?? session.station_name ?? session.station_id
      return normalizeText(displayName).includes(keyword)
    })
  }, [sessions, stationSearchFilter, stationNameLookup])

  function calculateStats(list: Session[]): CitizenSessionsStats {
    const totalSessions = list.length
    let totalEnergy = 0
    let totalAmount = 0
    let totalTax = 0
    let totalDuration = 0

    list.forEach((session) => {
      totalEnergy += session.power_consumption_kwh ?? 0
      totalAmount += session.amount_collected_vnd ?? 0
      totalTax += session.tax_amount_collected_vnd ?? 0
      const duration = getDurationMinutes(session)
      if (duration != null) {
        totalDuration += duration
      }
    })

    return {
      user_id: userId,
      total_sessions: totalSessions,
      total_energy_kwh: totalEnergy,
      total_amount_vnd: totalAmount,
      total_tax_vnd: totalTax,
      total_duration_minutes: totalDuration,
      average_session_duration_minutes: totalSessions > 0 ? totalDuration / totalSessions : 0,
      average_energy_kwh: totalSessions > 0 ? totalEnergy / totalSessions : 0,
      average_amount_vnd: totalSessions > 0 ? totalAmount / totalSessions : 0,
    }
  }

  const statsToDisplay = useMemo(() => {
    if (stationSearchFilter.trim()) {
      return calculateStats(filteredSessions)
    }
    if (stats) {
      return stats
    }
    return calculateStats(filteredSessions)
  }, [filteredSessions, stats, stationSearchFilter])

  return (
    <div className="flex flex-col gap-4 sm:gap-6 min-w-0 w-full">
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-3 sm:gap-4 min-w-0">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 break-words">Lịch sử sạc của tôi</h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 break-words">
            Theo dõi các phiên sạc đã thực hiện, thống kê năng lượng và chi phí theo thời gian.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void handleRefresh()
          }}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 shadow-sm transition hover:border-transparent hover:bg-[#124874] hover:text-white min-h-[40px] sm:min-h-[44px]"
        >
          {loadingProfile || loadingSessions || loadingStats ? (
            <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          )}
          <span className="hidden sm:inline">Làm mới</span>
          <span className="sm:hidden">Mới</span>
        </button>
      </div>

      {error ? (
        <div className="flex items-start gap-2 sm:gap-3 rounded-lg sm:rounded-xl border border-amber-200 bg-amber-50 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-amber-700">
          <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 mt-0.5" />
          <span className="break-words">{error}</span>
        </div>
      ) : null}

      <section className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 md:p-6 shadow-sm">
        <h2 className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base font-bold text-slate-900">
          <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-[#124874] flex-shrink-0" />
          Thống kê tổng hợp
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 break-words">
          Các số liệu dưới đây phản ánh các phiên sạc đã chọn theo bộ lọc.
        </p>

        <div className="mt-3 sm:mt-4 grid gap-2 sm:gap-3 grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              label: 'Tổng phiên sạc',
              icon: History,
              value: statsToDisplay.total_sessions ?? 0,
              className: 'from-blue-500/20 via-blue-400/10 to-blue-500/5 text-blue-900',
            },
            {
              label: 'Tổng năng lượng (kWh)',
              icon: Zap,
              value: formatNumber(statsToDisplay.total_energy_kwh, 1),
              className: 'from-emerald-500/20 via-emerald-400/10 to-emerald-500/5 text-emerald-900',
            },
            {
              label: 'Tổng chi phí đã trả (VND)',
              icon: DollarSign,
              value: formatCurrency(statsToDisplay.total_amount_vnd),
              className: 'from-amber-500/20 via-amber-400/10 to-amber-500/5 text-amber-900',
            },
            {
              label: 'Thuế đã trả (VND)',
              icon: TrendingUp,
              value: formatCurrency(statsToDisplay.total_tax_vnd),
              className: 'from-purple-500/20 via-purple-400/10 to-purple-500/5 text-purple-900',
            },
            {
              label: 'Tổng thời lượng (phút)',
              icon: Clock,
              value: formatNumber(statsToDisplay.total_duration_minutes, 0),
              className: 'from-rose-500/20 via-rose-400/10 to-rose-500/5 text-rose-900',
            },
            {
              label: 'Thời lượng trung bình',
              icon: CalendarClock,
              value: formatDuration(statsToDisplay.average_session_duration_minutes ?? null),
              className: 'from-slate-500/20 via-slate-400/10 to-slate-500/5 text-slate-900',
            },
          ].map(({ label, icon: Icon, value, className }) => (
            <div
              key={label}
              className={`rounded-xl border border-slate-200 bg-gradient-to-br ${className} p-4 shadow-sm`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                  {label}
                </span>
                <Icon className="h-4 w-4 text-slate-700" />
              </div>
              <div className="mt-3 text-lg font-bold text-slate-900">{value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 md:p-6 shadow-sm overflow-hidden min-w-0">
        <form
          className="grid gap-2 sm:gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-[repeat(5,minmax(0,1fr))] min-w-0"
          onSubmit={handleApplyFilters}
        >
          <div className="sm:col-span-2 md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Trạm sạc
            </label>
            <div className="mt-1 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-2 sm:left-3 top-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 -translate-y-1/2 text-slate-400" />
                <input
                  list="station-options"
                  value={stationSearchFilter}
                  onChange={(e) => setStationSearchFilter(e.target.value)}
                  placeholder="Nhập tên trạm..."
                  className="w-full rounded-lg border border-slate-200 bg-white py-1.5 sm:py-2 pl-7 sm:pl-9 pr-2 sm:pr-3 text-xs sm:text-sm shadow-sm focus:border-[#124874] focus:outline-none focus:ring-2 focus:ring-[#124874]/10"
                />
                <datalist id="station-options">
                  {stationNameSuggestions.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Từ ngày
            </label>
            <div className="mt-1 flex items-center gap-1.5 sm:gap-2">
              <CalendarRange className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400 flex-shrink-0" />
              <input
                type="date"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm shadow-sm focus:border-[#124874] focus:outline-none focus:ring-2 focus:ring-[#124874]/10"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Đến ngày
            </label>
            <div className="mt-1 flex items-center gap-1.5 sm:gap-2">
              <CalendarRange className="h-3.5 w-3.5 sm:h-4 sm:w-4 rotate-180 text-slate-400 flex-shrink-0" />
              <input
                type="date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm shadow-sm focus:border-[#124874] focus:outline-none focus:ring-2 focus:ring-[#124874]/10"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Số dòng
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm shadow-sm focus:border-[#124874] focus:outline-none focus:ring-2 focus:ring-[#124874]/10"
            >
              {[10, 20, 50].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
            <button
              type="submit"
              className="inline-flex flex-1 items-center justify-center gap-1.5 sm:gap-2 rounded-lg bg-[#124874] px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f3a5a] min-h-[40px] sm:min-h-[44px]"
            >
              <FilterIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Áp dụng
            </button>
            <button
              type="button"
              onClick={() => {
                void handleResetFilters()
              }}
              className="inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg border border-slate-200 bg-white px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#df3a3d] hover:text-[#df3a3d] min-h-[40px] sm:min-h-[44px]"
            >
              Đặt lại
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 md:p-6 shadow-sm overflow-hidden min-w-0">
        <div className="mb-3 sm:mb-4 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2 min-w-0">
          <h2 className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base font-bold text-slate-900 min-w-0">
            <History className="h-4 w-4 sm:h-5 sm:w-5 text-[#124874] flex-shrink-0" />
            <span className="break-words">Lịch sử phiên sạc</span>
          </h2>
          <span className="text-xs font-medium text-slate-500 whitespace-nowrap flex-shrink-0">
            {filteredSessions.length} phiên được hiển thị
          </span>
        </div>

        {loadingSessions ? (
          <div className="flex items-center gap-2 rounded-lg sm:rounded-xl border border-slate-200 bg-slate-50 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-slate-600">
            <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin flex-shrink-0" />
            <span className="break-words">Đang tải dữ liệu phiên sạc...</span>
          </div>
        ) : null}

        {!loadingSessions && sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg sm:rounded-xl border border-blue-200 bg-blue-50 p-4 sm:p-6 text-center">
            <Battery className="h-8 w-8 sm:h-10 sm:w-10 text-blue-500" />
            <div>
              <h3 className="text-sm sm:text-base font-medium text-blue-800">Chưa có phiên sạc nào</h3>
              <p className="mt-1 text-xs sm:text-sm text-blue-700">
                {hasFilters
                  ? 'Không tìm thấy phiên sạc nào phù hợp với bộ lọc hiện tại. Vui lòng thử lại với điều kiện khác.'
                  : 'Bạn chưa có phiên sạc nào. Hãy bắt đầu sạc xe để xem lịch sử tại đây.'}
              </p>
            </div>
          </div>
        ) : null}

        {filteredSessions.length > 0 ? (
          <div className="mt-3 w-full overflow-x-auto rounded-lg sm:rounded-xl border border-slate-200">
            <div className="min-w-[700px] sm:min-w-[800px]">
              <table className="w-full border-collapse text-xs sm:text-sm">
              <thead className="bg-gradient-to-r from-slate-50 to-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="border-b border-slate-200 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-3 text-left">Bắt đầu</th>
                  <th className="border-b border-slate-200 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-3 text-left">Kết thúc</th>
                  <th className="border-b border-slate-200 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-3 text-left">Trạm</th>
                  <th className="border-b border-slate-200 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-3 text-left">Loại xe</th>
                  <th className="border-b border-slate-200 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-3 text-left">Trạng thái</th>
                  <th className="border-b border-slate-200 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-3 text-right">Thời lượng</th>
                  <th className="border-b border-slate-200 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-3 text-right">kWh</th>
                  <th className="border-b border-slate-200 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-3 text-right">Chi phí (VND)</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((session, index) => {
                  const duration = getDurationMinutes(session)
                  return (
                    <tr
                      key={session.id}
                      className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}
                    >
                      <td className="border-b border-slate-100 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-3 text-slate-700 text-xs break-words min-w-0">
                        {formatDateTime(session.start_date_time)}
                      </td>
                      <td className="border-b border-slate-100 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-3 text-slate-700 text-xs break-words min-w-0">
                        {formatDateTime(session.end_date_time)}
                      </td>
                      <td className="border-b border-slate-100 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-3 text-slate-700 min-w-0">
                        <span className="font-semibold text-slate-800 break-words text-xs">
                          {stationNameLookup[session.station_id] ?? session.station_name ?? session.station_id}
                        </span>
                      </td>
                      <td className="border-b border-slate-100 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-3 text-slate-700 text-xs break-words min-w-0">
                        {formatVehicleType(session.vehicle_type)}
                      </td>
                      <td className="border-b border-slate-100 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-3 text-slate-700 text-xs break-words min-w-0">
                        {getStationStatusLabel(session.session_status)}
                      </td>
                      <td className="border-b border-slate-100 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-3 text-right font-semibold text-slate-800 text-xs">
                        {formatDuration(duration)}
                      </td>
                      <td className="border-b border-slate-100 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-3 text-right font-semibold text-slate-800 text-xs">
                        {formatNumber(session.power_consumption_kwh, 1)}
                      </td>
                      <td className="border-b border-slate-100 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-3 text-right font-semibold text-slate-800 text-xs">
                        {formatCurrency(session.amount_collected_vnd)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}

function FilterIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M4 4h16M6 9h12M8 14h8M10 19h4"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
