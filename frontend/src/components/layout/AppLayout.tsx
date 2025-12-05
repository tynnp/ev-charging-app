/* SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
 * This file is part of ev-charging-app and is licensed under the
 * MIT License. See the LICENSE file in the project root for details.
 */

import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  Zap,
  BarChart3,
  Zap as RealtimeIcon,
  Map,
  Plug,
  Search,
  Bookmark,
  Navigation,
  History,
  LogOut,
  UserCircle,
  Menu,
  X,
  Users,
  Database,
  Code,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

type UserRole = 'manager' | 'citizen' | 'admin'

type NavItem = {
  id: string
  label: string
}

type AppLayoutProps = {
  role: UserRole
  onRoleChange: (role: UserRole) => void
  navItems: NavItem[]
  activeItemId: string
  onSelectNavItem: (id: string) => void
  children: ReactNode
}

export function AppLayout({
  role,
  navItems,
  activeItemId,
  onSelectNavItem,
  children,
}: AppLayoutProps) {
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 text-slate-900 overflow-x-hidden w-full">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 flex flex-col border-r border-slate-200/50 bg-gradient-to-b from-[#124874] via-[#0f3a5a] to-[#124874] text-white shadow-xl z-50 transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div className="text-base font-bold leading-tight">
              <div>Quản lý trạm sạc</div>
              <div className="text-xs font-normal text-slate-100/70">
                Nền tảng dữ liệu đô thị mở
              </div>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 text-sm overflow-y-auto">
          <div className="mb-3 px-2 text-xs font-semibold uppercase tracking-wider text-slate-100/60">
            Chức năng
          </div>
          <ul className="space-y-1.5">
            {navItems.map((item) => {
              const isActive = item.id === activeItemId
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectNavItem(item.id)
                      setSidebarOpen(false)
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-white text-[#124874] shadow-md'
                        : 'text-slate-100 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {item.id.includes('overview') && (
                      <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    )}
                    {item.id.includes('realtime') && (
                      <RealtimeIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    )}
                    {item.id.includes('map') && <Map className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />}
                    {item.id.includes('stations') && (
                      <Plug className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    )}
                    {item.id.includes('find') && <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />}
                    {item.id.includes('history') && <History className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />}
                    {item.id.includes('favorites') && <Bookmark className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />}
                    {item.id.includes('compare') && <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />}
                    {item.id.includes('route') && <Navigation className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />}
                    {item.id.includes('profile') && <UserCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />}
                    {item.id.includes('admin-users') && <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />}
                    {item.id.includes('admin-datasets') && <Database className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />}
                    {item.id.includes('admin-ngsi-ld') && <Code className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />}
                    <span className="truncate">{item.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex min-h-screen flex-1 flex-col lg:ml-64 min-w-0 overflow-x-hidden">
        <header className="sticky top-0 z-20 flex h-14 sm:h-16 items-center justify-between border-b border-slate-200/50 bg-white/80 backdrop-blur-sm px-3 sm:px-4 md:px-6 shadow-sm min-w-0 w-full">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 sm:p-2 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0"
            >
              <Menu className="h-4 w-4 sm:h-5 sm:w-5 text-slate-700" />
            </button>
            <div className="text-sm sm:text-base md:text-lg font-bold bg-gradient-to-r from-[#124874] to-[#0f3a5a] bg-clip-text text-transparent truncate">
              EV Charging - Thành phố X
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0">
            {user && (
              <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 rounded-lg bg-slate-100 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <UserCircle className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600 flex-shrink-0" />
                  <div className="hidden sm:block text-xs sm:text-sm min-w-0">
                    <div className="font-medium text-slate-900 truncate max-w-[120px] md:max-w-none">
                      {user.name || user.username}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {role === 'admin' ? 'Quản trị viên' : role === 'manager' ? 'Nhà quản lý' : 'Người dân'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="rounded-lg p-1 sm:p-1.5 text-slate-600 hover:bg-slate-200 transition-colors flex-shrink-0"
                  title="Đăng xuất"
                >
                  <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 px-2 sm:px-3 md:px-4 lg:px-6 py-3 sm:py-4 md:py-6 lg:py-8 min-w-0 overflow-x-hidden">
          <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6 min-w-0 w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}


