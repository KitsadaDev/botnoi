import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn, Lock, Phone, AlertCircle, Loader2, KeyRound, Sparkles } from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import type { ApiResponse, User } from '../lib/types'

export const LoginPage: React.FC = () => {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const res = await api.post<ApiResponse<{ token: string; user: User }>>('/auth/login', {
        phone,
        password,
      })

      if (res.data.success) {
        login(res.data.data.token, res.data.data.user)
        navigate('/admin')
      } else {
        setError(res.data.error || 'เข้าสู่ระบบไม่สำเร็จ')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'เบอร์โทรศัพท์หรือรหัสผ่านไม่ถูกต้อง')
    } finally {
      setIsLoading(false)
    }
  }

  const fillAdmin = () => {
    setPhone('0800000001')
    setPassword('admin1234')
  }

  const fillStaff = () => {
    setPhone('0800000002')
    setPassword('staff1234')
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 border border-zinc-200/90 shadow-xl space-y-6 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600" />

        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-zinc-950 flex items-center justify-center text-sky-400 mx-auto mb-4 shadow-md border border-zinc-800">
            <Lock className="w-5 h-5" />
          </div>
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-600 text-[10px] font-mono uppercase tracking-wider font-bold mb-2">
            <Sparkles className="w-3 h-3 text-sky-500" />
            STAFF PORTAL
          </div>
          <h1 className="text-2xl font-extrabold text-zinc-950 tracking-tight">เข้าสู่ระบบเจ้าหน้าที่</h1>
          <p className="text-xs text-zinc-500 mt-1">
            ระบบบริหารจัดการงานซ่อมและมอบหมายช่าง CoolCare Pro
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-zinc-400" />
              <span>เบอร์โทรศัพท์ผู้ใช้งาน</span>
            </label>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="เช่น 0800000001"
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

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-2xl font-bold text-sm bg-zinc-950 hover:bg-zinc-800 text-white shadow-lg flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังเข้าสู่ระบบ...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 text-sky-400" />
                <span>เข้าสู่ระบบ</span>
              </>
            )}
          </button>
        </form>

        {/* Demo Accounts Quick-fill */}
        <div className="pt-5 border-t border-zinc-100 space-y-2.5">
          <p className="text-[10px] font-mono font-bold text-zinc-400 text-center uppercase tracking-widest">
            QUICK DEMO CREDENTIALS
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={fillAdmin}
              className="py-2.5 px-3 rounded-xl text-xs font-bold bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200/60 transition text-center cursor-pointer"
            >
              กรอกบัญชี Admin
            </button>
            <button
              type="button"
              onClick={fillStaff}
              className="py-2.5 px-3 rounded-xl text-xs font-bold bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border border-zinc-200/60 transition text-center cursor-pointer"
            >
              กรอกบัญชี Staff
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
