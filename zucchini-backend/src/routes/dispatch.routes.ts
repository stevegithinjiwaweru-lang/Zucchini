import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";

import {
  listDispatches,
  assignDispatch,
} from "../controllers/dispatch.controller";

const router = Router();

/**
 * All dispatch routes require authentication
 */
router.use(requireAuth);


/**
 * Get dispatch queue
 * Pending/unassigned orders for dispatchers
 */
router.get(
  "/",
  requireRole("ADMIN", "DISPATCHER"),
  listDispatches
);


/**
 * Assign rider to an order
 */
router.post(
  "/assign",
  requireRole("ADMIN", "DISPATCHER"),
  assignDispatch
);


export default router;