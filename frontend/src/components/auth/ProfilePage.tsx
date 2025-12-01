/* SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
 * This file is part of ev-charging-app and is licensed under the
 * MIT License. See the LICENSE file in the project root for details.
 */

import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { apiFetch } from '../../utils/api'
import { UserCircle, Mail, Phone, User, Save, Edit2 } from 'lucide-react'

export function ProfilePage() {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setEmail(user.email || '')
      setPhoneNumber('') // Phone number not in user object yet
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsLoading(true)

    try {
      const body: Record<string, string> = {}
      if (name) body.name = name
      if (email) body.email = email
      if (phoneNumber) body.phone_number = phoneNumber

      const response = await apiFetch('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Cập nhật thất bại' }))
        throw new Error(error.detail || 'Cập nhật thất bại')
      }

      setSuccess('Cập nhật thông tin thành công!')
      setIsEditing(false)
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Thông tin cá nhân</h1>
          <p className="mt-2 text-slate-600">Quản lý thông tin tài khoản của bạn</p>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#124874] to-[#0f3a5a] px-4 py-2 font-semibold text-white shadow-lg transition-all hover:shadow-xl"
          >
            <Edit2 className="h-4 w-4" />
            Chỉnh sửa
          </button>
        )}
      </div>

      <div className="rounded-2xl bg-white p-8 shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Tên đăng nhập
              </label>
              <div className="relative">
                <UserCircle className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={user?.username || ''}
                  disabled
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-4 text-slate-600 cursor-not-allowed"
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">Tên đăng nhập không thể thay đổi</p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Vai trò
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={user?.role === 'manager' ? 'Nhà quản lý' : 'Người dân'}
                  disabled
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-4 text-slate-600 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Họ và tên
              </label>
              <div className="relative">
                <UserCircle className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isEditing}
                  className={`w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-slate-900 placeholder-slate-400 focus:border-[#124874] focus:outline-none focus:ring-2 focus:ring-[#124874]/20 ${
                    !isEditing ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
                  }`}
                  placeholder="Nhập họ và tên"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!isEditing}
                  className={`w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-slate-900 placeholder-slate-400 focus:border-[#124874] focus:outline-none focus:ring-2 focus:ring-[#124874]/20 ${
                    !isEditing ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
                  }`}
                  placeholder="Nhập email"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Số điện thoại
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={!isEditing}
                  className={`w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-slate-900 placeholder-slate-400 focus:border-[#124874] focus:outline-none focus:ring-2 focus:ring-[#124874]/20 ${
                    !isEditing ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
                  }`}
                  placeholder="Nhập số điện thoại"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-700">
              {success}
            </div>
          )}

          {isEditing && (
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false)
                  setError('')
                  setSuccess('')
                  if (user) {
                    setName(user.name || '')
                    setEmail(user.email || '')
                    setPhoneNumber('')
                  }
                }}
                className="flex-1 rounded-lg border border-slate-300 bg-white py-2.5 font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 rounded-lg bg-gradient-to-r from-[#124874] to-[#0f3a5a] py-2.5 font-semibold text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Lưu thay đổi
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

