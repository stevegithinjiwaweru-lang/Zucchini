import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { changePassword } from "../controllers/users.controller";

const router = Router();

// All user endpoints require authentication
router.use(requireAuth);

// PATCH /api/users/:id/password
router.patch("/:id/password", changePassword);

export default router;
