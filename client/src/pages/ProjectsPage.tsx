import React, { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  FolderKanban,
  ArrowRight,
  Users,
  Inbox,
  Star,
  MessagesSquare,
  Search,
  RefreshCw,
  X,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  Building2,
  AlertCircle,
} from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import type { ApiResponse, Project, BusinessType } from '../lib/types'
import { BUSINESS_TYPE_LABELS } from '../lib/types'

export const ProjectsPage: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)

  // Create form states
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [businessType, setBusinessType] = useState<BusinessType>('AC_AND_IT')
  const [phone, setPhone] = useState('')
  const [description, setDescription] = useState('')
  const [botnoiBotId, setBotnoiBotId] = useState('')
  const [lineOaId, setLineOaId] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const {
    data: projects = [],
    isLoading,
    refetch,
  } = useQuery<Project[]>({
    queryKey: ['myProjects'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Project[]>>('/projects')
      return res.data.success ? res.data.data : []
    },
    enabled: Boolean(user),
  })

  const createProjectMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, string | undefined> = {
        name: name.trim(),
        businessType,
        description: description.trim() || undefined,
        phone: phone.trim() || undefined,
        botnoiBotId: botnoiBotId.trim() || undefined,
        lineOaId: lineOaId.trim() || undefined,
      }
      if (slug.trim()) payload.slug = slug.trim().toLowerCase()
      const res = await api.post<ApiResponse<Project>>('/projects', payload)
      if (!res.data.success) throw new Error(res.data.error || 'สร้างโปรเจกต์ไม่สำเร็จ')
      return res.data.data
    },
    onSuccess: (created) => {
      setIsCreateOpen(false)
      setName('')
      setSlug('')
      setDescription('')
      setPhone('')
      setBotnoiBotId('')
      setLineOaId('')
      setFormError(null)
      queryClient.invalidateQueries({ queryKey: ['myProjects'] })
      navigate(`/projects/${created.id}`)
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.error || err.message || 'ไม่สามารถสร้างโปรเจกต์ได้')
    },
  })

  if (isAuthLoading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw className="w-8 h-8 text-orange-600 animate-spin mx-auto mb-2" />
        <p className="text-zinc-500 text-sm">กำลังโหลดข้อมูล Workspace...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const filteredProjects = projects.filter((p) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      p.name.toLowerCase().includes(q) ||
      p.slug.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q)
    )
  })

  const totalTicketsAll = projects.reduce((sum, p) => sum + (p.stats?.totalTickets ?? 0), 0)
  const totalOpenAll = projects.reduce((sum, p) => sum + (p.stats?.openTickets ?? 0), 0)
  const totalTechsAll = projects.reduce((sum, p) => sum + (p.stats?.techniciansCount ?? 0), 0)
  const ratedProjects = projects.filter((p) => p.stats?.avgRating !== null && p.stats?.avgRating !== undefined)
  const overallAvgRating =
    ratedProjects.length > 0
      ? (
          ratedProjects.reduce((sum, p) => sum + (p.stats?.avgRating ?? 0), 0) /
          ratedProjects.length
        ).toFixed(1)
      : '-'

  const handleCopyLink = (projectSlug: string) => {
    const url = `${window.location.origin}/p/${projectSlug}/book`
    navigator.clipboard.writeText(url)
    setCopiedSlug(projectSlug)
    setTimeout(() => setCopiedSlug(null), 2000)
  }

  const handleSubmitCreate = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (name.trim().length < 2) {
      setFormError('กรุณากรอกชื่อโปรเจกต์อย่างน้อย 2 ตัวอักษร')
      return
    }
    createProjectMutation.mutate()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-8">
      {/* Top Workspace Header */}
      <div className="bg-zinc-950 text-white p-6 sm:p-8 rounded-3xl border border-zinc-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative overflow-hidden">
        <div className="absolute -top-24 right-1/4 w-72 h-72 rounded-full bg-orange-500/15 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold">
              <Sparkles className="w-3 h-3" />
              MULTI-PROJECT WORKSPACE
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            ศูนย์รวมโปรเจกต์ของฉัน (Projects Hub)
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            ผู้ใช้งาน: <span className="font-semibold text-white">{user.name}</span> • สร้างและบริหารแดชบอร์ดแจ้งซ่อมแยกตามร้านค้าหรือสาขาได้ทันที
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>รีเฟรช</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setFormError(null)
              setIsCreateOpen(true)
            }}
            className="btn-shimmer inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-extrabold text-white shadow-lg shadow-orange-500/25 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>สร้าง Project ใหม่</span>
          </button>
        </div>
      </div>

      {/* Aggregate KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-zinc-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400 font-semibold">โปรเจกต์ทั้งหมด</p>
            <p className="text-3xl font-black text-zinc-950 mt-1">{projects.length}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <FolderKanban className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-zinc-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400 font-semibold">ใบงานแจ้งซ่อมรวม</p>
            <p className="text-3xl font-black text-zinc-950 mt-1">{totalTicketsAll}</p>
            <p className="text-[11px] text-orange-600 font-semibold mt-0.5">
              กำลังดำเนินการ {totalOpenAll} เคส
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-zinc-100 text-zinc-700 flex items-center justify-center">
            <Inbox className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-zinc-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400 font-semibold">ช่างเทคนิคในระบบ</p>
            <p className="text-3xl font-black text-emerald-600 mt-1">{totalTechsAll}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-zinc-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400 font-semibold">ความพึงพอใจเฉลี่ย</p>
            <p className="text-3xl font-black text-amber-500 mt-1">
              {overallAvgRating}
              {overallAvgRating !== '-' && <span className="text-base text-zinc-400 font-bold"> / 5</span>}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center">
            <Star className="w-5 h-5 fill-amber-400" />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-sm font-extrabold text-zinc-900">
          รายการโปรเจกต์ที่ดูแล ({filteredProjects.length})
        </h2>
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อโปรเจกต์ หรือ slug..."
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-hidden transition"
          />
        </div>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-zinc-200">
          <RefreshCw className="w-7 h-7 text-orange-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-zinc-500">กำลังโหลดรายการโปรเจกต์...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="py-16 px-6 text-center bg-white rounded-3xl border border-dashed border-zinc-300 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-zinc-900">ยังไม่มี Project ใน Workspace ของคุณ</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
              เริ่มต้นสร้าง Project แรกสำหรับร้านค้าหรือศูนย์บริการของคุณ เพื่อใช้งานแดชบอร์ดแจ้งซ่อม เพิ่มช่าง ดูประวัติแชท และวัดผลความพึงพอใจ
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="btn-shimmer inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-extrabold text-white shadow-lg cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>สร้าง Project แรกของคุณเลย</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="bg-white rounded-3xl border border-zinc-200/90 shadow-xs hover:shadow-xl hover:border-orange-300 transition-all p-6 flex flex-col justify-between group"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-zinc-950 text-orange-400 flex items-center justify-center font-black text-base shrink-0">
                      {project.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-base text-zinc-950 truncate group-hover:text-orange-600 transition-colors">
                        {project.name}
                      </h3>
                      <p className="text-[11px] font-mono text-zinc-400 truncate">/p/{project.slug}</p>
                    </div>
                  </div>
                  <span className="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active
                  </span>
                </div>

                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-lg bg-zinc-100 text-zinc-600 text-[11px] font-semibold mb-2">
                    {BUSINESS_TYPE_LABELS[project.businessType] || project.businessType}
                  </span>
                  <p className="text-xs text-zinc-500 line-clamp-2 min-h-[32px]">
                    {project.description || 'แดชบอร์ดศูนย์กลางบริหารงานแจ้งซ่อม ทีมช่าง และประวัติแชทลูกค้า'}
                  </p>
                </div>

                {/* Mini Stats Grid */}
                <div className="grid grid-cols-4 gap-2 pt-2">
                  <div className="p-2.5 rounded-2xl bg-zinc-50 border border-zinc-100 text-center">
                    <p className="text-sm font-black text-zinc-950">{project.stats?.totalTickets ?? 0}</p>
                    <p className="text-[10px] text-zinc-400">ใบงาน</p>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-zinc-50 border border-zinc-100 text-center">
                    <p className="text-sm font-black text-emerald-600">{project.stats?.techniciansCount ?? 0}</p>
                    <p className="text-[10px] text-zinc-400">ช่าง</p>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-zinc-50 border border-zinc-100 text-center">
                    <p className="text-sm font-black text-indigo-600">{project.stats?.conversationsCount ?? 0}</p>
                    <p className="text-[10px] text-zinc-400">แชท</p>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-zinc-50 border border-zinc-100 text-center">
                    <p className="text-sm font-black text-amber-500">
                      {project.stats?.avgRating ? project.stats.avgRating.toFixed(1) : '-'}
                    </p>
                    <p className="text-[10px] text-zinc-400">CSAT</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCopyLink(project.slug)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition cursor-pointer"
                    title="คัดลอกลิงก์หน้าแจ้งซ่อมของร้านนี้"
                  >
                    {copiedSlug === project.slug ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>คัดลอกแล้ว</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>ลิงก์แจ้งซ่อม</span>
                      </>
                    )}
                  </button>
                  <Link
                    to={`/p/${project.slug}/book`}
                    className="p-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition"
                    title="เปิดหน้าฟอร์มแจ้งซ่อมของโปรเจกต์นี้"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <Link
                  to={`/projects/${project.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold bg-zinc-950 hover:bg-orange-600 text-white transition shadow-2xs"
                >
                  <span>เปิดแดชบอร์ด</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-zinc-200 overflow-hidden">
            <div className="p-6 bg-zinc-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/20 border border-orange-500/30 text-orange-400 flex items-center justify-center">
                  <FolderKanban className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold">สร้าง Project ใหม่</h2>
                  <p className="text-[11px] text-zinc-400">
                    เปิดแดชบอร์ดบริการหลังการขายแยกเฉพาะธุรกิจของคุณทันที
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCreate} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  ชื่อโปรเจกต์ / ชื่อร้านค้า <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น ช่างแอร์เย็นฉ่ำ เซอร์วิส สาขารัชดา"
                  className="w-full px-4 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5">ประเภทธุรกิจ</label>
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value as BusinessType)}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-zinc-50 border border-zinc-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-hidden"
                  >
                    {Object.entries(BUSINESS_TYPE_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                    เบอร์ติดต่อร้าน (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="เช่น 02-123-4567"
                    className="w-full px-3.5 py-2.5 text-xs font-mono bg-zinc-50 border border-zinc-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  ลิงก์เฉพาะร้าน / Slug <span className="text-zinc-400 font-normal">(เว้นว่างเพื่อสร้างอัตโนมัติ)</span>
                </label>
                <div className="flex items-center bg-zinc-50 border border-zinc-200 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-orange-500 focus-within:bg-white">
                  <span className="px-3 text-xs font-mono text-zinc-400 bg-zinc-100 py-2.5 border-r border-zinc-200">
                    /p/
                  </span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="my-cool-shop"
                    className="flex-1 px-3 py-2.5 text-xs font-mono bg-transparent outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">คำอธิบายบริการ</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="สรุปบริการหลักหรือพื้นที่ให้บริการของร้าน..."
                  className="w-full px-4 py-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5 flex items-center gap-1">
                    <MessagesSquare className="w-3.5 h-3.5 text-orange-500" />
                    <span>Botnoi Bot ID (ถ้ามี)</span>
                  </label>
                  <input
                    type="text"
                    value={botnoiBotId}
                    onChange={(e) => setBotnoiBotId(e.target.value)}
                    placeholder="ใส่เพื่อเชื่อม Chatbot"
                    className="w-full px-3.5 py-2.5 text-xs font-mono bg-zinc-50 border border-zinc-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5">LINE OA ID (ถ้ามี)</label>
                  <input
                    type="text"
                    value={lineOaId}
                    onChange={(e) => setLineOaId(e.target.value)}
                    placeholder="@yourshop"
                    className="w-full px-3.5 py-2.5 text-xs font-mono bg-zinc-50 border border-zinc-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={createProjectMutation.isPending}
                  className="px-6 py-2.5 rounded-xl text-xs font-extrabold text-white bg-zinc-950 hover:bg-orange-600 transition disabled:opacity-50 cursor-pointer"
                >
                  {createProjectMutation.isPending ? 'กำลังสร้างโปรเจกต์...' : 'ยืนยันสร้าง Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
