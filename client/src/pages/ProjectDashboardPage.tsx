import React, { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
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
  ArrowLeft,
  Users,
  Star,
  Settings,
  ExternalLink,
  AlertCircle,
} from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import type {
  ApiResponse,
  Project,
  Ticket,
  Technician,
  Message,
  TicketStatus,
  TicketCounts,
  ProjectChannelStats,
} from '../lib/types'
import { SERVICE_LABELS, STATUS_LABELS, STATUS_COLORS, BUSINESS_TYPE_LABELS } from '../lib/types'
import { formatDate } from '../lib/format'
import { exportDashboardToPdf } from '../lib/pdfExport'
import { exportDashboardToExcel } from '../lib/excelExport'
import AdminNotificationBell from '../components/AdminNotificationBell'
import { ProjectTechniciansTab } from '../components/project/ProjectTechniciansTab'
import { ProjectChatHistoryTab } from '../components/project/ProjectChatHistoryTab'
import { ProjectSatisfactionTab } from '../components/project/ProjectSatisfactionTab'
import { ProjectSettingsTab } from '../components/project/ProjectSettingsTab'

type WorkspaceTab = 'tickets' | 'chat' | 'technicians' | 'satisfaction' | 'settings'

export const ProjectDashboardPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const { user, isLoading: isAuthLoading } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('tickets')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [isExportingPdf, setIsExportingPdf] = useState(false)

  const [newStatus, setNewStatus] = useState<TicketStatus>('RECEIVED')
  const [statusNote, setStatusNote] = useState('')
  const [assignedTechId, setAssignedTechId] = useState<string>('')
  const [staffMessageText, setStaffMessageText] = useState('')

  // All projects for quick switcher
  const { data: myProjects = [] } = useQuery<Project[]>({
    queryKey: ['myProjects'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Project[]>>('/projects')
      return res.data.success ? res.data.data : []
    },
    enabled: Boolean(user),
  })

  // Current project details
  const {
    data: project,
    isLoading: isProjectLoading,
    isError: isProjectError,
  } = useQuery<Project>({
    queryKey: ['projectDetail', projectId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Project>>(`/projects/${projectId}`)
      if (!res.data.success) throw new Error(res.data.error || 'ไม่พบโปรเจกต์')
      return res.data.data
    },
    enabled: Boolean(user && projectId),
  })

  // Tickets in this project
  const {
    data: ticketData,
    isLoading: isTicketsLoading,
    refetch: refetchTickets,
  } = useQuery<{
    tickets: Ticket[]
    counts: TicketCounts | null
    channels: ProjectChannelStats | null
  }>({
    queryKey: ['projectTickets', projectId, selectedStatus, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedStatus) params.append('status', selectedStatus)
      if (searchQuery) params.append('q', searchQuery)
      const res = await api.get<
        ApiResponse<Ticket[]> & { counts?: TicketCounts; channels?: ProjectChannelStats }
      >(`/projects/${projectId}/tickets?${params.toString()}`)
      return res.data.success
        ? {
            tickets: res.data.data,
            counts: res.data.counts ?? null,
            channels: res.data.channels ?? null,
          }
        : { tickets: [], counts: null, channels: null }
    },
    enabled: Boolean(project?.id),
    refetchInterval: 15000,
  })
  const tickets = ticketData?.tickets ?? []
  const ticketCounts = ticketData?.counts
  const channelStats = ticketData?.channels ?? { total: 0, chat: 0, call: 0, web: 0 }

  // Technicians in this project
  const { data: technicians = [] } = useQuery<Technician[]>({
    queryKey: ['projectTechnicians', projectId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Technician[]>>(`/projects/${projectId}/technicians`)
      return res.data.success ? res.data.data : []
    },
    enabled: Boolean(project?.id),
  })

  // Active Ticket detail & live chat
  const { data: activeTicket } = useQuery<Ticket & { messages?: Message[] }>({
    queryKey: ['projectTicketDetail', projectId, selectedTicketId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Ticket & { messages?: Message[] }>>(
        `/projects/${projectId}/tickets/${selectedTicketId}`
      )
      return res.data.data
    },
    enabled: Boolean(project?.id && selectedTicketId),
    refetchInterval: 5000,
  })
  const activeMessages = activeTicket?.messages ?? []

  const updateTicketMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTicketId || !projectId) return
      const payload: Record<string, unknown> = {
        status: newStatus,
        note: statusNote || undefined,
        technicianId: assignedTechId || null,
      }
      const res = await api.patch<ApiResponse<Ticket>>(
        `/projects/${projectId}/tickets/${selectedTicketId}`,
        payload
      )
      if (!res.data.success) throw new Error(res.data.error || 'อัปเดตไม่สำเร็จ')
      return res.data.data
    },
    onSuccess: () => {
      setStatusNote('')
      queryClient.invalidateQueries({ queryKey: ['projectTickets', projectId] })
      queryClient.invalidateQueries({ queryKey: ['projectTicketDetail', projectId, selectedTicketId] })
      queryClient.invalidateQueries({ queryKey: ['projectTechnicians', projectId] })
      queryClient.invalidateQueries({ queryKey: ['myProjects'] })
      alert('อัปเดตข้อมูลเคสเรียบร้อยแล้ว')
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'เกิดข้อผิดพลาดในการอัปเดต')
    },
  })

  const deleteTicketMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      const res = await api.delete<ApiResponse<null>>(`/projects/${projectId}/tickets/${ticketId}`)
      if (!res.data.success) throw new Error(res.data.error || 'ลบไม่สำเร็จ')
    },
    onSuccess: (_data, deletedId) => {
      if (selectedTicketId === deletedId) setSelectedTicketId(null)
      queryClient.invalidateQueries({ queryKey: ['projectTickets', projectId] })
      queryClient.invalidateQueries({ queryKey: ['myProjects'] })
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'เกิดข้อผิดพลาดในการลบเคส')
    },
  })

  const sendStaffMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!selectedTicketId || !projectId) return
      const res = await api.post<ApiResponse<Message>>(
        `/projects/${projectId}/tickets/${selectedTicketId}/messages`,
        { text }
      )
      if (!res.data.success) throw new Error(res.data.error || 'ส่งข้อความไม่สำเร็จ')
      return res.data.data
    },
    onSuccess: () => {
      setStaffMessageText('')
      queryClient.invalidateQueries({ queryKey: ['projectTicketDetail', projectId, selectedTicketId] })
      queryClient.invalidateQueries({ queryKey: ['projectConversations', projectId] })
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'ส่งข้อความไม่สำเร็จ')
    },
  })

  if (isAuthLoading || isProjectLoading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw className="w-8 h-8 text-orange-600 animate-spin mx-auto mb-2" />
        <p className="text-zinc-500 text-sm">กำลังโหลดแดชบอร์ดโปรเจกต์...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (isProjectError || !project || !projectId) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-extrabold text-zinc-900">ไม่พบโปรเจกต์หรือไม่มีสิทธิ์เข้าถึง</h2>
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-zinc-950 text-white text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับไปหน้ารวมโปรเจกต์</span>
        </Link>
      </div>
    )
  }

  const countTotal = ticketCounts?.total ?? tickets.length
  const countSubmitted =
    ticketCounts?.SUBMITTED ?? tickets.filter((t) => t.status === 'SUBMITTED').length
  const countInProgress = ticketCounts
    ? ticketCounts.RECEIVED + ticketCounts.IN_PROGRESS
    : tickets.filter((t) => t.status === 'RECEIVED' || t.status === 'IN_PROGRESS').length
  const countCompleted =
    ticketCounts?.COMPLETED ?? tickets.filter((t) => t.status === 'COMPLETED').length

  const pct = (part: number) =>
    channelStats.total > 0 ? `${((part / channelStats.total) * 100).toFixed(1)}%` : '0%'

  const openTicketModal = (ticket: Ticket) => {
    setSelectedTicketId(ticket.id)
    setNewStatus(ticket.status)
    setAssignedTechId(ticket.technicianId || '')
    setStatusNote('')
  }

  const openTicketById = (ticketId: string) => {
    const found = tickets.find((t) => t.id === ticketId)
    if (found) {
      openTicketModal(found)
    } else {
      setSelectedTicketId(ticketId)
    }
  }

  const handleDeleteTicket = (ticket: Ticket) => {
    if (
      window.confirm(
        `ยืนยันการลบใบงาน ${ticket.trackingCode} (${ticket.customerName}) ออกจากโปรเจกต์นี้หรือไม่?`
      )
    ) {
      deleteTicketMutation.mutate(ticket.id)
    }
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
        staffName: `${user.name} (${project.name})`,
        staffRole: user.role,
        selectedStatus,
        searchQuery,
        summary: {
          total: countTotal,
          submitted: countSubmitted,
          inProgress: countInProgress,
          completed: countCompleted,
        },
        channels: channelStats,
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
        staffName: `${user.name} (${project.name})`,
        staffRole: user.role,
        selectedStatus,
        searchQuery,
        summary: {
          total: countTotal,
          submitted: countSubmitted,
          inProgress: countInProgress,
          completed: countCompleted,
        },
        channels: channelStats,
        tickets,
      })
    } catch (err) {
      console.error('Failed to export Excel:', err)
      alert('เกิดข้อผิดพลาดในการสร้างไฟล์ Excel')
    }
  }

  const workspaceTabs: { id: WorkspaceTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'tickets', label: 'แดชบอร์ดใบงานซ่อม', icon: LayoutDashboard },
    { id: 'chat', label: 'ประวัติแชทลูกค้า', icon: MessagesSquare },
    { id: 'technicians', label: `โซนจัดการช่าง (${technicians.length})`, icon: Users },
    { id: 'satisfaction', label: 'ประเมินความพึงพอใจ (CSAT)', icon: Star },
    { id: 'settings', label: 'ตั้งค่า & Chatbot', icon: Settings },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Top Breadcrumb + Project Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Link
            to="/projects"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>โปรเจกต์ทั้งหมด</span>
          </Link>

          {myProjects.length > 1 && (
            <select
              value={project.id}
              onChange={(e) => navigate(`/projects/${e.target.value}`)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-zinc-200 text-zinc-800 outline-hidden focus:ring-2 focus:ring-orange-500 cursor-pointer"
            >
              {myProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  สลับโปรเจกต์: {p.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <Link
          to={`/p/${project.slug}/book`}
          target="_blank"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 transition"
        >
          <span>หน้าแจ้งซ่อมของร้านนี้ (/p/{project.slug}/book)</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Top Console Header (คงสไตล์เดิมตามบรีฟพี่โมโน) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-zinc-950 text-white p-6 sm:p-8 rounded-3xl border border-zinc-800 shadow-xl">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold">
              <LayoutDashboard className="w-3.5 h-3.5" />
              PROJECT CONSOLE
            </span>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
              {BUSINESS_TYPE_LABELS[project.businessType] || project.businessType}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{project.name}</h1>
          <p className="text-xs text-zinc-400 mt-1">
            ผู้ดูแล: <span className="font-semibold text-white">{user.name}</span> • Slug:{' '}
            <span className="font-mono text-orange-300">{project.slug}</span> • ซิงค์ข้อมูลอัตโนมัติ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          <AdminNotificationBell
            projectId={project.id}
            onNewTicketDetected={() => refetchTickets()}
            onSelectTicket={(ticket) => {
              setActiveTab('tickets')
              openTicketModal(ticket)
            }}
          />

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isTicketsLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 disabled:opacity-50 transition shadow-sm cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExportingPdf || isTicketsLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 disabled:opacity-50 transition shadow-sm cursor-pointer"
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
            <span>รีเฟรช</span>
          </button>
        </div>
      </div>

      {/* Workspace Navigation Tabs */}
      <div className="bg-white p-1.5 rounded-2xl border border-zinc-200/90 shadow-xs flex flex-wrap gap-1.5">
        {workspaceTabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                isActive
                  ? 'bg-zinc-950 text-white shadow-md'
                  : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-orange-400' : 'text-zinc-400'}`} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* ========================================================
          TAB 1: TICKETS DASHBOARD (เหมือนของเดิม + Scoped to Project)
      ======================================================== */}
      {activeTab === 'tickets' && (
        <div className="space-y-8">
          {/* Metric Cards: Ticket Status */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-extrabold text-zinc-900">
                สถิติใบงานแจ้งซ่อม (Ticket Status)
              </h2>
              <span className="text-[11px] font-semibold text-zinc-400">ข้อมูลเรียลไทม์ของโปรเจกต์</span>
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

          {/* Contact Channels Summary (Real Project Data!) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold text-zinc-900">
                  การติดต่อและแจ้งซ่อมแยกตามช่องทาง (Omnichannel)
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Live Data
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className="text-[11px] font-bold text-orange-600 hover:underline cursor-pointer"
              >
                ดูประวัติแชททั้งหมด →
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-zinc-200/90 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-400 font-semibold">ติดต่อเข้ามาทั้งหมด</p>
                  <p className="text-3xl font-black text-zinc-950 mt-1">{channelStats.total}</p>
                  <p className="text-[11px] text-zinc-400 mt-1">ใบงาน + แชทในระบบ</p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-zinc-100 text-zinc-700 flex items-center justify-center">
                  <MessagesSquare className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-zinc-200/90 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-400 font-semibold">จากแชท (Chatbot / LINE)</p>
                  <p className="text-3xl font-black text-indigo-600 mt-1">{channelStats.chat}</p>
                  <p className="text-[11px] text-zinc-400 mt-1">คิดเป็น {pct(channelStats.chat)}</p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-zinc-200/90 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-400 font-semibold">จากโทร (AI Voicebot)</p>
                  <p className="text-3xl font-black text-rose-600 mt-1">{channelStats.call}</p>
                  <p className="text-[11px] text-zinc-400 mt-1">คิดเป็น {pct(channelStats.call)}</p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <PhoneCall className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-zinc-200/90 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-400 font-semibold">จากเว็บ (Website Form)</p>
                  <p className="text-3xl font-black text-teal-600 mt-1">{channelStats.web}</p>
                  <p className="text-[11px] text-zinc-400 mt-1">คิดเป็น {pct(channelStats.web)}</p>
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
                    <th className="px-6 py-4">สถานะ / รีวิว</th>
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
                        <p className="font-bold text-zinc-600">ยังไม่มีใบงานแจ้งซ่อมในโปรเจกต์นี้</p>
                        <p className="text-[11px] mt-1">
                          แชร์ลิงก์{' '}
                          <Link to={`/p/${project.slug}/book`} className="text-orange-600 font-mono underline">
                            /p/{project.slug}/book
                          </Link>{' '}
                          ให้ลูกค้า หรือเชื่อมต่อ Webhook จาก Botnoi Chatbot
                        </p>
                      </td>
                    </tr>
                  ) : (
                    tickets.map((t) => (
                      <tr key={t.id} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-mono font-bold text-zinc-950">{t.trackingCode}</p>
                          {t.source && (
                            <span className="text-[10px] font-mono text-zinc-400 uppercase">{t.source}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-zinc-900">{t.customerName}</p>
                          <p className="text-[11px] font-mono text-zinc-400">{t.customerPhone}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-zinc-900">{SERVICE_LABELS[t.service] || t.service}</span>
                          <p className="text-[11px] text-zinc-500">{t.brand}</p>
                        </td>
                        <td className="px-6 py-4 font-mono font-medium text-zinc-700">
                          {formatDate(t.preferredDate)}
                        </td>
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
                        <td className="px-6 py-4 space-y-1">
                          <span
                            className={`inline-block px-3 py-1 rounded-full font-bold text-[11px] ${
                              STATUS_COLORS[t.status] || 'bg-zinc-100 text-zinc-700'
                            }`}
                          >
                            {STATUS_LABELS[t.status] || t.status}
                          </span>
                          {t.review && (
                            <div className="flex items-center gap-0.5 text-[11px] font-mono font-bold text-amber-600">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <span>{t.review.rating}.0</span>
                            </div>
                          )}
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
        </div>
      )}

      {/* TAB 2: CENTRAL CHAT HISTORY */}
      {activeTab === 'chat' && (
        <ProjectChatHistoryTab
          projectId={project.id}
          projectSlug={project.slug}
          onOpenTicket={(tid) => openTicketById(tid)}
        />
      )}

      {/* TAB 3: TECHNICIANS ZONE */}
      {activeTab === 'technicians' && <ProjectTechniciansTab projectId={project.id} />}

      {/* TAB 4: SATISFACTION (CSAT) DASHBOARD */}
      {activeTab === 'satisfaction' && <ProjectSatisfactionTab projectId={project.id} />}

      {/* TAB 5: SETTINGS & CHATBOT INTEGRATION */}
      {activeTab === 'settings' && <ProjectSettingsTab project={project} />}

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
                    <span className="font-bold text-zinc-800">วันนัดหมาย:</span>{' '}
                    {formatDate(activeTicket.preferredDate)}
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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-orange-400" />
                    <span>อัปเดตสถานะและมอบหมายช่างเทคนิค</span>
                  </h3>
                  {technicians.length === 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTicketId(null)
                        setActiveTab('technicians')
                      }}
                      className="text-[11px] font-bold text-orange-400 hover:underline cursor-pointer"
                    >
                      + ไปเพิ่มรายชื่อช่างก่อน
                    </button>
                  )}
                </div>

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
                          {t.name} ({t.area} - {t.phone}) {t.isAvailable === false ? '[ไม่ว่าง]' : ''}
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
                      placeholder="เช่น มอบหมายช่างบุญมาเข้าตรวจสอบหน้างานเวลา 10:00 น."
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
                          {m.fromStaff
                            ? `เจ้าหน้าที่ (${m.user?.name || 'Staff'})`
                            : activeTicket.customerName}
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

                {activeTicket.status === 'COMPLETED' || activeTicket.status === 'CANCELLED' ? (
                  <div className="p-3 bg-zinc-50 border-t border-zinc-200">
                    <div className="px-4 py-2 text-xs bg-white border border-zinc-200 rounded-xl text-zinc-400">
                      เคสนี้ปิดแล้ว ไม่สามารถส่งข้อความได้ หากต้องการคุยต่อให้เปลี่ยนสถานะเคสก่อน
                    </div>
                  </div>
                ) : (
                  <form
                    onSubmit={handleSendStaffMessage}
                    className="p-3 bg-zinc-50 border-t border-zinc-200 flex gap-2"
                  >
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
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
