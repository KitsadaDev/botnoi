import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authRequired } from "../middleware/auth";
import {
  getPublicProjectBySlug,
  ingestChatbotLogs,
  listMyProjects,
  createProject,
  getProjectById,
  updateProject,
  deleteProject,
  getProjectTickets,
  getProjectTicketById,
  updateProjectTicket,
  deleteProjectTicket,
  createProjectTicketMessage,
  getProjectTechnicians,
  createProjectTechnician,
  updateProjectTechnician,
  deleteProjectTechnician,
  getProjectConversations,
  sendConversationMessage,
  simulateChatbotSync,
  getProjectSatisfaction,
} from "../controllers/project.controller";

const router = Router();

const chatbotLogWebhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { success: false, error: "ส่งประวัติแชทบ่อยเกินไป กรุณารอสักครู่" },
  standardHeaders: true,
  legacyHeaders: false,
});

// ===========================
// Public Project Endpoints
// ===========================
router.get("/public/:slug", getPublicProjectBySlug);
router.post("/public/:slug/chatbot-logs", chatbotLogWebhookLimiter, ingestChatbotLogs);

// ===========================
// Authenticated Multi-Tenant Project Workspace Routes
// ===========================
router.use(authRequired);

router.get("/", listMyProjects);
router.post("/", createProject);
router.get("/:projectId", getProjectById);
router.patch("/:projectId", updateProject);
router.delete("/:projectId", deleteProject);

// Tickets inside a project
router.get("/:projectId/tickets", getProjectTickets);
router.get("/:projectId/tickets/:ticketId", getProjectTicketById);
router.patch("/:projectId/tickets/:ticketId", updateProjectTicket);
router.delete("/:projectId/tickets/:ticketId", deleteProjectTicket);
router.post("/:projectId/tickets/:ticketId/messages", createProjectTicketMessage);

// Technicians zone inside a project (Add / Edit / Delete)
router.get("/:projectId/technicians", getProjectTechnicians);
router.post("/:projectId/technicians", createProjectTechnician);
router.patch("/:projectId/technicians/:techId", updateProjectTechnician);
router.delete("/:projectId/technicians/:techId", deleteProjectTechnician);

// Central Chat History inside a project
router.get("/:projectId/conversations", getProjectConversations);
router.post("/:projectId/conversations/:convId/messages", sendConversationMessage);
router.post("/:projectId/conversations/simulate-sync", simulateChatbotSync);

// Customer Satisfaction (CSAT) Dashboard inside a project
router.get("/:projectId/satisfaction", getProjectSatisfaction);

export default router;
