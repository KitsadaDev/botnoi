import React, { useEffect, useState } from 'react'
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
  Send,
  MessageSquare,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react'
import api from '../lib/api'
import type { ApiResponse, Ticket, Message, TicketStatus } from '../lib/types'
import { SERVICE_LABELS, STATUS_LABELS, STATUS_COLORS } from '../lib/types'
import { formatDate } from '../lib/format'
import { SAMPLE_TRACKING_CODES } from '../lib/constants'

const STEP_ORDER: TicketStatus[] = ['SUBMITTED', 'RECEIVED', 'IN_PROGRESS', 'COMPLETED']

export const TrackTicketPage: React.FC = () => {
  const { code } = useParams<{ code?: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchInput, setSearchInput] = useState(code || '')
  const [messageText, setMessageText] = useState('')
  const [sendError, setSendError] = useState<string | null>(null)

  // ให้ช่องค้นหาตรงกับรหัสใน URL เสมอ (เช่น กด Back, คลิกรหัสตัวอย่าง, หรือกลับมาที่ /track)
  useEffect(() => {
    setSearchInput(code || '')
  }, [code])

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

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ['messages', code],
    queryFn: async () => {
      if (!code) return []
      const res = await api.get<ApiResponse<Message[]>>(`/tickets/${encodeURIComponent(code)}/messages`)
      return res.data.success ? res.data.data : []
    },
    enabled: Boolean(code),
    refetchInterval: 3000,
  })

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
    <div className="max-w-6xl mx-auto px-4 py-12 space-y-8">
      {/* 21st.dev Command Search Header */}
      <div className="bg-zinc-950 text-white rounded-3xl p-7 sm:p-10 border border-zinc-800 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-dark opacity-50 pointer-events-none" />
        <div className="absolute -top-24 right-1/4 w-72 h-72 rounded-full bg-sky-500/20 blur-3xl pointer-events-none" />

        <div className="max-w-2xl mx-auto text-center space-y-4 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-sky-400 text-xs font-mono font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>REAL-TIME TRACKING</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            ติดตามสถานะงานซ่อมเครื่องปรับอากาศ
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm">
            กรอกรหัสติดตามงานซ่อมของคุณเพื่อดูความคืบหน้า รายละเอียดช่าง และการสนทนาสด
          </p>

          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2.5 max-w-lg mx-auto pt-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={`ระบุรหัสงาน เช่น ${SAMPLE_TRACKING_CODES[0]}`}
                className="w-full pl-11 pr-4 py-3.5 text-sm font-mono tracking-wider uppercase bg-zinc-900/90 border border-zinc-700/80 text-white placeholder:text-zinc-500 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-hidden"
              />
            </div>
            <button
              type="submit"
              className="px-7 py-3.5 rounded-2xl font-bold text-sm bg-sky-400 hover:bg-sky-300 text-zinc-950 shadow-lg shadow-sky-500/20 transition-all cursor-pointer"
            >
              ค้นหาสถานะ
            </button>
          </form>

          {!code && (
            <div className="pt-3 flex items-center justify-center gap-2 text-xs text-zinc-400">
              <span>รหัสตัวอย่าง:</span>
              {SAMPLE_TRACKING_CODES.map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => {
                    setSearchInput(sample)
                    navigate(`/track/${sample}`)
                  }}
                  className="font-mono text-sky-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                >
                  {sample}
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isTicketLoading && (
        <div className="bg-white rounded-3xl p-12 text-center border border-zinc-200/90 shadow-xs">
          <RefreshCw className="w-8 h-8 text-sky-600 animate-spin mx-auto mb-3" />
          <p className="text-zinc-600 text-sm font-bold">กำลังซิงค์ข้อมูลสถานะงานซ่อม...</p>
        </div>
      )}

      {/* Error / Not Found */}
      {!isTicketLoading && isTicketError && (
        <div className="bg-white rounded-3xl p-12 text-center border border-rose-200 max-w-lg mx-auto shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-extrabold text-zinc-900">ไม่พบข้อมูลรหัสงานซ่อมนี้</h2>
          <p className="text-zinc-500 text-xs mt-1 mb-6">
            กรุณาตรวจสอบความถูกต้องของรหัสติดตามงาน หรือลองค้นหาด้วยรหัสตัวอย่าง {SAMPLE_TRACKING_CODES[0]}
          </p>
          <Link
            to="/book"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold bg-zinc-950 text-white hover:bg-zinc-800 transition"
          >
            แจ้งซ่อมเคสใหม่
          </Link>
        </div>
      )}

      {/* Loaded Ticket Details */}
      {!isTicketLoading && ticket && (
        <div className="space-y-8">
          {/* Main Status & Stepper Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200/90 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-100">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-2xl font-black text-zinc-950 tracking-wider">
                    {ticket.trackingCode}
                  </span>
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      STATUS_COLORS[ticket.status] || 'bg-zinc-100 text-zinc-700'
                    }`}
                  >
                    {STATUS_LABELS[ticket.status] || ticket.status}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1 font-mono">
                  CREATED: {new Date(ticket.createdAt).toLocaleString('th-TH')}
                </p>
              </div>

              <button
                onClick={() => refetchTicket()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 transition cursor-pointer self-start sm:self-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>อัปเดตข้อมูล</span>
              </button>
            </div>

            {/* 21st.dev Stepper Progress */}
            {ticket.status !== 'CANCELLED' ? (
              <div className="pt-8 pb-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative">
                  {STEP_ORDER.map((stepKey, idx) => {
                    const statusState = getStepStatus(stepKey, ticket.status)
                    const isCompleted = statusState === 'completed'
                    const isCurrent = statusState === 'current'

                    return (
                      <div
                        key={stepKey}
                        className={`p-4 rounded-2xl border transition-all ${
                          isCurrent
                            ? 'bg-zinc-950 text-white border-zinc-950 shadow-lg'
                            : isCompleted
                            ? 'bg-emerald-50/50 border-emerald-200/80 text-zinc-900'
                            : 'bg-zinc-50/70 border-zinc-200/60 text-zinc-400'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span
                            className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-bold text-xs ${
                              isCompleted
                                ? 'bg-emerald-500 text-white'
                                : isCurrent
                                ? 'bg-sky-400 text-zinc-950'
                                : 'bg-zinc-200 text-zinc-500'
                            }`}
                          >
                            {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : `0${idx + 1}`}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 font-semibold">
                              ACTIVE
                            </span>
                          )}
                        </div>

                        <p className={`text-xs font-bold ${isCurrent ? 'text-white' : isCompleted ? 'text-zinc-900' : 'text-zinc-500'}`}>
                          {STATUS_LABELS[stepKey]}
                        </p>
                        <p className={`text-[11px] mt-0.5 ${isCurrent ? 'text-zinc-400' : 'text-zinc-400'}`}>
                          {idx === 0
                            ? 'ระบบบันทึกคำขอแล้ว'
                            : idx === 1
                            ? 'จัดสรรทีมช่างเทคนิค'
                            : idx === 2
                            ? 'ช่างกำลังเข้าดำเนินการ'
                            : 'ตรวจรับและรับประกัน'}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="mt-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <div>
                  <p className="font-bold text-sm">เคสนี้ถูกยกเลิกแล้ว</p>
                  <p className="text-xs text-rose-600">
                    หากต้องการนัดหมายใหม่หรือสอบถามเพิ่มเติม กรุณาติดต่อ Call Center: 02-123-4567
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 2-Column Layout: Details & Technician vs Live Chat */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Assigned Technician Card */}
              {ticket.technician ? (
                <div className="bg-zinc-950 text-white rounded-3xl p-6 shadow-xl border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center font-black text-xl text-zinc-950 shadow-md">
                      {ticket.technician.name.slice(0, 1)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30 font-semibold">
                          ASSIGNED TECHNICIAN
                        </span>
                        <span className="text-xs text-zinc-400">• {ticket.technician.area}</span>
                      </div>
                      <h3 className="font-extrabold text-lg text-white">{ticket.technician.name}</h3>
                    </div>
                  </div>

                  <a
                    href={`tel:${ticket.technician.phone}`}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-sky-400 hover:bg-sky-300 text-zinc-950 font-bold text-xs transition shadow-sm"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span className="font-mono">{ticket.technician.phone}</span>
                  </a>
                </div>
              ) : (
                <div className="bg-amber-50/70 rounded-3xl p-5 border border-amber-200/80 flex items-center gap-3 text-xs text-amber-900">
                  <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                  <span className="font-medium">
                    เจ้าหน้าที่กำลังตรวจสอบคิวและประสานงานช่างเทคนิคในพื้นที่ของคุณ
                  </span>
                </div>
              )}

              {/* Equipment & Location Details */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-zinc-200/90 shadow-xs space-y-5">
                <h3 className="font-extrabold text-base text-zinc-950 pb-3 border-b border-zinc-100 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-sky-600" />
                  <span>ข้อมูลการแจ้งซ่อมและสถานที่</span>
                </h3>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-100">
                    <span className="text-zinc-400 block mb-1">ประเภทบริการ</span>
                    <span className="font-extrabold text-zinc-900 text-sm">
                      {SERVICE_LABELS[ticket.service] || ticket.service}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-100">
                    <span className="text-zinc-400 block mb-1">ยี่ห้อแอร์</span>
                    <span className="font-extrabold text-zinc-900 text-sm">{ticket.brand}</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-100">
                    <span className="text-zinc-400 block mb-1">วันที่นัดหมาย</span>
                    <span className="font-bold text-zinc-900">{formatDate(ticket.preferredDate)}</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-100">
                    <span className="text-zinc-400 block mb-1">ผู้ติดต่อ</span>
                    <span className="font-bold text-zinc-900">
                      {ticket.customerName} ({ticket.customerPhone})
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-zinc-400 text-xs font-semibold block mb-1.5">อาการ / รายละเอียดงาน</span>
                  <p className="text-xs text-zinc-800 bg-zinc-50 p-4 rounded-2xl border border-zinc-100 leading-relaxed">
                    {ticket.symptom}
                  </p>
                </div>

                <div>
                  <span className="text-zinc-400 text-xs font-semibold block mb-1.5">สถานที่ให้บริการ</span>
                  <div className="flex items-start gap-2.5 text-xs text-zinc-800 bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                    <MapPin className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="leading-relaxed">{ticket.address}</p>
                      {ticket.lat && ticket.lng && (
                        <p className="text-[11px] font-mono text-sky-600 font-semibold mt-1">
                          GPS: {ticket.lat}, {ticket.lng}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {ticket.images && ticket.images.length > 0 && (
                  <div>
                    <span className="text-zinc-400 text-xs font-semibold block mb-2">
                      รูปภาพหน้างาน ({ticket.images.length})
                    </span>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                      {ticket.images.map((img) => (
                        <a
                          key={img.id}
                          href={img.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="aspect-square rounded-2xl overflow-hidden border border-zinc-200 block hover:opacity-90 transition"
                        >
                          <img src={img.url} alt="ticket photo" className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Status Timeline History */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-zinc-200/90 shadow-xs">
                <h3 className="font-extrabold text-base text-zinc-950 pb-3 border-b border-zinc-100 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-sky-600" />
                  <span>ประวัติการอัปเดตสถานะ (Timeline)</span>
                </h3>

                <div className="mt-5 space-y-4">
                  {ticket.statusLogs && ticket.statusLogs.length > 0 ? (
                    ticket.statusLogs.map((log) => (
                      <div key={log.id} className="flex gap-3.5 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full bg-sky-500 mt-1.5 shrink-0 ring-4 ring-sky-50" />
                        <div className="flex-1 pb-4 border-b border-zinc-100">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-zinc-900">
                              {STATUS_LABELS[log.status] || log.status}
                            </span>
                            <span className="text-[11px] font-mono text-zinc-400">
                              {new Date(log.createdAt).toLocaleString('th-TH')}
                            </span>
                          </div>
                          {log.note && <p className="text-zinc-600 mt-1 text-xs">{log.note}</p>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-zinc-400">ยังไม่มีบันทึกสถานะเพิ่มเติม</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Live Chat (5 cols) */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-sm flex flex-col h-[560px] overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-950 text-white">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">แชทกับเจ้าหน้าที่ / ช่าง</h4>
                      <p className="text-[10px] text-emerald-400 flex items-center gap-1.5 font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        LIVE SYNC CONNECTED
                      </p>
                    </div>
                  </div>
                </div>

                {/* Messages Feed */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50/50">
                  {messages.length === 0 ? (
                    <div className="text-center py-16 text-zinc-400 text-xs">
                      <MessageSquare className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                      <p className="font-semibold text-zinc-600">ยังไม่มีข้อความสนทนา</p>
                      <p className="mt-0.5">พิมพ์สอบถามเวลาเข้าหน้างานหรือรายละเอียดเพิ่มเติมได้ทันที</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isStaff = msg.fromStaff
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isStaff ? 'items-start' : 'items-end'}`}
                        >
                          <span className="text-[10px] text-zinc-400 mb-1 px-1 font-medium">
                            {isStaff
                              ? msg.user?.name
                                ? `เจ้าหน้าที่: ${msg.user.name}`
                                : 'เจ้าหน้าที่ CoolCare'
                              : 'คุณ'}
                          </span>
                          <div
                            className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-2xs ${
                              isStaff
                                ? 'bg-white border border-zinc-200/80 text-zinc-800 rounded-tl-xs'
                                : 'bg-zinc-950 text-white rounded-tr-xs'
                            }`}
                          >
                            <p>{msg.text}</p>
                          </div>
                          <span className="text-[9px] font-mono text-zinc-400 mt-1 px-1">
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

                {/* Send Message Input */}
                <form onSubmit={handleSendMessage} className="p-3.5 border-t border-zinc-100 bg-white">
                  {sendError && <p className="text-[11px] text-rose-500 mb-2 px-1">{sendError}</p>}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="พิมพ์ข้อความสอบถามที่นี่..."
                      className="flex-1 px-4 py-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-sky-500 outline-hidden transition"
                    />
                    <button
                      type="submit"
                      disabled={sendMessageMutation.isPending || !messageText.trim()}
                      className="px-4 py-2.5 rounded-2xl bg-zinc-950 hover:bg-zinc-800 text-white disabled:opacity-40 transition cursor-pointer"
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
