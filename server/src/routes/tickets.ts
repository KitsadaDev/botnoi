import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  createTicket,
  getTicketByCode,
  getMessages,
  createCustomerMessage,
} from "../controllers/ticket.controller";
import { uploadImages } from "../middleware/upload";
import { optionalAuth } from "../middleware/auth";

const router = Router();

// ===========================
// Rate Limit: สร้างเคสได้ไม่เกิน 5 ครั้ง/15 นาที ต่อ IP
// ===========================
const createTicketLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
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
// Rate Limit: ค้นหาเคส/ดูข้อความ ไม่เกิน 30 ครั้ง/นาที ต่อ IP เพื่อป้องกันการสุ่ม Tracking Code
// ===========================
export const trackingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
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

// GET /api/tickets/:code (public + rate limit)
router.get("/:code", trackingLimiter, getTicketByCode);

// GET /api/tickets/:code/messages (public + rate limit)
router.get("/:code/messages", trackingLimiter, getMessages);

// POST /api/tickets/:code/messages (public + rate limit; แนบ userId ถ้าล็อกอินอยู่)
router.post("/:code/messages", messageLimiter, optionalAuth, createCustomerMessage);

export default router;
