import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";

// ===========================
// ขยาย Request type เพื่อเก็บข้อมูล user ที่ decode จาก JWT
// ===========================
export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: Role;
    name: string;
    phone: string;
  };
}

// ===========================
// Middleware ตรวจสอบ JWT token
// ===========================
export async function authRequired(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "กรุณาเข้าสู่ระบบก่อน" });
    return;
  }

  const token = authHeader.split(" ")[1];
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    res.status(500).json({ success: false, error: "Server configuration error" });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as { userId: string };

    // ดึงข้อมูล user จาก DB เพื่อให้ได้ข้อมูลล่าสุด
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, name: true, phone: true },
    });

    if (!user) {
      res.status(401).json({ success: false, error: "ไม่พบผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่" });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    next(err); // ส่งต่อให้ errorHandler จัดการ JWT errors
  }
}

// ===========================
// Middleware ตรวจสอบ Role
// ใช้ต่อจาก authRequired เสมอ
// ===========================
export function roleRequired(...roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: "กรุณาเข้าสู่ระบบก่อน" });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: "ไม่มีสิทธิ์เข้าถึงส่วนนี้" });
      return;
    }

    next();
  };
}
