/* SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Nguyen Ngoc Phu Ty
 * This file is part of ev-charging-app and is licensed under the
 * MIT License. See the LICENSE file in the project root for details.
 */

import type { ReactNode } from 'react'

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
  onRoleChange,
  navItems,
  activeItemId,
  onSelectNavItem,
  children,
}: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
      <aside className="flex w-56 flex-col border-r border-slate-200 bg-[#124874] text-white">
        <div className="flex h-12 items-center px-3">
          <div className="text-base font-semibold leading-tight">
            <div>Thành phố X</div>
            <div className="text-xs font-normal text-slate-100/80">
              Nền tảng dữ liệu đô thị mở
            </div>
          </div>
        </div>
        <nav className="flex-1 px-2 py-3 text-sm">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-100/70">
            Chức năng
          </div>
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = item.id === activeItemId
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onSelectNavItem(item.id)}
                    className={`flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm ${
                      isActive
                        ? 'bg-white text-[#124874]'
                        : 'text-slate-100 hover:bg-slate-100/10'
                    }`}
                  >
                    {item.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
        <div className="border-t border-slate-200/40 px-3 py-2 text-xs">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-100/80">
            Vai trò
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => onRoleChange('manager')}
              className={`flex-1 rounded-md px-2 py-1 text-xs font-medium ${
                role === 'manager'
                  ? 'bg-white text-[#124874]'
                  : 'border border-slate-100/60 text-slate-100 hover:bg-slate-100/10'
              }`}
            >
              Nhà quản lý
            </button>
            <button
              type="button"
              onClick={() => onRoleChange('citizen')}
              className={`flex-1 rounded-md px-2 py-1 text-xs font-medium ${
                role === 'citizen'
                  ? 'bg-[#CF373D] text-white'
                  : 'border border-slate-100/60 text-slate-100 hover:bg-slate-100/10'
              }`}
            >
              Người dân
            </button>
          </div>
        </div>
      </aside>
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex h-12 items-center justify-between border-b border-slate-200 bg-white px-4">
          <div className="text-base font-semibold text-slate-900">
            EV Charging - Thành phố X
          </div>
          <div className="text-sm text-slate-500">
            {role === 'manager' ? 'Chế độ nhà quản lý' : 'Chế độ người dân'}
          </div>
        </header>
        <main className="flex-1 bg-slate-50 px-6 py-6">
          <div className="mx-auto max-w-6xl space-y-4">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}


