/* SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
 * This file is part of ev-charging-app and is licensed under the
 * MIT License. See the LICENSE file in the project root for details.
 */

import 'leaflet/dist/leaflet.css'
import './App.css'
import { useState } from 'react'
import { AppLayout } from './components/layout/AppLayout'
import { DashboardPage } from './components/pages/DashboardPage'
import { CitizenPage } from './components/pages/CitizenPage'
import { FavoritesPage } from './components/citizen/FavoritesPage'
import { ComparisonPage } from './components/citizen/ComparisonPage'

type ManagerNavId =
  | 'manager-overview'
  | 'manager-realtime'
  | 'manager-map'
  | 'manager-stations'

type CitizenNavId = 'citizen-find' | 'citizen-favorites' | 'citizen-compare'

function App() {
  const [role, setRole] = useState<'manager' | 'citizen'>('manager')
  const [activeNavId, setActiveNavId] = useState<ManagerNavId | CitizenNavId>('manager-overview')

  const managerNavItems = [
    { id: 'manager-overview', label: 'Tổng quan' },
    { id: 'manager-realtime', label: 'Phiên sạc thời gian thực' },
    { id: 'manager-map', label: 'Bản đồ & tìm gần' },
    { id: 'manager-stations', label: 'Trạm sạc & thống kê' },
  ] satisfies { id: ManagerNavId; label: string }[]

  const citizenNavItems = [
    { id: 'citizen-find', label: 'Tìm trạm' },
    { id: 'citizen-favorites', label: 'Yêu thích' },
    { id: 'citizen-compare', label: 'So sánh' },
  ] satisfies { id: CitizenNavId; label: string }[]

  const navItems = role === 'manager' ? managerNavItems : citizenNavItems

  const normalizedActiveNavId = navItems.some((item) => item.id === activeNavId)
    ? activeNavId
    : navItems[0]?.id ?? activeNavId

  let content
  if (role === 'manager') {
    let section: 'overview' | 'realtime' | 'map' | 'stations' = 'overview'
    if (normalizedActiveNavId === 'manager-realtime') {
      section = 'realtime'
    } else if (normalizedActiveNavId === 'manager-map') {
      section = 'map'
    } else if (normalizedActiveNavId === 'manager-stations') {
      section = 'stations'
    }

    content = <DashboardPage section={section} />
  } else if (role === 'citizen') {
    if (normalizedActiveNavId === 'citizen-find') {
      content = <CitizenPage />
    } else if (normalizedActiveNavId === 'citizen-favorites') {
      content = <FavoritesPage />
    } else if (normalizedActiveNavId === 'citizen-compare') {
      content = <ComparisonPage />
    }
  }

  return (
    <AppLayout
      role={role}
      onRoleChange={(nextRole) => {
        setRole(nextRole)
        setActiveNavId(
          nextRole === 'manager' ? 'manager-overview' : ('citizen-find' as CitizenNavId),
        )
      }}
      navItems={navItems}
      activeItemId={normalizedActiveNavId}
      onSelectNavItem={(id) => {
        setActiveNavId(id as ManagerNavId | CitizenNavId)
      }}
    >
      {content}
    </AppLayout>
  )
}

export default App
