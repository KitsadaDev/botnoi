import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  createTicket,
  getTicketByCode,
  getMessages,
  createCustomerMessage,
} from "../controllers/ticket.controller";
import { uploadImages } from "../middleware/upload";
import { authRequired } from "../middleware/auth";

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

// POST /api/tickets (public + rate limit + multer)
router.post(
  "/",
  createTicketLimiter,
  (req, res, next) => {
    // ใช้ multer แบบ callback เพื่อให้ error ถูก forward ไป errorHandler ได้
    uploadImages(req, res, (err) => {
      if (err) return next(err);
      next();
    });
  },
  createTicket
);

// GET /api/tickets/:code (public)
router.get("/:code", getTicketByCode);

// GET /api/tickets/:code/messages (public)
router.get("/:code/messages", getMessages);

// POST /api/tickets/:code/messages (public + rate limit)
router.post("/:code/messages", messageLimiter, createCustomerMessage);

export default router;
