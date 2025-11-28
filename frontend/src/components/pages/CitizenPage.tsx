/* SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
 * This file is part of ev-charging-app and is licensed under the
 * MIT License. See the LICENSE file in the project root for details.
 */

import { useState, useEffect } from 'react'
import type { Station } from '../../types/ev'
import { StationFilters } from '../stations/StationFilters'
import { CitizenStationCard } from '../citizen/CitizenStationCard'
import { CitizenStationModal } from '../citizen/CitizenStationModal'
import { StationsMap } from '../citizen/StationsMap'
import {
  Search,
  MapPin,
  Ruler,
  AlertTriangle,
  Lightbulb,
  Navigation,
  ArrowUpDown,
} from 'lucide-react'

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000'

const USER_ID = 'citizen_user_1'

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
  const [activeTab, setActiveTab] = useState<'search' | 'results'>('search')

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

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left Panel: Tabs for Search & Results */}
      <div className="flex flex-col w-[60%] border-r border-slate-200 bg-white min-h-0">
        {/* Header with Tabs */}
        <div className="flex-shrink-0 border-b border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-[#CF373D]" />
              <h3 className="text-base font-bold text-slate-900">Tìm kiếm trạm</h3>
            </div>
            
            {/* Results Count - Always visible */}
            {stations.length > 0 && (
              <div className="rounded-lg bg-emerald-50 px-3 py-1.5 border border-emerald-200">
                <span className="text-xs font-semibold text-emerald-800">
                  Tìm thấy {stations.length} trạm
                </span>
              </div>
            )}
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
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex-shrink-0 border-b border-slate-200 bg-red-50 px-4 py-3">
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 border border-red-200">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {activeTab === 'search' ? (
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
          ) : (
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
                      <div key={station.id} className="transform transition-all hover:scale-[1.01]">
                        <CitizenStationCard
                          station={station}
                          distanceKm={getStationDistance(station)}
                          onSelect={setSelectedStation}
                          isFavorited={favoritedStations.has(station.id)}
                          onToggleFavorite={handleToggleFavorite}
                        />
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
        </div>
      </div>

      {/* Map Area - Always visible on the right */}
      <div className="flex-1 min-w-0 bg-white">
        <div className="h-full w-full">
          <StationsMap
            stations={filteredStations}
            currentLocation={currentLocation}
            onStationClick={setSelectedStation}
          />
        </div>
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
