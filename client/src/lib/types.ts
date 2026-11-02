// ===========================
// Type definitions สำหรับ API responses
// ===========================

export type TicketStatus = 'SUBMITTED' | 'RECEIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type ServiceType = 'CLEANING' | 'REPAIR' | 'INSTALLATION'
export type Role = 'CUSTOMER' | 'STAFF' | 'ADMIN'

export interface User {
  id: string
  name: string
  phone: string
  role: Role
  createdAt: string
}

export interface Technician {
  id: string
  name: string
  phone: string
  area: string
}

export interface TicketImage {
  id: string
  url: string
}

export interface StatusLog {
  id: string
  status: TicketStatus
  note: string | null
  ticketId: string
  createdAt: string
}

export interface Message {
  id: string
  text: string
  fromStaff: boolean
  createdAt: string
  user: { id: string; name: string } | null
}

export interface Ticket {
  id: string
  trackingCode: string
  service: ServiceType
  brand: string
  symptom: string
  address: string
  lat: number | null
  lng: number | null
  preferredDate: string
  note: string | null
  status: TicketStatus
  customerName: string
  customerPhone: string
  userId: string | null
  technicianId: string | null
  technician: Technician | null
  images: TicketImage[]
  statusLogs: StatusLog[]
  createdAt: string
  updatedAt: string
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
}

// Label สำหรับแสดงผลภาษาไทย
export const SERVICE_LABELS: Record<ServiceType, string> = {
  CLEANING: 'ล้างแอร์',
  REPAIR: 'ซ่อมแอร์',
  INSTALLATION: 'ติดตั้ง/ย้ายแอร์',
}

export const STATUS_LABELS: Record<TicketStatus, string> = {
  SUBMITTED: 'ส่งเรื่องแล้ว',
  RECEIVED: 'รับเรื่องแล้ว',
  IN_PROGRESS: 'ช่างกำลังเข้าซ่อม',
  COMPLETED: 'เสร็จสิ้น',
  CANCELLED: 'ยกเลิก',
}

export const STATUS_COLORS: Record<TicketStatus, string> = {
  SUBMITTED: 'bg-zinc-100 text-zinc-700 ring-1 ring-inset ring-zinc-300/80',
  RECEIVED: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-500/30',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-500/30',
  COMPLETED: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-500/30',
  CANCELLED: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-500/30',
}
