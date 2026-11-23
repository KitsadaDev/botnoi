import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  createTicket,
  getTicketByCode,
  getMessages,
  createCustomerMessage,
  getMyTickets,
  createTicketFromBotnoi,
  getThaiFemaleVoice,
  createVoicebotCallToken,
  submitTicketReview,
} from "../controllers/ticket.controller";
import { uploadImages } from "../middleware/upload";
import { optionalAuth, authRequired } from "../middleware/auth";

const router = Router();

// ===========================
// Rate Limit: สร้างเคสได้ไม่เกิน 5 ครั้ง/15 นาที ต่อ IP
// ===========================
const createTicketLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  // นับเฉพาะคำขอที่สร้างเคสสำเร็จ: ลูกค้ากรอกผิด (400) หรือ server ขัดข้อง (500) ไม่ควรเสียโควตา
  // (ยังมี apiLimiter รวมกันการยิงถี่ ๆ อยู่อีกชั้น)
  skipFailedRequests: true,
  message: { success: false, error: "ส่งคำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่" },
  standardHeaders: true,
  legacyHeaders: false,
});

// ===========================
// Rate Limit: ส่งข้อความได้ไม่เกิน 20 ครั้ง/นาที ต่อ IP
// ===========================
const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { success: false, error: "ส่งข้อความมากเกินไป กรุณารอสักครู่" },
  standardHeaders: true,
  legacyHeaders: false,
});

// ===========================
// Rate Limit: ค้นหาเคส/ดูข้อความ ไม่เกิน 60 ครั้ง/นาที ต่อ IP เพื่อป้องกันการสุ่ม Tracking Code
// (หน้า /track ที่เปิดค้างไว้ใช้ราว 16 ครั้ง/นาที — เผื่อหลายแท็บ/หลายเครื่องใน NAT เดียวกัน)
// ===========================
export const trackingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { success: false, error: "ค้นหาข้อมูลบ่อยเกินไป กรุณารอสักครู่" },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/tickets (public + rate limit + multer; แนบ userId ถ้าล็อกอินอยู่)
router.post(
  "/",
  createTicketLimiter,
  optionalAuth,
  (req, res, next) => {
    // ใช้ multer แบบ callback เพื่อให้ error ถูก forward ไป errorHandler ได้
    uploadImages(req, res, (err) => {
      if (err) return next(err);
      next();
    });
  },
  createTicket
);

// ===========================
// Rate Limit สำหรับ endpoint ฝั่ง AI (public) ป้องกันการยิงสร้างเคสขยะ/ใช้โควตา TTS & Voicebot
// ===========================
const botnoiWebhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30, // บอทเรียกจาก IP ของ Botnoi เอง เผื่อหลายบทสนทนาพร้อมกัน
  message: { success: false, error: "เรียกใช้งาน webhook บ่อยเกินไป" },
  standardHeaders: true,
  legacyHeaders: false,
});

const ttsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, error: "ขอเสียงพูดบ่อยเกินไป กรุณารอสักครู่" },
  standardHeaders: true,
  legacyHeaders: false,
});

const voicebotTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: "เริ่มสายสนทนาบ่อยเกินไป กรุณารอสักครู่" },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/tickets/botnoi-webhook (สำหรับให้ Botnoi AI Agent ยิงมาเปิดเคส)
router.post("/botnoi-webhook", botnoiWebhookLimiter, createTicketFromBotnoi);
router.post("/voicebot-token", voicebotTokenLimiter, createVoicebotCallToken);
router.get("/tts", ttsLimiter, getThaiFemaleVoice);



// ==========================================
// GET /api/tickets/my (ต้องอยู่ก่อน /:code เสมอ)
// ==========================================
router.get("/my", authRequired, getMyTickets);

// GET /api/tickets/:code (public + rate limit)
router.get("/:code", trackingLimiter, getTicketByCode);

// GET /api/tickets/:code/messages (public + rate limit)
router.get("/:code/messages", trackingLimiter, getMessages);

// POST /api/tickets/:code/messages (public + rate limit; แนบ userId ถ้าล็อกอินอยู่)
router.post("/:code/messages", messageLimiter, optionalAuth, createCustomerMessage);

// POST /api/tickets/:code/review (public + rate limit; ลูกค้าส่งแบบประเมินความพึงพอใจเมื่อเคสเสร็จสิ้น)
router.post("/:code/review", messageLimiter, submitTicketReview);

export default router;