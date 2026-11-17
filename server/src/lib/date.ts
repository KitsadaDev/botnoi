// ===========================
// Helper วันที่ตามเวลาประเทศไทย (Asia/Bangkok)
// server รันบน cloud เป็น UTC จึงห้ามใช้ getDate()/setHours() ของเครื่องตรงๆ
// ===========================

export const BUSINESS_TIME_ZONE = "Asia/Bangkok";

/** คืนวันที่ตามเวลาไทยในรูปแบบ YYYY-MM-DD */
export function bangkokDateString(date: Date = new Date()): string {
  // en-CA จัดรูปแบบเป็น YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** เวลาเริ่มต้นของ "วันนี้" ตามเวลาไทย แทนด้วย UTC midnight ของวันนั้น (รูปแบบเดียวกับ preferredDate ที่เก็บใน DB) */
export function startOfTodayBangkokAsUtc(now: Date = new Date()): Date {
  return new Date(`${bangkokDateString(now)}T00:00:00.000Z`);
}
