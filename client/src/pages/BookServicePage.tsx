import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
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
  Image as ImageIcon,
  X,
  UploadCloud,
  CheckCircle2,
  Copy,
  ArrowRight,
  AlertCircle,
  Loader2,
  Navigation,
} from 'lucide-react'
import api from '../lib/api'
import type { ApiResponse, Ticket, ServiceType } from '../lib/types'

// Validation Schema
const bookingSchema = z.object({
  service: z.enum(['CLEANING', 'REPAIR', 'INSTALLATION'], {
    errorMap: () => ({ message: 'กรุณาเลือกประเภทบริการ' }),
  }),
  brand: z.string().min(1, 'กรุณาระบุยี่ห้อแอร์'),
  symptom: z.string().min(5, 'กรุณาระบุอาการเบื้องต้นอย่างน้อย 5 ตัวอักษร'),
  preferredDate: z.string().min(1, 'กรุณาเลือกวันที่ต้องการรับบริการ'),
  customerName: z.string().min(2, 'กรุณาระบุชื่อ-นามสกุล'),
  customerPhone: z
    .string()
    .min(9, 'กรุณาระบุเบอร์โทรศัพท์ที่ถูกต้อง')
    .max(10, 'เบอร์โทรศัพท์ไม่เกิน 10 หลัก')
    .regex(/^[0-9]+$/, 'เบอร์โทรศัพท์ต้องเป็นตัวเลขเท่านั้น'),
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

export const BookServicePage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
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
  const currentLat = watch('lat')
  const currentLng = watch('lng')

  // Set default minimum date to tomorrow
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDateString = tomorrow.toISOString().split('T')[0]

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const files = Array.from(e.target.files)
    if (images.length + files.length > 5) {
      alert('สามารถอัปโหลดรูปภาพได้สูงสุด 5 รูปเท่านั้น')
      return
    }

    const newFiles = [...images, ...files].slice(0, 5)
    setImages(newFiles)

    // Generate previews
    const newPreviews = newFiles.map((file) => URL.createObjectURL(file))
    setImagePreviews(newPreviews)
  }

  const removeImage = (index: number) => {
    const updatedImages = images.filter((_, i) => i !== index)
    const updatedPreviews = imagePreviews.filter((_, i) => i !== index)
    setImages(updatedImages)
    setImagePreviews(updatedPreviews)
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
        console.warn('Geolocation error:', err)
        // Fallback Bangkok center coords for demonstration
        setValue('lat', 13.7563)
        setValue('lng', 100.5018)
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

      // Attach image files
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

  // If successfully created, display Success Confirmation screen
  if (createdTicket) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-100 text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold mb-2">
            บันทึกการแจ้งซ่อมเรียบร้อยแล้ว
          </span>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
            ขอบคุณที่ไว้วางใจ CoolCare Pro
          </h1>

          <p className="text-slate-600 text-sm max-w-md mx-auto mb-8">
            ระบบได้รับข้อมูลการแจ้งซ่อมของคุณแล้ว เจ้าหน้าที่จะตรวจสอบและประสานงานช่างในพื้นที่ให้เร็วที่สุด
          </p>

          {/* Tracking Code Box */}
          <div className="bg-blue-50/80 border-2 border-dashed border-[#003882]/40 rounded-2xl p-6 max-w-md mx-auto mb-8">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              รหัสติดตามงานซ่อมของคุณ (Tracking Code)
            </p>
            <div className="flex items-center justify-center gap-3">
              <span className="font-mono text-3xl font-black text-[#003882] tracking-wider">
                {createdTicket.trackingCode}
              </span>
              <button
                type="button"
                onClick={copyTrackingCode}
                className="p-2 rounded-lg bg-white text-[#003882] hover:bg-blue-100 border border-blue-200 transition-colors shadow-xs"
                title="คัดลอกรหัส"
              >
                <Copy className="w-5 h-5" />
              </button>
            </div>
            {copied && <p className="text-xs text-emerald-600 font-medium mt-2">✓ คัดลอกรหัสเรียบร้อยแล้ว</p>}
          </div>

          {/* Summary Details */}
          <div className="bg-slate-50 rounded-2xl p-5 max-w-md mx-auto text-left text-xs space-y-2 mb-8 border border-slate-200">
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500">บริการ:</span>
              <span className="font-bold text-slate-800">
                {createdTicket.service === 'CLEANING'
                  ? 'ล้างแอร์'
                  : createdTicket.service === 'REPAIR'
                  ? 'ซ่อมแอร์'
                  : 'ติดตั้ง/ย้ายแอร์'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500">ยี่ห้อแอร์:</span>
              <span className="font-semibold text-slate-800">{createdTicket.brand}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500">วันนัดหมาย:</span>
              <span className="font-semibold text-slate-800">{createdTicket.preferredDate}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500">ผู้ติดต่อ:</span>
              <span className="font-semibold text-slate-800">
                {createdTicket.customerName} ({createdTicket.customerPhone})
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">สถานที่:</span>
              <span className="font-semibold text-slate-800 text-right truncate max-w-[200px]">
                {createdTicket.address}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
            <Link
              to={`/track/${createdTicket.trackingCode}`}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold text-sm bg-[#003882] hover:bg-[#002866] text-white shadow-md transition-all"
            >
              <span>ไปที่หน้าติดตามสถานะ</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={() => {
                setCreatedTicket(null)
                setImages([])
                setImagePreviews([])
              }}
              className="w-full py-3 px-6 rounded-xl font-semibold text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              แจ้งซ่อมเครื่องอื่นเพิ่ม
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Page Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#003882] text-xs font-semibold mb-3">
          <Wrench className="w-3.5 h-3.5" />
          <span>นัดหมายบริการมาตรฐาน Carrier Style</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          แบบฟอร์มแจ้งซ่อมและนัดหมายบริการ
        </h1>
        <p className="text-slate-500 text-sm mt-2 max-w-lg mx-auto">
          กรุณากรอกข้อมูลเกี่ยวกับเครื่องปรับอากาศและอาการที่พบ เพื่อให้เจ้าหน้าที่จัดเตรียมอะไหล่และส่งช่างได้ตรงจุด
        </p>
      </div>

      {submitError && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">เกิดข้อผิดพลาด</p>
            <p>{submitError}</p>
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Section 1: Service Type Selection */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-slate-100">
            <span className="w-7 h-7 rounded-full bg-[#003882] text-white text-xs font-bold flex items-center justify-center">
              1
            </span>
            <h2 className="text-lg font-bold text-slate-900">เลือกประเภทบริการที่ต้องการ</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Service: Cleaning */}
            <label
              className={`relative flex flex-col p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                selectedService === 'CLEANING'
                  ? 'border-[#003882] bg-blue-50/60 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <input type="radio" value="CLEANING" {...register('service')} className="sr-only" />
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2.5 rounded-xl ${selectedService === 'CLEANING' ? 'bg-[#003882] text-white' : 'bg-sky-50 text-sky-600'}`}>
                  <Wind className="w-5 h-5" />
                </div>
                {selectedService === 'CLEANING' && (
                  <CheckCircle2 className="w-5 h-5 text-[#003882]" />
                )}
              </div>
              <h3 className="font-bold text-slate-900 text-base">ล้างแอร์</h3>
              <p className="text-xs text-slate-500 mt-1">ล้างทำความสะอาด เติมน้ำยา ฆ่าเชื้อโรค</p>
              <p className="text-xs font-bold text-[#003882] mt-3">เริ่มต้น ฿590</p>
            </label>

            {/* Service: Repair */}
            <label
              className={`relative flex flex-col p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                selectedService === 'REPAIR'
                  ? 'border-[#003882] bg-blue-50/60 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <input type="radio" value="REPAIR" {...register('service')} className="sr-only" />
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2.5 rounded-xl ${selectedService === 'REPAIR' ? 'bg-[#003882] text-white' : 'bg-blue-50 text-[#003882]'}`}>
                  <Wrench className="w-5 h-5" />
                </div>
                {selectedService === 'REPAIR' && (
                  <CheckCircle2 className="w-5 h-5 text-[#003882]" />
                )}
              </div>
              <h3 className="font-bold text-slate-900 text-base">ซ่อมแอร์</h3>
              <p className="text-xs text-slate-500 mt-1">แอร์ไม่เย็น น้ำหยด มีเสียงดัง เปิดไม่ติด</p>
              <p className="text-xs font-bold text-[#003882] mt-3">ตรวจเช็คเริ่มต้น ฿400</p>
            </label>

            {/* Service: Installation */}
            <label
              className={`relative flex flex-col p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                selectedService === 'INSTALLATION'
                  ? 'border-[#003882] bg-blue-50/60 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <input type="radio" value="INSTALLATION" {...register('service')} className="sr-only" />
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2.5 rounded-xl ${selectedService === 'INSTALLATION' ? 'bg-[#003882] text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                  <PenTool className="w-5 h-5" />
                </div>
                {selectedService === 'INSTALLATION' && (
                  <CheckCircle2 className="w-5 h-5 text-[#003882]" />
                )}
              </div>
              <h3 className="font-bold text-slate-900 text-base">ติดตั้ง / ย้ายแอร์</h3>
              <p className="text-xs text-slate-500 mt-1">ติดตั้งเครื่องใหม่ รื้อถอน ย้ายตำแหน่ง</p>
              <p className="text-xs font-bold text-[#003882] mt-3">เริ่มต้น ฿2,500</p>
            </label>
          </div>
          {errors.service && <p className="text-xs text-red-600 mt-2">{errors.service.message}</p>}
        </div>

        {/* Section 2: Air Condition Info & Symptom */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-slate-100">
            <span className="w-7 h-7 rounded-full bg-[#003882] text-white text-xs font-bold flex items-center justify-center">
              2
            </span>
            <h2 className="text-lg font-bold text-slate-900">ข้อมูลเครื่องปรับอากาศและอาการ</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Brand */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                ยี่ห้อเครื่องปรับอากาศ <span className="text-red-500">*</span>
              </label>
              <select
                {...register('brand')}
                className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#003882] focus:border-[#003882] outline-hidden"
              >
                {BRAND_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              {errors.brand && <p className="text-xs text-red-600 mt-1">{errors.brand.message}</p>}
            </div>

            {/* Preferred Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>วันที่ต้องการรับบริการ <span className="text-red-500">*</span></span>
              </label>
              <input
                type="date"
                min={minDateString}
                {...register('preferredDate')}
                className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#003882] focus:border-[#003882] outline-hidden"
              />
              {errors.preferredDate && (
                <p className="text-xs text-red-600 mt-1">{errors.preferredDate.message}</p>
              )}
            </div>

            {/* Symptom Description */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                อาการที่พบ หรือรายละเอียดงาน <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="เช่น แอร์ไม่เย็น มีแต่ลมร้อนออกมา มีเสียงดังผิดปกติ หรือต้องการล้างใหญ่ 2 เครื่อง..."
                {...register('symptom')}
                className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#003882] focus:border-[#003882] outline-hidden"
              />
              {errors.symptom && <p className="text-xs text-red-600 mt-1">{errors.symptom.message}</p>}
            </div>
          </div>
        </div>

        {/* Section 3: Customer Info & Address */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-slate-100">
            <span className="w-7 h-7 rounded-full bg-[#003882] text-white text-xs font-bold flex items-center justify-center">
              3
            </span>
            <h2 className="text-lg font-bold text-slate-900">ข้อมูลผู้ติดต่อและสถานที่</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
            {/* Customer Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>ชื่อ - นามสกุล ผู้ติดต่อ <span className="text-red-500">*</span></span>
              </label>
              <input
                type="text"
                placeholder="เช่น สมชาย ใจดี"
                {...register('customerName')}
                className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#003882] focus:border-[#003882] outline-hidden"
              />
              {errors.customerName && (
                <p className="text-xs text-red-600 mt-1">{errors.customerName.message}</p>
              )}
            </div>

            {/* Customer Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span>เบอร์โทรศัพท์ติดต่อ <span className="text-red-500">*</span></span>
              </label>
              <input
                type="tel"
                placeholder="เช่น 0812345678"
                {...register('customerPhone')}
                className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#003882] focus:border-[#003882] outline-hidden"
              />
              {errors.customerPhone && (
                <p className="text-xs text-red-600 mt-1">{errors.customerPhone.message}</p>
              )}
            </div>
          </div>

          {/* Address & GPS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span>ที่อยู่สถานที่ติดตั้ง/หน้างาน <span className="text-red-500">*</span></span>
              </label>
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={isGettingLocation}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#003882] hover:underline"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>{isGettingLocation ? 'กำลังระบุพิกัด...' : 'ดึงพิกัดปัจจุบัน (GPS)'}</span>
              </button>
            </div>

            <textarea
              rows={3}
              placeholder="บ้านเลขที่, ชื่อหมู่บ้าน/คอนโด, ซอย, ถนน, แขวง/ตำบล, เขต/อำเภอ, จังหวัด..."
              {...register('address')}
              className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#003882] focus:border-[#003882] outline-hidden"
            />
            {errors.address && <p className="text-xs text-red-600 mt-1">{errors.address.message}</p>}

            {currentLat && currentLng && (
              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
                <span>📍 บันทึกพิกัด GPS: {currentLat.toFixed(5)}, {currentLng.toFixed(5)}</span>
                <button
                  type="button"
                  onClick={() => {
                    setValue('lat', null)
                    setValue('lng', null)
                  }}
                  className="text-slate-400 hover:text-red-500 text-xs font-semibold"
                >
                  ลบพิกัด
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Section 4: Upload Photos & Note */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-slate-100">
            <span className="w-7 h-7 rounded-full bg-[#003882] text-white text-xs font-bold flex items-center justify-center">
              4
            </span>
            <h2 className="text-lg font-bold text-slate-900">แนบรูปภาพและหมายเหตุเพิ่มเติม</h2>
          </div>

          {/* Upload Area */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-700 mb-2">
              รูปภาพจุดที่ติดตั้งหรืออาการเสีย (สูงสุด 5 รูป)
            </label>

            <div className="border-2 border-dashed border-slate-300 hover:border-[#003882] rounded-2xl p-6 text-center transition-colors cursor-pointer bg-slate-50/60 relative">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={images.length >= 5}
              />
              <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">
                คลิกเพื่อเลือกรูปภาพ หรือลากไฟล์มาวางที่นี่
              </p>
              <p className="text-xs text-slate-400 mt-1">รองรับ JPG, PNG, WEBP (สูงสุด 5 รูป รูปละไม่เกิน 5MB)</p>
            </div>

            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
                {imagePreviews.map((preview, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-square">
                    <img src={preview} alt={`preview ${idx}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 p-1 bg-red-600/80 text-white rounded-full hover:bg-red-700 transition"
                      title="ลบรูป"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Additional Note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">หมายเหตุเพิ่มเติม (ถ้ามี)</label>
            <input
              type="text"
              placeholder="เช่น สะดวกช่วงเช้า, ห้ามส่งเสียงดังหลัง 16:00 น."
              {...register('note')}
              className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#003882] focus:border-[#003882] outline-hidden"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <p className="text-xs text-slate-500 text-center sm:text-left">
            * การกดปุ่มยืนยันแสดงว่าคุณยอมรับเงื่อนไขการบริการและการติดต่อจากเจ้าหน้าที่
          </p>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm text-white bg-[#003882] hover:bg-[#002866] shadow-lg shadow-blue-900/20 disabled:opacity-50 transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังส่งข้อมูล...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>ยืนยันการแจ้งซ่อม</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
