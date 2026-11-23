import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { Prisma, Role, TicketStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middleware/auth";
import {
  createProjectSchema,
  updateProjectSchema,
  createTechnicianSchema,
  updateTechnicianSchema,
  chatbotLogWebhookSchema,
  createConversationReplySchema,
} from "../validations/project.validation";
import { updateTicketSchema, createMessageSchema } from "../validations/ticket.validation";
import { removeTicketImageFiles } from "./admin.controller";

// ===========================
// Helpers
// ===========================

export function slugifyProjectName(name: string): string {
  const ascii = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);

  const suffix = crypto.randomBytes(2).toString("hex");
  return ascii.length >= 3 ? `${ascii}-${suffix}` : `project-${suffix}`;
}

async function generateUniqueSlug(preferred?: string, name?: string): Promise<string> {
  if (preferred) {
    const existing = await prisma.project.findUnique({ where: { slug: preferred }, select: { id: true } });
    if (!existing) return preferred;
    throw Object.assign(new Error("Slug นี้ถูกใช้งานแล้ว กรุณาเปลี่ยนชื่อลิงก์ใหม่"), { statusCode: 409 });
  }

  for (let i = 0; i < 8; i++) {
    const candidate = slugifyProjectName(name || "workspace");
    const existing = await prisma.project.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing) return candidate;
  }

  return `project-${Date.now().toString(36)}`;
}

/**
 * ตรวจสอบสิทธิ์เข้าถึงโปรเจกต์ (Multi-tenant Isolation)
 * - เจ้าของโปรเจกต์ (ownerId === user.id) เข้าได้เสมอ
 * - ADMIN ของแพลตฟอร์มเข้าได้ทุกโปรเจกต์
 * - STAFF เข้าดูและจัดการโปรเจกต์ของตัวเองหรือโปรเจกต์ที่ ADMIN สร้างไว้ได้
 */
export async function findAccessibleProject(projectId: string, user: NonNullable<AuthRequest["user"]>) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { owner: { select: { id: true, name: true, role: true } } },
  });

  if (!project) return { project: null, error: "ไม่พบโปรเจกต์ที่ต้องการ", status: 404 as const };

  const isOwner = project.ownerId === user.id;
  const isAdmin = user.role === Role.ADMIN;
  const isStaffOnOrgProject = user.role === Role.STAFF && project.owner.role === Role.ADMIN;

  if (!isOwner && !isAdmin && !isStaffOnOrgProject) {
    return { project: null, error: "คุณไม่มีสิทธิ์เข้าถึงโปรเจกต์นี้", status: 403 as const };
  }

  return { project, error: null, status: 200 as const };
}

function verifyProjectWebhookSecret(req: Request, projectSecret?: string | null): boolean {
  const expected = projectSecret?.trim() || process.env.BOTNOI_WEBHOOK_SECRET?.trim();
  if (!expected) return true;
  const provided = String(req.headers["x-webhook-secret"] ?? "");
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ===========================
// Public: GET /api/projects/public/:slug
// ===========================
export async function getPublicProjectBySlug(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const slug = String(req.params.slug || "").toLowerCase();
    const project = await prisma.project.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        businessType: true,
        phone: true,
        lineOaId: true,
        isActive: true,
      },
    });

    if (!project || !project.isActive) {
      res.status(404).json({ success: false, error: "ไม่พบโปรเจกต์หรือร้านค้าที่ต้องการ" });
      return;
    }

    res.json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
}

// ===========================
// Public Webhook: POST /api/projects/public/:slug/chatbot-logs
// รับประวัติการสนทนาจาก Chatbot Platform (Botnoi / LINE OA / Voicebot)
// ===========================
export async function ingestChatbotLogs(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const slug = String(req.params.slug || "").toLowerCase();
    const project = await prisma.project.findUnique({
      where: { slug },
      select: { id: true, name: true, webhookSecret: true, isActive: true },
    });

    if (!project || !project.isActive) {
      res.status(404).json({ success: false, error: "ไม่พบโปรเจกต์ที่ระบุ" });
      return;
    }

    if (!verifyProjectWebhookSecret(req, project.webhookSecret)) {
      res.status(401).json({ success: false, error: "webhook secret ไม่ถูกต้อง" });
      return;
    }

    const data = chatbotLogWebhookSchema.parse(req.body);

    // ถ้ามี trackingCode ที่ระบุมา ลองเชื่อมกับ Ticket ในโปรเจกต์นี้
    let linkedTicketId: string | undefined;
    if (data.trackingCode) {
      const ticket = await prisma.ticket.findFirst({
        where: {
          trackingCode: data.trackingCode.toUpperCase(),
          projectId: project.id,
        },
        select: { id: true },
      });
      if (ticket) linkedTicketId = ticket.id;
    }

    // หาห้องสนทนาเดิมถ้ามี externalUserId + channel เดียวกัน
    let conversation = data.externalUserId
      ? await prisma.chatConversation.findFirst({
          where: {
            projectId: project.id,
            externalUserId: data.externalUserId,
            channel: data.channel,
          },
          orderBy: { lastMessageAt: "desc" },
        })
      : null;

    const now = new Date();
    const messagesToCreate = data.messages.map((m) => ({
      sender: m.sender,
      senderName: m.senderName || (m.sender === "BOT" ? "AI Assistant" : data.customerName),
      text: m.text,
      createdAt: m.createdAt ? new Date(m.createdAt) : now,
    }));

    if (conversation) {
      conversation = await prisma.chatConversation.update({
        where: { id: conversation.id },
        data: {
          customerName: data.customerName || conversation.customerName,
          customerPhone: data.customerPhone || conversation.customerPhone,
          summary: data.summary || conversation.summary,
          ticketId: linkedTicketId || conversation.ticketId,
          lastMessageAt: now,
          messages: { create: messagesToCreate },
        },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });
    } else {
      conversation = await prisma.chatConversation.create({
        data: {
          projectId: project.id,
          externalUserId: data.externalUserId,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          channel: data.channel,
          summary: data.summary || data.messages[0]?.text.slice(0, 120),
          ticketId: linkedTicketId,
          lastMessageAt: now,
          messages: { create: messagesToCreate },
        },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });
    }

    res.status(201).json({
      success: true,
      message: "ซิงค์ประวัติการสนทนาเข้าสู่ระบบกลางเรียบร้อยแล้ว",
      data: { id: conversation.id, messageCount: messagesToCreate.length },
    });
  } catch (err) {
    next(err);
  }
}

// ===========================
// GET /api/projects
// รายการโปรเจกต์ทั้งหมดที่ผู้ใช้เข้าถึงได้ พร้อมสรุปสถิติ
// ===========================
export async function listMyProjects(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;

    const where: Prisma.ProjectWhereInput =
      user.role === Role.ADMIN
        ? {}
        : user.role === Role.STAFF
        ? { OR: [{ ownerId: user.id }, { owner: { role: Role.ADMIN } }] }
        : { ownerId: user.id };

    const projects = await prisma.project.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { id: true, name: true } },
        _count: {
          select: {
            tickets: true,
            technicians: true,
            chatConversations: true,
            reviews: true,
          },
        },
      },
    });

    const projectIds = projects.map((p) => p.id);

    const [openCounts, ratingAggs] = await Promise.all([
      projectIds.length > 0
        ? prisma.ticket.groupBy({
            by: ["projectId"],
            where: {
              projectId: { in: projectIds },
              status: { in: [TicketStatus.SUBMITTED, TicketStatus.RECEIVED, TicketStatus.IN_PROGRESS] },
            },
            _count: { _all: true },
          })
        : Promise.resolve([]),
      projectIds.length > 0
        ? prisma.satisfactionReview.groupBy({
            by: ["projectId"],
            where: { projectId: { in: projectIds } },
            _avg: { rating: true },
            _count: { _all: true },
          })
        : Promise.resolve([]),
    ]);

    const openMap = new Map(openCounts.map((r) => [r.projectId, r._count._all]));
    const ratingMap = new Map(
      ratingAggs.map((r) => [
        r.projectId,
        { avg: r._avg.rating ? Number(r._avg.rating.toFixed(2)) : null, count: r._count._all },
      ])
    );

    const enriched = projects.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      businessType: p.businessType,
      phone: p.phone,
      lineOaId: p.lineOaId,
      botnoiBotId: p.botnoiBotId,
      isActive: p.isActive,
      ownerId: p.ownerId,
      owner: p.owner,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      stats: {
        totalTickets: p._count.tickets,
        openTickets: openMap.get(p.id) ?? 0,
        techniciansCount: p._count.technicians,
        conversationsCount: p._count.chatConversations,
        reviewsCount: ratingMap.get(p.id)?.count ?? 0,
        avgRating: ratingMap.get(p.id)?.avg ?? null,
      },
    }));

    res.json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
}

// ===========================
// POST /api/projects
// สร้างโปรเจกต์ใหม่สำหรับผู้ประกอบการ
// ===========================
export async function createProject(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const data = createProjectSchema.parse(req.body);
    const slug = await generateUniqueSlug(data.slug, data.name);

    const project = await prisma.project.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        businessType: data.businessType,
        phone: data.phone,
        lineOaId: data.lineOaId,
        botnoiBotId: data.botnoiBotId,
        webhookSecret: data.webhookSecret,
        ownerId: user.id,
      },
      include: {
        owner: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({
      success: true,
      data: {
        ...project,
        stats: {
          totalTickets: 0,
          openTickets: 0,
          techniciansCount: 0,
          conversationsCount: 0,
          reviewsCount: 0,
          avgRating: null,
        },
      },
    });
  } catch (err: any) {
    if (err?.statusCode === 409) {
      res.status(409).json({ success: false, error: err.message });
      return;
    }
    next(err);
  }
}

// ===========================
// GET /api/projects/:projectId
// ===========================
export async function getProjectById(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const access = await findAccessibleProject(req.params.projectId, req.user!);
    if (!access.project) {
      res.status(access.status).json({ success: false, error: access.error });
      return;
    }

    const { webhookSecret, ...safeProject } = access.project;
    res.json({
      success: true,
      data: {
        ...safeProject,
        hasWebhookSecret: Boolean(webhookSecret),
      },
    });
  } catch (err) {
    next(err);
  }
}

// ===========================
// PATCH /api/projects/:projectId
// ===========================
export async function updateProject(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const access = await findAccessibleProject(req.params.projectId, req.user!);
    if (!access.project) {
      res.status(access.status).json({ success: false, error: access.error });
      return;
    }

    const data = updateProjectSchema.parse(req.body);

    const updated = await prisma.project.update({
      where: { id: access.project.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.businessType !== undefined && { businessType: data.businessType }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.lineOaId !== undefined && { lineOaId: data.lineOaId }),
        ...(data.botnoiBotId !== undefined && { botnoiBotId: data.botnoiBotId }),
        ...(data.webhookSecret !== undefined && { webhookSecret: data.webhookSecret }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    const { webhookSecret, ...safeProject } = updated;
    res.json({
      success: true,
      data: { ...safeProject, hasWebhookSecret: Boolean(webhookSecret) },
    });
  } catch (err) {
    next(err);
  }
}

// ===========================
// DELETE /api/projects/:projectId
// ===========================
export async function deleteProject(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const access = await findAccessibleProject(req.params.projectId, req.user!);
    if (!access.project) {
      res.status(access.status).json({ success: false, error: access.error });
      return;
    }

    if (access.project.ownerId !== req.user!.id && req.user!.role !== Role.ADMIN) {
      res.status(403).json({ success: false, error: "เฉพาะเจ้าของโปรเจกต์หรือผู้ดูแลระบบเท่านั้นที่ลบได้" });
      return;
    }

    await prisma.project.delete({ where: { id: access.project.id } });
    res.json({ success: true, message: "ลบโปรเจกต์เรียบร้อยแล้ว" });
  } catch (err) {
    next(err);
  }
}

// ===========================
// GET /api/projects/:projectId/tickets?status=&q=
// ===========================
export async function getProjectTickets(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const access = await findAccessibleProject(req.params.projectId, req.user!);
    if (!access.project) {
      res.status(access.status).json({ success: false, error: access.error });
      return;
    }

    const { status, q } = req.query;
    const baseWhere: Prisma.TicketWhereInput = { projectId: access.project.id };
    const where: Prisma.TicketWhereInput = { ...baseWhere };

    if (status && typeof status === "string") {
      if (!(Object.values(TicketStatus) as string[]).includes(status)) {
        res.status(400).json({ success: false, error: "สถานะที่ใช้กรองไม่ถูกต้อง" });
        return;
      }
      where.status = status as TicketStatus;
    }

    if (q && typeof q === "string" && q.trim()) {
      const sanitizedQ = q.trim().slice(0, 100);
      where.OR = [
        { trackingCode: { contains: sanitizedQ, mode: "insensitive" } },
        { customerPhone: { contains: sanitizedQ } },
        { customerName: { contains: sanitizedQ, mode: "insensitive" } },
        { brand: { contains: sanitizedQ, mode: "insensitive" } },
      ];
    }

    const [tickets, groupedStatus, groupedSource, convCounts] = await Promise.all([
      prisma.ticket.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          technician: { select: { id: true, name: true, phone: true, area: true, specialty: true } },
          review: { select: { id: true, rating: true } },
          _count: { select: { messages: true } },
        },
      }),
      prisma.ticket.groupBy({
        by: ["status"],
        where: baseWhere,
        _count: { _all: true },
      }),
      prisma.ticket.groupBy({
        by: ["source"],
        where: baseWhere,
        _count: { _all: true },
      }),
      prisma.chatConversation.groupBy({
        by: ["channel"],
        where: { projectId: access.project.id },
        _count: { _all: true },
      }),
    ]);

    const counts: Record<string, number> = {
      total: 0,
      ...Object.fromEntries(Object.values(TicketStatus).map((s) => [s, 0])),
    };
    for (const row of groupedStatus) {
      counts[row.status] = row._count._all;
      counts.total += row._count._all;
    }

    const sourceMap = new Map(groupedSource.map((r) => [r.source, r._count._all]));
    const convMap = new Map(convCounts.map((r) => [r.channel, r._count._all]));

    const chatCount =
      (sourceMap.get("CHATBOT") ?? 0) +
      (sourceMap.get("LINE") ?? 0) +
      (convMap.get("CHATBOT") ?? 0) +
      (convMap.get("LINE") ?? 0);
    const callCount = (sourceMap.get("VOICEBOT") ?? 0) + (convMap.get("VOICEBOT") ?? 0);
    const webCount = (sourceMap.get("WEB") ?? 0) + (convMap.get("WEB") ?? 0);

    const channels = {
      total: chatCount + callCount + webCount,
      chat: chatCount,
      call: callCount,
      web: webCount,
    };

    res.json({ success: true, data: tickets, total: tickets.length, counts, channels });
  } catch (err) {
    next(err);
  }
}

// ===========================
// GET /api/projects/:projectId/tickets/:ticketId
// ===========================
export async function getProjectTicketById(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const access = await findAccessibleProject(req.params.projectId, req.user!);
    if (!access.project) {
      res.status(access.status).json({ success: false, error: access.error });
      return;
    }

    const ticket = await prisma.ticket.findFirst({
      where: { id: req.params.ticketId, projectId: access.project.id },
      include: {
        images: true,
        statusLogs: { orderBy: { createdAt: "asc" } },
        technician: true,
        review: true,
        user: { select: { id: true, name: true, phone: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });

    if (!ticket) {
      res.status(404).json({ success: false, error: "ไม่พบเคสที่ต้องการในโปรเจกต์นี้" });
      return;
    }

    res.json({ success: true, data: ticket });
  } catch (err) {
    next(err);
  }
}

// ===========================
// PATCH /api/projects/:projectId/tickets/:ticketId
// ===========================
export async function updateProjectTicket(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const access = await findAccessibleProject(req.params.projectId, req.user!);
    if (!access.project) {
      res.status(access.status).json({ success: false, error: access.error });
      return;
    }

    const data = updateTicketSchema.parse(req.body);
    const current = await prisma.ticket.findFirst({
      where: { id: req.params.ticketId, projectId: access.project.id },
      select: { id: true, status: true },
    });

    if (!current) {
      res.status(404).json({ success: false, error: "ไม่พบเคสที่ต้องการในโปรเจกต์นี้" });
      return;
    }

    if (data.technicianId) {
      const tech = await prisma.technician.findFirst({
        where: { id: data.technicianId, projectId: access.project.id },
        select: { id: true },
      });
      if (!tech) {
        res.status(404).json({ success: false, error: "ไม่พบช่างที่เลือกในโปรเจกต์นี้" });
        return;
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const statusChanged = Boolean(data.status && data.status !== current.status);
      const hasNote = Boolean(data.note && data.note.trim());
      if (statusChanged || hasNote) {
        await tx.statusLog.create({
          data: {
            ticketId: current.id,
            status: (data.status ?? current.status) as TicketStatus,
            note: data.note,
          },
        });
      }

      return tx.ticket.update({
        where: { id: current.id },
        data: {
          ...(data.status && { status: data.status as TicketStatus }),
          ...(data.technicianId !== undefined && { technicianId: data.technicianId }),
        },
        include: {
          technician: { select: { id: true, name: true, phone: true, area: true, specialty: true } },
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
// DELETE /api/projects/:projectId/tickets/:ticketId
// ===========================
export async function deleteProjectTicket(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const access = await findAccessibleProject(req.params.projectId, req.user!);
    if (!access.project) {
      res.status(access.status).json({ success: false, error: access.error });
      return;
    }

    const existing = await prisma.ticket.findFirst({
      where: { id: req.params.ticketId, projectId: access.project.id },
      include: { images: { select: { url: true } } },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: "ไม่พบรายการแจ้งซ่อมนี้ในโปรเจกต์" });
      return;
    }

    await prisma.ticket.delete({ where: { id: existing.id } });
    await removeTicketImageFiles(existing.images.map((img) => img.url));

    res.json({ success: true, message: "ลบรายการแจ้งซ่อมเรียบร้อยแล้ว" });
  } catch (err) {
    next(err);
  }
}

// ===========================
// POST /api/projects/:projectId/tickets/:ticketId/messages
// ===========================
export async function createProjectTicketMessage(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const access = await findAccessibleProject(req.params.projectId, req.user!);
    if (!access.project) {
      res.status(access.status).json({ success: false, error: access.error });
      return;
    }

    const data = createMessageSchema.parse(req.body);
    const ticket = await prisma.ticket.findFirst({
      where: { id: req.params.ticketId, projectId: access.project.id },
      select: { id: true, status: true },
    });

    if (!ticket) {
      res.status(404).json({ success: false, error: "ไม่พบเคสที่ต้องการ" });
      return;
    }

    if (ticket.status === TicketStatus.COMPLETED || ticket.status === TicketStatus.CANCELLED) {
      res.status(400).json({
        success: false,
        error: "เคสนี้ปิดแล้ว ไม่สามารถส่งข้อความได้ หากต้องการคุยต่อให้เปลี่ยนสถานะเคสก่อน",
      });
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
// โซนจัดการทีมช่าง (Add / Edit / Delete Technicians per Project)
// ===========================

export async function getProjectTechnicians(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const access = await findAccessibleProject(req.params.projectId, req.user!);
    if (!access.project) {
      res.status(access.status).json({ success: false, error: access.error });
      return;
    }

    const technicians = await prisma.technician.findMany({
      where: { projectId: access.project.id },
      orderBy: [{ isAvailable: "desc" }, { createdAt: "desc" }],
      include: {
        tickets: {
          select: { id: true, status: true, review: { select: { rating: true } } },
        },
      },
    });

    const data = technicians.map((t) => {
      const ratings = t.tickets
        .map((tk) => tk.review?.rating)
        .filter((r): r is number => typeof r === "number");
      const activeJobs = t.tickets.filter(
        (tk) => tk.status === TicketStatus.RECEIVED || tk.status === TicketStatus.IN_PROGRESS
      ).length;
      const completedJobs = t.tickets.filter((tk) => tk.status === TicketStatus.COMPLETED).length;

      return {
        id: t.id,
        name: t.name,
        phone: t.phone,
        area: t.area,
        specialty: t.specialty,
        isAvailable: t.isAvailable,
        projectId: t.projectId,
        createdAt: t.createdAt,
        stats: {
          totalJobs: t.tickets.length,
          activeJobs,
          completedJobs,
          avgRating:
            ratings.length > 0
              ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2))
              : null,
        },
      };
    });

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createProjectTechnician(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const access = await findAccessibleProject(req.params.projectId, req.user!);
    if (!access.project) {
      res.status(access.status).json({ success: false, error: access.error });
      return;
    }

    const data = createTechnicianSchema.parse(req.body);
    const technician = await prisma.technician.create({
      data: {
        name: data.name,
        phone: data.phone,
        area: data.area,
        specialty: data.specialty,
        isAvailable: data.isAvailable,
        projectId: access.project.id,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        ...technician,
        stats: { totalJobs: 0, activeJobs: 0, completedJobs: 0, avgRating: null },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateProjectTechnician(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const access = await findAccessibleProject(req.params.projectId, req.user!);
    if (!access.project) {
      res.status(access.status).json({ success: false, error: access.error });
      return;
    }

    const data = updateTechnicianSchema.parse(req.body);
    const existing = await prisma.technician.findFirst({
      where: { id: req.params.techId, projectId: access.project.id },
      select: { id: true },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: "ไม่พบข้อมูลช่างในโปรเจกต์นี้" });
      return;
    }

    const updated = await prisma.technician.update({
      where: { id: existing.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.area !== undefined && { area: data.area }),
        ...(data.specialty !== undefined && { specialty: data.specialty }),
        ...(data.isAvailable !== undefined && { isAvailable: data.isAvailable }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteProjectTechnician(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const access = await findAccessibleProject(req.params.projectId, req.user!);
    if (!access.project) {
      res.status(access.status).json({ success: false, error: access.error });
      return;
    }

    const existing = await prisma.technician.findFirst({
      where: { id: req.params.techId, projectId: access.project.id },
      select: { id: true },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: "ไม่พบข้อมูลช่างในโปรเจกต์นี้" });
      return;
    }

    await prisma.technician.delete({ where: { id: existing.id } });
    res.json({ success: true, message: "ลบรายชื่อช่างเรียบร้อยแล้ว" });
  } catch (err) {
    next(err);
  }
}

// ===========================
// ระบบกลางดูประวัติการคุยกับลูกค้า (Unified Central Chat History)
// รวมทั้ง ChatConversation (จาก Chatbot/LINE/Voicebot) และ Ticket Live Chat
// ===========================

export async function getProjectConversations(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const access = await findAccessibleProject(req.params.projectId, req.user!);
    if (!access.project) {
      res.status(access.status).json({ success: false, error: access.error });
      return;
    }

    const channelFilter = typeof req.query.channel === "string" ? req.query.channel.toUpperCase() : "";
    const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100).toLowerCase() : "";

    const [botConversations, ticketChats] = await Promise.all([
      prisma.chatConversation.findMany({
        where: { projectId: access.project.id },
        orderBy: { lastMessageAt: "desc" },
        include: {
          ticket: { select: { id: true, trackingCode: true, status: true, service: true } },
          messages: { orderBy: { createdAt: "asc" } },
        },
      }),
      prisma.ticket.findMany({
        where: {
          projectId: access.project.id,
          messages: { some: {} },
        },
        orderBy: { updatedAt: "desc" },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            include: { user: { select: { name: true } } },
          },
        },
      }),
    ]);

    const unified = [
      ...botConversations.map((c) => ({
        id: c.id,
        kind: "CHATBOT_LOG" as const,
        channel: c.channel,
        status: c.status,
        customerName: c.customerName,
        customerPhone: c.customerPhone,
        externalUserId: c.externalUserId,
        summary: c.summary || c.messages[c.messages.length - 1]?.text || "",
        ticket: c.ticket,
        lastMessageAt: c.lastMessageAt.toISOString(),
        messages: c.messages.map((m) => ({
          id: m.id,
          sender: m.sender,
          senderName: m.senderName || (m.sender === "BOT" ? "AI Chatbot" : c.customerName),
          text: m.text,
          createdAt: m.createdAt.toISOString(),
        })),
      })),
      ...ticketChats.map((t) => {
        const lastMsg = t.messages[t.messages.length - 1];
        return {
          id: `ticket:${t.id}`,
          kind: "TICKET_CHAT" as const,
          channel: "WEB",
          status:
            t.status === TicketStatus.COMPLETED || t.status === TicketStatus.CANCELLED
              ? "RESOLVED"
              : "OPEN",
          customerName: t.customerName,
          customerPhone: t.customerPhone,
          externalUserId: null,
          summary: `แชทใบงาน ${t.trackingCode}: ${t.symptom}`,
          ticket: {
            id: t.id,
            trackingCode: t.trackingCode,
            status: t.status,
            service: t.service,
          },
          lastMessageAt: (lastMsg?.createdAt ?? t.updatedAt).toISOString(),
          messages: t.messages.map((m) => ({
            id: m.id,
            sender: m.fromStaff ? "STAFF" : "CUSTOMER",
            senderName: m.fromStaff ? m.user?.name || "เจ้าหน้าที่" : t.customerName,
            text: m.text,
            createdAt: m.createdAt.toISOString(),
          })),
        };
      }),
    ]
      .filter((item) => {
        if (channelFilter && item.channel !== channelFilter) return false;
        if (!q) return true;
        return (
          item.customerName.toLowerCase().includes(q) ||
          (item.customerPhone || "").toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q) ||
          (item.ticket?.trackingCode || "").toLowerCase().includes(q) ||
          item.messages.some((m) => m.text.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

    res.json({ success: true, data: unified });
  } catch (err) {
    next(err);
  }
}

export async function sendConversationMessage(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const access = await findAccessibleProject(req.params.projectId, req.user!);
    if (!access.project) {
      res.status(access.status).json({ success: false, error: access.error });
      return;
    }

    const data = createConversationReplySchema.parse(req.body);
    const convId = req.params.convId;

    // กรณีเป็นแชทจาก Ticket (prefix ticket:<id>)
    if (convId.startsWith("ticket:")) {
      const ticketId = convId.slice("ticket:".length);
      const ticket = await prisma.ticket.findFirst({
        where: { id: ticketId, projectId: access.project.id },
        select: { id: true, status: true },
      });

      if (!ticket) {
        res.status(404).json({ success: false, error: "ไม่พบห้องสนทนาของใบงานนี้" });
        return;
      }

      if (ticket.status === TicketStatus.COMPLETED || ticket.status === TicketStatus.CANCELLED) {
        res.status(400).json({ success: false, error: "เคสนี้ปิดแล้ว ไม่สามารถส่งข้อความเพิ่มได้" });
        return;
      }

      const msg = await prisma.message.create({
        data: {
          ticketId: ticket.id,
          text: data.text,
          fromStaff: true,
          userId: req.user!.id,
        },
      });

      res.status(201).json({
        success: true,
        data: {
          id: msg.id,
          sender: "STAFF",
          senderName: req.user!.name,
          text: msg.text,
          createdAt: msg.createdAt.toISOString(),
        },
      });
      return;
    }

    // กรณีเป็น ChatConversation ที่ซิงค์มาจาก Chatbot Platform
    const conv = await prisma.chatConversation.findFirst({
      where: { id: convId, projectId: access.project.id },
      select: { id: true },
    });

    if (!conv) {
      res.status(404).json({ success: false, error: "ไม่พบประวัติการสนทนานี้" });
      return;
    }

    const now = new Date();
    const [msg] = await prisma.$transaction([
      prisma.chatLogMessage.create({
        data: {
          conversationId: conv.id,
          sender: "STAFF",
          senderName: req.user!.name,
          text: data.text,
          createdAt: now,
        },
      }),
      prisma.chatConversation.update({
        where: { id: conv.id },
        data: {
          lastMessageAt: now,
          ...(data.status && { status: data.status }),
        },
      }),
    ]);

    res.status(201).json({
      success: true,
      data: {
        id: msg.id,
        sender: msg.sender,
        senderName: msg.senderName,
        text: msg.text,
        createdAt: msg.createdAt.toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function simulateChatbotSync(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const access = await findAccessibleProject(req.params.projectId, req.user!);
    if (!access.project) {
      res.status(access.status).json({ success: false, error: access.error });
      return;
    }

    const now = new Date();
    const samples = [
      {
        customerName: "คุณธนพล ศรีสุข",
        customerPhone: "0897776655",
        channel: "CHATBOT",
        summary: "สอบถามอาการแอร์ตัดบ่อย ไฟหน้าเครื่องกระพริบ และขอนัดช่างตรวจสอบ",
        messages: [
          { sender: "CUSTOMER", senderName: "คุณธนพล ศรีสุข", text: "สวัสดีครับ แอร์ที่บ้านเปิดได้ 10 นาทีแล้วตัด ไฟกระพริบสีส้มครับ" },
          { sender: "BOT", senderName: "Botnoi AI Assistant", text: "อาการไฟกระพริบและเครื่องตัดมักเกิดจากเซนเซอร์อุณหภูมิหรือน้ำยาแอร์ขาดค่ะ ต้องการให้ช่วยนัดช่างเข้าตรวจสอบไหมคะ?" },
          { sender: "CUSTOMER", senderName: "คุณธนพล ศรีสุข", text: "สะดวกวันเสาร์นี้ช่วงบ่ายครับ รบกวนประเมินราคาเบื้องต้นด้วยนะ" },
          { sender: "BOT", senderName: "Botnoi AI Assistant", text: "ค่าตรวจเช็คหน้างานเริ่มต้น 400 บาท และแจ้งประเมินราคาก่อนซ่อมทุกครั้งค่ะ บันทึกประวัติการสนทนาส่งให้เจ้าหน้าที่เรียบร้อยแล้วค่ะ" },
        ],
      },
      {
        customerName: "คุณปิยวรรณ เมธา",
        customerPhone: "0864443322",
        channel: "LINE",
        summary: "ทักแชท LINE OA ขอเช็คคิวล้างแอร์ 2 เครื่องวันอาทิตย์",
        messages: [
          { sender: "CUSTOMER", senderName: "คุณปิยวรรณ เมธา", text: "วันอาทิตย์นี้มีคิวว่างล้างแอร์ 2 เครื่องแถวบางนาไหมคะ" },
          { sender: "BOT", senderName: "LINE OA Chatbot", text: "มีคิวว่างช่วง 10:00 น. และ 14:00 น. ค่ะ โปรล้าง 2 เครื่องขึ้นไปเหลือเครื่องละ 500 บาทค่ะ" },
          { sender: "CUSTOMER", senderName: "คุณปิยวรรณ เมธา", text: "ขอจองรอบ 10:00 น. เลยค่ะ" },
        ],
      },
    ];

    const pick = samples[Math.floor(Math.random() * samples.length)];
    const conv = await prisma.chatConversation.create({
      data: {
        projectId: access.project.id,
        externalUserId: `sync_${Date.now()}`,
        customerName: pick.customerName,
        customerPhone: pick.customerPhone,
        channel: pick.channel,
        status: "OPEN",
        summary: pick.summary,
        lastMessageAt: now,
        messages: {
          create: pick.messages.map((m, idx) => ({
            ...m,
            createdAt: new Date(now.getTime() - (pick.messages.length - idx) * 60000),
          })),
        },
      },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    res.status(201).json({ success: true, data: conv });
  } catch (err) {
    next(err);
  }
}

// ===========================
// GET /api/projects/:projectId/satisfaction
// แดชบอร์ดประเมินความพึงพอใจ (CSAT Analytics)
// ===========================
export async function getProjectSatisfaction(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const access = await findAccessibleProject(req.params.projectId, req.user!);
    if (!access.project) {
      res.status(access.status).json({ success: false, error: access.error });
      return;
    }

    const [reviews, completedCount] = await Promise.all([
      prisma.satisfactionReview.findMany({
        where: { projectId: access.project.id },
        orderBy: { createdAt: "desc" },
        include: {
          ticket: {
            select: {
              id: true,
              trackingCode: true,
              service: true,
              brand: true,
              technician: { select: { id: true, name: true, area: true } },
            },
          },
        },
      }),
      prisma.ticket.count({
        where: { projectId: access.project.id, status: TicketStatus.COMPLETED },
      }),
    ]);

    const totalReviews = reviews.length;
    const avgRating =
      totalReviews > 0
        ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(2))
        : 0;

    const speedRatings = reviews.map((r) => r.speedRating).filter((v): v is number => v !== null);
    const avgSpeed =
      speedRatings.length > 0
        ? Number((speedRatings.reduce((a, b) => a + b, 0) / speedRatings.length).toFixed(2))
        : 0;

    const serviceRatings = reviews
      .map((r) => r.serviceRating)
      .filter((v): v is number => v !== null);
    const avgService =
      serviceRatings.length > 0
        ? Number((serviceRatings.reduce((a, b) => a + b, 0) / serviceRatings.length).toFixed(2))
        : 0;

    const satisfiedCount = reviews.filter((r) => r.rating >= 4).length;
    const csatRate = totalReviews > 0 ? Math.round((satisfiedCount / totalReviews) * 100) : 0;
    const responseRate =
      completedCount > 0 ? Math.min(100, Math.round((totalReviews / completedCount) * 100)) : 0;

    // การกระจายคะแนน 5 -> 1 ดาว
    const distribution = [5, 4, 3, 2, 1].map((stars) => {
      const count = reviews.filter((r) => r.rating === stars).length;
      return {
        stars,
        count,
        percent: totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0,
      };
    });

    // คะแนนเฉลี่ยแยกตามประเภทบริการ
    const serviceBuckets = new Map<string, { sum: number; count: number }>();
    for (const r of reviews) {
      const svc = r.ticket.service;
      const cur = serviceBuckets.get(svc) ?? { sum: 0, count: 0 };
      cur.sum += r.rating;
      cur.count += 1;
      serviceBuckets.set(svc, cur);
    }
    const byService = Array.from(serviceBuckets.entries()).map(([service, val]) => ({
      service,
      avgRating: Number((val.sum / val.count).toFixed(2)),
      count: val.count,
    }));

    // คะแนนเฉลี่ยรายช่าง (Leaderboard)
    const techBuckets = new Map<string, { id: string; name: string; area: string; sum: number; count: number }>();
    for (const r of reviews) {
      const tech = r.ticket.technician;
      if (!tech) continue;
      const cur = techBuckets.get(tech.id) ?? {
        id: tech.id,
        name: tech.name,
        area: tech.area,
        sum: 0,
        count: 0,
      };
      cur.sum += r.rating;
      cur.count += 1;
      techBuckets.set(tech.id, cur);
    }
    const byTechnician = Array.from(techBuckets.values())
      .map((t) => ({
        id: t.id,
        name: t.name,
        area: t.area,
        avgRating: Number((t.sum / t.count).toFixed(2)),
        count: t.count,
      }))
      .sort((a, b) => b.avgRating - a.avgRating || b.count - a.count);

    // แท็กคำชมยอดนิยม
    const tagCounts = new Map<string, number>();
    for (const r of reviews) {
      for (const tag of r.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
    }
    const topTags = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    res.json({
      success: true,
      data: {
        summary: {
          avgRating,
          avgSpeed,
          avgService,
          csatRate,
          totalReviews,
          completedTickets: completedCount,
          responseRate,
        },
        distribution,
        byService,
        byTechnician,
        topTags,
        reviews: reviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          speedRating: r.speedRating,
          serviceRating: r.serviceRating,
          comment: r.comment,
          tags: r.tags,
          customerName: r.customerName,
          createdAt: r.createdAt,
          ticket: r.ticket,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}
