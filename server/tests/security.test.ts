import { test } from "node:test";
import assert from "node:assert/strict";
import { registerSchema } from "../src/validations/auth.validation";
import {
  createTicketSchema,
  trackingCodeSchema,
} from "../src/validations/ticket.validation";
import {
  fileFilter,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  UploadError,
} from "../src/middleware/upload";
import { getTechnicians, getAllTickets } from "../src/controllers/admin.controller";
import {
  getTicketByCode,
  getMessages,
  createCustomerMessage,
} from "../src/controllers/ticket.controller";
import { signToken } from "../src/controllers/auth.controller";
import { authRequired } from "../src/middleware/auth";
import { mockRes, stubPrisma } from "./helpers";
import jwt from "jsonwebtoken";

// ===============================================================
// 1. Password Policy Test (OWASP A07 - Identification & Authentication)
// ===============================================================
test("Password Policy: ต้องมีอย่างน้อย 8 ตัวอักษร และมีทั้งตัวอักษรและตัวเลข", () => {
  const baseUser = { name: "กฤษฎา", phone: "0812345678" };

  // รหัสผ่านสั้นเกินไป (< 8)
  assert.equal(
    registerSchema.safeParse({ ...baseUser, password: "abc1" }).success,
    false,
    "รหัสผ่าน 4 ตัวอักษรต้องไม่ผ่าน"
  );
  assert.equal(
    registerSchema.safeParse({ ...baseUser, password: "admin1" }).success,
    false,
    "รหัสผ่าน 6 ตัวอักษรต้องไม่ผ่าน"
  );

  // รหัสผ่านไม่มีตัวเลข
  assert.equal(
    registerSchema.safeParse({ ...baseUser, password: "abcdefgh" }).success,
    false,
    "รหัสผ่านที่ไม่มีตัวเลขต้องไม่ผ่าน"
  );

  // รหัสผ่านไม่มีตัวอักษร
  assert.equal(
    registerSchema.safeParse({ ...baseUser, password: "12345678" }).success,
    false,
    "รหัสผ่านที่ไม่มีตัวอักษรต้องไม่ผ่าน"
  );

  // รหัสผ่านถูกต้อง
  assert.equal(
    registerSchema.safeParse({ ...baseUser, password: "Password123" }).success,
    true,
    "รหัสผ่านมีทั้งตัวอักษรและตัวเลขครบ 8 ตัวต้องผ่าน"
  );
});

// ===============================================================
// 2. File Upload Defense (Stored XSS & Extension Spoofing)
// ===============================================================
test("File Upload: ไม่อนุญาตให้นามสกุลขัดแย้งกับ MIME Type (ป้องกัน Stored XSS)", () => {
  assert.ok(ALLOWED_EXTENSIONS.has(".jpg"));
  assert.ok(ALLOWED_EXTENSIONS.has(".png"));
  assert.ok(ALLOWED_EXTENSIONS.has(".webp"));
  assert.ok(!ALLOWED_EXTENSIONS.has(".html"));
  assert.ok(!ALLOWED_EXTENSIONS.has(".svg"));
  assert.ok(!ALLOWED_EXTENSIONS.has(".exe"));

  // กรณีส่ง Content-Type: image/jpeg แต่ originalname เป็น exploit.html
  let filterResult: any;
  let filterError: any;
  fileFilter(
    {} as any,
    { mimetype: "image/jpeg", originalname: "exploit.html" } as any,
    (err: any, ok?: any) => {
      filterError = err;
      filterResult = ok;
    }
  );
  assert.ok(filterError instanceof UploadError);
  assert.equal(filterResult, undefined);

  // กรณีส่ง Content-Type: image/png แต่ originalname เป็น exploit.svg
  filterError = null;
  fileFilter(
    {} as any,
    { mimetype: "image/png", originalname: "exploit.svg" } as any,
    (err: any, ok?: any) => {
      filterError = err;
      filterResult = ok;
    }
  );
  assert.ok(filterError instanceof UploadError);

  // กรณีไฟล์ภาพปกติ
  filterError = null;
  fileFilter(
    {} as any,
    { mimetype: "image/jpeg", originalname: "photo.jpg" } as any,
    (err: any, ok?: any) => {
      filterError = err;
      filterResult = ok;
    }
  );
  assert.equal(filterError, null);
  assert.equal(filterResult, true);
});

// ===============================================================
// 3. Information Disclosure: Technicians Phone Masking
// ===============================================================
test("getTechnicians: Public request ต้องปิดบังเบอร์โทรของช่าง (ป้องกัน Data Scraping)", async () => {
  const restore = stubPrisma({
    technician: {
      findMany: async () => [
        { id: "tech1", name: "ช่างเอก", phone: "0891234567", area: "กรุงเทพฯ" },
      ],
    },
  });
  try {
    const res = mockRes();
    await getTechnicians({} as any, res, (() => {}) as any);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data[0].phone, "089-xxx-4567", "เบอร์โทรต้องถูก mask สำหรับ public");

    // Staff เข้าดู → ต้องได้เบอร์เต็ม
    const staffRes = mockRes();
    await getTechnicians(
      { user: { id: "s1", role: "STAFF" } } as any,
      staffRes,
      (() => {}) as any
    );
    assert.equal(staffRes.body.data[0].phone, "0891234567", "เบอร์โทรต้องไม่ mask สำหรับ staff");
  } finally {
    restore();
  }
});

// ===============================================================
// 4. Ticket Tracking Hardening: Format Validation & userId Omission
// ===============================================================
test("Tracking Code: ตรวจสอบ Format ถูกต้องและไม่เปิดเผย userId ใน Public API", async () => {
  // Validation schema
  assert.equal(trackingCodeSchema.safeParse("CC-20241103-A1B2").success, true);
  assert.equal(trackingCodeSchema.safeParse("INVALID-CODE").success, false);
  assert.equal(trackingCodeSchema.safeParse("../../etc/passwd").success, false);

  // getTicketByCode: Format ผิดต้องคืน 400 ทันที ไม่ส่ง query ไป DB
  const resBad = mockRes();
  await getTicketByCode({ params: { code: "INVALID" } } as any, resBad, (() => {}) as any);
  assert.equal(resBad.statusCode, 400);

  // getTicketByCode: เคสปกติ ต้องตัด userId ออกจาก Response
  const restore = stubPrisma({
    ticket: {
      findUnique: async () => ({
        id: "t1",
        trackingCode: "CC-20241103-A1B2",
        userId: "secret-user-id-999",
        customerName: "ทดสอบ",
        customerPhone: "0812345678",
        statusLogs: [],
        images: [],
        technician: null,
      }),
    },
  });
  try {
    const resGood = mockRes();
    await getTicketByCode(
      { params: { code: "CC-20241103-A1B2" } } as any,
      resGood,
      (() => {}) as any
    );
    assert.equal(resGood.statusCode, 200);
    assert.equal(resGood.body.data.userId, undefined, "userId ต้องไม่ปรากฏใน Public response");
    assert.equal(resGood.body.data.customerPhone, "081-xxx-5678");
  } finally {
    restore();
  }
});

test("getMessages & createCustomerMessage: ตรวจสอบ Tracking Code Format ก่อน", async () => {
  const resMsg = mockRes();
  await getMessages({ params: { code: "BAD-FORMAT" } } as any, resMsg, (() => {}) as any);
  assert.equal(resMsg.statusCode, 400);

  const resCreateMsg = mockRes();
  await createCustomerMessage(
    { params: { code: "BAD-FORMAT" }, body: { text: "สวัสดี" } } as any,
    resCreateMsg,
    (() => {}) as any
  );
  assert.equal(resCreateMsg.statusCode, 400);
});

// ===============================================================
// 5. JWT Algorithm & Token Integrity
// ===============================================================
test("JWT: ตรวจสอบ token ด้วย HS256 อย่างเข้มงวด", async () => {
  process.env.JWT_SECRET = "test-secret-key-must-be-long-enough-32-chars";
  const token = signToken("user-123");
  assert.ok(token);

  // ถอดรหัสด้วย algorithm ถูกต้อง
  const decoded = jwt.decode(token, { complete: true }) as any;
  assert.equal(decoded.header.alg, "HS256");

  // Verify ผ่าน authRequired
  const restore = stubPrisma({
    user: { findUnique: async () => ({ id: "user-123", role: "CUSTOMER", name: "สมชาย" }) },
  });
  try {
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    let nextCalled = false;
    await authRequired(req, mockRes(), () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, true);
    assert.equal(req.user.id, "user-123");
  } finally {
    restore();
  }
});

// ===============================================================
// 6. Parameter Tampering Defense (No client-supplied userId)
// ===============================================================
test("createTicketSchema: ป้องกัน Client กำหนด userId เอง", () => {
  const input = {
    service: "CLEANING",
    brand: "Daikin",
    symptom: "ล้างแอร์ประจำปี",
    address: "123 ถ.สุขุมวิท พระโขนง กรุงเทพฯ",
    preferredDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    customerName: "สมหมาย",
    customerPhone: "0812345678",
    userId: "arbitrary-attacker-id",
  };

  const parsed = createTicketSchema.parse(input);
  // Zod schema ต้องไม่มีฟิลด์ userId หรือไม่รับค่า
  assert.equal((parsed as any).userId, undefined);
});

// ===============================================================
// 7. Search Query Capping (DoS Prevention)
// ===============================================================
test("getAllTickets: รองรับ q ที่มีความยาวมากๆ ได้โดยไม่ crash และถูกตัดทอนให้อยู่ในระยะปลอดภัย", async () => {
  let capturedWhere: any;
  const restore = stubPrisma({
    ticket: {
      findMany: async (args: any) => {
        capturedWhere = args.where;
        return [];
      },
      groupBy: async () => [],
    },
  });
  try {
    const longQuery = "A".repeat(500);
    const res = mockRes();
    await getAllTickets({ query: { q: longQuery } } as any, res, (() => {}) as any);
    assert.equal(res.statusCode, 200);
    // ตรวจสอบว่าคำค้นถูกตัดทอนไม่เกิน 100 ตัวอักษร
    assert.equal(capturedWhere.OR[0].trackingCode.contains.length, 100);
  } finally {
    restore();
  }
});

