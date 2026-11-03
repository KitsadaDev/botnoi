import { test } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { DUMMY_PASSWORD_HASH } from "../src/controllers/auth.controller";

test("DUMMY_PASSWORD_HASH ต้องเป็น bcrypt hash ที่ valid เพื่อให้เวลาเปรียบเทียบเท่ากับ user จริง", () => {
  assert.equal(DUMMY_PASSWORD_HASH.length, 60);
  assert.equal(bcrypt.getRounds(DUMMY_PASSWORD_HASH), 10);
  const start = Date.now();
  assert.equal(bcrypt.compareSync("anything", DUMMY_PASSWORD_HASH), false);
  // hash ปลอมที่ invalid จะ return ทันที (~0ms) ส่วน hash จริงต้องใช้เวลา hash จริง
  assert.ok(Date.now() - start >= 5, "bcrypt.compare เสร็จเร็วผิดปกติ แสดงว่า hash ไม่ valid");
});

