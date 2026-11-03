import { prisma } from "../src/lib/prisma";

// ===========================
// Helpers สำหรับเทสต์ที่ไม่ต้องต่อฐานข้อมูลจริง
// ===========================

/** สร้าง mock Response ที่เก็บ status/json ไว้ตรวจสอบ */
export function mockRes() {
  const res: any = {
    statusCode: 200,
    body: undefined as any,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      res.body = payload;
      return res;
    },
  };
  return res;
}

/** แทนที่ property ของ prisma ชั่วคราว คืนฟังก์ชัน restore */
export function stubPrisma(overrides: Record<string, unknown>): () => void {
  const originals: Record<string, PropertyDescriptor | undefined> = {};
  for (const [key, value] of Object.entries(overrides)) {
    originals[key] = Object.getOwnPropertyDescriptor(prisma, key);
    Object.defineProperty(prisma, key, { value, configurable: true, writable: true });
  }
  return () => {
    for (const [key, desc] of Object.entries(originals)) {
      if (desc) Object.defineProperty(prisma, key, desc);
      else delete (prisma as any)[key];
    }
  };
}

