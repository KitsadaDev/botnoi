import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Wrench,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  UserCheck,
  Send,
  MessageSquare,
  X,
  MapPin,
  Calendar,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import type { ApiResponse, Ticket, Technician, Message, TicketStatus, ServiceType } from '../lib/types'
import { SERVICE_LABELS, STATUS_LABELS, STATUS_COLORS } from '../lib/types'

export const AdminDashboardPage: React.FC = () => {
  const { user, isStaff, isLoading: isAuthLoading } = useAuth()
  const queryClient = useQueryClient()

  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)

  // Status update form inside modal
  const [newStatus, setNewStatus] = useState<TicketStatus>('RECEIVED')
  const [statusNote, setStatusNote] = useState('')
  const [assignedTechId, setAssignedTechId] = useState<string>('')
  const [staffMessageText, setStaffMessageText] = useState('')

  // 1. Fetch tickets with filters
  const {
    data: tickets = [],
    isLoading: isTicketsLoading,
    refetch: refetchTickets,
  } = useQuery<Ticket[]>({
    queryKey: ['adminTickets', selectedStatus, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedStatus) params.append('status', selectedStatus)
      if (searchQuery) params.append('q', searchQuery)
      const res = await api.get<ApiResponse<Ticket[]>>(`/admin/tickets?${params.toString()}`)
      return res.data.success ? res.data.data : []
    },
    enabled: isStaff,
    refetchInterval: 6000,
  })

  // 2. Fetch technicians list for assignment
  const { data: technicians = [] } = useQuery<Technician[]>({
    queryKey: ['technicians'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Technician[]>>('/admin/technicians')
      return res.data.success ? res.data.data : []
    },
    enabled: isStaff,
  })

  // 3. Fetch specific ticket for modal
  const {
    data: activeTicket,
    isLoading: isActiveTicketLoading,
    refetch: refetchActiveTicket,
  } = useQuery<Ticket>({
    queryKey: ['adminTicketDetail', selectedTicketId],
    queryFn: async () => {
      if (!selectedTicketId) throw new Error('No ID')
      const res = await api.get<ApiResponse<Ticket>>(`/admin/tickets/${selectedTicketId}`)
      return res.data.data
    },
    enabled: Boolean(selectedTicketId),
  })

  // 4. Fetch messages for active ticket modal with polling
  const { data: activeMessages = [], refetch: refetchActiveMessages } = useQuery<Message[]>({
    queryKey: ['adminMessages', activeTicket?.trackingCode],
    queryFn: async () => {
      if (!activeTicket?.trackingCode) return []
      const res = await api.get<ApiResponse<Message[]>>(`/tickets/${activeTicket.trackingCode}/messages`)
      return res.data.success ? res.data.data : []
    },
    enabled: Boolean(activeTicket?.trackingCode),
    refetchInterval: 3000,
  })

  // 5. Update Ticket mutation (status / technician / note)
  const updateTicketMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTicketId) return
      const payload: any = {
        status: newStatus,
        note: statusNote || undefined,
      }
      if (assignedTechId) {
        payload.technicianId = assignedTechId
      }
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

  // 6. Send staff message mutation
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
        <RefreshCw className="w-8 h-8 text-[#003882] animate-spin mx-auto mb-2" />
        <p className="text-slate-500 text-sm">กำลังตรวจสอบสิทธิ์...</p>
      </div>
    )
  }

  if (!user || !isStaff) {
    return <Navigate to="/login" replace />
  }

  // Calculate summary counts
  const countTotal = tickets.length
  const countSubmitted = tickets.filter((t) => t.status === 'SUBMITTED').length
  const countInProgress = tickets.filter((t) => t.status === 'RECEIVED' || t.status === 'IN_PROGRESS').length
  const countCompleted = tickets.filter((t) => t.status === 'COMPLETED').length

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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">ศูนย์ควบคุมงานซ่อม (Staff Portal)</h1>
            <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold uppercase">
              {user.role}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ยินดีต้อนรับคุณ <span className="font-semibold text-slate-700">{user.name}</span> | ติดตามและจ่ายงานช่างเทคนิค
          </p>
        </div>

        <button
          onClick={() => refetchTickets()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>รีเฟรชข้อมูล</span>
        </button>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">เคสทั้งหมด</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{countTotal}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">รอรับเรื่อง (Submitted)</p>
          <p className="text-2xl font-black text-blue-600 mt-1">{countSubmitted}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">กำลังดำเนินการ (In Progress)</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{countInProgress}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">เสร็จสิ้นแล้ว (Completed)</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{countCompleted}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-4 justify-between items-center">
        {/* Status filter tabs */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setSelectedStatus('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              selectedStatus === '' ? 'bg-[#003882] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ทั้งหมด
          </button>
          <button
            onClick={() => setSelectedStatus('SUBMITTED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              selectedStatus === 'SUBMITTED' ? 'bg-[#003882] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            รอรับเรื่อง
          </button>
          <button
            onClick={() => setSelectedStatus('RECEIVED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              selectedStatus === 'RECEIVED' ? 'bg-[#003882] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            รับเรื่องแล้ว
          </button>
          <button
            onClick={() => setSelectedStatus('IN_PROGRESS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              selectedStatus === 'IN_PROGRESS' ? 'bg-[#003882] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ช่างกำลังซ่อม
          </button>
          <button
            onClick={() => setSelectedStatus('COMPLETED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              selectedStatus === 'COMPLETED' ? 'bg-[#003882] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            เสร็จสิ้น
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหารหัส, ชื่อลูกค้า, เบอร์โทร..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#003882] outline-hidden"
          />
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">รหัสติดตาม</th>
                <th className="px-5 py-3.5">ผู้ติดต่อ / เบอร์</th>
                <th className="px-5 py-3.5">บริการ & แบรนด์</th>
                <th className="px-5 py-3.5">วันนัดหมาย</th>
                <th className="px-5 py-3.5">ช่างผู้รับผิดชอบ</th>
                <th className="px-5 py-3.5">สถานะ</th>
                <th className="px-5 py-3.5 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isTicketsLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <RefreshCw className="w-6 h-6 text-[#003882] animate-spin mx-auto mb-2" />
                    <span>กำลังโหลดข้อมูลเคส...</span>
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    ไม่พบรายการงานซ่อมตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-[#003882]">
                      {t.trackingCode}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-800">{t.customerName}</p>
                      <p className="text-[11px] text-slate-400">{t.customerPhone}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-semibold text-slate-800">
                        {SERVICE_LABELS[t.service] || t.service}
                      </span>
                      <p className="text-[11px] text-slate-500">{t.brand}</p>
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-700">
                      {t.preferredDate}
                    </td>
                    <td className="px-5 py-4">
                      {t.technician ? (
                        <div>
                          <p className="font-bold text-slate-800">{t.technician.name}</p>
                          <p className="text-[11px] text-slate-400">{t.technician.area}</p>
                        </div>
                      ) : (
                        <span className="text-amber-600 font-medium">ยังไม่ระบุช่าง</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full font-bold text-[11px] ${
                          STATUS_COLORS[t.status] || 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {STATUS_LABELS[t.status] || t.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => openTicketModal(t)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#003882] bg-blue-50 hover:bg-[#003882] hover:text-white transition shadow-xs"
                      >
                        จัดการเคส
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Ticket Management Drawer / Dialog */}
      {selectedTicketId && activeTicket && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xl font-black text-[#003882]">
                  {activeTicket.trackingCode}
                </span>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    STATUS_COLORS[activeTicket.status]
                  }`}
                >
                  {STATUS_LABELS[activeTicket.status]}
                </span>
              </div>
              <button
                onClick={() => setSelectedTicketId(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Top: Customer & Equipment Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <p className="text-slate-400 mb-0.5">ผู้ติดต่อ</p>
                  <p className="font-bold text-slate-800 text-sm">
                    {activeTicket.customerName} ({activeTicket.customerPhone})
                  </p>
                  <p className="text-slate-500 mt-2">
                    <span className="font-semibold">สถานที่:</span> {activeTicket.address}
                  </p>
                  {activeTicket.lat && activeTicket.lng && (
                    <p className="text-[11px] text-blue-600 mt-0.5">
                      GPS: {activeTicket.lat}, {activeTicket.lng}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-slate-400 mb-0.5">บริการ & นัดหมาย</p>
                  <p className="font-bold text-slate-800 text-sm">
                    {SERVICE_LABELS[activeTicket.service]} - แอร์ {activeTicket.brand}
                  </p>
                  <p className="text-slate-500 mt-2">
                    <span className="font-semibold">วันนัดหมาย:</span> {activeTicket.preferredDate}
                  </p>
                  <p className="text-slate-500 mt-1">
                    <span className="font-semibold">อาการ:</span> {activeTicket.symptom}
                  </p>
                </div>
              </div>

              {/* Photos if any */}
              {activeTicket.images && activeTicket.images.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-700 mb-2">รูปภาพที่ลูกค้าแนบ:</p>
                  <div className="grid grid-cols-4 gap-2">
                    {activeTicket.images.map((img) => (
                      <a
                        key={img.id}
                        href={img.url}
                        target="_blank"
                        rel="noreferrer"
                        className="aspect-square rounded-xl overflow-hidden border border-slate-200 block"
                      >
                        <img src={img.url} alt="ticket" className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Update Status & Assign Technician Form */}
              <div className="bg-blue-50/60 p-5 rounded-2xl border border-blue-200/60 space-y-4">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-[#003882]" />
                  <span>อัปเดตสถานะและมอบหมายช่าง</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Status Dropdown */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">ปรับสถานะงาน</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as TicketStatus)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold outline-hidden focus:ring-2 focus:ring-[#003882]"
                    >
                      <option value="SUBMITTED">ส่งเรื่องแล้ว (SUBMITTED)</option>
                      <option value="RECEIVED">รับเรื่องแล้ว (RECEIVED)</option>
                      <option value="IN_PROGRESS">ช่างกำลังเข้าซ่อม (IN_PROGRESS)</option>
                      <option value="COMPLETED">เสร็จสิ้น (COMPLETED)</option>
                      <option value="CANCELLED">ยกเลิก (CANCELLED)</option>
                    </select>
                  </div>

                  {/* Technician Dropdown */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">มอบหมายช่างเทคนิค</label>
                    <select
                      value={assignedTechId}
                      onChange={(e) => setAssignedTechId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold outline-hidden focus:ring-2 focus:ring-[#003882]"
                    >
                      <option value="">-- ไม่ระบุช่าง --</option>
                      {technicians.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.area} - {t.phone})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status Note */}
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">
                      บันทึกข้อความสถานะ (Status Note) - แสดงให้ลูกค้าเห็นใน Timeline
                    </label>
                    <input
                      type="text"
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      placeholder="เช่น เจ้าหน้าที่ตรวจสอบคิวช่างแล้ว ช่างสมชายจะเดินทางเข้าตรวจเวลา 10:00 น."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-hidden focus:ring-2 focus:ring-[#003882]"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => updateTicketMutation.mutate()}
                    disabled={updateTicketMutation.isPending}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#003882] hover:bg-[#002866] text-white shadow-sm disabled:opacity-50 transition"
                  >
                    {updateTicketMutation.isPending ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                  </button>
                </div>
              </div>

              {/* Chat with Customer Tab */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#003882]" />
                    <span>แชทสนทนากับลูกค้า (Live Chat)</span>
                  </span>
                  <span className="text-[11px] text-slate-500">
                    ข้อความจะส่งตรงถึงหน้าจอของลูกค้าทันที
                  </span>
                </div>

                {/* Messages feed */}
                <div className="p-4 max-h-56 overflow-y-auto space-y-3 bg-white">
                  {activeMessages.length === 0 ? (
                    <p className="text-center text-xs text-slate-400 py-6">ยังไม่มีข้อความสนทนาในเคสนี้</p>
                  ) : (
                    activeMessages.map((m) => (
                      <div
                        key={m.id}
                        className={`flex flex-col ${m.fromStaff ? 'items-end' : 'items-start'}`}
                      >
                        <span className="text-[10px] text-slate-400 mb-0.5 px-1">
                          {m.fromStaff ? `เจ้าหน้าที่ (${m.user?.name || 'Staff'})` : activeTicket.customerName}
                        </span>
                        <div
                          className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-xs ${
                            m.fromStaff
                              ? 'bg-[#003882] text-white rounded-tr-xs'
                              : 'bg-slate-100 text-slate-800 rounded-tl-xs'
                          }`}
                        >
                          {m.text}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Send reply */}
                <form onSubmit={handleSendStaffMessage} className="p-3 bg-slate-50 border-t border-slate-200 flex gap-2">
                  <input
                    type="text"
                    value={staffMessageText}
                    onChange={(e) => setStaffMessageText(e.target.value)}
                    placeholder="พิมพ์ตอบกลับลูกค้า..."
                    className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl outline-hidden focus:ring-2 focus:ring-[#003882]"
                  />
                  <button
                    type="submit"
                    disabled={sendStaffMessageMutation.isPending || !staffMessageText.trim()}
                    className="px-4 py-2 bg-[#003882] hover:bg-[#002866] text-white text-xs font-bold rounded-xl disabled:opacity-40 transition flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>ส่ง</span>
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
