/* SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
 * This file is part of ev-charging-app and is licensed under the
 * MIT License. See the LICENSE file in the project root for details.
 */

import { useEffect, useMemo, useState } from 'react'
import type { Dataset } from '../../types/ev'
import {
  Download,
  FileText,
  Loader2,
  AlertTriangle,
  Database,
  Eye,
  X,
} from 'lucide-react'

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000'

type DatasetsPanelProps = {
  className?: string
}

export function DatasetsPanel({ className }: DatasetsPanelProps) {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<Set<string>>(new Set())
  const [previewing, setPreviewing] = useState<Set<string>>(new Set())
  const [previewDataset, setPreviewDataset] = useState<Dataset | null>(null)
  const [previewContent, setPreviewContent] = useState<string>('')
  const [previewError, setPreviewError] = useState<string | null>(null)

  const prettyPreview = useMemo(() => {
    if (!previewContent) return ''
    if (previewContent.length <= 8000) return previewContent
    return `${previewContent.slice(0, 8000)}\n… (đã rút gọn)`
  }, [previewContent])

  useEffect(() => {
    void loadDatasets()
  }, [])

  async function loadDatasets() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`${API_BASE_URL}/datasets`)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const data = (await res.json()) as Dataset[]
      setDatasets(data)
    } catch (error) {
      console.error(error)
      const errorMessage = error instanceof Error && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))
        ? 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng của bạn.'
        : 'Không tải được danh sách datasets.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  async function handleDownload(dataset: Dataset) {
    try {
      setDownloading((prev) => new Set(prev).add(dataset.id))
      const res = await fetch(`${API_BASE_URL}${dataset.path}`)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = dataset.path.split('/').pop() ?? 'dataset.jsonld'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error(error)
      const errorMessage = error instanceof Error && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))
        ? 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng của bạn.'
        : `Không tải được dataset: ${dataset.title}`
      setError(errorMessage)
    } finally {
      setDownloading((prev) => {
        const next = new Set(prev)
        next.delete(dataset.id)
        return next
      })
    }
  }

  async function handlePreview(dataset: Dataset) {
    try {
      setPreviewDataset(dataset)
      setPreviewError(null)
      setPreviewContent('')
      setPreviewing((prev) => new Set(prev).add(dataset.id))

      const res = await fetch(`${API_BASE_URL}${dataset.path}`)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const text = await res.text()
      let formatted = text
      try {
        const json = JSON.parse(text)
        formatted = JSON.stringify(json, null, 2)
      } catch {
        // keep raw text if not valid JSON
      }
      setPreviewContent(formatted)
    } catch (error) {
      console.error(error)
      const errorMessage = error instanceof Error && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))
        ? 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng của bạn.'
        : 'Không thể xem trước dataset. Vui lòng thử lại sau.'
      setPreviewError(errorMessage)
    } finally {
      setPreviewing((prev) => {
        const next = new Set(prev)
        next.delete(dataset.id)
        return next
      })
    }
  }

  function handleClosePreview() {
    setPreviewDataset(null)
    setPreviewContent('')
    setPreviewError(null)
  }

  return (
    <section className={`rounded-xl sm:rounded-2xl border border-slate-200/50 bg-white/80 backdrop-blur-sm p-3 sm:p-4 md:p-6 shadow-lg ${className ?? ''}`}>
      <div className="mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
        <Database className="h-5 w-5 sm:h-6 sm:w-6 text-[#124874] flex-shrink-0" />
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 break-words">Datasets có sẵn</h2>
      </div>

      {loading && datasets.length === 0 ? (
        <div className="flex items-center justify-center py-8 sm:py-12">
          <div className="text-center px-4">
            <Loader2 className="h-8 w-8 sm:h-12 sm:w-12 animate-spin text-[#124874] mx-auto mb-3 sm:mb-4" />
            <p className="text-sm sm:text-base font-medium text-slate-600 break-words">Đang tải danh sách datasets...</p>
          </div>
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 sm:gap-3 rounded-lg sm:rounded-xl border-2 border-red-300 bg-gradient-to-r from-red-50 to-red-100 px-3 sm:px-4 md:px-5 py-2.5 sm:py-3 md:py-4 text-xs sm:text-sm font-semibold text-red-800 shadow-md"
        >
          <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 mt-0.5" />
          <span className="break-words">{error}</span>
        </div>
      ) : null}

      {!loading && datasets.length === 0 && !error ? (
        <div className="rounded-lg sm:rounded-xl bg-slate-50 p-4 sm:p-6 text-center">
          <p className="text-sm sm:text-base font-medium text-slate-600 break-words">Chưa có datasets nào.</p>
        </div>
      ) : null}

      {datasets.length > 0 ? (
        <div className="space-y-2 sm:space-y-3">
          {datasets.map((dataset) => (
            <div
              key={dataset.id}
              className="group rounded-lg sm:rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm transition-all hover:border-[#124874]/30 hover:shadow-md"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="mb-2 flex items-center gap-1.5 sm:gap-2">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-[#124874] flex-shrink-0" />
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 break-words">{dataset.title}</h3>
                  </div>
                  <p className="mb-2 text-xs sm:text-sm text-slate-600 break-words">{dataset.description}</p>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-slate-500">
                    <span className="rounded-full bg-slate-100 px-1.5 sm:px-2 py-0.5 sm:py-1 font-mono break-all">
                      {dataset.mediaType}
                    </span>
                    <span className="rounded-full bg-slate-100 px-1.5 sm:px-2 py-0.5 sm:py-1 font-mono break-all">
                      {dataset.path}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => void handleDownload(dataset)}
                    disabled={downloading.has(dataset.id)}
                    className="flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg border border-[#124874]/30 bg-gradient-to-r from-[#124874] to-[#0f3a5a] px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#124874] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 min-h-[40px] sm:min-h-[44px]"
                  >
                    {downloading.has(dataset.id) ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                        <span>Đang tải...</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span>Tải xuống</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handlePreview(dataset)}
                    disabled={previewing.has(dataset.id)}
                    className="flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg border border-slate-200 bg-white px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#124874]/40 hover:text-[#124874] focus:outline-none focus:ring-2 focus:ring-[#124874]/40 focus:ring-offset-2 disabled:opacity-50 min-h-[40px] sm:min-h-[44px]"
                  >
                    {previewing.has(dataset.id) ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                        <span>Đang mở…</span>
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span>Xem nhanh</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {previewDataset ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-2 sm:p-4">
          <div className="relative w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] rounded-xl sm:rounded-2xl bg-white p-3 sm:p-4 md:p-6 shadow-2xl overflow-hidden flex flex-col">
            <button
              type="button"
              onClick={handleClosePreview}
              className="absolute right-2 sm:right-4 top-2 sm:top-4 inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-100 hover:text-slate-700 z-10"
              aria-label="Đóng"
            >
              <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>

            <div className="mb-3 sm:mb-4 flex items-start gap-2 sm:gap-3 pr-8 sm:pr-12">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#124874] to-[#0f3a5a] text-white shadow-md flex-shrink-0">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-semibold text-slate-900 break-words">{previewDataset.title}</h3>
                <p className="text-xs sm:text-sm text-slate-500 break-words">{previewDataset.description}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-slate-100 px-1.5 sm:px-2 py-0.5 sm:py-1 font-mono break-all">
                    {previewDataset.mediaType}
                  </span>
                  <span className="rounded-full bg-slate-100 px-1.5 sm:px-2 py-0.5 sm:py-1 font-mono break-all">
                    {previewDataset.path}
                  </span>
                </div>
              </div>
            </div>

            {previewError ? (
              <div className="flex items-start gap-2 rounded-lg sm:rounded-xl border border-amber-300 bg-amber-50 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-amber-800 mb-3 sm:mb-4">
                <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 mt-0.5" />
                <span className="break-words">{previewError}</span>
              </div>
            ) : null}

            {!previewError ? (
              <div className="max-h-[60vh] sm:max-h-[65vh] overflow-auto rounded-lg sm:rounded-xl border border-slate-200 bg-slate-900/95 p-2 sm:p-3 md:p-4 flex-1 min-h-0">
                {previewing.has(previewDataset.id) && !previewContent ? (
                  <div className="flex items-center justify-center py-8 sm:py-16 text-slate-200">
                    <Loader2 className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 animate-spin flex-shrink-0" />
                    <span className="text-xs sm:text-sm break-words">Đang tải nội dung dataset…</span>
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap text-xs sm:text-sm text-emerald-100 break-words">
                    {prettyPreview || '— Không có dữ liệu để hiển thị —'}
                  </pre>
                )}
              </div>
            ) : null}

            <div className="mt-3 sm:mt-4 flex justify-end pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={handleClosePreview}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg bg-[#124874] px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f3a5a] min-h-[40px] sm:min-h-[44px]"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

