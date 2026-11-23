import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Star,
  Award,
  TrendingUp,
  MessageSquareHeart,
  ThumbsUp,
  Clock,
  Wrench,
  RefreshCw,
  Tag,
} from 'lucide-react'
import api from '../../lib/api'
import type { ApiResponse, SatisfactionAnalytics } from '../../lib/types'
import { SERVICE_LABELS } from '../../lib/types'

interface ProjectSatisfactionTabProps {
  projectId: string
}

export const ProjectSatisfactionTab: React.FC<ProjectSatisfactionTabProps> = ({ projectId }) => {
  const [starFilter, setStarFilter] = useState<number | null>(null)

  const { data, isLoading, refetch } = useQuery<SatisfactionAnalytics>({
    queryKey: ['projectSatisfaction', projectId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<SatisfactionAnalytics>>(
        `/projects/${projectId}/satisfaction`
      )
      if (!res.data.success) throw new Error(res.data.error || 'โหลดข้อมูลไม่สำเร็จ')
      return res.data.data
    },
  })

  if (isLoading) {
    return (
      <div className="py-16 text-center bg-white rounded-3xl border border-zinc-200">
        <RefreshCw className="w-7 h-7 text-orange-600 animate-spin mx-auto mb-2" />
        <p className="text-xs text-zinc-500">กำลังคำนวณผลประเมินความพึงพอใจ...</p>
      </div>
    )
  }

  const summary = data?.summary ?? {
    avgRating: 0,
    avgSpeed: 0,
    avgService: 0,
    csatRate: 0,
    totalReviews: 0,
    completedTickets: 0,
    responseRate: 0,
  }
  const distribution = data?.distribution ?? [5, 4, 3, 2, 1].map((stars) => ({ stars, count: 0, percent: 0 }))
  const byService = data?.byService ?? []
  const byTechnician = data?.byTechnician ?? []
  const topTags = data?.topTags ?? []
  const reviews = (data?.reviews ?? []).filter((r) => (starFilter ? r.rating === starFilter : true))

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 border border-zinc-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-zinc-950 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
            <span>แดชบอร์ดประเมินความพึงพอใจลูกค้า (CSAT Analytics)</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            สรุปผลคะแนนรีวิวจากลูกค้าหลังปิดงานซ่อม (COMPLETED) แบบเรียลไทม์ เพื่อพัฒนาคุณภาพทีมช่างและบริการ
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>อัปเดตผลคะแนน</span>
        </button>
      </div>

      {/* 4 KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-950 text-white p-6 rounded-3xl border border-zinc-800 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400 font-semibold">คะแนนความพึงพอใจเฉลี่ย</p>
            <p className="text-3xl font-black text-amber-400 mt-1">
              {summary.totalReviews > 0 ? summary.avgRating.toFixed(2) : '-'}
              <span className="text-sm text-zinc-500 font-bold"> / 5.0</span>
            </p>
            <div className="flex items-center gap-0.5 mt-1.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-3.5 h-3.5 ${
                    s <= Math.round(summary.avgRating)
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-zinc-700'
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <Star className="w-5 h-5 fill-amber-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-zinc-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400 font-semibold">อัตราความพึงพอใจ (CSAT)</p>
            <p className="text-3xl font-black text-emerald-600 mt-1">{summary.csatRate}%</p>
            <p className="text-[11px] text-zinc-400 mt-1">สัดส่วนรีวิว 4-5 ดาว</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ThumbsUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-zinc-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400 font-semibold">จำนวนผู้ประเมินทั้งหมด</p>
            <p className="text-3xl font-black text-zinc-950 mt-1">{summary.totalReviews}</p>
            <p className="text-[11px] text-orange-600 font-semibold mt-1">
              ตอบกลับ {summary.responseRate}% จาก {summary.completedTickets} งานปิดแล้ว
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <MessageSquareHeart className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-zinc-200/90 shadow-xs space-y-2">
          <p className="text-xs text-zinc-400 font-semibold">คะแนนย่อยรายด้าน</p>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-600 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                ความรวดเร็ว
              </span>
              <span className="font-mono font-black text-zinc-950">
                {summary.avgSpeed > 0 ? `${summary.avgSpeed.toFixed(1)} ★` : '-'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-600 flex items-center gap-1">
                <Wrench className="w-3.5 h-3.5 text-orange-500" />
                คุณภาพงานช่าง
              </span>
              <span className="font-mono font-black text-zinc-950">
                {summary.avgService > 0 ? `${summary.avgService.toFixed(1)} ★` : '-'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row: Star Distribution + Service Breakdown + Technician Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Star Distribution (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-zinc-200/90 shadow-xs space-y-4">
          <h3 className="font-extrabold text-sm text-zinc-950 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-orange-600" />
            <span>สัดส่วนคะแนนรีวิว (Rating Distribution)</span>
          </h3>
          <div className="space-y-3">
            {distribution.map((row) => (
              <button
                key={row.stars}
                type="button"
                onClick={() => setStarFilter(starFilter === row.stars ? null : row.stars)}
                className={`w-full flex items-center gap-3 p-1.5 rounded-xl transition cursor-pointer ${
                  starFilter === row.stars ? 'bg-amber-50 ring-1 ring-amber-300' : 'hover:bg-zinc-50'
                }`}
              >
                <span className="w-12 text-xs font-bold text-zinc-700 flex items-center gap-1 shrink-0">
                  <span>{row.stars}</span>
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                </span>
                <div className="flex-1 h-3 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
                    style={{ width: `${row.percent}%` }}
                  />
                </div>
                <span className="w-16 text-right text-[11px] font-mono text-zinc-500 shrink-0">
                  {row.count} ({row.percent}%)
                </span>
              </button>
            ))}
          </div>

          {/* Top Praise Tags */}
          {topTags.length > 0 && (
            <div className="pt-4 border-t border-zinc-100 space-y-2">
              <p className="text-xs font-bold text-zinc-700 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-orange-500" />
                <span>คำชื่นชมยอดนิยมจากลูกค้า</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {topTags.map((t) => (
                  <span
                    key={t.tag}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-[11px] font-bold"
                  >
                    <span>{t.tag}</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-white text-[10px] font-mono">
                      {t.count}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Service Type & Technician Leaderboard (7 cols) */}
        <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* By Service */}
          <div className="bg-white rounded-3xl p-6 border border-zinc-200/90 shadow-xs space-y-4">
            <h3 className="font-extrabold text-sm text-zinc-950 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-indigo-600" />
              <span>คะแนนตามประเภทบริการ</span>
            </h3>
            {byService.length === 0 ? (
              <p className="text-xs text-zinc-400 py-8 text-center">ยังไม่มีข้อมูลประเมินแยกตามบริการ</p>
            ) : (
              <div className="space-y-3">
                {byService.map((item) => (
                  <div
                    key={item.service}
                    className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-zinc-900">
                        {SERVICE_LABELS[item.service] || item.service}
                      </p>
                      <p className="text-[11px] text-zinc-400">{item.count} รีวิว</p>
                    </div>
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-700 font-mono text-xs font-black border border-amber-200">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{item.avgRating.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Technician Leaderboard */}
          <div className="bg-white rounded-3xl p-6 border border-zinc-200/90 shadow-xs space-y-4">
            <h3 className="font-extrabold text-sm text-zinc-950 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>อันดับคะแนนรายช่าง (Top Technicians)</span>
            </h3>
            {byTechnician.length === 0 ? (
              <p className="text-xs text-zinc-400 py-8 text-center">ยังไม่มีคะแนนประเมินรายช่าง</p>
            ) : (
              <div className="space-y-2.5">
                {byTechnician.map((tech, idx) => (
                  <div
                    key={tech.id}
                    className="p-3 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-lg font-mono text-xs font-black flex items-center justify-center shrink-0 ${
                          idx === 0
                            ? 'bg-amber-400 text-zinc-950'
                            : idx === 1
                            ? 'bg-zinc-300 text-zinc-800'
                            : 'bg-zinc-200 text-zinc-600'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-zinc-900 truncate">{tech.name}</p>
                        <p className="text-[10px] text-zinc-400 truncate">
                          {tech.area} • {tech.count} รีวิว
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 font-mono text-xs font-black text-amber-600 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      {tech.avgRating.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Customer Reviews Feed */}
      <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-zinc-100 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-extrabold text-sm text-zinc-950">
            ความคิดเห็นและรีวิวจากลูกค้า ({reviews.length})
          </h3>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setStarFilter(null)}
              className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer ${
                starFilter === null ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-600'
              }`}
            >
              ทั้งหมด
            </button>
            {[5, 4, 3, 2, 1].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStarFilter(s)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-0.5 ${
                  starFilter === s ? 'bg-amber-400 text-zinc-950' : 'bg-zinc-100 text-zinc-600'
                }`}
              >
                <span>{s}</span>
                <Star className="w-3 h-3 fill-current" />
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-zinc-100">
          {reviews.length === 0 ? (
            <div className="py-14 px-4 text-center space-y-2">
              <Star className="w-8 h-8 text-zinc-200 mx-auto" />
              <p className="text-xs font-bold text-zinc-600">ยังไม่มีรีวิวความพึงพอใจในเงื่อนไขที่เลือก</p>
              <p className="text-[11px] text-zinc-400">
                เมื่อใบงานมีสถานะ "เสร็จสิ้น (COMPLETED)" ลูกค้าสามารถกดให้คะแนนและรีวิวได้จากหน้าติดตามสถานะ
              </p>
            </div>
          ) : (
            reviews.map((rev) => (
              <div key={rev.id} className="p-5 hover:bg-zinc-50/70 transition space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-4 h-4 ${
                            s <= rev.rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-extrabold text-xs text-zinc-950">{rev.customerName}</span>
                    {rev.ticket && (
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded-lg bg-zinc-100 text-zinc-600 font-bold">
                        {rev.ticket.trackingCode}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400">
                    {new Date(rev.createdAt).toLocaleDateString('th-TH', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                {rev.comment && (
                  <p className="text-xs text-zinc-700 leading-relaxed bg-zinc-50 p-3.5 rounded-2xl border border-zinc-100">
                    &ldquo;{rev.comment}&rdquo;
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex flex-wrap gap-1.5">
                    {rev.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 font-semibold"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                  {rev.ticket && (
                    <span className="text-zinc-400">
                      บริการ: <strong className="text-zinc-700">{SERVICE_LABELS[rev.ticket.service]}</strong>
                      {rev.ticket.technician && (
                        <>
                          {' '}
                          • ช่าง: <strong className="text-zinc-700">{rev.ticket.technician.name}</strong>
                        </>
                      )}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
