import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import {
  createTicketSchema,
  createMessageSchema,
  trackingCodeSchema,
} from "../validations/ticket.validation";
import { createReviewSchema } from "../validations/project.validation";
import { AuthRequest } from "../middleware/auth";
import { TicketStatus, ServiceType } from "@prisma/client";
import crypto from "crypto";
import fs from "fs";
import {
  bangkokDateString,
  startOfTodayBangkokAsUtc,
  earliestBookingDateBangkok,
} from "../lib/date";

// ===========================
// nanoid: ตัวพิมพ์ใหญ่ + ตัวเลข 4 ตัว
// ===========================
const CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const nanoid = (length = 4): string => {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += CODE_ALPHABET[crypto.randomInt(0, CODE_ALPHABET.length)];
  }
  return result;
};

// ===========================
// สร้างรหัสติดตาม CC-YYYYMMDD-XXXX
// สุ่มใหม่จนกว่าจะไม่ซ้ำ ถ้าชนครบทุกรอบจะ throw (ห้ามคืนรหัสที่ซ้ำ)
// ===========================
const MAX_CODE_ATTEMPTS = 10;

export async function generateUniqueCode(now: Date = new Date()): Promise<string> {
  // ใช้วันที่ตามเวลาไทยเสมอ (server บน Vercel/Render เป็น UTC ทำให้เคสช่วง 00:00-07:00 ได้วันที่ของเมื่อวาน)
  const ymd = bangkokDateString(now).replace(/-/g, "");

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const code = `CC-${ymd}-${nanoid()}`;
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

    // ถ้าส่ง projectSlug มา (เช่นจากหน้า /p/:slug/book) ให้ผูกเคสเข้าโปรเจกต์นั้น
    let projectId: string | undefined;
    if (data.projectSlug) {
      const project = await prisma.project.findUnique({
        where: { slug: data.projectSlug },
        select: { id: true, isActive: true },
      });
      if (!project || !project.isActive) {
        await removeUploadedFiles(files);
        res.status(404).json({ success: false, error: "ไม่พบโปรเจกต์หรือร้านค้าที่ระบุ" });
        return;
      }
      projectId = project.id;
    }

    const imageUrls = files.map((f) => {
      if (f.buffer) {
        return `data:${f.mimetype};base64,${f.buffer.toString("base64")}`;
      }
      return `/uploads/${f.filename}`;
    });

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
          ...(projectId ? { projectId } : {}),
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
    // ตัด userId ออกเหมือน GET /tickets/:code เพื่อไม่เปิดเผยรหัสผู้ใช้ภายใน
    const { userId: _omittedUserId, ...publicTicket } = ticket;
    res.status(201).json({
      success: true,
      data: {
        ...publicTicket,
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
      // รหัสในฐานข้อมูลเป็นตัวพิมพ์ใหญ่เสมอ (validation รับตัวพิมพ์เล็กด้วย) จึงต้องแปลงก่อนค้น
      where: { trackingCode: code.toUpperCase() },
      include: {
        images: { select: { id: true, url: true } },
        statusLogs: { orderBy: { createdAt: "asc" } },
        technician: { select: { id: true, name: true, phone: true, area: true } },
        review: true,
        project: { select: { id: true, name: true, slug: true, phone: true } },
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
      // รหัสในฐานข้อมูลเป็นตัวพิมพ์ใหญ่เสมอ (validation รับตัวพิมพ์เล็กด้วย) จึงต้องแปลงก่อนค้น
      where: { trackingCode: code.toUpperCase() },
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
        // endpoint สาธารณะ: ส่งเฉพาะชื่อผู้ส่ง ไม่เปิดเผย id ภายในของผู้ใช้ (กฎเดียวกับ GET /tickets/:code)
        user: { select: { name: true } },
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
      // รหัสในฐานข้อมูลเป็นตัวพิมพ์ใหญ่เสมอ (validation รับตัวพิมพ์เล็กด้วย) จึงต้องแปลงก่อนค้น
      where: { trackingCode: code.toUpperCase() },
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
        // endpoint สาธารณะ: ส่งเฉพาะชื่อผู้ส่ง ไม่เปิดเผย id ภายในของผู้ใช้ (กฎเดียวกับ GET /tickets/:code)
        user: { select: { name: true } },
      },
    });

    res.status(201).json({ success: true, data: message });
  } catch (err) {
    next(err);
  }
}

// ===========================
// GET /api/tickets/my - ดึงงานซ่อมของลูกค้าที่ล็อกอินอยู่
// ===========================
export const getMyTickets = async (req: any, res: any) => {
  try {
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อน' })
    }

    // ดึงเฉพาะเคสที่ผูกกับบัญชีนี้จริง (userId) เท่านั้น
    // ห้ามค้นจากเบอร์โทร: การสมัครสมาชิกไม่ได้ยืนยันว่าเป็นเจ้าของเบอร์ (ไม่มี OTP)
    // ถ้าค้นจากเบอร์ ใครเอาเบอร์คนอื่นมาสมัครก็จะเห็นเคสและข้อมูลของเจ้าของเบอร์ได้
    // (รวมถึงเคสจากแชทบอทที่ไม่มีเบอร์ซึ่งถูกบันทึกเป็น 0800000000 ทั้งหมด)
    const tickets = await prisma.ticket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        technician: true,
        images: true,
        statusLogs: { orderBy: { createdAt: 'desc' } },
      },
    })

    return res.json({ success: true, data: tickets })
  } catch (error) {
    console.error('getMyTickets error:', error)
    return res.status(500).json({ success: false, error: 'ไม่สามารถดึงข้อมูลประวัติการแจ้งซ่อมได้' })
  }
}


// ===========================
// Helper แปลงคำอ่านตัวเลขไทยและคำว่า "ทับ" ในบ้านเลขที่/วันที่ ให้เป็นเลขอารบิก
// ===========================
const THAI_UNIT_MAP: Record<string, string> = {
  ศูนย์: "0", หนึ่ง: "1", เอ็ด: "1", สอง: "2", ยี่: "2",
  สาม: "3", สี่: "4", ห้า: "5", หก: "6", เจ็ด: "7", แปด: "8", เก้า: "9",
};

// แปลงกลุ่มคำอ่านตัวเลขที่ติดกัน เช่น "ยี่สิบเอ็ด" -> "21", "สามสิบ" -> "30", "สี่" -> "4"
function convertThaiNumberRun(run: string): string {
  const tensRe =
    /^(ยี่|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า)?สิบ(เอ็ด|หนึ่ง|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า)?/;
  const unitRe = /^(ศูนย์|หนึ่ง|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า)/;
  let rest = run;
  let out = "";
  while (rest.length > 0) {
    const tens = rest.match(tensRe);
    if (tens) {
      out += `${tens[1] ? THAI_UNIT_MAP[tens[1]] : "1"}${tens[2] ? THAI_UNIT_MAP[tens[2]] : "0"}`;
      rest = rest.slice(tens[0].length);
      continue;
    }
    const unit = rest.match(unitRe);
    if (unit) {
      out += THAI_UNIT_MAP[unit[1]];
      rest = rest.slice(unit[0].length);
      continue;
    }
    // ไม่ใช่รูปแบบตัวเลขที่รู้จัก (เช่น "เอ็ด"/"ยี่" ลอยๆ) -> คืนค่าเดิมทั้งก้อน
    return run;
  }
  return out;
}

export function normalizeThaiSpokenNumbers(input: string): string {
  const thaiDigits = "๐๑๒๓๔๕๖๗๘๙";
  let out = input.replace(/[๐-๙]/g, (d) => String(thaiDigits.indexOf(d)));

  // แปลงเฉพาะคำอ่านตัวเลขที่ "จบคำ" จริงๆ คือถัดไปเป็นช่องว่าง/ตัวเลข/เครื่องหมาย/คำว่า "ทับ"/จบข้อความ
  // เพื่อไม่ให้คำทั่วไปที่ขึ้นต้นด้วยคำอ่านตัวเลขเพี้ยน เช่น สามเสน, ห้าแยก, เก้าอี้, สองแคว
  out = out.replace(
    /(?:ศูนย์|หนึ่ง|เอ็ด|สอง|ยี่|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า|สิบ)+(?=$|[\s\d/.,:;()\-|]|ทับ)/g,
    (run) => convertThaiNumberRun(run)
  );

  // รวมเลขหลักเดียวที่เว้นวรรคติดกัน (เช่น 0 8 1 -> 081) แต่ไม่ยุ่งกับตัวเลขหลายหลัก เช่น "ซอย 5 10400"
  out = out.replace(/(?<!\d)\d(?:\s+\d(?!\d))+(?!\d)/g, (m) => m.replace(/\s+/g, ""));

  // แปลงคำว่า "ทับ" ระหว่างตัวเลขเป็น "/"
  out = out.replace(/(\d)\s*ทับ\s*(\d)/g, "$1/$2");

  return out;
}





// ===========================
// POST /api/tickets/botnoi-webhook
// รับข้อมูลแจ้งซ่อมจาก Botnoi AI Agent (<customer_name>, <phone>, <info>, <date>, <ticket>)
// ===========================
// ===========================
// Helper แปลงวันที่จากแชทบอท (รองรับทั้ง YYYY-MM-DD และภาษาไทย เช่น "7 กันยายน 2570")
// ===========================
// วันในสัปดาห์ (0 = อาทิตย์) สำหรับคำพูดอย่าง "วันเสาร์นี้"
const THAI_WEEKDAYS: [RegExp, number][] = [
  [/อาทิตย์/, 0], [/จันทร์/, 1], [/อังคาร/, 2], [/พุธ/, 3],
  [/พฤหัส/, 4], [/ศุกร์/, 5], [/เสาร์/, 6],
];

// แปลงคำบอกวันแบบสัมพัทธ์ (Voicebot ส่งมาตามที่ลูกค้าพูด) เป็นวันที่ (UTC midnight ของวันตามเวลาไทย)
// คืน null ถ้าไม่ใช่คำแบบสัมพัทธ์ที่รู้จัก
function parseRelativeThaiDate(text: string, now: Date): Date | null {
  const today = startOfTodayBangkokAsUtc(now);
  const addDays = (n: number) => new Date(today.getTime() + n * 86400000);

  if (/มะรืน/.test(text)) return addDays(2);
  if (/พรุ่งนี้/.test(text)) return addDays(1);
  if (/วันนี้/.test(text)) return today;

  for (const [re, weekday] of THAI_WEEKDAYS) {
    if (re.test(text) && /(วัน|นี้|หน้า)/.test(text)) {
      let diff = (weekday - today.getUTCDay() + 7) % 7;
      if (diff === 0) diff = 7; // "วันเสาร์นี้" เมื่อวันนี้เป็นวันเสาร์ = เสาร์ถัดไป
      if (/หน้า/.test(text) && diff < 7) diff += 7; // "เสาร์หน้า" = สัปดาห์ถัดไป
      return addDays(diff);
    }
  }
  return null;
}

export function parseBotnoiDate(raw: string, now: Date = new Date()): Date {
  const fallback = new Date(startOfTodayBangkokAsUtc(now).getTime() + 86400000);
  if (!raw) return fallback;

  const text = normalizeThaiSpokenNumbers(raw.trim());

  // 0. คำบอกวันแบบสัมพัทธ์ เช่น "พรุ่งนี้", "มะรืนนี้", "วันเสาร์นี้" (ใช้เมื่อไม่มีวันที่เป็นตัวเลขกำกับ)
  if (!/\d/.test(text)) {
    const relative = parseRelativeThaiDate(text, now);
    if (relative) return relative;
  }

  // 1. กรณีส่งมาเป็น YYYY-MM-DD
  const isoMatch = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    let year = parseInt(isoMatch[1], 10);
    if (year > 2400) year -= 543; // แปลง พ.ศ. เป็น ค.ศ.
    const month = String(isoMatch[2]).padStart(2, "0");
    const day = String(isoMatch[3]).padStart(2, "0");
    const d = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
    if (!isNaN(d.getTime())) return d;
  }

  // 2. กรณีส่งมาเป็นภาษาไทย เช่น "วันที่ 7 กันยายน 2570" หรือ "7 ก.ย. 70"
  const thaiMonths: Record<string, number> = {
    มกรา: 1, "ม.ค": 1, กุมภา: 2, "ก.พ": 2, มีนา: 3, "มี.ค": 3,
    เมษา: 4, "เม.ย": 4, พฤษภา: 5, "พ.ค": 5, มิถุนา: 6, "มิ.ย": 6,
    กรกฎา: 7, "ก.ค": 7, สิงหา: 8, "ส.ค": 8, กันยา: 9, "ก.ย": 9,
    ตุลา: 10, "ต.ค": 10, พฤศจิกา: 11, "พ.ย": 11, ธันวา: 12, "ธ.ค": 12,
  };

  for (const [key, mNum] of Object.entries(thaiMonths)) {
    if (text.includes(key)) {
      const nums = text.match(/\d+/g)?.map(Number) || [];
      const day = nums.find((n) => n >= 1 && n <= 31) || new Date().getDate();
      let year = nums.find((n) => n >= 67 && n <= 2600) || new Date().getFullYear();
      if (year < 100) year += 2500; // เช่น "ปี 70" -> 2570
      if (year > 2400) year -= 543; // แปลง พ.ศ. เป็น ค.ศ.
      const monthStr = String(mNum).padStart(2, "0");
      const dayStr = String(day).padStart(2, "0");
      const d = new Date(`${year}-${monthStr}-${dayStr}T00:00:00.000Z`);
      if (!isNaN(d.getTime())) return d;
    }
  }

  const parsed = new Date(text);
  return isNaN(parsed.getTime()) ? fallback : parsed;
}

// ===========================
// Helper แยก อุปกรณ์(brand), อาการเสีย(symptom), และที่อยู่(address) ออกจาก <info>
// ===========================
function parseBotnoiInfo(rawInfo: string): {
  brand: string;
  symptom: string;
  address: string;
} {
  const text = normalizeThaiSpokenNumbers(rawInfo.trim());

  // 1. กรณีบอทส่งมาคั่นด้วย | เช่น "PS4 | เปิดไม่ติด | backroom"
  if (text.includes("|")) {
    const parts = text.split("|").map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 3) {
      return {
        brand: parts[0],
        symptom: parts[1],
        address: parts.slice(2).join(" "),
      };
    }
    if (parts.length === 2) {
      return {
        brand: "แจ้งผ่าน AI Chatbot",
        symptom: parts[0],
        address: parts[1],
      };
    }
  }

  // 2. กรณีบอทเขียนรวมกัน เช่น "PS4 เปิดไม่ติด, ที่อยู่หน้างาน: backroom" หรือ "อยู่ที่ ..."
  const addrRegex = /(?:,|\s)*(?:ที่อยู่หน้างาน|ที่อยู่|สถานที่|อยู่ที่)\s*[:：]?\s*(.+)$/i;
  const match = text.match(addrRegex);
  if (match && match.index !== undefined) {
    const symptomPart = text.slice(0, match.index).replace(/[,\s]+$/, "").trim();
    const addressPart = match[1].trim();
    return {
      brand: "แจ้งผ่าน AI Chatbot",
      symptom: symptomPart || text,
      address: addressPart || "-",
    };
  }

  // 3. Fallback กรณีไม่มีคำบอกที่อยู่ชัดเจน
  return {
    brand: "แจ้งผ่าน AI Chatbot",
    symptom: text,
    address: "ตามที่แจ้งในแชทบอท",
  };
}




// ===========================
// หาประเภทบริการของเคสจากแชทบอท
// 1) ใช้ค่า <service> ที่บอทส่งมาตรงๆ (รับทั้งรหัส CLEANING/REPAIR/INSTALLATION/IT_REPAIR และคำภาษาไทย)
// 2) ถ้าไม่มี -> เดาจากข้อความ โดยเช็กงานไอทีก่อน เพื่อไม่ให้ "ล้างไวรัส" กลายเป็นล้างแอร์
//    หรือ "ติดตั้งโปรแกรม" กลายเป็นติดตั้งแอร์
// ===========================
const IT_KEYWORDS =
  // "คอม" ต้องไม่ใช่ "คอมเพรสเซอร์"/"คอมแอร์" ซึ่งเป็นอะไหล่ของแอร์
  /คอม(?!เพรส|แอร์)|โน้ตบุ๊ก|โน๊ตบุ๊ก|โน้ตบุ๊ค|โน๊ตบุ๊ค|notebook|laptop|\bpc\b|การ์ดจอ|\bgpu\b|เมนบอร์ด|ซีพียู|\bcpu\b|\bram\b|\bssd\b|\bhdd\b|ฮาร์ดดิสก์|ปริ้นเตอร์|ปริ้นท์เตอร์|printer|เครื่องพิมพ์|ps4|ps5|playstation|xbox|nintendo|เครื่องเกม|มือถือ|โทรศัพท์มือถือ|iphone|ipad|แท็บเล็ต|tablet|เราเตอร์|router|ไวไฟ|wi-?fi|วินโดว์|windows|โปรแกรม|ไวรัส|มอนิเตอร์|monitor/i;

const SERVICE_ALIASES: Record<string, ServiceType> = {
  CLEANING: ServiceType.CLEANING,
  REPAIR: ServiceType.REPAIR,
  INSTALLATION: ServiceType.INSTALLATION,
  IT_REPAIR: ServiceType.IT_REPAIR,
  ล้างแอร์: ServiceType.CLEANING,
  ซ่อมแอร์: ServiceType.REPAIR,
  ติดตั้งแอร์: ServiceType.INSTALLATION,
  ย้ายแอร์: ServiceType.INSTALLATION,
  "ติดตั้ง/ย้ายแอร์": ServiceType.INSTALLATION,
  ซ่อมไอที: ServiceType.IT_REPAIR,
  ซ่อมอุปกรณ์ไอที: ServiceType.IT_REPAIR,
};

export function resolveBotnoiService(serviceRaw: string | undefined, info: string): ServiceType {
  const key = (serviceRaw ?? "").trim().replace(/\s+/g, "");
  const explicit = SERVICE_ALIASES[key.toUpperCase()] ?? SERVICE_ALIASES[key];
  if (explicit) return explicit;

  if (IT_KEYWORDS.test(info)) return ServiceType.IT_REPAIR;
  if (/ล้างแอร์|ล้าง|ทำความสะอาด/.test(info)) return ServiceType.CLEANING;
  if (/ติดตั้ง|ย้ายแอร์|ย้ายจุด|ติดแอร์/.test(info)) return ServiceType.INSTALLATION;
  return ServiceType.REPAIR;
}

// ===========================
// response ของ webhook: ส่งเฉพาะสิ่งที่บอทต้องใช้ตอบลูกค้า
// (endpoint นี้เป็น public จึงห้ามคืนข้อมูลส่วนตัว เช่น ชื่อ/เบอร์/ที่อยู่ ของเคส)
// ===========================
export function botnoiTicketResponse(ticket: {
  trackingCode: string;
  status: TicketStatus;
  service: string;
  preferredDate: Date;
}) {
  return {
    success: true,
    trackingCode: ticket.trackingCode,
    message: `บันทึกใบงานสำเร็จ รหัสติดตามงานซ่อมคือ ${ticket.trackingCode}`,
    data: {
      trackingCode: ticket.trackingCode,
      status: ticket.status,
      service: ticket.service,
      preferredDate: ticket.preferredDate,
    },
  };
}

// ===========================
// ตรวจ shared secret ของ webhook (เปิดใช้เมื่อตั้งค่า BOTNOI_WEBHOOK_SECRET บนเซิร์ฟเวอร์)
// ให้ตั้งค่าเดียวกันเป็น header "x-webhook-secret" ในฝั่ง Botnoi
// ===========================
export function isBotnoiWebhookAuthorized(req: Request): boolean {
  const secret = process.env.BOTNOI_WEBHOOK_SECRET?.trim();
  if (!secret) return true; // ยังไม่ได้ตั้งค่า -> ทำงานแบบเดิม (เข้ากันได้ย้อนหลัง)
  const provided = String(req.headers["x-webhook-secret"] ?? "");
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ===========================
// POST /api/tickets/botnoi-webhook
// ===========================
export async function createTicketFromBotnoi(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!isBotnoiWebhookAuthorized(req)) {
      res.status(401).json({ success: false, error: "webhook secret ไม่ถูกต้อง" });
      return;
    }

    const {
      customer_name,
      phone,
      info,
      date,
      ticket: botTicketCode,
      service: botService,
    } = req.body || {};

    const isPlaceholder = (val: unknown) =>
      !val || String(val).includes("<") || String(val).includes(">");

    const cleanName = isPlaceholder(customer_name)
      ? "ลูกค้าแจ้งผ่าน AI Chatbot"
      : String(customer_name).trim();

    const digitsOnly = String(phone || "").replace(/\D/g, "").slice(0, 10);
    const hasRealPhone = digitsOnly.length === 10;
    const cleanPhone = hasRealPhone ? digitsOnly : `08${"0".repeat(8)}`;

    const cleanInfo = isPlaceholder(info)
      ? "แจ้งซ่อมผ่านแชทบอท Plasom"
      : String(info).trim();

    // แยก brand, symptom, address ไม่ให้ทับกัน
    const { brand, symptom, address } = parseBotnoiInfo(cleanInfo);

    // ประเภทบริการ: ใช้ค่า <service> ที่บอทส่งมาก่อน ถ้าไม่มี/ไม่ถูกต้องค่อยเดาจากข้อความ
    const detectedService = resolveBotnoiService(
      isPlaceholder(botService) ? undefined : String(botService),
      cleanInfo
    );

    // ดึงรหัส CC-YYYYMMDD-XXXX ที่บอทแนบมาใน <date> หรือ <ticket> หรือ <info>
    const combinedRaw = `${botTicketCode || ""} ${date || ""} ${info || ""}`;
    const [matchedCode] = combinedRaw.match(/(CC-[0-9]{8}-[A-Z0-9]{4,}|TCK-[A-Z0-9-]+)/i) ?? [];
    const botCode = matchedCode ? matchedCode.toUpperCase() : null;


    // ===========================
    // ด่านที่ 1: ถ้ารหัสใบงานที่บอทส่งมามีอยู่แล้ว และเป็นของเบอร์เดียวกันหรือเพิ่งสร้างไม่เกิน 2 นาที
    // แปลว่าบอทยิงซ้ำจากสายสนทนาเดิม -> คืนใบงานเดิมกลับไปทันที ห้ามสุ่มรหัสใหม่มาสร้างซ้ำ
    // ===========================
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

    if (botCode) {
      const existingByCode = await prisma.ticket.findUnique({
        where: { trackingCode: botCode },
      });

      // เทียบเบอร์เฉพาะเมื่อบอทส่งเบอร์จริงมา — เบอร์ placeholder (0800000000) ใช้ร่วมกันทุกเคสที่ไม่มีเบอร์
      // ถ้าเอามาเทียบ ใครก็ส่งรหัสของเคสอื่นมาแล้วได้ข้อมูลเคสนั้นกลับไปได้
      const samePhone = hasRealPhone && existingByCode?.customerPhone === cleanPhone;
      if (existingByCode && (samePhone || existingByCode.createdAt >= twoMinutesAgo)) {
        res.status(200).json(botnoiTicketResponse(existingByCode));
        return;
      }
    }

    // ===========================
    // ด่านที่ 2: ป้องกัน AI เผลอสุ่มรหัสใหม่แล้วยิงซ้ำตอนลูกค้าพูดขอบคุณ/บอกลา (ภายใน 2 นาที)
    // ===========================
    const recentDuplicate = await prisma.ticket.findFirst({
      where: {
        service: detectedService,
        createdAt: { gte: twoMinutesAgo },
        ...(hasRealPhone
          ? { customerPhone: cleanPhone }
          : { customerName: cleanName, symptom }),
      },
      orderBy: { createdAt: "desc" },
    });

    if (recentDuplicate) {
      res.status(200).json(botnoiTicketResponse(recentDuplicate));
      return;
    }

    // ตัดรหัส CC-... ออกจากข้อความวันที่ เพื่อให้เหลือแต่วันที่สะอาดๆ
    const rawDateOnly = !isPlaceholder(date)
      ? String(date)
          .replace(/\|?\s*(CC-[0-9]{8}-[A-Z0-9]{4,}|TCK-[A-Z0-9-]+)/gi, "")
          .trim()
      : "";

    const cleanDateText = rawDateOnly || "ตามนัดหมายในแชท";

    // แปลงวันที่นัดหมายด้วย parseBotnoiDate
    const preferredDate = rawDateOnly
      ? parseBotnoiDate(rawDateOnly)
      : new Date(Date.now() + 86400000);

    // กฎวันนัดเดียวกับฟอร์มบนเว็บและ API สร้างเคส: ต้องเป็นตั้งแต่พรุ่งนี้ (ตามเวลาไทย)
    if (preferredDate < earliestBookingDateBangkok()) {
      res.status(400).json({
        success: false,
        error: "วันนัดหมายต้องเป็นตั้งแต่พรุ่งนี้เป็นต้นไป กรุณาเลือกวันใหม่",
      });
      return;
    }

    // ใช้รหัสเดียวกับที่บอทสร้างในแชท (สุ่มใหม่เฉพาะกรณีชนกับเคสเก่าของคนอื่นจริงๆ เท่านั้น)
    let trackingCode = botCode || (await generateUniqueCode());

    const existing = await prisma.ticket.findUnique({ where: { trackingCode } });
    if (existing) {
      trackingCode = await generateUniqueCode();
    }

    // รองรับการผูกโปรเจกต์จาก query ?project=<slug> หรือ body.projectSlug
    const rawProjectSlug =
      (typeof req.query?.project === "string" ? req.query.project : undefined) ||
      (typeof req.body?.projectSlug === "string" ? req.body.projectSlug : undefined);
    let projectId: string | undefined;
    if (rawProjectSlug && rawProjectSlug.trim()) {
      const proj = await prisma.project.findUnique({
        where: { slug: rawProjectSlug.trim().toLowerCase() },
        select: { id: true, isActive: true },
      });
      if (proj && proj.isActive) {
        projectId = proj.id;
      }
    }

    const createdTicket = await prisma.$transaction(async (tx) => {
      const t = await tx.ticket.create({
        data: {
          trackingCode,
          service: detectedService,
          brand,
          symptom,
          address,
          preferredDate,
          note: `เวลานัดที่ลูกค้าแจ้งในแชท: ${cleanDateText}`,
          customerName: cleanName,
          customerPhone: cleanPhone,
          source: "CHATBOT",
          ...(projectId ? { projectId } : {}),
        },
      });

      await tx.statusLog.create({
        data: {
          ticketId: t.id,
          status: TicketStatus.SUBMITTED,
          note: "รับเรื่องอัตโนมัติผ่าน Plasom AI Agent (Botnoi.ai)",
        },
      });

      // ถ้าผูกโปรเจกต์อยู่ ให้บันทึกประวัติการแจ้งซ่อมเข้าศูนย์รวมแชทกลางของโปรเจกต์ด้วย
      if (projectId && tx.chatConversation) {
        await tx.chatConversation.create({
          data: {
            projectId,
            ticketId: t.id,
            customerName: cleanName,
            customerPhone: hasRealPhone ? cleanPhone : undefined,
            channel: "CHATBOT",
            status: "OPEN",
            summary: `แจ้งซ่อมผ่าน AI Chatbot (${trackingCode}): ${symptom}`,
            messages: {
              create: [
                {
                  sender: "CUSTOMER",
                  senderName: cleanName,
                  text: cleanInfo,
                },
                {
                  sender: "BOT",
                  senderName: "Botnoi AI Agent",
                  text: `บันทึกใบงานสำเร็จ รหัสติดตามงานซ่อมคือ ${trackingCode}`,
                },
              ],
            },
          },
        });
      }

      return t;
    });

    res.status(201).json(botnoiTicketResponse(createdTicket));
  } catch (err) {
    console.error("❌ [Botnoi Webhook Error]:", err);
    next(err);
  }
}


// ===========================
// GET /api/tickets/tts?text=...
// ดึงเสียงผู้หญิงภาษาไทยธรรมชาติ (Google Thai Female TTS) ส่งกลับเป็น MP3
// ===========================
export async function getThaiFemaleVoice(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const text = String(req.query.text || "").trim().slice(0, 200);
    if (!text) {
      res.status(400).json({ success: false, error: "กรุณาระบุข้อความ" });
      return;
    }

    const ttsUrl = `https://translate.googleapis.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
      text
    )}&tl=th&client=tw-ob`;

    const response = await fetch(ttsUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!response.ok) {
      res.status(502).json({ success: false, error: "ไม่สามารถสร้างเสียงพูดได้" });
      return;
    }

    const arrayBuffer = await response.arrayBuffer();
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    next(err);
  }
}


// ===========================
// POST /api/tickets/voicebot-token
// ขอ ephemeral_token ชั่วคราวจาก Botnoi Voicebot เพื่อให้หน้าเว็บคุยสดผ่าน WSS
// ===========================
export async function createVoicebotCallToken(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const accessToken = process.env.BOTNOI_VOICEBOT_ACCESS_TOKEN?.trim();
    const agentId = (process.env.BOTNOI_VOICEBOT_AGENT_ID || "agt_393eec992097").trim();
    const mintUrl = (
      process.env.BOTNOI_VOICEBOT_MINT_URL ||
      "https://backend-voicebot-stg.botnoigroup.com/call/tokens"
    ).trim();
    const wsUrl = (
      process.env.BOTNOI_VOICEBOT_WS_URL ||
      "wss://voicebot-serverless-stg.botnoigroup.com/v1/call"
    ).trim();

    if (!accessToken) {
      res.status(500).json({
        success: false,
        error: "ยังไม่ได้ตั้งค่า BOTNOI_VOICEBOT_ACCESS_TOKEN บนเซิร์ฟเวอร์",
      });
      return;
    }

    const response = await fetch(mintUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agent_id: agentId,
        channel: "web",
      }),
    });

    const body = (await response.json().catch(() => ({}))) as {
      ephemeral_token?: string;
      session_id?: string | null;
      detail?: string;
    };

    if (!response.ok || typeof body.ephemeral_token !== "string") {
      const reason =
        response.status === 401
          ? "โทเคนฝั่งเซิร์ฟเวอร์หมดอายุหรือไม่ถูกต้อง กรุณาอัปเดตค่าจากหน้า Developers"
          : body.detail || `HTTP ${response.status}`;
      res.status(502).json({
        success: false,
        error: `ไม่สามารถขอสิทธิ์เชื่อมต่อ Voicebot ได้ (${reason})`,
      });
      return;
    }

    res.json({
      success: true,
      data: {
        ephemeralToken: body.ephemeral_token,
        wsUrl,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ===========================
// POST /api/tickets/:code/review
// ลูกค้าส่งแบบประเมินความพึงพอใจเมื่อเคสเสร็จสิ้น (CSAT)
// ===========================
export async function submitTicketReview(
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

    const data = createReviewSchema.parse(req.body);

    const ticket = await prisma.ticket.findUnique({
      where: { trackingCode: code.toUpperCase() },
      include: { review: true },
    });

    if (!ticket) {
      res.status(404).json({ success: false, error: "ไม่พบรหัสติดตามนี้ในระบบ" });
      return;
    }

    if (ticket.status !== TicketStatus.COMPLETED) {
      res.status(400).json({
        success: false,
        error: "สามารถประเมินความพึงพอใจได้เมื่อสถานะงานซ่อมเสร็จสิ้นแล้วเท่านั้น",
      });
      return;
    }

    if (ticket.review) {
      res.status(409).json({
        success: false,
        error: "เคสนี้ได้รับการประเมินความพึงพอใจเรียบร้อยแล้ว ขอบคุณสำหรับความคิดเห็นค่ะ",
      });
      return;
    }

    const review = await prisma.satisfactionReview.create({
      data: {
        ticketId: ticket.id,
        projectId: ticket.projectId,
        customerName: ticket.customerName,
        rating: data.rating,
        speedRating: data.speedRating,
        serviceRating: data.serviceRating,
        comment: data.comment,
        tags: data.tags,
      },
    });

    res.status(201).json({
      success: true,
      message: "ขอบคุณสำหรับการประเมินความพึงพอใจค่ะ",
      data: review,
    });
  } catch (err) {
    next(err);
  }
}
