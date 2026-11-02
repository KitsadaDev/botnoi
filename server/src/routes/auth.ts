import { Router } from "express";
import { register, login, getMe } from "../controllers/auth.controller";
import { authRequired } from "../middleware/auth";

const router = Router();

// POST /api/auth/register
router.post("/register", register);

// POST /api/auth/login
router.post("/login", login);

// GET /api/auth/me (ต้อง login)
router.get("/me", authRequired, getMe);

export default router;
