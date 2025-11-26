/* SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
 * This file is part of ev-charging-app and is licensed under the
 * MIT License. See the LICENSE file in the project root for details.
 */

import { useState } from 'react'
import maplibregl, { Map as MapLibreMap, Marker, Popup } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Station } from '../../types/ev'
import { MAP_STYLE } from '../../mapConfig'
import { useEffect, useRef } from 'react'

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000'

const DEFAULT_CENTER: [number, number] = [106.7009, 10.7769]

type MiniStationsMapProps = {
  stations: Station[]
}

function MiniStationsMap({ stations }: MiniStationsMapProps) {
  const coords = stations
    .map((station) => station.location?.coordinates)
    .filter((value): value is number[] => Array.isArray(value) && value.length === 2)

  const hasCoords = coords.length > 0

  const lons = hasCoords ? coords.map(([lon]) => lon) : []
  const lats = hasCoords ? coords.map(([, lat]) => lat) : []
  const avgLon = hasCoords ? lons.reduce((sum, value) => sum + value, 0) / lons.length : 0
  const avgLat = hasCoords ? lats.reduce((sum, value) => sum + value, 0) / lats.length : 0

  const centerLon = hasCoords ? avgLon : DEFAULT_CENTER[0]
  const centerLat = hasCoords ? avgLat : DEFAULT_CENTER[1]

  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markersRef = useRef<Marker[]>([])
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
      mapRef.current.setCenter([centerLon, centerLat])
    }

    markersRef.current.forEach((marker) => {
      marker.remove()
    })
    markersRef.current = []

    if (!hasCoords || !mapRef.current) {
      return
    }

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
      const marker = new maplibregl.Marker({ color: '#CF373D' })
        .setLngLat([lon, lat])
        .setPopup(new Popup({ offset: 12 }).setText(station.name))

      marker.addTo(mapInstance)
      markersRef.current.push(marker)
    })
  }, [centerLon, centerLat, hasCoords, stationsKey, stations])

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

  return <div ref={mapContainerRef} className="h-96 w-full" />
}

export function CitizenPage() {
  const [nearLat, setNearLat] = useState('10.7769')
  const [nearLng, setNearLng] = useState('106.7009')
  const [nearRadiusKm, setNearRadiusKm] = useState('5')
  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSearch() {
    try {
      setLoading(true)
      setError(null)

      const lat = Number(nearLat)
      const lng = Number(nearLng)
      const radius = Number(nearRadiusKm)

      if (Number.isNaN(lat) || Number.isNaN(lng) || Number.isNaN(radius) || radius <= 0) {
        setError('Toạ độ hoặc bán kính không hợp lệ.')
        setStations([])
        return
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
      setStations(data)

      if (data.length === 0) {
        setError('Không tìm được trạm phù hợp với toạ độ / bán kính đã nhập.')
      }
    } catch (e) {
      setError('Không thể tải dữ liệu trạm sạc. Vui lòng thử lại.')
      setStations([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="space-y-3 text-base">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-0.5 block text-sm font-medium text-slate-600">
                Vĩ độ (lat)
              </label>
              <input
                type="number"
                step="0.0001"
                value={nearLat}
                onChange={(event) => setNearLat(event.target.value)}
                className="w-28 rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900 shadow-sm focus:border-[#124874] focus:outline-none focus:ring-1 focus:ring-[#124874]"
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
                className="w-28 rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900 shadow-sm focus:border-[#124874] focus:outline-none focus:ring-1 focus:ring-[#124874]"
              />
            </div>
            <div>
              <label className="mb-0.5 block text-sm font-medium text-slate-600">
                Bán kính (km)
              </label>
              <input
                type="number"
                min={0.1}
                step={0.5}
                value={nearRadiusKm}
                onChange={(event) => setNearRadiusKm(event.target.value)}
                className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900 shadow-sm focus:border-[#124874] focus:outline-none focus:ring-1 focus:ring-[#124874]"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                void handleSearch()
              }}
              disabled={loading}
              className="inline-flex items-center rounded-md border border-transparent bg-[#124874] px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-[#0f3a5a] focus:outline-none focus:ring-2 focus:ring-[#CF373D] focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Đang tìm...' : 'Tìm trạm gần đây'}
            </button>
          </div>

          {error ? <p className="text-sm text-[#CF373D]">{error}</p> : null}

          {!error && stations.length === 0 && !loading ? (
            <p className="text-sm text-slate-500">
              Nhập toạ độ và bấm "Tìm trạm gần đây" để xem các trạm sạc gần vị trí của bạn.
            </p>
          ) : null}

          {stations.length > 0 ? (
            <p className="text-sm text-slate-600">
              Tìm thấy {stations.length} trạm phù hợp. Điểm màu đỏ trên bản đồ là các trạm sạc.
            </p>
          ) : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <MiniStationsMap stations={stations} />
      </div>
    </div>
  )
}
