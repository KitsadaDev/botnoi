// ===========================
// กฎการอัปโหลดรูป (ต้องตรงกับ server: server/src/middleware/upload.ts)
// ===========================
export const MAX_IMAGES = 3
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
// ขนาดรวมของรูปทุกรูปในคำขอเดียว — API รันบน Vercel Serverless ซึ่งรับ request body ได้ไม่เกินราว 4.5MB
// ถ้าเกินจะโดนตัดที่ระดับ platform (413) ก่อนถึงโค้ดของเรา ลูกค้าจะเห็น error ที่ไม่เป็นมิตร จึงกันไว้ที่ฝั่ง client
export const MAX_TOTAL_IMAGE_BYTES = 4 * 1024 * 1024
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

interface FileLike {
  name: string
  type: string
  size: number
}

/**
 * คัดไฟล์ที่เพิ่มเข้ามาให้ตรงกับกฎของ server ก่อนส่ง
 * คืนไฟล์ที่ผ่าน (ไม่เกินโควตาที่เหลือ) และข้อความแจ้งไฟล์ที่ถูกปัดตก
 * @param existingBytes ขนาดรวมของรูปที่เลือกไว้แล้ว (ใช้คุมขนาดรวมไม่ให้เกิน MAX_TOTAL_IMAGE_BYTES)
 */
export function selectValidImages<T extends FileLike>(
  existingCount: number,
  incoming: T[],
  existingBytes = 0,
): { accepted: T[]; errors: string[] } {
  const accepted: T[] = []
  const errors: string[] = []
  let totalBytes = existingBytes

  for (const file of incoming) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      errors.push(`"${file.name}" ไม่รองรับ (รองรับเฉพาะ JPG, PNG, WEBP)`)
    } else if (file.size > MAX_IMAGE_BYTES) {
      errors.push(`"${file.name}" มีขนาดเกิน 5MB`)
    } else if (existingCount + accepted.length >= MAX_IMAGES) {
      errors.push(`"${file.name}" เกินจำนวนสูงสุด ${MAX_IMAGES} รูป`)
    } else if (totalBytes + file.size > MAX_TOTAL_IMAGE_BYTES) {
      errors.push(`"${file.name}" ทำให้ขนาดรูปรวมเกิน 4MB กรุณาเลือกรูปที่เล็กลง`)
    } else {
      accepted.push(file)
      totalBytes += file.size
    }
  }

  return { accepted, errors }
}
