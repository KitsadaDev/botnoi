import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  MessageSquare,
  ArrowUpRight,
  Activity,
  ChevronDown,
  HelpCircle,
  Mic,
  Bot,
  PhoneCall as VcPhoneIcon,
  PhoneOff as VcHangupIcon,
  Volume2 as VcVolumeIcon,
  Copy as VcCopyIcon,
  Check as VcCheckIcon,
  FolderKanban,
  Users,
  Star,
  Layers,
  MessagesSquare,
  UserPlus,
  BarChart3,
  Webhook,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import { BotnoiVoiceClient, type VoiceCallStatus } from '../lib/botnoiVoiceClient'
import { ScrollReveal, Tilt3DCard, MagneticButton, NumberTicker } from '../components/InteractiveUI'
import { SAMPLE_TRACKING_CODES } from '../lib/constants'
import { useAuth } from '../context/AuthContext'

const PLATFORM_ECOSYSTEM = [
  'MULTI-PROJECT WORKSPACE',
  'BOTNOI CHATBOT SYNC',
  'AI VOICEBOT 24/7',
  '3D AI AVATAR',
  'LINE OA INTEGRATION',
  'TECHNICIAN DISPATCH',
  'CENTRAL CHAT HISTORY',
  'CSAT SATISFACTION ANALYTICS',
  'AIR-CON & IT SERVICE',
  'REAL-TIME TICKET TRACKING',
]

const PLATFORM_PILLARS = [
  {
    icon: FolderKanban,
    badge: 'MULTI-TENANT',
    title: 'สร้าง Project ได้เอง ไม่ต้องทำเว็บซ้ำ',
    desc: 'ผู้ประกอบการล็อกอินเข้ามาสร้าง Project แยกตามร้านหรือสาขาได้ทันที พร้อมได้ลิงก์ฟอร์มแจ้งซ่อม หน้าติดตามสถานะ และ Webhook URL เฉพาะโปรเจกต์อัตโนมัติ',
    accent: 'orange',
  },
  {
    icon: MessagesSquare,
    badge: 'CENTRAL CHAT HUB',
    title: 'ศูนย์กลางดูประวัติแชทลูกค้าทุกช่องทาง',
    desc: 'รวมประวัติการคุยกับลูกค้าจาก Chatbot Platform (Botnoi / LINE OA), Voicebot และแชทหน้าเว็บไว้ในหน้าจอเดียว เจ้าหน้าที่ค้นหาและตอบกลับต่อได้ทันที',
    accent: 'indigo',
  },
  {
    icon: Users,
    badge: 'TECHNICIAN ZONE',
    title: 'โซน Add ช่าง & Assign งานแจ้งซ่อม',
    desc: 'เพิ่มรายชื่อช่างประจำโปรเจกต์ ระบุพื้นที่รับผิดชอบและความเชี่ยวชาญ ตรวจดูปริมาณงานคงค้าง และกดมอบหมายงาน (Assign) ให้ช่างที่พร้อมได้ในคลิกเดียว',
    accent: 'emerald',
  },
  {
    icon: Star,
    badge: 'CSAT DASHBOARD',
    title: 'แดชบอร์ดประเมินความพึงพอใจอัตโนมัติ',
    desc: 'เมื่อปิดงานเสร็จสิ้น ลูกค้ากดให้คะแนนดาวและรีวิวจากหน้าติดตามงานได้ทันที ข้อมูลสรุปขึ้นแดชบอร์ด CSAT แยกคะแนนตามประเภทบริการและรายช่างแบบเรียลไทม์',
    accent: 'amber',
  },
] as const

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: Layers,
    title: 'สมัครใช้งานและสร้าง Project',
    desc: 'ล็อกอินเข้าแพลตฟอร์ม กดสร้าง Project ใหม่ ตั้งชื่อร้านและประเภทธุรกิจ ระบบจะสร้างแดชบอร์ดและลิงก์สาธารณะเฉพาะร้านของคุณให้ทันที',
  },
  {
    step: '02',
    icon: UserPlus,
    title: 'เพิ่มทีมช่าง & เชื่อมต่อ Chatbot',
    desc: 'เพิ่มรายชื่อช่างเทคนิคในโซนจัดการช่าง และนำ Webhook URL ไปเชื่อมต่อกับ Botnoi Chatbot / Voicebot เพื่อให้บอทเปิดเคสและซิงค์แชทเข้าอัตโนมัติ',
  },
  {
    step: '03',
    icon: BarChart3,
    title: 'จ่ายงาน ดูแชท และวัดผล CSAT',
    desc: 'ติดตามเคสแจ้งซ่อมใหม่แบบเรียลไทม์ Assign งานให้ช่าง ดูประวัติแชทลูกค้า ส่งออกรายงาน PDF/Excel และวิเคราะห์คะแนนความพึงพอใจในที่เดียว',
  },
]

const FAQ_ITEMS = [
  {
    q: 'แพลตฟอร์มนี้ต่างจากการทำเว็บแจ้งซ่อมแบบเดิมอย่างไร?',
    a: 'Plasom เป็น Central Multi-tenant Platform ที่ผู้ประกอบการหลายเจ้าสามารถสมัครเข้ามาใช้งานร่วมกันบนศูนย์กลางเดียว แยกข้อมูลตาม Project อย่างปลอดภัย ไม่ต้องเสียเวลา Duplicate เว็บไซต์หรือตั้งเซิร์ฟเวอร์ใหม่ทุกครั้งที่มีร้านใหม่เข้ามา',
  },
  {
    q: 'ผู้ประกอบการ 1 บัญชีสามารถสร้างได้กี่ Project?',
    a: 'สามารถสร้างได้หลาย Project แยกตามสาขาหรือประเภทธุรกิจ (เช่น ศูนย์บริการแอร์, ร้านซ่อมคอมพิวเตอร์/ไอที, ศูนย์ซ่อมเครื่องใช้ไฟฟ้า) โดยแต่ละ Project จะมีแดชบอร์ดใบงาน ทีมช่าง ประวัติแชท และผลความพึงพอใจแยกเป็นสัดส่วน',
  },
  {
    q: 'เชื่อมต่อประวัติแชทจาก Botnoi Chatbot Platform ได้อย่างไร?',
    a: 'ในหน้า "ตั้งค่า & เชื่อมต่อ" ของแต่ละ Project จะมี Webhook URL เฉพาะโปรเจกต์ทั้งสำหรับการเปิดใบงานซ่อมอัตโนมัติ และการส่งประวัติแชทจาก Chatbot Platform / LINE OA เข้ามาแสดงในแท็บ "ประวัติแชทลูกค้า" แบบเรียลไทม์',
  },
  {
    q: 'ลูกค้าประเมินความพึงพอใจผ่านช่องทางไหน?',
    a: 'เมื่อเจ้าหน้าที่อัปเดตสถานะใบงานเป็น "เสร็จสิ้น (COMPLETED)" ระบบจะแสดงแบบฟอร์มประเมินความพึงพอใจ (1-5 ดาว + คะแนนความรวดเร็ว/คุณภาพช่าง + ข้อเสนอแนะ) บนหน้าติดตามสถานะของลูกค้าโดยอัตโนมัติ และนำผลมาคำนวณในแดชบอร์ด CSAT ทันที',
  },
]

export const HomePage: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [quickCode, setQuickCode] = useState('')
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0)

  // Voicebot & AI Demo states
  const [voiceCallStatus, setVoiceCallStatus] = useState<VoiceCallStatus>('idle')
  const [isPlayingVoice, setIsPlayingVoice] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [voiceStep, setVoiceStep] = useState<number>(0)
  const [voiceBotText, setVoiceBotText] = useState(
    'กดปุ่ม "โทรคุยนัดช่างกับน้องปลาส้ม" เพื่อเปิดสายสนทนาสดแบบโต้ตอบอัตโนมัติ (พูดคุยต่อเนื่องได้เหมือนคุยโทรศัพท์จริง)'
  )
  const [voiceUserText, setVoiceUserText] = useState('')
  const [createdVoiceCode, setCreatedVoiceCode] = useState<string | null>(null)
  const voiceClientRef = useRef<BotnoiVoiceClient | null>(null)
  const [spotlightTarget, setSpotlightTarget] = useState<'chat' | 'avatar' | null>(null)
  const [avatarCalloutPos, setAvatarCalloutPos] = useState<{
    bottom: string
    right: string
    placement: 'left' | 'top'
  }>({ bottom: '28px', right: '330px', placement: 'left' })

  const triggerOpenChatbot = () => {
    setSpotlightTarget('chat')
    setTimeout(() => setSpotlightTarget((prev) => (prev === 'chat' ? null : prev)), 4500)

    const win = window as any
    if (win.BN?.openChat) {
      win.BN.openChat()
      return
    }
    const bnRoot = document.getElementById('bn-root')
    const chatClickable =
      (bnRoot?.querySelector('button, [role="button"], img, div[style*="cursor: pointer"]') as HTMLElement | null) ||
      (document.querySelector('.bn-customerchat button, [id^="bn-"] button') as HTMLElement | null)
    chatClickable?.click()
  }

  const triggerHighlightAvatar = () => {
    let minLeft = window.innerWidth - 310
    let minTop = window.innerHeight - 350

    const checkNode = (node: Element) => {
      const r = node.getBoundingClientRect()
      if (
        r.width > 36 &&
        r.height > 36 &&
        r.width < window.innerWidth * 0.75 &&
        r.height < window.innerHeight * 0.8 &&
        r.right > window.innerWidth - 450 &&
        r.bottom > window.innerHeight - 500
      ) {
        if (r.left < minLeft) minLeft = r.left
        if (r.top < minTop) minTop = r.top
      }
    }

    Array.from(document.body.children).forEach((el) => {
      if (
        el.id === 'root' ||
        el.id === 'bn-root' ||
        el.tagName === 'SCRIPT' ||
        el.tagName === 'STYLE' ||
        el.classList.contains('bn-customerchat') ||
        el.id.startsWith('bn-')
      ) {
        return
      }
      checkNode(el)
      el.querySelectorAll('canvas, iframe, div, button').forEach(checkNode)
      el.shadowRoot?.querySelectorAll('canvas, div, button').forEach(checkNode)
    })

    if (minLeft > 340) {
      setAvatarCalloutPos({
        bottom: '28px',
        right: `${Math.round(window.innerWidth - minLeft + 20)}px`,
        placement: 'left',
      })
    } else {
      setAvatarCalloutPos({
        bottom: `${Math.round(window.innerHeight - minTop + 16)}px`,
        right: '20px',
        placement: 'top',
      })
    }

    setSpotlightTarget('avatar')
    setTimeout(() => setSpotlightTarget((prev) => (prev === 'avatar' ? null : prev)), 5000)
  }

  useEffect(() => {
    const handleAvatarNavigate = (e: Event) => {
      e.preventDefault()
      const customEvent = e as CustomEvent<{ target?: string }>
      const target = customEvent.detail?.target
      if (!target) return
      if (target.startsWith('/')) {
        navigate(target)
        return
      }
      try {
        const parsed = new URL(target, window.location.origin)
        if (parsed.origin === window.location.origin) {
          navigate(`${parsed.pathname}${parsed.search}${parsed.hash}`)
        }
      } catch {
        // ignore invalid url
      }
    }
    window.addEventListener('webavatar-navigate', handleAvatarNavigate)
    return () => window.removeEventListener('webavatar-navigate', handleAvatarNavigate)
  }, [navigate])

  const stopBotSpeaking = () => {
    const existingAudio = (window as any).__currentTtsAudio as HTMLAudioElement | undefined
    if (existingAudio) {
      existingAudio.pause()
      existingAudio.currentTime = 0
    }
    window.speechSynthesis?.cancel()
    setIsPlayingVoice(false)
  }

  const toggleRealtimeVoiceCall = async () => {
    if (voiceCallStatus === 'connecting' || voiceCallStatus === 'connected') {
      voiceClientRef.current?.hangup()
      voiceClientRef.current = null
      setVoiceCallStatus('idle')
      setIsPlayingVoice(false)
      return
    }

    stopBotSpeaking()
    setCreatedVoiceCode(null)
    setCopiedCode(false)
    setVoiceUserText('')
    setVoiceStep(1)
    setVoiceBotText('กำลังเชื่อมต่อสายสนทนากับน้องปลาส้ม กรุณารอสักครู่ค่ะ...')

    const client = new BotnoiVoiceClient({
      onStatusChange: (status) => {
        setVoiceCallStatus(status)
        if (status === 'idle') setIsPlayingVoice(false)
      },
      onBotSpeakingChange: (speaking) => setIsPlayingVoice(speaking),
      onBotTranscript: (text) => {
        setVoiceBotText(text)
        if (text.includes('สรุปข้อมูล') || text.includes('วันนัดหมาย') || text.includes('วันที่สะดวก')) {
          setVoiceStep(3)
        } else if (text.includes('ที่อยู่') || text.includes('ยี่ห้อ') || text.includes('อาการ')) {
          setVoiceStep((prev) => Math.max(prev, 2))
        }
      },
      onUserTranscript: (text) => setVoiceUserText(text),
      onTrackingCodeDetected: (code) => {
        setCreatedVoiceCode(code)
        setVoiceStep(4)
      },
      onError: (errMsg) => setVoiceBotText(`⚠️ ${errMsg}`),
    })

    voiceClientRef.current = client
    await client.connect()
  }

  const handleCopyVoiceCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    return () => {
      voiceClientRef.current?.hangup()
      voiceClientRef.current = null
      stopBotSpeaking()
    }
  }, [])

  useEffect(() => {
    if (window.location.hash === '#ai-showcase') {
      setTimeout(() => {
        document.getElementById('ai-showcase')?.scrollIntoView({ behavior: 'smooth' })
      }, 150)
    }
  }, [])

  const handleQuickTrack = (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickCode.trim()) return
    navigate(`/track/${encodeURIComponent(quickCode.trim().toUpperCase())}`)
  }

  return (
    <div className="space-y-24 pb-24 overflow-x-hidden">
      {/* ============================================================================
          1. HERO SECTION — CENTRAL AI AFTER-SALES SAAS PLATFORM (BOKARI STYLE)
      ============================================================================ */}
      <section className="relative bg-zinc-950 text-white overflow-hidden pt-14 pb-20 sm:py-24 border-b border-zinc-800">
        <div className="absolute inset-0 bg-grid-dark opacity-70 pointer-events-none" />
        <div className="absolute -top-40 left-1/4 w-[520px] h-[520px] rounded-full bg-orange-500/20 blur-[140px] pointer-events-none animate-pulse-slow" />
        <div className="absolute bottom-0 right-1/4 w-[450px] h-[450px] rounded-full bg-indigo-600/20 blur-[140px] pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-950/30 to-zinc-950 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
            {/* Left Hero Content (7 cols) */}
            <ScrollReveal direction="up" className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 pl-2 pr-3.5 py-1 rounded-full bg-zinc-900/90 border border-zinc-800 text-zinc-200 text-xs font-medium shadow-lg backdrop-blur-md hover:border-orange-500/50 transition-colors cursor-default">
                <span className="px-2 py-0.5 rounded-full bg-orange-500 text-zinc-950 font-bold text-[10px] uppercase tracking-wider">
                  Central AI Platform
                </span>
                <span className="text-zinc-300">
                  แพลตฟอร์มศูนย์กลางบริหารงานแจ้งซ่อม & แชทลูกค้าสำหรับผู้ประกอบการ
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-orange-400" />
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.12] text-white">
                สร้างระบบแจ้งซ่อมและ <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500">
                  AI After-Sales
                </span>{' '}
                ในที่เดียว
              </h1>

              <p className="text-zinc-400 text-base sm:text-lg max-w-2xl leading-relaxed font-normal">
                ไม่ต้องสร้างเว็บแยกหรือ Duplicate Template ทุกครั้งที่มีลูกค้าใหม่ — ผู้ประกอบการล็อกอินเข้ามา{' '}
                <strong className="text-zinc-200">สร้าง Project ของตัวเองได้ทันที</strong> พร้อมแดชบอร์ดรับแจ้งซ่อม,
                โซนเพิ่มช่างและ Assign งาน, ศูนย์รวมประวัติแชทจาก Chatbot และแดชบอร์ดประเมินความพึงพอใจ
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <MagneticButton
                  type="button"
                  onClick={() => navigate(user ? '/projects' : '/login?mode=register')}
                  className="btn-shimmer px-7 py-4 rounded-2xl font-bold text-sm text-white shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40"
                >
                  <FolderKanban className="w-4 h-4" />
                  <span>{user ? 'เข้าสู่ Workspace โปรเจกต์ของฉัน' : 'เริ่มสร้าง Project ฟรี'}</span>
                  <ArrowRight className="w-4 h-4" />
                </MagneticButton>

                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl font-semibold text-sm bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-orange-400" />
                  <span>ทดลองเข้าแดชบอร์ด (Demo)</span>
                </button>

                <a
                  href="#ai-showcase"
                  className="inline-flex items-center gap-2 px-4 py-4 rounded-2xl font-semibold text-sm text-zinc-400 hover:text-white transition-all"
                >
                  <Mic className="w-4 h-4 text-indigo-400" />
                  <span>ลองคุยกับ AI</span>
                </a>
              </div>

              {/* Platform Metric Pills */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-zinc-800/80 max-w-lg">
                <div className="bg-zinc-900/50 hover:bg-zinc-900/90 border border-zinc-800/80 hover:border-orange-500/40 rounded-2xl p-3.5 backdrop-blur-xs transition-all duration-300">
                  <div className="flex items-center gap-1.5 text-orange-400 text-xs font-mono mb-0.5">
                    <Layers className="w-4 h-4" />
                    <span>PROJECTS</span>
                  </div>
                  <p className="text-2xl font-black text-white tracking-tight">
                    <NumberTicker value={100} suffix="%" />
                  </p>
                  <p className="text-[11px] text-zinc-400">แยกข้อมูลตามโปรเจกต์</p>
                </div>

                <div className="bg-zinc-900/50 hover:bg-zinc-900/90 border border-zinc-800/80 hover:border-emerald-500/40 rounded-2xl p-3.5 backdrop-blur-xs transition-all duration-300">
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-mono mb-0.5">
                    <Webhook className="w-4 h-4" />
                    <span>OMNICHANNEL</span>
                  </div>
                  <p className="text-2xl font-black text-white tracking-tight">
                    <NumberTicker value={4} suffix=" ช่องทาง" />
                  </p>
                  <p className="text-[11px] text-zinc-400">Chat / LINE / Voice / Web</p>
                </div>

                <div className="bg-zinc-900/50 hover:bg-zinc-900/90 border border-zinc-800/80 hover:border-amber-500/40 rounded-2xl p-3.5 backdrop-blur-xs transition-all duration-300">
                  <div className="flex items-center gap-1.5 text-amber-400 text-xs font-mono mb-0.5">
                    <Star className="w-4 h-4" />
                    <span>CSAT</span>
                  </div>
                  <p className="text-2xl font-black text-white tracking-tight">4.9/5</p>
                  <p className="text-[11px] text-zinc-400">วัดผลความพึงพอใจสด</p>
                </div>
              </div>
            </ScrollReveal>

            {/* Right: Platform Command Preview + Live Ticket Tracker (5 cols) */}
            <ScrollReveal direction="scale" delay={150} className="lg:col-span-5 space-y-4">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-orange-500/30 via-amber-500/20 to-indigo-500/30 rounded-3xl blur-xl opacity-75 group-hover:opacity-100 transition duration-500" />

                <Tilt3DCard
                  maxTilt={4}
                  spotlightColor="rgba(251, 146, 60, 0.22)"
                  className="bg-zinc-900/95 backdrop-blur-2xl rounded-3xl p-6 sm:p-7 text-white border border-zinc-800 shadow-2xl space-y-6"
                >
                  {/* Mini Platform Workspace Preview */}
                  <div>
                    <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center">
                          <FolderKanban className="w-4 h-4" />
                        </div>
                        <div>
                          <h2 className="text-sm font-bold text-white leading-tight">Central Platform Console</h2>
                          <p className="text-[11px] text-zinc-400">ครบทุกโมดูลในแดชบอร์ดของแต่ละ Project</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        LIVE SAAS
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 mt-4">
                      {[
                        { label: 'ใบงานแจ้งซ่อม', sub: 'รับเรื่อง & อัปเดตสถานะ', icon: Activity, color: 'text-orange-400' },
                        { label: 'ประวัติแชทกลาง', sub: 'ซิงค์จาก Chatbot / LINE', icon: MessagesSquare, color: 'text-indigo-400' },
                        { label: 'โซนจัดการช่าง', sub: 'Add ช่าง & Assign งาน', icon: Users, color: 'text-emerald-400' },
                        { label: 'ประเมินความพึงพอใจ', sub: 'CSAT & รีวิวลูกค้า', icon: Star, color: 'text-amber-400' },
                      ].map((mod) => {
                        const Icon = mod.icon
                        return (
                          <div
                            key={mod.label}
                            className="p-3 rounded-2xl bg-zinc-950/90 border border-zinc-800/90 flex items-start gap-2.5"
                          >
                            <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${mod.color}`} />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">{mod.label}</p>
                              <p className="text-[10px] text-zinc-400 truncate">{mod.sub}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Quick Live Ticket Tracker */}
                  <div className="pt-4 border-t border-zinc-800">
                    <p className="text-xs font-bold text-zinc-200 mb-2.5 flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-orange-400" />
                      <span>ทดลองค้นหาสถานะใบงานซ่อม & ประเมินความพึงพอใจ</span>
                    </p>
                    <form onSubmit={handleQuickTrack} className="flex gap-2">
                      <input
                        type="text"
                        value={quickCode}
                        onChange={(e) => setQuickCode(e.target.value)}
                        placeholder={`เช่น ${SAMPLE_TRACKING_CODES[0]}`}
                        className="flex-1 px-3.5 py-2.5 text-xs font-mono tracking-wider uppercase bg-zinc-950 border border-zinc-700/80 text-white placeholder:text-zinc-600 rounded-xl focus:ring-2 focus:ring-orange-500 outline-hidden transition"
                        required
                      />
                      <button
                        type="submit"
                        className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-950 bg-orange-400 hover:bg-orange-300 transition cursor-pointer shrink-0"
                      >
                        ติดตาม
                      </button>
                    </form>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-zinc-500">รหัสตัวอย่าง:</span>
                      {SAMPLE_TRACKING_CODES.map((sample) => (
                        <button
                          key={sample}
                          type="button"
                          onClick={() => navigate(`/track/${sample}`)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-950 hover:bg-orange-500/20 text-zinc-300 hover:text-orange-300 border border-zinc-800 text-[11px] font-mono transition cursor-pointer"
                        >
                          <span>{sample}</span>
                          <ArrowUpRight className="w-3 h-3 text-orange-400" />
                        </button>
                      ))}
                    </div>
                  </div>
                </Tilt3DCard>
              </div>
            </ScrollReveal>
          </div>
        </div>

        {/* Ecosystem Marquee */}
        <div className="mt-16 pt-8 border-t border-zinc-900 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 mb-3 flex items-center justify-between text-[11px] font-mono text-zinc-500 uppercase tracking-widest">
            <span>PLASOM CENTRAL PLATFORM CAPABILITIES</span>
            <span>BUILT FOR SERVICE BUSINESSES</span>
          </div>
          <div className="relative flex overflow-x-hidden">
            <div className="flex shrink-0 animate-marquee hover-pause whitespace-nowrap py-2">
              {[...PLATFORM_ECOSYSTEM, ...PLATFORM_ECOSYSTEM].map((item, idx) => (
                <span
                  key={idx}
                  className="mr-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/80 border border-zinc-800/90 text-xs font-mono font-bold text-zinc-300 hover:text-orange-400 hover:border-orange-500/40 transition-colors cursor-default"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================================
          2. 4 CORE PLATFORM PILLARS
      ============================================================================ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <ScrollReveal className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 text-orange-700 border border-orange-500/20 text-xs font-bold">
            <Zap className="w-3.5 h-3.5 text-orange-600" />
            <span>PLATFORM ARCHITECTURE</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-950 tracking-tight">
            ครบทุกเครื่องมือสำหรับผู้ประกอบการยุค AI
          </h2>
          <p className="text-zinc-500 text-sm">
            ออกแบบให้เป็นแพลตฟอร์มกลางที่ใครๆ ก็เข้ามาเปิดใช้งานได้ทันที ไม่ต้องพัฒนาซ้ำทีละเจ้า
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PLATFORM_PILLARS.map((pillar, idx) => {
            const Icon = pillar.icon
            const colorStyles: Record<string, string> = {
              orange: 'bg-orange-50 border-orange-100 text-orange-600',
              indigo: 'bg-indigo-50 border-indigo-100 text-indigo-600',
              emerald: 'bg-emerald-50 border-emerald-100 text-emerald-600',
              amber: 'bg-amber-50 border-amber-100 text-amber-600',
            }
            return (
              <ScrollReveal key={pillar.title} delay={idx * 70}>
                <Tilt3DCard
                  maxTilt={3}
                  className="bg-white rounded-3xl border border-zinc-200/90 shadow-xs hover:shadow-xl hover:border-zinc-300 p-7 h-full flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div
                        className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${
                          colorStyles[pillar.accent]
                        }`}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-600 font-mono text-[10px] font-bold">
                        {pillar.badge}
                      </span>
                    </div>
                    <h3 className="text-xl font-extrabold text-zinc-950">{pillar.title}</h3>
                    <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">{pillar.desc}</p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-400">พร้อมใช้งานในทุก Project</span>
                    <Link
                      to={user ? '/projects' : '/login?mode=register'}
                      className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700"
                    >
                      <span>เปิดใช้งาน</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </Tilt3DCard>
              </ScrollReveal>
            )
          })}
        </div>
      </section>

      {/* ============================================================================
          3. HOW IT WORKS (3 STEPS TO LAUNCH YOUR PROJECT)
      ============================================================================ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="bg-zinc-950 text-white rounded-3xl p-8 sm:p-12 border border-zinc-800 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-orange-500/15 blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/25 text-xs font-mono font-bold mb-3">
                  QUICK ONBOARDING
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  เริ่มต้นใช้งานแพลตฟอร์มใน 3 ขั้นตอน
                </h2>
              </div>
              <Link
                to={user ? '/projects' : '/login?mode=register'}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-orange-400 hover:bg-orange-300 text-zinc-950 text-xs font-extrabold transition self-start md:self-auto"
              >
                <span>{user ? 'ไปที่หน้าโปรเจกต์' : 'สร้างบัญชีผู้ประกอบการ'}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {HOW_IT_WORKS.map((item) => {
                const Icon = item.icon
                return (
                  <div
                    key={item.step}
                    className="p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-2xl font-black text-orange-400">{item.step}</span>
                      <div className="w-10 h-10 rounded-xl bg-zinc-800 text-zinc-200 flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                    </div>
                    <h3 className="text-base font-extrabold text-white">{item.title}</h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">{item.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ============================================================================
          4. 3 AI PRODUCTS LIVE INTERACTIVE SHOWCASE (Chatbot / Voicebot / 3D Avatar)
      ============================================================================ */}
      <section id="ai-showcase" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 scroll-mt-24">
        <div className="space-y-8">
          <ScrollReveal className="text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 text-orange-700 border border-orange-500/20 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-orange-600" />
              <span>OMNICHANNEL AI PRODUCTS</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-950 tracking-tight">
              ทดลอง 3 โซลูชัน AI ที่เชื่อมต่อเข้าสู่แพลตฟอร์มได้ทันที
            </h2>
            <p className="text-zinc-500 text-sm">
              ทุก Project รองรับการเชื่อมต่อกับ Chatbot, Voicebot และ 3D AI Avatar เพื่อรับแจ้งซ่อมและส่งประวัติแชทเข้าแดชบอร์ดอัตโนมัติ
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Chatbot */}
            <ScrollReveal delay={50}>
              <Tilt3DCard
                spotlightColor="rgba(249, 115, 22, 0.14)"
                className="bg-white rounded-3xl border border-zinc-200/90 shadow-xs hover:shadow-xl hover:border-orange-300 p-7 h-full flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-extrabold text-zinc-950">AI Chatbot</h3>
                        <p className="text-xs font-semibold text-orange-600">Web Chat & LINE OA</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-[10px] font-bold">
                      ↙ มุมซ้ายล่าง
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    รับแจ้งซ่อม ตอบคำถามราคา และเปิดใบงานอัตโนมัติผ่าน Webhook พร้อมส่งประวัติแชทเข้าศูนย์รวมในแดชบอร์ดของ Project
                  </p>
                </div>
                <button
                  type="button"
                  onClick={triggerOpenChatbot}
                  className="mt-6 w-full py-3 px-4 rounded-2xl bg-orange-50 hover:bg-orange-500 text-orange-700 hover:text-white border border-orange-200 hover:border-orange-500 flex items-center justify-between text-xs font-extrabold transition-all cursor-pointer"
                >
                  <span>↙️ ทดลองเปิดแชทบอท (ซ้ายล่าง)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Tilt3DCard>
            </ScrollReveal>

            {/* Voicebot */}
            <ScrollReveal delay={150}>
              <Tilt3DCard
                spotlightColor="rgba(99, 102, 241, 0.18)"
                className="bg-zinc-950 text-white rounded-3xl border border-zinc-800 shadow-xl p-7 h-full flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
                        <Mic className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-extrabold text-white">AI Voicebot</h3>
                        <p className="text-xs font-semibold text-indigo-400">สายด่วนเสียง 24/7</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold">
                      ↓ ทดลองโทรด้านล่าง
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    รับสายลูกค้าด้วยเสียงภาษาไทยธรรมชาติ สรุปอาการ นัดวันเวลา และออกรหัสติดตามส่งเข้าแดชบอร์ดของร้านทันที
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => document.getElementById('ai-usage-examples')?.scrollIntoView({ behavior: 'smooth' })}
                  className="mt-6 w-full py-3 px-4 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white flex items-center justify-between text-xs font-extrabold shadow-lg shadow-indigo-500/25 transition-all cursor-pointer"
                >
                  <span>📞 ไปที่ตู้สายด่วน Voicebot</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Tilt3DCard>
            </ScrollReveal>

            {/* 3D AI Avatar */}
            <ScrollReveal delay={250}>
              <Tilt3DCard
                spotlightColor="rgba(168, 85, 247, 0.14)"
                className="bg-white rounded-3xl border border-zinc-200/90 shadow-xs hover:shadow-xl hover:border-purple-300 p-7 h-full flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                        <Bot className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-extrabold text-zinc-950">3D AI Avatar</h3>
                        <p className="text-xs font-semibold text-purple-600">ผู้ช่วยโต้ตอบและนำทาง</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
                      ↘ มุมขวาล่าง
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    ตัวละคร 3D พูดคุยโต้ตอบแบบเรียลไทม์ ช่วยแนะนำบริการและนำทางลูกค้าไปยังหน้าจองคิวหรือหน้าติดตามงานได้อัตโนมัติ
                  </p>
                </div>
                <button
                  type="button"
                  onClick={triggerHighlightAvatar}
                  className="mt-6 w-full py-3 px-4 rounded-2xl bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white border border-purple-200 hover:border-purple-600 flex items-center justify-between text-xs font-extrabold transition-all cursor-pointer"
                >
                  <span>↘️ ชี้เป้าน้อง 3D Avatar (ขวาล่าง)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Tilt3DCard>
            </ScrollReveal>
          </div>
        </div>

        {/* Live Voicebot Interactive Console */}
        <div id="ai-usage-examples" className="scroll-mt-24 space-y-5">
          <ScrollReveal className="bg-zinc-950 text-white rounded-3xl p-6 sm:p-10 border border-zinc-800 shadow-2xl space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-6 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
                  <VcPhoneIcon className="w-3.5 h-3.5" />
                  <span>LIVE AI VOICEBOT DEMO</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  ทดลองสายด่วนเสียง AI รับแจ้งซ่อมอัตโนมัติ
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  กดโทรคุยสดเพื่อสัมผัสการทำงานจริงของ AI Voicebot น้องปลาส้มจะซักถามอาการ ที่อยู่ นัดหมาย
                  และออก <strong>รหัสใบงาน (Tracking ID)</strong> ส่งเข้าแดชบอร์ดทันที
                </p>

                <div className="grid grid-cols-3 gap-2 pt-2 text-[11px]">
                  <div
                    className={`p-2.5 rounded-xl border ${
                      voiceStep >= 1
                        ? 'bg-indigo-500/20 border-indigo-400 text-white font-bold'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                    }`}
                  >
                    1. รับเรื่อง & อาการ
                  </div>
                  <div
                    className={`p-2.5 rounded-xl border ${
                      voiceStep >= 2
                        ? 'bg-indigo-500/20 border-indigo-400 text-white font-bold'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                    }`}
                  >
                    2. ที่อยู่ & เบอร์ติดต่อ
                  </div>
                  <div
                    className={`p-2.5 rounded-xl border ${
                      voiceStep >= 3
                        ? 'bg-indigo-500/20 border-indigo-400 text-white font-bold'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                    }`}
                  >
                    3. ยืนยัน & ออกรหัส
                  </div>
                </div>

                {createdVoiceCode && (
                  <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">✅ รหัสใบงาน:</span>
                      <span className="font-mono font-bold text-sm text-white bg-zinc-900 px-2.5 py-1 rounded-lg border border-emerald-500/40 select-all">
                        {createdVoiceCode}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyVoiceCode(createdVoiceCode)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-[11px] inline-flex items-center gap-1.5 cursor-pointer transition"
                      >
                        {copiedCode ? (
                          <VcCheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <VcCopyIcon className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedCode ? 'คัดลอกแล้ว!' : 'คัดลอกรหัส'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/track/${createdVoiceCode}`)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 text-zinc-950 font-bold text-[11px] hover:bg-emerald-400 cursor-pointer transition"
                      >
                        ดูสถานะเคส
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="md:col-span-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center space-y-4">
                <div className="flex items-center justify-between text-[11px] font-mono px-1">
                  <span className="text-zinc-400">AGENT: PLASOM (BOW V2)</span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold ${
                      voiceCallStatus === 'connected'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : voiceCallStatus === 'connecting'
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        voiceCallStatus === 'connected'
                          ? 'bg-emerald-400 animate-ping'
                          : voiceCallStatus === 'connecting'
                          ? 'bg-amber-400 animate-pulse'
                          : 'bg-zinc-500'
                      }`}
                    />
                    {voiceCallStatus === 'connected'
                      ? isPlayingVoice
                        ? 'PLASOM SPEAKING'
                        : 'LISTENING TO YOU'
                      : voiceCallStatus === 'connecting'
                      ? 'CONNECTING...'
                      : 'HOTLINE READY'}
                  </span>
                </div>

                <div className="flex items-center justify-center gap-1.5 h-12">
                  {[35, 75, 45, 95, 60, 100, 50, 85, 30, 90, 55, 80, 40, 70].map((h, i) => (
                    <span
                      key={i}
                      className={`w-1.5 rounded-full transition-all duration-300 ${
                        isPlayingVoice
                          ? 'bg-indigo-400 animate-pulse'
                          : voiceCallStatus === 'connected'
                          ? 'bg-emerald-400 animate-pulse'
                          : 'bg-indigo-400 opacity-30'
                      }`}
                      style={{
                        height: isPlayingVoice
                          ? `${h}%`
                          : voiceCallStatus === 'connected'
                          ? `${Math.max(25, Math.round(h * 0.45))}%`
                          : '25%',
                      }}
                    />
                  ))}
                </div>

                <div className="text-left space-y-2 bg-zinc-950/90 p-3.5 rounded-xl border border-zinc-800 text-xs min-h-[84px]">
                  <p className="text-indigo-300 font-medium leading-relaxed select-text">
                    🔊 <strong>น้องปลาส้ม:</strong> &ldquo;{voiceBotText}&rdquo;
                  </p>
                  {voiceUserText && (
                    <p className="text-emerald-300 font-mono text-[11px] pt-1.5 border-t border-zinc-800/80">
                      🎙️ <strong>คุณลูกค้า:</strong> &ldquo;{voiceUserText}&rdquo;
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={toggleRealtimeVoiceCall}
                    disabled={voiceCallStatus === 'connecting'}
                    className={`px-6 py-3.5 rounded-xl font-extrabold text-xs inline-flex items-center gap-2 transition shadow-lg cursor-pointer ${
                      voiceCallStatus === 'connected'
                        ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/25'
                        : voiceCallStatus === 'connecting'
                        ? 'bg-zinc-700 text-zinc-300 cursor-wait'
                        : 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-indigo-500/25'
                    }`}
                  >
                    {voiceCallStatus === 'connected' ? (
                      <>
                        <VcHangupIcon className="w-4 h-4" />
                        <span>วางสายสนทนา</span>
                      </>
                    ) : (
                      <>
                        {isPlayingVoice ? <VcVolumeIcon className="w-4 h-4" /> : <VcPhoneIcon className="w-4 h-4" />}
                        <span>
                          {voiceCallStatus === 'connecting'
                            ? 'กำลังต่อสาย...'
                            : 'กดโทรคุยนัดช่างกับน้องปลาส้ม (Live)'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>

        {/* Spotlight Callouts */}
        {spotlightTarget === 'chat' && (
          <div
            style={{ position: 'fixed', bottom: '92px', left: '24px', zIndex: 9999 }}
            className="animate-bounce bg-orange-500 text-zinc-950 px-4 py-2.5 rounded-2xl shadow-2xl border-2 border-white font-extrabold text-xs flex items-center gap-2 pointer-events-none"
          >
            <span>👇 กดไอคอนสีส้มตรงนี้เพื่อเริ่มพิมพ์แชทได้เลย!</span>
          </div>
        )}

        {spotlightTarget === 'avatar' && (
          <div
            style={{
              position: 'fixed',
              bottom: avatarCalloutPos.bottom,
              right: avatarCalloutPos.right,
              zIndex: 2147483647,
            }}
            className="animate-bounce bg-gradient-to-r from-purple-600 to-emerald-500 text-white px-4 py-3 rounded-2xl shadow-[0_10px_35px_rgba(168,85,247,0.8)] border-2 border-white font-extrabold text-xs flex items-center gap-2 pointer-events-none max-w-[90vw]"
          >
            <span>
              {avatarCalloutPos.placement === 'left'
                ? '👋 น้อง 3D ยืนอยู่นี่! กดปุ่มกลมสีเขียวข้างตัวน้องเพื่อคุยสดได้เลย 👉'
                : '👋 น้อง 3D ยืนอยู่ข้างล่างนี้! กดปุ่มกลมสีเขียวเพื่อคุยสดได้เลย 👇'}
            </span>
          </div>
        )}
      </section>

      {/* ============================================================================
          5. FAQ & FINAL CTA
      ============================================================================ */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <ScrollReveal className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-200/70 text-zinc-800 text-xs font-bold">
            <HelpCircle className="w-3.5 h-3.5 text-orange-600" />
            <span>FAQ</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
            คำถามที่พบบ่อยเกี่ยวกับแพลตฟอร์ม
          </h2>
        </ScrollReveal>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openFaqIndex === idx
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-zinc-200/90 overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span className="font-bold text-sm text-zinc-900">{item.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform ${
                      isOpen ? 'rotate-180 text-orange-600' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 text-xs sm:text-sm text-zinc-600 leading-relaxed border-t border-zinc-100 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Final SaaS CTA Banner */}
        <ScrollReveal>
          <div className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white rounded-3xl p-8 sm:p-10 border border-zinc-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-400">
                <ShieldCheck className="w-4 h-4" />
                <span>พร้อมยกระดับธุรกิจบริการหลังการขายของคุณหรือยัง?</span>
              </div>
              <h3 className="text-2xl font-extrabold tracking-tight">
                สร้าง Project แรกของคุณได้ฟรีใน 1 นาที
              </h3>
              <p className="text-xs text-zinc-400 max-w-lg">
                รวมศูนย์ใบงานแจ้งซ่อม ทีมช่าง ประวัติแชทจาก Chatbot และแดชบอร์ดความพึงพอใจไว้ในระบบเดียว
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                to={user ? '/projects' : '/login?mode=register'}
                className="btn-shimmer inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-xs font-extrabold text-white shadow-lg shadow-orange-500/25"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{user ? 'เปิด Workspace ของฉัน' : 'เริ่มต้นใช้งานฟรี'}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/book"
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition"
              >
                <span>ทดลองฟอร์มลูกค้า</span>
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </section>
    </div>
  )
}
