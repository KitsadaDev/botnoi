import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import {
  createTicketSchema,
  createMessageSchema,
  trackingCodeSchema,
} from "../validations/ticket.validation";
import { AuthRequest } from "../middleware/auth";
import { TicketStatus } from "@prisma/client";
import { customAlphabet } from "nanoid";
import path from "path";
import fs from "fs";

// ===========================
// nanoid: ตัวพิมพ์ใหญ่ + ตัวเลข 4 ตัว
// ===========================
const nanoid = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 4);

// ===========================
// สร้างรหัสติดตาม CC-YYYYMMDD-XXXX
// สุ่มใหม่จนกว่าจะไม่ซ้ำ ถ้าชนครบทุกรอบจะ throw (ห้ามคืนรหัสที่ซ้ำ)
// ===========================
const MAX_CODE_ATTEMPTS = 10;

export async function generateUniqueCode(): Promise<string> {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const code = `CC-${y}${m}${d}-${nanoid()}`;
    const exists = await prisma.ticket.findUnique({ where: { trackingCode: code } });
    if (!exists) return code;
  }

  throw new Error("ไม่สามารถสร้างรหัสติดตามที่ไม่ซ้ำได้ กรุณาลองใหม่");
}

// ===========================
// ลบไฟล์ที่ multer เขียนลงดิสก์ไปแล้ว (ใช้เมื่อสร้างเคสไม่สำเร็จ ไม่ให้ไฟล์ค้าง)
// ===========================
async function removeUploadedFiles(files: Express.Multer.File[]): Promise<void> {
  await Promise.all(
    files.map(async (f) => {
      try {
        if (f.path) await fs.promises.unlink(f.path);
      } catch {
        // ไฟล์อาจถูกลบไปแล้ว ไม่ต้องทำอะไร
      }
    })
  );
}

// ===========================
// ฟังก์ชัน mask เบอร์โทร 08x-xxx-1234
// ===========================
function maskPhone(phone: string): string {
  return `${phone.slice(0, 3)}-xxx-${phone.slice(-4)}`;
}

// ===========================
// POST /api/tickets
// สร้างเคสใหม่ (multipart/form-data รองรับรูปสูงสุด 3 รูป)
// ===========================
export async function createTicket(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  // รูปที่อัปโหลด (multer ใส่ไว้ใน req.files) — อยู่นอก try เพื่อลบทิ้งได้เมื่อเกิด error
  const files = (req.files as Express.Multer.File[]) ?? [];

  try {
    // Parse และ validate ข้อมูล (form-data ส่งเป็น string ทั้งหมด)
    const rawBody = {
      ...req.body,
      lat: req.body.lat ? parseFloat(req.body.lat as string) : undefined,
      lng: req.body.lng ? parseFloat(req.body.lng as string) : undefined,
    };

    const data = createTicketSchema.parse(rawBody);

    const imageUrls = files.map((f) => `/uploads/${f.filename}`);

    // สร้าง trackingCode ที่ไม่ซ้ำ
    const trackingCode = await generateUniqueCode();

    // สร้าง Ticket + StatusLog แรก ใน transaction เดียว
    const ticket = await prisma.$transaction(async (tx) => {
      const t = await tx.ticket.create({
        data: {
          trackingCode,
          service: data.service,
          brand: data.brand,
          symptom: data.symptom,
          address: data.address,
          lat: data.lat,
          lng: data.lng,
          preferredDate: new Date(data.preferredDate),
          note: data.note,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          userId: req.user?.id, // แนบ userId ถ้าล็อกอินอยู่
          images: {
            create: imageUrls.map((url) => ({ url })),
          },
        },
        include: { images: true },
      });

      // สร้าง StatusLog แรก (SUBMITTED)
      await tx.statusLog.create({
        data: {
          ticketId: t.id,
          status: TicketStatus.SUBMITTED,
          note: "ส่งเรื่องผ่านเว็บไซต์",
        },
      });

      return t;
    });

    // ส่งข้อมูลเคสครบ (หน้ายืนยันของ client ต้องใช้แสดงสรุป) พร้อมรหัสติดตาม
    res.status(201).json({
      success: true,
      data: {
        ...ticket,
        message: "ส่งเรื่องสำเร็จ กรุณาบันทึกรหัสติดตามของท่าน",
      },
    });
  } catch (err) {
    // สร้างเคสไม่สำเร็จ → ลบรูปที่ถูกอัปโหลดไปแล้วไม่ให้ค้างในดิสก์
    await removeUploadedFiles(files);
    next(err);
  }
}

// ===========================
// GET /api/tickets/:code
// ดูเคสตามรหัสติดตาม (ไม่ต้อง login)
// ===========================
export async function getTicketByCode(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { code } = req.params;

    // Validate รูปแบบรหัสติดตามเพื่อป้องกัน arbitrary query / code injection
    const codeValidation = trackingCodeSchema.safeParse(code);
    if (!codeValidation.success) {
      res.status(400).json({ success: false, error: "รูปแบบรหัสติดตามไม่ถูกต้อง" });
      return;
    }

    const ticket = await prisma.ticket.findUnique({
      where: { trackingCode: code },
      include: {
        images: { select: { id: true, url: true } },
        statusLogs: { orderBy: { createdAt: "asc" } },
        technician: { select: { id: true, name: true, phone: true, area: true } },
      },
    });

    if (!ticket) {
      res.status(404).json({ success: false, error: "ไม่พบรหัสติดตามนี้ในระบบ" });
      return;
    }

    // ตัด userId ออกจาก public response เพื่อไม่ให้เปิดเผยรหัสผู้ใช้ภายใน
    const { userId: _omittedUserId, ...safeTicket } = ticket;

    // ปิดบังเบอร์โทรบางส่วน
    res.json({
      success: true,
      data: {
        ...safeTicket,
        customerPhone: maskPhone(ticket.customerPhone),
        // ปิดบังเบอร์ช่างด้วย
        technician: ticket.technician
          ? { ...ticket.technician, phone: maskPhone(ticket.technician.phone) }
          : null,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ===========================
// GET /api/tickets/:code/messages
// ดูข้อความแชตของเคส (ไม่ต้อง login)
// ===========================
export async function getMessages(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { code } = req.params;

    const codeValidation = trackingCodeSchema.safeParse(code);
    if (!codeValidation.success) {
      res.status(400).json({ success: false, error: "รูปแบบรหัสติดตามไม่ถูกต้อง" });
      return;
    }

    // ตรวจสอบว่าเคสมีอยู่จริง
    const ticket = await prisma.ticket.findUnique({
      where: { trackingCode: code },
      select: { id: true },
    });

    if (!ticket) {
      res.status(404).json({ success: false, error: "ไม่พบรหัสติดตามนี้ในระบบ" });
      return;
    }

    const messages = await prisma.message.findMany({
      where: { ticketId: ticket.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        text: true,
        fromStaff: true,
        createdAt: true,
        user: { select: { id: true, name: true } },
      },
    });

    res.json({ success: true, data: messages });
  } catch (err) {
    next(err);
  }
}

// ===========================
// POST /api/tickets/:code/messages
// ลูกค้าส่งข้อความ (fromStaff = false)
// ===========================
export async function createCustomerMessage(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { code } = req.params;

    const codeValidation = trackingCodeSchema.safeParse(code);
    if (!codeValidation.success) {
      res.status(400).json({ success: false, error: "รูปแบบรหัสติดตามไม่ถูกต้อง" });
      return;
    }

    const data = createMessageSchema.parse(req.body);

    // ตรวจสอบว่าเคสมีอยู่จริง
    const ticket = await prisma.ticket.findUnique({
      where: { trackingCode: code },
      select: { id: true, status: true },
    });

    if (!ticket) {
      res.status(404).json({ success: false, error: "ไม่พบรหัสติดตามนี้ในระบบ" });
      return;
    }

    // เคสที่ยกเลิกหรือสำเร็จแล้วไม่สามารถส่งข้อความได้
    if (ticket.status === TicketStatus.CANCELLED || ticket.status === TicketStatus.COMPLETED) {
      res.status(400).json({ success: false, error: "ไม่สามารถส่งข้อความได้ เคสนี้ปิดแล้ว" });
      return;
    }

    const message = await prisma.message.create({
      data: {
        ticketId: ticket.id,
        text: data.text,
        fromStaff: false,
        userId: req.user?.id,
      },
      select: {
        id: true,
        text: true,
        fromStaff: true,
        createdAt: true,
        user: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ success: true, data: message });
  } catch (err) {
    next(err);
  }
}
