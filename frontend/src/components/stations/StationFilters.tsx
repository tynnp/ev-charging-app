/* SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
 * This file is part of ev-charging-app and is licensed under the
 * MIT License. See the LICENSE file in the project root for details.
 */

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
  return (
    <section className="mb-3 flex flex-wrap items-end gap-3">
      <div className="flex flex-col space-y-1">
        <label className="text-xs font-medium text-slate-600">Trạng thái</label>
        <select
          value={status}
          onChange={(event) => onStatusChange(event.target.value)}
          className="min-w-[150px] rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">Tất cả</option>
          <option value="operational">Đang hoạt động</option>
          <option value="outOfService">Ngưng hoạt động</option>
          <option value="maintenance">Bảo trì</option>
        </select>
      </div>
      <div className="flex flex-col space-y-1">
        <label className="text-xs font-medium text-slate-600">Loại phương tiện</label>
        <select
          value={vehicleType}
          onChange={(event) => onVehicleTypeChange(event.target.value)}
          className="min-w-[170px] rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">Tất cả</option>
          <option value="electricMotorcycle">Xe máy điện</option>
          <option value="electricCar">Ô tô điện</option>
          <option value="electricBus">Xe buýt điện</option>
        </select>
      </div>
      <div className="flex flex-col space-y-1">
        <label className="text-xs font-medium text-slate-600">
          Số chỗ trống tối thiểu
        </label>
        <input
          type="number"
          min={0}
          value={minAvailable}
          onChange={(event) => onMinAvailableChange(event.target.value)}
          className="w-36 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div className="flex flex-col space-y-1">
        <label className="text-xs font-medium text-slate-600">Nhà mạng / network</label>
        <input
          type="text"
          value={network}
          onChange={(event) => onNetworkChange(event.target.value)}
          className="w-40 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          placeholder="VD: VN-EV"
        />
      </div>
      <div className="flex flex-col space-y-1">
        <label className="text-xs font-medium text-slate-600">Loại sạc (charge_type)</label>
        <input
          type="text"
          value={chargeType}
          onChange={(event) => onChargeTypeChange(event.target.value)}
          className="w-44 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          placeholder="VD: fastDC"
        />
      </div>
      <div className="flex flex-col space-y-1">
        <label className="text-xs font-medium text-slate-600">Chuẩn ổ cắm (socket_type)</label>
        <input
          type="text"
          value={socketType}
          onChange={(event) => onSocketTypeChange(event.target.value)}
          className="w-48 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          placeholder="VD: Type2"
        />
      </div>
      <div className="flex flex-col space-y-1">
        <label className="text-xs font-medium text-slate-600">
          Phương thức thanh toán (payment_method)
        </label>
        <input
          type="text"
          value={paymentMethod}
          onChange={(event) => onPaymentMethodChange(event.target.value)}
          className="w-56 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          placeholder="VD: cash, card, eWallet"
        />
      </div>
      <div className="flex flex-col space-y-1">
        <label className="text-xs font-medium text-slate-600">Công suất tối thiểu (kW)</label>
        <input
          type="number"
          min={0}
          value={minCapacity}
          onChange={(event) => onMinCapacityChange(event.target.value)}
          className="w-40 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div className="flex flex-col space-y-1">
        <label className="text-xs font-medium text-slate-600">Công suất tối đa (kW)</label>
        <input
          type="number"
          min={0}
          value={maxCapacity}
          onChange={(event) => onMaxCapacityChange(event.target.value)}
          className="w-40 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <button
        type="button"
        onClick={onApplyFilters}
        className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
      >
        Áp dụng
      </button>
    </section>
  )
}
