import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { registerSchema, loginSchema } from "../validations/auth.validation";
import { AuthRequest } from "../middleware/auth";
import { Role } from "@prisma/client";

// ===========================
// bcrypt hash ที่ valid (60 ตัวอักษร, cost 10) ใช้เทียบเมื่อไม่พบ user
// เพื่อให้เวลาตอบสนองเท่ากับกรณีมี user จริง (hash ที่ไม่ valid จะ return ทันที)
// ===========================
export const DUMMY_PASSWORD_HASH =
  "$2a$10$TAeFIBf/PswQw.ZmiRxAruBcnyXFq0.ofVnXN4m3RNMwPpx4GGZh6";

// ===========================
// ฟังก์ชันสร้าง JWT token
// ===========================
export function signToken(userId: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET ไม่ได้ตั้งค่า");
  if (
    process.env.NODE_ENV === "production" &&
    (secret === "your-super-secret-jwt-key-change-this-in-production" || secret.length < 32)
  ) {
    throw new Error(
      "JWT_SECRET ไม่ปลอดภัยสำหรับการใช้งานบน Production (ต้องมีความยาวอย่างน้อย 32 ตัวอักษรและไม่ใช้ค่าเริ่มต้น)"
    );
  }
  return jwt.sign({ userId }, secret, { algorithm: "HS256", expiresIn: "7d" });
}

// ===========================
// ฟังก์ชัน mask เบอร์โทร เช่น 0812345678 → 081-xxx-5678
// ===========================
function maskPhone(phone: string): string {
  return `${phone.slice(0, 3)}-xxx-${phone.slice(-4)}`;
}

// ===========================
// POST /api/auth/register
// ===========================
export async function register(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate input
    const data = registerSchema.parse(req.body);

    // ตรวจเบอร์โทรซ้ำ
    const existing = await prisma.user.findUnique({
      where: { phone: data.phone },
    });
    if (existing) {
      res.status(409).json({ success: false, error: "เบอร์โทรนี้มีในระบบแล้ว" });
      return;
    }

    // Hash รหัสผ่าน
    const passwordHash = await bcrypt.hash(data.password, 10);

    // สร้าง user ใหม่ (role = CUSTOMER เสมอสำหรับ public register)
    const user = await prisma.user.create({
      data: {
        name: data.name,
        phone: data.phone,
        passwordHash,
        role: Role.CUSTOMER,
      },
      select: { id: true, name: true, phone: true, role: true, createdAt: true },
    });

    const token = signToken(user.id);

    res.status(201).json({
      success: true,
      data: {
        token,
        user: { ...user, phone: maskPhone(user.phone) },
      },
    });
  } catch (err) {
    next(err);
  }
}

// ===========================
// POST /api/auth/login
// ===========================
export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = loginSchema.parse(req.body);

    // หา user จากเบอร์โทร
    const user = await prisma.user.findUnique({
      where: { phone: data.phone },
    });

    // ตรวจสอบ user และรหัสผ่าน (ใช้เวลาเท่ากันเพื่อป้องกัน timing attack)
    const isValid = user
      ? await bcrypt.compare(data.password, user.passwordHash)
      : await bcrypt.compare(data.password, DUMMY_PASSWORD_HASH); // ทำให้เวลาเท่ากัน

    if (!user || !isValid) {
      res.status(401).json({ success: false, error: "เบอร์โทรหรือรหัสผ่านไม่ถูกต้อง" });
      return;
    }

    const token = signToken(user.id);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          phone: maskPhone(user.phone),
          role: user.role,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

// ===========================
// GET /api/auth/me
// ต้องผ่าน authRequired middleware ก่อน
// ===========================
export async function getMe(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: "กรุณาเข้าสู่ระบบก่อน" });
      return;
    }

    // ดึงข้อมูลล่าสุดจาก DB
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, phone: true, role: true, createdAt: true },
    });

    if (!user) {
      res.status(404).json({ success: false, error: "ไม่พบผู้ใช้งาน" });
      return;
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        phone: maskPhone(user.phone),
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
}
