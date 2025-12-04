/* SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
 * This file is part of ev-charging-app and is licensed under the
 * MIT License. See the LICENSE file in the project root for details.
 */

import { useState, useEffect, useRef } from 'react'
import maplibregl, { Map as MapLibreMap, Marker, Popup } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MAP_STYLE } from '../../mapConfig'
import {
  Navigation,
  MapPin,
  Loader2,
  AlertTriangle,
  Clock,
  Ruler,
  Search,
  X,
  ChevronRight,
} from 'lucide-react'

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000'

type RouteInfo = {
  from: { lat: number; lng: number }
  to: { lat: number; lng: number; station_id: string; station_name: string }
  distance_km: number
  estimated_time_minutes: number
  route_coordinates: number[][]
  osrm_used?: boolean
}

export function RoutePlanningPage() {
  const [fromLat, setFromLat] = useState('10.7769')
  const [fromLng, setFromLng] = useState('106.7009')
  const [toStationId, setToStationId] = useState('')
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markersRef = useRef<Marker[]>([])
  const routeLineRef = useRef<any>(null)

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude
          const lng = position.coords.longitude
          setCurrentLocation([lng, lat])
          setFromLat(String(lat))
          setFromLng(String(lng))
        },
        () => {},
      )
    }
  }, [])

  useEffect(() => {
    if (!routeInfo || !mapRef.current) return

    // Clear existing markers and route
    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []
    if (routeLineRef.current && mapRef.current.getLayer('route')) {
      mapRef.current.removeLayer('route')
      mapRef.current.removeSource('route')
    }

    // Add from marker
    const fromMarker = new maplibregl.Marker({ color: '#3b82f6' })
      .setLngLat([routeInfo.from.lng, routeInfo.from.lat])
      .setPopup(new Popup().setText('Điểm xuất phát'))
      .addTo(mapRef.current)
    markersRef.current.push(fromMarker)

    // Add to marker
    const toMarker = new maplibregl.Marker({ color: '#CF373D' })
      .setLngLat([routeInfo.to.lng, routeInfo.to.lat])
      .setPopup(new Popup().setText(routeInfo.to.station_name))
      .addTo(mapRef.current)
    markersRef.current.push(toMarker)

    // Add route line
    mapRef.current.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: routeInfo.route_coordinates,
        },
      },
    })

    mapRef.current.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#CF373D',
        'line-width': 4,
      },
    })

    routeLineRef.current = true

    // Fit bounds
    const bounds = new maplibregl.LngLatBounds()
    routeInfo.route_coordinates.forEach((coord) => {
      bounds.extend(coord as [number, number])
    })
    mapRef.current.fitBounds(bounds, { padding: 50 })
  }, [routeInfo])

  useEffect(() => {
    if (!mapContainerRef.current) return

    if (!mapRef.current) {
      mapRef.current = new maplibregl.Map({
        container: mapContainerRef.current,
        style: MAP_STYLE,
        center: [106.7009, 10.7769],
        zoom: 13,
      })
    }

    return () => {
      markersRef.current.forEach((marker) => marker.remove())
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  async function handleFindRoute() {
    if (!toStationId.trim()) {
      setError('Vui lòng nhập ID trạm đích.')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const lat = Number(fromLat)
      const lng = Number(fromLng)

      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        setError('Tọa độ xuất phát không hợp lệ.')
        return
      }

      const params = new URLSearchParams()
      params.append('from_lat', String(lat))
      params.append('from_lng', String(lng))
      params.append('to_station_id', toStationId)

      const res = await fetch(`${API_BASE_URL}/citizen/route?${params.toString()}`)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const data = (await res.json()) as RouteInfo
      setRouteInfo(data)
    } catch (e) {
      console.error(e)
      const errorMessage = e instanceof Error && (e.message.includes('Failed to fetch') || e.message.includes('NetworkError'))
        ? 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng của bạn.'
        : 'Không thể tìm đường. Vui lòng kiểm tra lại thông tin.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar */}
      <div
        className={`relative flex flex-col border-r border-slate-200 bg-white transition-all duration-300 ${
          sidebarOpen ? 'w-[420px]' : 'w-0'
        } overflow-hidden`}
      >
        {sidebarOpen && (
          <div className="flex h-full flex-col overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Navigation className="h-5 w-5 text-[#CF373D]" />
                  <h3 className="text-base font-bold text-slate-900">Tìm đường</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Form */}
            <div className="p-4 space-y-4">
              <div className="rounded-xl bg-white p-4 border border-slate-200/50">
                <label className="mb-3 block text-sm font-semibold text-slate-700">
                  Điểm xuất phát
                </label>
                <div className="space-y-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                      <MapPin className="inline h-3.5 w-3.5 mr-1" />
                      Vĩ độ
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={fromLat}
                      onChange={(e) => setFromLat(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#CF373D] focus:ring-2 focus:ring-[#CF373D]/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                      <MapPin className="inline h-3.5 w-3.5 mr-1" />
                      Kinh độ
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={fromLng}
                      onChange={(e) => setFromLng(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#CF373D] focus:ring-2 focus:ring-[#CF373D]/20"
                    />
                  </div>
                  {currentLocation && (
                    <button
                      type="button"
                      onClick={() => {
                        setFromLat(String(currentLocation[1]))
                        setFromLng(String(currentLocation[0]))
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                    >
                      <Navigation className="h-3.5 w-3.5" />
                      Dùng vị trí hiện tại
                    </button>
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-white p-4 border border-slate-200/50">
                <label className="mb-3 block text-sm font-semibold text-slate-700">
                  Trạm đích
                </label>
                <input
                  type="text"
                  value={toStationId}
                  onChange={(e) => setToStationId(e.target.value)}
                  placeholder="Nhập ID trạm"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#CF373D] focus:ring-2 focus:ring-[#CF373D]/20"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Tìm ID trạm từ trang &quot;Tìm trạm&quot;
                </p>
              </div>

              <button
                type="button"
                onClick={() => void handleFindRoute()}
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#CF373D] to-[#b82e33] px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang tìm...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Tìm đường
                  </>
                )}
              </button>

              {error ? (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 border border-red-200">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>{error}</span>
                </div>
              ) : null}

              {routeInfo && (
                <div className="space-y-3">
                  <div className="rounded-xl bg-emerald-50 p-4 border border-emerald-200">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Ruler className="h-5 w-5 text-emerald-700" />
                        <div>
                          <div className="text-xs font-semibold text-emerald-700">Khoảng cách</div>
                          <div className="text-lg font-bold text-emerald-900">
                            {routeInfo.distance_km.toFixed(1)} km
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-emerald-700" />
                        <div>
                          <div className="text-xs font-semibold text-emerald-700">Thời gian ước tính</div>
                          <div className="text-lg font-bold text-emerald-900">
                            {Math.round(routeInfo.estimated_time_minutes)} phút
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-emerald-700" />
                        <div>
                          <div className="text-xs font-semibold text-emerald-700">Điểm đến</div>
                          <div className="text-sm font-bold text-emerald-900">
                            {routeInfo.to.station_name}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {routeInfo.osrm_used !== undefined && (
                    <div
                      className={`rounded-lg px-3 py-2 text-xs font-medium ${
                        routeInfo.osrm_used
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {routeInfo.osrm_used
                        ? 'Tuyến đường được tính bằng OSRM (tuyến đường thực tế)'
                        : 'Sử dụng khoảng cách đường thẳng (OSRM không khả dụng)'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Map Area */}
      <div className="relative flex-1">
        {!sidebarOpen && (
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="absolute left-4 top-4 z-10 rounded-lg bg-white p-2 shadow-lg hover:bg-slate-50"
          >
            <ChevronRight className="h-5 w-5 text-slate-700" />
          </button>
        )}
        <div ref={mapContainerRef} className="h-full w-full" />
      </div>
    </div>
  )
}
