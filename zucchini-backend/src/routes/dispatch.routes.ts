import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";

import {
  listDispatches,
  assignDispatch,
} from "../controllers/dispatch.controller";

const router = Router();


/**
 * All dispatch endpoints require authentication
 */
router.use(requireAuth);


/**
 * Dispatch queue
 * Returns pending/unassigned orders for dispatchers
 */
router.get(
  "/",
  requireRole("ADMIN", "DISPATCHER"),
  listDispatches
);


/**
 * Assign rider to order
 */
router.post(
  "/assign",
  requireRole("ADMIN", "DISPATCHER"),
  assignDispatch
);


export default router;