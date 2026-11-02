import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";

// ===========================
// สร้างโฟลเดอร์ uploads ถ้ายังไม่มี
// ===========================
const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ===========================
// กำหนดที่เก็บไฟล์และชื่อไฟล์
// ===========================
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    // ชื่อไฟล์: timestamp-random.ext เพื่อป้องกันซ้ำ
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});

// ===========================
// กรองชนิดไฟล์: รับเฉพาะ jpg, png, webp
// ===========================
const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("รองรับเฉพาะไฟล์ JPG, PNG, WEBP เท่านั้น"));
  }
};

// ===========================
// Export multer instance
// - สูงสุด 3 รูป, ไฟล์ละไม่เกิน 5MB
// ===========================
export const uploadImages = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 3,
  },
}).array("images", 3); // field name = "images"
