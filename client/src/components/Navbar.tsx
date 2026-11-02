import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Wrench, ShieldCheck, Search, Menu, X, LogIn, LogOut, User as UserIcon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, logout, isStaff } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const isActive = (path: string) => location.pathname === path

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      {/* Top Banner Notice */}
      <div className="bg-[#002b66] text-white text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
            <span>ศูนย์บริการแอร์มาตรฐาน รับประกันงานซ่อมนาน 90 วัน</span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-slate-200">
            <span>สายด่วนบริการ: 02-123-4567</span>
            <span>|</span>
            <span>เปิดบริการทุกวัน 08:00 - 18:00 น.</span>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#003882] to-[#0066cc] flex items-center justify-center text-white shadow-md shadow-blue-900/20 group-hover:scale-105 transition-transform">
              <Wrench className="w-5 h-5 text-sky-200" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight text-[#003882]">CoolCare</span>
                <span className="font-bold text-xs uppercase px-1.5 py-0.5 bg-sky-500 text-white rounded tracking-wider">PRO</span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium tracking-wide">AIR CONDITIONING SERVICE NETWORK</p>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/') ? 'text-[#003882] bg-blue-50 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              หน้าแรก
            </Link>
            <Link
              to="/book"
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/book') ? 'text-[#003882] bg-blue-50 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              แจ้งซ่อม / บริการ
            </Link>
            <Link
              to="/track"
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/track') ? 'text-[#003882] bg-blue-50 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Search className="w-4 h-4 text-slate-400" />
              ติดตามสถานะ
            </Link>

            {isStaff && (
              <Link
                to="/admin"
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/admin') ? 'text-amber-700 bg-amber-50 font-semibold' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                ระบบจัดการช่าง (Staff)
              </Link>
            )}
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 pl-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-[#003882] flex items-center justify-center font-bold text-xs">
                    {user.name.slice(0, 1)}
                  </div>
                  <div className="text-left text-xs">
                    <p className="font-semibold text-slate-800 leading-none">{user.name}</p>
                    <span className="text-[10px] text-blue-600 font-medium">{user.role}</span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-600 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                  title="ออกจากระบบ"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>ออก</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-[#003882] px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <UserIcon className="w-4 h-4" />
                  <span>สำหรับเจ้าหน้าที่</span>
                </Link>
                <Link
                  to="/book"
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-[#003882] hover:bg-[#002b66] rounded-lg shadow-sm hover:shadow transition-all"
                >
                  แจ้งซ่อมด่วน
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-hidden"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1 shadow-lg">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-100"
          >
            หน้าแรก
          </Link>
          <Link
            to="/book"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-100"
          >
            แจ้งซ่อม / บริการ
          </Link>
          <Link
            to="/track"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-100"
          >
            ติดตามสถานะ
          </Link>

          {isStaff && (
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-medium text-amber-700 hover:bg-amber-50"
            >
              ระบบจัดการช่าง (Staff)
            </Link>
          )}

          <div className="pt-3 border-t border-slate-100">
            {user ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm text-slate-800">{user.name}</p>
                  <p className="text-xs text-blue-600">{user.role}</p>
                </div>
                <button
                  onClick={() => {
                    handleLogout()
                    setMobileMenuOpen(false)
                  }}
                  className="text-xs text-red-600 font-medium px-3 py-1.5 border border-red-200 rounded-lg hover:bg-red-50"
                >
                  ออกจากระบบ
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-1.5 w-full py-2 px-4 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200"
              >
                <LogIn className="w-4 h-4" />
                เข้าสู่ระบบเจ้าหน้าที่
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
