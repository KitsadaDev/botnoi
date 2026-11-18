import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveBotnoiService,
  createTicketFromBotnoi,
  getMyTickets,
  getTicketByCode,
} from "../src/controllers/ticket.controller";
import { createTicketSchema } from "../src/validations/ticket.validation";
import { mockRes, stubPrisma } from "./helpers";

// ===========================
// ประเภทบริการจากแชทบอท
// ===========================
test("resolveBotnoiService: ใช้ค่า service ที่บอทส่งมาก่อน (รหัสหรือภาษาไทย)", () => {
  assert.equal(resolveBotnoiService("IT_REPAIR", "Samsung | แอร์ไม่เย็น | บ้าน"), "IT_REPAIR");
  assert.equal(resolveBotnoiService("it_repair", "x"), "IT_REPAIR");
  assert.equal(resolveBotnoiService("ซ่อมอุปกรณ์ไอที", "x"), "IT_REPAIR");
  assert.equal(resolveBotnoiService("ล้างแอร์", "x"), "CLEANING");
  assert.equal(resolveBotnoiService("INSTALLATION", "x"), "INSTALLATION");
});

test("resolveBotnoiService: งานไอทีที่มีคำว่า ล้าง/ติดตั้ง ต้องไม่กลายเป็นงานแอร์", () => {
  assert.equal(resolveBotnoiService(undefined, "โน้ตบุ๊ก | ล้างไวรัส | คอนโด"), "IT_REPAIR");
  assert.equal(resolveBotnoiService(undefined, "PC | ติดตั้งวินโดว์ใหม่ | ออฟฟิศ"), "IT_REPAIR");
  assert.equal(resolveBotnoiService(undefined, "PS5 | เปิดไม่ติด | บ้าน"), "IT_REPAIR");
});

test("resolveBotnoiService: งานแอร์ยังจัดประเภทเหมือนเดิม และ คอมเพรสเซอร์ ไม่ใช่งานไอที", () => {
  assert.equal(resolveBotnoiService(undefined, "Daikin | ล้างแอร์ | บ้าน"), "CLEANING");
  assert.equal(resolveBotnoiService(undefined, "Carrier | ย้ายแอร์ไปห้องนอน | บ้าน"), "INSTALLATION");
  assert.equal(resolveBotnoiService(undefined, "LG | คอมเพรสเซอร์ไม่ทำงาน | บ้าน"), "REPAIR");
  assert.equal(resolveBotnoiService(undefined, "LG | คอมแอร์ไม่ติด | บ้าน"), "REPAIR");
  assert.equal(resolveBotnoiService("<service>", "Mitsubishi | ไม่เย็น | บ้าน"), "REPAIR");
});

// ===========================
// webhook: บันทึกประเภทบริการที่บอทส่งมา และปฏิเสธวันนัดย้อนหลัง
// ===========================
function stubForCreate(captured: { data?: any }) {
  return stubPrisma({
    ticket: { findUnique: async () => null, findFirst: async () => null },
    $transaction: async (fn: any) =>
      fn({
        ticket: {
          create: async ({ data }: any) => {
            captured.data = data;
            return { ...data, id: "new", status: "SUBMITTED" };
          },
        },
        statusLog: { create: async () => ({}) },
      }),
  });
}

const failOnNext = (err?: unknown) => {
  if (err) throw err;
};

test("botnoi webhook: service=IT_REPAIR ถูกบันทึกเป็นงานไอที และคืนรหัสที่สร้างจริง", async () => {
  const captured: { data?: any } = {};
  const restore = stubForCreate(captured);
  try {
    const res = mockRes();
    await createTicketFromBotnoi(
      {
        body: {
          customer_name: "สมชาย",
          phone: "0812223333",
          service: "IT_REPAIR",
          info: "โน้ตบุ๊ก Asus | เปิดไม่ติด | 12 ซ.ลาดพร้าว 5",
          date: "2099-01-15",
        },
        headers: {},
      } as any,
      res,
      failOnNext
    );
    assert.equal(res.statusCode, 201);
    assert.equal(captured.data.service, "IT_REPAIR");
    assert.equal(captured.data.brand, "โน้ตบุ๊ก Asus");
    assert.equal(res.body.trackingCode, captured.data.trackingCode, "บอทต้องได้รหัสที่บันทึกจริง");
    assert.match(res.body.trackingCode, /^CC-\d{8}-[A-Z0-9]{4}$/);
  } finally {
    restore();
  }
});

test("botnoi webhook: วันนัดย้อนหลังต้องถูกปฏิเสธ ไม่สร้างใบงาน", async () => {
  const captured: { data?: any } = {};
  const restore = stubForCreate(captured);
  try {
    const res = mockRes();
    await createTicketFromBotnoi(
      {
        body: { phone: "0812223333", info: "Daikin | ไม่เย็น | บ้าน", date: "2020-01-01" },
        headers: {},
      } as any,
      res,
      failOnNext
    );
    assert.equal(res.statusCode, 400);
    assert.equal(captured.data, undefined);
  } finally {
    restore();
  }
});

test("createTicketSchema (ฟอร์มเว็บ): รับ service = IT_REPAIR", () => {
  const result = createTicketSchema.safeParse({
    service: "IT_REPAIR",
    brand: "โน้ตบุ๊ก (Notebook)",
    symptom: "เปิดไม่ติด",
    address: "123 ถนนสุขุมวิท กรุงเทพฯ",
    preferredDate: "2099-01-01",
    customerName: "ทดสอบ ระบบ",
    customerPhone: "0812345678",
  });
  assert.equal(result.success, true);
});

// ===========================
// /tickets/my ต้องค้นด้วย userId เท่านั้น (ห้ามค้นด้วยเบอร์ที่ไม่ได้ยืนยัน)
// ===========================
test("getMyTickets: query ด้วย userId อย่างเดียว ไม่มีเงื่อนไขเบอร์โทร", async () => {
  let where: any = null;
  const restore = stubPrisma({
    ticket: {
      findMany: async (args: any) => {
        where = args.where;
        return [];
      },
    },
  });
  try {
    const res = mockRes();
    await getMyTickets({ user: { id: "u1", phone: "0800000000" } }, res);
    assert.deepEqual(where, { userId: "u1" });
    assert.ok(!JSON.stringify(where).includes("customerPhone"));
  } finally {
    restore();
  }
});

// ===========================
// รหัสติดตามตัวพิมพ์เล็กต้องค้นเจอ
// ===========================
test("getTicketByCode: รหัสตัวพิมพ์เล็กถูกแปลงเป็นตัวพิมพ์ใหญ่ก่อนค้น", async () => {
  let searched: string | null = null;
  const restore = stubPrisma({
    ticket: {
      findUnique: async ({ where }: any) => {
        searched = where.trackingCode;
        return null;
      },
    },
  });
  try {
    const res = mockRes();
    await getTicketByCode({ params: { code: "cc-20241025-e5f6" } } as any, res, failOnNext);
    assert.equal(searched, "CC-20241025-E5F6");
  } finally {
    restore();
  }
});

// ===========================
// Voicebot ส่งวันนัดตามที่ลูกค้าพูด เช่น "พรุ่งนี้", "วันเสาร์นี้"
// ===========================
import { parseBotnoiDate } from "../src/controllers/ticket.controller";

test("parseBotnoiDate: เข้าใจคำบอกวันแบบสัมพัทธ์ตามเวลาไทย", () => {
  // พุธ 18 พ.ย. 2026 เวลา 10:00 น. ไทย
  const now = new Date("2026-11-18T03:00:00.000Z");
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  assert.equal(iso(parseBotnoiDate("พรุ่งนี้", now)), "2026-11-19");
  assert.equal(iso(parseBotnoiDate("มะรืนนี้", now)), "2026-11-20");
  assert.equal(iso(parseBotnoiDate("วันเสาร์นี้", now)), "2026-11-21");
  assert.equal(iso(parseBotnoiDate("วันพุธนี้", now)), "2026-11-25");
  assert.equal(iso(parseBotnoiDate("2026-12-01", now)), "2026-12-01");
  assert.equal(iso(parseBotnoiDate("14 กุมภาพันธ์ 2570", now)), "2027-02-14");
});
