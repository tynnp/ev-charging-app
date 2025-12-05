/* SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
 * This file is part of ev-charging-app and is licensed under the
 * MIT License. See the LICENSE file in the project root for details.
 */

import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { DatasetsPanel } from '../datasets/DatasetsPanel'
import { NGSILDManagement } from './NGSILDManagement'
import { ToastContainer, type Toast } from '../common/Toast'
import { ConfirmationDialog } from '../common/ConfirmationDialog'
import {
  Users,
  Lock,
  Unlock,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000'

type User = {
  id: string
  username: string
  email?: string
  name?: string
  role: 'citizen' | 'manager' | 'admin'
  is_locked?: boolean
}

type AdminPageProps = {
  section: 'users' | 'datasets' | 'ngsi-ld'
}

export function AdminPage({ section }: AdminPageProps) {
  const { user, token } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState<Set<string>>(new Set())
  const [toasts, setToasts] = useState<Toast[]>([])
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean
    userId: string | null
    username: string
  }>({ isOpen: false, userId: null, username: '' })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  const pageSize = 10

  useEffect(() => {
    if (section === 'users') {
      void loadUsers()
    }
  }, [section, currentPage])

  async function loadUsers() {
    try {
      setLoading(true)
      setError(null)
      const offset = (currentPage - 1) * pageSize
      const res = await fetch(
        `${API_BASE_URL}/admin/users?limit=${pageSize}&offset=${offset}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const data = await res.json()
      const newTotal = data.total || 0
      setUsers(data.users || [])
      setTotalUsers(newTotal)
      
      const totalPages = Math.ceil(newTotal / pageSize)
      if (currentPage > totalPages && totalPages > 0) {
        setCurrentPage(totalPages)
      }
    } catch (error) {
      console.error(error)
      const errorMessage =
        error instanceof Error &&
        (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))
          ? 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng của bạn.'
          : 'Không tải được danh sách người dùng.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  function showToast(message: string, type: Toast['type'] = 'success') {
    const id = Math.random().toString(36).substring(7)
    setToasts((prev) => [...prev, { id, message, type }])
  }

  function removeToast(id: string) {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  async function handleUpdateRole(userId: string, newRole: 'citizen' | 'manager' | 'admin') {
    try {
      setUpdating((prev) => new Set(prev).add(userId))
      setError(null)
      const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: 'Cập nhật thất bại' }))
        throw new Error(errorData.detail || 'Cập nhật thất bại')
      }
      await loadUsers()
      const roleLabel = getRoleLabel(newRole)
      showToast(`Đã cập nhật vai trò thành ${roleLabel}`, 'success')
    } catch (error) {
      console.error(error)
      const errorMessage =
        error instanceof Error ? error.message : 'Không thể cập nhật vai trò người dùng.'
      setError(errorMessage)
      showToast(errorMessage, 'error')
    } finally {
      setUpdating((prev) => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
    }
  }

  async function handleToggleLock(userId: string, isLocked: boolean) {
    try {
      setUpdating((prev) => new Set(prev).add(userId))
      setError(null)
      const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/lock?is_locked=${isLocked}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: 'Cập nhật thất bại' }))
        throw new Error(errorData.detail || 'Cập nhật thất bại')
      }
      await loadUsers()
      showToast(isLocked ? 'Đã khóa tài khoản người dùng' : 'Đã mở khóa tài khoản người dùng', 'success')
    } catch (error) {
      console.error(error)
      const errorMessage =
        error instanceof Error ? error.message : 'Không thể khóa/mở khóa người dùng.'
      setError(errorMessage)
      showToast(errorMessage, 'error')
    } finally {
      setUpdating((prev) => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
    }
  }

  function handleDeleteClick(userId: string) {
    const user = users.find((u) => u.id === userId)
    if (user) {
      setDeleteConfirm({
        isOpen: true,
        userId,
        username: user.username,
      })
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteConfirm.userId) return

    try {
      setDeleting((prev) => new Set(prev).add(deleteConfirm.userId!))
      setError(null)
      const res = await fetch(`${API_BASE_URL}/admin/users/${deleteConfirm.userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: 'Xóa thất bại' }))
        throw new Error(errorData.detail || 'Xóa thất bại')
      }
      await loadUsers()
      showToast('Đã xóa người dùng thành công', 'success')
      setDeleteConfirm({ isOpen: false, userId: null, username: '' })
    } catch (error) {
      console.error(error)
      const errorMessage =
        error instanceof Error ? error.message : 'Không thể xóa người dùng.'
      setError(errorMessage)
      showToast(errorMessage, 'error')
    } finally {
      setDeleting((prev) => {
        const next = new Set(prev)
        next.delete(deleteConfirm.userId!)
        return next
      })
    }
  }

  function handleDeleteCancel() {
    setDeleteConfirm({ isOpen: false, userId: null, username: '' })
  }

  function getRoleLabel(role: string) {
    switch (role) {
      case 'admin':
        return 'Quản trị viên'
      case 'manager':
        return 'Nhà quản lý'
      case 'citizen':
        return 'Người dân'
      default:
        return role
    }
  }

  if (section === 'datasets') {
    return (
      <div className="flex flex-col gap-4 sm:gap-6 min-w-0 w-full">
        <DatasetsPanel />
      </div>
    )
  }

  if (section === 'ngsi-ld') {
    return (
      <div className="flex flex-col gap-4 sm:gap-6 min-w-0 w-full">
        <NGSILDManagement />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6 min-w-0 w-full">
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <ConfirmationDialog
        isOpen={deleteConfirm.isOpen}
        title="Xác nhận xóa người dùng"
        message={`Bạn có chắc chắn muốn xóa người dùng "${deleteConfirm.username}"? Hành động này không thể hoàn tác.`}
        confirmText="Xóa"
        cancelText="Hủy"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        variant="danger"
      />
      <section className="rounded-xl sm:rounded-2xl border border-slate-200/50 bg-white/80 backdrop-blur-sm p-3 sm:p-4 md:p-6 shadow-lg overflow-hidden min-w-0">
        <div className="mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
          <Users className="h-5 w-5 sm:h-6 sm:w-6 text-[#124874] flex-shrink-0" />
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 break-words">
            Quản lý người dùng
          </h2>
        </div>

        {error ? (
          <div
            role="alert"
            className="flex items-start gap-2 sm:gap-3 rounded-lg sm:rounded-xl border-2 border-red-300 bg-gradient-to-r from-red-50 to-red-100 px-3 sm:px-4 md:px-5 py-2.5 sm:py-3 md:py-4 text-xs sm:text-sm font-semibold text-red-800 shadow-md mb-4"
          >
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 mt-0.5" />
            <span className="break-words">{error}</span>
          </div>
        ) : null}

        {loading && users.length === 0 ? (
          <div className="flex items-center justify-center py-8 sm:py-12">
            <div className="text-center px-4">
              <Loader2 className="h-8 w-8 sm:h-12 sm:w-12 animate-spin text-[#124874] mx-auto mb-3 sm:mb-4" />
              <p className="text-sm sm:text-base font-medium text-slate-600 break-words">
                Đang tải danh sách người dùng...
              </p>
            </div>
          </div>
        ) : null}

        {!loading && users.length === 0 && !error ? (
          <div className="rounded-lg sm:rounded-xl bg-slate-50 p-4 sm:p-6 text-center">
            <p className="text-sm sm:text-base font-medium text-slate-600 break-words">
              Chưa có người dùng nào.
            </p>
          </div>
        ) : null}

        {users.length > 0 || loading ? (
          <div className="w-full overflow-x-auto rounded-lg sm:rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="min-w-[800px]">
              <table className="w-full border-collapse text-xs sm:text-sm">
                <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                  <tr>
                    <th className="border-b border-slate-200 px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold text-slate-700">
                      Tên đăng nhập
                    </th>
                    <th className="border-b border-slate-200 px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold text-slate-700">
                      Tên
                    </th>
                    <th className="border-b border-slate-200 px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold text-slate-700">
                      Email
                    </th>
                    <th className="border-b border-slate-200 px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold text-slate-700">
                      Vai trò
                    </th>
                    <th className="border-b border-slate-200 px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold text-slate-700">
                      Trạng thái
                    </th>
                    <th className="border-b border-slate-200 px-2 sm:px-4 py-2 sm:py-3 text-center font-semibold text-slate-700">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, index) => {
                    const isCurrentUser = u.id === user?.id
                    const isUpdating = updating.has(u.id)
                    const isDeleting = deleting.has(u.id)
                    return (
                      <tr
                        key={u.id}
                        className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}
                      >
                        <td className="border-b border-slate-100 px-2 sm:px-4 py-2 sm:py-2.5 font-medium text-slate-700 text-xs sm:text-sm break-words min-w-0">
                          {u.username}
                          {isCurrentUser ? (
                            <span className="ml-2 text-xs text-slate-500">(Bạn)</span>
                          ) : null}
                        </td>
                        <td className="border-b border-slate-100 px-2 sm:px-4 py-2 sm:py-2.5 text-slate-700 text-xs sm:text-sm break-words min-w-0">
                          {u.name || '-'}
                        </td>
                        <td className="border-b border-slate-100 px-2 sm:px-4 py-2 sm:py-2.5 text-slate-700 text-xs sm:text-sm break-words min-w-0">
                          {u.email || '-'}
                        </td>
                        <td className="border-b border-slate-100 px-2 sm:px-4 py-2 sm:py-2.5 text-slate-700 text-xs sm:text-sm">
                          <select
                            value={u.role}
                            onChange={(e) =>
                              handleUpdateRole(u.id, e.target.value as 'citizen' | 'manager' | 'admin')
                            }
                            disabled={isCurrentUser || isUpdating}
                            className="rounded-lg border border-slate-300 px-2 py-1 text-xs sm:text-sm font-medium text-slate-900 bg-white shadow-sm transition-all focus:border-[#124874] focus:outline-none focus:ring-2 focus:ring-[#124874]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="citizen">Người dân</option>
                            <option value="manager">Nhà quản lý</option>
                            <option value="admin">Quản trị viên</option>
                          </select>
                        </td>
                        <td className="border-b border-slate-100 px-2 sm:px-4 py-2 sm:py-2.5 text-slate-700 text-xs sm:text-sm">
                          <div className="flex items-center gap-2">
                            {u.is_locked ? (
                              <>
                                <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-600" />
                                <span className="text-red-600 font-medium">Đã khóa</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600" />
                                <span className="text-green-600 font-medium">Hoạt động</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="border-b border-slate-100 px-2 sm:px-4 py-2 sm:py-2.5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleLock(u.id, !u.is_locked)}
                              disabled={isCurrentUser || isUpdating || isDeleting}
                              className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-[#124874]/40 hover:text-[#124874] focus:outline-none focus:ring-2 focus:ring-[#124874]/40 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              title={u.is_locked ? 'Mở khóa' : 'Khóa'}
                            >
                              {isUpdating ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : u.is_locked ? (
                                <Unlock className="h-3 w-3" />
                              ) : (
                                <Lock className="h-3 w-3" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(u.id)}
                              disabled={isCurrentUser || isDeleting || isUpdating}
                              className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-200 bg-white px-2 py-1 text-xs font-semibold text-red-700 shadow-sm transition hover:border-red-400 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Xóa"
                            >
                              {isDeleting && deleting.has(u.id) ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {totalUsers > 0 && (
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-slate-600">
              Hiển thị{' '}
              <span className="font-semibold">
                {users.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
              </span>
              {' - '}
              <span className="font-semibold">
                {Math.min(currentPage * pageSize, totalUsers)}
              </span>{' '}
              trong tổng số <span className="font-semibold">{totalUsers}</span> người dùng
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || loading}
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-[#124874]/40 hover:text-[#124874] focus:outline-none focus:ring-2 focus:ring-[#124874]/40 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-slate-300 disabled:hover:text-slate-700"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Trang trước</span>
                <span className="sm:hidden">Trước</span>
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.ceil(totalUsers / pageSize) }, (_, i) => i + 1)
                  .filter((page) => {
                    const totalPages = Math.ceil(totalUsers / pageSize)
                    if (totalPages <= 7) return true
                    if (page === 1 || page === totalPages) return true
                    if (Math.abs(page - currentPage) <= 1) return true
                    return false
                  })
                  .map((page, index, array) => {
                    const prevPage = array[index - 1]
                    const showEllipsis = prevPage && page - prevPage > 1
                    return (
                      <div key={page} className="flex items-center gap-1">
                        {showEllipsis && (
                          <span className="px-2 text-sm text-slate-500">...</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          disabled={loading}
                          className={`min-w-[2.5rem] rounded-lg border px-3 py-2 text-sm font-semibold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                            currentPage === page
                              ? 'border-[#124874] bg-[#124874] text-white focus:ring-[#124874]/40'
                              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-[#124874]/40 hover:text-[#124874] focus:ring-[#124874]/40'
                          }`}
                        >
                          {page}
                        </button>
                      </div>
                    )
                  })}
              </div>
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(Math.ceil(totalUsers / pageSize), prev + 1))
                }
                disabled={
                  currentPage >= Math.ceil(totalUsers / pageSize) || loading
                }
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-[#124874]/40 hover:text-[#124874] focus:outline-none focus:ring-2 focus:ring-[#124874]/40 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-slate-300 disabled:hover:text-slate-700"
              >
                <span className="hidden sm:inline">Trang sau</span>
                <span className="sm:hidden">Sau</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}