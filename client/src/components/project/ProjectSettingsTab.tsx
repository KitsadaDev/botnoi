import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Settings,
  Webhook,
  Copy,
  Check,
  ExternalLink,
  Save,
  Trash2,
  AlertCircle,
  Globe,
  Bot,
} from 'lucide-react'
import api from '../../lib/api'
import type { ApiResponse, Project, BusinessType } from '../../lib/types'
import { BUSINESS_TYPE_LABELS } from '../../lib/types'

interface ProjectSettingsTabProps {
  project: Project
}

export const ProjectSettingsTab: React.FC<ProjectSettingsTabProps> = ({ project }) => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [name, setName] = useState(project.name)
  const [businessType, setBusinessType] = useState<BusinessType>(
    (project.businessType as BusinessType) || 'AC_AND_IT'
  )
  const [description, setDescription] = useState(project.description || '')
  const [phone, setPhone] = useState(project.phone || '')
  const [lineOaId, setLineOaId] = useState(project.lineOaId || '')
  const [botnoiBotId, setBotnoiBotId] = useState(project.botnoiBotId || '')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const publicBookUrl = `${origin}/p/${project.slug}/book`
  const publicTrackUrl = `${origin}/p/${project.slug}/track`
  const ticketWebhookUrl = `${origin}/api/tickets/botnoi-webhook?project=${project.slug}`
  const chatSyncWebhookUrl = `${origin}/api/projects/public/${project.slug}/chatbot-logs`

  const copyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await api.patch<ApiResponse<Project>>(`/projects/${project.id}`, {
        name: name.trim(),
        businessType,
        description: description.trim() || null,
        phone: phone.trim() || null,
        lineOaId: lineOaId.trim() || null,
        botnoiBotId: botnoiBotId.trim() || null,
      })
      if (!res.data.success) throw new Error(res.data.error || 'บันทึกไม่สำเร็จ')
      return res.data.data
    },
    onSuccess: () => {
      setErrorMsg(null)
      setSaveMessage('บันทึกการตั้งค่าโปรเจกต์เรียบร้อยแล้ว')
      queryClient.invalidateQueries({ queryKey: ['projectDetail', project.id] })
      queryClient.invalidateQueries({ queryKey: ['myProjects'] })
      setTimeout(() => setSaveMessage(null), 3000)
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || 'ไม่สามารถบันทึกการตั้งค่าได้')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await api.delete<ApiResponse<null>>(`/projects/${project.id}`)
      if (!res.data.success) throw new Error(res.data.error || 'ลบโปรเจกต์ไม่สำเร็จ')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myProjects'] })
      navigate('/projects')
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'ลบโปรเจกต์ไม่สำเร็จ')
    },
  })

  const handleDelete = () => {
    if (
      window.confirm(
        `ยืนยันการลบโปรเจกต์ "${project.name}" หรือไม่? ข้อมูลช่างและประวัติแชทของโปรเจกต์นี้จะถูกลบออกทั้งหมด`
      )
    ) {
      deleteMutation.mutate()
    }
  }

  const sampleChatPayload = JSON.stringify(
    {
      externalUserId: 'botnoi_user_12345',
      customerName: 'คุณสมชาย ใจดี',
      customerPhone: '0812345678',
      channel: 'CHATBOT',
      summary: 'สอบถามอาการแอร์ไม่เย็น',
      messages: [
        { sender: 'CUSTOMER', text: 'สวัสดีครับ แอร์ไม่เย็นเลย' },
        { sender: 'BOT', text: 'รับทราบค่ะ ขอทราบที่อยู่และวันที่สะดวกให้ช่างเข้าตรวจเช็คค่ะ' },
      ],
    },
    null,
    2
  )

  return (
    <div className="space-y-6">
      {/* Public Links & Chatbot Webhook Integration */}
      <div className="bg-zinc-950 text-white rounded-3xl p-6 sm:p-8 border border-zinc-800 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-500/20 border border-orange-500/30 text-orange-400 flex items-center justify-center">
            <Webhook className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold">ลิงก์สาธารณะ & เชื่อมต่อ Chatbot Platform</h2>
            <p className="text-xs text-zinc-400">
              นำลิงก์ด้านล่างไปแปะหน้าเว็บ/LINE Rich Menu หรือตั้งค่า Webhook บน Botnoi Chatbot Platform เพื่อดึงใบงานและประวัติแชทเข้าโปรเจกต์นี้โดยตรง
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Public Booking Link */}
          <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-orange-400 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                หน้าแจ้งซ่อมสาธารณะของร้าน
              </span>
              <a
                href={publicBookUrl}
                target="_blank"
                rel="noreferrer"
                className="text-zinc-400 hover:text-white inline-flex items-center gap-1 text-[11px]"
              >
                เปิดดู <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[11px] font-mono bg-zinc-950 px-3 py-2 rounded-xl border border-zinc-800 text-zinc-200 truncate">
                {publicBookUrl}
              </code>
              <button
                type="button"
                onClick={() => copyText('book', publicBookUrl)}
                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 cursor-pointer"
              >
                {copiedKey === 'book' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Public Track Link */}
          <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                หน้าติดตามสถานะ & ประเมินดาว
              </span>
              <a
                href={publicTrackUrl}
                target="_blank"
                rel="noreferrer"
                className="text-zinc-400 hover:text-white inline-flex items-center gap-1 text-[11px]"
              >
                เปิดดู <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[11px] font-mono bg-zinc-950 px-3 py-2 rounded-xl border border-zinc-800 text-zinc-200 truncate">
                {publicTrackUrl}
              </code>
              <button
                type="button"
                onClick={() => copyText('track', publicTrackUrl)}
                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 cursor-pointer"
              >
                {copiedKey === 'track' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Botnoi Ticket Webhook */}
          <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
            <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5" />
              Webhook เปิดใบงานซ่อม (Botnoi AI Agent)
            </span>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[11px] font-mono bg-zinc-950 px-3 py-2 rounded-xl border border-zinc-800 text-zinc-200 truncate">
                {ticketWebhookUrl}
              </code>
              <button
                type="button"
                onClick={() => copyText('ticketHook', ticketWebhookUrl)}
                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 cursor-pointer"
              >
                {copiedKey === 'ticketHook' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Chatbot Log Sync Webhook */}
          <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Webhook className="w-3.5 h-3.5" />
              Webhook ส่งประวัติแชทจาก Chatbot Platform
            </span>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[11px] font-mono bg-zinc-950 px-3 py-2 rounded-xl border border-zinc-800 text-zinc-200 truncate">
                {chatSyncWebhookUrl}
              </code>
              <button
                type="button"
                onClick={() => copyText('chatHook', chatSyncWebhookUrl)}
                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 cursor-pointer"
              >
                {copiedKey === 'chatHook' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Sample Payload */}
        <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-zinc-400">
              ตัวอย่าง JSON Payload สำหรับดึง/ซิงค์ประวัติแชท (POST {`/api/projects/public/${project.slug}/chatbot-logs`})
            </span>
            <button
              type="button"
              onClick={() => copyText('payload', sampleChatPayload)}
              className="text-[11px] font-bold text-orange-400 hover:text-orange-300 inline-flex items-center gap-1 cursor-pointer"
            >
              {copiedKey === 'payload' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'payload' ? 'คัดลอกแล้ว' : 'คัดลอก JSON'}</span>
            </button>
          </div>
          <pre className="text-[11px] font-mono text-zinc-300 bg-zinc-950 p-3.5 rounded-xl overflow-x-auto border border-zinc-800">
            {sampleChatPayload}
          </pre>
        </div>
      </div>

      {/* Edit Project Form */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200/90 shadow-xs space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-100">
          <Settings className="w-5 h-5 text-orange-600" />
          <h3 className="text-base font-extrabold text-zinc-950">ข้อมูลทั่วไปของโปรเจกต์</h3>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {saveMessage && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-bold">
            ✓ {saveMessage}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            updateMutation.mutate()
          }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1.5">ชื่อโปรเจกต์ / ชื่อร้าน</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1.5">ประเภทธุรกิจ</label>
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value as BusinessType)}
              className="w-full px-4 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-hidden"
            >
              {Object.entries(BUSINESS_TYPE_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1.5">เบอร์โทรศัพท์ศูนย์บริการ</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 text-sm font-mono bg-zinc-50 border border-zinc-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1.5">LINE Official Account ID</label>
            <input
              type="text"
              value={lineOaId}
              onChange={(e) => setLineOaId(e.target.value)}
              placeholder="@yourshop"
              className="w-full px-4 py-2.5 text-sm font-mono bg-zinc-50 border border-zinc-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1.5">Botnoi Bot ID</label>
            <input
              type="text"
              value={botnoiBotId}
              onChange={(e) => setBotnoiBotId(e.target.value)}
              className="w-full px-4 py-2.5 text-sm font-mono bg-zinc-50 border border-zinc-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-hidden"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-zinc-700 mb-1.5">คำอธิบายธุรกิจ</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-hidden"
            />
          </div>

          <div className="md:col-span-2 pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-200 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>ลบโปรเจกต์นี้</span>
            </button>

            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-extrabold text-white bg-zinc-950 hover:bg-orange-600 transition disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{updateMutation.isPending ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
