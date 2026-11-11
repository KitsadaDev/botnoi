import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { updateTicketSchema, createMessageSchema } from "../validations/ticket.validation";
import { AuthRequest } from "../middleware/auth";
import { Prisma, TicketStatus, Role } from "@prisma/client";

// ===========================
// ฟังก์ชัน mask เบอร์โทร เช่น 0891111111 → 089-xxx-1111
// ===========================
function maskPhone(phone: string): string {
  if (phone.length < 7) return phone;
  return `${phone.slice(0, 3)}-xxx-${phone.slice(-4)}`;
}

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
      // ตรวจว่าเป็นสถานะที่มีจริง ไม่เช่นนั้น Prisma จะ throw และกลายเป็น 500
      if (!(Object.values(TicketStatus) as string[]).includes(status)) {
        res.status(400).json({ success: false, error: "สถานะที่ใช้กรองไม่ถูกต้อง" });
        return;
      }
      where.status = status as TicketStatus;
    }

    // ค้นหาด้วยรหัสติดตาม หรือเบอร์โทร (จำกัดความยาวเพื่อป้องกัน DoS)
    if (q && typeof q === "string" && q.trim()) {
      const sanitizedQ = q.trim().slice(0, 100);
      where.OR = [
        { trackingCode: { contains: sanitizedQ, mode: "insensitive" } },
        { customerPhone: { contains: sanitizedQ } },
        { customerName: { contains: sanitizedQ, mode: "insensitive" } },
      ];
    }

    const [tickets, grouped] = await Promise.all([
      prisma.ticket.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          technician: { select: { id: true, name: true, phone: true, area: true } },
          _count: { select: { messages: true } },
        },
      }),
      // จำนวนเคสแยกตามสถานะ นับจากทุกเคส (ไม่ขึ้นกับ filter/search) สำหรับการ์ดสถิติ
      prisma.ticket.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);

    const counts: Record<string, number> = {
      total: 0,
      ...Object.fromEntries(Object.values(TicketStatus).map((s) => [s, 0])),
    };
    for (const row of grouped) {
      counts[row.status] = row._count._all;
      counts.total += row._count._all;
    }

    res.json({ success: true, data: tickets, total: tickets.length, counts });
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
      // บันทึก StatusLog เมื่อสถานะเปลี่ยน หรือเมื่อเจ้าหน้าที่ใส่โน้ต (เพื่อไม่ให้โน้ตหาย)
      // สร้างก่อน update เพื่อให้ response ที่ include statusLogs มี log ล่าสุดด้วย
      const statusChanged = Boolean(data.status && data.status !== current.status);
      const hasNote = Boolean(data.note && data.note.trim());
      if (statusChanged || hasNote) {
        await tx.statusLog.create({
          data: {
            ticketId: id,
            status: (data.status ?? current.status) as TicketStatus,
            note: data.note,
          },
        });
      }

      return tx.ticket.update({
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
// DELETE /api/admin/tickets/:id
// ลบใบงานออกจากระบบถาวร (Hard Delete สำหรับลบเคสทดสอบ/เคสซ้ำ)
// ===========================
export async function deleteTicket(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = String(req.params.id);

    const existing = await prisma.ticket.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({
        success: false,
        error: "ไม่พบรายการแจ้งซ่อมนี้ในระบบ",
      });
      return;
    }

    await prisma.ticket.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "ลบรายการแจ้งซ่อมเรียบร้อยแล้ว",
    });
  } catch (err) {
    next(err);
  }
}


// ===========================
// GET /api/technicians
// ดูรายชื่อช่าง (ถ้าเป็น public จะ mask เบอร์โทรเพื่อป้องกันการ harvest ข้อมูล)
// ===========================
export async function getTechnicians(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const technicians = await prisma.technician.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, phone: true, area: true },
    });

    const isStaffOrAdmin =
      req.user && (req.user.role === Role.STAFF || req.user.role === Role.ADMIN);

    const data = isStaffOrAdmin
      ? technicians
      : technicians.map((t) => ({ ...t, phone: maskPhone(t.phone) }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
