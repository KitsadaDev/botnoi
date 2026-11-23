// ===========================
// Type definitions สำหรับ API responses
// ===========================

export type TicketStatus = 'SUBMITTED' | 'RECEIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type ServiceType = 'CLEANING' | 'REPAIR' | 'INSTALLATION' | 'IT_REPAIR'

// ลำดับประเภทบริการทั้งหมด (ใช้ตรวจค่าจาก URL / สร้างตัวเลือก) ต้องตรงกับ enum ServiceType ใน server/prisma/schema.prisma
export const SERVICE_TYPES: ServiceType[] = ['CLEANING', 'REPAIR', 'INSTALLATION', 'IT_REPAIR']
export type Role = 'CUSTOMER' | 'STAFF' | 'ADMIN'

export type BusinessType = 'AC_AND_IT' | 'AC_SERVICE' | 'IT_SUPPORT' | 'APPLIANCE' | 'GENERAL_REPAIR'
export type ChatChannel = 'CHATBOT' | 'LINE' | 'VOICEBOT' | 'WEB'

export interface User {
  id: string
  name: string
  phone: string
  role: Role
  createdAt: string
}

export interface ProjectSummaryStats {
  totalTickets: number
  openTickets: number
  techniciansCount: number
  conversationsCount: number
  reviewsCount: number
  avgRating: number | null
}

export interface Project {
  id: string
  name: string
  slug: string
  description: string | null
  businessType: BusinessType | string
  phone: string | null
  lineOaId: string | null
  botnoiBotId: string | null
  hasWebhookSecret?: boolean
  isActive: boolean
  ownerId: string
  owner?: { id: string; name: string }
  createdAt: string
  updatedAt: string
  stats?: ProjectSummaryStats
}

export interface PublicProject {
  id: string
  name: string
  slug: string
  description: string | null
  businessType: string
  phone: string | null
  lineOaId: string | null
  isActive: boolean
}

export interface Technician {
  id: string
  name: string
  phone: string
  area: string
  specialty?: string | null
  isAvailable?: boolean
  projectId?: string | null
  createdAt?: string
  stats?: {
    totalJobs: number
    activeJobs: number
    completedJobs: number
    avgRating: number | null
  }
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

export interface SatisfactionReview {
  id: string
  rating: number
  speedRating: number | null
  serviceRating: number | null
  comment: string | null
  tags: string[]
  customerName: string
  ticketId?: string
  projectId?: string | null
  createdAt: string
  ticket?: {
    id: string
    trackingCode: string
    service: ServiceType
    brand: string
    technician: { id: string; name: string; area: string } | null
  }
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
  source?: string
  customerName: string
  customerPhone: string
  userId: string | null
  projectId?: string | null
  project?: { id: string; name: string; slug: string; phone: string | null } | null
  technicianId: string | null
  technician: Technician | null
  images: TicketImage[]
  statusLogs: StatusLog[]
  review?: SatisfactionReview | null
  createdAt: string
  updatedAt: string
}

export interface UnifiedChatMessage {
  id: string
  sender: 'CUSTOMER' | 'BOT' | 'STAFF' | string
  senderName: string
  text: string
  createdAt: string
}

export interface UnifiedConversation {
  id: string
  kind: 'CHATBOT_LOG' | 'TICKET_CHAT'
  channel: ChatChannel | string
  status: 'OPEN' | 'RESOLVED' | string
  customerName: string
  customerPhone: string | null
  externalUserId: string | null
  summary: string
  ticket: {
    id: string
    trackingCode: string
    status: TicketStatus
    service: ServiceType
  } | null
  lastMessageAt: string
  messages: UnifiedChatMessage[]
}

export interface SatisfactionAnalytics {
  summary: {
    avgRating: number
    avgSpeed: number
    avgService: number
    csatRate: number
    totalReviews: number
    completedTickets: number
    responseRate: number
  }
  distribution: { stars: number; count: number; percent: number }[]
  byService: { service: ServiceType; avgRating: number; count: number }[]
  byTechnician: { id: string; name: string; area: string; avgRating: number; count: number }[]
  topTags: { tag: string; count: number }[]
  reviews: SatisfactionReview[]
}

export interface ProjectChannelStats {
  total: number
  chat: number
  call: number
  web: number
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
  message?: string
}

// จำนวนเคสแยกตามสถานะ (นับจากทุกเคส ไม่ขึ้นกับ filter)
export type TicketCounts = Record<TicketStatus | 'total', number>

// Label สำหรับแสดงผลภาษาไทย
export const SERVICE_LABELS: Record<ServiceType, string> = {
  CLEANING: 'ล้างแอร์',
  REPAIR: 'ซ่อมแอร์',
  INSTALLATION: 'ติดตั้ง/ย้ายแอร์',
  IT_REPAIR: 'ซ่อมอุปกรณ์ไอที',
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
  RECEIVED: 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-500/30',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-500/30',
  COMPLETED: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-500/30',
  CANCELLED: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-500/30',
}

export const BUSINESS_TYPE_LABELS: Record<string, string> = {
  AC_AND_IT: 'บริการแอร์ & อุปกรณ์ไอที',
  AC_SERVICE: 'ศูนย์บริการเครื่องปรับอากาศ',
  IT_SUPPORT: 'ศูนย์ซ่อมคอมพิวเตอร์และไอที',
  APPLIANCE: 'ซ่อมเครื่องใช้ไฟฟ้า',
  GENERAL_REPAIR: 'บริการช่างและซ่อมบำรุงทั่วไป',
}

export const CHANNEL_LABELS: Record<string, string> = {
  CHATBOT: 'AI Chatbot',
  LINE: 'LINE OA',
  VOICEBOT: 'AI Voicebot',
  WEB: 'เว็บไซต์ (Live Chat)',
}
