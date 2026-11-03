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
