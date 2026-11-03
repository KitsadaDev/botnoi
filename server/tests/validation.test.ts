import { test } from "node:test";
import assert from "node:assert/strict";
import { createTicketSchema } from "../src/validations/ticket.validation";

const base = {
  service: "REPAIR",
  brand: "Carrier",
  symptom: "ไม่เย็น",
  address: "123 ถ.ลาดพร้าว กรุงเทพฯ",
  preferredDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
  customerName: "สมชาย",
  customerPhone: "0812345678",
};

test("createTicketSchema: ข้อมูลปกติผ่าน", () => {
  assert.equal(createTicketSchema.safeParse(base).success, true);
});

test("createTicketSchema: เบอร์ 9 หลักไม่ผ่าน", () => {
  assert.equal(createTicketSchema.safeParse({ ...base, customerPhone: "081234567" }).success, false);
});

test("createTicketSchema: lat/lng ต้องอยู่ในช่วงที่ถูกต้อง", () => {
  assert.equal(createTicketSchema.safeParse({ ...base, lat: 91, lng: 100 }).success, false);
  assert.equal(createTicketSchema.safeParse({ ...base, lat: 13.7, lng: 181 }).success, false);
  assert.equal(createTicketSchema.safeParse({ ...base, lat: -91, lng: 0 }).success, false);
  assert.equal(createTicketSchema.safeParse({ ...base, lat: 13.7563, lng: 100.5018 }).success, true);
  assert.equal(createTicketSchema.safeParse({ ...base, lat: 0, lng: 0 }).success, true);
});

