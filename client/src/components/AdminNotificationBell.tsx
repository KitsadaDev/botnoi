import React, { useEffect, useRef, useState } from 'react'
import {
  Bell,
  CheckCheck,
  Sparkles,
  X,
  Clock,
  Volume2,
  VolumeX,
  Inbox,
  ChevronRight,
} from 'lucide-react'
import api from '../lib/api'
import type { Ticket } from '../lib/types'
import { SERVICE_LABELS, STATUS_LABELS, STATUS_COLORS } from '../lib/types'

interface AdminNotificationBellProps {
  onNewTicketDetected?: (ticket: Ticket) => void
  onSelectTicket?: (ticket: Ticket) => void
}

const STORAGE_READ_KEY = 'coolcare_admin_read_ticket_ids'
const STORAGE_MUTE_KEY = 'coolcare_admin_notif_muted'

// ฟังก์ชันแปลงเวลาเป็น "เมื่อสักครู่", "X นาทีที่แล้ว"
function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return ''
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000)

  if (diffSec < 60) return 'เมื่อสักครู่'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour} ชม. ที่แล้ว`
  const diffDay = Math.floor(diffHour / 24)
  return `${diffDay} วันที่แล้ว`
}

// ฟังก์ชันสร้างเสียงแจ้งเตือน 2 จังหวะแบบโมเดิร์นด้วย Web Audio API
function playNotificationSound() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioCtx()

    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, startTime)
      gain.gain.setValueAtTime(0.15, startTime)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(startTime)
      osc.stop(startTime + duration)
    }

    const now = ctx.currentTime
    playTone(880, now, 0.15) // A5
    playTone(1318.5, now + 0.12, 0.3) // E6
  } catch {
    // ข้ามกรณีเบราว์เซอร์ยังไม่ให้เล่นเสียงอัตโนมัติ
  }
}

export default function AdminNotificationBell({
  onNewTicketDetected,
  onSelectTicket,
}: AdminNotificationBellProps) {
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([])
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_READ_KEY)
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch {
      return new Set()
    }
  })
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_MUTE_KEY) === 'true'
  })
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all')
  const [toastTicket, setToastTicket] = useState<Ticket | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [lastSyncedText, setLastSyncedText] = useState<string>('เพิ่งอัปเดต')

  const dropdownRef = useRef<HTMLDivElement>(null)
  const knownTicketIdsRef = useRef<Set<string>>(new Set())
  const isInitializedRef = useRef<boolean>(false)

  // บันทึกรายการที่อ่านแล้วลง localStorage
  const saveReadIds = (nextSet: Set<string>) => {
    setReadIds(new Set(nextSet))
    try {
      localStorage.setItem(STORAGE_READ_KEY, JSON.stringify(Array.from(nextSet)))
    } catch {
      // ignore storage error
    }
  }

  // ปิด Dropdown เมื่อคลิกข้างนอก
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const checkTickets = async () => {
      try {
        const res = await api.get('/admin/tickets')
        const tickets: Ticket[] = res.data?.data || []

        // เรียงจากใหม่สุดไปเก่าสุด และเก็บประวัติ 15 เคสล่าสุด
        const sorted = [...tickets]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 15)

        setRecentTickets(sorted)
        setLastSyncedText(
          new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        )

        // รอบแรกที่โหลดหน้าเว็บ: จำ ID ทั้งหมดที่มีอยู่ก่อน เพื่อเช็กเฉพาะเคสที่เพิ่งวิ่งเข้ามาใหม่จริงๆ
        if (!isInitializedRef.current) {
          tickets.forEach((t) => knownTicketIdsRef.current.add(t.id))
          // เคสเก่าที่ดำเนินการไปแล้ว (ไม่ใช่ SUBMITTED) ให้ถือว่าอ่านแล้วโดยอัตโนมัติในครั้งแรก
          const stored = localStorage.getItem(STORAGE_READ_KEY)
          if (!stored) {
            const initialRead = new Set<string>()
            tickets.forEach((t) => {
              if (t.status !== 'SUBMITTED') {
                initialRead.add(t.id)
              }
            })
            saveReadIds(initialRead)
          }
          isInitializedRef.current = true
          return
        }

        // เช็กว่ามีเคสใหม่ที่ยังไม่เคยอยู่ในระบบวิ่งเข้ามาหรือไม่
        const newIncoming = sorted.filter((t) => !knownTicketIdsRef.current.has(t.id))

        if (newIncoming.length > 0) {
          newIncoming.forEach((t) => knownTicketIdsRef.current.add(t.id))

          const latestTicket = newIncoming[0]
          setToastTicket(latestTicket)

          if (!isMuted) {
            playNotificationSound()
          }

          if (onNewTicketDetected) {
            onNewTicketDetected(latestTicket)
          }

          setTimeout(() => {
            setToastTicket((current) => (current?.id === latestTicket.id ? null : current))
          }, 7000)
        }
      } catch (err) {
        console.error('Failed to poll tickets:', err)
      }
    }

    checkTickets()
    const interval = setInterval(checkTickets, 8000)
    return () => clearInterval(interval)
  }, [isMuted, onNewTicketDetected])

  const unreadTickets = recentTickets.filter((t) => !readIds.has(t.id))
  const displayedTickets = activeTab === 'unread' ? unreadTickets : recentTickets

  const handleMarkAllRead = () => {
    const next = new Set(readIds)
    recentTickets.forEach((t) => next.add(t.id))
    saveReadIds(next)
  }

  const handleSelectTicket = (ticket: Ticket) => {
    const next = new Set(readIds)
    next.add(ticket.id)
    saveReadIds(next)
    setIsOpen(false)
    setToastTicket(null)
    if (onSelectTicket) {
      onSelectTicket(ticket)
    }
  }

  const toggleMute = () => {
    const next = !isMuted
    setIsMuted(next)
    localStorage.setItem(STORAGE_MUTE_KEY, String(next))
    if (!next) {
      playNotificationSound()
    }
  }

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* ปุ่มกระดิ่งพร้อม Animation */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative inline-flex items-center justify-center rounded-2xl border p-2.5 transition cursor-pointer ${
          isOpen
            ? 'border-sky-400 bg-sky-500/20 text-sky-300'
            : 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800'
        }`}
        title="ศูนย์การแจ้งเตือนและประวัติเคสล่าสุด"
      >
        <Bell className={`h-5 w-5 ${unreadTickets.length > 0 ? 'text-sky-400' : ''}`} />
        {unreadTickets.length > 0 && (
          <span className=" -top-1.5 -right-1.5 absolute flex h-5 min-w-[20px] items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-extrabold text-white shadow-md">
              {unreadTickets.length}
            </span>
          </span>
        )}
      </button>

      {/* กล่อง Notification Center Dropdown */}
      {isOpen && (
        <div className="absolute right-0 z-50 mt-3 w-80 sm:w-96 overflow-hidden rounded-3xl border border-zinc-200 bg-white text-zinc-900 shadow-2xl ring-1 ring-zinc-950/5">
          {/* ส่วนหัว Dropdown โทนเข้มเข้ากับ Console */}
          <div className="bg-zinc-950 px-5 py-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <h3 className="text-sm font-extrabold tracking-tight">ศูนย์แจ้งเตือนเคส (Live Feed)</h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="rounded-xl bg-zinc-800/80 p-1.5 text-zinc-300 hover:bg-zinc-700 hover:text-white transition cursor-pointer"
                  title={isMuted ? 'เปิดเสียงแจ้งเตือน' : 'ปิดเสียงแจ้งเตือน'}
                >
                  {isMuted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4 text-sky-400" />}
                </button>
                {unreadTickets.length > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="inline-flex items-center gap-1 rounded-xl bg-sky-500/20 border border-sky-500/30 px-2.5 py-1 text-[11px] font-bold text-sky-300 hover:bg-sky-500/30 transition cursor-pointer"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    <span>อ่านทั้งหมด</span>
                  </button>
                )}
              </div>
            </div>

            {/* แท็บสลับ ทั้งหมด / ยังไม่อ่าน */}
            <div className="mt-3 flex gap-1.5 rounded-xl bg-zinc-900 p-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`flex-1 rounded-lg py-1.5 font-bold transition cursor-pointer ${
                  activeTab === 'all' ? 'bg-sky-400 text-zinc-950 shadow-xs' : 'text-zinc-400 hover:text-white'
                }`}
              >
                ประวัติล่าสุด ({recentTickets.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('unread')}
                className={`flex-1 rounded-lg py-1.5 font-bold transition cursor-pointer ${
                  activeTab === 'unread' ? 'bg-sky-400 text-zinc-950 shadow-xs' : 'text-zinc-400 hover:text-white'
                }`}
              >
                ยังไม่อ่าน ({unreadTickets.length})
              </button>
            </div>
          </div>

          {/* รายการเคสย้อนหลัง */}
          <div className="max-h-96 divide-y divide-zinc-100 overflow-y-auto bg-white">
            {displayedTickets.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400">
                  <Inbox className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold text-zinc-700">ไม่มีรายการแจ้งเตือนค้างอยู่</p>
                <p className="mt-0.5 text-[11px] text-zinc-400">
                  เมื่อมีลูกค้าส่งเคสเข้ามาใหม่ ระบบจะแสดงประวัติที่นี่ทันที
                </p>
              </div>
            ) : (
              displayedTickets.map((ticket) => {
                const isUnread = !readIds.has(ticket.id)
                return (
                  <div
                    key={ticket.id}
                    onClick={() => handleSelectTicket(ticket)}
                    className={`group relative flex cursor-pointer items-start gap-3 p-4 transition ${
                      isUnread ? 'bg-sky-50/60 hover:bg-sky-100/60' : 'bg-white hover:bg-zinc-50'
                    }`}
                  >
                    {/* จุดสถานะยังไม่อ่าน */}
                    <div className="mt-1.5 flex shrink-0 items-center">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          isUnread ? 'bg-sky-500 ring-4 ring-sky-500/20' : 'bg-zinc-200'
                        }`}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-black text-zinc-950">
                          {ticket.trackingCode}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            STATUS_COLORS[ticket.status] || 'bg-zinc-100 text-zinc-700'
                          }`}
                        >
                          {STATUS_LABELS[ticket.status] || ticket.status}
                        </span>
                      </div>

                      <p className="mt-1 text-xs font-bold text-zinc-800">
                        {SERVICE_LABELS[ticket.service] || ticket.service} ({ticket.brand}) — คุณ{ticket.customerName}
                      </p>

                      <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">
                        อาการ: {ticket.symptom}
                      </p>

                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-zinc-400">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimeAgo(ticket.createdAt)}
                        </span>
                        <span className="inline-flex items-center gap-0.5 font-semibold text-sky-600 opacity-0 transition group-hover:opacity-100">
                          จัดการเคส <ChevronRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* แถบสถานะด้านล่าง */}
          <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50 px-4 py-2.5 text-[11px] text-zinc-400">
            <span>ซิงค์ข้อมูลอัตโนมัติ</span>
            <span>อัปเดตล่าสุด: {lastSyncedText}</span>
          </div>
        </div>
      )}

      {/* Toast เด้งมุมขวาบนเวลาเคสใหม่วิ่งเข้าสดๆ */}
      {toastTicket && (
        <div className="fixed top-5 right-5 z-50 w-80 sm:w-96 overflow-hidden rounded-3xl border border-sky-500/30 bg-zinc-950 p-4 text-white shadow-2xl">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>

            <div className="min-w-0 flex-1 text-left">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-sky-400">
                  <span className="h-2 w-2 rounded-full bg-sky-400 animate-ping" />
                  มีเคสแจ้งซ่อมใหม่เข้ามา!
                </span>
                <button
                  type="button"
                  onClick={() => setToastTicket(null)}
                  className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="mt-1 font-mono text-sm font-black text-white">
                {toastTicket.trackingCode} • {SERVICE_LABELS[toastTicket.service]}
              </p>
              <p className="mt-0.5 text-xs text-zinc-300">
                ลูกค้า: <span className="font-bold text-white">{toastTicket.customerName}</span> ({toastTicket.brand})
              </p>
              <p className="mt-0.5 truncate text-xs text-zinc-400">
                อาการ: {toastTicket.symptom}
              </p>

              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectTicket(toastTicket)}
                  className="inline-flex items-center gap-1 rounded-xl bg-sky-400 px-3 py-1.5 text-xs font-bold text-zinc-950 hover:bg-sky-300 transition cursor-pointer"
                >
                  <span>เปิดดูเคสทันที</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
