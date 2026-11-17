import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeThaiSpokenNumbers,
  createTicketFromBotnoi,
  generateUniqueCode,
  isBotnoiWebhookAuthorized,
} from "../src/controllers/ticket.controller";
import { removeTicketImageFiles } from "../src/controllers/admin.controller";
import { createTicketSchema } from "../src/validations/ticket.validation";
import { bangkokDateString, startOfTodayBangkokAsUtc } from "../src/lib/date";
import { mockRes, stubPrisma } from "./helpers";

// ===========================
// Bug: แปลงคำอ่านตัวเลขไทยทับคำทั่วไป
// ===========================
test("normalizeThaiSpokenNumbers: ไม่แปลงคำทั่วไปที่ขึ้นต้นด้วยคำอ่านตัวเลข", () => {
  assert.equal(normalizeThaiSpokenNumbers("ถนนสามเสน แขวงห้าแยก"), "ถนนสามเสน แขวงห้าแยก");
  assert.equal(normalizeThaiSpokenNumbers("แอร์อยู่ข้างเก้าอี้"), "แอร์อยู่ข้างเก้าอี้");
  assert.equal(normalizeThaiSpokenNumbers("อำเภอสองแคว"), "อำเภอสองแคว");
});

test("normalizeThaiSpokenNumbers: ยังแปลงตัวเลขที่พูดจริงได้", () => {
  assert.equal(normalizeThaiSpokenNumbers("บ้านเลขที่สิบสี่ทับสอง"), "บ้านเลขที่14/2");
  assert.equal(normalizeThaiSpokenNumbers("ยี่สิบเอ็ด กันยายน"), "21 กันยายน");
  assert.equal(normalizeThaiSpokenNumbers("ศูนย์ แปด หนึ่ง"), "081");
  assert.equal(normalizeThaiSpokenNumbers("๑๒๓ ซอย ๕"), "123 ซอย 5");
});

test("normalizeThaiSpokenNumbers: ไม่รวมตัวเลขหลายหลักที่เว้นวรรคเข้าด้วยกัน", () => {
  assert.equal(normalizeThaiSpokenNumbers("ซอย 5 10400"), "ซอย 5 10400");
  assert.equal(normalizeThaiSpokenNumbers("12 34"), "12 34");
});

// ===========================
// Bug: webhook คืนข้อมูลเคสของคนอื่นเมื่อไม่มีเบอร์ (placeholder phone ชนกัน)
// ===========================
const oldTicket = {
  id: "t1",
  trackingCode: "CC-20260101-ABCD",
  customerPhone: "0800000000",
  customerName: "ลูกค้าคนอื่น",
  address: "ที่อยู่ลับ",
  status: "SUBMITTED",
  service: "REPAIR",
  preferredDate: new Date("2026-01-02T00:00:00Z"),
  createdAt: new Date("2026-01-01T00:00:00Z"), // เก่ากว่า 2 นาที
};

test("botnoi webhook: ส่งรหัสเคสเก่าโดยไม่มีเบอร์ ต้องไม่ได้ข้อมูลเคสนั้นกลับไป", async () => {
  let created: any = null;
  const restore = stubPrisma({
    ticket: {
      findUnique: async ({ where }: any) =>
        where.trackingCode === oldTicket.trackingCode ? oldTicket : null,
      findFirst: async () => null,
    },
    $transaction: async (fn: any) =>
      fn({
        ticket: {
          create: async ({ data }: any) => {
            created = { ...data, id: "new", status: "SUBMITTED" };
            return created;
          },
        },
        statusLog: { create: async () => ({}) },
      }),
  });
  try {
    const res = mockRes();
    await createTicketFromBotnoi(
      { body: { ticket: oldTicket.trackingCode, info: "แอร์ไม่เย็น" }, headers: {} } as any,
      res,
      (err?: unknown) => {
        if (err) throw err;
      }
    );
    assert.equal(res.statusCode, 201, "ต้องสร้างเคสใหม่ ไม่ใช่คืนเคสเก่า");
    assert.notEqual(res.body.trackingCode, oldTicket.trackingCode);
    assert.ok(created);
  } finally {
    restore();
  }
});

test("botnoi webhook: response ต้องไม่มีข้อมูลส่วนตัว (ชื่อ/เบอร์/ที่อยู่)", async () => {
  const restore = stubPrisma({
    ticket: {
      findUnique: async () => ({ ...oldTicket, customerPhone: "0812345678", createdAt: new Date() }),
      findFirst: async () => null,
    },
  });
  try {
    const res = mockRes();
    await createTicketFromBotnoi(
      { body: { ticket: oldTicket.trackingCode, phone: "0812345678" }, headers: {} } as any,
      res,
      (err?: unknown) => {
        if (err) throw err;
      }
    );
    assert.equal(res.statusCode, 200);
    const json = JSON.stringify(res.body);
    assert.ok(!json.includes("0812345678"), "ห้ามมีเบอร์โทร");
    assert.ok(!json.includes("ที่อยู่ลับ"), "ห้ามมีที่อยู่");
    assert.ok(!json.includes("ลูกค้าคนอื่น"), "ห้ามมีชื่อ");
    assert.equal(res.body.trackingCode, oldTicket.trackingCode);
  } finally {
    restore();
  }
});

test("botnoi webhook: ตั้ง BOTNOI_WEBHOOK_SECRET แล้วต้องตรวจ header", () => {
  const prev = process.env.BOTNOI_WEBHOOK_SECRET;
  try {
    delete process.env.BOTNOI_WEBHOOK_SECRET;
    assert.equal(isBotnoiWebhookAuthorized({ headers: {} } as any), true, "ไม่ตั้งค่า = ทำงานแบบเดิม");

    process.env.BOTNOI_WEBHOOK_SECRET = "s3cret-value";
    assert.equal(isBotnoiWebhookAuthorized({ headers: {} } as any), false);
    assert.equal(isBotnoiWebhookAuthorized({ headers: { "x-webhook-secret": "wrong" } } as any), false);
    assert.equal(
      isBotnoiWebhookAuthorized({ headers: { "x-webhook-secret": "s3cret-value" } } as any),
      true
    );
  } finally {
    if (prev === undefined) delete process.env.BOTNOI_WEBHOOK_SECRET;
    else process.env.BOTNOI_WEBHOOK_SECRET = prev;
  }
});

// ===========================
// Bug: วันที่อิงเวลา UTC ของเครื่อง server
// ===========================
test("generateUniqueCode: ใช้วันที่ตามเวลาไทย (01:00 น. ไทย = 18:00 UTC ของเมื่อวาน)", async () => {
  const restore = stubPrisma({ ticket: { findUnique: async () => null } });
  try {
    const code = await generateUniqueCode(new Date("2026-11-16T18:00:00.000Z"));
    assert.match(code, /^CC-20261117-[A-Z0-9]{4}$/);
  } finally {
    restore();
  }
});

test("bangkokDateString / startOfTodayBangkokAsUtc", () => {
  const at = new Date("2026-11-16T18:00:00.000Z"); // 01:00 ของ 17 พ.ย. เวลาไทย
  assert.equal(bangkokDateString(at), "2026-11-17");
  assert.equal(startOfTodayBangkokAsUtc(at).toISOString(), "2026-11-17T00:00:00.000Z");
});

// ===========================
// Bug: ข้อความ "Required" ภาษาอังกฤษ
// ===========================
test("createTicketSchema: field ที่ขาดหายต้องได้ข้อความภาษาไทย ไม่ใช่ Required", () => {
  const result = createTicketSchema.safeParse({ service: "REPAIR" });
  assert.equal(result.success, false);
  if (!result.success) {
    const messages = result.error.errors.map((e) => e.message);
    assert.ok(!messages.includes("Required"), `ยังมี Required: ${messages.join(", ")}`);
    assert.ok(messages.includes("กรุณากรอกอาการเสีย"));
  }
});

// ===========================
// Bug: ลบเคสแล้วไฟล์รูปค้าง (และต้องกัน path traversal)
// ===========================
test("removeTicketImageFiles: ข้าม data URL และไม่ throw เมื่อไฟล์ไม่มีอยู่", async () => {
  await removeTicketImageFiles([
    "data:image/png;base64,AAAA",
    "/uploads/../../etc/passwd",
    "/uploads/not-exist-123.jpg",
  ]);
});
