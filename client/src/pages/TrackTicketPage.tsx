import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search,
  CheckCircle2,
  Clock,
  Wrench,
  AlertCircle,
  Phone,
  MapPin,
  Calendar,
  Send,
  MessageSquare,
  User,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import api from '../lib/api'
import type { ApiResponse, Ticket, Message, TicketStatus } from '../lib/types'
import { SERVICE_LABELS, STATUS_LABELS, STATUS_COLORS } from '../lib/types'

const STEP_ORDER: TicketStatus[] = ['SUBMITTED', 'RECEIVED', 'IN_PROGRESS', 'COMPLETED']

export const TrackTicketPage: React.FC = () => {
  const { code } = useParams<{ code?: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchInput, setSearchInput] = useState(code || '')
  const [messageText, setMessageText] = useState('')
  const [sendError, setSendError] = useState<string | null>(null)

  // Fetch ticket details with polling every 5 seconds
  const {
    data: ticket,
    isLoading: isTicketLoading,
    isError: isTicketError,
    refetch: refetchTicket,
  } = useQuery<Ticket>({
    queryKey: ['ticket', code],
    queryFn: async () => {
      if (!code) throw new Error('No tracking code provided')
      const res = await api.get<ApiResponse<Ticket>>(`/tickets/${encodeURIComponent(code)}`)
      if (!res.data.success) throw new Error(res.data.error || 'ไม่พบข้อมูลงานซ่อม')
      return res.data.data
    },
    enabled: Boolean(code),
    refetchInterval: 5000,
  })

  // Fetch messages with polling every 3 seconds
  const { data: messages = [], isLoading: isMessagesLoading } = useQuery<Message[]>({
    queryKey: ['messages', code],
    queryFn: async () => {
      if (!code) return []
      const res = await api.get<ApiResponse<Message[]>>(`/tickets/${encodeURIComponent(code)}/messages`)
      return res.data.success ? res.data.data : []
    },
    enabled: Boolean(code),
    refetchInterval: 3000,
  })

  // Send customer message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!code) return
      const res = await api.post<ApiResponse<Message>>(`/tickets/${encodeURIComponent(code)}/messages`, {
        text,
      })
      if (!res.data.success) throw new Error(res.data.error || 'ส่งข้อความไม่สำเร็จ')
      return res.data.data
    },
    onSuccess: () => {
      setMessageText('')
      setSendError(null)
      queryClient.invalidateQueries({ queryKey: ['messages', code] })
    },
    onError: (err: any) => {
      setSendError(err.response?.data?.error || 'ส่งข้อความไม่สำเร็จ กรุณาลองใหม่')
    },
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchInput.trim()) return
    navigate(`/track/${encodeURIComponent(searchInput.trim().toUpperCase())}`)
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageText.trim() || sendMessageMutation.isPending) return
    sendMessageMutation.mutate(messageText.trim())
  }

  // Calculate current step index
  const getStepStatus = (stepName: TicketStatus, currentStatus?: TicketStatus) => {
    if (!currentStatus) return 'upcoming'
    if (currentStatus === 'CANCELLED') return 'cancelled'

    const currentIndex = STEP_ORDER.indexOf(currentStatus)
    const stepIndex = STEP_ORDER.indexOf(stepName)

    if (stepIndex < currentIndex) return 'completed'
    if (stepIndex === currentIndex) return 'current'
    return 'upcoming'
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      {/* Search Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#003882] text-xs font-semibold">
            <Search className="w-3.5 h-3.5" />
            <span>ค้นหาสถานะงานบริการ</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            ติดตามสถานะงานซ่อมเครื่องปรับอากาศ
          </h1>

          <form onSubmit={handleSearch} className="flex gap-2 max-w-md mx-auto pt-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="ระบุรหัสงาน เช่น TK-SEED001"
              className="flex-1 px-4 py-2.5 text-sm font-mono tracking-wider uppercase bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#003882] outline-hidden"
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl font-bold text-sm bg-[#003882] hover:bg-[#002866] text-white shadow-sm transition-all"
            >
              ค้นหา
            </button>
          </form>
        </div>
      </div>

      {/* Loading State */}
      {isTicketLoading && (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <RefreshCw className="w-8 h-8 text-[#003882] animate-spin mx-auto mb-3" />
          <p className="text-slate-600 text-sm font-semibold">กำลังดึงข้อมูลสถานะงานซ่อม...</p>
        </div>
      )}

      {/* Error / Not Found */}
      {!isTicketLoading && isTicketError && (
        <div className="bg-white rounded-2xl p-12 text-center border border-red-200 max-w-lg mx-auto">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-800">ไม่พบข้อมูลรหัสงานซ่อมนี้</h2>
          <p className="text-slate-500 text-xs mt-1 mb-6">
            กรุณาตรวจสอบความถูกต้องของรหัสติดตามงาน หรือติดต่อศูนย์บริการหากต้องการความช่วยเหลือ
          </p>
          <Link
            to="/book"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#003882] text-white"
          >
            แจ้งซ่อมเคสใหม่
          </Link>
        </div>
      )}

      {/* When ticket data is loaded */}
      {!isTicketLoading && ticket && (
        <div className="space-y-8">
          {/* Main Status & Stepper Card */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs">
            {/* Header with Tracking Code and Status Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-2xl font-black text-[#003882] tracking-wider">
                    {ticket.trackingCode}
                  </span>
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      STATUS_COLORS[ticket.status] || 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {STATUS_LABELS[ticket.status] || ticket.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  แจ้งเมื่อ: {new Date(ticket.createdAt).toLocaleString('th-TH')}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => refetchTicket()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition"
                  title="รีเฟรชข้อมูล"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>รีเฟรช</span>
                </button>
              </div>
            </div>

            {/* Stepper Progress */}
            {ticket.status !== 'CANCELLED' ? (
              <div className="py-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative">
                  {STEP_ORDER.map((stepKey, idx) => {
                    const statusState = getStepStatus(stepKey, ticket.status)
                    const isCompleted = statusState === 'completed'
                    const isCurrent = statusState === 'current'

                    return (
                      <div key={stepKey} className="flex flex-col items-center text-center relative z-10">
                        {/* Circle Icon */}
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm mb-3 transition-all ${
                            isCompleted
                              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                              : isCurrent
                              ? 'bg-[#003882] text-white ring-4 ring-blue-100 shadow-md shadow-blue-900/30 animate-pulse'
                              : 'bg-slate-100 text-slate-400 border border-slate-200'
                          }`}
                        >
                          {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : idx + 1}
                        </div>

                        {/* Label */}
                        <span
                          className={`text-xs font-bold ${
                            isCurrent ? 'text-[#003882]' : isCompleted ? 'text-slate-800' : 'text-slate-400'
                          }`}
                        >
                          {STATUS_LABELS[stepKey]}
                        </span>

                        <span className="text-[11px] text-slate-400 mt-0.5">
                          {idx === 0
                            ? 'ระบบรับข้อมูลแล้ว'
                            : idx === 1
                            ? 'จัดเตรียมช่าง'
                            : idx === 2
                            ? 'ช่างเดินทาง/ตรวจซ่อม'
                            : 'ส่งมอบงานเรียบร้อย'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="my-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                <div>
                  <p className="font-bold text-sm">เคสนี้ถูกยกเลิกแล้ว</p>
                  <p className="text-xs text-red-600">
                    หากต้องการติดต่อเพิ่มเติม กรุณาโทร Call Center: 02-123-4567
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 2-Columns: Details & Technician on Left, Live Chat & Logs on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Details & Technician (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Technician Info Card */}
              {ticket.technician ? (
                <div className="bg-gradient-to-br from-blue-900 to-[#002f6c] text-white rounded-2xl p-6 shadow-md border border-blue-800">
                  <div className="flex items-center justify-between mb-4">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-semibold">
                      <Wrench className="w-3.5 h-3.5" />
                      <span>ช่างผู้รับผิดชอบงาน</span>
                    </div>
                    <span className="text-xs text-sky-200">เขตบริการ: {ticket.technician.area}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center font-bold text-lg text-white border border-white/20">
                        {ticket.technician.name.slice(0, 1)}
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-white">{ticket.technician.name}</h3>
                        <p className="text-xs text-sky-200">ช่างเทคนิคผู้เชี่ยวชาญ CoolCare Pro</p>
                      </div>
                    </div>

                    <a
                      href={`tel:${ticket.technician.phone}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-900 font-bold text-xs transition shadow-sm"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{ticket.technician.phone}</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 flex items-center gap-3 text-xs text-slate-600">
                  <Clock className="w-5 h-5 text-amber-500 shrink-0" />
                  <span>เจ้าหน้าที่กำลังประสานงานมอบหมายช่างในพื้นที่ของคุณ</span>
                </div>
              )}

              {/* Service & Equipment Details */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                <h3 className="font-bold text-base text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-[#003882]" />
                  <span>รายละเอียดเครื่องปรับอากาศ</span>
                </h3>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">ประเภทบริการ</span>
                    <span className="font-bold text-slate-800 text-sm">
                      {SERVICE_LABELS[ticket.service] || ticket.service}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5">ยี่ห้อแอร์</span>
                    <span className="font-bold text-slate-800 text-sm">{ticket.brand}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5">วันที่นัดหมาย</span>
                    <span className="font-semibold text-slate-800">{ticket.preferredDate}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5">ผู้ติดต่อ</span>
                    <span className="font-semibold text-slate-800">
                      {ticket.customerName} ({ticket.customerPhone})
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-slate-400 text-xs block mb-1">อาการ / ปัญหาที่พบ</span>
                  <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {ticket.symptom}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400 text-xs block mb-1">สถานที่บริการ</span>
                  <div className="flex items-start gap-2 text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <p>{ticket.address}</p>
                      {ticket.lat && ticket.lng && (
                        <p className="text-[11px] text-[#003882] font-semibold mt-1">
                          พิกัด GPS: {ticket.lat}, {ticket.lng}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Uploaded Images */}
                {ticket.images && ticket.images.length > 0 && (
                  <div>
                    <span className="text-slate-400 text-xs block mb-2">รูปภาพที่แนบ ({ticket.images.length})</span>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {ticket.images.map((img) => (
                        <a
                          key={img.id}
                          href={img.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="aspect-square rounded-xl overflow-hidden border border-slate-200 block group relative hover:opacity-95"
                        >
                          <img src={img.url} alt="ticket photo" className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Status History Logs */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
                <h3 className="font-bold text-base text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#003882]" />
                  <span>ประวัติการอัปเดตสถานะ (Timeline)</span>
                </h3>

                <div className="mt-4 space-y-4">
                  {ticket.statusLogs && ticket.statusLogs.length > 0 ? (
                    ticket.statusLogs.map((log) => (
                      <div key={log.id} className="flex gap-3 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#003882] mt-1 shrink-0" />
                        <div className="flex-1 pb-3 border-b border-slate-100">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">
                              {STATUS_LABELS[log.status] || log.status}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {new Date(log.createdAt).toLocaleString('th-TH')}
                            </span>
                          </div>
                          {log.note && <p className="text-slate-600 mt-1 text-xs">{log.note}</p>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400">ยังไม่มีบันทึกสถานะเพิ่มเติม</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Live Chat with Staff (5 cols) */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col h-[540px]">
                {/* Chat Header */}
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 rounded-t-2xl">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#003882]" />
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">สนทนากับเจ้าหน้าที่</h4>
                      <p className="text-[10px] text-emerald-600 flex items-center gap-1 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        ระบบเชื่อมต่อเรียลไทม์
                      </p>
                    </div>
                  </div>
                </div>

                {/* Messages Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs">
                      <p>ยังไม่มีข้อความ</p>
                      <p className="mt-1">พิมพ์ข้อความเพื่อสอบถามเจ้าหน้าที่ได้เลยครับ</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isStaff = msg.fromStaff
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isStaff ? 'items-start' : 'items-end'}`}
                        >
                          <span className="text-[10px] text-slate-400 mb-1 px-1">
                            {isStaff ? (msg.user?.name ? `เจ้าหน้าที่: ${msg.user.name}` : 'เจ้าหน้าที่ CoolCare') : 'คุณ'}
                          </span>
                          <div
                            className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                              isStaff
                                ? 'bg-slate-100 text-slate-800 rounded-tl-xs'
                                : 'bg-[#003882] text-white rounded-tr-xs'
                            }`}
                          >
                            <p>{msg.text}</p>
                          </div>
                          <span className="text-[9px] text-slate-300 mt-0.5 px-1">
                            {new Date(msg.createdAt).toLocaleTimeString('th-TH', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Send Message Form */}
                <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 bg-white rounded-b-2xl">
                  {sendError && (
                    <p className="text-[11px] text-red-500 mb-2 px-1">{sendError}</p>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="พิมพ์ข้อความสอบถามที่นี่..."
                      className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#003882] outline-hidden"
                    />
                    <button
                      type="submit"
                      disabled={sendMessageMutation.isPending || !messageText.trim()}
                      className="px-3.5 py-2 rounded-xl bg-[#003882] hover:bg-[#002866] text-white disabled:opacity-40 transition cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
