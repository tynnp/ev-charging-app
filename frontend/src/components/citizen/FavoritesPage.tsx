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
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200/50 bg-gradient-to-br from-white to-slate-50/50 p-6 shadow-lg">
        <div className="mb-4 flex items-center gap-2">
          <Heart className="h-6 w-6 text-[#CF373D]" />
          <h3 className="text-lg font-bold text-slate-900">Trạm yêu thích của tôi</h3>
        </div>

        {loading && favorites.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-[#CF373D] mx-auto mb-4" />
              <p className="text-base font-medium text-slate-600">Đang tải danh sách yêu thích...</p>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 border border-red-200">
            <AlertTriangle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        ) : null}

        {!loading && favorites.length === 0 && !error ? (
          <div className="rounded-xl bg-blue-50 p-6 text-center border border-blue-200">
            <Heart className="h-12 w-12 text-blue-400 mx-auto mb-3" />
            <p className="text-base font-medium text-blue-800">
              Bạn chưa có trạm yêu thích nào. Hãy tìm trạm và thêm vào danh sách yêu thích!
            </p>
          </div>
        ) : null}

        {favorites.length > 0 && (
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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

      {favorites.length > 0 && (
        <div className="overflow-hidden rounded-xl border-2 border-slate-200 bg-white shadow-md">
          <StationsMap
            stations={favorites}
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

