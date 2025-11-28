/* SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
 * This file is part of ev-charging-app and is licensed under the
 * MIT License. See the LICENSE file in the project root for details.
 */

import { useEffect, useRef, useState } from 'react'
import maplibregl, { Map as MapLibreMap, Marker, Popup } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type {
  Station,
  AnalyticsOverview,
  StationAnalytics,
  Session,
  StationRealtime,
} from '../../types/ev'
import { MAP_STYLE } from '../../mapConfig'
import { AnalyticsOverviewPanel } from '../analytics/AnalyticsOverviewPanel'
import { StationFilters } from '../stations/StationFilters'
import { StationList } from '../stations/StationList'
import { StationDetails } from '../stations/StationDetails'
import { DatasetsPanel } from '../datasets/DatasetsPanel'
import {
  AlertTriangle,
  Zap,
  Plug,
  Car,
  DollarSign,
  Map,
  MapPin,
  Ruler,
  Search,
  Loader2,
  CheckCircle2,
  Clock,
  BarChart3,
} from 'lucide-react'

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000'

const DEFAULT_CENTER: [number, number] = [106.7009, 10.7769]

function getWebSocketUrl() {
  try {
    const url = new URL(API_BASE_URL)
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    url.pathname = '/ws/realtime'
    url.search = ''
    return url.toString()
  } catch {
    return `${API_BASE_URL.replace(/^http/, 'ws')}/ws/realtime`
  }
}

type RealtimeSessionSummary = {
  session_id: string | null
  station_id: string | null
  vehicle_type: string | null
  start_date_time: string | null
  end_date_time: string | null
  power_consumption_kwh: number | null
  amount_collected_vnd: number | null
  tax_amount_collected_vnd: number | null
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return '-'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString('vi-VN')
}

type MiniStationsMapProps = {
  stations: Station[]
  onSelectStation: (stationId: string) => void
}

function MiniStationsMap({ stations, onSelectStation }: MiniStationsMapProps) {
  const coords = stations
    .map((station) => station.location?.coordinates)
    .filter((value): value is number[] => Array.isArray(value) && value.length === 2)

  const hasCoords = coords.length > 0

  const lons = hasCoords ? coords.map(([lon]) => lon) : []
  const lats = hasCoords ? coords.map(([, lat]) => lat) : []
  const avgLon = hasCoords
    ? lons.reduce((sum, value) => sum + value, 0) / lons.length
    : 0
  const avgLat = hasCoords
    ? lats.reduce((sum, value) => sum + value, 0) / lats.length
    : 0

  const centerLon = hasCoords ? avgLon : DEFAULT_CENTER[0]
  const centerLat = hasCoords ? avgLat : DEFAULT_CENTER[1]

  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markersRef = useRef<Marker[]>([])
  const lastCenterRef = useRef<[number, number] | null>(null)
  const stationsKey = stations.map((station) => station.id).join('|')

  useEffect(() => {
    if (!mapContainerRef.current) {
      return
    }

    if (!mapRef.current) {
      mapRef.current = new maplibregl.Map({
        container: mapContainerRef.current,
        style: MAP_STYLE,
        center: [centerLon, centerLat],
        zoom: 13,
      })
    } else {
      const prev = lastCenterRef.current
      const next: [number, number] = [centerLon, centerLat]

      if (!prev || prev[0] !== next[0] || prev[1] !== next[1]) {
        mapRef.current.easeTo({ center: next, duration: 500 })
      }
    }

    markersRef.current.forEach((marker) => {
      marker.remove()
    })
    markersRef.current = []

    stations.forEach((station) => {
      const coordinates = station.location?.coordinates
      if (!Array.isArray(coordinates) || coordinates.length !== 2) {
        return
      }

      const mapInstance = mapRef.current
      if (!mapInstance) {
        return
      }

      const [lon, lat] = coordinates
      const marker = new maplibregl.Marker({ color: '#4f46e5' })
        .setLngLat([lon, lat])
        .setPopup(new Popup({ offset: 12 }).setText(station.name))

      marker.getElement().addEventListener('click', () => {
        marker.togglePopup()
        onSelectStation(station.id)
      })

      marker.addTo(mapInstance)
      markersRef.current.push(marker)
    })

    lastCenterRef.current = [centerLon, centerLat]
  }, [centerLon, centerLat, hasCoords, stationsKey])

  useEffect(() => {
    return () => {
      markersRef.current.forEach((marker) => {
        marker.remove()
      })
      markersRef.current = []

      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  return <div ref={mapContainerRef} className="h-96 w-full rounded-md" />
}

type DashboardSection = 'overview' | 'realtime' | 'map' | 'stations'

type DashboardPageProps = {
  section: DashboardSection
}

export function DashboardPage({ section }: DashboardPageProps) {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null)
  const [stations, setStations] = useState<Station[]>([])
  const [selectedStationId, setSelectedStationId] = useState<string | undefined>(undefined)
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)
  const [stationRealtime, setStationRealtime] = useState<StationRealtime | null>(null)
  const [stationAnalytics, setStationAnalytics] = useState<StationAnalytics | null>(null)
  const [stationSessions, setStationSessions] = useState<Session[]>([])
  const [recentSessions, setRecentSessions] = useState<RealtimeSessionSummary[]>([])

  const [statusFilter, setStatusFilter] = useState('')
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('')
  const [minAvailableFilter, setMinAvailableFilter] = useState('')
  const [networkFilter, setNetworkFilter] = useState('')
  const [chargeTypeFilter, setChargeTypeFilter] = useState('')
  const [socketTypeFilter, setSocketTypeFilter] = useState('')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('')
  const [minCapacityFilter, setMinCapacityFilter] = useState('')
  const [maxCapacityFilter, setMaxCapacityFilter] = useState('')

  const [stationPage, setStationPage] = useState(1)
  const STATIONS_PER_PAGE = 5

  const [loadingOverview, setLoadingOverview] = useState(false)
  const [loadingStations, setLoadingStations] = useState(false)
  const [loadingStationDetails, setLoadingStationDetails] = useState(false)
  const [loadingStationRealtime, setLoadingStationRealtime] = useState(false)
  const [loadingStationAnalytics, setLoadingStationAnalytics] = useState(false)
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nearLat, setNearLat] = useState('10.7769')
  const [nearLng, setNearLng] = useState('106.7009')
  const [nearRadiusKm, setNearRadiusKm] = useState('5')
  const [nearbyStations, setNearbyStations] = useState<Station[]>([])
  const [loadingNearby, setLoadingNearby] = useState(false)
  const [nearbyError, setNearbyError] = useState<string | null>(null)

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(stations.length / STATIONS_PER_PAGE))
    if (stationPage > totalPages) {
      setStationPage(totalPages)
    }
  }, [stations, stationPage, STATIONS_PER_PAGE])

  useEffect(() => {
    void loadOverview()
    void loadStations()
  }, [])

  useEffect(() => {
    const wsUrl = getWebSocketUrl()
    let ws: WebSocket | null = null

    try {
      ws = new WebSocket(wsUrl)
    } catch (error) {
      console.error('Không thể khởi tạo WebSocket', error)
      return
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data as string)
        if (message?.type === 'station_update' && message.stationId && message.payload) {
          const stationId: string = message.stationId
          const payload = message.payload as {
            available_capacity?: number | null
            status?: string | null
            instantaneous_power?: number | null
            queue_length?: number | null
          }

          setStations((prev) =>
            prev.map((station) => {
              if (station.id !== stationId) {
                return station
              }
              return {
                ...station,
                status: payload.status ?? station.status,
                available_capacity:
                  payload.available_capacity ?? station.available_capacity,
                instantaneous_power:
                  payload.instantaneous_power ?? station.instantaneous_power,
                queue_length: payload.queue_length ?? station.queue_length,
              }
            }),
          )
        } else if (message?.type === 'session_upsert' && message.stationId && message.payload) {
          const sessionId: string | null = (message.sessionId as string | null) ?? null
          const stationId: string = message.stationId as string
          const payload = message.payload as {
            vehicle_type?: string | null
            start_date_time?: string | null
            end_date_time?: string | null
            power_consumption_kwh?: number | null
            amount_collected_vnd?: number | null
            tax_amount_collected_vnd?: number | null
          }

          setRecentSessions((prev) => {
            const next: RealtimeSessionSummary[] = [
              {
                session_id: sessionId,
                station_id: stationId,
                vehicle_type: payload.vehicle_type ?? null,
                start_date_time: payload.start_date_time ?? null,
                end_date_time: payload.end_date_time ?? null,
                power_consumption_kwh: payload.power_consumption_kwh ?? null,
                amount_collected_vnd: payload.amount_collected_vnd ?? null,
                tax_amount_collected_vnd: payload.tax_amount_collected_vnd ?? null,
              },
              ...prev.filter((item) => item.session_id !== sessionId),
            ]
            return next.slice(0, 10)
          })
        }
      } catch (error) {
        console.error('Lỗi khi xử lý message WebSocket', error)
      }
    }

    ws.onerror = (event) => {
      console.error('Lỗi WebSocket', event)
    }

    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    }
  }, [])

  async function loadOverview() {
    try {
      setLoadingOverview(true)
      setError(null)
      const res = await fetch(`${API_BASE_URL}/analytics/overview`)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const data = (await res.json()) as AnalyticsOverview
      setOverview(data)
    } catch (error) {
      console.error(error)
      setError('Không tải được thống kê tổng quan.')
    } finally {
      setLoadingOverview(false)
    }
  }

  async function loadStations() {
    try {
      setLoadingStations(true)
      setError(null)

      const params = new URLSearchParams()
      if (statusFilter) {
        params.append('status', statusFilter)
      }
      if (vehicleTypeFilter) {
        params.append('vehicle_type', vehicleTypeFilter)
      }
      if (networkFilter) {
        params.append('network', networkFilter)
      }
      if (chargeTypeFilter) {
        params.append('charge_type', chargeTypeFilter)
      }
      if (socketTypeFilter) {
        params.append('socket_type', socketTypeFilter)
      }
      if (paymentMethodFilter) {
        params.append('payment_method', paymentMethodFilter)
      }
      if (minAvailableFilter) {
        const value = Number(minAvailableFilter)
        if (!Number.isNaN(value) && value >= 0) {
          params.append('min_available_capacity', String(value))
        }
      }
      if (minCapacityFilter) {
        const value = Number(minCapacityFilter)
        if (!Number.isNaN(value) && value >= 0) {
          params.append('min_capacity', String(value))
        }
      }
      if (maxCapacityFilter) {
        const value = Number(maxCapacityFilter)
        if (!Number.isNaN(value) && value >= 0) {
          params.append('max_capacity', String(value))
        }
      }

      const query = params.toString()
      const url = `${API_BASE_URL}/stations/search${query ? `?${query}` : ''}`
      const res = await fetch(url)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const data = (await res.json()) as Station[]
      setStations(data)
      setStationPage(1)

      if (data.length === 0) {
        setSelectedStationId(undefined)
        setStationAnalytics(null)
        return
      }

      let newSelectedId = selectedStationId
      if (!newSelectedId || !data.some((station) => station.id === newSelectedId)) {
        newSelectedId = data[0]?.id
      }
      setSelectedStationId(newSelectedId)
      if (newSelectedId) {
        void loadStationAnalytics(newSelectedId)
        void loadStationSessions(newSelectedId)
      }
    } catch (error) {
      console.error(error)
      setError('Không tải được danh sách trạm sạc.')
    } finally {
      setLoadingStations(false)
    }
  }

  async function loadStationAnalytics(stationId: string) {
    try {
      setLoadingStationAnalytics(true)
      setError(null)
      const res = await fetch(
        `${API_BASE_URL}/analytics/stations/${encodeURIComponent(stationId)}`,
      )
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const data = (await res.json()) as StationAnalytics
      setStationAnalytics(data)
    } catch (error) {
      console.error(error)
      setError('Không tải được thống kê cho trạm này.')
    } finally {
      setLoadingStationAnalytics(false)
    }
  }

  async function loadStationDetails(stationId: string) {
    try {
      setLoadingStationDetails(true)
      setError(null)
      const res = await fetch(`${API_BASE_URL}/stations/${encodeURIComponent(stationId)}`)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const data = (await res.json()) as Station
      setSelectedStation(data)
    } catch (error) {
      console.error(error)
      setError('Không tải được chi tiết trạm sạc.')
    } finally {
      setLoadingStationDetails(false)
    }
  }

  async function loadStationRealtime(stationId: string) {
    try {
      setLoadingStationRealtime(true)
      setError(null)
      const res = await fetch(
        `${API_BASE_URL}/stations/${encodeURIComponent(stationId)}/realtime`,
      )
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const data = (await res.json()) as StationRealtime
      setStationRealtime(data)
    } catch (error) {
      console.error(error)
      setError('Không tải được trạng thái realtime của trạm.')
    } finally {
      setLoadingStationRealtime(false)
    }
  }

  async function loadStationSessions(stationId: string) {
    try {
      setLoadingSessions(true)
      setError(null)
      const res = await fetch(
        `${API_BASE_URL}/stations/${encodeURIComponent(stationId)}/sessions`,
      )
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const data = (await res.json()) as Session[]
      setStationSessions(data)
    } catch (error) {
      console.error(error)
      setError('Không tải được danh sách phiên sạc cho trạm này.')
    } finally {
      setLoadingSessions(false)
    }
  }

  async function loadNearbyStations() {
    try {
      setLoadingNearby(true)
      setNearbyError(null)

      const lat = Number(nearLat)
      const lng = Number(nearLng)
      const radius = Number(nearRadiusKm)

      if (Number.isNaN(lat) || Number.isNaN(lng) || Number.isNaN(radius) || radius <= 0) {
        throw new Error('INVALID_INPUT')
      }

      const params = new URLSearchParams()
      params.append('lat', String(lat))
      params.append('lng', String(lng))
      params.append('radius_km', String(radius))

      const res = await fetch(`${API_BASE_URL}/stations/near?${params.toString()}`)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const data = (await res.json()) as Station[]
      setNearbyStations(data)
    } catch (error) {
      console.error(error)
      setNearbyError('Không tìm được trạm phù hợp với toạ độ / bán kính đã nhập.')
      setNearbyStations([])
    } finally {
      setLoadingNearby(false)
    }
  }

  function handleApplyFilters() {
    void loadStations()
  }

  function handleSelectStation(stationId: string) {
    setSelectedStationId(stationId)
    void loadStationDetails(stationId)
    void loadStationRealtime(stationId)
    void loadStationAnalytics(stationId)
    void loadStationSessions(stationId)
  }

  // Use fetched station details if available, otherwise fall back to finding in list
  const displayStation =
    selectedStation ??
    (selectedStationId != null
      ? stations.find((station) => station.id === selectedStationId) ??
        nearbyStations.find((station) => station.id === selectedStationId) ??
        null
      : null)

  const locationParts = displayStation
    ? [
        displayStation.address?.streetAddress,
        displayStation.address?.addressLocality,
        displayStation.address?.addressCountry,
      ].filter((part): part is string => typeof part === 'string' && part.length > 0)
    : []
  const locationSummary = locationParts.length > 0 ? locationParts.join(', ') : null

  const statusText = stationRealtime?.status ?? displayStation?.status ?? 'Không rõ'
  const availableCapacityValue =
    stationRealtime?.available_capacity ?? displayStation?.available_capacity ?? null
  const instantaneousPowerValue =
    stationRealtime?.instantaneous_power ?? displayStation?.instantaneous_power ?? null
  const queueLengthValue =
    stationRealtime?.queue_length ?? displayStation?.queue_length ?? null
  const totalCapacityValue = displayStation?.capacity ?? null
  const totalSessionsValue = stationAnalytics?.total_sessions ?? null
  const totalEnergyValue = stationAnalytics?.total_energy_kwh ?? null
  const totalAmountValue = stationAnalytics?.total_amount_vnd ?? null

  const totalStationPages = Math.max(1, Math.ceil(stations.length / STATIONS_PER_PAGE))
  const pageStartIndex = (stationPage - 1) * STATIONS_PER_PAGE
  const paginatedStations = stations.slice(pageStartIndex, pageStartIndex + STATIONS_PER_PAGE)

  return (
    <div className="flex flex-col gap-6">
      {section === 'overview' ? (
        <>
          <section className="rounded-2xl border border-slate-200/50 bg-white/80 backdrop-blur-sm p-6 shadow-lg">
            <AnalyticsOverviewPanel overview={overview} loading={loadingOverview} />
          </section>
          <DatasetsPanel />
        </>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-xl border-2 border-red-300 bg-gradient-to-r from-red-50 to-red-100 px-5 py-4 text-sm font-semibold text-red-800 shadow-md"
        >
          <AlertTriangle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      ) : null}

      {section === 'realtime' ? (
        <section className="rounded-2xl border border-slate-200/50 bg-white/80 backdrop-blur-sm p-6 shadow-lg">
          <div className="mb-4 flex items-center gap-2">
            <Zap className="h-6 w-6 text-[#124874]" />
            <h2 className="text-xl font-bold text-slate-900">
              Phiên sạc realtime gần đây
            </h2>
          </div>
          {recentSessions.length === 0 ? (
            <div className="rounded-xl bg-slate-50 p-6 text-center">
              <p className="text-base font-medium text-slate-600">
                Chưa có phiên sạc realtime nào trong phiên làm việc này.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                  <tr>
                    <th className="border-b border-slate-200 px-4 py-3 text-left font-semibold text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        Thời gian bắt đầu
                      </span>
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3 text-left font-semibold text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <Plug className="h-4 w-4" />
                        Trạm
                      </span>
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3 text-left font-semibold text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <Car className="h-4 w-4" />
                        Loại phương tiện
                      </span>
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3 text-right font-semibold text-slate-700">
                      <span className="flex items-center justify-end gap-1.5">
                        <Zap className="h-4 w-4" />
                        kWh
                      </span>
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3 text-right font-semibold text-slate-700">
                      <span className="flex items-center justify-end gap-1.5">
                        <DollarSign className="h-4 w-4" />
                        Doanh thu (VND)
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentSessions.map((item, index) => (
                    <tr
                      key={item.session_id ?? `${item.station_id}-${item.start_date_time}`}
                      className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}
                    >
                      <td className="border-b border-slate-100 px-4 py-2.5 font-medium text-slate-700">
                        {formatDateTime(item.start_date_time)}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-2.5 font-medium text-slate-700">
                        {item.station_id ?? '-'}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-2.5 font-medium text-slate-700">
                        {item.vehicle_type ?? '-'}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-2.5 text-right font-semibold text-slate-700">
                        {item.power_consumption_kwh != null
                          ? item.power_consumption_kwh.toLocaleString('vi-VN', {
                              maximumFractionDigits: 1,
                            })
                          : '-'}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-2.5 text-right font-semibold text-slate-700">
                        {item.amount_collected_vnd != null
                          ? item.amount_collected_vnd.toLocaleString('vi-VN')
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {section === 'map' ? (
        <section className="rounded-2xl border border-slate-200/50 bg-white/80 backdrop-blur-sm p-6 shadow-lg">
          <div className="mb-4 flex items-center gap-2">
            <Map className="h-6 w-6 text-[#124874]" />
            <h2 className="text-xl font-bold text-slate-900">
              Bản đồ trạm sạc &amp; tìm gần toạ độ
            </h2>
          </div>
          <div className="mb-4 rounded-xl bg-gradient-to-br from-slate-50 to-white p-4 border border-slate-200/50">
            <div className="mb-3 flex flex-wrap items-end gap-3 text-base">
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <MapPin className="h-3.5 w-3.5" />
                  Vĩ độ (lat)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={nearLat}
                  onChange={(event) => setNearLat(event.target.value)}
                  className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition-all focus:border-[#124874] focus:outline-none focus:ring-2 focus:ring-[#124874]/20"
                />
              </div>
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <MapPin className="h-3.5 w-3.5" />
                  Kinh độ (lng)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={nearLng}
                  onChange={(event) => setNearLng(event.target.value)}
                  className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition-all focus:border-[#124874] focus:outline-none focus:ring-2 focus:ring-[#124874]/20"
                />
              </div>
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <Ruler className="h-3.5 w-3.5" />
                  Bán kính (km)
                </label>
                <input
                  type="number"
                  min={0.1}
                  step="0.5"
                  value={nearRadiusKm}
                  onChange={(event) => setNearRadiusKm(event.target.value)}
                  className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition-all focus:border-[#124874] focus:outline-none focus:ring-2 focus:ring-[#124874]/20"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  void loadNearbyStations()
                }}
                disabled={loadingNearby}
                className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-gradient-to-r from-[#124874] to-[#0f3a5a] px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#124874] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
              >
                <Search className="h-4 w-4" />
                {loadingNearby ? 'Đang tìm...' : 'Tìm trạm gần đây'}
              </button>
            </div>
            {nearbyError ? (
              <div className="mb-2 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 border border-red-200">
                <AlertTriangle className="h-4 w-4" />
                <span>{nearbyError}</span>
              </div>
            ) : null}
            {loadingNearby && nearbyStations.length === 0 ? (
              <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Đang tìm trạm gần vị trí này...</span>
              </div>
            ) : null}
            {!loadingNearby && nearbyStations.length === 0 ? (
              <p className="text-sm font-medium text-slate-600">
                Nhập toạ độ và bấm &quot;Tìm trạm gần đây&quot; để xem các trạm sạc trên bản đồ bên dưới.
              </p>
            ) : null}
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border-2 border-slate-200 bg-white shadow-md">
            <MiniStationsMap stations={nearbyStations} onSelectStation={handleSelectStation} />
          </div>

          {selectedStationId ? (
            <div className="mt-4 rounded-2xl border border-[#124874]/15 bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6 shadow-xl">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#124874]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#124874]">
                    <Map className="h-3.5 w-3.5" />
                    Trạm được chọn
                  </div>
                  <h3 className="mt-3 text-xl font-bold text-slate-900">
                    {displayStation?.name ?? 'Đang tải thông tin trạm...'}
                  </h3>
                  <p className="mt-2 inline-flex items-center gap-2 rounded-md bg-[#124874]/10 px-3 py-1 text-xs font-semibold text-[#124874]">
                    <Plug className="h-3.5 w-3.5" />
                    <span>{selectedStationId}</span>
                  </p>
                  {locationSummary ? (
                    <p className="mt-3 flex items-center gap-2 text-sm font-medium text-slate-600">
                      <MapPin className="h-4 w-4 text-[#cf373d]" />
                      <span>{locationSummary}</span>
                    </p>
                  ) : null}
                  {totalCapacityValue != null ? (
                    <p className="mt-2 text-xs font-semibold text-slate-500">
                      Công suất thiết kế: {totalCapacityValue.toLocaleString('vi-VN')} kW
                    </p>
                  ) : null}
                </div>
                {(loadingStationDetails || loadingStationRealtime) && (
                  <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#124874]/10 to-[#0f3a5a]/10 px-4 py-1.5 text-xs font-semibold text-[#124874]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Đang tải...</span>
                  </div>
                )}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-500/15 via-blue-400/10 to-blue-500/5 p-4 text-blue-800 shadow-sm">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide">
                    <CheckCircle2 className="h-3 w-3" />
                    Trạng thái
                  </div>
                  <div className="mt-3 text-lg font-bold text-blue-900">{statusText}</div>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-500/15 via-emerald-400/10 to-emerald-500/5 p-4 text-emerald-800 shadow-sm">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide">
                    <Plug className="h-3 w-3" />
                    Chỗ trống
                  </div>
                  <div className="mt-3 text-lg font-bold text-emerald-900">
                    {availableCapacityValue != null
                      ? availableCapacityValue.toLocaleString('vi-VN')
                      : 'Không rõ'}
                  </div>
                </div>
                <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-500/20 via-amber-400/10 to-amber-500/5 p-4 text-amber-800 shadow-sm">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide">
                    <Zap className="h-3 w-3" />
                    Công suất tức thời (kW)
                  </div>
                  <div className="mt-3 text-lg font-bold text-amber-900">
                    {instantaneousPowerValue != null
                      ? instantaneousPowerValue.toLocaleString('vi-VN', {
                          maximumFractionDigits: 1,
                        })
                      : 'Không rõ'}
                  </div>
                </div>
                <div className="rounded-xl border border-orange-200 bg-gradient-to-br from-orange-500/20 via-orange-400/10 to-orange-500/5 p-4 text-orange-800 shadow-sm">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide">
                    <Car className="h-3 w-3" />
                    Xe đang chờ
                  </div>
                  <div className="mt-3 text-lg font-bold text-orange-900">
                    {queueLengthValue != null
                      ? queueLengthValue.toLocaleString('vi-VN')
                      : 'Không rõ'}
                  </div>
                </div>
              </div>

              {stationAnalytics ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-500/15 via-indigo-400/10 to-indigo-500/5 p-4 text-indigo-800 shadow-sm">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide">
                      <BarChart3 className="h-3 w-3" />
                      Tổng số phiên
                    </div>
                    <div className="mt-3 text-lg font-bold text-indigo-900">
                      {totalSessionsValue != null
                        ? totalSessionsValue.toLocaleString('vi-VN')
                        : 'Không rõ'}
                    </div>
                  </div>
                  <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-500/15 via-purple-400/10 to-purple-500/5 p-4 text-purple-800 shadow-sm">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide">
                      <Zap className="h-3 w-3" />
                      Tổng năng lượng (kWh)
                    </div>
                    <div className="mt-3 text-lg font-bold text-purple-900">
                      {totalEnergyValue != null
                        ? totalEnergyValue.toLocaleString('vi-VN', { maximumFractionDigits: 1 })
                        : 'Không rõ'}
                    </div>
                  </div>
                  <div className="rounded-xl border border-rose-200 bg-gradient-to-br from-rose-500/20 via-rose-400/10 to-rose-500/5 p-4 text-rose-800 shadow-sm">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide">
                      <DollarSign className="h-3 w-3" />
                      Doanh thu (VND)
                    </div>
                    <div className="mt-3 text-lg font-bold text-rose-900">
                      {totalAmountValue != null
                        ? totalAmountValue.toLocaleString('vi-VN')
                        : 'Không rõ'}
                    </div>
                  </div>
                </div>
              ) : loadingStationAnalytics ? (
                <div className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Đang tải thống kê cho trạm...</span>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {section === 'stations' ? (
        <section className="rounded-2xl border border-slate-200/50 bg-white/80 backdrop-blur-sm p-6 shadow-lg">
          <div className="mb-4 flex items-center gap-2">
            <Plug className="h-6 w-6 text-[#124874]" />
            <h2 className="text-xl font-bold text-slate-900">Trạm sạc</h2>
          </div>
          <StationFilters
            status={statusFilter}
            vehicleType={vehicleTypeFilter}
            minAvailable={minAvailableFilter}
            network={networkFilter}
            chargeType={chargeTypeFilter}
            socketType={socketTypeFilter}
            paymentMethod={paymentMethodFilter}
            minCapacity={minCapacityFilter}
            maxCapacity={maxCapacityFilter}
            onStatusChange={setStatusFilter}
            onVehicleTypeChange={setVehicleTypeFilter}
            onMinAvailableChange={setMinAvailableFilter}
            onNetworkChange={setNetworkFilter}
            onChargeTypeChange={setChargeTypeFilter}
            onSocketTypeChange={setSocketTypeFilter}
            onPaymentMethodChange={setPaymentMethodFilter}
            onMinCapacityChange={setMinCapacityFilter}
            onMaxCapacityChange={setMaxCapacityFilter}
            onApplyFilters={handleApplyFilters}
          />
          <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
            <div>
              <div className="mb-3 flex items-center justify-between text-xs font-medium text-slate-600">
                <span>
                  Hiển thị {stations.length === 0 ? 0 : pageStartIndex + 1}–
                  {Math.min(pageStartIndex + paginatedStations.length, stations.length)} / {stations.length}
                </span>
                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setStationPage((prev) => Math.max(1, prev - 1))}
                    disabled={stationPage === 1}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 hover:border-[#124874]/40 hover:text-[#124874]"
                  >
                    Trang trước
                  </button>
                  <span className="px-2 py-1">{stationPage} / {totalStationPages}</span>
                  <button
                    type="button"
                    onClick={() => setStationPage((prev) => Math.min(totalStationPages, prev + 1))}
                    disabled={stationPage >= totalStationPages}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 hover:border-[#124874]/40 hover:text-[#124874]"
                  >
                    Trang sau
                  </button>
                </div>
              </div>
              <StationList
                stations={paginatedStations}
                selectedStationId={selectedStationId}
                loading={loadingStations}
                onSelectStation={handleSelectStation}
              />
            </div>
            <div>
              <StationDetails
                station={displayStation}
                realtime={stationRealtime}
                loadingRealtime={loadingStationRealtime}
                analytics={stationAnalytics}
                loadingAnalytics={loadingStationAnalytics}
                sessions={stationSessions}
                loadingSessions={loadingSessions}
                onReloadAnalytics={() => {
                  if (selectedStationId) {
                    void loadStationDetails(selectedStationId)
                    void loadStationRealtime(selectedStationId)
                    void loadStationAnalytics(selectedStationId)
                    void loadStationSessions(selectedStationId)
                  }
                }}
              />
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}
