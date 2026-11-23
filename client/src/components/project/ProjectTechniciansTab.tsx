import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  UserPlus,
  Users,
  Phone,
  MapPin,
  Wrench,
  Trash2,
  Edit3,
  CheckCircle2,
  XCircle,
  Star,
  AlertCircle,
  X,
  RefreshCw,
} from 'lucide-react'
import api from '../../lib/api'
import type { ApiResponse, Technician } from '../../lib/types'
import { sanitizePhoneInput } from '../../lib/format'

interface ProjectTechniciansTabProps {
  projectId: string
}

export const ProjectTechniciansTab: React.FC<ProjectTechniciansTabProps> = ({ projectId }) => {
  const queryClient = useQueryClient()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTech, setEditingTech] = useState<Technician | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [area, setArea] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [isAvailable, setIsAvailable] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)

  const { data: technicians = [], isLoading } = useQuery<Technician[]>({
    queryKey: ['projectTechnicians', projectId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Technician[]>>(`/projects/${projectId}/technicians`)
      return res.data.success ? res.data.data : []
    },
  })

  const openAddModal = () => {
    setEditingTech(null)
    setName('')
    setPhone('')
    setArea('')
    setSpecialty('')
    setIsAvailable(true)
    setFormError(null)
    setIsModalOpen(true)
  }

  const openEditModal = (tech: Technician) => {
    setEditingTech(tech)
    setName(tech.name)
    setPhone(tech.phone)
    setArea(tech.area)
    setSpecialty(tech.specialty || '')
    setIsAvailable(tech.isAvailable ?? true)
    setFormError(null)
    setIsModalOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        area: area.trim(),
        specialty: specialty.trim() || undefined,
        isAvailable,
      }
      if (editingTech) {
        const res = await api.patch<ApiResponse<Technician>>(
          `/projects/${projectId}/technicians/${editingTech.id}`,
          payload
        )
        if (!res.data.success) throw new Error(res.data.error || 'แก้ไขไม่สำเร็จ')
        return res.data.data
      }
      const res = await api.post<ApiResponse<Technician>>(
        `/projects/${projectId}/technicians`,
        payload
      )
      if (!res.data.success) throw new Error(res.data.error || 'เพิ่มช่างไม่สำเร็จ')
      return res.data.data
    },
    onSuccess: () => {
      setIsModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['projectTechnicians', projectId] })
      queryClient.invalidateQueries({ queryKey: ['myProjects'] })
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.error || err.message || 'บันทึกข้อมูลช่างไม่สำเร็จ')
    },
  })

  const toggleAvailabilityMutation = useMutation({
    mutationFn: async (tech: Technician) => {
      const res = await api.patch<ApiResponse<Technician>>(
        `/projects/${projectId}/technicians/${tech.id}`,
        { isAvailable: !(tech.isAvailable ?? true) }
      )
      if (!res.data.success) throw new Error(res.data.error || 'อัปเดตสถานะไม่สำเร็จ')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectTechnicians', projectId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (techId: string) => {
      const res = await api.delete<ApiResponse<null>>(
        `/projects/${projectId}/technicians/${techId}`
      )
      if (!res.data.success) throw new Error(res.data.error || 'ลบไม่สำเร็จ')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectTechnicians', projectId] })
      queryClient.invalidateQueries({ queryKey: ['myProjects'] })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!/^0[0-9]{9}$/.test(phone)) {
      setFormError('เบอร์โทรต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 0')
      return
    }
    saveMutation.mutate()
  }

  const handleDelete = (tech: Technician) => {
    if (window.confirm(`ยืนยันการลบช่าง "${tech.name}" ออกจากโปรเจกต์นี้หรือไม่?`)) {
      deleteMutation.mutate(tech.id)
    }
  }

  const availableCount = technicians.filter((t) => t.isAvailable ?? true).length
  const totalActiveJobs = technicians.reduce((sum, t) => sum + (t.stats?.activeJobs ?? 0), 0)

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-zinc-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-extrabold text-zinc-950 flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-600" />
            <span>โซนจัดการทีมช่าง (Technician Dispatch Zone)</span>
          </h2>
          <p className="text-xs text-zinc-500">
            เพิ่มและบริหารรายชื่อช่างประจำโปรเจกต์ เพื่อเตรียม Assign งานแจ้งซ่อมที่เข้ามาได้อย่างรวดเร็ว
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="btn-shimmer inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-extrabold text-white shadow-lg shadow-orange-500/20 cursor-pointer self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ เพิ่มช่างใหม่ (Add ช่าง)</span>
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-zinc-200/90 shadow-xs">
          <p className="text-xs text-zinc-400 font-semibold">ช่างทั้งหมดในโปรเจกต์</p>
          <p className="text-2xl font-black text-zinc-950 mt-1">{technicians.length} คน</p>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-zinc-200/90 shadow-xs">
          <p className="text-xs text-zinc-400 font-semibold">พร้อมรับงานตอนนี้</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{availableCount} คน</p>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-zinc-200/90 shadow-xs">
          <p className="text-xs text-zinc-400 font-semibold">งานที่กำลังเข้าซ่อมรวม</p>
          <p className="text-2xl font-black text-orange-600 mt-1">{totalActiveJobs} เคส</p>
        </div>
      </div>

      {/* Technicians List */}
      {isLoading ? (
        <div className="py-14 text-center bg-white rounded-3xl border border-zinc-200">
          <RefreshCw className="w-6 h-6 text-orange-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-zinc-500">กำลังโหลดรายชื่อช่าง...</p>
        </div>
      ) : technicians.length === 0 ? (
        <div className="py-16 px-4 text-center bg-white rounded-3xl border border-dashed border-zinc-300 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto">
            <UserPlus className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-zinc-900">ยังไม่มีรายชื่อช่างในโปรเจกต์นี้</h3>
            <p className="text-xs text-zinc-500 mt-1">
              กดปุ่ม "เพิ่มช่างใหม่" เพื่อเพิ่มทีมช่างสำหรับมอบหมายงานแจ้งซ่อมในหน้าแดชบอร์ด
            </p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-zinc-950 hover:bg-orange-600 text-white text-xs font-bold transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>เพิ่มช่างคนแรก</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {technicians.map((tech) => {
            const available = tech.isAvailable ?? true
            return (
              <div
                key={tech.id}
                className="bg-white rounded-3xl p-6 border border-zinc-200/90 shadow-xs hover:shadow-lg transition flex flex-col justify-between space-y-5"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-950 text-orange-400 flex items-center justify-center font-black text-lg shrink-0">
                        {tech.name.slice(0, 1)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-sm text-zinc-950 truncate">{tech.name}</h3>
                        <p className="text-xs font-mono text-zinc-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-zinc-400" />
                          <span>{tech.phone}</span>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleAvailabilityMutation.mutate(tech)}
                      className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                        available
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-zinc-100 text-zinc-500 border-zinc-200 hover:bg-zinc-200'
                      }`}
                      title="คลิกเพื่อสลับสถานะพร้อมรับงาน"
                    >
                      {available ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>พร้อมรับงาน</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3" />
                          <span>ไม่ว่าง</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-1.5 text-xs text-zinc-600">
                    <p className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <span className="truncate">
                        <strong className="text-zinc-800">พื้นที่:</strong> {tech.area}
                      </span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Wrench className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="truncate">
                        <strong className="text-zinc-800">ความเชี่ยวชาญ:</strong>{' '}
                        {tech.specialty || 'งานซ่อมบำรุงทั่วไป'}
                      </span>
                    </p>
                  </div>

                  {/* Technician Performance Pills */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="p-2.5 rounded-2xl bg-zinc-50 border border-zinc-100 text-center">
                      <p className="text-sm font-black text-orange-600">{tech.stats?.activeJobs ?? 0}</p>
                      <p className="text-[10px] text-zinc-400">กำลังทำ</p>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-zinc-50 border border-zinc-100 text-center">
                      <p className="text-sm font-black text-emerald-600">{tech.stats?.completedJobs ?? 0}</p>
                      <p className="text-[10px] text-zinc-400">ปิดงานแล้ว</p>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-zinc-50 border border-zinc-100 text-center">
                      <p className="text-sm font-black text-amber-500 flex items-center justify-center gap-0.5">
                        {tech.stats?.avgRating ? (
                          <>
                            <Star className="w-3 h-3 fill-amber-400" />
                            <span>{tech.stats.avgRating}</span>
                          </>
                        ) : (
                          '-'
                        )}
                      </p>
                      <p className="text-[10px] text-zinc-400">คะแนน</p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(tech)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 transition cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>แก้ไข</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(tech)}
                    disabled={deleteMutation.isPending}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-200 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ลบ</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add / Edit Technician Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-zinc-200 overflow-hidden">
            <div className="p-5 bg-zinc-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-5 h-5 text-orange-400" />
                <h3 className="font-extrabold text-base">
                  {editingTech ? 'แก้ไขข้อมูลช่างเทคนิค' : 'เพิ่มช่างเทคนิคใหม่'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  ชื่อ - นามสกุลช่าง <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น ช่างเอกชัย มืออาชีพ"
                  className="w-full px-4 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  เบอร์โทรศัพท์ (10 หลัก) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  required
                  value={phone}
                  onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
                  placeholder="0891234567"
                  className="w-full px-4 py-2.5 text-sm font-mono bg-zinc-50 border border-zinc-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  พื้นที่รับผิดชอบ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="เช่น กรุงเทพฯ ฝั่งเหนือ / ลาดพร้าว-จตุจักร"
                  className="w-full px-4 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  ความเชี่ยวชาญเฉพาะทาง
                </label>
                <input
                  type="text"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="เช่น แอร์บ้าน Inverter, ติดตั้งแอร์, ซ่อมคอมพิวเตอร์"
                  className="w-full px-4 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-hidden"
                />
              </div>

              <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAvailable}
                  onChange={(e) => setIsAvailable(e.target.checked)}
                  className="w-4 h-4 accent-orange-600 rounded"
                />
                <span className="text-xs font-semibold text-zinc-700">
                  พร้อมรับงาน (แสดงสถานะว่างเมื่อจ่ายงาน)
                </span>
              </label>

              <div className="pt-3 flex justify-end gap-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-zinc-950 hover:bg-orange-600 transition disabled:opacity-50 cursor-pointer"
                >
                  {saveMutation.isPending
                    ? 'กำลังบันทึก...'
                    : editingTech
                    ? 'บันทึกการแก้ไข'
                    : 'เพิ่มช่างเข้าโปรเจกต์'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
