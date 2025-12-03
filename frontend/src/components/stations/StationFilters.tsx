/* SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
 * This file is part of ev-charging-app and is licensed under the
 * MIT License. See the LICENSE file in the project root for details.
 */

import { useState } from 'react'

import {
  Search,
  BarChart3,
  Car,
  CheckCircle2,
  Globe,
  Zap,
  Plug,
  CreditCard,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

const NETWORK_OPTIONS = [
  'CityEV Network',
  'NowCharge Network',
  'CityPark EV',
  'VinCity Charge',
  'SaigonSouth EV',
  'ThuDuc EV Network',
  'Airport EV',
  'Intercity EV Network',
  'Downtown EV',
]

const CHARGE_TYPE_OPTIONS = ['flat', 'monthlyPayment', 'free', 'annualPayment', 'other']

const SOCKET_TYPE_OPTIONS = [
  'Type2',
  'CCS/SAE',
  'CHAdeMO',
  'Tesla',
  'Type3',
  'Wall_Euro',
  'Caravan_Mains_Socket',
]

const PAYMENT_METHOD_OPTIONS = [
  'Cash',
  'PayPal',
  'DirectDebit',
  'ByInvoice',
  'ByBankTransferInAdvance',
  'GoogleCheckout',
]

type StationFiltersProps = {
  status: string
  vehicleType: string
  minAvailable: string
  network: string
  chargeType: string
  socketType: string
  paymentMethod: string
  minCapacity: string
  maxCapacity: string
  onStatusChange: (value: string) => void
  onVehicleTypeChange: (value: string) => void
  onMinAvailableChange: (value: string) => void
  onNetworkChange: (value: string) => void
  onChargeTypeChange: (value: string) => void
  onSocketTypeChange: (value: string) => void
  onPaymentMethodChange: (value: string) => void
  onMinCapacityChange: (value: string) => void
  onMaxCapacityChange: (value: string) => void
  onApplyFilters: () => void
}

export function StationFilters({
  status,
  vehicleType,
  minAvailable,
  network,
  chargeType,
  socketType,
  paymentMethod,
  minCapacity,
  maxCapacity,
  onStatusChange,
  onVehicleTypeChange,
  onMinAvailableChange,
  onNetworkChange,
  onChargeTypeChange,
  onSocketTypeChange,
  onPaymentMethodChange,
  onMinCapacityChange,
  onMaxCapacityChange,
  onApplyFilters,
}: StationFiltersProps) {
  const [isFiltersVisible, setIsFiltersVisible] = useState(false)

  return (
    <section className="mb-4 rounded-xl border border-slate-200/50 bg-gradient-to-br from-white to-slate-50/50 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-[#124874]" />
          <h3 className="text-sm font-bold text-slate-900">Bộ lọc tìm kiếm</h3>
        </div>
        <button
          type="button"
          onClick={() => setIsFiltersVisible(!isFiltersVisible)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-all hover:border-[#124874] hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#124874]/20"
        >
          {isFiltersVisible ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              Ẩn bộ lọc
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              Hiện bộ lọc
            </>
          )}
        </button>
      </div>
      {isFiltersVisible && (
        <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <BarChart3 className="h-3.5 w-3.5" />
            Trạng thái
          </label>
          <select
            value={status}
            onChange={(event) => onStatusChange(event.target.value)}
            className="min-w-[150px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium shadow-sm transition-all focus:border-[#124874] focus:outline-none focus:ring-2 focus:ring-[#124874]/20"
          >
            <option value="">Tất cả</option>
            <option value="operational">Đang hoạt động</option>
            <option value="outOfService">Ngưng hoạt động</option>
            <option value="maintenance">Bảo trì</option>
          </select>
        </div>
        <div className="flex flex-col space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <Car className="h-3.5 w-3.5" />
            Loại phương tiện
          </label>
          <select
            value={vehicleType}
            onChange={(event) => onVehicleTypeChange(event.target.value)}
            className="min-w-[170px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium shadow-sm transition-all focus:border-[#124874] focus:outline-none focus:ring-2 focus:ring-[#124874]/20"
          >
            <option value="">Tất cả</option>
            <option value="electricMotorcycle">Xe máy điện</option>
            <option value="electricCar">Ô tô điện</option>
            <option value="electricBus">Xe buýt điện</option>
          </select>
        </div>
        <div className="flex flex-col space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Số chỗ trống tối thiểu
          </label>
          <input
            type="number"
            min={0}
            value={minAvailable}
            onChange={(event) => onMinAvailableChange(event.target.value)}
            className="w-36 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium shadow-sm transition-all focus:border-[#124874] focus:outline-none focus:ring-2 focus:ring-[#124874]/20"
          />
        </div>
        <div className="flex flex-col space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <Globe className="h-3.5 w-3.5" />
            Nhà mạng / network
          </label>
          <select
            value={network}
            onChange={(event) => onNetworkChange(event.target.value)}
            className="min-w-[190px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium shadow-sm transition-all focus:border-[#124874] focus:outline-none focus:ring-2 focus:ring-[#124874]/20"
          >
            <option value="">Tất cả</option>
            {NETWORK_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <Zap className="h-3.5 w-3.5" />
            Loại sạc (charge_type)
          </label>
          <select
            value={chargeType}
            onChange={(event) => onChargeTypeChange(event.target.value)}
            className="min-w-[180px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium shadow-sm transition-all focus:border-[#124874] focus:outline-none focus:ring-2 focus:ring-[#124874]/20"
          >
            <option value="">Tất cả</option>
            {CHARGE_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <Plug className="h-3.5 w-3.5" />
            Chuẩn ổ cắm (socket_type)
          </label>
          <select
            value={socketType}
            onChange={(event) => onSocketTypeChange(event.target.value)}
            className="min-w-[200px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium shadow-sm transition-all focus:border-[#124874] focus:outline-none focus:ring-2 focus:ring-[#124874]/20"
          >
            <option value="">Tất cả</option>
            {SOCKET_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <CreditCard className="h-3.5 w-3.5" />
            Phương thức thanh toán
          </label>
          <select
            value={paymentMethod}
            onChange={(event) => onPaymentMethodChange(event.target.value)}
            className="min-w-[220px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium shadow-sm transition-all focus:border-[#124874] focus:outline-none focus:ring-2 focus:ring-[#124874]/20"
          >
            <option value="">Tất cả</option>
            {PAYMENT_METHOD_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <Zap className="h-3.5 w-3.5" />
            Công suất tối thiểu (kW)
          </label>
          <input
            type="number"
            min={0}
            value={minCapacity}
            onChange={(event) => onMinCapacityChange(event.target.value)}
            className="w-40 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium shadow-sm transition-all focus:border-[#124874] focus:outline-none focus:ring-2 focus:ring-[#124874]/20"
          />
        </div>
        <div className="flex flex-col space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <Zap className="h-3.5 w-3.5" />
            Công suất tối đa (kW)
          </label>
          <input
            type="number"
            min={0}
            value={maxCapacity}
            onChange={(event) => onMaxCapacityChange(event.target.value)}
            className="w-40 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium shadow-sm transition-all focus:border-[#124874] focus:outline-none focus:ring-2 focus:ring-[#124874]/20"
          />
        </div>
        <button
          type="button"
          onClick={onApplyFilters}
          className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-gradient-to-r from-[#124874] to-[#0f3a5a] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#124874] focus:ring-offset-2"
        >
          Áp dụng
        </button>
        </div>
      )}
    </section>
  )
}
