import { test } from "node:test";
import assert from "node:assert/strict";
import multer from "multer";
import { errorHandler } from "../src/middleware/errorHandler";
import { UploadError } from "../src/middleware/upload";
import { mockRes } from "./helpers";

function run(err: Error) {
  const res = mockRes();
  const silent = console.error;
  console.error = () => {};
  try {
    errorHandler(err, {} as any, res, () => {});
  } finally {
    console.error = silent;
  }
  return res;
}

test("errorHandler: MulterError (เกินจำนวนไฟล์) → 400 ไม่ใช่ 500", () => {
  const res = run(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "images"));
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
});

test("errorHandler: MulterError (ไฟล์ใหญ่เกิน) → 400", () => {
  const res = run(new multer.MulterError("LIMIT_FILE_SIZE", "images"));
  assert.equal(res.statusCode, 400);
});

test("errorHandler: UploadError (ชนิดไฟล์ไม่รองรับ) → 400 พร้อมข้อความเดิม", () => {
  const res = run(new UploadError("รองรับเฉพาะไฟล์ JPG, PNG, WEBP เท่านั้น"));
  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /JPG, PNG, WEBP/);
});

test("errorHandler: JSON body พัง → 400", () => {
  const err: any = new SyntaxError("Unexpected token } in JSON");
  err.type = "entity.parse.failed";
  err.status = 400;
  const res = run(err);
  assert.equal(res.statusCode, 400);
});

test("errorHandler: error ทั่วไปยังเป็น 500", () => {
  const res = run(new Error("boom"));
  assert.equal(res.statusCode, 500);
});

