import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import rateLimit from "express-rate-limit";
import { errorHandler } from "./middleware/errorHandler";
import { optionalAuth } from "./middleware/auth";

// ===========================
// นำเข้า Routes
// ===========================
import authRouter from "./routes/auth";
import ticketRouter from "./routes/tickets";
import adminRouter from "./routes/admin";
import { getTechnicians } from "./controllers/admin.controller";

const app = express();
const PORT = process.env.PORT || 4000;

// อยู่หลัง reverse proxy (Render/Vercel rewrite) ต้องเชื่อ X-Forwarded-For เพื่อให้ rate limit แยก IP ผู้ใช้ได้ถูกต้อง
app.set("trust proxy", 1);

// ===========================
// Security & Headers (OWASP Hardening)
// ===========================
app.use(
  helmet({
    frameguard: { action: "deny" }, // Clickjacking protection (X-Frame-Options: DENY)
    xContentTypeOptions: true, // X-Content-Type-Options: nosniff
    strictTransportSecurity: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        fontSrc: ["'self'", "https:", "data:"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        imgSrc: ["'self'", "data:", "blob:"],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https:"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" }, // อนุญาตให้ client ต่าง origin เข้าถึง /uploads ได้
  })
);

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

// จำกัดขนาด payload เพื่อป้องกัน Memory Exhaustion / DoS
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Rate Limit รวมสำหรับ /api (ป้องกัน API Abuse / DoS)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: 300, // 300 requests ต่อ IP
  message: { success: false, error: "เรียกใช้งาน API บ่อยเกินไป กรุณารอสักครู่" },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);

// ===========================
// เสิร์ฟไฟล์รูปที่อัปโหลด (พร้อม Security Headers ป้องกัน MIME Sniffing & XSS)
// ===========================
app.use(
  "/uploads",
  express.static(path.join(__dirname, "../uploads"), {
    dotfiles: "ignore",
    index: false,
    setHeaders: (res) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Disposition", "inline");
    },
  })
);

// ===========================
// Health Check
// ===========================
app.get("/api/health", (_req, res) => {
  res.json({ success: true, message: "CoolCare Pro API กำลังทำงาน 🆒" });
});

// ===========================
// Routes
// ===========================
app.use("/api/auth", authRouter);
app.use("/api/tickets", ticketRouter);
app.use("/api/admin", adminRouter);

// GET /api/technicians (public - สำหรับ booking form เลือกพื้นที่ แต่ mask เบอร์โทรถ้าไม่ใช่ staff)
app.get("/api/technicians", optionalAuth, getTechnicians);

// ===========================
// 404 Handler
// ===========================
app.use((_req, res) => {
  res.status(404).json({ success: false, error: "ไม่พบ endpoint ที่ต้องการ" });
});

// ===========================
// Global Error Handler (ต้องอยู่ท้ายสุด)
// ===========================
app.use(errorHandler);

// ===========================
// ตรวจสอบความปลอดภัยเบื้องต้นตอนเริ่ม Server
// ===========================
if (process.env.NODE_ENV === "production") {
  const secret = process.env.JWT_SECRET;
  if (
    !secret ||
    secret === "your-super-secret-jwt-key-change-this-in-production" ||
    secret.length < 32
  ) {
    console.error(
      "⚠️ [CRITICAL APPMON] JWT_SECRET ไม่ปลอดภัยสำหรับการรันบน Production (ต้องเปลี่ยนและมีความยาวอย่างน้อย 32 ตัวอักษร)"
    );
  }
}

// ===========================
// เริ่ม Server
// ===========================
app.listen(PORT, () => {
  console.log(`🚀 CoolCare Pro Server กำลังทำงานที่ http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
});

export default app;
