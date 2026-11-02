import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

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
