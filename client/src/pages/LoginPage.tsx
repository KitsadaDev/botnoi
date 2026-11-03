import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn, UserPlus, Phone, User as UserIcon, AlertCircle, Loader2, KeyRound, Sparkles, ShieldCheck, UserCheck } from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import type { ApiResponse, User } from '../lib/types'

export const LoginPage: React.FC = () => {
  // สลับโหมด เข้าสู่ระบบ / สมัครสมาชิก
  const [mode, setMode] = useState<'login' | 'register'>('login')

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { login } = useAuth()
  const navigate = useNavigate()

  const switchMode = (newMode: 'login' | 'register') => {
    setMode(newMode)
    setError(null)
  }

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
        } else {
          setError(res.data.error || 'สมัครสมาชิกไม่สำเร็จ')
        }
      } else {
        const res = await api.post<ApiResponse<{ token: string; user: User }>>('/auth/login', {
          phone,
          password,
        })

        if (res.data.success) {
          const loggedInUser = res.data.data.user
          login(res.data.data.token, loggedInUser)

          // แยกทางเดินอัตโนมัติ: แอดมิน/ช่างไปหลังบ้าน, ลูกค้าไปหน้าบริการ
          if (loggedInUser.role === 'ADMIN' || loggedInUser.role === 'STAFF') {
            navigate('/admin')
          } else {
            navigate('/book')
          }
        } else {
          setError(res.data.error || 'เบอร์โทรศัพท์หรือรหัสผ่านไม่ถูกต้อง')
        }
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          (mode === 'register' ? 'ไม่สามารถสมัครสมาชิกได้ กรุณาตรวจสอบข้อมูล' : 'เบอร์โทรศัพท์หรือรหัสผ่านไม่ถูกต้อง')
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Quick Demo Fill สำหรับให้พี่โมโนกดพรีเซนต์ลูกค้า
  const fillRole = (roleType: 'customer' | 'admin' | 'staff') => {
    setMode('login')
    setError(null)
    if (roleType === 'admin') {
      setPhone('0800000001')
      setPassword('admin1234')
    } else if (roleType === 'staff') {
      setPhone('0800000002')
      setPassword('staff1234')
    } else {
      // บัญชีลูกค้าจำลอง (หรือใส่เบอร์ที่เคยสมัครไว้)
      setPhone('0812345678')
      setPassword('user1234')
    }
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 border border-zinc-200 shadow-xl space-y-6 relative overflow-hidden">
        {/* แถบ Gradient ด้านบน */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-sky-400 via-blue-600 to-indigo-600" />

        {/* ส่วนหัวหน้าเว็บ */}
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white mx-auto mb-4 shadow-md shadow-sky-500/20">
            {mode === 'login' ? <LogIn className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 border border-sky-100 text-sky-700 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-sky-500" />
            <span>AfterCare AI Platform</span>
          </div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
            {mode === 'login' ? 'เข้าสู่ระบบใช้งาน' : 'สร้างบัญชีผู้ใช้งานใหม่'}
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            {mode === 'login'
              ? 'ระบบดูแลลูกค้าและจัดการงานบริการหลังการขายอัจฉริยะ'
              : 'สมัครสมาชิกเพื่อรับบริการแจ้งซ่อมและติดตามสถานะงานแบบเรียลไทม์'}
          </p>
        </div>

        {/* สลับแท็บ เข้าสู่ระบบ / สมัครสมาชิก */}
        <div className="grid grid-cols-2 p-1 bg-zinc-100 rounded-2xl">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
              mode === 'login'
                ? 'bg-white text-zinc-950 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            เข้าสู่ระบบ
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
              mode === 'register'
                ? 'bg-white text-zinc-950 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            สมัครสมาชิกใหม่
          </button>
        </div>

        {/* กล่อง Error */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* ฟอร์ม */}
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
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
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
            className="w-full py-3.5 px-4 rounded-2xl font-bold text-sm bg-zinc-950 hover:bg-zinc-800 text-white shadow-lg shadow-zinc-950/20 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังดำเนินการ...</span>
              </>
            ) : mode === 'login' ? (
              <>
                <LogIn className="w-4 h-4 text-sky-400" />
                <span>เข้าสู่ระบบ</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 text-sky-400" />
                <span>ยืนยันการสมัครสมาชิก</span>
              </>
            )}
          </button>
        </form>

        {/* Demo Simulator สำหรับเวลาพี่โมโนเปิดเดโมโชว์ลูกค้า */}
        <div className="pt-4 border-t border-zinc-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-zinc-400 tracking-wider uppercase">
              ⚡ LIVE DEMO PRESETS
            </span>
            <span className="text-[10px] text-zinc-400">สำหรับนำเสนอระบบ</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillRole('admin')}
              className="py-2 px-3 rounded-xl text-xs font-semibold bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200/80 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>แดชบอร์ดแอดมิน</span>
            </button>
            <button
              type="button"
              onClick={() => fillRole('staff')}
              className="py-2 px-3 rounded-xl text-xs font-semibold bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200/80 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-sky-600" />
              <span>ทีมช่าง/เจ้าหน้าที่</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}