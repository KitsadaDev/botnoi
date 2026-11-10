import React, { useEffect, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Wrench,
  Wind,
  PenTool,
  Calendar,
  MapPin,
  User,
  Phone,
  X,
  UploadCloud,
  CheckCircle2,
  Copy,
  ArrowRight,
  AlertCircle,
  Loader2,
  Navigation,
  Sparkles,
  ShieldCheck,
  Wand2,
} from 'lucide-react'
import api from '../lib/api'
import type { ApiResponse, Ticket, ServiceType } from '../lib/types'
import { formatDate, getMinBookingDate, sanitizePhoneInput } from '../lib/format'
import { MAX_IMAGES, selectValidImages } from '../lib/images'
import { ScrollReveal, Tilt3DCard, MagneticButton } from '../components/InteractiveUI'

const bookingSchema = z.object({
  service: z.enum(['CLEANING', 'REPAIR', 'INSTALLATION'], {
    errorMap: () => ({ message: 'กรุณาเลือกประเภทบริการ' }),
  }),
  brand: z.string().min(1, 'กรุณาระบุยี่ห้อแอร์'),
  symptom: z.string().min(5, 'กรุณาระบุอาการเบื้องต้นอย่างน้อย 5 ตัวอักษร'),
  preferredDate: z.string().min(1, 'กรุณาเลือกวันที่ต้องการรับบริการ'),
  customerName: z.string().min(2, 'กรุณาระบุชื่อ-นามสกุล'),
  // ต้องตรงกับ server: ตัวเลข 10 หลัก ขึ้นต้นด้วย 0
  customerPhone: z.string().regex(/^0[0-9]{9}$/, 'เบอร์โทรต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 0'),
  address: z.string().min(10, 'กรุณาระบุที่อยู่และจุดสังเกตอย่างละเอียด'),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  note: z.string().optional(),
})

type BookingFormValues = z.infer<typeof bookingSchema>

const BRAND_OPTIONS = [
  'Carrier (แคเรียร์)',
  'Daikin (ไดกิ้น)',
  'Mitsubishi Electric (มิตซูบิชิ)',
  'Panasonic (พานาโซนิค)',
  'Haier (ไฮเออร์)',
  'Toshiba (โตชิบา)',
  'LG (แอลจี)',
  'Samsung (ซัมซุง)',
  'Central Air (เซ็นทรัลแอร์)',
  'อื่นๆ (Other)',
]

const QUICK_SYMPTOMS: Record<ServiceType, string[]> = {
  CLEANING: [
    'ล้างแอร์ประจำปี 1 เครื่อง มีฝุ่นสะสมและกลิ่นอับ',
    'ล้างใหญ่แอร์ติดผนัง 2 เครื่อง ลมออกเบา',
    'ล้างแอร์และตรวจเช็คน้ำยาแอร์ มีน้ำหยดเล็กน้อย',
  ],
  REPAIR: [
    'แอร์เปิดติดแต่ไม่เย็น มีแต่ลมธรรมดาออกมา',
    'มีน้ำหยดไหลลงมาจากตัวเครื่องคอยล์เย็น',
    'แอร์มีเสียงดังผิดปกติและไฟกระพริบที่หน้าเครื่อง',
    'คอมเพรสเซอร์ด้านนอกไม่ทำงาน แอร์ตัดบ่อย',
  ],
  INSTALLATION: [
    'ติดตั้งแอร์ใหม่ขนาด 12,000 BTU พร้อมเดินท่อ',
    'รื้อถอนแอร์เดิมและย้ายจุดติดตั้งไปห้องใหม่',
    'ติดตั้งแอร์ใหม่แทนเครื่องเก่าในตำแหน่งเดิม',
  ],
}

export const BookServicePage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null)
  const [copied, setCopied] = useState(false)
  const [isGettingLocation, setIsGettingLocation] = useState(false)

  const initialService = (searchParams.get('service') as ServiceType) || 'CLEANING'

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      service: ['CLEANING', 'REPAIR', 'INSTALLATION'].includes(initialService) ? initialService : 'CLEANING',
      brand: 'Carrier (แคเรียร์)',
      symptom: '',
      preferredDate: '',
      customerName: '',
      customerPhone: '',
      address: '',
      lat: null,
      lng: null,
      note: '',
    },
  })

  const selectedService = watch('service')
  const currentSymptom = watch('symptom')
  const currentLat = watch('lat')
  const currentLng = watch('lng')

  const minDateString = getMinBookingDate()

  // เก็บ preview ล่าสุดไว้ใน ref เพื่อ revoke ตอน unmount (กัน memory leak ของ object URL)
  const previewsRef = useRef<string[]>([])
  useEffect(() => {
    previewsRef.current = imagePreviews
  }, [imagePreviews])
  useEffect(() => {
    return () => previewsRef.current.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    const files = input.files ? Array.from(input.files) : []
    // เคลียร์ค่า input เพื่อให้เลือกไฟล์เดิมซ้ำได้หลังลบออก
    input.value = ''
    if (files.length === 0) return

    const { accepted, errors: rejected } = selectValidImages(images.length, files)
    if (rejected.length > 0) {
      alert(rejected.join('\n'))
    }
    if (accepted.length === 0) return

    setImages((prev) => [...prev, ...accepted])
    setImagePreviews((prev) => [...prev, ...accepted.map((file) => URL.createObjectURL(file))])
  }

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index])
    setImages((prev) => prev.filter((_, i) => i !== index))
    setImagePreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const clearImages = () => {
    imagePreviews.forEach((url) => URL.revokeObjectURL(url))
    setImages([])
    setImagePreviews([])
  }

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('เบราว์เซอร์ไม่รองรับ Geolocation')
      return
    }
    setIsGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue('lat', pos.coords.latitude)
        setValue('lng', pos.coords.longitude)
        setIsGettingLocation(false)
      },
      (err) => {
        // ห้ามเติมพิกัดปลอม — แจ้งผู้ใช้แล้วให้กรอกที่อยู่เองแทน
        console.warn('Geolocation error:', err)
        alert(
          err.code === err.PERMISSION_DENIED
            ? 'ไม่ได้รับอนุญาตให้เข้าถึงตำแหน่ง กรุณากรอกที่อยู่ด้วยตนเอง'
            : 'ไม่สามารถระบุตำแหน่งปัจจุบันได้ กรุณากรอกที่อยู่ด้วยตนเอง'
        )
        setIsGettingLocation(false)
      },
      { timeout: 8000 }
    )
  }

  const onSubmit = async (data: BookingFormValues) => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const formData = new FormData()
      formData.append('service', data.service)
      formData.append('brand', data.brand)
      formData.append('symptom', data.symptom)
      formData.append('preferredDate', data.preferredDate)
      formData.append('customerName', data.customerName)
      formData.append('customerPhone', data.customerPhone)
      formData.append('address', data.address)

      if (data.lat !== null && data.lat !== undefined) {
        formData.append('lat', String(data.lat))
      }
      if (data.lng !== null && data.lng !== undefined) {
        formData.append('lng', String(data.lng))
      }
      if (data.note) {
        formData.append('note', data.note)
      }

      images.forEach((file) => {
        formData.append('images', file)
      })

      const response = await api.post<ApiResponse<Ticket>>('/tickets', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      if (response.data.success) {
        setCreatedTicket(response.data.data)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        setSubmitError(response.data.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล')
      }
    } catch (err: any) {
      setSubmitError(err.response?.data?.error || 'ไม่สามารถส่งข้อมูลได้ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyTrackingCode = () => {
    if (!createdTicket) return
    navigator.clipboard.writeText(createdTicket.trackingCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Success Confirmation Screen
  if (createdTicket) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <ScrollReveal direction="scale">
          <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-zinc-200/90 text-center relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-orange-500 via-amber-600 to-emerald-500" />

            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm animate-bounce">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/20 text-xs font-bold mb-3">
              บันทึกคำขอแจ้งซ่อมสำเร็จ
            </span>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 mb-2 tracking-tight">
              ขอบคุณที่ไว้วางใจ Plasom
            </h1>

            <p className="text-zinc-500 text-sm max-w-md mx-auto mb-8">
              ระบบได้ออกรหัสติดตามงานซ่อมให้คุณเรียบร้อยแล้ว สามารถใช้รหัสนี้เพื่อเช็คสถานะและแชทกับเจ้าหน้าที่ได้ทันที
            </p>

            {/* Tracking Code Command Box */}
            <Tilt3DCard maxTilt={4} className="bg-zinc-950 text-white rounded-3xl p-6 max-w-md mx-auto mb-8 border border-zinc-800 shadow-lg">
              <p className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 mb-2">
                YOUR TRACKING CODE
              </p>
              <div className="flex items-center justify-center gap-3">
                <span className="font-mono text-3xl font-black text-orange-400 tracking-wider">
                  {createdTicket.trackingCode}
                </span>
                <button
                  type="button"
                  onClick={copyTrackingCode}
                  className="p-2.5 rounded-xl bg-zinc-900 text-zinc-200 hover:text-white hover:bg-zinc-800 border border-zinc-700 transition-colors cursor-pointer"
                  title="คัดลอกรหัส"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              {copied && (
                <p className="text-xs text-emerald-400 font-medium mt-2">✓ คัดลอกรหัสลงคลิปบอร์ดแล้ว</p>
              )}
            </Tilt3DCard>

            {/* Summary Details */}
            <div className="bg-zinc-50 rounded-2xl p-5 max-w-md mx-auto text-left text-xs space-y-2.5 mb-8 border border-zinc-200/80">
              <div className="flex justify-between py-1 border-b border-zinc-200/70">
                <span className="text-zinc-500">ประเภทบริการ:</span>
                <span className="font-bold text-zinc-900">
                  {createdTicket.service === 'CLEANING'
                    ? 'ล้างแอร์'
                    : createdTicket.service === 'REPAIR'
                    ? 'ซ่อมแอร์'
                    : 'ติดตั้ง/ย้ายแอร์'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-200/70">
                <span className="text-zinc-500">ยี่ห้อแอร์:</span>
                <span className="font-semibold text-zinc-900">{createdTicket.brand}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-200/70">
                <span className="text-zinc-500">วันนัดหมาย:</span>
                <span className="font-semibold text-zinc-900">{formatDate(createdTicket.preferredDate)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-200/70">
                <span className="text-zinc-500">ผู้ติดต่อ:</span>
                <span className="font-semibold text-zinc-900">
                  {createdTicket.customerName} ({createdTicket.customerPhone})
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-zinc-500">สถานที่:</span>
                <span className="font-semibold text-zinc-900 text-right truncate max-w-[220px]">
                  {createdTicket.address}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
              <Link
                to={`/track/${createdTicket.trackingCode}`}
                className="btn-shimmer w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl font-bold text-sm text-white shadow-lg shadow-orange-500/20 transition-all"
              >
                <span>ติดตามสถานะงานซ่อม</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                onClick={() => {
                  setCreatedTicket(null)
                  clearImages()
                }}
                className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors cursor-pointer"
              >
                แจ้งซ่อมรายการใหม่
              </button>
            </div>
          </div>
        </ScrollReveal>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <ScrollReveal className="text-center mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 text-orange-700 border border-orange-500/20 text-xs font-bold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-orange-600" />
          <span>INTERACTIVE BOOKING FORM</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-950 tracking-tight">
          แจ้งซ่อมและนัดหมายช่างแอร์
        </h1>
        <p className="text-zinc-500 text-sm mt-2 max-w-lg mx-auto">
          คลิกเลือกการ์ดประเภทบริการ หรือกดปุ่มลัดอาการเสียเพื่อให้กรอกข้อมูลได้สะดวกรวดเร็วขึ้น
        </p>
      </ScrollReveal>

      {submitError && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">เกิดข้อผิดพลาด</p>
            <p>{submitError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Section 1: 3D Tilt Service Type Selection */}
        <ScrollReveal delay={50}>
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200/90 shadow-xs">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-100">
              <span className="w-7 h-7 rounded-xl bg-zinc-950 text-white text-xs font-mono font-bold flex items-center justify-center">
                01
              </span>
              <div>
                <h2 className="text-base font-extrabold text-zinc-950">เลือกประเภทบริการที่ต้องการ</h2>
                <p className="text-xs text-zinc-400">คลิกเลือกรูปแบบบริการที่คุณต้องการนัดหมาย</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  id: 'CLEANING',
                  title: 'ล้างแอร์',
                  desc: 'ล้างใหญ่ ฆ่าเชื้อโรค ลดกลิ่นอับ',
                  price: 'เริ่มต้น ฿590 / เครื่อง',
                  icon: Wind,
                },
                {
                  id: 'REPAIR',
                  title: 'ซ่อมแอร์',
                  desc: 'แอร์ไม่เย็น น้ำหยด มีเสียงดัง',
                  price: 'ตรวจเช็คเริ่มต้น ฿400',
                  icon: Wrench,
                },
                {
                  id: 'INSTALLATION',
                  title: 'ติดตั้ง / ย้ายแอร์',
                  desc: 'ติดตั้งแอร์ใหม่ รื้อถอน ย้ายจุด',
                  price: 'เริ่มต้น ฿2,500 / ชุด',
                  icon: PenTool,
                },
              ].map((item) => {
                const Icon = item.icon
                const isSelected = selectedService === item.id
                return (
                  <Tilt3DCard
                    key={item.id}
                    maxTilt={6}
                    onClick={() => setValue('service', item.id as ServiceType)}
                    className={`rounded-2xl border-2 cursor-pointer transition-all p-5 ${
                      isSelected
                        ? 'border-zinc-950 bg-zinc-950 text-white shadow-xl'
                        : 'border-zinc-200 hover:border-zinc-300 bg-zinc-50/50 text-zinc-900'
                    }`}
                  >
                    <input type="radio" value={item.id} {...register('service')} className="sr-only" />
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className={`p-2.5 rounded-xl transition-colors ${
                          isSelected ? 'bg-orange-400 text-zinc-950' : 'bg-orange-100/80 text-orange-600'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      {isSelected && <CheckCircle2 className="w-5 h-5 text-orange-400" />}
                    </div>
                    <h3 className="font-bold text-base">{item.title}</h3>
                    <p className={`text-xs mt-1 ${isSelected ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      {item.desc}
                    </p>
                    <p
                      className={`text-xs font-mono font-bold mt-4 ${
                        isSelected ? 'text-orange-400' : 'text-zinc-900'
                      }`}
                    >
                      {item.price}
                    </p>
                  </Tilt3DCard>
                )
              })}
            </div>
            {errors.service && <p className="text-xs text-rose-600 mt-2">{errors.service.message}</p>}
          </div>
        </ScrollReveal>

        {/* Section 2: Air Condition Info & Quick Symptom Chips */}
        <ScrollReveal delay={100}>
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200/90 shadow-xs">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-100">
              <span className="w-7 h-7 rounded-xl bg-zinc-950 text-white text-xs font-mono font-bold flex items-center justify-center">
                02
              </span>
              <div>
                <h2 className="text-base font-extrabold text-zinc-950">ข้อมูลเครื่องปรับอากาศและอาการ</h2>
                <p className="text-xs text-zinc-400">ระบุยี่ห้อแอร์ หรือกดปุ่มลัดเพื่อกรอกอาการอัตโนมัติ</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  ยี่ห้อเครื่องปรับอากาศ <span className="text-rose-500">*</span>
                </label>
                <select
                  {...register('brand')}
                  className="w-full px-4 py-3 text-sm bg-zinc-50 border border-zinc-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-hidden transition"
                >
                  {BRAND_OPTIONS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                {errors.brand && <p className="text-xs text-rose-600 mt-1">{errors.brand.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                  <span>
                    วันที่ต้องการรับบริการ <span className="text-rose-500">*</span>
                  </span>
                </label>
                <input
                  type="date"
                  min={minDateString}
                  {...register('preferredDate')}
                  className="w-full px-4 py-3 text-sm bg-zinc-50 border border-zinc-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-hidden transition"
                />
                {errors.preferredDate && (
                  <p className="text-xs text-rose-600 mt-1">{errors.preferredDate.message}</p>
                )}
              </div>

              <div className="sm:col-span-2 space-y-2.5">
                <label className="block text-xs font-bold text-zinc-700">
                  อาการที่พบ หรือรายละเอียดงาน <span className="text-rose-500">*</span>
                </label>

                {/* Interactive Quick-Fill Symptom Chips */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-700 mr-1">
                    <Wand2 className="w-3 h-3" />
                    กดเลือกอาการด่วน:
                  </span>
                  {QUICK_SYMPTOMS[selectedService]?.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setValue('symptom', chip, { shouldValidate: true })}
                      className={`text-[11px] px-3 py-1 rounded-full border transition-all cursor-pointer ${
                        currentSymptom === chip
                          ? 'bg-zinc-950 text-white border-zinc-950 font-semibold'
                          : 'bg-zinc-50 hover:bg-orange-50 text-zinc-600 hover:text-orange-700 border-zinc-200 hover:border-orange-300'
                      }`}
                    >
                      + {chip}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={3}
                  placeholder="เช่น แอร์ไม่เย็น มีแต่ลมธรรมดาออกมา มีน้ำหยดตรงคอยล์เย็น หรือต้องการล้างแอร์ 2 เครื่อง..."
                  {...register('symptom')}
                  className="w-full px-4 py-3 text-sm bg-zinc-50 border border-zinc-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-hidden transition"
                />
                {errors.symptom && <p className="text-xs text-rose-600 mt-1">{errors.symptom.message}</p>}
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Section 3: Customer Info & Address */}
        <ScrollReveal delay={150}>
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200/90 shadow-xs">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-100">
              <span className="w-7 h-7 rounded-xl bg-zinc-950 text-white text-xs font-mono font-bold flex items-center justify-center">
                03
              </span>
              <div>
                <h2 className="text-base font-extrabold text-zinc-950">ข้อมูลผู้ติดต่อและสถานที่</h2>
                <p className="text-xs text-zinc-400">ระบุชื่อ เบอร์โทร และพิกัดหน้างานเพื่อให้ช่างเดินทางได้แม่นยำ</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-zinc-400" />
                  <span>
                    ชื่อ - นามสกุล ผู้ติดต่อ <span className="text-rose-500">*</span>
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="เช่น สมชาย ใจดี"
                  {...register('customerName')}
                  className="w-full px-4 py-3 text-sm bg-zinc-50 border border-zinc-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-hidden transition"
                />
                {errors.customerName && (
                  <p className="text-xs text-rose-600 mt-1">{errors.customerName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-zinc-400" />
                  <span>
                    เบอร์โทรศัพท์ติดต่อ <span className="text-rose-500">*</span>
                  </span>
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="เช่น 0812345678"
                  {...register('customerPhone', {
                    onChange: (e) => {
                      const digits = sanitizePhoneInput(e.target.value)
                      e.target.value = digits
                      setValue('customerPhone', digits, { shouldValidate: true })
                    },
                  })}
                  className="w-full px-4 py-3 text-sm font-mono bg-zinc-50 border border-zinc-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-hidden transition"
                />
                {errors.customerPhone && (
                  <p className="text-xs text-rose-600 mt-1">{errors.customerPhone.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-zinc-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                  <span>
                    ที่อยู่สถานที่ติดตั้ง/หน้างาน <span className="text-rose-500">*</span>
                  </span>
                </label>
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={isGettingLocation}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-700 hover:bg-orange-100 text-xs font-bold transition cursor-pointer"
                >
                  <Navigation className="w-3 h-3" />
                  <span>{isGettingLocation ? 'กำลังระบุพิกัด...' : 'ดึงพิกัดปัจจุบัน (GPS)'}</span>
                </button>
              </div>

              <textarea
                rows={3}
                placeholder="บ้านเลขที่, ชื่อหมู่บ้าน/คอนโด, ซอย, ถนน, แขวง/ตำบล, เขต/อำเภอ, จังหวัด..."
                {...register('address')}
                className="w-full px-4 py-3 text-sm bg-zinc-50 border border-zinc-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-hidden transition"
              />
              {errors.address && <p className="text-xs text-rose-600 mt-1">{errors.address.message}</p>}

              {currentLat && currentLng && (
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
                  <span className="font-mono font-medium">
                    📍 GPS: {currentLat.toFixed(5)}, {currentLng.toFixed(5)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setValue('lat', null)
                      setValue('lng', null)
                    }}
                    className="text-zinc-500 hover:text-rose-600 text-xs font-bold"
                  >
                    ลบพิกัด
                  </button>
                </div>
              )}
            </div>
          </div>
        </ScrollReveal>

        {/* Section 4: Upload Photos & Note */}
        <ScrollReveal delay={200}>
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200/90 shadow-xs">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-100">
              <span className="w-7 h-7 rounded-xl bg-zinc-950 text-white text-xs font-mono font-bold flex items-center justify-center">
                04
              </span>
              <div>
                <h2 className="text-base font-extrabold text-zinc-950">แนบรูปภาพและหมายเหตุเพิ่มเติม</h2>
                <p className="text-xs text-zinc-400">อัปโหลดรูปแอร์หรือจุดติดตั้ง (สูงสุด {MAX_IMAGES} รูป)</p>
              </div>
            </div>

            <div className="mb-6">
              <div className="border-2 border-dashed border-zinc-200 hover:border-orange-500 rounded-2xl p-7 text-center transition-colors cursor-pointer bg-zinc-50/70 relative group">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={images.length >= MAX_IMAGES}
                />
                <div className="w-12 h-12 rounded-2xl bg-white border border-zinc-200 flex items-center justify-center mx-auto mb-3 text-zinc-500 group-hover:text-orange-600 group-hover:scale-110 transition">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-zinc-800">คลิกเพื่อเลือกรูปภาพ หรือลากไฟล์มาวางที่นี่</p>
                <p className="text-xs text-zinc-400 mt-1">รองรับ JPG, PNG, WEBP (สูงสุด {MAX_IMAGES} รูป รูปละไม่เกิน 5MB)</p>
              </div>

              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
                  {imagePreviews.map((preview, idx) => (
                    <div
                      key={idx}
                      className="relative group rounded-2xl overflow-hidden border border-zinc-200 aspect-square shadow-2xs"
                    >
                      <img src={preview} alt={`preview ${idx}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1.5 right-1.5 p-1.5 bg-zinc-950/80 text-white rounded-full hover:bg-rose-600 transition"
                        title="ลบรูป"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1.5">หมายเหตุเพิ่มเติมถึงช่าง (ถ้ามี)</label>
              <input
                type="text"
                placeholder="เช่น สะดวกช่วงเช้า, ต้องแลกบัตรนิติบุคคลก่อนขึ้นอาคาร"
                {...register('note')}
                className="w-full px-4 py-3 text-sm bg-zinc-50 border border-zinc-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-hidden transition"
              />
            </div>
          </div>
        </ScrollReveal>

        {/* Submit Bar with Magnetic Ripple Button */}
        <ScrollReveal delay={250}>
          <div className="bg-zinc-950 text-white rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3 text-xs text-zinc-300">
              <ShieldCheck className="w-5 h-5 text-orange-400 shrink-0" />
              <span>รับประกันงานซ่อม 90 วัน • ประเมินราคาก่อนซ่อมทุกครั้ง</span>
            </div>

            <MagneticButton
              type="submit"
              disabled={isSubmitting}
              className="btn-shimmer w-full sm:w-auto px-8 py-3.5 rounded-2xl font-bold text-sm text-white shadow-lg shadow-orange-500/20 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังบันทึกข้อมูล...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>ยืนยันการแจ้งซ่อม</span>
                </>
              )}
            </MagneticButton>
          </div>
        </ScrollReveal>
      </form>
    </div>
  )
}
