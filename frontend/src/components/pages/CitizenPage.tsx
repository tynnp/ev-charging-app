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
  CheckCircle2,
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
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200/50 bg-gradient-to-br from-white to-slate-50/50 p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
          <Search className="h-6 w-6 text-[#CF373D]" />
          <h3 className="text-lg font-bold text-slate-900">Tìm kiếm trạm sạc</h3>
        </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSearchMode('nearby')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                searchMode === 'nearby'
                  ? 'bg-[#CF373D] text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Tìm gần đây
            </button>
            <button
              type="button"
              onClick={() => setSearchMode('advanced')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                searchMode === 'advanced'
                  ? 'bg-[#CF373D] text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Tìm kiếm nâng cao
            </button>
          </div>
        </div>

        {searchMode === 'nearby' ? (
        <div className="space-y-4">
          <div className="rounded-xl bg-white p-4 border border-slate-200/50">
            <div className="flex flex-wrap items-end gap-3">
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
                    className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition-all focus:border-[#CF373D] focus:outline-none focus:ring-2 focus:ring-[#CF373D]/20"
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
                    className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition-all focus:border-[#CF373D] focus:outline-none focus:ring-2 focus:ring-[#CF373D]/20"
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
                  step={0.5}
                  value={nearRadiusKm}
                  onChange={(event) => setNearRadiusKm(event.target.value)}
                    className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition-all focus:border-[#CF373D] focus:outline-none focus:ring-2 focus:ring-[#CF373D]/20"
                />
              </div>
                {currentLocation && (
              <button
                type="button"
                onClick={() => {
                      setNearLat(String(currentLocation[1]))
                      setNearLng(String(currentLocation[0]))
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition-all hover:bg-blue-100"
                  >
                    <Navigation className="h-4 w-4" />
                    Dùng vị trí hiện tại
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handleSearchNearby()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-gradient-to-r from-[#CF373D] to-[#b82e33] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#CF373D] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
              >
                <Search className="h-4 w-4" />
                {loading ? 'Đang tìm...' : 'Tìm trạm gần đây'}
              </button>
            </div>
          </div>
          </div>
        ) : (
          <div className="space-y-4">
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

          {error ? (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 border border-red-200">
              <AlertTriangle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          ) : null}

          {!error && stations.length === 0 && !loading ? (
            <div className="rounded-xl bg-blue-50 p-4 border border-blue-200">
              <p className="flex items-center gap-2 text-sm font-medium text-blue-800">
                <Lightbulb className="h-4 w-4" />
              {searchMode === 'nearby'
                ? 'Nhập toạ độ và bấm "Tìm trạm gần đây" để xem các trạm sạc gần vị trí của bạn.'
                : 'Sử dụng bộ lọc ở trên để tìm kiếm trạm sạc phù hợp với nhu cầu của bạn.'}
              </p>
            </div>
          ) : null}

          {stations.length > 0 ? (
            <div className="rounded-xl bg-emerald-50 p-4 border border-emerald-200">
              <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                <CheckCircle2 className="h-4 w-4" />
              Tìm thấy {stations.length} trạm phù hợp.
              </p>
            </div>
          ) : null}
      </div>

      {filteredStations.length > 0 && (
        <div className="rounded-2xl border border-slate-200/50 bg-white p-6 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Danh sách trạm ({filteredStations.length})</h3>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-slate-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium shadow-sm transition-all focus:border-[#CF373D] focus:outline-none focus:ring-2 focus:ring-[#CF373D]/20"
              >
                <option value="distance">Sắp xếp theo khoảng cách</option>
                <option value="status">Sắp xếp theo trạng thái</option>
                <option value="available">Sắp xếp theo số chỗ trống</option>
                <option value="capacity">Sắp xếp theo công suất</option>
              </select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredStations.map((station) => (
              <CitizenStationCard
                key={station.id}
                station={station}
                distanceKm={getStationDistance(station)}
                onSelect={setSelectedStation}
                isFavorited={favoritedStations.has(station.id)}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
        </div>
      </div>
      )}

      {stations.length > 0 && (
      <div className="overflow-hidden rounded-xl border-2 border-slate-200 bg-white shadow-md">
          <StationsMap
            stations={filteredStations}
            currentLocation={currentLocation}
            onStationClick={setSelectedStation}
          />
      </div>
      )}

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
