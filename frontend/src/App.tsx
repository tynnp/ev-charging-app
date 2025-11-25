/* SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
 * This file is part of ev-charging-app and is licensed under the
 * MIT License. See the LICENSE file in the project root for details.
 */

import 'leaflet/dist/leaflet.css'
import './App.css'
import { AppLayout } from './components/layout/AppLayout'
import { PageHeader } from './components/layout/PageHeader'
import { DashboardPage } from './components/pages/DashboardPage'

function App() {
  return (
    <AppLayout>
      <PageHeader
        title="EV Charging – Thành phố X"
        subtitle="Dashboard dữ liệu mở NGSI-LD cho trạm sạc xe điện"
      />
      <DashboardPage />
    </AppLayout>
  )
}

export default App
