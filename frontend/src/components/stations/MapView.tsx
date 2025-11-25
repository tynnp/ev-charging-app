/* SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
 * This file is part of ev-charging-app and is licensed under the
 * MIT License. See the LICENSE file in the project root for details.
 */

import { useEffect, useRef } from 'react'
import type { Map as MapLibreMap, Marker } from 'maplibre-gl'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MAP_STYLE } from '../../mapConfig'

type MapViewProps = {
  center: [number, number]
  zoom?: number
}

export function MapView({ center, zoom = 14 }: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markerRef = useRef<Marker | null>(null)

  const centerKey = `${center[0]},${center[1]}`

  useEffect(() => {
    if (!mapContainerRef.current) {
      return
    }

    if (!mapRef.current) {
      mapRef.current = new maplibregl.Map({
        container: mapContainerRef.current,
        style: MAP_STYLE,
        center,
        zoom,
      })

      markerRef.current = new maplibregl.Marker().setLngLat(center).addTo(mapRef.current)
    } else {
      mapRef.current.setCenter(center)
      mapRef.current.setZoom(zoom)

      if (!markerRef.current) {
        markerRef.current = new maplibregl.Marker().setLngLat(center).addTo(mapRef.current)
      } else {
        markerRef.current.setLngLat(center)
      }
    }
  }, [centerKey, zoom])

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
      }

      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  return <div ref={mapContainerRef} className="h-full w-full" />
}
