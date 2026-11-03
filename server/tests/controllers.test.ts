import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createTicket, generateUniqueCode } from "../src/controllers/ticket.controller";
import { getAllTickets, updateTicket } from "../src/controllers/admin.controller";
import { mockRes, stubPrisma } from "./helpers";

const futureDate = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);

const validBody = {
  service: "REPAIR",
  brand: "Carrier",
  symptom: "ไม่เย็น",
  address: "123 ถ.ลาดพร้าว แขวงจอมพล กรุงเทพฯ",
  preferredDate: futureDate,
  customerName: "สมชาย ใจดี",
  customerPhone: "0812345678",
};

function nextSpy() {
  const calls: unknown[] = [];
  const fn = (err?: unknown) => {
    calls.push(err);
  };
  return Object.assign(fn, { calls });
}

// ---------------------------------------------------------------
// S1: createTicket ต้องคืนข้อมูลเคสครบ (หน้า success ใช้แสดงผล)
// ---------------------------------------------------------------
test("createTicket: response มีข้อมูลเคสครบ และแนบ userId เมื่อมี req.user", async () => {
  let createdData: any;
  const restore = stubPrisma({
    ticket: { findUnique: async () => null },
    $transaction: async (fn: any) =>
      fn({
        ticket: {
          create: async ({ data }: any) => {
            createdData = data;
            return {
              id: "t1",
              ...data,
              images: data.images.create,
              preferredDate: data.preferredDate,
              status: "SUBMITTED",
            };
          },
        },
        statusLog: { create: async () => ({}) },
      }),
  });
  try {
    const res = mockRes();
    const next = nextSpy();
    await createTicket(
      { body: validBody, files: [], user: { id: "u1", role: "CUSTOMER", name: "x", phone: "y" } } as any,
      res,
      next as any
    );
    assert.deepEqual(next.calls, []);
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.data.service, "REPAIR");
    assert.equal(res.body.data.brand, "Carrier");
    assert.equal(res.body.data.customerName, "สมชาย ใจดี");
    assert.equal(res.body.data.customerPhone, "0812345678");
    assert.equal(res.body.data.address, validBody.address);
    assert.ok(res.body.data.trackingCode.startsWith("CC-"));
    assert.equal(createdData.userId, "u1");
  } finally {
    restore();
  }
});

// ---------------------------------------------------------------
// S5: validation fail ต้องลบไฟล์ที่ multer เขียนไปแล้ว
// ---------------------------------------------------------------
test("createTicket: validate ไม่ผ่านแล้วต้องลบไฟล์ที่อัปโหลดค้างอยู่", async () => {
  const tmp = path.join(os.tmpdir(), `coolcare-test-${Date.now()}.jpg`);
  fs.writeFileSync(tmp, "fake");
  const res = mockRes();
  const next = nextSpy();
  await createTicket(
    { body: { ...validBody, customerPhone: "123" }, files: [{ filename: "x.jpg", path: tmp }] } as any,
    res,
    next as any
  );
  assert.equal(next.calls.length, 1, "ต้องส่ง error ต่อให้ errorHandler");
  assert.equal(fs.existsSync(tmp), false, "ไฟล์ที่อัปโหลดต้องถูกลบ");
});

// ---------------------------------------------------------------
// S7: generateUniqueCode ห้ามคืนรหัสที่ชนเมื่อหมดรอบ
// ---------------------------------------------------------------
test("generateUniqueCode: ถ้าชนครบทุกรอบต้อง throw แทนการคืนรหัสซ้ำ", async () => {
  const restore = stubPrisma({ ticket: { findUnique: async () => ({ id: "exists" }) } });
  try {
    await assert.rejects(() => generateUniqueCode());
  } finally {
    restore();
  }
});

test("generateUniqueCode: คืนรหัสรูปแบบ CC-YYYYMMDD-XXXX", async () => {
  const restore = stubPrisma({ ticket: { findUnique: async () => null } });
  try {
    assert.match(await generateUniqueCode(), /^CC-\d{8}-[A-Z0-9]{4}$/);
  } finally {
    restore();
  }
});

// ---------------------------------------------------------------
// S3: updateTicket
// ---------------------------------------------------------------
function updateStub(currentStatus: string, order: string[], logs: any[], updates: any[]) {
  return stubPrisma({
    ticket: { findUnique: async () => ({ status: currentStatus }) },
    technician: { findUnique: async () => ({ id: "tech1" }) },
    $transaction: async (fn: any) =>
      fn({
        ticket: {
          update: async (args: any) => {
            order.push("update");
            updates.push(args);
            return { id: "t1", ...args.data, statusLogs: [...logs] };
          },
        },
        statusLog: {
          create: async ({ data }: any) => {
            order.push("log");
            logs.push(data);
            return data;
          },
        },
      }),
  });
}

test("updateTicket: มีโน้ตแต่สถานะเดิม → ต้องบันทึก log ด้วยสถานะปัจจุบัน", async () => {
  const order: string[] = [];
  const logs: any[] = [];
  const updates: any[] = [];
  const restore = updateStub("RECEIVED", order, logs, updates);
  try {
    const res = mockRes();
    await updateTicket(
      { params: { id: "t1" }, body: { status: "RECEIVED", note: "นัดช่างเวลา 10:00" } } as any,
      res,
      nextSpy() as any
    );
    assert.equal(logs.length, 1);
    assert.equal(logs[0].status, "RECEIVED");
    assert.equal(logs[0].note, "นัดช่างเวลา 10:00");
  } finally {
    restore();
  }
});

test("updateTicket: สถานะเปลี่ยน → log ถูกสร้างก่อน update เพื่อให้ response มี log ล่าสุด", async () => {
  const order: string[] = [];
  const logs: any[] = [];
  const updates: any[] = [];
  const restore = updateStub("RECEIVED", order, logs, updates);
  try {
    const res = mockRes();
    await updateTicket(
      { params: { id: "t1" }, body: { status: "IN_PROGRESS" } } as any,
      res,
      nextSpy() as any
    );
    assert.deepEqual(order, ["log", "update"]);
    assert.equal(res.body.data.statusLogs.length, 1);
  } finally {
    restore();
  }
});

test("updateTicket: ไม่มีสถานะเปลี่ยนและไม่มีโน้ต → ไม่สร้าง log", async () => {
  const order: string[] = [];
  const logs: any[] = [];
  const updates: any[] = [];
  const restore = updateStub("RECEIVED", order, logs, updates);
  try {
    await updateTicket(
      { params: { id: "t1" }, body: { status: "RECEIVED", technicianId: "tech1" } } as any,
      mockRes(),
      nextSpy() as any
    );
    assert.equal(logs.length, 0);
    assert.equal(updates[0].data.technicianId, "tech1");
  } finally {
    restore();
  }
});

test("updateTicket: technicianId = null ต้องถอดช่างออกได้", async () => {
  const updates: any[] = [];
  const restore = updateStub("RECEIVED", [], [], updates);
  try {
    await updateTicket(
      { params: { id: "t1" }, body: { technicianId: null } } as any,
      mockRes(),
      nextSpy() as any
    );
    assert.equal(updates[0].data.technicianId, null);
  } finally {
    restore();
  }
});

// ---------------------------------------------------------------
// S2, S8, S11: getAllTickets
// ---------------------------------------------------------------
test("getAllTickets: status ไม่ถูกต้อง → 400 ไม่ใช่ 500", async () => {
  const restore = stubPrisma({
    ticket: { findMany: async () => [], groupBy: async () => [] },
  });
  try {
    const res = mockRes();
    const next = nextSpy();
    await getAllTickets({ query: { status: "FOO" } } as any, res, next as any);
    assert.equal(res.statusCode, 400);
    assert.deepEqual(next.calls, []);
  } finally {
    restore();
  }
});

test("getAllTickets: ส่ง counts ที่ไม่ขึ้นกับ filter และ select ช่างพร้อม area/phone", async () => {
  let findManyArgs: any;
  const restore = stubPrisma({
    ticket: {
      findMany: async (args: any) => {
        findManyArgs = args;
        return [{ id: "1" }];
      },
      groupBy: async (args: any) => {
        assert.equal(args.where, undefined, "counts ต้องนับจากทุกเคส ไม่ใช้ filter");
        return [
          { status: "SUBMITTED", _count: { _all: 2 } },
          { status: "COMPLETED", _count: { _all: 3 } },
        ];
      },
    },
  });
  try {
    const res = mockRes();
    await getAllTickets({ query: { status: "COMPLETED" } } as any, res, nextSpy() as any);
    assert.deepEqual(res.body.counts, {
      total: 5,
      SUBMITTED: 2,
      RECEIVED: 0,
      IN_PROGRESS: 0,
      COMPLETED: 3,
      CANCELLED: 0,
    });
    assert.equal(findManyArgs.include.technician.select.area, true);
    assert.equal(findManyArgs.include.technician.select.phone, true);
  } finally {
    restore();
  }
});

