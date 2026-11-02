import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { updateTicketSchema, createMessageSchema } from "../validations/ticket.validation";
import { AuthRequest } from "../middleware/auth";
import { Prisma, TicketStatus } from "@prisma/client";

// ===========================
// GET /api/admin/tickets?status=&q=
// ดูรายการเคสทั้งหมด กรองตามสถานะ/ค้นหา
// ===========================
export async function getAllTickets(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { status, q } = req.query;

    // สร้าง filter ตาม query params
    const where: Prisma.TicketWhereInput = {};

    if (status && typeof status === "string") {
      where.status = status as TicketStatus;
    }

    // ค้นหาด้วยรหัสติดตาม หรือเบอร์โทร
    if (q && typeof q === "string" && q.trim()) {
      where.OR = [
        { trackingCode: { contains: q.trim(), mode: "insensitive" } },
        { customerPhone: { contains: q.trim() } },
        { customerName: { contains: q.trim(), mode: "insensitive" } },
      ];
    }

    const tickets = await prisma.ticket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        technician: { select: { id: true, name: true } },
        _count: { select: { messages: true } },
      },
    });

    res.json({ success: true, data: tickets, total: tickets.length });
  } catch (err) {
    next(err);
  }
}

// ===========================
// GET /api/admin/tickets/:id
// ดูรายละเอียดเคส (ใช้ id ไม่ใช่ trackingCode)
// ===========================
export async function getTicketById(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        images: true,
        statusLogs: { orderBy: { createdAt: "asc" } },
        technician: true,
        user: { select: { id: true, name: true, phone: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });

    if (!ticket) {
      res.status(404).json({ success: false, error: "ไม่พบเคสที่ต้องการ" });
      return;
    }

    res.json({ success: true, data: ticket });
  } catch (err) {
    next(err);
  }
}

// ===========================
// PATCH /api/admin/tickets/:id
// เปลี่ยนสถานะ หรือมอบหมายช่าง
// สร้าง StatusLog ทุกครั้งที่สถานะเปลี่ยน
// ===========================
export async function updateTicket(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const data = updateTicketSchema.parse(req.body);

    // ดึงเคสปัจจุบัน
    const current = await prisma.ticket.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!current) {
      res.status(404).json({ success: false, error: "ไม่พบเคสที่ต้องการ" });
      return;
    }

    // ตรวจสอบว่า technicianId มีอยู่จริง (ถ้าส่งมา)
    if (data.technicianId) {
      const tech = await prisma.technician.findUnique({
        where: { id: data.technicianId },
        select: { id: true },
      });
      if (!tech) {
        res.status(404).json({ success: false, error: "ไม่พบช่างที่เลือก" });
        return;
      }
    }

    // ทำทุกอย่างใน transaction
    const updated = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.update({
        where: { id },
        data: {
          ...(data.status && { status: data.status as TicketStatus }),
          // technicianId = null หมายถึงยกเลิกการมอบหมาย
          ...(data.technicianId !== undefined && { technicianId: data.technicianId }),
        },
        include: {
          technician: { select: { id: true, name: true, phone: true } },
          statusLogs: { orderBy: { createdAt: "asc" } },
        },
      });

      // สร้าง StatusLog ถ้าสถานะเปลี่ยน
      if (data.status && data.status !== current.status) {
        await tx.statusLog.create({
          data: {
            ticketId: id,
            status: data.status as TicketStatus,
            note: data.note,
          },
        });
      }

      return ticket;
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

// ===========================
// POST /api/admin/tickets/:id/messages
// เจ้าหน้าที่ตอบลูกค้า (fromStaff = true)
// ===========================
export async function createStaffMessage(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const data = createMessageSchema.parse(req.body);

    // ตรวจสอบเคส
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!ticket) {
      res.status(404).json({ success: false, error: "ไม่พบเคสที่ต้องการ" });
      return;
    }

    const message = await prisma.message.create({
      data: {
        ticketId: ticket.id,
        text: data.text,
        fromStaff: true,
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

// ===========================
// GET /api/technicians
// ดูรายชื่อช่างทั้งหมด
// ===========================
export async function getTechnicians(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const technicians = await prisma.technician.findMany({
      orderBy: { name: "asc" },
    });
    res.json({ success: true, data: technicians });
  } catch (err) {
    next(err);
  }
}
