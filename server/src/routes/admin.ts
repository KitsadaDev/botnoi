import { Router } from "express";
import {
  getAllTickets,
  getTicketById,
  updateTicket,
  createStaffMessage,
  getTechnicians,
  deleteTicket,
} from "../controllers/admin.controller";
import { authRequired, roleRequired } from "../middleware/auth";

const router = Router();

// ทุก route ใน /api/admin ต้องผ่าน authRequired + roleRequired
router.use(authRequired, roleRequired("STAFF", "ADMIN"));

// GET /api/admin/tickets?status=&q=
router.get("/tickets", getAllTickets);

// GET /api/admin/tickets/:id
router.get("/tickets/:id", getTicketById);

// PATCH /api/admin/tickets/:id
router.patch("/tickets/:id", updateTicket);

// DELETE /api/admin/tickets/:id (ลบใบงานถาวร)
router.delete("/tickets/:id", deleteTicket);

// POST /api/admin/tickets/:id/messages
router.post("/tickets/:id/messages", createStaffMessage);

// GET /api/admin/technicians
router.get("/technicians", getTechnicians);

export default router;
