/* SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
 * This file is part of ev-charging-app and is licensed under the
 * MIT License. See the LICENSE file in the project root for details.
 */

import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { ToastContainer, type Toast } from '../common/Toast'
import { ConfirmationDialog } from '../common/ConfirmationDialog'
import {
  Code,
  Database,
  Trash2,
  Eye,
  Loader2,
  AlertTriangle,
  Copy,
  FileJson,
  Layers,
  X,
} from 'lucide-react'

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000'

type EntityType = {
  type: string
  description: string
  count: number
}

type EntityTypeDetail = {
  type: string
  count: number
  description: string
  sample_attributes?: string[]
}

type Entity = {
  id: string
  type: string
  [key: string]: any
}

function extractNGSIValue(value: any): string {
  if (value === null || value === undefined) {
    return ''
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (typeof value === 'object') {
    // NGSI-LD attribute structure: {type: "...", value: "..."}
    if ('value' in value) {
      return extractNGSIValue(value.value)
    }
    // If it's an array, join the values
    if (Array.isArray(value)) {
      return value.map((v) => extractNGSIValue(v)).join(', ')
    }
    // If it's a complex object, stringify it
    return JSON.stringify(value)
  }
  return String(value)
}

export function NGSILDManagement() {
  const { token } = useAuth()
  const [activeTab, setActiveTab] = useState<'entities' | 'types' | 'api-docs'>('entities')
  const [entityType, setEntityType] = useState<string>('EVChargingStation')
  const [entities, setEntities] = useState<Entity[]>([])
  const [types, setTypes] = useState<EntityType[]>([])
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null)
  const [typeDetail, setTypeDetail] = useState<EntityTypeDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean
    entityId: string | null
  }>({ isOpen: false, entityId: null })
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  useEffect(() => {
    if (!token) return
    if (activeTab === 'types') {
      void loadTypes()
    } else if (activeTab === 'entities') {
      void loadEntities()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, entityType, currentPage, token])

  function showToast(message: string, type: Toast['type'] = 'success') {
    const id = Math.random().toString(36).substring(7)
    setToasts((prev) => [...prev, { id, message, type }])
  }

  function removeToast(id: string) {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  async function loadTypes() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`${API_BASE_URL}/ngsi-ld/v1/types`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const data = await res.json()
      setTypes(data || [])
    } catch (error) {
      console.error(error)
      const errorMessage =
        error instanceof Error &&
        (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))
          ? 'Không thể kết nối đến máy chủ.'
          : 'Không tải được danh sách entity types.'
      setError(errorMessage)
      showToast(errorMessage, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function loadTypeDetail(typeName: string) {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`${API_BASE_URL}/ngsi-ld/v1/types/${typeName}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const data = await res.json()
      setTypeDetail(data)
    } catch (error) {
      console.error(error)
      const errorMessage =
        error instanceof Error ? error.message : 'Không tải được thông tin type.'
      setError(errorMessage)
      showToast(errorMessage, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function loadEntities() {
    try {
      setLoading(true)
      setError(null)
      const offset = (currentPage - 1) * pageSize
      const res = await fetch(
        `${API_BASE_URL}/ngsi-ld/v1/entities?type=${entityType}&limit=${pageSize}&offset=${offset}`,
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
      setEntities(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error(error)
      const errorMessage =
        error instanceof Error &&
        (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))
          ? 'Không thể kết nối đến máy chủ.'
          : 'Không tải được danh sách entities.'
      setError(errorMessage)
      showToast(errorMessage, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function loadEntityDetail(entityId: string) {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`${API_BASE_URL}/ngsi-ld/v1/entities/${entityId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const data = await res.json()
      setSelectedEntity(data)
    } catch (error) {
      console.error(error)
      const errorMessage =
        error instanceof Error ? error.message : 'Không tải được thông tin entity.'
      setError(errorMessage)
      showToast(errorMessage, 'error')
    } finally {
      setLoading(false)
    }
  }

  function handleDeleteClick(entityId: string) {
    setDeleteConfirm({ isOpen: true, entityId })
  }

  async function handleDeleteConfirm() {
    if (!deleteConfirm.entityId) return

    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`${API_BASE_URL}/ngsi-ld/v1/entities/${deleteConfirm.entityId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: 'Xóa thất bại' }))
        throw new Error(errorData.detail || 'Xóa thất bại')
      }
      await loadEntities()
      showToast('Đã xóa entity thành công', 'success')
      setDeleteConfirm({ isOpen: false, entityId: null })
      setSelectedEntity(null)
    } catch (error) {
      console.error(error)
      const errorMessage = error instanceof Error ? error.message : 'Không thể xóa entity.'
      setError(errorMessage)
      showToast(errorMessage, 'error')
    } finally {
      setLoading(false)
    }
  }

  function handleDeleteCancel() {
    setDeleteConfirm({ isOpen: false, entityId: null })
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    showToast('Đã sao chép vào clipboard', 'success')
  }

  const apiEndpoints = [
    {
      method: 'GET',
      path: '/ngsi-ld/v1/entities',
      description: 'Liệt kê các entities',
      params: '?type={type}&limit={limit}&offset={offset}',
    },
    {
      method: 'GET',
      path: '/ngsi-ld/v1/entities/{entity_id}',
      description: 'Lấy thông tin một entity theo ID',
    },
    {
      method: 'POST',
      path: '/ngsi-ld/v1/entities',
      description: 'Tạo hoặc cập nhật entity',
    },
    {
      method: 'DELETE',
      path: '/ngsi-ld/v1/entities/{entity_id}',
      description: 'Xóa entity',
    },
    {
      method: 'GET',
      path: '/ngsi-ld/v1/entities/{entity_id}/attrs',
      description: 'Lấy tất cả attributes của entity',
    },
    {
      method: 'GET',
      path: '/ngsi-ld/v1/entities/{entity_id}/attrs/{attr_name}',
      description: 'Lấy một attribute cụ thể',
    },
    {
      method: 'PATCH',
      path: '/ngsi-ld/v1/entities/{entity_id}/attrs',
      description: 'Cập nhật attributes của entity',
    },
    {
      method: 'PATCH',
      path: '/ngsi-ld/v1/entities/{entity_id}/attrs/{attr_name}',
      description: 'Cập nhật một attribute cụ thể',
    },
    {
      method: 'POST',
      path: '/ngsi-ld/v1/entities/{entity_id}/attrs',
      description: 'Thêm attributes mới vào entity',
    },
    {
      method: 'GET',
      path: '/ngsi-ld/v1/types',
      description: 'Liệt kê tất cả entity types',
    },
    {
      method: 'GET',
      path: '/ngsi-ld/v1/types/{type_name}',
      description: 'Lấy thông tin về một entity type',
    },
  ]

  return (
    <div className="flex flex-col gap-4 sm:gap-6 min-w-0 w-full">
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <ConfirmationDialog
        isOpen={deleteConfirm.isOpen}
        title="Xác nhận xóa entity"
        message={`Bạn có chắc chắn muốn xóa entity "${deleteConfirm.entityId}"? Hành động này không thể hoàn tác.`}
        confirmText="Xóa"
        cancelText="Hủy"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        variant="danger"
      />

      <section className="rounded-xl sm:rounded-2xl border border-slate-200/50 bg-white/80 backdrop-blur-sm p-3 sm:p-4 md:p-6 shadow-lg overflow-hidden min-w-0">
        <div className="mb-4 flex items-center gap-2">
          <Code className="h-5 w-5 sm:h-6 sm:w-6 text-[#124874] flex-shrink-0" />
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 break-words">
            Quản lý NGSI-LD APIs
          </h2>
        </div>

        <div className="mb-4 flex flex-wrap gap-2 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('entities')}
            className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === 'entities'
                ? 'border-[#124874] text-[#124874]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="h-4 w-4 inline mr-2" />
            Entities
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('types')}
            className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === 'types'
                ? 'border-[#124874] text-[#124874]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="h-4 w-4 inline mr-2" />
            Types
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('api-docs')}
            className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === 'api-docs'
                ? 'border-[#124874] text-[#124874]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileJson className="h-4 w-4 inline mr-2" />
            API Documentation
          </button>
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

        {activeTab === 'entities' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <label className="text-sm font-semibold text-slate-700">Entity Type:</label>
              <select
                value={entityType}
                onChange={(e) => {
                  setEntityType(e.target.value)
                  setCurrentPage(1)
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 bg-white shadow-sm focus:border-[#124874] focus:outline-none focus:ring-2 focus:ring-[#124874]/20"
              >
                <option value="EVChargingStation">EVChargingStation</option>
                <option value="EVChargingSession">EVChargingSession</option>
                <option value="Sensor">Sensor</option>
              </select>
            </div>

            {loading && entities.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#124874]" />
              </div>
            ) : entities.length === 0 ? (
              <div className="rounded-lg bg-slate-50 p-6 text-center">
                <p className="text-sm font-medium text-slate-600">Chưa có entities nào.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {entities.map((entity) => (
                  <div
                    key={entity.id}
                    className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-mono text-xs text-slate-500">
                            {extractNGSIValue(entity.type)}
                          </span>
                          <span className="font-semibold text-slate-900 break-all">
                            {extractNGSIValue(entity.id)}
                          </span>
                        </div>
                        {entity.name && (
                          <p className="text-sm text-slate-600 mb-2">
                            {extractNGSIValue(entity.name)}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => loadEntityDetail(entity.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-[#124874]/40 hover:text-[#124874]"
                        >
                          <Eye className="h-3 w-3" />
                          Xem
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(entity.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm transition hover:border-red-400 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                          Xóa
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {entities.length > 0 && (
                  <div className="flex justify-center gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1 || loading}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Trang trước
                    </button>
                    <span className="px-3 py-2 text-sm text-slate-600 flex items-center">
                      Trang {currentPage}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((prev) => prev + 1)}
                      disabled={entities.length < pageSize || loading}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Trang sau
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'types' && (
          <div className="space-y-4">
            {loading && types.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#124874]" />
              </div>
            ) : types.length === 0 ? (
              <div className="rounded-lg bg-slate-50 p-6 text-center">
                <p className="text-sm font-medium text-slate-600">Chưa có entity types nào.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                {types.map((type) => (
                  <div
                    key={type.type}
                    className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition cursor-pointer"
                    onClick={() => loadTypeDetail(type.type)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        loadTypeDetail(type.type)
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-slate-900">{type.type}</h3>
                      <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                        {type.count}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">{type.description}</p>
                  </div>
                ))}
              </div>
            )}

            {typeDetail && (
              <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-900">Chi tiết: {typeDetail.type}</h3>
                  <button
                    type="button"
                    onClick={() => setTypeDetail(null)}
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                    aria-label="Đóng"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="font-medium">Mô tả:</span> {typeDetail.description}
                  </p>
                  <p>
                    <span className="font-medium">Số lượng:</span> {typeDetail.count}
                  </p>
                  {typeDetail.sample_attributes && typeDetail.sample_attributes.length > 0 && (
                    <div>
                      <span className="font-medium">Attributes mẫu:</span>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {typeDetail.sample_attributes.map((attr) => (
                          <span
                            key={attr}
                            className="rounded bg-slate-100 px-2 py-1 text-xs font-mono text-slate-700"
                          >
                            {attr}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'api-docs' && (
          <div className="space-y-4">
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 mb-4">
              <p className="text-sm text-blue-800">
                <strong>NGSI-LD</strong> là tiêu chuẩn do ETSI ISG CIM ban hành để quản lý dữ liệu
                ngữ cảnh trong các hệ thống IoT và Smart City.
              </p>
            </div>

            <div className="space-y-3">
              {apiEndpoints.map((endpoint, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`px-2 py-1 text-xs font-bold rounded ${
                            endpoint.method === 'GET'
                              ? 'bg-green-100 text-green-800'
                              : endpoint.method === 'POST'
                                ? 'bg-blue-100 text-blue-800'
                                : endpoint.method === 'PATCH'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {endpoint.method}
                        </span>
                        <code className="text-sm font-mono text-slate-900 break-all">
                          {endpoint.path}
                          {endpoint.params && (
                            <span className="text-slate-500">{endpoint.params}</span>
                          )}
                        </code>
                      </div>
                      <p className="text-sm text-slate-600">{endpoint.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(`${API_BASE_URL}${endpoint.path}${endpoint.params || ''}`)
                      }
                      className="flex-shrink-0 rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                      title="Sao chép URL"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedEntity && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="relative w-full max-w-4xl max-h-[90vh] rounded-xl bg-white p-6 shadow-2xl overflow-auto">
              <button
                type="button"
                onClick={() => setSelectedEntity(null)}
                className="absolute right-4 top-4 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
              <h3 className="text-lg font-bold text-slate-900 mb-4">Entity Details</h3>
              <pre className="bg-slate-900 text-green-100 p-4 rounded-lg overflow-auto text-xs">
                {JSON.stringify(selectedEntity, null, 2)}
              </pre>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => copyToClipboard(JSON.stringify(selectedEntity, null, 2))}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  <Copy className="h-4 w-4 inline mr-2" />
                  Sao chép JSON
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEntity(null)}
                  className="rounded-lg bg-[#124874] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f3a5a]"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

