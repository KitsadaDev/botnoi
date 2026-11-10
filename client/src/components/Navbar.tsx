import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Wrench,
  Search,
  Menu,
  X,
  LogIn,
  LogOut,
  User as UserIcon,
  Sparkles,
  PhoneCall,
  LayoutDashboard,
  ArrowUpRight,
  ClipboardList,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [hoveredNav, setHoveredNav] = useState<string | null>(null)
  const { user, logout, isStaff } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  // 1. ตรวจสอบไฮไลท์ให้แยกชัดเจนระหว่าง "หน้าแรก" กับ "โซลูชัน AI"
  const isActive = (path: string) => {
    if (path === '/#ai-showcase') {
      return location.pathname === '/' && location.hash === '#ai-showcase'
    }
    if (path === '/') {
      return location.pathname === '/' && (!location.hash || location.hash === '')
    }
    if (path === '/track') return location.pathname.startsWith('/track')
    if (path === '/my-tickets') return location.pathname.startsWith('/my-tickets')
    return location.pathname === path
  }

  // 2. ฟังก์ชันจัดการการคลิกและเลื่อนหน้าจอ
  const handleNavClick = (path: string, e: React.MouseEvent) => {
    if (path === '/') {
      if (location.pathname === '/') {
        e.preventDefault()
        // ถ้าอยู่หน้าแรกอยู่แล้ว ให้ม้วนจอกลับไปบนสุด พร้อมล้าง hash
        window.scrollTo({ top: 0, behavior: 'smooth' })
        navigate('/', { replace: true })
      }
    } else if (path === '/#ai-showcase') {
      e.preventDefault()
      if (location.pathname === '/') {
        // ถ้าอยู่หน้าแรก ให้เลื่อนลงไปหากล่อง AI และตั้ง hash เพื่อให้ปุ่มสว่าง
        const el = document.getElementById('ai-showcase')
        el?.scrollIntoView({ behavior: 'smooth' })
        navigate('/#ai-showcase', { replace: true })
      } else {
        // ถ้าอยู่หน้าอื่น ให้พากลับไปหน้าแรกพร้อมติด hash ไปด้วย
        navigate('/#ai-showcase')
      }
    }
  }

  const navItems = [
    { path: '/', label: 'หน้าแรก' },
    { path: '/#ai-showcase', label: 'โซลูชัน AI', icon: Sparkles },
    { path: '/book', label: 'แจ้งซ่อม / นัดหมาย' },
    { path: '/track', label: 'ติดตามสถานะ', icon: Search },
    ...(user && !isStaff
      ? [{ path: '/my-tickets', label: 'ประวัติการแจ้งซ่อม', icon: ClipboardList }]
      : []),
  ]

  return (
    <header className="sticky top-0 z-50">
      {/* Top Sleek Announcement Strip */}
      <div className="bg-zinc-950 text-zinc-300 text-[11px] py-1.5 px-4 border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 font-semibold border border-sky-500/20">
              <Sparkles className="w-3 h-3 animate-spin" style={{ animationDuration: '6s' }} />
              Carrier Standard
            </span>
            <span className="text-zinc-300 font-medium">
              ศูนย์บริการแอร์มาตรฐานสากล รับประกันงานซ่อมนาน 90 วันเต็ม
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-zinc-400">
            <a href="tel:021234567" className="flex items-center gap-1.5 hover:text-white transition-colors">
              <PhoneCall className="w-3 h-3 text-sky-400" />
              <span>
                สายด่วน: <strong className="text-zinc-200 font-mono">02-123-4567</strong>
              </span>
            </a>
            <span className="text-zinc-700">•</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              เปิดบริการทุกวัน 08:00 - 18:00 น.
            </span>
          </div>
        </div>
      </div>

      {/* Main Glassmorphic Floating Navbar */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-zinc-200/80 shadow-[0_1px_3px_0_rgba(0,0,0,0.02)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex justify-between items-center h-16">
            
            {/* ฝั่งซ้าย: Brand Logo (คลิกแล้วเลื่อนขึ้นบนสุดได้เช่นกัน) */}
            <Link
              to="/"
              onClick={(e) => handleNavClick('/', e)}
              className="flex items-center gap-3 group shrink-0"
            >
              <div className="relative w-10 h-10 rounded-xl bg-zinc-950 flex items-center justify-center text-white shadow-md shadow-zinc-950/10 group-hover:scale-105 group-active:scale-95 transition-all duration-300 border border-zinc-800 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-sky-600/40 via-transparent to-cyan-400/30 opacity-80 group-hover:opacity-100 transition-opacity" />
                <Wrench className="w-5 h-5 text-sky-400 relative z-10 group-hover:rotate-12 transition-transform" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-lg tracking-tight text-zinc-950">Plasom</span>
                </div>
                <p className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase">
                  SMART AC SERVICE
                </p>
              </div>
            </Link>

            {/* แคปซูลเมนูตรงกลาง */}
            <nav
              onMouseLeave={() => setHoveredNav(null)}
              className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-1 p-1.5 rounded-full bg-zinc-100/90 border border-zinc-200/80 shadow-inner"
            >
              {navItems.map((item) => {
                const active = isActive(item.path)
                const isHovered = hoveredNav === item.path
                const Icon = item.icon

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={(e) => handleNavClick(item.path, e)}
                    onMouseEnter={() => setHoveredNav(item.path)}
                    className={`relative flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${
                      active
                        ? 'bg-zinc-950 text-white shadow-md scale-[1.02]'
                        : isHovered
                        ? 'bg-white/90 text-zinc-950 shadow-2xs'
                        : 'text-zinc-600 hover:text-zinc-950'
                    }`}
                  >
                    {active && (
                      <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-7 h-1 rounded-full bg-sky-400 shadow-[0_0_12px_2px_rgba(56,189,248,0.85)]" />
                    )}
                    {Icon && <Icon className={`w-3.5 h-3.5 ${active ? 'text-sky-400' : 'text-sky-600'}`} />}
                    <span>{item.label}</span>
                  </Link>
                )
              })}

              {isStaff && (
                <Link
                  to="/admin"
                  onMouseEnter={() => setHoveredNav('/admin')}
                  className={`relative flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${
                    isActive('/admin')
                      ? 'bg-zinc-950 text-white shadow-md scale-[1.02]'
                      : 'text-amber-700 hover:text-amber-900 bg-amber-50/80 hover:bg-amber-100'
                  }`}
                >
                  {isActive('/admin') && (
                    <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-7 h-1 rounded-full bg-amber-400 shadow-[0_0_12px_2px_rgba(251,191,36,0.85)]" />
                  )}
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Staff Console</span>
                </Link>
              )}
            </nav>

            {/* ฝั่งขวา: User Profile / Action Buttons */}
            <div className="hidden md:flex items-center gap-2.5 shrink-0">
              {user ? (
                <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200/80 rounded-full pl-2 pr-1.5 py-1">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                    {user.name.slice(0, 1)}
                  </div>
                  <div className="text-left pr-1">
                    <p className="font-bold text-zinc-900 text-xs leading-none">{user.name}</p>
                    <span className="text-[10px] font-mono text-sky-600 font-semibold">{user.role}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 text-xs text-zinc-500 hover:text-rose-600 px-2.5 py-1.5 rounded-full hover:bg-rose-50 transition-colors cursor-pointer"
                    title="ออกจากระบบ"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    to="/login"
                    className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-950 px-3.5 py-2 rounded-xl hover:bg-zinc-100/80 transition-all"
                  >
                    <LogIn className="w-3.5 h-3.5 text-zinc-400" />
                    <span>เข้าสู่ระบบ</span>
                  </Link>
                  <Link
                    to="/book"
                    className="group relative inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-zinc-950 hover:bg-zinc-800 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden"
                  >
                    <span className="relative z-10">แจ้งซ่อมด่วน</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-sky-400 relative z-10 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl text-zinc-600 hover:bg-zinc-100 focus:outline-hidden"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-zinc-200 bg-white/95 backdrop-blur-xl px-4 pt-3 pb-5 space-y-1.5 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <Link
            to="/"
            onClick={(e) => {
              handleNavClick('/', e)
              setMobileMenuOpen(false)
            }}
            className={`block px-3.5 py-2.5 rounded-xl text-sm font-semibold ${
              isActive('/') ? 'bg-zinc-950 text-white' : 'text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            หน้าแรก
          </Link>
          <Link
            to="/#ai-showcase"
            onClick={(e) => {
              handleNavClick('/#ai-showcase', e)
              setMobileMenuOpen(false)
            }}
            className={`block px-3.5 py-2.5 rounded-xl text-sm font-semibold ${
              isActive('/#ai-showcase') ? 'bg-zinc-950 text-white' : 'text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            โซลูชัน AI
          </Link>
          <Link
            to="/book"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3.5 py-2.5 rounded-xl text-sm font-semibold ${
              isActive('/book') ? 'bg-zinc-950 text-white' : 'text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            แจ้งซ่อม / บริการ
          </Link>
          <Link
            to="/track"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3.5 py-2.5 rounded-xl text-sm font-semibold ${
              isActive('/track') ? 'bg-zinc-950 text-white' : 'text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            ติดตามสถานะงานซ่อม
          </Link>

          {user && !isStaff && (
            <Link
              to="/my-tickets"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3.5 py-2.5 rounded-xl text-sm font-semibold ${
                isActive('/my-tickets') ? 'bg-sky-600 text-white' : 'text-sky-700 bg-sky-50'
              }`}
            >
              ประวัติการแจ้งซ่อมของฉัน
            </Link>
          )}

          {isStaff && (
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3.5 py-2.5 rounded-xl text-sm font-semibold text-amber-700 bg-amber-50"
            >
              ระบบจัดการช่าง (Staff Console)
            </Link>
          )}

          <div className="pt-3 mt-2 border-t border-zinc-100">
            {user ? (
              <div className="flex items-center justify-between px-2">
                <div>
                  <p className="font-bold text-sm text-zinc-900">{user.name}</p>
                  <p className="text-xs font-mono text-sky-600">{user.role}</p>
                </div>
                <button
                  onClick={() => {
                    handleLogout()
                    setMobileMenuOpen(false)
                  }}
                  className="text-xs text-rose-600 font-semibold px-3 py-1.5 border border-rose-200 rounded-xl hover:bg-rose-50"
                >
                  ออกจากระบบ
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-bold text-zinc-700 bg-zinc-100 hover:bg-zinc-200"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  เข้าสู่ระบบ
                </Link>
                <Link
                  to="/book"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-zinc-950"
                >
                  แจ้งซ่อมด่วน
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}