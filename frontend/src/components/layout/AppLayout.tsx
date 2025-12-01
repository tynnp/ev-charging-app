/* SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
 * This file is part of ev-charging-app and is licensed under the
 * MIT License. See the LICENSE file in the project root for details.
 */

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
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

type UserRole = 'manager' | 'citizen'

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

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 text-slate-900">
      <aside className="fixed left-0 top-0 h-screen w-64 flex flex-col border-r border-slate-200/50 bg-gradient-to-b from-[#124874] via-[#0f3a5a] to-[#124874] text-white shadow-xl z-30">
        <div className="flex h-16 items-center px-4 border-b border-white/10 flex-shrink-0">
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
                    onClick={() => onSelectNavItem(item.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-white text-[#124874] shadow-md'
                        : 'text-slate-100 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {item.id.includes('overview') && (
                      <BarChart3 className="h-4 w-4" />
                    )}
                    {item.id.includes('realtime') && (
                      <RealtimeIcon className="h-4 w-4" />
                    )}
                    {item.id.includes('map') && <Map className="h-4 w-4" />}
                    {item.id.includes('stations') && (
                      <Plug className="h-4 w-4" />
                    )}
                    {item.id.includes('find') && <Search className="h-4 w-4" />}
                    {item.id.includes('history') && <History className="h-4 w-4" />}
                    {item.id.includes('favorites') && <Bookmark className="h-4 w-4" />}
                    {item.id.includes('compare') && <BarChart3 className="h-4 w-4" />}
                    {item.id.includes('route') && <Navigation className="h-4 w-4" />}
                    {item.id.includes('profile') && <UserCircle className="h-4 w-4" />}
                    <span>{item.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>
      <div className="flex min-h-screen flex-1 flex-col ml-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/50 bg-white/80 backdrop-blur-sm px-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="text-lg font-bold bg-gradient-to-r from-[#124874] to-[#0f3a5a] bg-clip-text text-transparent">
              EV Charging - Thành phố X
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-3 rounded-lg bg-slate-100 px-4 py-2">
                <div className="flex items-center gap-2">
                  <UserCircle className="h-5 w-5 text-slate-600" />
                  <div className="text-sm">
                    <div className="font-medium text-slate-900">
                      {user.name || user.username}
                    </div>
                    <div className="text-xs text-slate-500">
                      {role === 'manager' ? 'Nhà quản lý' : 'Người dân'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="ml-2 rounded-lg p-1.5 text-slate-600 hover:bg-slate-200 transition-colors"
                  title="Đăng xuất"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 px-6 py-8">
          <div className="mx-auto max-w-7xl space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}


