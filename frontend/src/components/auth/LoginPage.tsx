/* SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
 * This file is part of ev-charging-app and is licensed under the
 * MIT License. See the LICENSE file in the project root for details.
 */

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { User, Lock, Mail, UserCircle, KeyRound, TimerReset, Eye, EyeOff } from 'lucide-react'

export function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const role = 'citizen' // Mặc định là người dân
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [otpStep, setOtpStep] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null)
  const [remainingSeconds, setRemainingSeconds] = useState(0)

  const { login, register, verifyRegistration } = useAuth()

  useEffect(() => {
    if (!otpStep || !otpExpiresAt) {
      setRemainingSeconds(0)
      return
    }
    const updateRemaining = () => {
      const diff = Math.max(0, Math.ceil((otpExpiresAt - Date.now()) / 1000))
      setRemainingSeconds(diff)
    }
    updateRemaining()
    const timer = setInterval(updateRemaining, 1000)
    return () => clearInterval(timer)
  }, [otpStep, otpExpiresAt])

  const formattedCountdown = useMemo(() => {
    const minutes = Math.floor(remainingSeconds / 60)
    const seconds = remainingSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }, [remainingSeconds])

  const validateEmail = (value: string) => {
    if (!value.trim()) {
      throw new Error('Vui lòng nhập email xác thực')
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value.trim())) {
      throw new Error('Email không hợp lệ')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setIsLoading(true)

    try {
      if (isLogin) {
        await login(username, password)
      } else if (!otpStep) {
        validateEmail(email)
        const response = await register(
          username,
          password,
          email || undefined,
          name || undefined,
          role
        )
        setInfo(response.message)
        setOtpStep(true)
        setOtp('')
        setOtpExpiresAt(Date.now() + response.otp_expires_in * 1000)
      } else {
        if (!otp.trim()) {
          throw new Error('Vui lòng nhập mã OTP')
        }
        await verifyRegistration(username, otp.trim(), password)
        setInfo('Đăng ký thành công! Bạn đã được đăng nhập.')
        setOtpStep(false)
        setOtp('')
        setOtpExpiresAt(null)
        setRemainingSeconds(0)
        setIsLogin(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra')
    } finally {
      setIsLoading(false)
    }
  }

  const resetStates = () => {
    setError('')
    setInfo('')
    setOtpStep(false)
    setOtp('')
    setOtpExpiresAt(null)
    setRemainingSeconds(0)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-[#124874]/5 to-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-[#124874]">
            {isLogin ? 'Đăng nhập' : 'Đăng ký'}
          </h1>
          <p className="mt-2 text-slate-600">
            {isLogin
              ? 'Chào mừng bạn đến với hệ thống'
              : 'Tạo tài khoản mới để bắt đầu'}
          </p>
        </div>

        <div className="w-full rounded-2xl border border-slate-200/50 bg-gradient-to-br from-white to-slate-50/50 p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && !otpStep && (
              <>
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
                      className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-slate-900 placeholder-slate-400 focus:border-[#124874] focus:outline-none focus:ring-2 focus:ring-[#124874]/20"
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
                      required
                      className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-slate-900 placeholder-slate-400 focus:border-[#124874] focus:outline-none focus:ring-2 focus:ring-[#124874]/20"
                      placeholder="Email xác thực"
                    />
                  </div>
                </div>

              </>
            )}

            {!isLogin && otpStep && (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Mã OTP
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-slate-900 placeholder-slate-400 focus:border-[#124874] focus:outline-none focus:ring-2 focus:ring-[#124874]/20"
                    placeholder="Nhập mã OTP gồm 6 chữ số"
                  />
                </div>
                {remainingSeconds > 0 && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                    <TimerReset className="h-4 w-4" />
                    <span>Mã OTP sẽ hết hạn sau {formattedCountdown}</span>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Tên đăng nhập
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-slate-900 placeholder-slate-400 focus:border-[#124874] focus:outline-none focus:ring-2 focus:ring-[#124874]/20"
                  placeholder="Nhập tên đăng nhập"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-slate-900 placeholder-slate-400 focus:border-[#124874] focus:outline-none focus:ring-2 focus:ring-[#124874]/20"
                  placeholder="Nhập mật khẩu"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {info && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">
                {info}
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-gradient-to-r from-[#124874] to-[#0f3a5a] py-3 font-semibold text-white shadow-sm transition-all hover:from-[#0f3a5a] hover:to-[#0d2e47] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#124874]/20 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading
                ? 'Đang xử lý...'
                : isLogin
                  ? 'Đăng nhập'
                  : otpStep
                    ? 'Xác thực OTP'
                    : 'Gửi mã OTP'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin)
                resetStates()
              }}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-[#124874] hover:underline"
            >
              {isLogin
                ? 'Chưa có tài khoản? Đăng ký ngay'
                : 'Đã có tài khoản? Đăng nhập'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

