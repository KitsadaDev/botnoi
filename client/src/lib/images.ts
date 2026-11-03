// ===========================
// กฎการอัปโหลดรูป (ต้องตรงกับ server: server/src/middleware/upload.ts)
// ===========================
export const MAX_IMAGES = 3
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

interface FileLike {
  name: string
  type: string
  size: number
}

/**
 * คัดไฟล์ที่เพิ่มเข้ามาให้ตรงกับกฎของ server ก่อนส่ง
 * คืนไฟล์ที่ผ่าน (ไม่เกินโควตาที่เหลือ) และข้อความแจ้งไฟล์ที่ถูกปัดตก
 */
export function selectValidImages<T extends FileLike>(
  existingCount: number,
  incoming: T[],
): { accepted: T[]; errors: string[] } {
  const accepted: T[] = []
  const errors: string[] = []

  for (const file of incoming) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      errors.push(`"${file.name}" ไม่รองรับ (รองรับเฉพาะ JPG, PNG, WEBP)`)
    } else if (file.size > MAX_IMAGE_BYTES) {
      errors.push(`"${file.name}" มีขนาดเกิน 5MB`)
    } else if (existingCount + accepted.length >= MAX_IMAGES) {
      errors.push(`"${file.name}" เกินจำนวนสูงสุด ${MAX_IMAGES} รูป`)
    } else {
      accepted.push(file)
    }
  }

  return { accepted, errors }
}

