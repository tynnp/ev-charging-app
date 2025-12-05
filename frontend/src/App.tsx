/* SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
 * This file is part of ev-charging-app and is licensed under the
 * MIT License. See the LICENSE file in the project root for details.
 */

import 'leaflet/dist/leaflet.css'
import './App.css'
import { useState, useEffect } from 'react'
import { useAuth } from './contexts/AuthContext'
import { AppLayout } from './components/layout/AppLayout'
import { LoginPage } from './components/auth/LoginPage'
import { DashboardPage } from './components/pages/DashboardPage'
import { CitizenPage } from './components/pages/CitizenPage'
import { AdminPage } from './components/pages/AdminPage'
import { CitizenHistoryPage } from './components/citizen/CitizenHistoryPage'
import { FavoritesPage } from './components/citizen/FavoritesPage'
import { ComparisonPage } from './components/citizen/ComparisonPage'
import { ProfilePage } from './components/auth/ProfilePage'

type ManagerNavId =
  | 'manager-overview'
  | 'manager-realtime'
  | 'manager-map'
  | 'manager-stations'
  | 'manager-profile'

type CitizenNavId =
  | 'citizen-find'
  | 'citizen-history'
  | 'citizen-favorites'
  | 'citizen-compare'
  | 'citizen-profile'

type AdminNavId =
  | 'admin-users'
  | 'admin-datasets'
  | 'admin-profile'

function App() {
  const { user, isLoading } = useAuth()
  const [role, setRole] = useState<'manager' | 'citizen' | 'admin'>('manager')
  const [activeNavId, setActiveNavId] = useState<ManagerNavId | CitizenNavId | AdminNavId>('manager-overview')

  useEffect(() => {
    if (user) {
      setRole(user.role)
      if (user.role === 'admin') {
        setActiveNavId('admin-users')
      } else if (user.role === 'manager') {
        setActiveNavId('manager-overview')
      } else {
        setActiveNavId('citizen-find')
      }
    }
  }, [user])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-slate-600">Đang tải...</div>
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  const managerNavItems = [
    { id: 'manager-overview', label: 'Tổng quan' },
    { id: 'manager-realtime', label: 'Phiên sạc thời gian thực' },
    { id: 'manager-map', label: 'Bản đồ & Tra cứu' },
    { id: 'manager-stations', label: 'Trạm sạc & thống kê' },
    { id: 'manager-profile', label: 'Thông tin cá nhân' },
  ] satisfies { id: ManagerNavId; label: string }[]

  const citizenNavItems = [
    { id: 'citizen-find', label: 'Tìm trạm' },
    { id: 'citizen-history', label: 'Lịch sử sạc' },
    { id: 'citizen-favorites', label: 'Đã lưu' },
    { id: 'citizen-compare', label: 'So sánh' },
    { id: 'citizen-profile', label: 'Thông tin cá nhân' },
  ] satisfies { id: CitizenNavId; label: string }[]

  const adminNavItems = [
    { id: 'admin-users', label: 'Quản lý người dùng' },
    { id: 'admin-datasets', label: 'Datasets' },
    { id: 'admin-profile', label: 'Thông tin cá nhân' },
  ] satisfies { id: AdminNavId; label: string }[]

  const navItems =
    role === 'admin'
      ? adminNavItems
      : role === 'manager'
        ? managerNavItems
        : citizenNavItems

  const normalizedActiveNavId = navItems.some((item) => item.id === activeNavId)
    ? activeNavId
    : navItems[0]?.id ?? activeNavId

  let content
  if (role === 'admin') {
    if (normalizedActiveNavId === 'admin-profile') {
      content = <ProfilePage />
    } else {
      let section: 'users' | 'datasets' = 'users'
      if (normalizedActiveNavId === 'admin-datasets') {
        section = 'datasets'
      }
      content = <AdminPage section={section} />
    }
  } else if (role === 'manager') {
    if (normalizedActiveNavId === 'manager-profile') {
      content = <ProfilePage />
    } else {
      let section: 'overview' | 'realtime' | 'map' | 'stations' = 'overview'
      if (normalizedActiveNavId === 'manager-realtime') {
        section = 'realtime'
      } else if (normalizedActiveNavId === 'manager-map') {
        section = 'map'
      } else if (normalizedActiveNavId === 'manager-stations') {
        section = 'stations'
      }

      content = <DashboardPage section={section} />
    }
  } else if (role === 'citizen') {
    if (normalizedActiveNavId === 'citizen-find') {
      content = <CitizenPage />
    } else if (normalizedActiveNavId === 'citizen-history') {
      content = <CitizenHistoryPage />
    } else if (normalizedActiveNavId === 'citizen-favorites') {
      content = <FavoritesPage />
    } else if (normalizedActiveNavId === 'citizen-compare') {
      content = <ComparisonPage />
    } else if (normalizedActiveNavId === 'citizen-profile') {
      content = <ProfilePage />
    }
  }

  return (
    <AppLayout
      role={role}
      onRoleChange={() => {}}
      navItems={navItems}
      activeItemId={normalizedActiveNavId}
      onSelectNavItem={(id) => {
        setActiveNavId(id as ManagerNavId | CitizenNavId | AdminNavId)
      }}
    >
      {content}
    </AppLayout>
  )
}

export default App
