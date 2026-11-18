// ===========================
// ชื่อ key ใน localStorage ของแอป (ใช้ชื่อแบรนด์ Plasom ให้ตรงกับหน้าเว็บ)
// ===========================
export const TOKEN_KEY = 'plasom_token'
export const ADMIN_READ_TICKETS_KEY = 'plasom_admin_read_ticket_ids'
export const ADMIN_NOTIF_MUTED_KEY = 'plasom_admin_notif_muted'

// ชื่อเดิมสมัยใช้ชื่อ CoolCare — ย้ายค่าให้อัตโนมัติ ผู้ใช้ที่ล็อกอินค้างไว้จะไม่หลุดจากระบบ
const LEGACY_KEYS: Record<string, string> = {
  coolcare_token: TOKEN_KEY,
  coolcare_admin_read_ticket_ids: ADMIN_READ_TICKETS_KEY,
  coolcare_admin_notif_muted: ADMIN_NOTIF_MUTED_KEY,
}

export function migrateLegacyStorageKeys(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>): void {
  try {
    for (const [oldKey, newKey] of Object.entries(LEGACY_KEYS)) {
      const value = storage.getItem(oldKey)
      if (value === null) continue
      if (storage.getItem(newKey) === null) storage.setItem(newKey, value)
      storage.removeItem(oldKey)
    }
  } catch {
    // localStorage ใช้ไม่ได้ (เช่น private mode บางเบราว์เซอร์) ข้ามไป
  }
}

if (typeof window !== 'undefined' && window.localStorage) {
  migrateLegacyStorageKeys(window.localStorage)
}
