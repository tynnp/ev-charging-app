/* SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
 * This file is part of ev-charging-app and is licensed under the
 * MIT License. See the LICENSE file in the project root for details.
 */

export type StationAddress = {
  streetAddress?: string
  addressLocality?: string
  postalCode?: string
  addressCountry?: string
}

export type StationLocation = {
  type: string
  coordinates: number[]
}

export type Station = {
  id: string
  name: string
  status: string
  address?: StationAddress
  location: StationLocation
  capacity?: number
  socket_number?: number
  available_capacity?: number
  allowed_vehicle_types?: string[]
  network?: string
  operator?: string
  amperage?: number
  voltage?: number
  charge_types?: string[]
  accepted_payment_methods?: string[]
  opening_hours?: string
  socket_types?: string[]
  instantaneous_power?: number
  queue_length?: number
}

export type Session = {
  id: string
  station_id: string
  sensor_id?: string | null
  user_id?: string | null
  vehicle_type?: string | null
  charging_unit_id?: string | null
  transaction_id?: string | null
  transaction_type?: string | null
  session_status?: string | null
  duration_minutes?: number | null
  start_date_time: string
  end_date_time: string
  phenomenon_time: string
  result_time: string
  power_consumption_kwh: number
  amount_collected_vnd: number
  tax_amount_collected_vnd: number
}

export type CitizenProfile = {
  id: string
  name?: string | null
  email?: string | null
  phone_number?: string | null
}

export type CitizenSessionsStats = {
  user_id: string
  total_sessions: number
  total_energy_kwh: number
  total_amount_vnd: number
  total_tax_vnd: number
  total_duration_minutes: number
  average_session_duration_minutes: number
  average_energy_kwh: number
  average_amount_vnd: number
}

export type AnalyticsOverview = {
  total_sessions: number
  total_energy_kwh: number
  total_amount_vnd: number
  total_tax_vnd: number
  stations_count: number
  top_stations_by_sessions: {
    station_id: string
    session_count: number
  }[]
}

export type StationVehicleStats = {
  vehicle_type: string
  session_count: number
  total_energy_kwh: number
}

export type StationAnalytics = {
  station_id: string
  station_name?: string
  total_sessions: number
  total_energy_kwh: number
  total_amount_vnd: number
  total_tax_vnd: number
  average_session_duration_minutes: number
  average_energy_kwh: number
  vehicle_type_breakdown: StationVehicleStats[]
}

export type StationRealtime = {
  id: string
  status?: string | null
  available_capacity?: number | null
  instantaneous_power?: number | null
  queue_length?: number | null
}

export type Dataset = {
  id: string
  title: string
  description: string
  path: string
  mediaType: string
}

export type HealthStatus = {
  status: string
}