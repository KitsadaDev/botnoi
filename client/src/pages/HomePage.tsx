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
} from 'lucide-react'
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
  const [isListening, setIsListening] = useState(false)
  const [voiceStep, setVoiceStep] = useState<number>(0) // 0=พร้อมเริ่ม, 1=ถามชื่อ/เบอร์, 2=ถามอาการ/ที่อยู่, 3=ถามวันนัด, 4=เสร็จสิ้น
  const [voiceData, setVoiceData] = useState({ namePhone: '', info: '', date: '' })
  const [voiceBotText, setVoiceBotText] = useState(
    'กดปุ่ม "เริ่มสนทนาแจ้งซ่อมด้วยเสียง" หรือกดปุ่มไมโครโฟนเพื่อพูดคุยกับ AI Voicebot ได้เลยค่ะ'
  )
  const [voiceUserText, setVoiceUserText] = useState('')
  const [createdVoiceCode, setCreatedVoiceCode] = useState<string | null>(null)
  const [isSubmittingVoice, setIsSubmittingVoice] = useState(false)

  // State สำหรับ AI Avatar
  const [isAvatarSpeaking, setIsAvatarSpeaking] = useState(false)
  const [isAvatarListening, setIsAvatarListening] = useState(false)
  const [avatarSubtitle, setAvatarSubtitle] = useState(
    'สวัสดีค่ะ! ดิฉันปลาส้ม AI Specialist กดเลือกหัวข้อด้านซ้าย หรือกดปุ่มไมค์เพื่อพูดคุยกับดิฉันได้เลยนะคะ'
  )
  const recognitionRef = useRef<any>(null)

  const navigate = useNavigate()

  // ฟังก์ชันสั่งให้เบราว์เซอร์พูดภาษาไทย (Text-to-Speech ฟรี 0 เครดิต)
    // ฟังก์ชันพูดเสียงผู้หญิงไทย (ดึงไฟล์ MP3 จากเซิร์ฟเวอร์ /api/tickets/tts เท่านั้น เพื่อให้ทุกเครื่องเสียงเหมือนกัน 100%)
  const speakThai = (text: string, mode: 'voicebot' | 'avatar', onEndCallback?: () => void) => {
    if (typeof window === 'undefined') {
      onEndCallback?.()
      return
    }

    // หยุดเสียงเก่าที่กำลังเล่นอยู่ก่อนเสมอ
    const existingAudio = (window as any).__currentTtsAudio as HTMLAudioElement | undefined
    if (existingAudio) {
      existingAudio.pause()
      existingAudio.currentTime = 0
    }

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
    ;(window as any).__currentTtsAudio = audio

    audio.onended = finish
    audio.onerror = finish
    audio.play().catch(finish)
  }


  // หยุดเสียงเมื่อสลับแท็บหรือออกจากหน้า
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {
          // ignore
        }
      }
    }
  }, [activeAiTab])

  // ฟังก์ชันส่งข้อมูลจาก Voicebot เข้า Database จริง (ผ่าน /api/tickets/botnoi-webhook)
  const submitVoiceTicketToDb = async (namePhone: string, infoText: string, dateText: string) => {
    setIsSubmittingVoice(true)
    try {
      const phoneMatch = namePhone.replace(/\D/g, '').match(/0\d{9}/)
      const phone = phoneMatch ? phoneMatch[0] : '0899999999'
      const cleanName =
        namePhone
          .replace(/[0-9-]/g, '')
          .replace(/ชื่อ|เบอร์|โทร|ครับ|ค่ะ/g, '')
          .trim() || 'ลูกค้าแจ้งผ่าน AI Voicebot'

      const res = await fetch('/api/tickets/botnoi-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: `${cleanName} (Voicebot)`,
          phone,
          info: `AI Voicebot | ${infoText} | แจ้งผ่านระบบเสียง`,
          date: dateText,
        }),
      })
      const json = await res.json()
      const code = json?.trackingCode || 'CC-20261110-VOIC'
      setCreatedVoiceCode(code)
      setVoiceStep(4)
      speakThai(
        `บันทึกข้อมูลเรียบร้อยแล้วค่ะ รหัสติดตามงานซ่อมของคุณคือ ${code} สามารถตรวจสอบสถานะบนหน้าเว็บได้เลยนะคะ ขอบคุณที่ใช้บริการค่ะ`,
        'voicebot'
      )
    } catch {
      speakThai('ขออภัยค่ะ ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้งนะคะ', 'voicebot')
    } finally {
      setIsSubmittingVoice(false)
    }
  }

  // จัดการคำพูดของลูกค้าในโหมด Voicebot ทีละขั้นตอน
  const handleVoicebotUserSpeech = (transcript: string, currentStep: number) => {
    setVoiceUserText(transcript)
    if (currentStep <= 1) {
      setVoiceData((prev) => ({ ...prev, namePhone: transcript }))
      setVoiceStep(2)
      speakThai(
        `ขอบคุณค่ะ รบกวนแจ้งยี่ห้อแอร์ อาการเสีย และที่อยู่หน้างานได้เลยค่ะ`,
        'voicebot'
      )
    } else if (currentStep === 2) {
      setVoiceData((prev) => ({ ...prev, info: transcript }))
      setVoiceStep(3)
      speakThai('รับทราบอาการเสียค่ะ สะดวกนัดหมายช่างเข้าดูแลเป็นวันและเวลาไหนคะ?', 'voicebot')
    } else if (currentStep === 3) {
      const updatedDate = transcript
      setVoiceData((prev) => {
        submitVoiceTicketToDb(prev.namePhone, prev.info, updatedDate)
        return { ...prev, date: updatedDate }
      })
    }
  }

  // เริ่มต้นคุยกับ Voicebot
  const startVoicebotFlow = () => {
    setCreatedVoiceCode(null)
    setVoiceUserText('')
    setVoiceData({ namePhone: '', info: '', date: '' })
    setVoiceStep(1)
    speakThai(
      'สวัสดีค่ะ ศูนย์บริการปลาส้มยินดีให้บริการค่ะ รบกวนแจ้งชื่อและเบอร์โทรศัพท์ 10 หลักของคุณลูกค้าได้เลยค่ะ',
      'voicebot'
    )
  }

  // กดปุ่มไมโครโฟนเพื่อพูดภาษาไทย (ใช้ได้ทั้ง Voicebot และ Avatar)
  const startMicListening = (mode: 'voicebot' | 'avatar') => {
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition

    if (!SpeechRec) {
      alert('เบราว์เซอร์นี้ไม่รองรับการรับเสียงไมโครโฟน กรุณาเปิดด้วย Google Chrome หรือกดปุ่มจำลองพูดแทนครับ')
      return
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setIsPlayingVoice(false)
      setIsAvatarSpeaking(false)
    }

    const recognition = new SpeechRec()
    recognitionRef.current = recognition
    recognition.lang = 'th-TH'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      if (mode === 'voicebot') setIsListening(true)
      if (mode === 'avatar') setIsAvatarListening(true)
    }

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || ''
      if (!transcript) return

      if (mode === 'voicebot') {
        const activeStep = voiceStep === 0 || voiceStep === 4 ? 1 : voiceStep
        if (voiceStep === 0 || voiceStep === 4) setVoiceStep(1)
        handleVoicebotUserSpeech(transcript, activeStep)
      } else {
        // โหมด Avatar ตอบคำถามอัตโนมัติตามสิ่งที่ลูกค้าพูด
        setVoiceUserText(transcript)
        if (transcript.includes('ราคา') || transcript.includes('เท่าไหร่') || transcript.includes('ล้าง')) {
          speakThai(
            'บริการล้างแอร์ปลอดเชื้อราคาเริ่มต้น 590 บาทต่อเครื่อง พิเศษถ้าล้าง 2 เครื่องขึ้นไปลดเหลือเครื่องละ 500 บาทค่ะ ส่วนตรวจเช็คแอร์เสียเริ่มต้น 400 บาทค่ะ',
            'avatar'
          )
        } else if (transcript.includes('ไม่เย็น') || transcript.includes('เสีย') || transcript.includes('น้ำหยด')) {
          speakThai(
            'หากแอร์ไม่เย็นหรือมีน้ำหยด เบื้องต้นแนะนำให้ลองเช็คแผ่นกรองฝุ่นและตั้งโหมด Cool ที่รีโมตนะคะ หากยังไม่หาย กดปุ่มแจ้งซ่อมเพื่อให้ช่างเข้าดูแลได้เลยค่ะ',
            'avatar'
          )
        } else {
          speakThai(
            `ดิฉันได้รับข้อความว่า "${transcript}" แล้วค่ะ คุณลูกค้าสามารถกดปุ่มแจ้งซ่อมด้านซ้าย หรือทักแชทบอทมุมขวาล่างเพื่อออกรหัสใบงานได้ทันทีเลยนะคะ`,
            'avatar'
          )
        }
      }
    }

    recognition.onerror = () => {
      setIsListening(false)
      setIsAvatarListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
      setIsAvatarListening(false)
    }

    recognition.start()
  }

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
          SECTION เสริมตามบรีฟพี่โมโน: 3 AI PRODUCTS & ตัวอย่างการใช้งาน (พร้อม Tab สลับ)
      ============================================================================ */}
      <section id="ai-showcase" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14 scroll-mt-24">
        {/* ส่วนที่ 1: การ์ดแนะนำ 3 Products */}
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
              รองรับการติดต่อแจ้งซ่อมและติดตามสถานะได้ครบทุกรูปแบบ ทั้งข้อความ เสียงสนทนา และตัวละครเสมือนจริง
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Product 1: Chatbot */}
            <ScrollReveal delay={50}>
              <Tilt3DCard
                spotlightColor="rgba(249, 115, 22, 0.14)"
                className="bg-white rounded-3xl border border-zinc-200/90 shadow-xs hover:shadow-xl hover:border-orange-300 p-7 h-full flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold text-zinc-950">Chatbot</h3>
                      <p className="text-xs font-semibold text-orange-600">คุยแบบข้อความ</p>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    AI แชทบอทสำหรับงานบริการหลังการขาย ตอบคำถาม ให้ข้อมูลบริการ รับแจ้งซ่อมแอร์ นัดหมายคิวช่าง และช่วยแก้ไขปัญหาเบื้องต้นได้อัตโนมัติ
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveAiTab('chatbot')
                    document.getElementById('ai-usage-examples')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between text-xs font-bold text-orange-600 hover:text-orange-700 cursor-pointer"
                >
                  <span>ดูตัวอย่างการใช้งาน Chatbot</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Tilt3DCard>
            </ScrollReveal>

            {/* Product 2: Voicebot */}
            <ScrollReveal delay={150}>
              <Tilt3DCard
                spotlightColor="rgba(99, 102, 241, 0.18)"
                className="bg-zinc-950 text-white rounded-3xl border border-zinc-800 shadow-xl p-7 h-full flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
                      <Mic className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold text-white">Voicebot</h3>
                      <p className="text-xs font-semibold text-indigo-400">คุยผ่านเสียง</p>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    AI รองรับการสนทนาผ่านเสียงด้วยเทคโนโลยี Speech AI ที่เข้าใจภาษาไทย ตอบโต้ได้เป็นธรรมชาติ เหมาะสำหรับสายด่วนแจ้งซ่อมและ Call Center
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveAiTab('voicebot')
                    document.getElementById('ai-usage-examples')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between text-xs font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                >
                  <span>ดูตัวอย่างการใช้งาน Voicebot</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Tilt3DCard>
            </ScrollReveal>

            {/* Product 3: AI Avatar */}
            <ScrollReveal delay={250}>
              <Tilt3DCard
                spotlightColor="rgba(168, 85, 247, 0.14)"
                className="bg-white rounded-3xl border border-zinc-200/90 shadow-xs hover:shadow-xl hover:border-purple-300 p-7 h-full flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                      <Bot className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold text-zinc-950">AI Avatar</h3>
                      <p className="text-xs font-semibold text-purple-600">ตัวละครดิจิทัลบนหน้าจอ พูดคุยด้วยเสียงได้</p>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    ผู้ช่วย AI ในรูปแบบตัวละครเสมือนจริง สื่อสารด้วยเสียงและท่าทางที่เป็นมิตร ดูเป็นธรรมชาติ สร้างประสบการณ์บริการหลังการขายที่ทันสมัย
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveAiTab('avatar')
                    document.getElementById('ai-usage-examples')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between text-xs font-bold text-purple-600 hover:text-purple-700 cursor-pointer"
                >
                  <span>ดูตัวอย่างการใช้งาน AI Avatar</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Tilt3DCard>
            </ScrollReveal>
          </div>
        </div>

        {/* ส่วนที่ 2: ตัวอย่างการใช้งาน (พร้อม Tab สลับ Chatbot / Voicebot / AI Avatar) */}
        <div id="ai-usage-examples" className="scroll-mt-24">
          <ScrollReveal className="bg-white rounded-3xl p-6 sm:p-10 border border-zinc-200/90 shadow-md space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 pb-6">
              <div>
                <h3 className="text-2xl font-extrabold text-zinc-950 tracking-tight">
                  ตัวอย่างการใช้งาน
                </h3>
                <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                  ดูตัวอย่างการให้บริการหลังการขายด้วย AI ในสถานการณ์จริง (คลิกสลับโหมดด้านขวา)
                </p>
              </div>

              {/* ปุ่ม Tab สลับ Chatbot / Voicebot / AI Avatar */}
              <div className="inline-flex p-1.5 bg-zinc-100 rounded-2xl border border-zinc-200/80 self-start">
                <button
                  type="button"
                  onClick={() => setActiveAiTab('chatbot')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeAiTab === 'chatbot'
                      ? 'bg-zinc-950 text-white shadow-sm'
                      : 'text-zinc-600 hover:text-zinc-950'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-orange-400" />
                  <span>Chatbot</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAiTab('voicebot')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeAiTab === 'voicebot'
                      ? 'bg-zinc-950 text-white shadow-sm'
                      : 'text-zinc-600 hover:text-zinc-950'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Voicebot</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAiTab('avatar')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeAiTab === 'avatar'
                      ? 'bg-zinc-950 text-white shadow-sm'
                      : 'text-zinc-600 hover:text-zinc-950'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5 text-purple-400" />
                  <span>AI Avatar</span>
                </button>
              </div>
            </div>

            {/* เนื้อหา TAB 1: CHATBOT */}
            {activeAiTab === 'chatbot' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* กล่องซ้าย: แจ้งซ่อมอุปกรณ์ไฟฟ้า / แอร์ */}
                <div className="rounded-2xl border border-zinc-200/90 bg-zinc-50/60 p-5 sm:p-6 space-y-5">
                  <div className="flex items-center gap-3 pb-4 border-b border-zinc-200/80">
                    <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-extrabold text-zinc-950">แจ้งซ่อมเครื่องปรับอากาศ</h4>
                      <p className="text-xs text-zinc-500">AI ช่วยรับแจ้งปัญหา รวบรวมข้อมูลลูกค้า และสร้างใบงานส่งต่อทีมซ่อม</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
                    {/* ขั้นตอน 1-4 ด้านซ้าย */}
                    <div className="sm:col-span-4 space-y-3 text-xs">
                      {[
                        'รับแจ้งปัญหา',
                        'รวบรวมข้อมูลลูกค้า',
                        'สร้างใบงานซ่อม (Ticket)',
                        'แจ้งเลขอ้างอิงและขั้นตอนถัดไป',
                      ].map((stepText, idx) => (
                        <div key={idx} className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-orange-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-zinc-700 leading-snug">{stepText}</span>
                        </div>
                      ))}
                    </div>

                    {/* บทสนทนาด้านขวา */}
                    <div className="sm:col-span-8 space-y-2.5 text-xs">
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-zinc-200 text-zinc-600 flex items-center justify-center shrink-0 mt-0.5">
                          <UserIcon className="w-3.5 h-3.5" />
                        </div>
                        <div className="bg-white p-3 rounded-2xl rounded-tl-xs border border-zinc-200/80 text-zinc-800 shadow-2xs">
                          เครื่องปรับอากาศที่บ้านไม่เย็นครับ ขอแจ้งซ่อมได้ไหมครับ?
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-orange-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          A
                        </div>
                        <div className="bg-orange-50/90 p-3 rounded-2xl rounded-tl-xs border border-orange-200/70 text-zinc-800 space-y-1">
                          <p className="font-semibold text-orange-950">ได้เลยค่ะ รบกวนขอข้อมูลเบื้องต้นนะคะ</p>
                          <ul className="list-disc list-inside text-[11px] text-zinc-600 space-y-0.5">
                            <li>ชื่อ-นามสกุล และ เบอร์โทร</li>
                            <li>รุ่น/ยี่ห้อ อาการเสีย และที่อยู่หน้างาน</li>
                            <li>วันและเวลาที่สะดวกนัดหมาย</li>
                          </ul>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-zinc-200 text-zinc-600 flex items-center justify-center shrink-0 mt-0.5">
                          <UserIcon className="w-3.5 h-3.5" />
                        </div>
                        <div className="bg-white p-3 rounded-2xl rounded-tl-xs border border-zinc-200/80 text-zinc-800 shadow-2xs">
                          ชื่อธนกร ครับ เบอร์ 081-234-5678 ที่อยู่ 99/1 ถนนรัชดา กรุงเทพฯ เป็นแอร์ Daikin อาการไม่เย็น นัดพรุ่งนี้บ่ายครับ
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-orange-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          A
                        </div>
                        <div className="bg-emerald-50/90 p-3 rounded-2xl rounded-tl-xs border border-emerald-200 text-emerald-950">
                          <p className="font-bold text-emerald-700 mb-0.5">✅ รับข้อมูลเรียบร้อยค่ะ</p>
                          ได้สร้างใบแจ้งซ่อมเลขที่{' '}
                          <strong className="font-mono bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-900">
                            CC-20261110-A9F2
                          </strong>{' '}
                          เข้าสู่ระบบ Admin Dashboard เรียบร้อยแล้วค่ะ
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* กล่องขวา: ติดตามสถานะการซ่อม */}
                <div className="rounded-2xl border border-zinc-200/90 bg-zinc-50/60 p-5 sm:p-6 space-y-5">
                  <div className="flex items-center gap-3 pb-4 border-b border-zinc-200/80">
                    <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Search className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-extrabold text-zinc-950">ติดตามสถานะการซ่อม</h4>
                      <p className="text-xs text-zinc-500">ลูกค้าสามารถสอบถามและตรวจสอบความคืบหน้าการซ่อมได้ทันที</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
                    {/* ขั้นตอน 1-4 ด้านซ้าย */}
                    <div className="sm:col-span-4 space-y-3 text-xs">
                      {[
                        'สอบถามเลขที่ใบงาน หรือข้อมูลการซ่อม',
                        'ตรวจสอบสถานะจากระบบ',
                        'แจ้งความคืบหน้าให้ลูกค้า',
                        'เสนอขั้นตอนถัดไป (เช่น นัดหมายใหม่)',
                      ].map((stepText, idx) => (
                        <div key={idx} className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-amber-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-zinc-700 leading-snug">{stepText}</span>
                        </div>
                      ))}
                    </div>

                    {/* บทสนทนาด้านขวา */}
                    <div className="sm:col-span-8 space-y-2.5 text-xs">
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-zinc-200 text-zinc-600 flex items-center justify-center shrink-0 mt-0.5">
                          <UserIcon className="w-3.5 h-3.5" />
                        </div>
                        <div className="bg-white p-3 rounded-2xl rounded-tl-xs border border-zinc-200/80 text-zinc-800 shadow-2xs">
                          ขอเช็คสถานะการซ่อมครับ ใบงานเลขที่ <strong>{SAMPLE_TRACKING_CODES[0]}</strong> ครับ
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-orange-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          A
                        </div>
                        <div className="bg-orange-50/90 p-3 rounded-2xl rounded-tl-xs border border-orange-200/70 text-zinc-800 space-y-1.5">
                          <p className="font-semibold text-orange-950">กำลังตรวจสอบสถานะให้ค่ะ...</p>
                          <div className="bg-white p-2.5 rounded-xl border border-orange-200/60 space-y-1 text-[11px]">
                            <p>📋 <strong>สถานะใบงาน:</strong> ช่างกำลังเข้าซ่อม</p>
                            <p>🗓️ <strong>กำหนดเข้าซ่อม:</strong> ตามวันนัดหมายในระบบ</p>
                            <p>👷 <strong>ทีมช่าง:</strong> ทีมบริการกรุงเทพฯ (ช่างสมชาย)</p>
                          </div>
                          <p className="text-[11px] text-zinc-600">ต้องการปรับวัน/เวลา หรือต้องการข้อมูลเพิ่มเติมไหมคะ?</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-zinc-200 text-zinc-600 flex items-center justify-center shrink-0 mt-0.5">
                          <UserIcon className="w-3.5 h-3.5" />
                        </div>
                        <div className="bg-white p-3 rounded-2xl rounded-tl-xs border border-zinc-200/80 text-zinc-800 shadow-2xs">
                          ไม่ติดครับ ขอบคุณครับ
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-orange-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          A
                        </div>
                        <div className="bg-emerald-50/90 p-3 rounded-2xl rounded-tl-xs border border-emerald-200 text-emerald-950">
                          ✅ ยินดีค่ะ สามารถกดปุ่มแชทบอทสีส้มที่มุมขวาล่างของจอเพื่อคุยกับน้อง Plasom ของจริงได้ตลอด 24 ชั่วโมงนะคะ
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* เนื้อหา TAB 2: VOICEBOT (คุยผ่านเสียงจริง + สร้างใบงานเข้า Admin Dashboard ได้จริง) */}
            {activeAiTab === 'voicebot' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-zinc-950 text-white rounded-2xl p-6 sm:p-8">
                <div className="md:col-span-6 space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Interactive Speech AI ภาษาไทย</span>
                  </div>
                  <h4 className="text-xl sm:text-2xl font-extrabold">
                    สนทนาแจ้งซ่อมผ่านเสียง (Live Voicebot)
                  </h4>
                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                    ทดสอบพูดคุยด้วยเสียงภาษาไทยผ่านไมโครโฟนได้จริง! ระบบจะรับเสียงพูด แปลงเป็นข้อความ ตอบโต้ด้วยเสียงภาษาไทย และสร้างใบงาน (Ticket) ส่งเข้าหน้า Admin Dashboard อัตโนมัติ
                  </p>

                  {/* แสดงสถานะขั้นตอนการรับแจ้งซ่อมด้วยเสียง */}
                  <div className="grid grid-cols-3 gap-2 pt-2 text-[11px]">
                    <div
                      className={`p-2.5 rounded-xl border ${
                        voiceStep >= 1
                          ? 'bg-indigo-500/20 border-indigo-400 text-white font-bold'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                      }`}
                    >
                      1. ชื่อ & เบอร์โทร
                    </div>
                    <div
                      className={`p-2.5 rounded-xl border ${
                        voiceStep >= 2
                          ? 'bg-indigo-500/20 border-indigo-400 text-white font-bold'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                      }`}
                    >
                      2. อาการ & ที่อยู่
                    </div>
                    <div
                      className={`p-2.5 rounded-xl border ${
                        voiceStep >= 3
                          ? 'bg-indigo-500/20 border-indigo-400 text-white font-bold'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                      }`}
                    >
                      3. วันนัด & ออกรหัส
                    </div>
                  </div>

                  {createdVoiceCode && (
                    <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
                      <div>
                        <span className="font-bold">✅ สร้างใบงานเข้า Admin สำเร็จ: </span>
                        <span className="font-mono font-bold text-white">{createdVoiceCode}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate(`/track/${createdVoiceCode}`)}
                        className="px-3 py-1 rounded-lg bg-emerald-500 text-zinc-950 font-bold text-[11px] hover:bg-emerald-400 cursor-pointer"
                      >
                        ดูสถานะเคส
                      </button>
                    </div>
                  )}
                </div>

                <div className="md:col-span-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center space-y-4">
                  {/* คลื่นเสียง Equalizer */}
                  <div className="flex items-center justify-center gap-1.5 h-12">
                    {[35, 75, 45, 95, 60, 100, 50, 85, 30, 90, 55, 80, 40, 70].map((h, i) => (
                      <span
                        key={i}
                        className={`w-1.5 rounded-full transition-all duration-300 ${
                          isListening
                            ? 'bg-rose-400 animate-ping'
                            : isPlayingVoice
                            ? 'bg-indigo-400 animate-pulse'
                            : 'bg-indigo-400 opacity-30'
                        }`}
                        style={{ height: isPlayingVoice || isListening ? `${h}%` : '25%' }}
                      />
                    ))}
                  </div>

                  {/* กล่องแสดงคำพูดของ AI และลูกค้า */}
                  <div className="text-left space-y-2 bg-zinc-950/90 p-3.5 rounded-xl border border-zinc-800 text-xs">
                    <p className="text-indigo-300 font-medium leading-relaxed">
                      🔊 <strong>AI Voicebot:</strong> &ldquo;{voiceBotText}&rdquo;
                    </p>
                    {voiceUserText && (
                      <p className="text-emerald-300 font-mono text-[11px] pt-1.5 border-t border-zinc-800/80">
                        🎙️ <strong>เสียงของคุณ:</strong> &ldquo;{voiceUserText}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* ปุ่มควบคุมการสนทนาด้วยเสียง */}
                  <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={startVoicebotFlow}
                      disabled={isSubmittingVoice}
                      className="px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs inline-flex items-center gap-2 transition cursor-pointer"
                    >
                      {isPlayingVoice ? <Volume2 className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      <span>{voiceStep === 0 ? '1. เริ่มสนทนาด้วยเสียง' : 'เริ่มใหม่'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => startMicListening('voicebot')}
                      disabled={isSubmittingVoice}
                      className={`px-4 py-2.5 rounded-xl font-bold text-xs inline-flex items-center gap-2 transition cursor-pointer ${
                        isListening
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'bg-white text-zinc-950 hover:bg-zinc-200'
                      }`}
                    >
                      <Mic className="w-4 h-4" />
                      <span>{isListening ? 'กำลังฟังเสียงพูด...' : '2. กดพูดใส่ไมค์ (ภาษาไทย)'}</span>
                    </button>

                    {/* ปุ่มจำลองพูดอัตโนมัติ (เผื่อตอนพรีเซนต์ไม่สะดวกเปิดไมค์) */}
                    {voiceStep >= 1 && voiceStep <= 3 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (voiceStep === 1)
                            handleVoicebotUserSpeech('ชื่อกลัฟ เบอร์ 0802366719', 1)
                          else if (voiceStep === 2)
                            handleVoicebotUserSpeech('แอร์ Daikin ไม่เย็น ซอยสุขุมวิท 101', 2)
                          else if (voiceStep === 3)
                            handleVoicebotUserSpeech('พรุ่งนี้ 10 โมงเช้า', 3)
                        }}
                        className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-semibold transition cursor-pointer"
                      >
                        ⚡ จำลองส่งคำพูดขั้นที่ {voiceStep}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* เนื้อหา TAB 3: AI AVATAR (ตัวละครเสมือนจริง พูดออกเสียงและขยับตามจังหวะพูดได้จริง) */}
            {activeAiTab === 'avatar' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-gradient-to-br from-purple-950 via-zinc-950 to-zinc-950 text-white rounded-2xl p-6 sm:p-8">
                <div className="md:col-span-6 space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30">
                    <Bot className="w-3.5 h-3.5" />
                    <span>Interactive Digital Human</span>
                  </div>
                  <h4 className="text-xl sm:text-2xl font-extrabold">
                    ผู้ช่วยต้อนรับเสมือนจริงบนหน้าจอ (AI Avatar)
                  </h4>
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                    คลิกเลือกหัวข้อด้านล่าง หรือกดปุ่มไมโครโฟนเพื่อพูดคุยกับ AI Avatar ด้วยเสียงภาษาไทยได้ทันที ตัวละครจะตอบโต้ด้วยเสียงพูดพร้อมซับไตเติลแสดงผลแบบ Real-time
                  </p>

                  {/* ปุ่มกดให้ Avatar พูดโต้ตอบทันที */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        speakThai(
                          'สวัสดีค่ะ! ดิฉันปลาส้ม ผู้ช่วย AI Avatar ประจำศูนย์บริการ ยินดีให้คำปรึกษาเรื่องล้างแอร์ ซ่อมแอร์ และรับแจ้งซ่อมตลอด 24 ชั่วโมงค่ะ',
                          'avatar'
                        )
                      }
                      className="p-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-left text-xs font-semibold text-purple-100 transition cursor-pointer"
                    >
                      👋 &ldquo;แนะนำบริการให้ฟังหน่อย&rdquo;
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        speakThai(
                          'หากแอร์มีแต่ลมไม่เย็น แนะนำให้ลองทำความสะอาดแผ่นกรองฝุ่น และเช็คโหมด Cool ที่รีโมตก่อนนะคะ หากยังไม่เย็น กดปุ่มเปิดใบงานแจ้งซ่อมได้เลยค่ะ',
                          'avatar'
                        )
                      }
                      className="p-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-left text-xs font-semibold text-purple-100 transition cursor-pointer"
                    >
                      ❄️ &ldquo;แอร์ไม่เย็น ทำยังไงดี?&rdquo;
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        speakThai(
                          'โปรโมชั่นล้างแอร์ปลอดเชื้อเริ่มต้น 590 บาทต่อเครื่อง หากล้าง 2 เครื่องขึ้นไปลดเหลือเครื่องละ 500 บาทค่ะ ส่วนงานซ่อมแอร์ค่าตรวจเช็คเริ่มต้น 400 บาทค่ะ',
                          'avatar'
                        )
                      }
                      className="p-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-left text-xs font-semibold text-purple-100 transition cursor-pointer"
                    >
                      💰 &ldquo;ขอทราบราคาค่าบริการ&rdquo;
                    </button>

                    <button
                      type="button"
                      onClick={() => startMicListening('avatar')}
                      className={`p-2.5 rounded-xl border text-left text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                        isAvatarListening
                          ? 'bg-rose-500 border-rose-400 text-white animate-pulse'
                          : 'bg-white text-zinc-950 border-white hover:bg-purple-50'
                      }`}
                    >
                      <Mic className="w-4 h-4 text-purple-600 shrink-0" />
                      <span>{isAvatarListening ? 'กำลังฟังเสียงคุณ...' : 'พูดคุยสดกับ Avatar'}</span>
                    </button>
                  </div>

                  <div className="pt-2">
                    <Link
                      to="/book"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-500 text-white font-bold text-xs hover:bg-purple-400 transition"
                    >
                      <span>ทดลองเปิดใบงานแจ้งซ่อมจริง</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                <div className="md:col-span-6">
                  <div
                    className={`relative rounded-2xl overflow-hidden aspect-video bg-zinc-900 border-2 transition-all duration-300 shadow-xl ${
                      isAvatarSpeaking
                        ? 'border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.35)]'
                        : 'border-purple-500/30'
                    }`}
                  >
                    <img
                      src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=900&q=80"
                      alt="AfterCare AI Avatar"
                      className={`w-full h-full object-cover opacity-90 transition-transform duration-700 ${
                        isAvatarSpeaking ? 'scale-105' : 'scale-100'
                      }`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent flex flex-col justify-end p-4 space-y-2">
                      {/* ซับไตเติลเสียงพูดของ Avatar */}
                      <div className="bg-zinc-950/80 backdrop-blur-md border border-purple-500/30 rounded-xl px-3.5 py-2 text-xs text-purple-100 leading-relaxed">
                        {isAvatarSpeaking ? '🔊 ' : '💬 '}
                        {avatarSubtitle}
                      </div>

                      <div className="bg-zinc-950/85 backdrop-blur-md border border-white/15 rounded-xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="text-xs font-bold text-white">AfterCare AI Specialist</p>
                            <p className="text-[11px] text-purple-300">
                              {isAvatarSpeaking ? 'กำลังพูดโต้ตอบกับคุณลูกค้า...' : 'พร้อมให้คำปรึกษาและรับแจ้งซ่อม 24/7'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isAvatarSpeaking && (
                            <div className="flex items-center gap-1 h-4 px-1">
                              {[60, 100, 45, 90, 50].map((h, i) => (
                                <span
                                  key={i}
                                  className="w-1 bg-emerald-400 rounded-full animate-pulse"
                                  style={{ height: `${h}%` }}
                                />
                              ))}
                            </div>
                          )}
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold ${
                              isAvatarSpeaking
                                ? 'bg-emerald-500 text-zinc-950 animate-pulse'
                                : 'bg-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            {isAvatarSpeaking ? 'SPEAKING' : 'LIVE AVATAR'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </ScrollReveal>
        </div>
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
                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isSelected
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
                        className={`flex-1 py-2.5 rounded-xl font-mono text-xs font-bold border transition-all cursor-pointer ${
                          unitCount === num
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
                  className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                    isOpen
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
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300 ${
                        isOpen ? 'bg-orange-500 text-zinc-950 rotate-180' : 'bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </span>
                  </button>
                  <div
                    className={`grid transition-all duration-300 ease-in-out ${
                      isOpen ? 'grid-rows-[1fr] opacity-100 pb-5 px-6' : 'grid-rows-[0fr] opacity-0 px-6'
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
