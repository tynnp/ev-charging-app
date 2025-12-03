/* SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
 * This file is part of ev-charging-app and is licensed under the
 * MIT License. See the LICENSE file in the project root for details.
 */

import { useState, useEffect } from 'react'
import type { Station } from '../../types/ev'
import { CitizenStationModal } from './CitizenStationModal'
import { StationFilters } from '../stations/StationFilters'
import { StationsMap } from './StationsMap'
import {
  BarChart3,
  Loader2,
  AlertTriangle,
  X,
  Search,
  Eye,
  MapPin,
  CheckCircle2,
  Wrench,
  XCircle,
  TrendingUp,
  LayoutGrid,
  Table2,
  Bookmark,
  BookmarkCheck,
} from 'lucide-react'
import { getStationStatusLabel } from '../../utils/labels'
import { API_BASE_URL } from '../../config.ts'
import { apiFetch } from '../../utils/api'

type ComparisonResult = {
  station_id: string
  station_name?: string
  status: string
  available_capacity?: number
  capacity?: number
  network?: string
  total_sessions: number
  avg_energy_per_session_kwh: number
  address?: {
    streetAddress?: string
    addressLocality?: string
  }
  location?: {
    coordinates: number[]
  }
}

export function ComparisonPage() {
  const [selectedStations, setSelectedStations] = useState<Station[]>([])
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null)
  const [selectedCoordinate, setSelectedCoordinate] = useState<[number, number] | null>(null)
  const [activeTab, setActiveTab] = useState<'search' | 'results'>('search')
  const [favoritedStations, setFavoritedStations] = useState<Set<string>>(new Set())

  // Search states
  const [searchStations, setSearchStations] = useState<Station[]>([])
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchMode, setSearchMode] = useState<'nearby' | 'advanced'>('nearby')

  // Nearby search
  const [nearLat, setNearLat] = useState('10.7769')
  const [nearLng, setNearLng] = useState('106.7009')
  const [nearRadiusKm, setNearRadiusKm] = useState('5')

  // Advanced search filters
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
          setSelectedCoordinate([lng, lat])
        },
        () => {},
      )
    }
  }, [])

  useEffect(() => {
    async function loadFavorites() {
      try {
        const res = await apiFetch('/citizen/favorites')
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        const data = (await res.json()) as Station[]
        setFavoritedStations(new Set(data.map((station) => station.id)))
      } catch (loadError) {
        console.error(loadError)
        setError('Không thể tải danh sách trạm đã lưu.')
      }
    }

    void loadFavorites()
  }, [])

  async function handleSearchNearby() {
    try {
      setLoadingSearch(true)
      setSearchError(null)

      const lat = Number(nearLat)
      const lng = Number(nearLng)
      const radius = Number(nearRadiusKm)

      if (Number.isNaN(lat) || Number.isNaN(lng) || Number.isNaN(radius) || radius <= 0) {
        setSearchError('Toạ độ hoặc bán kính không hợp lệ.')
        setSearchStations([])
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
      setSearchStations(data)
      setSelectedCoordinate([lng, lat])
    } catch (e) {
      console.error(e)
      setSearchError('Không thể tải dữ liệu trạm sạc.')
      setSearchStations([])
    } finally {
      setLoadingSearch(false)
    }
  }

  function handleMapCoordinateSelect(lng: number, lat: number) {
    setNearLat(String(lat))
    setNearLng(String(lng))
    setSelectedCoordinate([lng, lat])
    setSearchError(null)
  }

  async function handleToggleFavorite(station: Station) {
    const favorited = favoritedStations.has(station.id)

    try {
      const url = `/citizen/favorites?station_id=${encodeURIComponent(station.id)}`
      const options: RequestInit = favorited ? { method: 'DELETE' } : { method: 'POST' }
      const res = await apiFetch(url, options)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      setFavoritedStations((prev) => {
        const next = new Set(prev)
        if (favorited) {
          next.delete(station.id)
        } else {
          next.add(station.id)
        }
        return next
      })
      setError(null)
    } catch (toggleError) {
      console.error(toggleError)
      setError('Không thể cập nhật trạng thái lưu trạm. Vui lòng thử lại.')
    }
  }

  async function handleAdvancedSearch() {
    try {
      setLoadingSearch(true)
      setSearchError(null)

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
      setSearchStations(data)
    } catch (e) {
      console.error(e)
      setSearchError('Không thể tải dữ liệu trạm sạc.')
      setSearchStations([])
    } finally {
      setLoadingSearch(false)
    }
  }

  function addStationToComparison(station: Station) {
    if (selectedStations.some((s) => s.id === station.id)) {
      setError('Trạm này đã được thêm vào danh sách so sánh.')
      return
    }
    if (selectedStations.length >= 5) {
      setError('Bạn chỉ có thể so sánh tối đa 5 trạm cùng lúc.')
      return
    }
    setSelectedStations([...selectedStations, station])
    setError(null)
  }

  async function handleCompare() {
    if (selectedStations.length < 2) {
      setError('Vui lòng chọn ít nhất 2 trạm để so sánh.')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const stationIds = selectedStations.map((s) => s.id)
      const params = new URLSearchParams()
      stationIds.forEach((id) => {
        params.append('station_ids', id)
      })

      const res = await fetch(`${API_BASE_URL}/citizen/compare?${params.toString()}`)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const data = (await res.json()) as { stations: ComparisonResult[] }
      setComparisonResult(data.stations)
    } catch (e) {
      console.error(e)
      setError('Không thể so sánh các trạm. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  function removeStation(stationId: string) {
    setSelectedStations(selectedStations.filter((s) => s.id !== stationId))
    setComparisonResult(null)
  }

  function getStationFromResult(result: ComparisonResult): Station | null {
    return selectedStations.find((s) => s.id === result.station_id) || null
  }

  function normalizeStatus(status: string): string {
    return status.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
  }

  function getStatusIcon(status: string) {
    const key = normalizeStatus(status)
    if (key === 'operational' || key === 'working') {
      return <CheckCircle2 className="h-4 w-4" />
    }
    if (key === 'maintenance' || key === 'planned' || key === 'underconstruction') {
      return <Wrench className="h-4 w-4" />
    }
    if (
      key === 'outofservice' ||
      key === 'outoforder' ||
      key === 'withincidence' ||
      key === 'inactive' ||
      key === 'closed'
    ) {
      return <XCircle className="h-4 w-4" />
    }
    return null
  }

  function getStatusColor(status: string) {
    const key = normalizeStatus(status)
    if (key === 'operational' || key === 'working') {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    }
    if (key === 'maintenance' || key === 'planned' || key === 'underconstruction') {
      return 'bg-amber-50 text-amber-700 border-amber-200'
    }
    if (
      key === 'outofservice' ||
      key === 'outoforder' ||
      key === 'withincidence' ||
      key === 'inactive' ||
      key === 'closed'
    ) {
      return 'bg-red-50 text-red-700 border-red-200'
    }
    if (key === 'almostfull') {
      return 'bg-orange-50 text-orange-700 border-orange-200'
    }
    if (key === 'almostempty') {
      return 'bg-blue-50 text-blue-700 border-blue-200'
    }
    return 'bg-slate-50 text-slate-700 border-slate-200'
  }

  // Get stations to display on map
  const mapStations = comparisonResult?.length
    ? selectedStations.filter((s) => comparisonResult.some((r) => r.station_id === s.id))
    : selectedStations.length > 0
      ? selectedStations
      : searchStations

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left Panel: Tabs for Search & Results */}
      <div className="flex flex-col w-[50%] border-r border-slate-200 bg-white min-h-0">
        {/* Header with Tabs */}
        <div className="flex-shrink-0 border-b border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-[#CF373D]" />
                  <h3 className="text-base font-bold text-slate-900">So sánh trạm</h3>
            </div>
            
            {/* Selected Stations Count & Compare Button - Always visible */}
            {selectedStations.length > 0 && (
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-[#CF373D]/10 px-3 py-1.5">
                  <span className="text-xs font-semibold text-[#CF373D]">
                    Đã chọn: {selectedStations.length} / 5
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void handleCompare()
                    setActiveTab('results')
                  }}
                  disabled={loading || selectedStations.length < 2}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#CF373D] to-[#b82e33] px-4 py-2 text-xs font-semibold text-white shadow-md hover:shadow-lg disabled:opacity-60 transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Đang so sánh...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-3.5 w-3.5" />
                      So sánh
                    </>
                  )}
                </button>
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
                Tìm kiếm trạm
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
                <BarChart3 className="h-4 w-4" />
                Kết quả so sánh
                {comparisonResult && comparisonResult.length > 0 && (
                  <span className="rounded-full bg-[#CF373D] text-white text-xs px-1.5 py-0.5 min-w-[20px] text-center">
                    {comparisonResult.length}
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

        {/* Selected Stations - Always visible when selected */}
        {selectedStations.length > 0 && (
          <div className="flex-shrink-0 border-b border-slate-200 bg-slate-50/30 px-4 py-3">
            <div className="flex flex-wrap gap-2">
              {selectedStations.map((station, index) => (
                <div
                  key={station.id}
                  className="group relative flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#CF373D] to-[#b82e33] px-3 py-1.5 pr-8 text-xs font-semibold text-white shadow-sm"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs">
                    {index + 1}
                  </span>
                  <span className="truncate max-w-[150px]">{station.name}</span>
                  <button
                    type="button"
                    onClick={() => removeStation(station.id)}
                    className="absolute right-1 rounded p-0.5 text-white/80 hover:bg-white/20 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {activeTab === 'search' ? (
            <div className="p-4 bg-slate-50/30">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900">Tìm kiếm trạm</h4>
                <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setSearchMode('nearby')}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                      searchMode === 'nearby'
                        ? 'bg-white text-[#CF373D] shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Gần đây
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchMode('advanced')}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                      searchMode === 'advanced'
                        ? 'bg-white text-[#CF373D] shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Nâng cao
                  </button>
                </div>
              </div>

              {searchMode === 'nearby' ? (
                <div className="space-y-2 mb-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">Vĩ độ</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={nearLat}
                      onChange={(e) => setNearLat(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#CF373D] focus:ring-2 focus:ring-[#CF373D]/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">Kinh độ</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={nearLng}
                      onChange={(e) => setNearLng(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#CF373D] focus:ring-2 focus:ring-[#CF373D]/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">Bán kính (km)</label>
                    <input
                      type="number"
                      min={0.1}
                      step={0.5}
                      value={nearRadiusKm}
                      onChange={(e) => setNearRadiusKm(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#CF373D] focus:ring-2 focus:ring-[#CF373D]/20"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSearchNearby()}
                    disabled={loadingSearch}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#CF373D] to-[#b82e33] px-4 py-2 text-sm font-semibold text-white shadow-md hover:shadow-lg disabled:opacity-60"
                  >
                    <Search className="h-4 w-4" />
                    {loadingSearch ? 'Đang tìm...' : 'Tìm trạm'}
                  </button>
                </div>
              ) : (
                <div className="mb-3">
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

              {searchError ? (
                <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 border border-red-200">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>{searchError}</span>
                </div>
              ) : null}

              {searchStations.length > 0 && (
                  <div className="space-y-2">
                  {searchStations.map((station) => {
                    const isSelected = selectedStations.some((s) => s.id === station.id)
                    const isFavorited = favoritedStations.has(station.id)
                    return (
                      <div
                        key={station.id}
                        className={`rounded-lg border-2 p-2.5 transition-all ${
                          isSelected
                            ? 'border-[#CF373D] bg-[#CF373D]/5'
                            : 'border-slate-200 bg-white hover:border-[#CF373D]/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-xs text-slate-900 truncate">{station.name}</div>
                            {station.address?.addressLocality && (
                              <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                                <MapPin className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{station.address.addressLocality}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <button
                              type="button"
                              onClick={() => addStationToComparison(station)}
                              disabled={isSelected || selectedStations.length >= 5}
                              className={`flex-shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                                isSelected
                                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                                  : selectedStations.length >= 5
                                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                                    : 'bg-[#CF373D] text-white hover:bg-[#b82e33]'
                              }`}
                            >
                              {isSelected ? 'Đã chọn' : 'Thêm'}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleToggleFavorite(station)}
                              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all ${
                                isFavorited
                                  ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
                                  : 'border-slate-200 bg-white text-slate-600 hover:border-[#CF373D]/40 hover:text-[#CF373D]'
                              }`}
                            >
                              {isFavorited ? (
                                <BookmarkCheck className="h-3.5 w-3.5" />
                              ) : (
                                <Bookmark className="h-3.5 w-3.5" />
                              )}
                              {isFavorited ? 'Đã lưu' : 'Lưu trạm'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-slate-50/30">
              {/* Results Tab Content */}
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900">Kết quả so sánh</h4>
            {comparisonResult && comparisonResult.length > 0 && (
                  <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
                    <button
                      type="button"
                      onClick={() => setViewMode('cards')}
                      className={`rounded-md px-2 py-1 text-xs font-semibold transition-all ${
                        viewMode === 'cards'
                          ? 'bg-white text-[#CF373D] shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('table')}
                      className={`rounded-md px-2 py-1 text-xs font-semibold transition-all ${
                        viewMode === 'table'
                          ? 'bg-white text-[#CF373D] shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Table2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                </div>

              {comparisonResult && comparisonResult.length > 0 ? (
                <div>
                {viewMode === 'cards' ? (
                    <div className="space-y-4">
                    {comparisonResult.map((result) => {
                      const station = getStationFromResult(result)
                      return (
                        <div
                          key={result.station_id}
                          className="group rounded-xl border-2 border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-[#CF373D]/40 hover:shadow-md"
                        >
                          <div className="mb-4 flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h5 className="text-sm font-bold text-slate-900 group-hover:text-[#CF373D] transition-colors truncate">
                                {result.station_name}
                              </h5>
                              {result.network && (
                                <p className="mt-1 text-xs text-slate-500 truncate">{result.network}</p>
                              )}
                            </div>
                            <div
                              className={`flex-shrink-0 inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold ${getStatusColor(
                                result.status,
                              )}`}
                            >
                              {getStatusIcon(result.status) && getStatusIcon(result.status)}
                              <span className="whitespace-nowrap">{getStationStatusLabel(result.status)}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="rounded-lg bg-emerald-50/50 p-3 border border-emerald-100 hover:bg-emerald-50 transition-colors">
                              <div className="text-xs font-medium text-emerald-600 mb-1">Chỗ trống</div>
                              <div className="text-lg font-bold text-emerald-700">
                                {result.available_capacity != null ? result.available_capacity : '-'}
                              </div>
                            </div>
                            <div className="rounded-lg bg-purple-50/50 p-3 border border-purple-100 hover:bg-purple-50 transition-colors">
                              <div className="text-xs font-medium text-purple-600 mb-1">Công suất</div>
                              <div className="text-lg font-bold text-purple-700">
                                {result.capacity != null ? `${result.capacity}kW` : '-'}
                              </div>
                            </div>
                            <div className="rounded-lg bg-blue-50/50 p-3 border border-blue-100 hover:bg-blue-50 transition-colors">
                              <div className="text-xs font-medium text-blue-600 mb-1">Số phiên</div>
                              <div className="text-lg font-bold text-blue-700">{result.total_sessions}</div>
                            </div>
                            <div className="rounded-lg bg-amber-50/50 p-3 border border-amber-100 hover:bg-amber-50 transition-colors">
                              <div className="text-xs font-medium text-amber-600 mb-1">kWh/phiên</div>
                              <div className="text-lg font-bold text-amber-700">
                                {result.avg_energy_per_session_kwh.toFixed(1)}
                              </div>
                            </div>
                          </div>

                          {station && (
                            <button
                              type="button"
                              onClick={() => setSelectedStation(station)}
                              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#CF373D] to-[#b82e33] px-3 py-2 text-xs font-semibold text-white shadow-sm hover:shadow-md transition-all"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Xem chi tiết
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="border-b-2 border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100/50">
                          <th className="px-4 py-3 text-left font-bold text-slate-700">Trạm</th>
                          <th className="px-4 py-3 text-center font-bold text-slate-700">Trạng thái</th>
                          <th className="px-4 py-3 text-center font-bold text-slate-700">Chỗ trống</th>
                          <th className="px-4 py-3 text-center font-bold text-slate-700">Công suất</th>
                          <th className="px-4 py-3 text-center font-bold text-slate-700">Số phiên</th>
                          <th className="px-4 py-3 text-center font-bold text-slate-700">kWh/phiên</th>
                          <th className="px-4 py-3 text-center font-bold text-slate-700">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonResult.map((result, index) => {
                          const station = getStationFromResult(result)
                          return (
                            <tr
                              key={result.station_id}
                              className={`border-b border-slate-100 transition-colors hover:bg-slate-50/50 ${
                                index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                              }`}
                            >
                              <td className="px-4 py-3">
                                <div className="font-semibold text-slate-900 text-xs">{result.station_name}</div>
                                {result.network && (
                                  <div className="text-xs text-slate-500 mt-0.5">{result.network}</div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div
                                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold ${getStatusColor(
                                    result.status,
                                  )}`}
                                >
                                  {getStatusIcon(result.status) && getStatusIcon(result.status)}
                                  <span className="whitespace-nowrap">{getStationStatusLabel(result.status)}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center font-bold text-slate-700">
                                {result.available_capacity != null ? result.available_capacity : '-'}
                              </td>
                              <td className="px-4 py-3 text-center font-bold text-slate-700">
                                {result.capacity != null ? `${result.capacity}kW` : '-'}
                              </td>
                              <td className="px-4 py-3 text-center font-bold text-slate-700">
                                {result.total_sessions}
                              </td>
                              <td className="px-4 py-3 text-center font-bold text-slate-700">
                                {result.avg_energy_per_session_kwh.toFixed(1)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {station && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedStation(station)}
                                    className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#CF373D] to-[#b82e33] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:shadow-md transition-all"
                                  >
                                    <Eye className="h-3 w-3" />
                                    Xem
                                  </button>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-500">
                      {selectedStations.length === 0
                        ? 'Chọn ít nhất 2 trạm để so sánh'
                        : selectedStations.length === 1
                          ? 'Chọn thêm ít nhất 1 trạm nữa để so sánh'
                          : 'Nhấn nút "So sánh" để xem kết quả'}
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
        <div className="relative h-full w-full">
          <StationsMap
            stations={mapStations}
            currentLocation={currentLocation}
            onStationClick={setSelectedStation}
            onCoordinateSelect={handleMapCoordinateSelect}
            selectedCoordinate={selectedCoordinate}
          />
        </div>
      </div>

      {/* Station Modal */}
      {selectedStation && (
        <CitizenStationModal
          station={selectedStation}
          onClose={() => setSelectedStation(null)}
        />
      )}
    </div>
  )
}
