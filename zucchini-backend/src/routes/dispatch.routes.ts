import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";

import {
  listDispatches,
  assignDispatch,
} from "../controllers/dispatch.controller";

const router = Router();

router.use(requireAuth);

router.get(
  "/",
  requireRole("ADMIN", "DISPATCHER"),
  listDispatches
);

router.post(
  "/assign",
  requireRole("ADMIN", "DISPATCHER"),
  assignDispatch
);

export default router;