import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { errorHandler } from "./middleware/errorHandler";

// ===========================
// นำเข้า Routes
// ===========================
import authRouter from "./routes/auth";
import ticketRouter from "./routes/tickets";
import adminRouter from "./routes/admin";
import { getTechnicians } from "./controllers/admin.controller";

const app = express();
const PORT = process.env.PORT || 4000;

// ===========================
// Security & Parsing Middleware
// ===========================
app.use(helmet({
  crossOriginResourcePolicy: { policy: "same-site" }, // อนุญาต /uploads ให้ client ดูรูปได้
}));

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===========================
// เสิร์ฟไฟล์รูปที่อัปโหลด
// ===========================
app.use(
  "/uploads",
  express.static(path.join(__dirname, "../uploads"))
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

// GET /api/technicians (public - สำหรับ booking form เลือกพื้นที่)
app.get("/api/technicians", getTechnicians);

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
// เริ่ม Server
// ===========================
app.listen(PORT, () => {
  console.log(`🚀 CoolCare Pro Server กำลังทำงานที่ http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
});

export default app;
