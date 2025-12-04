/* SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
 * This file is part of ev-charging-app and is licensed under the
 * MIT License. See the LICENSE file in the project root for details.
 */

import { useEffect, useState } from 'react'
import type { Station } from '../../types/ev'
import { CitizenStationCard } from './CitizenStationCard'
import { CitizenStationModal } from './CitizenStationModal'
import { StationsMap } from './StationsMap'
import {
  Bookmark,
  BookmarkX,
  Loader2,
  AlertTriangle,
  X,
  ChevronRight,
} from 'lucide-react'
import { apiFetch } from '../../utils/api'

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371
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

export function FavoritesPage() {
  const [favorites, setFavorites] = useState<Station[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    void loadFavorites()
    // Get current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation([position.coords.longitude, position.coords.latitude])
        },
        () => {},
      )
    }
  }, [])

  async function loadFavorites() {
    try {
      setLoading(true)
      setError(null)
      const res = await apiFetch('/citizen/favorites')
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const data = (await res.json()) as Station[]
      setFavorites(data)
    } catch (e) {
      console.error(e)
      const errorMessage = e instanceof Error && (e.message.includes('Failed to fetch') || e.message.includes('NetworkError'))
        ? 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng của bạn.'
        : 'Không thể tải danh sách trạm đã lưu.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  async function removeFavorite(stationId: string) {
    try {
      const res = await apiFetch(`/citizen/favorites?station_id=${encodeURIComponent(stationId)}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      // Reload favorites
      void loadFavorites()
    } catch (e) {
      console.error(e)
      const errorMessage = e instanceof Error && (e.message.includes('Failed to fetch') || e.message.includes('NetworkError'))
        ? 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng của bạn.'
        : 'Không thể xóa trạm khỏi danh sách đã lưu.'
      setError(errorMessage)
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
    <div className="flex flex-col lg:flex-row h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar */}
      <div
        className={`relative flex flex-col border-r border-slate-200 bg-white transition-all duration-300 ${
          sidebarOpen ? 'w-full lg:w-[420px]' : 'w-0'
        } overflow-hidden absolute lg:relative z-30 lg:z-auto h-full`}
      >
        {sidebarOpen && (
          <div className="flex h-full flex-col overflow-y-auto min-w-0">
            {/* Header */}
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                  <Bookmark className="h-4 w-4 sm:h-5 sm:w-5 text-[#CF373D] flex-shrink-0" />
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">Trạm đã lưu</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="rounded-lg p-1 sm:p-1.5 text-slate-500 hover:bg-slate-100 flex-shrink-0"
                >
                  <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              </div>
              {favorites.length > 0 && (
                <p className="text-xs text-slate-600">{favorites.length} trạm đã lưu</p>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-3 md:p-4 min-w-0">
              {loading && favorites.length === 0 ? (
                <div className="flex items-center justify-center py-8 sm:py-12">
                  <div className="text-center px-4">
                    <Loader2 className="h-8 w-8 sm:h-12 sm:w-12 animate-spin text-[#CF373D] mx-auto mb-3 sm:mb-4" />
                    <p className="text-xs sm:text-sm font-medium text-slate-600 break-words">Đang tải...</p>
                  </div>
                </div>
              ) : null}

              {error ? (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 px-2.5 sm:px-3 py-2 text-xs font-semibold text-red-700 border border-red-200">
                  <AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0 mt-0.5" />
                  <span className="break-words">{error}</span>
                </div>
              ) : null}

              {!loading && favorites.length === 0 && !error ? (
                <div className="rounded-lg sm:rounded-xl bg-blue-50 p-4 sm:p-6 text-center border border-blue-200">
                  <Bookmark className="h-8 w-8 sm:h-12 sm:w-12 text-blue-400 mx-auto mb-2 sm:mb-3" />
                  <p className="text-xs sm:text-sm font-medium text-blue-800 break-words px-2">
                    Bạn chưa lưu trạm nào. Hãy tìm trạm và thêm vào danh sách đã lưu!
                  </p>
                </div>
              ) : null}

              {favorites.length > 0 && (
                <div className="space-y-2 sm:space-y-3">
                  {favorites.map((station) => (
                    <CitizenStationCard
                      key={station.id}
                      station={station}
                      distanceKm={getStationDistance(station)}
                      onSelect={setSelectedStation}
                      onRemoveFavorite={removeFavorite}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Map Area */}
      <div className="relative flex-1 h-full overflow-hidden min-w-0">
        {!sidebarOpen && (
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="absolute left-2 sm:left-4 top-2 sm:top-4 z-10 rounded-lg bg-white p-1.5 sm:p-2 shadow-lg hover:bg-slate-50"
          >
            <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-slate-700" />
          </button>
        )}
        <div className="h-full w-full min-h-0">
          {favorites.length > 0 ? (
            <StationsMap
              stations={favorites}
              currentLocation={currentLocation}
              onStationClick={setSelectedStation}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-slate-100">
              <div className="text-center px-4">
                <BookmarkX className="h-12 w-12 sm:h-16 sm:w-16 text-slate-300 mx-auto mb-3 sm:mb-4" />
                <p className="text-xs sm:text-sm font-medium text-slate-500 break-words">Chưa có trạm đã lưu để hiển thị</p>
              </div>
            </div>
          )}
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
