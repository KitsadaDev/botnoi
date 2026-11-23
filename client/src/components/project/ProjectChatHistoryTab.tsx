import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  MessagesSquare,
  Search,
  Send,
  Bot,
  User as UserIcon,
  Phone,
  Globe,
  Mic,
  MessageSquare,
  RefreshCw,
  Ticket as TicketIcon,
  Sparkles,
  CheckCircle2,
} from 'lucide-react'
import api from '../../lib/api'
import type { ApiResponse, UnifiedConversation } from '../../lib/types'
import { CHANNEL_LABELS, STATUS_LABELS, STATUS_COLORS } from '../../lib/types'

interface ProjectChatHistoryTabProps {
  projectId: string
  projectSlug: string
  onOpenTicket?: (ticketId: string) => void
}

const CHANNEL_BADGE_STYLES: Record<string, string> = {
  CHATBOT: 'bg-orange-50 text-orange-700 border-orange-200',
  LINE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  VOICEBOT: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  WEB: 'bg-sky-50 text-sky-700 border-sky-200',
}

export const ProjectChatHistoryTab: React.FC<ProjectChatHistoryTabProps> = ({
  projectId,
  projectSlug,
  onOpenTicket,
}) => {
  const queryClient = useQueryClient()
  const [channelFilter, setChannelFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')

  const {
    data: conversations = [],
    isLoading,
    refetch,
  } = useQuery<UnifiedConversation[]>({
    queryKey: ['projectConversations', projectId, channelFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (channelFilter) params.append('channel', channelFilter)
      if (searchQuery.trim()) params.append('q', searchQuery.trim())
      const res = await api.get<ApiResponse<UnifiedConversation[]>>(
        `/projects/${projectId}/conversations?${params.toString()}`
      )
      return res.data.success ? res.data.data : []
    },
    refetchInterval: 10000,
  })

  const activeConv = conversations.find((c) => c.id === selectedConvId) || conversations[0] || null

  const sendReplyMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!activeConv) return
      const res = await api.post<ApiResponse<any>>(
        `/projects/${projectId}/conversations/${encodeURIComponent(activeConv.id)}/messages`,
        { text }
      )
      if (!res.data.success) throw new Error(res.data.error || 'ส่งข้อความไม่สำเร็จ')
      return res.data.data
    },
    onSuccess: () => {
      setReplyText('')
      queryClient.invalidateQueries({ queryKey: ['projectConversations', projectId] })
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'ส่งข้อความไม่สำเร็จ')
    },
  })

  const simulateSyncMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiResponse<any>>(
        `/projects/${projectId}/conversations/simulate-sync`
      )
      if (!res.data.success) throw new Error(res.data.error || 'ซิงค์ไม่สำเร็จ')
      return res.data.data
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['projectConversations', projectId] })
      queryClient.invalidateQueries({ queryKey: ['myProjects'] })
      if (created?.id) setSelectedConvId(created.id)
    },
  })

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyText.trim() || sendReplyMutation.isPending) return
    sendReplyMutation.mutate(replyText.trim())
  }

  const getChannelIcon = (ch: string) => {
    if (ch === 'VOICEBOT') return <Mic className="w-3 h-3" />
    if (ch === 'WEB') return <Globe className="w-3 h-3" />
    if (ch === 'LINE') return <MessageSquare className="w-3 h-3" />
    return <Bot className="w-3 h-3" />
  }

  return (
    <div className="space-y-5">
      {/* Chatbot Platform Sync Banner */}
      <div className="bg-zinc-950 text-white rounded-3xl p-5 sm:p-6 border border-zinc-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono font-bold">
              <Sparkles className="w-3 h-3" />
              CHATBOT PLATFORM SYNC READY
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-extrabold">
            ศูนย์รวมประวัติการสนทนากับลูกค้า (Central Chat History)
          </h2>
          <p className="text-xs text-zinc-400">
            รวมประวัติแชทจาก <strong className="text-zinc-200">Botnoi Chatbot / LINE OA / Voicebot</strong> และ{' '}
            <strong className="text-zinc-200">แชทใบงานหน้าเว็บ</strong> ไว้ในหน้าเดียว • Endpoint:{' '}
            <code className="px-1.5 py-0.5 rounded bg-zinc-900 text-orange-300 font-mono text-[11px]">
              POST /api/projects/public/{projectSlug}/chatbot-logs
            </code>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => simulateSyncMutation.mutate()}
            disabled={simulateSyncMutation.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold bg-indigo-500 hover:bg-indigo-400 text-white transition cursor-pointer disabled:opacity-50"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>
              {simulateSyncMutation.isPending
                ? 'กำลังดึงแชท...'
                : 'ทดสอบดึงแชทจาก Chatbot'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>รีเฟรช</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-3xl p-4 border border-zinc-200/90 shadow-xs flex flex-col md:flex-row gap-3 justify-between items-center">
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto p-1 bg-zinc-100 rounded-2xl">
          {[
            { value: '', label: 'ทุกช่องทาง' },
            { value: 'CHATBOT', label: 'AI Chatbot' },
            { value: 'LINE', label: 'LINE OA' },
            { value: 'VOICEBOT', label: 'Voicebot' },
            { value: 'WEB', label: 'แชทใบงานเว็บ' },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setChannelFilter(tab.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                channelFilter === tab.value
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
            placeholder="ค้นหาชื่อลูกค้า, เบอร์โทร, ข้อความแชท..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-hidden"
          />
        </div>
      </div>

      {/* Unified Split-Pane Chat Viewer */}
      <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-xs overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[540px]">
        {/* Left List (4 cols) */}
        <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-zinc-200 flex flex-col max-h-[600px]">
          <div className="px-5 py-3.5 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
            <span className="text-xs font-extrabold text-zinc-900">
              ประวัติห้องสนทนา ({conversations.length})
            </span>
            <span className="text-[10px] font-mono text-emerald-600 font-bold">AUTO-SYNC</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100">
            {isLoading ? (
              <div className="py-12 text-center text-xs text-zinc-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-orange-500" />
                กำลังโหลดประวัติแชท...
              </div>
            ) : conversations.length === 0 ? (
              <div className="py-16 px-4 text-center space-y-2">
                <MessagesSquare className="w-8 h-8 text-zinc-300 mx-auto" />
                <p className="text-xs font-bold text-zinc-700">ยังไม่มีประวัติการสนทนา</p>
                <p className="text-[11px] text-zinc-400">
                  กดปุ่ม "ทดสอบดึงแชทจาก Chatbot" ด้านบน หรือเชื่อมต่อ Webhook จาก Chatbot Platform
                </p>
              </div>
            ) : (
              conversations.map((conv) => {
                const isSelected = conv.id === activeConv?.id
                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => setSelectedConvId(conv.id)}
                    className={`w-full text-left p-4 transition cursor-pointer ${
                      isSelected
                        ? 'bg-orange-50/70 border-l-4 border-l-orange-500'
                        : 'hover:bg-zinc-50 border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-extrabold text-xs text-zinc-950 truncate">
                        {conv.customerName}
                      </span>
                      <span
                        className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          CHANNEL_BADGE_STYLES[conv.channel] || 'bg-zinc-100 text-zinc-600 border-zinc-200'
                        }`}
                      >
                        {getChannelIcon(conv.channel)}
                        <span>{CHANNEL_LABELS[conv.channel] || conv.channel}</span>
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed">
                      {conv.summary}
                    </p>

                    <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-400">
                      <span className="font-mono">
                        {conv.ticket ? conv.ticket.trackingCode : conv.customerPhone || 'ไม่มีเบอร์'}
                      </span>
                      <span>
                        {new Date(conv.lastMessageAt).toLocaleString('th-TH', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Right Transcript & Reply Area (8 cols) */}
        <div className="lg:col-span-8 flex flex-col max-h-[600px]">
          {!activeConv ? (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center text-zinc-400">
              <MessagesSquare className="w-10 h-10 text-zinc-300 mb-3" />
              <p className="text-sm font-bold text-zinc-600">เลือกห้องสนทนาทางด้านซ้ายเพื่อดูประวัติแชท</p>
            </div>
          ) : (
            <>
              {/* Conversation Header */}
              <div className="p-4 sm:p-5 border-b border-zinc-200 bg-zinc-50/70 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-zinc-950 text-orange-400 flex items-center justify-center font-black text-sm">
                    {activeConv.customerName.slice(0, 1)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-sm text-zinc-950">
                        {activeConv.customerName}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          CHANNEL_BADGE_STYLES[activeConv.channel] || 'bg-zinc-100 text-zinc-600'
                        }`}
                      >
                        {getChannelIcon(activeConv.channel)}
                        <span>{CHANNEL_LABELS[activeConv.channel] || activeConv.channel}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-zinc-500 mt-0.5">
                      {activeConv.customerPhone && (
                        <span className="inline-flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3" />
                          {activeConv.customerPhone}
                        </span>
                      )}
                      {activeConv.externalUserId && (
                        <span className="font-mono text-zinc-400">ID: {activeConv.externalUserId}</span>
                      )}
                    </div>
                  </div>
                </div>

                {activeConv.ticket && (
                  <button
                    type="button"
                    onClick={() => onOpenTicket?.(activeConv.ticket!.id)}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-orange-50 border border-zinc-200 hover:border-orange-300 text-xs font-bold text-zinc-800 transition cursor-pointer"
                  >
                    <TicketIcon className="w-3.5 h-3.5 text-orange-600" />
                    <span className="font-mono">{activeConv.ticket.trackingCode}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        STATUS_COLORS[activeConv.ticket.status] || 'bg-zinc-100 text-zinc-700'
                      }`}
                    >
                      {STATUS_LABELS[activeConv.ticket.status] || activeConv.ticket.status}
                    </span>
                  </button>
                )}
              </div>

              {/* Messages Feed */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-zinc-50/40">
                {activeConv.messages.map((msg) => {
                  const isCustomer = msg.sender === 'CUSTOMER'
                  const isBot = msg.sender === 'BOT'
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}
                    >
                      <span className="text-[10px] text-zinc-400 mb-1 px-1 flex items-center gap-1">
                        {isCustomer ? (
                          <UserIcon className="w-3 h-3 text-zinc-400" />
                        ) : isBot ? (
                          <Bot className="w-3 h-3 text-indigo-500" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3 text-orange-500" />
                        )}
                        <span>
                          {isBot ? `AI Bot (${msg.senderName})` : msg.senderName}
                        </span>
                      </span>
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-2xs ${
                          isCustomer
                            ? 'bg-white border border-zinc-200 text-zinc-800 rounded-tl-xs'
                            : isBot
                            ? 'bg-indigo-600 text-white rounded-tr-xs'
                            : 'bg-zinc-950 text-white rounded-tr-xs'
                        }`}
                      >
                        {msg.text}
                      </div>
                      <span className="text-[9px] font-mono text-zinc-400 mt-1 px-1">
                        {new Date(msg.createdAt).toLocaleTimeString('th-TH', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Reply Input */}
              {activeConv.kind === 'TICKET_CHAT' && activeConv.status === 'RESOLVED' ? (
                <div className="p-3.5 bg-zinc-50 border-t border-zinc-200 text-xs text-zinc-400 text-center">
                  ใบงานนี้ปิดแล้ว ไม่สามารถส่งข้อความตอบกลับในแชทใบงานได้
                </div>
              ) : (
                <form
                  onSubmit={handleSendReply}
                  className="p-3.5 bg-white border-t border-zinc-200 flex gap-2"
                >
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={
                      activeConv.kind === 'CHATBOT_LOG'
                        ? 'บันทึกข้อความตอบกลับ / โน้ตติดตามลูกค้าในประวัติแชทนี้...'
                        : 'พิมพ์ตอบกลับลูกค้าในใบงานนี้...'
                    }
                    className="flex-1 px-4 py-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-hidden"
                  />
                  <button
                    type="submit"
                    disabled={sendReplyMutation.isPending || !replyText.trim()}
                    className="px-4 py-2.5 rounded-xl bg-zinc-950 hover:bg-orange-600 text-white text-xs font-bold disabled:opacity-40 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>ส่ง</span>
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
