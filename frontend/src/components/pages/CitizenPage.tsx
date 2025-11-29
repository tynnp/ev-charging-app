/* SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
 * This file is part of ev-charging-app and is licensed under the
 * MIT License. See the LICENSE file in the project root for details.
 */

import { useState, useEffect, useRef } from 'react'
import maplibregl, { Map as MapLibreMap, Marker, Popup } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Station } from '../../types/ev'
import { StationFilters } from '../stations/StationFilters'
import { CitizenStationCard } from '../citizen/CitizenStationCard'
import { CitizenStationModal } from '../citizen/CitizenStationModal'
import { StationsMap } from '../citizen/StationsMap'
import { MAP_STYLE } from '../../mapConfig'
import {
  Search,
  MapPin,
  Ruler,
  AlertTriangle,
  Lightbulb,
  Navigation,
  ArrowUpDown,
  Clock,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { API_BASE_URL, USER_ID } from '../../config.ts'

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371 // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}


type SortOption = 'distance' | 'status' | 'available' | 'capacity'

export function CitizenPage() {
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null)
  const [nearLat, setNearLat] = useState('10.7769')
  const [nearLng, setNearLng] = useState('106.7009')
  const [nearRadiusKm, setNearRadiusKm] = useState('5')
  const [stations, setStations] = useState<Station[]>([])
  const [filteredStations, setFilteredStations] = useState<Station[]>([])
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchMode, setSearchMode] = useState<'nearby' | 'advanced'>('nearby')
  const [sortBy, setSortBy] = useState<SortOption>('distance')
  const [favoritedStations, setFavoritedStations] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'search' | 'results' | 'route'>('search')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedCoordinate, setSelectedCoordinate] = useState<[number, number] | null>(null)

  // Route planning states
  const [fromLat, setFromLat] = useState('10.7769')
  const [fromLng, setFromLng] = useState('106.7009')
  const [toStationId, setToStationId] = useState('')
  const [selectedRouteStation, setSelectedRouteStation] = useState<Station | null>(null)
  const [routeInfo, setRouteInfo] = useState<{
    from: { lat: number; lng: number }
    to: { lat: number; lng: number; station_id: string; station_name: string }
    distance_km: number
    estimated_time_minutes: number
    route_coordinates: number[][]
    osrm_used?: boolean
  } | null>(null)
  const [loadingRoute, setLoadingRoute] = useState(false)
  const [routeError, setRouteError] = useState<string | null>(null)

  // Map refs for route
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const routeMarkersRef = useRef<Marker[]>([])
  const routeLineRef = useRef<any>(null)

  // Filter states
  const [statusFilter, setStatusFilter] = useState('')
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('')
  const [minAvailableFilter, setMinAvailableFilter] = useState('')
  const [networkFilter, setNetworkFilter] = useState('')
  const [chargeTypeFilter, setChargeTypeFilter] = useState('')
  const [socketTypeFilter, setSocketTypeFilter] = useState('')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('')
  const [minCapacityFilter, setMinCapacityFilter] = useState('')
  const [maxCapacityFilter, setMaxCapacityFilter] = useState('')

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude
          const lng = position.coords.longitude
          setCurrentLocation([lng, lat])
          setNearLat(String(lat))
          setNearLng(String(lng))
          setFromLat(String(lat))
          setFromLng(String(lng))
          setSelectedCoordinate([lng, lat])
        },
        (error) => {
          console.error('Error getting location:', error)
        },
      )
    }
  }, [])

  // Load favorites on mount
  useEffect(() => {
    async function loadFavorites() {
      try {
        const res = await fetch(`${API_BASE_URL}/citizen/favorites?user_id=${USER_ID}`)
        if (res.ok) {
          const favorites = (await res.json()) as Station[]
          setFavoritedStations(new Set(favorites.map((s) => s.id)))
        }
      } catch (error) {
        console.error('Error loading favorites:', error)
      }
    }
    void loadFavorites()
  }, [])

  async function handleToggleFavorite(stationId: string, favorited: boolean) {
    try {
      if (favorited) {
        await fetch(
          `${API_BASE_URL}/citizen/favorites?user_id=${USER_ID}&station_id=${encodeURIComponent(stationId)}`,
          { method: 'POST' },
        )
        setFavoritedStations((prev) => new Set(prev).add(stationId))
      } else {
        await fetch(
          `${API_BASE_URL}/citizen/favorites?user_id=${USER_ID}&station_id=${encodeURIComponent(stationId)}`,
          { method: 'DELETE' },
        )
        setFavoritedStations((prev) => {
          const next = new Set(prev)
          next.delete(stationId)
          return next
        })
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  // Calculate distances and sort
  useEffect(() => {
    if (stations.length === 0) {
      setFilteredStations([])
        return
      }

    let result = [...stations]

    // Calculate distances
    const stationsWithDistance = result.map((station) => {
      const coordinates = station.location?.coordinates
      if (
        currentLocation &&
        Array.isArray(coordinates) &&
        coordinates.length === 2
      ) {
        const distance = haversineDistance(
          currentLocation[1],
          currentLocation[0],
          coordinates[1],
          coordinates[0],
        )
        return { station, distance }
      }
      return { station, distance: null }
    })

    // Sort
    stationsWithDistance.sort((a, b) => {
      if (sortBy === 'distance') {
        if (a.distance == null && b.distance == null) return 0
        if (a.distance == null) return 1
        if (b.distance == null) return -1
        return a.distance - b.distance
      } else if (sortBy === 'status') {
        const statusOrder = { operational: 0, maintenance: 1, outOfService: 2 }
        const aOrder = statusOrder[a.station.status as keyof typeof statusOrder] ?? 3
        const bOrder = statusOrder[b.station.status as keyof typeof statusOrder] ?? 3
        return aOrder - bOrder
      } else if (sortBy === 'available') {
        const aAvail = a.station.available_capacity ?? 0
        const bAvail = b.station.available_capacity ?? 0
        return bAvail - aAvail
      } else if (sortBy === 'capacity') {
        const aCap = a.station.capacity ?? 0
        const bCap = b.station.capacity ?? 0
        return bCap - aCap
      }
      return 0
    })

    setFilteredStations(stationsWithDistance.map((item) => item.station))
  }, [stations, sortBy, currentLocation])

  function handleMapCoordinateSelect(lng: number, lat: number) {
    setNearLat(String(lat))
    setNearLng(String(lng))
    setSelectedCoordinate([lng, lat])
  }

  async function handleSearchNearby() {
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

      setSelectedCoordinate([lng, lat])

      if (data.length === 0) {
        setError('Không tìm được trạm phù hợp với toạ độ / bán kính đã nhập.')
      } else {
        setActiveTab('results')
      }
    } catch (e) {
      setError('Không thể tải dữ liệu trạm sạc. Vui lòng thử lại.')
      setStations([])
    } finally {
      setLoading(false)
    }
  }

  async function handleAdvancedSearch() {
    try {
      setLoading(true)
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
        setError('Không tìm được trạm phù hợp với bộ lọc.')
      } else {
        setActiveTab('results')
      }
    } catch (e) {
      setError('Không thể tải dữ liệu trạm sạc. Vui lòng thử lại.')
      setStations([])
    } finally {
      setLoading(false)
    }
  }

  function getStationDistance(station: Station): number | null {
    const coordinates = station.location?.coordinates
    if (
      currentLocation &&
      Array.isArray(coordinates) &&
      coordinates.length === 2
    ) {
      return haversineDistance(
        currentLocation[1],
        currentLocation[0],
        coordinates[1],
        coordinates[0],
      )
    }
    return null
  }

  // Handle route finding
  function handleSelectRouteStation(station: Station) {
    setSelectedRouteStation(station)
    setToStationId(station.id)
    setRouteError(null)
    setActiveTab('route')
  }

  async function handleFindRoute() {
    const targetStationId = selectedRouteStation?.id || toStationId.trim()
    if (!targetStationId) {
      setRouteError('Vui lòng chọn trạm đích từ danh sách trạm đã tìm.')
      return
    }

    try {
      setLoadingRoute(true)
      setRouteError(null)

      const lat = Number(fromLat)
      const lng = Number(fromLng)

      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        setRouteError('Tọa độ xuất phát không hợp lệ.')
        return
      }

      const params = new URLSearchParams()
      params.append('from_lat', String(lat))
      params.append('from_lng', String(lng))
      params.append('to_station_id', targetStationId)

      const res = await fetch(`${API_BASE_URL}/citizen/route?${params.toString()}`)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const data = (await res.json()) as typeof routeInfo
      setRouteInfo(data)
      if (!selectedRouteStation && filteredStations.length > 0) {
        const station = filteredStations.find((item) => item.id === targetStationId)
        if (station) {
          setSelectedRouteStation(station)
        }
      }
    } catch (e) {
      console.error(e)
      setRouteError('Không thể tìm đường. Vui lòng kiểm tra lại thông tin.')
    } finally {
      setLoadingRoute(false)
    }
  }

  // Handle route display on map
  useEffect(() => {
    if (!routeInfo || !mapRef.current || activeTab !== 'route') return

    // Clear existing markers and route
    routeMarkersRef.current.forEach((marker) => marker.remove())
    routeMarkersRef.current = []
    if (routeLineRef.current && mapRef.current.getLayer('route')) {
      mapRef.current.removeLayer('route')
      mapRef.current.removeSource('route')
    }

    // Add from marker
    const fromMarker = new maplibregl.Marker({ color: '#3b82f6' })
      .setLngLat([routeInfo.from.lng, routeInfo.from.lat])
      .setPopup(new Popup().setText('Điểm xuất phát'))
      .addTo(mapRef.current)
    routeMarkersRef.current.push(fromMarker)

    // Add to marker
    const toMarker = new maplibregl.Marker({ color: '#CF373D' })
      .setLngLat([routeInfo.to.lng, routeInfo.to.lat])
      .setPopup(new Popup().setText(routeInfo.to.station_name))
      .addTo(mapRef.current)
    routeMarkersRef.current.push(toMarker)

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
  }, [routeInfo, activeTab])

  // Initialize map for route
  useEffect(() => {
    if (!mapContainerRef.current || activeTab !== 'route') return

    if (!mapRef.current) {
      mapRef.current = new maplibregl.Map({
        container: mapContainerRef.current,
        style: MAP_STYLE,
        center: [106.7009, 10.7769],
        zoom: 13,
      })
    }

    return () => {
      routeMarkersRef.current.forEach((marker) => marker.remove())
      routeMarkersRef.current = []
      if (mapRef.current && mapRef.current.getLayer('route')) {
        mapRef.current.removeLayer('route')
        mapRef.current.removeSource('route')
      }
    }
  }, [activeTab])

  return (
    <div className="relative flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left Panel: Tabs for Search, Results & Route */}
      <div
        className={`flex flex-col border-r border-slate-200 bg-white min-h-0 transition-all duration-300 ${
          sidebarOpen ? 'w-[60%]' : 'w-0'
        } overflow-hidden`}
      >
        {sidebarOpen && (
          <>
            {/* Header with Tabs */}
            <div className="flex-shrink-0 border-b border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-[#CF373D]" />
                  <h3 className="text-base font-bold text-slate-900">Tìm kiếm trạm</h3>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Results Count - Always visible */}
                  {stations.length > 0 && activeTab !== 'route' && (
                    <div className="rounded-lg bg-emerald-50 px-3 py-1.5 border border-emerald-200">
                      <span className="text-xs font-semibold text-emerald-800">
                        Tìm thấy {stations.length} trạm
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(false)}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('search')}
                  className={`flex-1 px-4 py-3 text-sm font-semibold transition-all border-b-2 ${
                    activeTab === 'search'
                      ? 'border-[#CF373D] text-[#CF373D] bg-slate-50/50'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50/30'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Search className="h-4 w-4" />
                    Tìm kiếm
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('results')}
                  className={`flex-1 px-4 py-3 text-sm font-semibold transition-all border-b-2 ${
                    activeTab === 'results'
                      ? 'border-[#CF373D] text-[#CF373D] bg-slate-50/50'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50/30'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Danh sách trạm
                    {filteredStations.length > 0 && (
                      <span className="rounded-full bg-[#CF373D] text-white text-xs px-1.5 py-0.5 min-w-[20px] text-center">
                        {filteredStations.length}
                      </span>
                    )}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('route')}
                  className={`flex-1 px-4 py-3 text-sm font-semibold transition-all border-b-2 ${
                    activeTab === 'route'
                      ? 'border-[#CF373D] text-[#CF373D] bg-slate-50/50'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50/30'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Navigation className="h-4 w-4" />
                    Tìm đường
                  </div>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {(error || routeError) && (
              <div className="flex-shrink-0 border-b border-slate-200 bg-red-50 px-4 py-3">
                <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 border border-red-200">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>{error || routeError}</span>
                </div>
              </div>
            )}

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {activeTab === 'search' && (
            <div className="p-4 bg-slate-50/30">
              {/* Search Mode Toggle */}
              <div className="mb-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSearchMode('nearby')}
                  className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                    searchMode === 'nearby'
                      ? 'bg-[#CF373D] text-white shadow-sm'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  Tìm gần đây
                </button>
                <button
                  type="button"
                  onClick={() => setSearchMode('advanced')}
                  className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                    searchMode === 'advanced'
                      ? 'bg-[#CF373D] text-white shadow-sm'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  Tìm kiếm nâng cao
                </button>
        </div>

            {/* Search Form */}
              {searchMode === 'nearby' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
              <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      <MapPin className="inline h-3.5 w-3.5 mr-1" />
                      Vĩ độ
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={nearLat}
                      onChange={(e) => setNearLat(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#CF373D] focus:ring-2 focus:ring-[#CF373D]/20"
                />
              </div>
              <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      <MapPin className="inline h-3.5 w-3.5 mr-1" />
                      Kinh độ
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={nearLng}
                      onChange={(e) => setNearLng(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#CF373D] focus:ring-2 focus:ring-[#CF373D]/20"
                />
                    </div>
              </div>
              <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      <Ruler className="inline h-3.5 w-3.5 mr-1" />
                  Bán kính (km)
                </label>
                <input
                  type="number"
                  min={0.1}
                  step={0.5}
                  value={nearRadiusKm}
                      onChange={(e) => setNearRadiusKm(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#CF373D] focus:ring-2 focus:ring-[#CF373D]/20"
                />
              </div>
                  {currentLocation && (
              <button
                type="button"
                onClick={() => {
                        setNearLat(String(currentLocation[1]))
                        setNearLng(String(currentLocation[0]))
                        setSelectedCoordinate(currentLocation)
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                      <Navigation className="h-4 w-4" />
                      Dùng vị trí hiện tại
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleSearchNearby()}
                disabled={loading}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#CF373D] to-[#b82e33] px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg disabled:opacity-60 transition-all"
              >
                <Search className="h-4 w-4" />
                    {loading ? 'Đang tìm...' : 'Tìm trạm'}
              </button>
            </div>
              ) : (
                <div>
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
                  onApplyFilters={() => void handleAdvancedSearch()}
                />
                </div>
              )}

              {/* Info Messages */}
              {!error && stations.length === 0 && !loading && (
                <div className="mt-4 rounded-lg bg-blue-50 p-3 border border-blue-200">
                  <p className="flex items-center gap-2 text-xs font-medium text-blue-800">
                    <Lightbulb className="h-3.5 w-3.5" />
                    {searchMode === 'nearby'
                      ? 'Nhập toạ độ và bấm "Tìm trạm" để xem các trạm sạc.'
                      : 'Sử dụng bộ lọc ở trên để tìm kiếm trạm sạc.'}
              </p>
            </div>
              )}
            </div>
              )}
              {activeTab === 'results' && (
            <div className="flex flex-col h-full min-h-0">
              {/* Results Tab Content */}
              {filteredStations.length > 0 ? (
                <>
                  <div className="flex-shrink-0 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900">
                      Danh sách ({filteredStations.length})
                    </h4>
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" />
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortOption)}
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium focus:border-[#CF373D] focus:ring-1 focus:ring-[#CF373D]/20"
                      >
                        <option value="distance">Khoảng cách</option>
                        <option value="status">Trạng thái</option>
                        <option value="available">Chỗ trống</option>
                        <option value="capacity">Công suất</option>
                      </select>
                    </div>
                  </div>
                </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 bg-slate-50/50">
                  {filteredStations.map((station) => (
                      <div key={station.id} className="space-y-2 transition-all hover:scale-[1.01]">
                      <CitizenStationCard
                        station={station}
                        distanceKm={getStationDistance(station)}
                        onSelect={setSelectedStation}
                        isFavorited={favoritedStations.has(station.id)}
                        onToggleFavorite={handleToggleFavorite}
                      />
                        <button
                          type="button"
                          onClick={() => handleSelectRouteStation(station)}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:border-[#CF373D] hover:text-[#CF373D]"
                        >
                          <Navigation className="h-3.5 w-3.5" />
                          Tìm đường tới trạm này
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-slate-50/50">
                  <div className="text-center p-6">
                    <Search className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-500">
                      {loading ? 'Đang tìm kiếm...' : 'Chưa có kết quả tìm kiếm'}
                    </p>
                  </div>
                </div>
              )}
            </div>
              )}
              {activeTab === 'route' && (
            <div className="p-4 bg-slate-50/30">
              <div className="space-y-4">
                <div className="rounded-xl bg-white p-4 border border-slate-200/50">
                  <label className="mb-3 block text-sm font-semibold text-slate-700">
                    Điểm xuất phát
                  </label>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-3">
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
                    </div>
                    {currentLocation && (
                      <button
                        type="button"
                        onClick={() => {
                          setFromLat(String(currentLocation[1]))
                          setFromLng(String(currentLocation[0]))
                        }}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                      >
                        <Navigation className="h-4 w-4" />
                        Dùng vị trí hiện tại
                      </button>
                    )}
                  </div>
                </div>

                <div className="rounded-xl bg-white p-4 border border-slate-200/50">
                  <label className="mb-3 block text-sm font-semibold text-slate-700">
                    Trạm đích
                  </label>
                  {filteredStations.length > 0 ? (
                    <select
                      value={selectedRouteStation?.id ?? ''}
                      onChange={(e) => {
                        const station = filteredStations.find((item) => item.id === e.target.value) ?? null
                        setSelectedRouteStation(station ?? null)
                        setToStationId(e.target.value)
                      }}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium focus:border-[#CF373D] focus:ring-2 focus:ring-[#CF373D]/20"
                    >
                      <option value="">Chọn trạm từ danh sách đã tìm</option>
                      {filteredStations.map((station) => (
                        <option key={station.id} value={station.id}>
                          {station.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Chưa có danh sách trạm. Vui lòng tìm kiếm trạm trước tại tab &quot;Tìm kiếm&quot;.
                    </p>
                  )}
                  {selectedRouteStation && (
                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                      <p className="font-semibold text-slate-700">{selectedRouteStation.name}</p>
                      {selectedRouteStation.address?.addressLocality && (
                        <p className="text-slate-500">{selectedRouteStation.address.addressLocality}</p>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => void handleFindRoute()}
                  disabled={loadingRoute}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#CF373D] to-[#b82e33] px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg disabled:opacity-60 transition-all"
                >
                  {loadingRoute ? (
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
          </>
        )}
      </div>

      {/* Toggle Sidebar Button */}
      {!sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="absolute left-4 top-4 z-20 rounded-lg bg-white p-2 shadow-lg transition-colors hover:bg-slate-50"
          aria-label="Mở lại bảng tìm kiếm"
        >
          <ChevronRight className="h-5 w-5 text-slate-700" />
        </button>
      )}

      {/* Map Area - Always visible on the right */}
      <div className="flex-1 min-w-0 bg-white relative">
        {activeTab === 'route' ? (
          <div ref={mapContainerRef} className="h-full w-full" />
        ) : (
        <div className="h-full w-full">
          <StationsMap
            stations={filteredStations}
            currentLocation={currentLocation}
            onStationClick={setSelectedStation}
            onCoordinateSelect={handleMapCoordinateSelect}
            selectedCoordinate={selectedCoordinate}
          />
      </div>
        )}
      </div>

      {/* Station Modal */}
      {selectedStation && (
        <CitizenStationModal
          station={selectedStation}
          distanceKm={getStationDistance(selectedStation)}
          onClose={() => setSelectedStation(null)}
        />
      )}
    </div>
  )
}
