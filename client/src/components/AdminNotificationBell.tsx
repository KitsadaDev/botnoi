import React, { useEffect, useRef, useState } from 'react'
import { Bell, CheckCheck, Sparkles, X } from 'lucide-react'
import api from '../lib/api'
import { Ticket, SERVICE_LABELS } from '../lib/types'

interface AdminNotificationBellProps {
  onNewTicketDetected?: (ticket: Ticket) => void
  onSelectTicket?: (ticket: Ticket) => void
}

// ฟังก์ชันสร้างเสียงติ๊งแจ้งเตือนด้วย Web Audio API (ไม่ต้องพึ่งไฟล์ .mp3)
function playNotificationSound() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime) // โน้ต A5
    osc.frequency.exponentialRampToValueAtTime(1318.5, ctx.currentTime + 0.15) // โน้ต E6

    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.4)
  } catch {
    // กรณีเบราว์เซอร์บล็อกเสียงก่อนคลิกหน้าเว็บ จะข้ามไปไม่ให้เกิด error
  }
}

export default function AdminNotificationBell({
  onNewTicketDetected,
  onSelectTicket,
}: AdminNotificationBellProps) {
  const [unreadTickets, setUnreadTickets] = useState<Ticket[]>([])
  const [toastTicket, setToastTicket] = useState<Ticket | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  // เก็บ ID เคสที่เคยเห็นแล้วเพื่อไม่ให้แจ้งเตือนซ้ำ
  const knownTicketIdsRef = useRef<Set<string>>(new Set())
  const isInitializedRef = useRef<boolean>(false)

  useEffect(() => {
    const checkNewTickets = async () => {
      try {
        const res = await api.get('/admin/tickets')
        const tickets: Ticket[] = res.data?.data || []

        // รอบแรกที่เปิดหน้าเว็บ: จำ ID เคสเดิมไว้ทั้งหมดก่อน (จะได้ไม่เด้งเตือนเคสเก่า)
        if (!isInitializedRef.current) {
          tickets.forEach((t) => knownTicketIdsRef.current.add(t.id))
          isInitializedRef.current = true
          return
        }

        // หาเคสใหม่ที่เพิ่งวิ่งเข้ามาและยังไม่เคยเห็น
        const newIncoming = tickets.filter((t) => !knownTicketIdsRef.current.has(t.id))

        if (newIncoming.length > 0) {
          newIncoming.forEach((t) => knownTicketIdsRef.current.add(t.id))

          // อัปเดตรายการในกระดิ่ง
          setUnreadTickets((prev) => [...newIncoming, ...prev])

          // แสดง Toast เคสล่าสุดที่เพิ่งเข้ามา
          const latestTicket = newIncoming[0]
          setToastTicket(latestTicket)
          playNotificationSound()

          // แจ้งหน้าหลักให้รีเฟรชตารางเคสอัตโนมัติ
          if (onNewTicketDetected) {
            onNewTicketDetected(latestTicket)
          }

          // ซ่อน Toast อัตโนมัติหลัง 6 วินาที
          setTimeout(() => {
            setToastTicket((current) => (current?.id === latestTicket.id ? null : current))
          }, 6000)
        }
      } catch (err) {
        console.error('Failed to poll tickets:', err)
      }
    }

    // เช็กครั้งแรกทันทีที่เปิดหน้า
    checkNewTickets()

    // เช็กซ้ำทุกๆ 10 วินาที
    const interval = setInterval(checkNewTickets, 10000)
    return () => clearInterval(interval)
  }, [onNewTicketDetected])

  const handleClearAll = () => {
    setUnreadTickets([])
    setIsOpen(false)
  }

  const handleClickItem = (ticket: Ticket) => {
    setUnreadTickets((prev) => prev.filter((t) => t.id !== ticket.id))
    setIsOpen(false)
    if (onSelectTicket) {
      onSelectTicket(ticket)
    }
  }

  return (
    <div className="relative inline-block">
      {/* ปุ่มกระดิ่งแจ้งเตือน */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-700 shadow-sm transition hover:bg-zinc-50"
        title="การแจ้งเตือนเคสใหม่"
      >
        <Bell className="h-5 w-5" />
        {unreadTickets.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-xs font-bold text-white shadow">
            {unreadTickets.length}
          </span>
        )}
      </button>

      {/* กล่อง Dropdown แสดงรายการเคสใหม่เมื่อกดกระดิ่ง */}
      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-zinc-200 bg-white p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between border-b border-zinc-100 pb-2">
            <span className="text-sm font-semibold text-zinc-800">
              เคสใหม่ที่เข้ามา ({unreadTickets.length})
            </span>
            {unreadTickets.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex items-center gap-1 text-xs font-medium text-sky-600 hover:text-sky-700"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                อ่านทั้งหมดแล้ว
              </button>
            )}
          </div>

          {unreadTickets.length === 0 ? (
            <div className="py-6 text-center text-xs text-zinc-400">
              ยังไม่มีเคสใหม่วิ่งเข้ามาในขณะนี้
            </div>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {unreadTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => handleClickItem(ticket)}
                  className="cursor-pointer rounded-xl bg-sky-50/70 p-2.5 transition hover:bg-sky-100/80"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-700">
                      {ticket.trackingCode}
                    </span>
                    <span className="rounded-md bg-white px-1.5 py-0.5 text-[11px] font-medium text-zinc-600 shadow-xs">
                      {SERVICE_LABELS[ticket.service] || ticket.service}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-zinc-800">
                    ลูกค้า: {ticket.customerName} ({ticket.customerPhone})
                  </p>
                  <p className="mt-0.5 truncate text-xs text-zinc-500">
                    อาการ: {ticket.symptom}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Toast เด้งมุมขวาบนเมื่อมีเคสใหม่วิ่งเข้ามา */}
      {toastTicket && (
        <div className="fixed top-5 right-5 z-50 flex w-80 items-start gap-3 rounded-2xl border border-sky-200 bg-white p-4 shadow-2xl ring-1 ring-sky-500/10">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1 text-left">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-600">
                มีเคสแจ้งซ่อมใหม่เข้ามา!
              </span>
              <button
                type="button"
                onClick={() => setToastTicket(null)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-0.5 text-sm font-semibold text-zinc-900">
              {toastTicket.trackingCode} — {SERVICE_LABELS[toastTicket.service]}
            </p>
            <p className="text-xs text-zinc-600">
              คุณ {toastTicket.customerName} ({toastTicket.brand})
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
