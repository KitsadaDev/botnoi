import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { sanitizePhoneInput } from '../lib/format'
import { LogIn, UserPlus, Phone, User as UserIcon, AlertCircle, Loader2, KeyRound, Sparkles, Shield } from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import type { ApiResponse, User } from '../lib/types'

export const CustomerAuthPage: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      if (mode === 'register') {
        if (password !== confirmPassword) {
          setError('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน')
          setIsLoading(false)
          return
        }
        const res = await api.post<ApiResponse<{ token: string; user: User }>>('/auth/register', {
          name,
          phone,
          password,
        })
        if (res.data.success) {
          login(res.data.data.token, res.data.data.user)
          navigate('/book')
        }
      } else {
        const res = await api.post<ApiResponse<{ token: string; user: User }>>('/auth/login', {
          phone,
          password,
        })
        if (res.data.success) {
          login(res.data.data.token, res.data.data.user)
          navigate(res.data.data.user.role === 'CUSTOMER' ? '/book' : '/admin')
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'ข้อมูลไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 border border-zinc-200/90 shadow-xl space-y-6 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-sky-400 via-sky-500 to-blue-600" />

        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-sky-500 flex items-center justify-center text-white mx-auto mb-4 shadow-md">
            {mode === 'login' ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
          </div>
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 text-[10px] font-mono uppercase tracking-wider font-bold mb-2">
            <Sparkles className="w-3 h-3 text-sky-500" />
            CUSTOMER PORTAL
          </div>
          <h1 className="text-2xl font-extrabold text-zinc-950 tracking-tight">
            {mode === 'login' ? 'เข้าสู่ระบบลูกค้า' : 'สมัครสมาชิกใหม่'}
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            แจ้งซ่อมแอร์และติดตามสถานะงานซ่อมได้สะดวกรวดเร็ว
          </p>
        </div>

        {/* ปุ่มสลับ Login / Register */}
        <div className="grid grid-cols-2 p-1 bg-zinc-100 rounded-2xl">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null) }}
            className={`py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
              mode === 'login' ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-500'
            }`}
          >
            เข้าสู่ระบบ
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(null) }}
            className={`py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
              mode === 'register' ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-500'
            }`}
          >
            สมัครสมาชิก
          </button>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1.5 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-zinc-400" />
                <span>ชื่อ - นามสกุล</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="กรอกชื่อ-นามสกุลของคุณ"
                className="w-full px-4 py-3 text-sm bg-zinc-50 border border-zinc-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-sky-500 outline-hidden transition"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-zinc-400" />
              <span>เบอร์โทรศัพท์</span>
            </label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              required
              value={phone}
              onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
              placeholder="เช่น 0812345678"
              className="w-full px-4 py-3 text-sm font-mono bg-zinc-50 border border-zinc-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-sky-500 outline-hidden transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-zinc-400" />
              <span>รหัสผ่าน</span>
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 text-sm bg-zinc-50 border border-zinc-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-sky-500 outline-hidden transition"
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1.5 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-zinc-400" />
                <span>ยืนยันรหัสผ่าน</span>
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 text-sm bg-zinc-50 border border-zinc-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-sky-500 outline-hidden transition"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-2xl font-bold text-sm bg-sky-600 hover:bg-sky-500 text-white shadow-lg flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === 'login' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>เข้าสู่ระบบ</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>สมัครสมาชิก</span>
              </>
            )}
          </button>
        </form>

        {/* ลิงก์สลับไปหน้า Staff ของแคน */}
        <div className="pt-4 border-t border-zinc-100 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition"
          >
            <Shield className="w-3.5 h-3.5 text-zinc-400" />
            <span>สำหรับเจ้าหน้าที่ (Staff Portal) คลิกที่นี่</span>
          </Link>
        </div>
      </div>
    </div>
  )
}