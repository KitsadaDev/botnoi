import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import multer from "multer";
import { UploadError } from "./upload";

// ข้อความภาษาไทยสำหรับ error ของ multer
const MULTER_MESSAGES: Record<string, string> = {
  LIMIT_FILE_SIZE: "ไฟล์รูปต้องมีขนาดไม่เกิน 5MB",
  LIMIT_FILE_COUNT: "อัปโหลดรูปได้สูงสุด 3 รูป",
  LIMIT_UNEXPECTED_FILE: "อัปโหลดรูปได้สูงสุด 3 รูป",
};

// ===========================
// Global Error Handler Middleware
// จัดการ error จากทุก route กลางที่เดียว
// ===========================
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Upload errors (multer + fileFilter) เป็นความผิดพลาดของ request ไม่ใช่ของ server
  if (err instanceof multer.MulterError) {
    res.status(400).json({
      success: false,
      error: MULTER_MESSAGES[err.code] ?? `อัปโหลดไฟล์ไม่สำเร็จ: ${err.message}`,
    });
    return;
  }
  if (err instanceof UploadError) {
    res.status(400).json({ success: false, error: err.message });
    return;
  }

  // JSON body ที่ parse ไม่ได้ (express.json)
  if ((err as { type?: string }).type === "entity.parse.failed") {
    res.status(400).json({ success: false, error: "รูปแบบข้อมูลที่ส่งมาไม่ถูกต้อง" });
    return;
  }

  // Zod validation error
  if (err instanceof ZodError) {
    const messages = err.errors.map((e) => e.message).join(", ");
    res.status(400).json({ success: false, error: `ข้อมูลไม่ถูกต้อง: ${messages}` });
    return;
  }

  // Prisma unique constraint error
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      res.status(409).json({ success: false, error: "ข้อมูลซ้ำในระบบ" });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({ success: false, error: "ไม่พบข้อมูลที่ต้องการ" });
      return;
    }
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    res.status(401).json({ success: false, error: "Token ไม่ถูกต้อง" });
    return;
  }
  if (err.name === "TokenExpiredError") {
    res.status(401).json({ success: false, error: "Token หมดอายุ กรุณาเข้าสู่ระบบใหม่" });
    return;
  }

  // Generic server error
  console.error("❌ Server Error:", err);
  res.status(500).json({
    success: false,
    error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง",
  });
}
