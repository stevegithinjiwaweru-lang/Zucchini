import { Router } from "express";
import { login, refresh, me, logout } from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/login", login);
// Rider app login uses the same phone + password flow
router.post("/rider/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", requireAuth, me);

export default router;
