import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  LogIn,
  UserPlus,
  Phone,
  User as UserIcon,
  AlertCircle,
  Loader2,
  KeyRound,
  Sparkles,
  ShieldCheck,
  UserCheck,
  Building2,
} from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import type { ApiResponse, User } from '../lib/types'
import { sanitizePhoneInput } from '../lib/format'

const SHOW_DEMO_PRESETS = import.meta.env.VITE_ENABLE_DEMO_LOGIN !== 'false'

export const LoginPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login'
  const [mode, setMode] = useState<'login' | 'register'>(initialMode)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const qMode = searchParams.get('mode')
    if (qMode === 'register' || qMode === 'login') {
      setMode(qMode)
    }
  }, [searchParams])

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
          // ผู้ประกอบการสมัครเสร็จแล้วเข้า Workspace สร้าง Project ได้ทันที
          navigate('/projects')
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
          // ทุกบัญชีสามารถเข้าสู่หน้า Workspace โปรเจกต์ของตนเองได้ทันที
          navigate('/projects')
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

  // Quick Demo Fill สำหรับพรีเซนต์แพลตฟอร์ม
  const fillRole = (roleType: 'entrepreneur' | 'admin' | 'staff') => {
    setMode('login')
    setError(null)
    if (roleType === 'admin') {
      setPhone('0800000001')
      setPassword('admin1234')
    } else if (roleType === 'staff') {
      setPhone('0800000002')
      setPassword('staff1234')
    } else {
      setPhone('0812345678')
      setPassword('customer1234')
    }
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 border border-zinc-200 shadow-xl space-y-6 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-orange-400 via-amber-600 to-indigo-600" />

        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-600 flex items-center justify-center text-white mx-auto mb-4 shadow-md shadow-orange-500/20">
            {mode === 'login' ? <LogIn className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-100 text-orange-700 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
            <span>Plasom Central AI Platform</span>
          </div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
            {mode === 'login' ? 'เข้าสู่ระบบแพลตฟอร์ม' : 'สมัครใช้งานสร้าง Project ฟรี'}
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            {mode === 'login'
              ? 'เข้าสู่แดชบอร์ดโปรเจกต์ของคุณ เพื่อจัดการใบงาน ทีมช่าง ประวัติแชท และผลความพึงพอใจ'
              : 'สร้างบัญชีผู้ประกอบการ เพื่อเปิด Project แดชบอร์ดแจ้งซ่อมและเชื่อมต่อ AI Chatbot ได้ทันที'}
          </p>
        </div>

        {/* Toggle Login / Register */}
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
            สมัครผู้ประกอบการใหม่
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
                <span>ชื่อ - นามสกุล / ชื่อผู้ดูแล</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="กรอกชื่อ-นามสกุลของคุณ"
                className="w-full px-4 py-3 text-sm bg-zinc-50 border border-zinc-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-hidden transition"
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
              className="w-full px-4 py-3 text-sm font-mono bg-zinc-50 border border-zinc-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-hidden transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-zinc-400" />
              <span>รหัสผ่าน {mode === 'register' && <span className="text-zinc-400 font-normal">(อย่างน้อย 8 ตัวอักษร + ตัวเลข)</span>}</span>
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 text-sm bg-zinc-50 border border-zinc-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-hidden transition"
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
                className="w-full px-4 py-3 text-sm bg-zinc-50 border border-zinc-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-hidden transition"
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
                <LogIn className="w-4 h-4 text-orange-400" />
                <span>เข้าสู่ Workspace ของฉัน</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 text-orange-400" />
                <span>สมัครสมาชิกและสร้าง Project</span>
              </>
            )}
          </button>
        </form>

        {SHOW_DEMO_PRESETS && (
          <div className="pt-4 border-t border-zinc-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-zinc-400 tracking-wider uppercase">
                ⚡ LIVE DEMO PRESETS
              </span>
              <span className="text-[10px] text-zinc-400">คลิกกรอกบัญชีทดสอบ</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillRole('admin')}
                className="py-2 px-2 rounded-xl text-[11px] font-semibold bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200/80 transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>แอดมิน</span>
              </button>
              <button
                type="button"
                onClick={() => fillRole('staff')}
                className="py-2 px-2 rounded-xl text-[11px] font-semibold bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200/80 transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                <span>เจ้าหน้าที่</span>
              </button>
              <button
                type="button"
                onClick={() => fillRole('entrepreneur')}
                className="py-2 px-2 rounded-xl text-[11px] font-semibold bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200/80 transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>ผู้ประกอบการ</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
