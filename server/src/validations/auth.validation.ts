import { z } from "zod";

// ===========================
// Regex เบอร์โทรไทย 10 หลัก ขึ้นต้นด้วย 0
// ===========================
const thaiPhone = z
  .string()
  .regex(/^0[0-9]{9}$/, "เบอร์โทรต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 0");

// ===========================
// Schema สำหรับ register
// ===========================
export const registerSchema = z.object({
  name: z.string().min(2, "ชื่อต้องมีอย่างน้อย 2 ตัวอักษร").max(100),
  phone: thaiPhone,
  password: z
    .string()
    .min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร")
    .max(100),
});

// ===========================
// Schema สำหรับ login
// ===========================
export const loginSchema = z.object({
  phone: thaiPhone,
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});

// Type Inference สำหรับใช้ใน controller
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
