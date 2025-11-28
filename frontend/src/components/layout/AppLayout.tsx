/* SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Nguyen Ngoc Phu Ty
 * This file is part of ev-charging-app and is licensed under the
 * MIT License. See the LICENSE file in the project root for details.
 */

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import {
  Zap,
  BarChart3,
  Zap as RealtimeIcon,
  Map,
  Plug,
  Search,
  User,
  Briefcase,
  CheckCircle2,
  XCircle,
  Heart,
  Navigation,
} from 'lucide-react'

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

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000'

export function AppLayout({
  role,
  onRoleChange,
  navItems,
  activeItemId,
  onSelectNavItem,
  children,
}: AppLayoutProps) {
  const [healthStatus, setHealthStatus] = useState<'ok' | 'error' | 'checking'>('checking')

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch(`${API_BASE_URL}/health`)
        if (res.ok) {
          const data = (await res.json()) as { status: string }
          setHealthStatus(data.status === 'ok' ? 'ok' : 'error')
        } else {
          setHealthStatus('error')
        }
      } catch {
        setHealthStatus('error')
      }
    }

    void checkHealth()
    const interval = setInterval(checkHealth, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [])

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
                    {item.id.includes('favorites') && <Heart className="h-4 w-4" />}
                    {item.id.includes('compare') && <BarChart3 className="h-4 w-4" />}
                    {item.id.includes('route') && <Navigation className="h-4 w-4" />}
                    <span>{item.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
        <div className="border-t border-white/10 px-3 py-3 bg-[#0a2d47]/50 flex-shrink-0">
          <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-slate-100/60">
            Vai trò
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onRoleChange('manager')}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-200 ${
                role === 'manager'
                  ? 'bg-white text-[#124874] shadow-md'
                  : 'border border-white/20 text-slate-100 hover:bg-white/10 hover:border-white/30'
              }`}
            >
              <Briefcase className="h-3.5 w-3.5 inline mr-1" />
              Nhà quản lý
            </button>
            <button
              type="button"
              onClick={() => onRoleChange('citizen')}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-200 ${
                role === 'citizen'
                  ? 'bg-[#CF373D] text-white shadow-md hover:bg-[#b82e33]'
                  : 'border border-white/20 text-slate-100 hover:bg-white/10 hover:border-white/30'
              }`}
            >
              <User className="h-3.5 w-3.5 inline mr-1" />
              Người dân
            </button>
          </div>
        </div>
      </aside>
      <div className="flex min-h-screen flex-1 flex-col ml-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/50 bg-white/80 backdrop-blur-sm px-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="text-lg font-bold bg-gradient-to-r from-[#124874] to-[#0f3a5a] bg-clip-text text-transparent">
              EV Charging - Thành phố X
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
                healthStatus === 'ok'
                  ? 'bg-emerald-100 text-emerald-700'
                  : healthStatus === 'error'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-amber-100 text-amber-700'
              }`}
              title={
                healthStatus === 'ok'
                  ? 'Backend đang hoạt động bình thường'
                  : healthStatus === 'error'
                    ? 'Backend không phản hồi'
                    : 'Đang kiểm tra...'
              }
            >
              {healthStatus === 'ok' ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : healthStatus === 'error' ? (
                <XCircle className="h-3.5 w-3.5" />
              ) : (
                <Zap className="h-3.5 w-3.5 animate-pulse" />
              )}
              <span>
                {healthStatus === 'ok'
                  ? 'Backend OK'
                  : healthStatus === 'error'
                    ? 'Backend lỗi'
                    : 'Đang kiểm tra...'}
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-1.5 text-sm font-medium text-slate-700">
              {role === 'manager' ? (
                <Briefcase className="h-4 w-4" />
              ) : (
                <User className="h-4 w-4" />
              )}
              <span>{role === 'manager' ? 'Chế độ nhà quản lý' : 'Chế độ người dân'}</span>
            </div>
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


