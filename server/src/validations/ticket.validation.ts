import { z } from "zod";
import { ServiceType } from "@prisma/client";

// ===========================
// Regex เบอร์โทรไทย 10 หลัก (shared กับ auth.validation)
// ===========================
export const thaiPhoneSchema = z
  .string()
  .regex(/^0[0-9]{9}$/, "เบอร์โทรต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 0");

// ===========================
// Schema สำหรับสร้าง Ticket (POST /api/tickets)
// ===========================
export const createTicketSchema = z.object({
  service: z.nativeEnum(ServiceType, { errorMap: () => ({ message: "ประเภทบริการไม่ถูกต้อง" }) }),
  brand: z.string().min(1, "กรุณากรอกยี่ห้อแอร์").max(100),
  symptom: z.string().min(1, "กรุณากรอกอาการเสีย").max(500),
  address: z.string().min(10, "กรุณากรอกที่อยู่ให้ครบถ้วน").max(500),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  // วันนัดต้องไม่ย้อนหลัง (เปรียบเทียบกับ "เริ่มต้นของวันนี้")
  preferredDate: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return !isNaN(date.getTime()) && date >= today;
    }, "วันนัดต้องไม่เป็นวันที่ผ่านมาแล้ว"),
  note: z.string().max(1000).optional(),
  customerName: z.string().min(2, "กรุณากรอกชื่อ-สกุล").max(100),
  customerPhone: thaiPhoneSchema,
  userId: z.string().optional(), // ถ้าล็อกอินอยู่จะแนบ userId
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
