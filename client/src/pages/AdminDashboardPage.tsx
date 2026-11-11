import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search,
  CheckCircle2,
  Clock,
  UserCheck,
  Send,
  MessageSquare,
  X,
  RefreshCw,
  LayoutDashboard,
  Inbox,
  Activity,
  PhoneCall,
  Globe,
  MessagesSquare,
  FileDown,
  FileSpreadsheet,
  Trash2,
} from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import type { ApiResponse, Ticket, Technician, Message, TicketStatus, TicketCounts } from '../lib/types'
import { SERVICE_LABELS, STATUS_LABELS, STATUS_COLORS } from '../lib/types'
import { formatDate } from '../lib/format'
import { exportDashboardToPdf } from '../lib/pdfExport'
import { exportDashboardToExcel } from '../lib/excelExport'
import AdminNotificationBell from '../components/AdminNotificationBell'

export const AdminDashboardPage: React.FC = () => {
  const { user, isStaff, isLoading: isAuthLoading } = useAuth()
  const queryClient = useQueryClient()

  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [isExportingPdf, setIsExportingPdf] = useState(false)

  const [newStatus, setNewStatus] = useState<TicketStatus>('RECEIVED')
  const [statusNote, setStatusNote] = useState('')
  const [assignedTechId, setAssignedTechId] = useState<string>('')
  const [staffMessageText, setStaffMessageText] = useState('')

  const {
    data: ticketData,
    isLoading: isTicketsLoading,
    refetch: refetchTickets,
  } = useQuery<{ tickets: Ticket[]; counts: TicketCounts | null }>({
    queryKey: ['adminTickets', selectedStatus, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedStatus) params.append('status', selectedStatus)
      if (searchQuery) params.append('q', searchQuery)
      const res = await api.get<ApiResponse<Ticket[]> & { counts?: TicketCounts }>(
        `/admin/tickets?${params.toString()}`
      )
      return res.data.success
        ? { tickets: res.data.data, counts: res.data.counts ?? null }
        : { tickets: [], counts: null }
    },
    enabled: isStaff,
    refetchInterval: 6000,
  })
  const tickets = ticketData?.tickets ?? []
  const ticketCounts = ticketData?.counts

  const { data: technicians = [] } = useQuery<Technician[]>({
    queryKey: ['technicians'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Technician[]>>('/admin/technicians')
      return res.data.success ? res.data.data : []
    },
    enabled: isStaff,
  })

  const { data: activeTicket } = useQuery<Ticket>({
    queryKey: ['adminTicketDetail', selectedTicketId],
    queryFn: async () => {
      if (!selectedTicketId) throw new Error('No ID')
      const res = await api.get<ApiResponse<Ticket>>(`/admin/tickets/${selectedTicketId}`)
      return res.data.data
    },
    enabled: Boolean(selectedTicketId),
  })

  const { data: activeMessages = [] } = useQuery<Message[]>({
    queryKey: ['adminMessages', activeTicket?.trackingCode],
    queryFn: async () => {
      if (!activeTicket?.trackingCode) return []
      const res = await api.get<ApiResponse<Message[]>>(`/tickets/${activeTicket.trackingCode}/messages`)
      return res.data.success ? res.data.data : []
    },
    enabled: Boolean(activeTicket?.trackingCode),
    refetchInterval: 3000,
  })

  const updateTicketMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTicketId) return
      const payload: any = {
        status: newStatus,
        note: statusNote || undefined,
      }
      payload.technicianId = assignedTechId || null
      const res = await api.patch<ApiResponse<Ticket>>(`/admin/tickets/${selectedTicketId}`, payload)
      if (!res.data.success) throw new Error(res.data.error || 'อัปเดตไม่สำเร็จ')
      return res.data.data
    },
    onSuccess: () => {
      setStatusNote('')
      queryClient.invalidateQueries({ queryKey: ['adminTickets'] })
      queryClient.invalidateQueries({ queryKey: ['adminTicketDetail', selectedTicketId] })
      alert('อัปเดตข้อมูลเคสเรียบร้อยแล้ว')
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'เกิดข้อผิดพลาดในการอัปเดต')
    },
  })

  const deleteTicketMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      const res = await api.delete<ApiResponse<null>>(`/admin/tickets/${ticketId}`)
      if (!res.data.success) throw new Error(res.data.error || 'ลบไม่สำเร็จ')
    },
    onSuccess: (_data, deletedId) => {
      if (selectedTicketId === deletedId) {
        setSelectedTicketId(null)
      }
      queryClient.invalidateQueries({ queryKey: ['adminTickets'] })
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'เกิดข้อผิดพลาดในการลบเคส')
    },
  })

  const handleDeleteTicket = (ticket: Ticket) => {
    if (
      window.confirm(
        `ยืนยันการลบใบงาน ${ticket.trackingCode} (${ticket.customerName}) ออกจากระบบถาวรหรือไม่?`
      )
    ) {
      deleteTicketMutation.mutate(ticket.id)
    }
  }

  const sendStaffMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!selectedTicketId) return
      const res = await api.post<ApiResponse<Message>>(`/admin/tickets/${selectedTicketId}/messages`, {
        text,
      })
      if (!res.data.success) throw new Error(res.data.error || 'ส่งข้อความไม่สำเร็จ')
      return res.data.data
    },
    onSuccess: () => {
      setStaffMessageText('')
      queryClient.invalidateQueries({ queryKey: ['adminMessages', activeTicket?.trackingCode] })
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'ส่งข้อความไม่สำเร็จ')
    },
  })

  if (isAuthLoading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw className="w-8 h-8 text-orange-600 animate-spin mx-auto mb-2" />
        <p className="text-zinc-500 text-sm">กำลังตรวจสอบสิทธิ์...</p>
      </div>
    )
  }

  if (!user || !isStaff) {
    return <Navigate to="/login" replace />
  }

  const countTotal = ticketCounts?.total ?? tickets.length
  const countSubmitted =
    ticketCounts?.SUBMITTED ?? tickets.filter((t) => t.status === 'SUBMITTED').length
  const countInProgress = ticketCounts
    ? ticketCounts.RECEIVED + ticketCounts.IN_PROGRESS
    : tickets.filter((t) => t.status === 'RECEIVED' || t.status === 'IN_PROGRESS').length
  const countCompleted =
    ticketCounts?.COMPLETED ?? tickets.filter((t) => t.status === 'COMPLETED').length

  const openTicketModal = (ticket: Ticket) => {
    setSelectedTicketId(ticket.id)
    setNewStatus(ticket.status)
    setAssignedTechId(ticket.technicianId || '')
    setStatusNote('')
  }

  const handleSendStaffMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!staffMessageText.trim() || sendStaffMessageMutation.isPending) return
    sendStaffMessageMutation.mutate(staffMessageText.trim())
  }

  const handleExportPdf = async () => {
    if (isExportingPdf) return
    setIsExportingPdf(true)
    try {
      await exportDashboardToPdf({
        staffName: user.name,
        staffRole: user.role,
        selectedStatus,
        searchQuery,
        summary: {
          total: countTotal,
          submitted: countSubmitted,
          inProgress: countInProgress,
          completed: countCompleted,
        },
        tickets,
      })
    } catch (err) {
      console.error('Failed to export PDF:', err)
      alert('เกิดข้อผิดพลาดในการสร้างไฟล์ PDF')
    } finally {
      setIsExportingPdf(false)
    }
  }

  const handleExportExcel = () => {
    try {
      exportDashboardToExcel({
        staffName: user.name,
        staffRole: user.role,
        selectedStatus,
        searchQuery,
        summary: {
          total: countTotal,
          submitted: countSubmitted,
          inProgress: countInProgress,
          completed: countCompleted,
        },
        tickets,
      })
    } catch (err) {
      console.error('Failed to export Excel:', err)
      alert('เกิดข้อผิดพลาดในการสร้างไฟล์ Excel')
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-8">
      {/* Top Console Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-950 text-white p-6 sm:p-8 rounded-3xl border border-zinc-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-mono uppercase px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold">
              <LayoutDashboard className="w-3.5 h-3.5" />
              {user.role} CONSOLE
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            ศูนย์ควบคุมและจ่ายงานซ่อม (Staff Portal)
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            ผู้ปฏิบัติงาน: <span className="font-semibold text-white">{user.name}</span> • ระบบซิงค์รายการอัตโนมัติ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          <AdminNotificationBell
            onNewTicketDetected={() => {
              refetchTickets()
            }}
            onSelectTicket={(ticket) => {
              openTicketModal(ticket)
            }}
          />

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isTicketsLoading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 disabled:opacity-50 transition shadow-sm cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExportingPdf || isTicketsLoading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 disabled:opacity-50 transition shadow-sm cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5 text-orange-400" />
            <span>{isExportingPdf ? 'กำลังสร้าง PDF...' : 'Export PDF'}</span>
          </button>

          <button
            type="button"
            onClick={() => refetchTickets()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-zinc-950 bg-orange-400 hover:bg-orange-300 transition shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>รีเฟรชรายการ</span>
          </button>
        </div>
      </div>

      {/* 21st.dev Metric Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-extrabold text-zinc-900">
            สถิติใบงานแจ้งซ่อม (Ticket Status)
          </h2>
          <span className="text-[11px] font-semibold text-zinc-400">ข้อมูลเรียลไทม์จากระบบ</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-3xl border border-zinc-200/90 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400 font-semibold">เคสทั้งหมด</p>
              <p className="text-3xl font-black text-zinc-950 mt-1">{countTotal}</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-zinc-100 text-zinc-700 flex items-center justify-center">
              <Inbox className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-zinc-200/90 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400 font-semibold">ยังไม่ปิด / รอรับเรื่อง</p>
              <p className="text-3xl font-black text-orange-600 mt-1">{countSubmitted}</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-zinc-200/90 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400 font-semibold">กำลังปฏิบัติงาน</p>
              <p className="text-3xl font-black text-amber-600 mt-1">{countInProgress}</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-zinc-200/90 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400 font-semibold">ปิดแล้ว / เสร็จสิ้น</p>
              <p className="text-3xl font-black text-emerald-600 mt-1">{countCompleted}</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Contact Channels Summary (Mock Data) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-extrabold text-zinc-900">
              จำนวนข้อความที่ติดต่อเข้ามา (แยกตามช่องทาง)
            </h2>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-full bg-zinc-200/80 text-zinc-600">
              Mock Data
            </span>
          </div>
          <span className="text-[11px] font-semibold text-zinc-400">ยอดสะสมประจำเดือนนี้</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-3xl border border-zinc-200/90 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400 font-semibold">ติดต่อเข้ามาทั้งหมด</p>
              <p className="text-3xl font-black text-zinc-950 mt-1">311</p>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">+14% จากเดือนก่อน</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-zinc-100 text-zinc-700 flex items-center justify-center">
              <MessagesSquare className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-zinc-200/90 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400 font-semibold">จากแชท (LINE / Chat)</p>
              <p className="text-3xl font-black text-indigo-600 mt-1">148</p>
              <p className="text-[11px] text-zinc-400 mt-1">คิดเป็น 47.6%</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-zinc-200/90 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400 font-semibold">จากโทร (Call Center)</p>
              <p className="text-3xl font-black text-rose-600 mt-1">68</p>
              <p className="text-[11px] text-zinc-400 mt-1">คิดเป็น 21.9%</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <PhoneCall className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-zinc-200/90 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400 font-semibold">จากเว็บ (Website)</p>
              <p className="text-3xl font-black text-teal-600 mt-1">95</p>
              <p className="text-[11px] text-zinc-400 mt-1">คิดเป็น 30.5%</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-zinc-200/90 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto p-1 bg-zinc-100 rounded-2xl">
          {[
            { value: '', label: 'ทั้งหมด' },
            { value: 'SUBMITTED', label: 'รอรับเรื่อง' },
            { value: 'RECEIVED', label: 'รับเรื่องแล้ว' },
            { value: 'IN_PROGRESS', label: 'กำลังซ่อม' },
            { value: 'COMPLETED', label: 'เสร็จสิ้น' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSelectedStatus(tab.value)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedStatus === tab.value
                  ? 'bg-zinc-950 text-white shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหารหัสงาน, ชื่อลูกค้า, เบอร์โทร..."
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-hidden transition"
          />
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-600">
            <thead className="bg-zinc-50/80 text-zinc-500 font-mono text-[11px] uppercase tracking-wider border-b border-zinc-200/80">
              <tr>
                <th className="px-6 py-4">Tracking ID</th>
                <th className="px-6 py-4">ลูกค้า / เบอร์ติดต่อ</th>
                <th className="px-6 py-4">บริการ & ยี่ห้อ</th>
                <th className="px-6 py-4">วันนัดหมาย</th>
                <th className="px-6 py-4">ช่างผู้รับผิดชอบ</th>
                <th className="px-6 py-4">สถานะ</th>
                <th className="px-6 py-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {isTicketsLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-14">
                    <RefreshCw className="w-6 h-6 text-orange-600 animate-spin mx-auto mb-2" />
                    <span>กำลังโหลดรายการงานซ่อม...</span>
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-14 text-zinc-400">
                    ไม่พบรายการงานซ่อมตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-zinc-950">{t.trackingCode}</td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-zinc-900">{t.customerName}</p>
                      <p className="text-[11px] font-mono text-zinc-400">{t.customerPhone}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-zinc-900">{SERVICE_LABELS[t.service] || t.service}</span>
                      <p className="text-[11px] text-zinc-500">{t.brand}</p>
                    </td>
                    <td className="px-6 py-4 font-mono font-medium text-zinc-700">{formatDate(t.preferredDate)}</td>
                    <td className="px-6 py-4">
                      {t.technician ? (
                        <div>
                          <p className="font-bold text-zinc-900">{t.technician.name}</p>
                          <p className="text-[11px] text-zinc-400">{t.technician.area}</p>
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-semibold text-[11px]">
                          ยังไม่ระบุช่าง
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full font-bold text-[11px] ${
                          STATUS_COLORS[t.status] || 'bg-zinc-100 text-zinc-700'
                        }`}
                      >
                        {STATUS_LABELS[t.status] || t.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openTicketModal(t)}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-zinc-950 hover:bg-orange-600 transition shadow-2xs cursor-pointer"
                        >
                          จัดการเคส
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTicket(t)}
                          disabled={deleteTicketMutation.isPending}
                          title="ลบใบงานถาวร"
                          className="p-2 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-200 transition cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Ticket Management */}
      {selectedTicketId && activeTicket && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-zinc-200">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xl font-black text-zinc-950">
                  {activeTicket.trackingCode}
                </span>
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full ${
                    STATUS_COLORS[activeTicket.status]
                  }`}
                >
                  {STATUS_LABELS[activeTicket.status]}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDeleteTicket(activeTicket)}
                  disabled={deleteTicketMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-200 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ลบเคสนี้</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTicketId(null)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Customer & Equipment Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-zinc-50 p-5 rounded-2xl border border-zinc-200/80 text-xs">
                <div>
                  <p className="text-zinc-400 font-semibold mb-1">ข้อมูลลูกค้า</p>
                  <p className="font-extrabold text-zinc-950 text-sm">
                    {activeTicket.customerName} ({activeTicket.customerPhone})
                  </p>
                  <p className="text-zinc-600 mt-2 leading-relaxed">
                    <span className="font-bold text-zinc-800">ที่อยู่:</span> {activeTicket.address}
                  </p>
                  {activeTicket.lat && activeTicket.lng && (
                    <p className="text-[11px] font-mono text-orange-600 mt-1">
                      GPS: {activeTicket.lat}, {activeTicket.lng}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-zinc-400 font-semibold mb-1">บริการ & อาการ</p>
                  <p className="font-extrabold text-zinc-950 text-sm">
                    {SERVICE_LABELS[activeTicket.service]} • {activeTicket.brand}
                  </p>
                  <p className="text-zinc-600 mt-2">
                    <span className="font-bold text-zinc-800">วันนัดหมาย:</span> {formatDate(activeTicket.preferredDate)}
                  </p>
                  <p className="text-zinc-600 mt-1">
                    <span className="font-bold text-zinc-800">อาการ:</span> {activeTicket.symptom}
                  </p>
                </div>
              </div>

              {activeTicket.images && activeTicket.images.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-zinc-700 mb-2">รูปภาพหน้างานที่แนบ:</p>
                  <div className="grid grid-cols-4 gap-2.5">
                    {activeTicket.images.map((img) => (
                      <a
                        key={img.id}
                        href={img.url}
                        target="_blank"
                        rel="noreferrer"
                        className="aspect-square rounded-2xl overflow-hidden border border-zinc-200 block"
                      >
                        <img src={img.url} alt="ticket" className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Update Status & Technician Form */}
              <div className="bg-zinc-950 text-white p-6 rounded-3xl border border-zinc-800 space-y-4">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-orange-400" />
                  <span>อัปเดตสถานะและมอบหมายช่างเทคนิค</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-zinc-300 mb-1.5">ปรับสถานะงาน</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as TicketStatus)}
                      className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 text-white rounded-xl font-semibold outline-hidden focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="SUBMITTED">ส่งเรื่องแล้ว (SUBMITTED)</option>
                      <option value="RECEIVED">รับเรื่องแล้ว (RECEIVED)</option>
                      <option value="IN_PROGRESS">ช่างกำลังเข้าซ่อม (IN_PROGRESS)</option>
                      <option value="COMPLETED">เสร็จสิ้น (COMPLETED)</option>
                      <option value="CANCELLED">ยกเลิก (CANCELLED)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-zinc-300 mb-1.5">มอบหมายช่างเทคนิค</label>
                    <select
                      value={assignedTechId}
                      onChange={(e) => setAssignedTechId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 text-white rounded-xl font-semibold outline-hidden focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">-- ไม่ระบุช่าง --</option>
                      {technicians.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.area} - {t.phone})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-zinc-300 mb-1.5">
                      บันทึกข้อความสถานะ (แสดงใน Timeline ของลูกค้า)
                    </label>
                    <input
                      type="text"
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      placeholder="เช่น มอบหมายช่างสมชายเข้าตรวจสอบหน้างานเวลา 10:00 น."
                      className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 text-white placeholder:text-zinc-500 rounded-xl outline-hidden focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => updateTicketMutation.mutate()}
                    disabled={updateTicketMutation.isPending}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-orange-400 hover:bg-orange-300 text-zinc-950 shadow-sm disabled:opacity-50 transition cursor-pointer"
                  >
                    {updateTicketMutation.isPending ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                  </button>
                </div>
              </div>

              {/* Live Chat with Customer */}
              <div className="border border-zinc-200 rounded-3xl overflow-hidden">
                <div className="bg-zinc-50 px-5 py-3.5 border-b border-zinc-200 flex items-center justify-between">
                  <span className="font-bold text-xs text-zinc-900 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-orange-600" />
                    <span>แชทสนทนากับลูกค้า (Live Chat)</span>
                  </span>
                  <span className="text-[11px] text-zinc-400">ซิงค์ข้อความแบบเรียลไทม์</span>
                </div>

                <div className="p-4 max-h-56 overflow-y-auto space-y-3 bg-white">
                  {activeMessages.length === 0 ? (
                    <p className="text-center text-xs text-zinc-400 py-6">ยังไม่มีข้อความสนทนาในเคสนี้</p>
                  ) : (
                    activeMessages.map((m) => (
                      <div
                        key={m.id}
                        className={`flex flex-col ${m.fromStaff ? 'items-end' : 'items-start'}`}
                      >
                        <span className="text-[10px] text-zinc-400 mb-0.5 px-1">
                          {m.fromStaff ? `เจ้าหน้าที่ (${m.user?.name || 'Staff'})` : activeTicket.customerName}
                        </span>
                        <div
                          className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs ${
                            m.fromStaff
                              ? 'bg-zinc-950 text-white rounded-tr-xs'
                              : 'bg-zinc-100 text-zinc-800 rounded-tl-xs'
                          }`}
                        >
                          {m.text}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                                <form onSubmit={handleSendStaffMessage} className="p-3 bg-zinc-50 border-t border-zinc-200 flex gap-2">
                  <input
                    type="text"
                    value={staffMessageText}
                    onChange={(e) => setStaffMessageText(e.target.value)}
                    placeholder="พิมพ์ตอบกลับลูกค้า..."
                    className="flex-1 px-4 py-2 text-xs bg-white border border-zinc-200 rounded-xl outline-hidden focus:ring-2 focus:ring-orange-500"
                  />
                  <button
                    type="submit"
                    disabled={sendStaffMessageMutation.isPending || !staffMessageText.trim()}
                    className="px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl disabled:opacity-40 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>ส่งข้อความ</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

