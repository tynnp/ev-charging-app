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
  Heart,
  Loader2,
  AlertTriangle,
  X,
  ChevronRight,
} from 'lucide-react'

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000'

// Simple user ID - in production, this would come from auth
const USER_ID = 'citizen_user_1'

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
      const res = await fetch(`${API_BASE_URL}/citizen/favorites?user_id=${USER_ID}`)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const data = (await res.json()) as Station[]
      setFavorites(data)
    } catch (e) {
      console.error(e)
      setError('Không thể tải danh sách trạm yêu thích.')
    } finally {
      setLoading(false)
    }
  }

  async function removeFavorite(stationId: string) {
    try {
      const res = await fetch(
        `${API_BASE_URL}/citizen/favorites?user_id=${USER_ID}&station_id=${encodeURIComponent(stationId)}`,
        { method: 'DELETE' },
      )
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      // Reload favorites
      void loadFavorites()
    } catch (e) {
      console.error(e)
      setError('Không thể xóa trạm khỏi danh sách yêu thích.')
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
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-[#CF373D]" />
                  <h3 className="text-base font-bold text-slate-900">Trạm yêu thích</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {favorites.length > 0 && (
                <p className="text-xs text-slate-600">{favorites.length} trạm đã lưu</p>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading && favorites.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-[#CF373D] mx-auto mb-4" />
                    <p className="text-sm font-medium text-slate-600">Đang tải...</p>
                  </div>
                </div>
              ) : null}

              {error ? (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 border border-red-200">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>{error}</span>
                </div>
              ) : null}

              {!loading && favorites.length === 0 && !error ? (
                <div className="rounded-xl bg-blue-50 p-6 text-center border border-blue-200">
                  <Heart className="h-12 w-12 text-blue-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-blue-800">
                    Bạn chưa có trạm yêu thích nào. Hãy tìm trạm và thêm vào danh sách yêu thích!
                  </p>
                </div>
              ) : null}

              {favorites.length > 0 && (
                <div className="space-y-3">
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
        <div className="h-full w-full">
          {favorites.length > 0 ? (
            <StationsMap
              stations={favorites}
              currentLocation={currentLocation}
              onStationClick={setSelectedStation}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-slate-100">
              <div className="text-center">
                <Heart className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <p className="text-sm font-medium text-slate-500">Chưa có trạm yêu thích để hiển thị</p>
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
