import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import os from "os";
import { Request } from "express";

// ===========================
// สร้างโฟลเดอร์ uploads ถ้ายังไม่มี (ใช้ /tmp บน Vercel Serverless เพราะ filesystem อื่นเป็น read-only)
// ===========================
const isServerless = Boolean(process.env.VERCEL);
const uploadDir = isServerless
  ? path.join(os.tmpdir(), "uploads")
  : path.join(__dirname, "../../uploads");

try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch {
  // ป้องกันกรณี filesystem เป็น read-only
}

// ===========================
// แมป MIME Type เป็นนามสกุลไฟล์ที่ปลอดภัย
// ===========================
export const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

// ===========================
// กำหนดที่เก็บไฟล์ (บน Vercel ใช้ memoryStorage เพื่อแปลงเป็น data URL เก็บใน DB ได้ถาวร)
// ===========================
const storage = isServerless
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (_req, _file, cb) => {
        cb(null, uploadDir);
      },
      filename: (_req, file, cb) => {
        // ใช้นามสกุลไฟล์ที่ปลอดภัยจาก MIME type เท่านั้น ไม่เชื่อถือ extension จาก originalname
        const safeExt = ALLOWED_MIME_TYPES[file.mimetype] || ".jpg";
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`;
        cb(null, unique);
      },
    });

// ===========================
// Error ที่เกิดจากข้อมูลที่ผู้ใช้ส่งมาไม่ถูกต้อง (ให้ errorHandler ตอบ 400)
// ===========================
export class UploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadError";
  }
}

// จำนวนรูปสูงสุดต่อเคส (client ต้องใช้ค่าเดียวกัน)
export const MAX_UPLOAD_IMAGES = 3;

// ===========================
// กรองชนิดไฟล์: รับเฉพาะ jpg, png, webp ทั้ง MIME Type และนามสกุลไฟล์จริง
// ===========================
export const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const isMimeAllowed = Boolean(ALLOWED_MIME_TYPES[file.mimetype]);
  const isExtAllowed = ALLOWED_EXTENSIONS.has(ext);

  if (isMimeAllowed && isExtAllowed) {
    cb(null, true);
  } else {
    cb(new UploadError("รองรับเฉพาะไฟล์ JPG, PNG, WEBP เท่านั้น"));
  }
};

// ===========================
// Export multer instance
// - สูงสุด MAX_UPLOAD_IMAGES รูป, ไฟล์ละไม่เกิน 5MB
// ===========================
export const uploadImages = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: MAX_UPLOAD_IMAGES,
  },
}).array("images", MAX_UPLOAD_IMAGES); // field name = "images"
