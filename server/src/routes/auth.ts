import { Router } from "express";
import rateLimit from "express-rate-limit";
import { register, login, getMe } from "../controllers/auth.controller";
import { authRequired } from "../middleware/auth";

const router = Router();

// ===========================
// Rate Limit: ป้องกัน Brute-force Login (สูงสุด 10 ครั้ง/15 นาที ต่อ IP)
// ===========================
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: "พยายามเข้าสู่ระบบมากเกินไป กรุณารอ 15 นาทีแล้วลองใหม่" },
  standardHeaders: true,
  legacyHeaders: false,
});

// ===========================
// Rate Limit: ป้องกัน Spam Register (สูงสุด 5 ครั้ง/15 นาที ต่อ IP)
// ===========================
export const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  // ลูกค้ากรอกฟอร์มผิด (400) ไม่ควรเสียโควตา แต่ยังนับครั้งที่สมัครสำเร็จ
  // และครั้งที่เจอเบอร์ซ้ำ (409) เพื่อกันการไล่เช็กว่าเบอร์ไหนมีบัญชีแล้ว
  skipFailedRequests: true,
  requestWasSuccessful: (_req, res) => res.statusCode < 400 || res.statusCode === 409,
  message: { success: false, error: "สมัครสมาชิกบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่" },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/auth/register
router.post("/register", registerLimiter, register);

// POST /api/auth/login
router.post("/login", loginLimiter, login);

// GET /api/auth/me (ต้อง login)
router.get("/me", authRequired, getMe);

export default router;
