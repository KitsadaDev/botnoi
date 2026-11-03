// ===========================
// Helpers จัดรูปแบบวันที่ (ไม่พึ่ง React เพื่อให้เทสต์ง่าย)
// ===========================

/** แปลงวันที่เป็น YYYY-MM-DD ตามเวลาท้องถิ่น (ห้ามใช้ toISOString เพราะเป็น UTC แล้ววันเลื่อน) */
export function toLocalDateInputValue(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** วันที่เร็วที่สุดที่จองได้ = พรุ่งนี้ ตามเวลาท้องถิ่นของผู้ใช้ */
export function getMinBookingDate(now: Date = new Date()): string {
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return toLocalDateInputValue(tomorrow)
}

/**
 * แสดงวันนัดหมายแบบอ่านง่าย เช่น 5 พฤศจิกายน 2569
 * วันนัดเก็บเป็นวันที่ล้วน (UTC midnight) จึงจัดรูปแบบด้วย UTC เพื่อไม่ให้วันเลื่อน
 */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/**
 * ตัดอักขระที่ไม่ใช่ตัวเลขออก และจำกัดความยาวไม่เกิน 10 ตัวอักษร
 */
export function sanitizePhoneInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, 10)
}


