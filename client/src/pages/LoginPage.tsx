import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn, Lock, Phone, AlertCircle, Loader2, ShieldCheck, KeyRound } from 'lucide-react'
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
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#003882] to-[#0066cc] flex items-center justify-center text-white mx-auto mb-4 shadow-md shadow-blue-900/20">
            <Lock className="w-6 h-6 text-sky-200" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">เข้าสู่ระบบเจ้าหน้าที่</h1>
          <p className="text-xs text-slate-500 mt-1">
            ระบบจัดการงานซ่อมและมอบหมายช่าง CoolCare Pro
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>เบอร์โทรศัพท์ผู้ใช้งาน (เช่น 0800000001)</span>
            </label>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="เช่น 0800000001"
              className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#003882] outline-hidden transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-slate-400" />
              <span>รหัสผ่าน</span>
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#003882] outline-hidden transition"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-[#003882] hover:bg-[#002866] text-white shadow-md shadow-blue-900/10 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังเข้าสู่ระบบ...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>เข้าสู่ระบบ</span>
              </>
            )}
          </button>
        </form>

        {/* Demo Accounts Quick-fill */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <p className="text-[11px] font-semibold text-slate-400 text-center uppercase tracking-wider">
            บัญชีทดสอบสำหรับประเมินระบบ
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={fillAdmin}
              className="py-2 px-3 rounded-lg text-xs font-semibold bg-blue-50 text-[#003882] hover:bg-blue-100 transition text-center"
            >
              คลิกกรอก Admin
            </button>
            <button
              type="button"
              onClick={fillStaff}
              className="py-2 px-3 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition text-center"
            >
              คลิกกรอก Staff
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
