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
  CalendarClock,
  CalendarRange,
  Clock,
  DollarSign,
  History,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  TrendingUp,
  Zap,
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
  const [stations, setStations] = useState<Station[]>([])

  const [loadingProfile, setLoadingProfile] = useState(false)
  const [loadingStats, setLoadingStats] = useState(false)
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      void loadStations()
    }
  }, [userId])

  async function loadStations() {
    try {
      const res = await apiFetch(`/stations/search`)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const data = (await res.json()) as Station[]
      setStations(data)
    } catch (err) {
      console.error(err)
    }
  }

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
      setError('Không tải được thông tin người dùng.')
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
      setError('Không tải được thống kê phiên sạc.')
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
      setError('Không tải được lịch sử phiên sạc.')
      setSessions([])
    } finally {
      setLoadingSessions(false)
    }
  }

  const stationNameLookup = useMemo<Record<string, string>>(() => {
    const entries = new globalThis.Map<string, string>()
    stations.forEach((station) => entries.set(station.id, station.name))
    sessions.forEach((session) => {
      if (session.station_id && session.station_name) {
        entries.set(session.station_id, session.station_name)
      }
    })
    return Object.fromEntries(entries) as Record<string, string>
  }, [stations, sessions])

  const stationNameSuggestions = useMemo(() => {
    const names = new Set<string>()
    stations.forEach((station) => names.add(station.name))
    sessions.forEach((session) => {
      if (session.station_name) {
        names.add(session.station_name)
      }
    })
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'vi'))
  }, [stations, sessions])

  function normalizeText(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
  }

  function resolveStationId(search: string): string | null {
    const normalized = normalizeText(search.trim())
    if (!normalized) {
      return null
    }
    for (const [id, name] of Object.entries(stationNameLookup)) {
      if (normalizeText(name) === normalized) {
        return id
      }
    }
    // allow direct ID entry
    const directMatch = stations.find((station) => normalizeText(station.id) === normalized)
    return directMatch?.id ?? null
  }

  function buildQueryParams() {
    const params = new URLSearchParams()
    params.append('limit', String(limit))
    if (stationSearchFilter.trim()) {
      const stationId = resolveStationId(stationSearchFilter)
      if (stationId) {
        params.append('station_id', stationId)
      } else {
        params.append('station_name', stationSearchFilter.trim())
      }
    }
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lịch sử sạc của tôi</h1>
          <p className="text-sm text-slate-500">
            Theo dõi các phiên sạc đã thực hiện, thống kê năng lượng và chi phí theo thời gian.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void handleRefresh()
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-transparent hover:bg-[#124874] hover:text-white"
        >
          {loadingProfile || loadingSessions || loadingStats ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Làm mới
        </button>
      </div>

      {error ? (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <BarChart3 className="h-5 w-5 text-[#124874]" />
          Thống kê tổng hợp
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Các số liệu dưới đây phản ánh các phiên sạc đã chọn theo bộ lọc.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form
          className="grid gap-4 md:grid-cols-[repeat(5,minmax(0,1fr))]"
          onSubmit={handleApplyFilters}
        >
          <div className="md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Trạm sạc
            </label>
            <div className="mt-1 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  list="station-options"
                  value={stationSearchFilter}
                  onChange={(e) => setStationSearchFilter(e.target.value)}
                  placeholder="Nhập tên trạm..."
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-[#124874] focus:outline-none focus:ring-2 focus:ring-[#124874]/10"
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
            <div className="mt-1 flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-[#124874] focus:outline-none focus:ring-2 focus:ring-[#124874]/10"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Đến ngày
            </label>
            <div className="mt-1 flex items-center gap-2">
              <CalendarRange className="h-4 w-4 rotate-180 text-slate-400" />
              <input
                type="date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-[#124874] focus:outline-none focus:ring-2 focus:ring-[#124874]/10"
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
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-[#124874] focus:outline-none focus:ring-2 focus:ring-[#124874]/10"
            >
              {[10, 20, 50].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#124874] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f3a5a]"
            >
              <FilterIcon className="h-4 w-4" />
              Áp dụng
            </button>
            <button
              type="button"
              onClick={() => {
                void handleResetFilters()
              }}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#df3a3d] hover:text-[#df3a3d]"
            >
              Đặt lại
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <History className="h-5 w-5 text-[#124874]" />
            Lịch sử phiên sạc
          </h2>
          <span className="text-xs font-medium text-slate-500">
            {filteredSessions.length} phiên được hiển thị
          </span>
        </div>

        {loadingSessions ? (
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Đang tải dữ liệu phiên sạc...</span>
          </div>
        ) : null}

        {!loadingSessions && sessions.length === 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            <MapPin className="h-4 w-4" />
            <span>Chưa có phiên sạc nào thỏa điều kiện lọc.</span>
          </div>
        ) : null}

        {filteredSessions.length > 0 ? (
          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-gradient-to-r from-slate-50 to-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="border-b border-slate-200 px-4 py-3 text-left">Bắt đầu</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left">Kết thúc</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left">Trạm</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left">Loại xe</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left">Trạng thái</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-right">Thời lượng</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-right">kWh</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-right">Chi phí (VND)</th>
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
                      <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                        {formatDateTime(session.start_date_time)}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                        {formatDateTime(session.end_date_time)}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                        <span className="font-semibold text-slate-800">
                          {stationNameLookup[session.station_id] ?? session.station_name ?? session.station_id}
                        </span>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                        {formatVehicleType(session.vehicle_type)}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                        {getStationStatusLabel(session.session_status)}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-right font-semibold text-slate-800">
                        {formatDuration(duration)}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-right font-semibold text-slate-800">
                        {formatNumber(session.power_consumption_kwh, 1)}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-right font-semibold text-slate-800">
                        {formatCurrency(session.amount_collected_vnd)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
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
