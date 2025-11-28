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
      setError('Không thể tìm đường. Vui lòng kiểm tra lại thông tin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200/50 bg-gradient-to-br from-white to-slate-50/50 p-6 shadow-lg">
        <div className="mb-4 flex items-center gap-2">
          <Navigation className="h-6 w-6 text-[#CF373D]" />
          <h3 className="text-lg font-bold text-slate-900">Tìm đường đến trạm</h3>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-white p-4 border border-slate-200/50">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Điểm xuất phát
              </label>
              <div className="space-y-2">
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                    <MapPin className="h-3.5 w-3.5" />
                    Vĩ độ
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={fromLat}
                    onChange={(e) => setFromLat(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-[#CF373D] focus:outline-none focus:ring-2 focus:ring-[#CF373D]/20"
                  />
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                    <MapPin className="h-3.5 w-3.5" />
                    Kinh độ
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={fromLng}
                    onChange={(e) => setFromLng(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-[#CF373D] focus:outline-none focus:ring-2 focus:ring-[#CF373D]/20"
                  />
                </div>
                {currentLocation && (
                  <button
                    type="button"
                    onClick={() => {
                      setFromLat(String(currentLocation[1]))
                      setFromLng(String(currentLocation[0]))
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition-all hover:bg-blue-100"
                  >
                    <Navigation className="h-4 w-4" />
                    Dùng vị trí hiện tại
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-xl bg-white p-4 border border-slate-200/50">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Trạm đích
              </label>
              <input
                type="text"
                value={toStationId}
                onChange={(e) => setToStationId(e.target.value)}
                placeholder="Nhập ID trạm (VD: urn:ngsi-ld:EVChargingStation:001)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-[#CF373D] focus:outline-none focus:ring-2 focus:ring-[#CF373D]/20"
              />
              <p className="mt-2 text-xs text-slate-500">
                Bạn có thể tìm ID trạm từ trang &quot;Tìm trạm&quot;
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleFindRoute()}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-transparent bg-gradient-to-r from-[#CF373D] to-[#b82e33] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#CF373D] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang tìm đường...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Tìm đường
              </>
            )}
          </button>

          {error ? (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 border border-red-200">
              <AlertTriangle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          ) : null}

          {routeInfo && (
            <div className="space-y-3">
              <div className="rounded-xl bg-emerald-50 p-4 border border-emerald-200">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="flex items-center gap-3">
                    <Ruler className="h-5 w-5 text-emerald-700" />
                    <div>
                      <div className="text-xs font-semibold text-emerald-700">Khoảng cách</div>
                      <div className="text-lg font-bold text-emerald-900">
                        {routeInfo.distance_km} km
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
                  {routeInfo.osrm_used ? (
                    <span>
                      Tuyến đường được tính bằng OSRM (tuyến đường thực tế trên bản đồ)
                    </span>
                  ) : (
                    <span>
                      Sử dụng khoảng cách đường thẳng (OSRM không khả dụng)
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border-2 border-slate-200 bg-white shadow-md">
        <div ref={mapContainerRef} className="h-[600px] w-full" />
      </div>
    </div>
  )
}

