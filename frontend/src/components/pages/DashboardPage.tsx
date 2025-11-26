/* SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
 * This file is part of ev-charging-app and is licensed under the
 * MIT License. See the LICENSE file in the project root for details.
 */

import { useEffect, useRef, useState } from 'react'
import maplibregl, { Map as MapLibreMap, Marker, Popup } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Station, AnalyticsOverview, StationAnalytics, Session } from '../../types/ev'
import { MAP_STYLE } from '../../mapConfig'
import { AnalyticsOverviewPanel } from '../analytics/AnalyticsOverviewPanel'
import { StationFilters } from '../stations/StationFilters'
import { StationList } from '../stations/StationList'
import { StationDetails } from '../stations/StationDetails'

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

  const [loadingOverview, setLoadingOverview] = useState(false)
  const [loadingStations, setLoadingStations] = useState(false)
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
    void loadStationAnalytics(stationId)
    void loadStationSessions(stationId)
  }

  const selectedStation =
    selectedStationId != null
      ? stations.find((station) => station.id === selectedStationId) ?? null
      : null

  return (
    <div className="flex flex-col gap-4">
      {section === 'overview' ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <AnalyticsOverviewPanel overview={overview} loading={loadingOverview} />
        </section>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      ) : null}

      {section === 'realtime' ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-slate-900">
            Phiên sạc realtime gần đây
          </h2>
          {recentSessions.length === 0 ? (
            <p className="text-base text-slate-500">
              Chưa có phiên sạc realtime nào trong phiên làm việc này.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border-b border-slate-200 px-2 py-1 text-left font-medium text-slate-600">
                      Thời gian bắt đầu
                    </th>
                    <th className="border-b border-slate-200 px-2 py-1 text-left font-medium text-slate-600">
                      Trạm
                    </th>
                    <th className="border-b border-slate-200 px-2 py-1 text-left font-medium text-slate-600">
                      Loại phương tiện
                    </th>
                    <th className="border-b border-slate-200 px-2 py-1 text-right font-medium text-slate-600">
                      kWh
                    </th>
                    <th className="border-b border-slate-200 px-2 py-1 text-right font-medium text-slate-600">
                      Doanh thu (VND)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentSessions.map((item) => (
                    <tr
                      key={item.session_id ?? `${item.station_id}-${item.start_date_time}`}
                    >
                      <td className="border-b border-slate-100 px-2 py-1 text-slate-700">
                        {formatDateTime(item.start_date_time)}
                      </td>
                      <td className="border-b border-slate-100 px-2 py-1 text-slate-700">
                        {item.station_id ?? '-'}
                      </td>
                      <td className="border-b border-slate-100 px-2 py-1 text-slate-700">
                        {item.vehicle_type ?? '-'}
                      </td>
                      <td className="border-b border-slate-100 px-2 py-1 text-right text-slate-700">
                        {item.power_consumption_kwh != null
                          ? item.power_consumption_kwh.toLocaleString('vi-VN', {
                              maximumFractionDigits: 1,
                            })
                          : '-'}
                      </td>
                      <td className="border-b border-slate-100 px-2 py-1 text-right text-slate-700">
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
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-slate-900">
            Bản đồ trạm sạc &amp; tìm gần toạ độ
          </h2>
          <div className="mb-2 flex flex-wrap items-end gap-3 text-base">
          <div>
            <label className="mb-0.5 block text-sm font-medium text-slate-600">
              Vĩ độ (lat)
            </label>
            <input
              type="number"
              step="0.0001"
              value={nearLat}
              onChange={(event) => setNearLat(event.target.value)}
              className="w-28 rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="mb-0.5 block text-sm font-medium text-slate-600">
              Kinh độ (lng)
            </label>
            <input
              type="number"
              step="0.0001"
              value={nearLng}
              onChange={(event) => setNearLng(event.target.value)}
              className="w-28 rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="mb-0.5 block text-sm font-medium text-slate-600">
              Bán kính (km)
            </label>
            <input
              type="number"
              min={0.1}
              step="0.5"
              value={nearRadiusKm}
              onChange={(event) => setNearRadiusKm(event.target.value)}
              className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              void loadNearbyStations()
            }}
            disabled={loadingNearby}
            className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingNearby ? 'Đang tìm...' : 'Tìm trạm gần đây'}
          </button>
        </div>
        {nearbyError ? (
          <p className="mb-1 text-sm text-red-600">{nearbyError}</p>
        ) : null}
        {loadingNearby && nearbyStations.length === 0 ? (
          <p className="text-sm text-slate-500">Đang tìm trạm gần vị trí này...</p>
        ) : null}
        {!loadingNearby && nearbyStations.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nhập toạ độ và bấm &quot;Tìm trạm gần đây&quot; để xem các trạm sạc trên bản đồ bên dưới.
          </p>
        ) : null}

        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <MiniStationsMap stations={nearbyStations} onSelectStation={handleSelectStation} />
        </div>
        </section>
      ) : null}

      {section === 'stations' ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-slate-900">Trạm sạc</h2>
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
              <StationList
                stations={stations}
                selectedStationId={selectedStationId}
                loading={loadingStations}
                onSelectStation={handleSelectStation}
              />
            </div>
            <div>
              <StationDetails
                station={selectedStation}
                analytics={stationAnalytics}
                loadingAnalytics={loadingStationAnalytics}
                sessions={stationSessions}
                loadingSessions={loadingSessions}
                onReloadAnalytics={() => {
                  if (selectedStationId) {
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
