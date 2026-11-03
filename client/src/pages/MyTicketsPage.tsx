import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Wrench, Calendar, MapPin, ArrowRight, Clock, PlusCircle, AlertCircle, Loader2 } from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import type { Ticket, ApiResponse } from '../lib/types'
import { STATUS_LABELS, STATUS_COLORS, SERVICE_LABELS } from '../lib/types'

export const MyTicketsPage: React.FC = () => {
  const { user } = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMyTickets = async () => {
      try {
        setIsLoading(true)
        // ยิง API ดึงรายการของฉัน (หรือกรองตามเบอร์โทร/user)
        const res = await api.get<ApiResponse<Ticket[]>>('/tickets/my')
        if (res.data.success) {
          setTickets(res.data.data)
        }
      } catch (err: any) {
        setError('ไม่สามารถโหลดประวัติการแจ้งซ่อมได้')
      } finally {
        setIsLoading(false)
      }
    }

    fetchMyTickets()
  }, [])

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      {/* ส่วนหัว */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">ประวัติการแจ้งซ่อมของฉัน</h1>
          <p className="text-xs text-zinc-500 mt-1">
            ยินดีต้อนรับคุณ {user?.name || 'ลูกค้า'} | ติดตามสถานะและคิวงานบริการทั้งหมดของคุณ
          </p>
        </div>
        <Link
          to="/book"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-600/20 transition cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>แจ้งซ่อมรายการใหม่</span>
        </Link>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-zinc-400">
          <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
          <p className="text-xs">กำลังโหลดประวัติการแจ้งซ่อม...</p>
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty State (ยังไม่เคยแจ้งซ่อม) */}
      {!isLoading && !error && tickets.length === 0 && (
        <div className="py-16 px-4 text-center bg-white rounded-3xl border border-zinc-200/80 shadow-sm space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400 mx-auto">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-800">ยังไม่มีประวัติการแจ้งซ่อม</h3>
            <p className="text-xs text-zinc-500 mt-1">คุณยังไม่ได้ส่งคำขอแจ้งซ่อมหรือล้างแอร์ในระบบ</p>
          </div>
          <Link
            to="/book"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-950 text-white text-xs font-semibold hover:bg-zinc-800 transition"
          >
            เริ่มแจ้งซ่อมเลย
          </Link>
        </div>
      )}

      {/* รายการการ์ดงานซ่อม */}
      {!isLoading && tickets.length > 0 && (
        <div className="grid gap-4">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-xs hover:border-sky-300 hover:shadow-md transition space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-sm font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-100">
                    {ticket.trackingCode}
                  </span>
                  <span className="text-xs font-bold text-zinc-800">
                    {SERVICE_LABELS[ticket.service] || ticket.service}
                  </span>
                  <span className="text-xs text-zinc-400">•</span>
                  <span className="text-xs text-zinc-500">{ticket.brand}</span>
                </div>
                <span
                  className={`text-[11px] font-bold px-3 py-1 rounded-full ${
                    STATUS_COLORS[ticket.status] || 'bg-zinc-100 text-zinc-600'
                  }`}
                >
                  {STATUS_LABELS[ticket.status] || ticket.status}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-2 text-xs text-zinc-600">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span className="truncate">อาการ: {ticket.symptom}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span>วันนัดหมาย: {ticket.preferredDate || 'รอยืนยัน'}</span>
                </div>
                <div className="flex items-center gap-2 sm:col-span-2">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span className="truncate">สถานที่: {ticket.address}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
                <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  สร้างเมื่อ: {new Date(ticket.createdAt).toLocaleDateString('th-TH')}
                </span>
                <Link
                  to={`/track/${ticket.trackingCode}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 hover:text-sky-700 hover:underline"
                >
                  <span>ติดตามสถานะเรียลไทม์</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}