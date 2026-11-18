import { test } from "node:test";
import assert from "node:assert/strict";
import { createTicketSchema } from "../src/validations/ticket.validation";
import { createStaffMessage } from "../src/controllers/admin.controller";
import { getMessages, createTicketFromBotnoi } from "../src/controllers/ticket.controller";
import { roleRequired } from "../src/middleware/auth";
import { bangkokDateString, earliestBookingDateBangkok } from "../src/lib/date";
import { mockRes, stubPrisma } from "./helpers";

const failOnNext = (err?: unknown) => {
  if (err) throw err;
};

const base = {
  service: "REPAIR",
  brand: "Daikin",
  symptom: "แอร์ไม่เย็นเลย",
  address: "123 ถนนสุขุมวิท กรุงเทพฯ",
  customerName: "ทดสอบ ระบบ",
  customerPhone: "0812345678",
};

// ===========================
// วันนัด: ตั้งแต่พรุ่งนี้ (ตามเวลาไทย) เหมือนกันทุกช่องทาง
// ===========================
test("createTicketSchema: นัดวันนี้ไม่ได้ นัดพรุ่งนี้ได้", () => {
  const today = bangkokDateString();
  const tomorrow = earliestBookingDateBangkok().toISOString().slice(0, 10);
  assert.equal(createTicketSchema.safeParse({ ...base, preferredDate: today }).success, false);
  assert.equal(createTicketSchema.safeParse({ ...base, preferredDate: tomorrow }).success, true);
});

test("botnoi webhook: นัด 'วันนี้' ถูกปฏิเสธเหมือนฟอร์มเว็บ", async () => {
  const restore = stubPrisma({
    ticket: { findUnique: async () => null, findFirst: async () => null },
  });
  try {
    const res = mockRes();
    await createTicketFromBotnoi(
      { body: { phone: "0812223333", info: "Daikin | ไม่เย็น | บ้าน", date: "วันนี้" }, headers: {} } as any,
      res,
      failOnNext
    );
    assert.equal(res.statusCode, 400);
  } finally {
    restore();
  }
});

// ===========================
// อาการเสียขั้นต่ำ 5 ตัวอักษร เท่ากับฟอร์มเว็บ
// ===========================
test("createTicketSchema: อาการเสียสั้นกว่า 5 ตัวอักษรไม่ผ่าน", () => {
  const tomorrow = earliestBookingDateBangkok().toISOString().slice(0, 10);
  const r = createTicketSchema.safeParse({ ...base, symptom: "เสีย", preferredDate: tomorrow });
  assert.equal(r.success, false);
});

// ===========================
// เคสที่ปิดแล้ว: เจ้าหน้าที่ส่งข้อความไม่ได้ (กฎเดียวกับลูกค้า)
// ===========================
test("createStaffMessage: เคส COMPLETED/CANCELLED ส่งข้อความไม่ได้", async () => {
  for (const status of ["COMPLETED", "CANCELLED"]) {
    let created = false;
    const restore = stubPrisma({
      ticket: { findUnique: async () => ({ id: "t1", status }) },
      message: {
        create: async () => {
          created = true;
          return {};
        },
      },
    });
    try {
      const res = mockRes();
      await createStaffMessage(
        { params: { id: "t1" }, body: { text: "สวัสดีค่ะ" }, user: { id: "s1", role: "STAFF" } } as any,
        res,
        failOnNext
      );
      assert.equal(res.statusCode, 400, status);
      assert.equal(created, false, status);
    } finally {
      restore();
    }
  }
});

// ===========================
// แชตสาธารณะไม่เปิดเผย id ผู้ใช้
// ===========================
test("getMessages: select ของ user มีแค่ name ไม่มี id", async () => {
  let select: any = null;
  const restore = stubPrisma({
    ticket: { findUnique: async () => ({ id: "t1" }) },
    message: {
      findMany: async (args: any) => {
        select = args.select;
        return [];
      },
    },
  });
  try {
    await getMessages({ params: { code: "CC-20241025-E5F6" } } as any, mockRes(), failOnNext);
    assert.deepEqual(select.user, { select: { name: true } });
  } finally {
    restore();
  }
});

// ===========================
// ลบเคสถาวร: เฉพาะ ADMIN
// ===========================
test("roleRequired('ADMIN'): STAFF ถูกปฏิเสธ 403, ADMIN ผ่าน", () => {
  const mw = roleRequired("ADMIN");
  const staffRes = mockRes();
  let passed = false;
  mw({ user: { role: "STAFF" } } as any, staffRes, () => (passed = true));
  assert.equal(staffRes.statusCode, 403);
  assert.equal(passed, false);

  mw({ user: { role: "ADMIN" } } as any, mockRes(), () => (passed = true));
  assert.equal(passed, true);
});
