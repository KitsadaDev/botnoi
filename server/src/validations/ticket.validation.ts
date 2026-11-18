import { z } from "zod";
import { ServiceType } from "@prisma/client";
import { earliestBookingDateBangkok } from "../lib/date";

// ===========================
// Regex เบอร์โทรไทย 10 หลัก (shared กับ auth.validation)
// ===========================
export const thaiPhoneSchema = z
  .string({ required_error: "กรุณากรอกเบอร์โทรศัพท์" })
  .regex(/^0[0-9]{9}$/, "เบอร์โทรต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 0");

// ===========================
// Regex รหัสติดตาม CC-YYYYMMDD-XXXX
// ===========================
export const trackingCodeSchema = z
  .string()
  .regex(/^(CC-[0-9]{8}-[A-Z0-9]{4,}|TCK-[A-Z0-9-]+)$/i, "รูปแบบรหัสติดตามไม่ถูกต้อง");


// ===========================
// Schema สำหรับสร้าง Ticket (POST /api/tickets)
// ===========================
// ข้อความเมื่อไม่ได้ส่ง field มาเลย (ค่าเริ่มต้นของ zod คือ "Required" ภาษาอังกฤษ)
const requiredString = (message: string) =>
  z.string({ required_error: message, invalid_type_error: message });

export const createTicketSchema = z.object({
  service: z.nativeEnum(ServiceType, { errorMap: () => ({ message: "ประเภทบริการไม่ถูกต้อง" }) }),
  brand: requiredString("กรุณาระบุยี่ห้อ/อุปกรณ์").min(1, "กรุณาระบุยี่ห้อ/อุปกรณ์").max(100),
  // ขั้นต่ำ 5 ตัวอักษร ให้ตรงกับฟอร์มบนเว็บ (client/src/pages/BookServicePage.tsx)
  symptom: requiredString("กรุณากรอกอาการเสีย")
    .min(5, "กรุณาระบุอาการเบื้องต้นอย่างน้อย 5 ตัวอักษร")
    .max(500),
  address: requiredString("กรุณากรอกที่อยู่ให้ครบถ้วน").min(10, "กรุณากรอกที่อยู่ให้ครบถ้วน").max(500),
  lat: z.coerce.number().min(-90, "พิกัด lat ไม่ถูกต้อง").max(90, "พิกัด lat ไม่ถูกต้อง").optional(),
  lng: z.coerce.number().min(-180, "พิกัด lng ไม่ถูกต้อง").max(180, "พิกัด lng ไม่ถูกต้อง").optional(),
  // วันนัดต้องเป็นตั้งแต่พรุ่งนี้ตามเวลาไทย (กฎเดียวกับฟอร์มบนเว็บและบอท)
  preferredDate: requiredString("กรุณาเลือกวันที่ต้องการรับบริการ").refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime()) && date >= earliestBookingDateBangkok();
  }, "วันนัดต้องเป็นตั้งแต่พรุ่งนี้เป็นต้นไป"),
  note: z.string().max(1000).optional(),
  customerName: requiredString("กรุณากรอกชื่อ-สกุล").min(2, "กรุณากรอกชื่อ-สกุล").max(100),
  customerPhone: thaiPhoneSchema,
});

// ===========================
// Schema สำหรับข้อความแชต (POST /api/tickets/:code/messages)
// ===========================
export const createMessageSchema = z.object({
  text: z.string().min(1, "กรุณากรอกข้อความ").max(2000),
});

// ===========================
// Schema สำหรับ Admin อัปเดต Ticket
// ===========================
export const updateTicketSchema = z.object({
  status: z
    .enum(["SUBMITTED", "RECEIVED", "IN_PROGRESS", "COMPLETED", "CANCELLED"], {
      errorMap: () => ({ message: "สถานะไม่ถูกต้อง" }),
    })
    .optional(),
  technicianId: z.string().nullable().optional(),
  note: z.string().max(500).optional(), // note สำหรับ StatusLog
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
