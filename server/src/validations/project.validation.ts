import { z } from "zod";
import { thaiPhoneSchema } from "./ticket.validation";

export const BUSINESS_TYPES = [
  "AC_AND_IT",
  "AC_SERVICE",
  "IT_SUPPORT",
  "APPLIANCE",
  "GENERAL_REPAIR",
] as const;

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug ต้องใช้ตัวอักษรภาษาอังกฤษพิมพ์เล็ก ตัวเลข หรือขีด (-) เท่านั้น")
  .min(3, "Slug ต้องมีอย่างน้อย 3 ตัวอักษร")
  .max(60, "Slug ยาวเกิน 60 ตัวอักษร");

export const createProjectSchema = z.object({
  name: z
    .string({ required_error: "กรุณาระบุชื่อโปรเจกต์หรือชื่อร้าน" })
    .trim()
    .min(2, "ชื่อโปรเจกต์ต้องมีอย่างน้อย 2 ตัวอักษร")
    .max(120),
  slug: slugSchema.optional(),
  description: z.string().trim().max(500).optional(),
  businessType: z.enum(BUSINESS_TYPES).optional().default("AC_AND_IT"),
  phone: z.string().trim().max(30).optional(),
  lineOaId: z.string().trim().max(100).optional(),
  botnoiBotId: z.string().trim().max(100).optional(),
  webhookSecret: z.string().trim().max(128).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().trim().min(2, "ชื่อโปรเจกต์ต้องมีอย่างน้อย 2 ตัวอักษร").max(120).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  businessType: z.enum(BUSINESS_TYPES).optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  lineOaId: z.string().trim().max(100).nullable().optional(),
  botnoiBotId: z.string().trim().max(100).nullable().optional(),
  webhookSecret: z.string().trim().max(128).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const createTechnicianSchema = z.object({
  name: z
    .string({ required_error: "กรุณากรอกชื่อ-นามสกุลช่าง" })
    .trim()
    .min(2, "ชื่อช่างต้องมีอย่างน้อย 2 ตัวอักษร")
    .max(100),
  phone: thaiPhoneSchema,
  area: z
    .string({ required_error: "กรุณาระบุพื้นที่รับผิดชอบ" })
    .trim()
    .min(2, "กรุณาระบุพื้นที่รับผิดชอบ")
    .max(120),
  specialty: z.string().trim().max(150).optional(),
  isAvailable: z.boolean().optional().default(true),
});

export const updateTechnicianSchema = z.object({
  name: z.string().trim().min(2, "ชื่อช่างต้องมีอย่างน้อย 2 ตัวอักษร").max(100).optional(),
  phone: thaiPhoneSchema.optional(),
  area: z.string().trim().min(2, "กรุณาระบุพื้นที่รับผิดชอบ").max(120).optional(),
  specialty: z.string().trim().max(150).nullable().optional(),
  isAvailable: z.boolean().optional(),
});

export const createReviewSchema = z.object({
  rating: z.coerce.number().int().min(1, "กรุณาให้คะแนน 1-5 ดาว").max(5, "คะแนนสูงสุด 5 ดาว"),
  speedRating: z.coerce.number().int().min(1).max(5).optional(),
  serviceRating: z.coerce.number().int().min(1).max(5).optional(),
  comment: z.string().trim().max(1000).optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(8).optional().default([]),
});

export const chatbotLogWebhookSchema = z.object({
  externalUserId: z.string().trim().max(120).optional(),
  customerName: z.string().trim().min(1, "กรุณาระบุชื่อลูกค้า").max(100).default("ลูกค้าจาก Chatbot"),
  customerPhone: z.string().trim().max(20).optional(),
  channel: z.enum(["CHATBOT", "LINE", "VOICEBOT", "WEB"]).optional().default("CHATBOT"),
  summary: z.string().trim().max(300).optional(),
  trackingCode: z.string().trim().max(40).optional(),
  messages: z
    .array(
      z.object({
        sender: z.enum(["CUSTOMER", "BOT", "STAFF"]).default("CUSTOMER"),
        senderName: z.string().trim().max(100).optional(),
        text: z.string().trim().min(1).max(2000),
        createdAt: z.string().datetime().optional(),
      })
    )
    .min(1, "ต้องมีข้อความอย่างน้อย 1 ข้อความ")
    .max(100),
});

export const createConversationReplySchema = z.object({
  text: z.string().trim().min(1, "กรุณากรอกข้อความ").max(2000),
  status: z.enum(["OPEN", "RESOLVED"]).optional(),
});
