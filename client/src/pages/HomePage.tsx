import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Wrench,
  Search,
  CheckCircle2,
  ShieldCheck,
  Award,
  Sparkles,
  ArrowRight,
  CalendarCheck,
  PenTool,
  Wind,
  Zap,
  MessageSquare,
  MapPin,
  ArrowUpRight,
  Activity,
  ChevronDown,
  HelpCircle,
  Sliders,
  Mic,
  Bot,
  PhoneCall,
  Volume2,
  Play,
  User as UserIcon,
  PhoneCall as VcPhoneIcon,
  PhoneOff as VcHangupIcon,
  Volume2 as VcVolumeIcon,
  Copy as VcCopyIcon,
  Check as VcCheckIcon,
} from 'lucide-react'
import { BotnoiVoiceClient, type VoiceCallStatus } from '../lib/botnoiVoiceClient'
import { ScrollReveal, Tilt3DCard, MagneticButton, NumberTicker } from '../components/InteractiveUI'
import { SAMPLE_TRACKING_CODES } from '../lib/constants'


const SUPPORTED_BRANDS = [
  'CARRIER',
  'DAIKIN',
  'MITSUBISHI ELECTRIC',
  'PANASONIC',
  'HAIER',
  'TOSHIBA',
  'LG INVERTER',
  'SAMSUNG',
  'CENTRAL AIR',
  'YORK',
  'TRANE',
]

const FAQ_ITEMS = [
  {
    q: 'ใช้เวลานานแค่ไหนหลังจากกดแจ้งซ่อมบนเว็บไซต์?',
    a: 'เจ้าหน้าที่ศูนย์ควบคุมจะตรวจสอบและระบุช่างเทคนิคในพื้นที่ของคุณภายใน 15–30 นาที พร้อมอัปเดตสถานะแบบเรียลไทม์ผ่านรหัส Tracking Code',
  },
  {
    q: 'การรับประกันงานซ่อม 90 วันครอบคลุมอะไรบ้าง?',
    a: 'ครอบคลุมทั้งค่าแรงช่างและอะไหล่แท้ที่เปลี่ยนใหม่ หากพบอาการเดิมซ้ำภายใน 90 วัน ทีมช่างจะเข้าแก้ไขให้ฟรีโดยไม่มีค่าใช้จ่ายเพิ่มเติม',
  },
  {
    q: 'หากช่างตรวจเช็คแล้วไม่ประสงค์ซ่อม มีค่าใช้จ่ายหรือไม่?',
    a: 'เรามีการแจ้งประเมินราคาก่อนซ่อมทุกครั้ง หากลูกค้ายังไม่สะดวกซ่อม จะมีเพียงค่าบริการตรวจเช็คหน้างานเริ่มต้น 400 บาทเท่านั้น',
  },
  {
    q: 'สามารถเลื่อนนัดหรือพูดคุยกับช่างโดยตรงได้อย่างไร?',
    a: 'คุณสามารถนำรหัส Tracking Code ไปกรอกในหน้า "ติดตามสถานะ" เพื่อพิมพ์แชทสดกับเจ้าหน้าที่ หรือกดปุ่มโทรหาช่างผู้รับผิดชอบได้ทันที',
  },
]

export const HomePage: React.FC = () => {
  const [quickCode, setQuickCode] = useState('')
  // Interactive Price Estimator Tabs & BTU Selector (ของเดิมแคน)
  const [activeCalcTab, setActiveCalcTab] = useState<'CLEANING' | 'REPAIR' | 'INSTALLATION'>('CLEANING')
  const [unitCount, setUnitCount] = useState<number>(1)
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0)

  // Interactive AI Demo Tabs (ตามบรีฟพี่โมโน: Chatbot / Voicebot / AI Avatar)
  const [activeAiTab, setActiveAiTab] = useState<'chatbot' | 'voicebot' | 'avatar'>('chatbot')
  const [isPlayingVoice, setIsPlayingVoice] = useState(false)

  // ============================================================================
  // State สำหรับระบบ Voicebot & AI Avatar ใช้งานจริง (Web Speech API + Webhook)
  // ============================================================================
  const [voiceCallStatus, setVoiceCallStatus] = useState<VoiceCallStatus>('idle')
  const [copiedCode, setCopiedCode] = useState(false)
  const [voiceStep, setVoiceStep] = useState<number>(0)
  const [voiceBotText, setVoiceBotText] = useState(
    'กดปุ่ม "โทรคุยนัดช่างกับน้องปลาส้ม" เพื่อเปิดสายสนทนาสดแบบโต้ตอบอัตโนมัติ (พูดคุยต่อเนื่องได้เหมือนคุยโทรศัพท์จริง ไม่ต้องคอยกดปุ่มไมค์ซ้ำค่ะ)'
  )
  const [voiceUserText, setVoiceUserText] = useState('')
  const [createdVoiceCode, setCreatedVoiceCode] = useState<string | null>(null)
  const [isSubmittingVoice, setIsSubmittingVoice] = useState(false)
  const voiceClientRef = useRef<BotnoiVoiceClient | null>(null)

  // State สำหรับ AI Avatar
  const [isAvatarSpeaking, setIsAvatarSpeaking] = useState(false)
  const [isAvatarListening, setIsAvatarListening] = useState(false)
  const [avatarSubtitle, setAvatarSubtitle] = useState(
    'สวัสดีค่ะ! ดิฉันปลาส้ม AI Specialist กดเลือกหัวข้อด้านซ้าย หรือกดปุ่มไมค์เพื่อพูดคุยกับดิฉันได้เลยนะคะ'
  )
  const recognitionRef = useRef<any>(null)

  const navigate = useNavigate()


  // State สำหรับยิงแสงชี้เป้า (Spotlight Beacon) ไปที่มุมซ้ายล่าง (Chat) หรือมุมขวาล่าง (Avatar)
  const [spotlightTarget, setSpotlightTarget] = useState<'chat' | 'avatar' | null>(null)

  // สั่งเปิดหน้าต่าง Chatbot มุมซ้ายล่างทันที + ยิงไฟชี้เป้าสีส้ม
  const triggerOpenChatbot = () => {
    setSpotlightTarget('chat')
    setTimeout(() => setSpotlightTarget((prev) => (prev === 'chat' ? null : prev)), 4500)

    const win = window as any
    if (win.BN?.openChat) {
      win.BN.openChat()
      return
    }
    // ค้นหาปุ่มไอคอนแชทของ Botnoi มุมซ้ายล่างแล้วคลิกเปิดหน้าต่างแชทให้ทันที
    const bnRoot = document.getElementById('bn-root')
    const chatClickable =
      (bnRoot?.querySelector('button, [role="button"], img, div[style*="cursor: pointer"]') as HTMLElement | null) ||
      (document.querySelector('.bn-customerchat button, [id^="bn-"] button') as HTMLElement | null)
    chatClickable?.click()
  }

    const [avatarCalloutPos, setAvatarCalloutPos] = useState<{
    bottom: string
    right: string
    placement: 'left' | 'top'
  }>({ bottom: '28px', right: '330px', placement: 'left' })

  // วัดขนาดกล่องจริงของ 3D Avatar บนจอ แล้ววางป้ายเว้นระยะออกมานอกตัวน้อง ไม่ทับตัวน้อง 100%
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


  // รับคำสั่งเปลี่ยนหน้าเว็บอัตโนมัติจาก 3D WebAvatar แบบไม่รีโหลดหน้าใหม่
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
        // ข้ามกรณีลิงก์รูปแบบไม่ถูกต้อง
      }
    }

    window.addEventListener('webavatar-navigate', handleAvatarNavigate)
    return () => {
      window.removeEventListener('webavatar-navigate', handleAvatarNavigate)
    }
  }, [navigate])


  const stopBotSpeaking = () => {
    const existingAudio = (window as any).__currentTtsAudio as HTMLAudioElement | undefined
    if (existingAudio) {
      existingAudio.pause()
      existingAudio.currentTime = 0
    }
    window.speechSynthesis?.cancel()
    setIsPlayingVoice(false)
    setIsAvatarSpeaking(false)
  }

  const speakThai = (text: string, mode: 'voicebot' | 'avatar', onEndCallback?: () => void) => {
    if (typeof window === 'undefined') {
      onEndCallback?.()
      return
    }

    stopBotSpeaking()

    if (mode === 'voicebot') {
      setVoiceBotText(text)
      setIsPlayingVoice(true)
    } else {
      setAvatarSubtitle(text)
      setIsAvatarSpeaking(true)
    }

    const finish = () => {
      if (mode === 'voicebot') setIsPlayingVoice(false)
      if (mode === 'avatar') setIsAvatarSpeaking(false)
      onEndCallback?.()
    }

    const cleanText = text.replace(/["“”]/g, '').trim().slice(0, 190)
    const audio = new Audio(`/api/tickets/tts?text=${encodeURIComponent(cleanText)}`)
    audio.playbackRate = 1.25
      ; (window as any).__currentTtsAudio = audio

    audio.onended = finish
    audio.onerror = finish
    audio.play().catch(finish)
  }

  // เริ่มโทร / วางสาย Realtime Voicebot (Agent Plasom)
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
        if (status === 'idle') {
          setIsPlayingVoice(false)
        }
      },
      onBotSpeakingChange: (speaking) => {
        setIsPlayingVoice(speaking)
      },
      onBotTranscript: (text) => {
        setVoiceBotText(text)
        if (text.includes('สรุปข้อมูล') || text.includes('วันนัดหมาย') || text.includes('วันที่สะดวก')) {
          setVoiceStep(3)
        } else if (text.includes('ที่อยู่') || text.includes('ยี่ห้อ') || text.includes('อาการ')) {
          setVoiceStep((prev) => Math.max(prev, 2))
        }
      },
      onUserTranscript: (text) => {
        setVoiceUserText(text)
      },
      onTrackingCodeDetected: (code) => {
        setCreatedVoiceCode(code)
        setVoiceStep(4)
      },
      onError: (errMsg) => {
        setVoiceBotText(`⚠️ ${errMsg}`)
      },
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

  // หยุดสายและเสียงเมื่อสลับแท็บหรือออกจากหน้า
  useEffect(() => {
    return () => {
      voiceClientRef.current?.hangup()
      voiceClientRef.current = null
      stopBotSpeaking()
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {
          // ignore
        }
      }
    }
  }, [activeAiTab])

  // เก็บไว้รองรับปุ่มเปิดใบงานด่วนในแท็บ AI Avatar เดิม
  const submitVoiceTicketToDb = async (namePhone: string, infoText: string, dateText: string) => {
    setIsSubmittingVoice(true)
    try {
      const digits = namePhone.replace(/\D/g, '').slice(0, 10)
      const phone = digits.length === 10 ? digits : '0'.repeat(10)
      const cleanName =
        namePhone
          .replace(/[0-9-]/g, '')
          .replace(/ชื่อ|เบอร์|โทร|ครับ|ค่ะ/g, '')
          .trim() || 'ลูกค้าแจ้งผ่าน AI Avatar'

      const res = await fetch('/api/tickets/botnoi-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: cleanName,
          phone,
          info: `AI Avatar | ${infoText} | แจ้งผ่านระบบเสียง`,
          date: dateText,
        }),
      })
      const json = await res.json()
      const code = json?.trackingCode || ''
      if (code) setCreatedVoiceCode(code)
      setVoiceStep(4)
      speakThai(
        `บันทึกข้อมูลเรียบร้อยแล้วค่ะ รหัสติดตามงานซ่อมของคุณคือ ${code} สามารถตรวจสอบสถานะบนหน้าเว็บได้เลยนะคะ ขอบคุณที่ใช้บริการค่ะ`,
        'avatar'
      )
    } catch {
      speakThai('ขออภัยค่ะ ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้งนะคะ', 'avatar')
    } finally {
      setIsSubmittingVoice(false)
    }
  }

  // ไมโครโฟนสำหรับแท็บ AI Avatar เดิม
  const startMicListening = (_mode: 'voicebot' | 'avatar') => {
    stopBotSpeaking()
    const win = window as any

    if (isAvatarListening) {
      if (win.__silenceTimer) clearTimeout(win.__silenceTimer)
      try {
        recognitionRef.current?.stop()
      } catch {
        // ignore
      }
      setIsAvatarListening(false)
      return
    }

    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition
    if (!SpeechRec) return

    if (win.__silenceTimer) clearTimeout(win.__silenceTimer)
    win.__accumulatedSpeech = ''

    const recognition = new SpeechRec()
    recognitionRef.current = recognition
    recognition.lang = 'th-TH'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    const submitAccumulatedSpeech = (finalText: string) => {
      if (win.__silenceTimer) clearTimeout(win.__silenceTimer)
      win.__accumulatedSpeech = ''
      try {
        recognition.stop()
      } catch {
        // ignore
      }
      setIsAvatarListening(false)

      const cleanTranscript = finalText.trim()
      if (!cleanTranscript) return

      setVoiceUserText(cleanTranscript)
      if (
        cleanTranscript.includes('ราคา') ||
        cleanTranscript.includes('เท่าไหร่') ||
        cleanTranscript.includes('ล้าง')
      ) {
        speakThai(
          'บริการล้างแอร์ปลอดเชื้อราคา 590 บาทต่อเครื่อง พิเศษถ้าล้าง 2 เครื่องขึ้นไปเหลือเครื่องละ 500 บาทค่ะ ส่วนตรวจเช็คแอร์เสียเริ่มต้น 400 บาทค่ะ',
          'avatar'
        )
      } else if (
        cleanTranscript.includes('ไม่เย็น') ||
        cleanTranscript.includes('เสีย') ||
        cleanTranscript.includes('น้ำหยด')
      ) {
        speakThai(
          'หากแอร์ไม่เย็นหรือมีน้ำหยด แนะนำให้ลองเช็คแผ่นกรองฝุ่นและตั้งโหมดความเย็นที่รีโมตนะคะ หากยังไม่หาย กดปุ่มเปิดใบงานด่วนให้ช่างเข้าตรวจได้เลยค่ะ',
          'avatar'
        )
      } else if (
        cleanTranscript.includes('ซ่อม') ||
        cleanTranscript.includes('ช่าง') ||
        cleanTranscript.includes('จอง')
      ) {
        void submitVoiceTicketToDb('คุณลูกค้าผ่าน Avatar', cleanTranscript, 'พรุ่งนี้ 10 โมง')
      } else {
        speakThai(
          `คุณลูกค้าพูดว่า ${cleanTranscript} ใช่ไหมคะ หากต้องการให้ดิฉันเปิดใบงานซ่อมแอร์ด่วน สามารถสลับไปแท็บ Voicebot ด้านบนเพื่อคุยสดได้เลยนะคะ`,
          'avatar'
        )
      }
    }

    recognition.onstart = () => {
      setIsAvatarListening(true)
    }

    recognition.onresult = (event: any) => {
      let fullText = ''
      for (let i = 0; i < event.results.length; i++) {
        fullText += event.results[i][0].transcript + ' '
      }
      const cleanFullText = fullText.trim()
      if (cleanFullText) {
        win.__accumulatedSpeech = cleanFullText
        if (win.__silenceTimer) clearTimeout(win.__silenceTimer)
        win.__silenceTimer = setTimeout(() => {
          submitAccumulatedSpeech(cleanFullText)
        }, 2500)
      }
    }

    recognition.onerror = () => {
      if (!win.__accumulatedSpeech) setIsAvatarListening(false)
    }

    recognition.onend = () => {
      const remaining = String(win.__accumulatedSpeech || '').trim()
      if (remaining) {
        submitAccumulatedSpeech(remaining)
      } else {
        setIsAvatarListening(false)
      }
    }

    try {
      recognition.start()
    } catch {
      setIsAvatarListening(false)
    }
  }

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


  const handleQuickTrack = (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickCode.trim()) return
    navigate(`/track/${encodeURIComponent(quickCode.trim().toUpperCase())}`)
  }

  const basePrice = activeCalcTab === 'CLEANING' ? 590 : activeCalcTab === 'REPAIR' ? 400 : 2500
  const estimatedTotal =
    activeCalcTab === 'CLEANING' && unitCount >= 2
      ? unitCount * 500 // multi-unit discount
      : unitCount * basePrice

  useEffect(() => {
    if (window.location.hash === '#ai-showcase') {
      setTimeout(() => {
        const el = document.getElementById('ai-showcase')
        el?.scrollIntoView({ behavior: 'smooth' })
      }, 150)
    }
  }, [])

  return (
    <div className="space-y-24 pb-24 overflow-x-hidden">
      {/* ============================================================================
          1. HERO BANNER: โครงเดิมแคน + แสดง 3 AI Products ต้อนรับตามบรีฟพี่โมโน
      ============================================================================ */}
      <section className="relative bg-zinc-950 text-white overflow-hidden pt-14 pb-20 sm:py-24 border-b border-zinc-800">
        <div className="absolute inset-0 bg-grid-dark opacity-70 pointer-events-none" />
        <div className="absolute -top-40 left-1/4 w-[500px] h-[500px] rounded-full bg-orange-500/20 blur-[130px] pointer-events-none animate-pulse-slow" />
        <div className="absolute bottom-0 right-1/4 w-[450px] h-[450px] rounded-full bg-amber-600/20 blur-[130px] pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-950/30 to-zinc-950 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
            {/* Left Hero Content (7 cols) */}
            <ScrollReveal direction="up" className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 pl-2 pr-3.5 py-1 rounded-full bg-zinc-900/90 border border-zinc-800 text-zinc-200 text-xs font-medium shadow-lg backdrop-blur-md hover:border-orange-500/50 transition-colors cursor-default">
                <span className="px-2 py-0.5 rounded-full bg-orange-500 text-zinc-950 font-bold text-[10px] uppercase tracking-wider">
                  AI After-Sales Service
                </span>
                <span className="text-zinc-300">ระบบแจ้งซ่อมแอร์อัจฉริยะ มาตรฐาน Carrier Style</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-orange-400" />
              </div>

              <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.12] text-white">
                ดูแลเครื่องปรับอากาศ <br />
                ด้วยทีมช่าง &{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-amber-400">
                  AI Service 24/7
                </span>
              </h1>

              <p className="text-zinc-400 text-base sm:text-lg max-w-2xl leading-relaxed font-normal">
                บริการล้าง ซ่อม และติดตั้งแอร์ครบวงจร พร้อมแพลตฟอร์ม AI บริการหลังการขายครบทั้ง{' '}
                <strong className="text-zinc-200">3 Products (ข้อความ, เสียง และ AI Avatar)</strong>{' '}
                ช่วยรับแจ้งซ่อม ตอบคำถาม และติดตามสถานะกับทีมช่างแบบ Real-time
              </p>

              {/* แถบแสดง 3 AI Products บน Banner ต้อนรับ (ตามบรีฟพี่โมโน) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveAiTab('chatbot')
                    document.getElementById('ai-usage-examples')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800 hover:border-orange-500/50 text-left transition-all group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white flex items-center gap-1">
                      <span>1. Chatbot</span>
                    </p>
                    <p className="text-[11px] text-zinc-400">คุยแบบข้อความ / แจ้งซ่อม</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveAiTab('voicebot')
                    document.getElementById('ai-usage-examples')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 text-left transition-all group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Mic className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white flex items-center gap-1">
                      <span>2. Voicebot</span>
                    </p>
                    <p className="text-[11px] text-zinc-400">คุยผ่านเสียงเป็นธรรมชาติ</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveAiTab('avatar')
                    document.getElementById('ai-usage-examples')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800 hover:border-purple-500/50 text-left transition-all group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white flex items-center gap-1">
                      <span>3. AI Avatar</span>
                    </p>
                    <p className="text-[11px] text-zinc-400">ตัวละครพูดคุยบนหน้าจอ</p>
                  </div>
                </button>
              </div>

              {/* Magnetic & Ripple CTA Buttons */}
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <MagneticButton
                  type="button"
                  onClick={() => navigate('/book')}
                  className="btn-shimmer px-7 py-4 rounded-2xl font-bold text-sm text-white shadow-xl shadow-orange-500/20 hover:shadow-orange-500/40"
                >
                  <Wrench className="w-4 h-4" />
                  <span>แจ้งซ่อม / นัดหมายทันที</span>
                  <ArrowRight className="w-4 h-4" />
                </MagneticButton>

                <a
                  href="#ai-usage-examples"
                  className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl font-semibold text-sm bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 hover:border-zinc-700 transition-all"
                >
                  <Sparkles className="w-4 h-4 text-orange-400" />
                  <span>ดูตัวอย่างการใช้งาน AI</span>
                </a>

                <a
                  href="#estimator"
                  className="inline-flex items-center gap-2 px-5 py-4 rounded-2xl font-semibold text-sm text-zinc-400 hover:text-white transition-all"
                >
                  <Sliders className="w-4 h-4 text-orange-400" />
                  <span>คำนวณค่าบริการ</span>
                </a>
              </div>

              {/* Animated NumberTicker Metric Pills */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-zinc-800/80 max-w-lg">
                <div className="bg-zinc-900/50 hover:bg-zinc-900/90 border border-zinc-800/80 hover:border-orange-500/40 rounded-2xl p-3.5 backdrop-blur-xs transition-all duration-300">
                  <div className="flex items-center gap-1.5 text-orange-400 text-xs font-mono mb-0.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>WARRANTY</span>
                  </div>
                  <p className="text-2xl font-black text-white tracking-tight">
                    <NumberTicker value={90} suffix=" วัน" />
                  </p>
                  <p className="text-[11px] text-zinc-400">รับประกันงานซ่อม</p>
                </div>

                <div className="bg-zinc-900/50 hover:bg-zinc-900/90 border border-zinc-800/80 hover:border-emerald-500/40 rounded-2xl p-3.5 backdrop-blur-xs transition-all duration-300">
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-mono mb-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>GENUINE</span>
                  </div>
                  <p className="text-2xl font-black text-white tracking-tight">
                    <NumberTicker value={100} suffix="%" />
                  </p>
                  <p className="text-[11px] text-zinc-400">อะไหล่แท้ตรงรุ่น</p>
                </div>

                <div className="bg-zinc-900/50 hover:bg-zinc-900/90 border border-zinc-800/80 hover:border-amber-500/40 rounded-2xl p-3.5 backdrop-blur-xs transition-all duration-300">
                  <div className="flex items-center gap-1.5 text-amber-400 text-xs font-mono mb-0.5">
                    <Activity className="w-4 h-4" />
                    <span>JOBS DONE</span>
                  </div>
                  <p className="text-2xl font-black text-white tracking-tight">
                    <NumberTicker value={12500} suffix="+" />
                  </p>
                  <p className="text-[11px] text-zinc-400">เคสดูแลสำเร็จ</p>
                </div>
              </div>
            </ScrollReveal>

            {/* Right: 3D Tilt Interactive Live Tracking Command Card (5 cols) */}
            <ScrollReveal direction="scale" delay={150} className="lg:col-span-5">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-orange-500/30 via-amber-500/20 to-amber-400/30 rounded-3xl blur-xl opacity-75 group-hover:opacity-100 transition duration-500" />

                <Tilt3DCard
                  maxTilt={5}
                  spotlightColor="rgba(251, 146, 60, 0.22)"
                  className="bg-zinc-900/90 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 text-white border border-zinc-800 shadow-2xl"
                >
                  <div className="flex items-center justify-between pb-5 mb-6 border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center">
                        <Search className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-white leading-tight">Live Ticket Tracker</h2>
                        <p className="text-xs text-zinc-400">ขยับเมาส์หรือกดรหัสเพื่อทดสอบระบบติดตาม</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      ONLINE
                    </span>
                  </div>

                  <form onSubmit={handleQuickTrack} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-2">
                        หมายเลขติดตามงานซ่อม (Tracking Code)
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={quickCode}
                          onChange={(e) => setQuickCode(e.target.value)}
                          placeholder={`เช่น ${SAMPLE_TRACKING_CODES[0]}`}
                          className="w-full pl-4 pr-12 py-3.5 text-sm font-mono tracking-wider uppercase bg-zinc-950/90 border border-zinc-700/80 text-white placeholder:text-zinc-600 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-hidden transition"
                          required
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                          ID
                        </span>
                      </div>
                    </div>

                    <MagneticButton
                      type="submit"
                      className="w-full py-3.5 px-4 rounded-2xl text-sm font-bold text-zinc-950 bg-orange-400 hover:bg-orange-300 transition shadow-lg shadow-orange-500/20"
                    >
                      <Search className="w-4 h-4" />
                      <span>ค้นหาสถานะงานซ่อม</span>
                    </MagneticButton>
                  </form>

                  <div className="mt-5 pt-5 border-t border-zinc-800/90">
                    <p className="text-[11px] text-zinc-400 mb-2.5 font-medium">
                      คลิกเพื่อทดสอบรหัสตัวอย่างทันที:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {SAMPLE_TRACKING_CODES.map((sample) => (
                        <button
                          key={sample}
                          type="button"
                          onClick={() => navigate(`/track/${sample}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950 hover:bg-orange-500/20 text-zinc-300 hover:text-orange-300 border border-zinc-800 hover:border-orange-500/40 text-xs font-mono transition-all cursor-pointer"
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

        {/* 21st.dev Infinite Marquee Ticker for Supported AC Brands */}
        <div className="mt-16 pt-8 border-t border-zinc-900 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 mb-3 flex items-center justify-between text-[11px] font-mono text-zinc-500 uppercase tracking-widest">
            <span>SUPPORTED AIR CONDITIONING BRANDS</span>
            <span>CERTIFIED PARTS & TOOLS</span>
          </div>
          <div className="relative flex overflow-x-hidden">
            <div className="flex shrink-0 animate-marquee hover-pause whitespace-nowrap py-2">
              {[...SUPPORTED_BRANDS, ...SUPPORTED_BRANDS].map((brand, idx) => (
                <span
                  key={idx}
                  className="mr-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/80 border border-zinc-800/90 text-xs font-mono font-bold text-zinc-300 hover:text-orange-400 hover:border-orange-500/40 transition-colors cursor-default"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  {brand}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================================
          SECTION: 3 AI PRODUCTS & LIVE COMMAND CENTER (พุ่งเปิดแชทซ้าย / โทรกลาง / ชี้เป้า Avatar ขวา)
      ============================================================================ */}
      <section id="ai-showcase" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 scroll-mt-24">
        {/* ส่วนที่ 1: การ์ด 3 โซลูชัน AI (กดปุ๊บพุ่งไปเปิดใช้งานของจริงแต่ละตัวทันที!) */}
        <div className="space-y-8">
          <ScrollReveal className="text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 text-orange-700 border border-orange-500/20 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-orange-600" />
              <span>AFTERCARE AI PRODUCTS</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-950 tracking-tight">
              3 โซลูชัน AI ผู้ช่วยดูแลงานซ่อมแอร์
            </h2>
            <p className="text-zinc-500 text-sm">
              เลือกสัมผัสประสบการณ์จริงได้ทั้ง 3 รูปแบบ: แชทบอทมุมซ้ายล่าง, สายด่วนเสียงตรงกลาง และผู้ช่วย 3D มุมขวาล่าง
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Product 1: Chatbot -> กดปุ๊บเด้งเปิดแชทมุมซ้ายล่างทันที */}
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
                        <h3 className="text-lg font-extrabold text-zinc-950">Chatbot</h3>
                        <p className="text-xs font-semibold text-orange-600">พิมพ์คุยแบบข้อความ</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-[10px] font-bold">
                      ↙ มุมซ้ายล่าง
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    เหมาะสำหรับวันชิลๆ ที่ไม่สะดวกเปิดไมค์ พิมพ์ถามราคา แจ้งซ่อมแอร์ นัดคิวช่าง และเช็คสถานะผ่านกล่องแชทอัตโนมัติได้ทันที
                  </p>
                </div>
                <button
                  type="button"
                  onClick={triggerOpenChatbot}
                  className="mt-6 w-full py-3 px-4 rounded-2xl bg-orange-50 hover:bg-orange-500 text-orange-700 hover:text-white border border-orange-200 hover:border-orange-500 flex items-center justify-between text-xs font-extrabold transition-all cursor-pointer"
                >
                  <span>↙️ เปิดกล่องแชทคุยเลย (ซ้ายล่าง)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Tilt3DCard>
            </ScrollReveal>

            {/* Product 2: Voicebot -> กดปุ๊บเลื่อนลงมาตู้สายด่วนด้านล่างทันที */}
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
                        <h3 className="text-lg font-extrabold text-white">Voicebot</h3>
                        <p className="text-xs font-semibold text-indigo-400">สายด่วนโทรแจ้งซ่อม 24/7</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold">
                      ↓ ตู้สายด่วนด้านล่าง
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    ขี้เกียจพิมพ์ยาวๆ? กดโทรคุยสายสดกับน้องปลาส้ม AI เสียงภาษาไทยธรรมชาติ รับเรื่องสรุปคิวและออกรหัสใบงานเข้า Admin ทันที
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    document.getElementById('ai-usage-examples')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="mt-6 w-full py-3 px-4 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white flex items-center justify-between text-xs font-extrabold shadow-lg shadow-indigo-500/25 transition-all cursor-pointer"
                >
                  <span>📞 ไปที่ตู้สายด่วนโทรแจ้งซ่อม</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Tilt3DCard>
            </ScrollReveal>

            {/* Product 3: AI Avatar -> กดปุ๊บยิง Spotlight Beacon ชี้ไปหาน้อง 3D มุมขวาล่าง */}
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
                        <h3 className="text-lg font-extrabold text-zinc-950">AI Avatar</h3>
                        <p className="text-xs font-semibold text-purple-600">ผู้ช่วย 3D พูดคุย & นำทางเว็บ</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
                      ↘ มุมขวาล่าง
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    ตัวละคร 3D ยืนต้อนรับมุมขวาล่าง พูดคุยโต้ตอบเห็นท่าทางสดใส และสั่งให้น้องพาเปิดหน้าจองคิวหรือหน้าเช็คสถานะให้อัตโนมัติได้!
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

        {/* ส่วนที่ 2: ตู้สายด่วน Voicebot สด + การ์ดปุ่มลัดเรียก Chatbot / Avatar แบบโดดเด่นชัดเจน */}
        <div id="ai-usage-examples" className="scroll-mt-24 space-y-5">
          <ScrollReveal className="bg-zinc-950 text-white rounded-3xl p-6 sm:p-10 border border-zinc-800 shadow-2xl space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-6 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
                  <VcPhoneIcon className="w-3.5 h-3.5" />
                  <span>LIVE AI CALL CENTER (VOICEBOT)</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  สายด่วนโทรแจ้งซ่อมกับน้องปลาส้ม
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  ไม่ต้องกรอกฟอร์มเอง! กดโทรออกแล้วบอกอาการแอร์หรือคอมพิวเตอร์ด้วยเสียงพูดตามธรรมชาติ น้องปลาส้มจะทวนสรุปคิวและออก <strong>รหัสใบงาน (Tracking ID)</strong> ส่งตรงให้ทีมช่างทันที
                </p>

                <div className="grid grid-cols-3 gap-2 pt-2 text-[11px]">
                  <div
                    className={`p-2.5 rounded-xl border ${voiceStep >= 1
                        ? 'bg-indigo-500/20 border-indigo-400 text-white font-bold'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                      }`}
                  >
                    1. รับเรื่อง & อาการ
                  </div>
                  <div
                    className={`p-2.5 rounded-xl border ${voiceStep >= 2
                        ? 'bg-indigo-500/20 border-indigo-400 text-white font-bold'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                      }`}
                  >
                    2. ที่อยู่ & เบอร์ติดต่อ
                  </div>
                  <div
                    className={`p-2.5 rounded-xl border ${voiceStep >= 3
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
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold ${voiceCallStatus === 'connected'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : voiceCallStatus === 'connecting'
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${voiceCallStatus === 'connected'
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
                      className={`w-1.5 rounded-full transition-all duration-300 ${isPlayingVoice
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
                    disabled={voiceCallStatus === 'connecting' || isSubmittingVoice}
                    className={`px-6 py-3.5 rounded-xl font-extrabold text-xs inline-flex items-center gap-2 transition shadow-lg cursor-pointer ${voiceCallStatus === 'connected'
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

            {/* แถบปุ่มกด Interactive 2 ฝั่ง (มีปุ่มกดเด้งใช้งานได้จริง ชัดเจน ไม่จืด!) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-zinc-800/90">
              {/* ปุ่มฝั่งซ้าย: สั่งเปิดกล่องแชทซ้ายล่างทันที */}
              <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-orange-500/50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-orange-400">
                      TEXT CHATBOT • มุมซ้ายล่าง
                    </span>
                    <h4 className="text-sm font-extrabold text-white mt-0.5">ชอบพิมพ์คุยเงียบๆ แบบแชทข้อความ?</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">คลิกเพื่อเด้งเปิดหน้าต่างแชทบอทสีส้มที่มุมซ้ายล่างทันที</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={triggerOpenChatbot}
                  className="shrink-0 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-zinc-950 font-extrabold text-xs inline-flex items-center justify-center gap-1.5 shadow-lg shadow-orange-500/20 transition cursor-pointer"
                >
                  <span>เปิดแชทซ้ายล่าง</span>
                  <ArrowUpRight className="w-3.5 h-3.5 rotate-180" />

                </button>
              </div>

              {/* ปุ่มฝั่งขวา: ยิงป้ายไฟ Spotlight ชี้เป้าน้อง 3D ขวาล่าง */}
              <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-purple-500/50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400">
                      3D DIGITAL HUMAN • มุมขวาล่าง
                    </span>
                    <h4 className="text-sm font-extrabold text-white mt-0.5">อยากคุยกับน้อง 3D และสั่งนำทางหน้าเว็บ?</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">คลิกเพื่อชี้เป้าปุ่มไมค์คุยสดกับน้อง 3D ที่ยืนอยู่มุมขวาล่าง</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={triggerHighlightAvatar}
                  className="shrink-0 px-4 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-extrabold text-xs inline-flex items-center justify-center gap-1.5 shadow-lg shadow-purple-500/25 transition cursor-pointer"
                >
                  <span>ชี้เป้าน้อง 3D ขวาล่าง</span>
                  <ArrowUpRight className="w-3.5 h-3.5 rotate-90" />
                </button>
              </div>
            </div>
          </ScrollReveal>
        </div>

        {/* เอฟเฟกต์ป้ายไฟชี้เป้า (Spotlight Callout) เด้งตรงมุมซ้ายล่างหรือขวาล่างเมื่อผู้ใช้กดเรียก! */}
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
          2. SERVICES SECTION 
      ============================================================================ */}
      <section id="services" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 text-orange-700 border border-orange-500/20 text-xs font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-orange-600" />
              <span>3D INTERACTIVE PACKAGES</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-950 tracking-tight">
              แพ็กเกจบริการมาตรฐานโปร่งใส
            </h2>
          </div>
          <p className="text-zinc-500 text-sm max-w-md">
            ลองเลื่อนเมาส์สำรวจการ์ดบริการแต่ละแบบ หรือกดปุ่มเพื่อเลือกแพ็กเกจและนัดหมายวันเวลาได้ทันที
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
          {/* Card 1: Cleaning */}
          <ScrollReveal delay={50}>
            <Tilt3DCard
              spotlightColor="rgba(249, 115, 22, 0.14)"
              className="bg-white rounded-3xl border border-zinc-200/90 shadow-xs hover:shadow-2xl hover:border-orange-300 p-8 h-full"
            >
              <div className="flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center">
                      <Wind className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/20">
                      ยอดนิยม
                    </span>
                  </div>

                  <h3 className="text-xl font-extrabold text-zinc-950 mb-1.5">ล้างแอร์ระบบปลอดเชื้อ</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed mb-6">
                    ล้างใหญ่ด้วยปั๊มแรงดันสูง ฆ่าเชื้อราและแบคทีเรีย ช่วยให้แอร์เย็นฉ่ำและประหยัดค่าไฟ
                  </p>

                  <div className="flex items-baseline gap-1.5 pb-6 mb-6 border-b border-zinc-100">
                    <span className="text-3xl font-black text-zinc-950 tracking-tight">฿590</span>
                    <span className="text-xs text-zinc-400 font-medium">/ เครื่อง</span>
                  </div>

                  <ul className="space-y-3 text-xs text-zinc-600 mb-8">
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-orange-500 shrink-0" />
                      <span>ฉีดล้างคอยล์เย็นและคอยล์ร้อนด้วยน้ำยาเฉพาะ</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-orange-500 shrink-0" />
                      <span>เป่าไล่ท่อน้ำทิ้ง ป้องกันปัญหาน้ำหยด</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-orange-500 shrink-0" />
                      <span>ตรวจเช็คแรงดันน้ำยาแอร์และกระแสไฟฟรี</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-orange-500 shrink-0" />
                      <span>รับประกันอาการน้ำรั่วซึม 30 วัน</span>
                    </li>
                  </ul>
                </div>

                <Link
                  to="/book?service=CLEANING"
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-xs font-bold text-zinc-900 bg-zinc-100 hover:bg-zinc-950 hover:text-white transition-all"
                >
                  <span>จองบริการล้างแอร์</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </Tilt3DCard>
          </ScrollReveal>

          {/* Card 2: Repair */}
          <ScrollReveal delay={150}>
            <Tilt3DCard
              spotlightColor="rgba(251, 146, 60, 0.22)"
              className="bg-zinc-950 text-white rounded-3xl border border-zinc-800 shadow-2xl p-8 relative h-full"
            >
              <div className="flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-orange-500/20 border border-orange-500/30 text-orange-400 flex items-center justify-center">
                      <Wrench className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-sm">
                      บริการด่วนแนะนำ
                    </span>
                  </div>

                  <h3 className="text-xl font-extrabold text-white mb-1.5">ตรวจเช็คและซ่อมแอร์</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                    แก้ปัญหาแอร์ไม่เย็น มีแต่ลมร้อน น้ำหยด เสียงดัง หรือไฟกระพริบ วิเคราะห์ตรงจุด
                  </p>

                  <div className="flex items-baseline gap-1.5 pb-6 mb-6 border-b border-zinc-800">
                    <span className="text-3xl font-black text-white tracking-tight">฿400</span>
                    <span className="text-xs text-zinc-400 font-medium">(ค่าตรวจเช็คเบื้องต้น)</span>
                  </div>

                  <ul className="space-y-3 text-xs text-zinc-300 mb-8">
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                      <span>วิเคราะห์อาการเสียด้วยเครื่องมือดิจิทัล</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                      <span>เสนอราคาค่าซ่อมชัดเจนก่อนเริ่มงานเสมอ</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                      <span>อะไหล่แท้จากโรงงานผู้ผลิต 100%</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                      <span>รับประกันงานซ่อมและอะไหล่สูงสุด 90 วัน</span>
                    </li>
                  </ul>
                </div>

                <Link
                  to="/book?service=REPAIR"
                  className="btn-shimmer w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-xs font-bold text-white shadow-lg shadow-orange-500/20 transition-all"
                >
                  <span>แจ้งซ่อมแอร์ด่วน</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </Tilt3DCard>
          </ScrollReveal>

          {/* Card 3: Installation */}
          <ScrollReveal delay={250}>
            <Tilt3DCard
              spotlightColor="rgba(99, 102, 241, 0.14)"
              className="bg-white rounded-3xl border border-zinc-200/90 shadow-xs hover:shadow-2xl hover:border-indigo-300 p-8 h-full"
            >
              <div className="flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                      <PenTool className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-700">
                      มาตรฐานวิศวกรรม
                    </span>
                  </div>

                  <h3 className="text-xl font-extrabold text-zinc-950 mb-1.5">ติดตั้งและย้ายแอร์</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed mb-6">
                    บริการติดตั้งแอร์ใหม่หรือย้ายจุดติดตั้ง เดินท่อสวยงาม ปลอดภัยตามหลักวิศวกรรม
                  </p>

                  <div className="flex items-baseline gap-1.5 pb-6 mb-6 border-b border-zinc-100">
                    <span className="text-3xl font-black text-zinc-950 tracking-tight">฿2,500</span>
                    <span className="text-xs text-zinc-400 font-medium">/ ชุด</span>
                  </div>

                  <ul className="space-y-3 text-xs text-zinc-600 mb-8">
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span>แถมท่อทองแดงมาตรฐานหนาพิเศษ 4 เมตร</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span>ฟรีรางครอบท่อ เบรกเกอร์ และขาแขวนคอยล์ร้อน</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span>แวคคั่มระบบสุญญากาศทุกครั้งก่อนปล่อยน้ำยา</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span>รับประกันงานติดตั้งนานถึง 180 วัน</span>
                    </li>
                  </ul>
                </div>

                <Link
                  to="/book?service=INSTALLATION"
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-xs font-bold text-zinc-900 bg-zinc-100 hover:bg-zinc-950 hover:text-white transition-all"
                >
                  <span>จองคิวติดตั้ง/ย้ายแอร์</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </Tilt3DCard>
          </ScrollReveal>
        </div>
      </section>

      {/* ============================================================================
          3. INTERACTIVE PRICE ESTIMATOR WIDGET (ของเดิมแคน อยู่ครบ 100%)
      ============================================================================ */}
      <section id="estimator" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="bg-zinc-950 text-white rounded-3xl p-7 sm:p-10 border border-zinc-800 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-orange-500/15 blur-3xl pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
              <div className="lg:col-span-7 space-y-5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/25 text-xs font-mono font-bold">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>INTERACTIVE ESTIMATOR</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  ลองคำนวณค่าบริการเบื้องต้น
                </h3>
                <p className="text-zinc-400 text-xs sm:text-sm">
                  คลิกเลือกประเภทบริการและปรับจำนวนเครื่องเพื่อดูราคาประเมินทันที (ล้างแอร์ 2 เครื่องขึ้นไปรับส่วนลดพิเศษเหลือเครื่องละ 500 บาท)
                </p>

                {/* Interactive Segmented Control */}
                <div className="grid grid-cols-3 gap-2 p-1.5 bg-zinc-900 rounded-2xl border border-zinc-800">
                  {[
                    { id: 'CLEANING', label: 'ล้างแอร์', icon: Wind },
                    { id: 'REPAIR', label: 'ซ่อมแอร์', icon: Wrench },
                    { id: 'INSTALLATION', label: 'ติดตั้ง/ย้าย', icon: PenTool },
                  ].map((tab) => {
                    const Icon = tab.icon
                    const isSelected = activeCalcTab === tab.id
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveCalcTab(tab.id as any)}
                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${isSelected
                            ? 'bg-orange-400 text-zinc-950 shadow-md scale-[1.02]'
                            : 'text-zinc-400 hover:text-white'
                          }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Unit Counter Pills */}
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-300 font-semibold">จำนวนเครื่องปรับอากาศ:</span>
                    <span className="font-mono font-bold text-orange-400">{unitCount} เครื่อง</span>
                  </div>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setUnitCount(num)}
                        className={`flex-1 py-2.5 rounded-xl font-mono text-xs font-bold border transition-all cursor-pointer ${unitCount === num
                            ? 'bg-white text-zinc-950 border-white shadow-md scale-105'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-white'
                          }`}
                      >
                        {num} เครื่อง
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Live Output Box */}
              <div className="lg:col-span-5 bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 text-center space-y-4">
                <p className="text-xs font-mono uppercase tracking-widest text-zinc-400">
                  ESTIMATED COST
                </p>
                <div className="py-2">
                  <span className="text-4xl sm:text-5xl font-black text-orange-400 tracking-tight tabular-nums">
                    ฿{estimatedTotal.toLocaleString()}
                  </span>
                  {activeCalcTab === 'CLEANING' && unitCount >= 2 && (
                    <span className="block text-[11px] text-emerald-400 font-semibold mt-1">
                      🎉 ได้รับส่วนลดแพ็กคู่ เหลือเครื่องละ ฿500!
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400">
                  รวมค่าเดินทางในเขตกรุงเทพฯ และปริมณฑล พร้อมรับประกันงานบริการ
                </p>
                <MagneticButton
                  type="button"
                  onClick={() => navigate(`/book?service=${activeCalcTab}`)}
                  className="btn-shimmer w-full py-3.5 px-5 rounded-2xl font-bold text-xs text-white shadow-lg"
                >
                  <span>จองบริการนี้เลย ({unitCount} เครื่อง)</span>
                  <ArrowRight className="w-4 h-4" />
                </MagneticButton>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ============================================================================
          4. BENTO GRID FEATURE SHOWCASE (ของเดิมแคน อยู่ครบ 100%)
      ============================================================================ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-200/70 text-zinc-800 text-xs font-bold mb-3">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>WHY PLASOM</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-950 tracking-tight">
            ยกระดับประสบการณ์ซ่อมแอร์ยุคดิจิทัล
          </h2>
          <p className="text-zinc-500 text-sm mt-2">
            หมดปัญหาช่างทิ้งงานหรือคิดราคาเกินจริง ด้วยระบบบริหารงานซ่อมที่โปร่งใสตรวจสอบได้ทุกขั้นตอน
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Bento 1 */}
          <ScrollReveal delay={50} className="md:col-span-7">
            <Tilt3DCard maxTilt={3} className="bg-white rounded-3xl p-8 border border-zinc-200/90 shadow-xs flex flex-col justify-between h-full">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-bold mb-4">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Real-time Status Pipeline</span>
                </div>
                <h3 className="text-2xl font-extrabold text-zinc-950 mb-2">
                  ติดตามสถานะได้เหมือนสั่งอาหารเดลิเวอรี่
                </h3>
                <p className="text-zinc-500 text-xs sm:text-sm max-w-xl leading-relaxed">
                  รู้ทันทีว่าเรื่องของคุณอยู่ในขั้นตอนไหน ใครเป็นช่างผู้รับผิดชอบ พร้อมเบอร์ติดต่อและไทม์ไลน์อัปเดตสดจากหน้างาน
                </p>
              </div>

              <div className="mt-8 p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 grid grid-cols-4 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-white border border-zinc-200/80 shadow-2xs hover:scale-105 transition-transform">
                  <span className="w-6 h-6 rounded-full bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center mx-auto mb-1.5">
                    ✓
                  </span>
                  <p className="text-[11px] font-bold text-zinc-800">ส่งเรื่องแล้ว</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-zinc-200/80 shadow-2xs hover:scale-105 transition-transform">
                  <span className="w-6 h-6 rounded-full bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center mx-auto mb-1.5">
                    ✓
                  </span>
                  <p className="text-[11px] font-bold text-zinc-800">จัดช่างแล้ว</p>
                </div>
                <div className="p-2.5 rounded-xl bg-orange-50/80 border border-orange-300 shadow-xs hover:scale-105 transition-transform">
                  <span className="w-6 h-6 rounded-full bg-orange-600 text-white text-[11px] font-bold flex items-center justify-center mx-auto mb-1.5 animate-pulse">
                    3
                  </span>
                  <p className="text-[11px] font-bold text-orange-900">กำลังเข้าซ่อม</p>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-100/70 border border-zinc-200/50 opacity-60">
                  <span className="w-6 h-6 rounded-full bg-zinc-300 text-zinc-600 text-[11px] font-bold flex items-center justify-center mx-auto mb-1.5">
                    4
                  </span>
                  <p className="text-[11px] font-bold text-zinc-500">เสร็จสมบูรณ์</p>
                </div>
              </div>
            </Tilt3DCard>
          </ScrollReveal>

          {/* Bento 2 */}
          <ScrollReveal delay={120} className="md:col-span-5">
            <Tilt3DCard maxTilt={4} className="bg-zinc-950 text-white rounded-3xl p-8 border border-zinc-800 shadow-xl flex flex-col justify-between h-full">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/20 text-xs font-bold mb-4">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Direct Technician Chat</span>
                </div>
                <h3 className="text-2xl font-extrabold text-white mb-2">
                  แชทคุยกับเจ้าหน้าที่ได้โดยตรง
                </h3>
                <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                  ไม่ต้องรอสาย Call Center นาน พิมพ์สอบถามอาการเพิ่มเติมหรือนัดหมายเวลากับทีมงานผ่านหน้าเว็บได้ทันที
                </p>
              </div>

              <div className="mt-6 space-y-2.5 bg-zinc-900/90 p-4 rounded-2xl border border-zinc-800 text-xs">
                <div className="flex flex-col items-start">
                  <span className="text-[10px] text-zinc-500 mb-1">ช่างสมชาย (Plasom)</span>
                  <div className="bg-zinc-800 text-zinc-200 px-3.5 py-2 rounded-2xl rounded-tl-xs">
                    กำลังเดินทางเข้าไปครับ ถึงประมาณ 10:30 น. ครับผม
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="bg-orange-500 text-zinc-950 font-semibold px-3.5 py-2 rounded-2xl rounded-tr-xs">
                    รับทราบครับ แจ้งรปภ.หน้าหมู่บ้านได้เลยครับ
                  </div>
                </div>
              </div>
            </Tilt3DCard>
          </ScrollReveal>

          {/* Bento 3 */}
          <ScrollReveal delay={180} className="md:col-span-4">
            <Tilt3DCard maxTilt={5} className="bg-white rounded-3xl p-7 border border-zinc-200/90 shadow-xs h-full">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-extrabold text-zinc-950 mb-1.5">ปักหมุดพิกัด GPS แม่นยำ</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                รองรับการดึงพิกัด GPS ปัจจุบันและแนบรูปถ่ายหน้างานสูงสุด 3 รูป เพื่อให้ช่างเตรียมอะไหล่และเดินทางไปถึงได้รวดเร็วที่สุด
              </p>
            </Tilt3DCard>
          </ScrollReveal>

          {/* Bento 4 */}
          <ScrollReveal delay={240} className="md:col-span-4">
            <Tilt3DCard maxTilt={5} className="bg-white rounded-3xl p-7 border border-zinc-200/90 shadow-xs h-full">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-extrabold text-zinc-950 mb-1.5">ช่างผ่านการรับรองฝีมือ</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                ทีมช่างทุกคนผ่านการตรวจสอบประวัติอาชญากรรม และผ่านการอบรมมาตรฐานเครื่องปรับอากาศชั้นนำระดับสากล
              </p>
            </Tilt3DCard>
          </ScrollReveal>

          {/* Bento 5 */}
          <ScrollReveal delay={300} className="md:col-span-4">
            <div className="bg-gradient-to-br from-orange-500 to-amber-700 text-white rounded-3xl p-7 shadow-lg flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <CalendarCheck className="w-8 h-8 text-orange-100" />
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-white/20 text-white font-bold">
                    FAST BOOKING
                  </span>
                </div>
                <h3 className="text-xl font-extrabold mb-1">แอร์มีปัญหาใช่ไหม?</h3>
                <p className="text-xs text-orange-100 leading-relaxed mb-6">
                  กรอกฟอร์มใช้เวลาไม่ถึง 2 นาที รับรหัสติดตามงานซ่อมได้ทันทีไม่ต้องสมัครสมาชิก
                </p>
              </div>
              <Link
                to="/book"
                className="w-full py-3 px-4 rounded-2xl bg-white text-zinc-950 hover:bg-orange-50 font-bold text-xs flex items-center justify-center gap-2 shadow-md transition"
              >
                <span>เริ่มแจ้งซ่อมตอนนี้</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ============================================================================
          5. FAQ ACCORDION (ของเดิมแคน อยู่ครบ 100%)
      ============================================================================ */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-bold mb-3">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>FREQUENTLY ASKED QUESTIONS</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
            คำถามที่พบบ่อย
          </h2>
          <p className="text-zinc-500 text-xs sm:text-sm mt-1">
            คลิกที่หัวข้อคำถามเพื่อดูรายละเอียดการให้บริการและการรับประกัน
          </p>
        </ScrollReveal>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openFaqIndex === idx
            return (
              <ScrollReveal key={idx} delay={idx * 60}>
                <div
                  className={`rounded-2xl border transition-all duration-300 overflow-hidden ${isOpen
                      ? 'bg-zinc-950 text-white border-zinc-950 shadow-lg'
                      : 'bg-white text-zinc-900 border-zinc-200/90 hover:border-zinc-300'
                    }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <span className="font-bold text-sm">{item.q}</span>
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300 ${isOpen ? 'bg-orange-500 text-zinc-950 rotate-180' : 'bg-zinc-100 text-zinc-600'
                        }`}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </span>
                  </button>
                  <div
                    className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100 pb-5 px-6' : 'grid-rows-[0fr] opacity-0 px-6'
                      }`}
                  >
                    <div className="overflow-hidden">
                      <p className={`text-xs leading-relaxed ${isOpen ? 'text-zinc-300' : 'text-zinc-500'}`}>
                        {item.a}
                      </p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            )
          })}
        </div>
      </section>
    </div>
  )
}
