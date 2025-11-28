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
      setError('Không tải được danh sách datasets.')
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
      setError(`Không tải được dataset: ${dataset.title}`)
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
      setPreviewError('Không thể xem trước dataset. Vui lòng thử lại sau.')
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
    <section className={`rounded-2xl border border-slate-200/50 bg-white/80 backdrop-blur-sm p-6 shadow-lg ${className ?? ''}`}>
      <div className="mb-4 flex items-center gap-2">
        <Database className="h-6 w-6 text-[#124874]" />
        <h2 className="text-xl font-bold text-slate-900">Datasets có sẵn</h2>
      </div>

      {loading && datasets.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-[#124874] mx-auto mb-4" />
            <p className="text-base font-medium text-slate-600">Đang tải danh sách datasets...</p>
          </div>
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-xl border-2 border-red-300 bg-gradient-to-r from-red-50 to-red-100 px-5 py-4 text-sm font-semibold text-red-800 shadow-md"
        >
          <AlertTriangle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      ) : null}

      {!loading && datasets.length === 0 && !error ? (
        <div className="rounded-xl bg-slate-50 p-6 text-center">
          <p className="text-base font-medium text-slate-600">Chưa có datasets nào.</p>
        </div>
      ) : null}

      {datasets.length > 0 ? (
        <div className="space-y-3">
          {datasets.map((dataset) => (
            <div
              key={dataset.id}
              className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-[#124874]/30 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-[#124874]" />
                    <h3 className="text-base font-bold text-slate-900">{dataset.title}</h3>
                  </div>
                  <p className="mb-2 text-sm text-slate-600">{dataset.description}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="rounded-full bg-slate-100 px-2 py-1 font-mono">
                      {dataset.mediaType}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 font-mono">
                      {dataset.path}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDownload(dataset)}
                  disabled={downloading.has(dataset.id)}
                  className="flex items-center gap-2 rounded-lg border border-[#124874]/30 bg-gradient-to-r from-[#124874] to-[#0f3a5a] px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#124874] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {downloading.has(dataset.id) ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Đang tải...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      <span>Tải xuống</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void handlePreview(dataset)}
                  disabled={previewing.has(dataset.id)}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#124874]/40 hover:text-[#124874] focus:outline-none focus:ring-2 focus:ring-[#124874]/40 focus:ring-offset-2 disabled:opacity-50"
                >
                  {previewing.has(dataset.id) ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Đang mở…</span>
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" />
                      <span>Xem nhanh</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {previewDataset ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
          <div className="relative w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={handleClosePreview}
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Đóng"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#124874] to-[#0f3a5a] text-white shadow-md">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{previewDataset.title}</h3>
                <p className="text-sm text-slate-500">{previewDataset.description}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-slate-100 px-2 py-1 font-mono">
                    {previewDataset.mediaType}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 font-mono">
                    {previewDataset.path}
                  </span>
                </div>
              </div>
            </div>

            {previewError ? (
              <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                <span>{previewError}</span>
              </div>
            ) : null}

            {!previewError ? (
              <div className="max-h-[65vh] overflow-auto rounded-xl border border-slate-200 bg-slate-900/95 p-4">
                {previewing.has(previewDataset.id) && !previewContent ? (
                  <div className="flex items-center justify-center py-16 text-slate-200">
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                    <span>Đang tải nội dung dataset…</span>
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap text-sm text-emerald-100">
                    {prettyPreview || '— Không có dữ liệu để hiển thị —'}
                  </pre>
                )}
              </div>
            ) : null}

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleClosePreview}
                className="inline-flex items-center gap-2 rounded-lg bg-[#124874] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f3a5a]"
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

