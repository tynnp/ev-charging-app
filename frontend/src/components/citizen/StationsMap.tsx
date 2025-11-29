/* SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
 * This file is part of ev-charging-app and is licensed under the
 * MIT License. See the LICENSE file in the project root for details.
 */

import { useEffect, useRef } from 'react'
import maplibregl, { Map as MapLibreMap, Marker, Popup } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Station } from '../../types/ev'
import { getStationStatusLabel } from '../../utils/labels'
import { MAP_STYLE } from '../../mapConfig'

const DEFAULT_CENTER: [number, number] = [106.7009, 10.7769]

type StationsMapProps = {
  stations: Station[]
  currentLocation: [number, number] | null
  onStationClick?: (station: Station) => void
}

export function StationsMap({ stations, currentLocation, onStationClick }: StationsMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markersRef = useRef<Marker[]>([])
  const stationsKey = stations.map((station) => station.id).join('|')

  const coords = stations
    .map((station) => station.location?.coordinates)
    .filter((value): value is number[] => Array.isArray(value) && value.length === 2)

  const hasCoords = coords.length > 0
  const lons = hasCoords ? coords.map(([lon]) => lon) : []
  const lats = hasCoords ? coords.map(([, lat]) => lat) : []
  const avgLon = hasCoords ? lons.reduce((sum, value) => sum + value, 0) / lons.length : 0
  const avgLat = hasCoords ? lats.reduce((sum, value) => sum + value, 0) / lats.length : 0

  const centerLon = currentLocation ? currentLocation[0] : hasCoords ? avgLon : DEFAULT_CENTER[0]
  const centerLat = currentLocation ? currentLocation[1] : hasCoords ? avgLat : DEFAULT_CENTER[1]

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

    if (!mapRef.current) {
      return
    }

    // Add current location marker
    if (currentLocation) {
      const currentMarker = new maplibregl.Marker({ color: '#3b82f6' })
        .setLngLat([currentLocation[0], currentLocation[1]])
        .setPopup(new Popup({ offset: 12 }).setText('Vị trí của bạn'))
        .addTo(mapRef.current)
      markersRef.current.push(currentMarker)
    }

    // Add station markers
    stations.forEach((station) => {
      const coordinates = station.location?.coordinates
      if (!Array.isArray(coordinates) || coordinates.length !== 2) {
        return
      }

      const [lon, lat] = coordinates
      const popup = new Popup({ offset: 12 }).setHTML(
        `<div class="p-2">
          <div class="font-semibold text-sm">${station.name}</div>
          <div class="text-xs text-slate-600">${getStationStatusLabel(station.status)}</div>
        </div>`,
      )

      const marker = new maplibregl.Marker({ color: '#CF373D' })
        .setLngLat([lon, lat])
        .setPopup(popup)
        .addTo(mapRef.current!)

      if (onStationClick) {
        marker.getElement().addEventListener('click', () => {
          onStationClick(station)
        })
      }

      markersRef.current.push(marker)
    })
  }, [centerLon, centerLat, hasCoords, stationsKey, stations, currentLocation, onStationClick])

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

  return <div ref={mapContainerRef} className="h-full w-full" />
}

