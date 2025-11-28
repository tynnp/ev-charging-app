/* SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
 * This file is part of ev-charging-app and is licensed under the
 * MIT License. See the LICENSE file in the project root for details.
 */

import { useState, useEffect } from 'react'
import type { Station } from '../../types/ev'
import { CitizenStationModal } from './CitizenStationModal'
import { StationFilters } from '../stations/StationFilters'
import {
  BarChart3,
  Loader2,
  AlertTriangle,
  X,
  Plug,
  Search,
  Eye,
  MapPin,
  CheckCircle2,
  Wrench,
  XCircle,
  Zap,
  TrendingUp,
  LayoutGrid,
  Table2,
} from 'lucide-react'

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000'

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
          setNearLat(String(lat))
          setNearLng(String(lng))
        },
        () => {},
      )
    }
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
    } catch (e) {
      console.error(e)
      setSearchError('Không thể tải dữ liệu trạm sạc.')
      setSearchStations([])
    } finally {
      setLoadingSearch(false)
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

  function getStatusIcon(status: string) {
    switch (status) {
      case 'operational':
        return <CheckCircle2 className="h-4 w-4" />
      case 'maintenance':
        return <Wrench className="h-4 w-4" />
      case 'outOfService':
      case 'out_of_service':
        return <XCircle className="h-4 w-4" />
      default:
        return null
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'operational':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'maintenance':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'outOfService':
      case 'out_of_service':
        return 'bg-red-50 text-red-700 border-red-200'
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="rounded-2xl border border-slate-200/50 bg-gradient-to-br from-white via-slate-50/30 to-white p-6 shadow-lg">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-[#CF373D] to-[#b82e33] p-2.5">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">So sánh trạm sạc</h3>
            <p className="text-sm text-slate-600">Chọn và so sánh các trạm sạc để đưa ra quyết định tốt nhất</p>
          </div>
        </div>

        {selectedStations.length > 0 && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-[#CF373D]/10 px-3 py-1.5">
                  <span className="text-sm font-semibold text-[#CF373D]">
                    Đã chọn: {selectedStations.length} / 5 trạm
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleCompare()}
                disabled={loading || selectedStations.length < 2}
                className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-gradient-to-r from-[#CF373D] to-[#b82e33] px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#CF373D] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang so sánh...
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4" />
                    So sánh {selectedStations.length} trạm
                  </>
                )}
              </button>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {selectedStations.map((station, index) => (
                <div
                  key={station.id}
                  className="group relative flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-[#CF373D] to-[#b82e33] px-4 py-2.5 pr-10 shadow-md transition-all hover:shadow-lg"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">
                    {index + 1}
                  </div>
                  <Plug className="h-4 w-4 text-white" />
                  <span className="text-sm font-semibold text-white">{station.name}</span>
                  <button
                    type="button"
                    onClick={() => removeStation(station.id)}
                    className="absolute right-2 rounded-lg p-1 text-white/80 transition-all hover:bg-white/20 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {error ? (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 border border-red-200">
            <AlertTriangle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        ) : null}
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Search Panel */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 rounded-2xl border border-slate-200/50 bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-base font-bold text-slate-900">Tìm kiếm trạm</h4>
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
              <div className="space-y-3 mb-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">Vĩ độ</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={nearLat}
                    onChange={(e) => setNearLat(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#CF373D] focus:ring-2 focus:ring-[#CF373D]/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">Kinh độ</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={nearLng}
                    onChange={(e) => setNearLng(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#CF373D] focus:ring-2 focus:ring-[#CF373D]/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">Bán kính (km)</label>
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
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#CF373D] to-[#b82e33] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-60"
                >
                  <Search className="h-4 w-4" />
                  {loadingSearch ? 'Đang tìm...' : 'Tìm trạm'}
                </button>
              </div>
            ) : (
              <div className="mb-4">
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
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 border border-red-200">
                <AlertTriangle className="h-4 w-4" />
                <span>{searchError}</span>
              </div>
            ) : null}

            {searchStations.length > 0 && (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                {searchStations.map((station) => {
                  const isSelected = selectedStations.some((s) => s.id === station.id)
                  return (
                    <div
                      key={station.id}
                      className={`group rounded-xl border-2 p-3.5 transition-all ${
                        isSelected
                          ? 'border-[#CF373D] bg-[#CF373D]/5 shadow-md'
                          : 'border-slate-200 bg-white hover:border-[#CF373D]/50 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-slate-900 truncate">{station.name}</div>
                          {station.address?.addressLocality && (
                            <div className="mt-1.5 flex items-center gap-1 text-xs text-slate-500">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{station.address.addressLocality}</span>
                            </div>
                          )}
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {station.status && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                                {station.status}
                              </span>
                            )}
                            {station.available_capacity != null && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                <Zap className="h-3 w-3" />
                                {station.available_capacity} chỗ
                              </span>
                            )}
                            {station.capacity != null && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                                {station.capacity}kW
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => addStationToComparison(station)}
                          disabled={isSelected || selectedStations.length >= 5}
                          className={`ml-2 flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                            isSelected
                              ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                              : selectedStations.length >= 5
                                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                                : 'bg-[#CF373D] text-white hover:bg-[#b82e33] shadow-sm hover:shadow-md'
                          }`}
                        >
                          {isSelected ? 'Đã chọn' : 'Thêm'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {!loadingSearch && searchStations.length === 0 && !searchError && (
              <div className="rounded-xl bg-slate-50 p-6 text-center border border-slate-200">
                <Search className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                <p className="text-sm text-slate-600">Sử dụng tìm kiếm ở trên để tìm trạm</p>
              </div>
            )}
          </div>
        </div>

        {/* Comparison Results */}
        <div className="lg:col-span-2">
          {comparisonResult && comparisonResult.length > 0 ? (
            <div className="rounded-2xl border border-slate-200/50 bg-white p-6 shadow-lg">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-lg font-bold text-slate-900">Kết quả so sánh</h4>
                <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setViewMode('cards')}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                      viewMode === 'cards'
                        ? 'bg-white text-[#CF373D] shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                      viewMode === 'table'
                        ? 'bg-white text-[#CF373D] shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Table2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {viewMode === 'cards' ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {comparisonResult.map((result) => {
                    const station = getStationFromResult(result)
                    return (
                      <div
                        key={result.station_id}
                        className="group relative rounded-xl border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50/50 p-5 shadow-md transition-all hover:shadow-lg hover:border-[#CF373D]/30"
                      >
                        <div className="mb-4">
                          <div className="mb-2 flex items-start justify-between">
                            <div className="flex-1">
                              <h5 className="text-base font-bold text-slate-900">{result.station_name}</h5>
                              {result.network && (
                                <p className="mt-1 text-xs text-slate-500">{result.network}</p>
                              )}
                            </div>
                            <div
                              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${getStatusColor(
                                result.status,
                              )}`}
                            >
                              {getStatusIcon(result.status) && (
                                <span>{getStatusIcon(result.status)}</span>
                              )}
                              <span className="capitalize">{result.status}</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-lg bg-emerald-50/50 p-3 border border-emerald-100">
                              <div className="text-xs font-medium text-emerald-600 mb-1">Chỗ trống</div>
                              <div className="text-lg font-bold text-emerald-700">
                                {result.available_capacity != null ? result.available_capacity : '-'}
                              </div>
                            </div>
                            <div className="rounded-lg bg-purple-50/50 p-3 border border-purple-100">
                              <div className="text-xs font-medium text-purple-600 mb-1">Công suất</div>
                              <div className="text-lg font-bold text-purple-700">
                                {result.capacity != null ? `${result.capacity}kW` : '-'}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-lg bg-blue-50/50 p-3 border border-blue-100">
                              <div className="text-xs font-medium text-blue-600 mb-1">Số phiên</div>
                              <div className="text-lg font-bold text-blue-700">{result.total_sessions}</div>
                            </div>
                            <div className="rounded-lg bg-amber-50/50 p-3 border border-amber-100">
                              <div className="text-xs font-medium text-amber-600 mb-1">kWh/phiên</div>
                              <div className="text-lg font-bold text-amber-700">
                                {result.avg_energy_per_session_kwh.toFixed(1)}
                              </div>
                            </div>
                          </div>
                        </div>

                        {station && (
                          <button
                            type="button"
                            onClick={() => setSelectedStation(station)}
                            className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#CF373D] to-[#b82e33] px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg"
                          >
                            <Eye className="h-4 w-4" />
                            Xem chi tiết
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b-2 border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100/50">
                        <th className="px-4 py-3 text-left text-sm font-bold text-slate-700">Trạm</th>
                        <th className="px-4 py-3 text-center text-sm font-bold text-slate-700">Trạng thái</th>
                        <th className="px-4 py-3 text-center text-sm font-bold text-slate-700">Chỗ trống</th>
                        <th className="px-4 py-3 text-center text-sm font-bold text-slate-700">Công suất</th>
                        <th className="px-4 py-3 text-center text-sm font-bold text-slate-700">Số phiên</th>
                        <th className="px-4 py-3 text-center text-sm font-bold text-slate-700">kWh/phiên</th>
                        <th className="px-4 py-3 text-center text-sm font-bold text-slate-700">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonResult.map((result, index) => {
                        const station = getStationFromResult(result)
                        return (
                          <tr
                            key={result.station_id}
                            className={`border-b border-slate-100 transition-colors ${
                              index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                            } hover:bg-[#CF373D]/5`}
                          >
                            <td className="px-4 py-4">
                              <div className="font-semibold text-slate-900">{result.station_name}</div>
                              {result.network && (
                                <div className="mt-0.5 text-xs text-slate-500">{result.network}</div>
                              )}
                            </td>
                            <td className="px-4 py-4 text-center">
                              <div
                                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${getStatusColor(
                                  result.status,
                                )}`}
                              >
                                {getStatusIcon(result.status) && (
                                  <span>{getStatusIcon(result.status)}</span>
                                )}
                                <span className="capitalize">{result.status}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span className="text-base font-bold text-slate-700">
                                {result.available_capacity != null ? result.available_capacity : '-'}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span className="text-base font-bold text-slate-700">
                                {result.capacity != null ? `${result.capacity}kW` : '-'}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span className="text-base font-bold text-slate-700">{result.total_sessions}</span>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span className="text-base font-bold text-slate-700">
                                {result.avg_energy_per_session_kwh.toFixed(1)}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-center">
                              {station && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedStation(station)}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#CF373D] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#b82e33] transition-colors shadow-sm hover:shadow-md"
                                >
                                  <Eye className="h-3.5 w-3.5" />
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
            <div className="rounded-2xl border border-slate-200/50 bg-white p-12 shadow-lg text-center">
              <BarChart3 className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-slate-700 mb-2">Chưa có kết quả so sánh</h4>
              <p className="text-sm text-slate-500">
                Chọn ít nhất 2 trạm từ danh sách bên trái và nhấn nút "So sánh" để xem kết quả
              </p>
            </div>
          )}
        </div>
      </div>

      {selectedStation && (
        <CitizenStationModal
          station={selectedStation}
          onClose={() => setSelectedStation(null)}
        />
      )}
    </div>
  )
}
