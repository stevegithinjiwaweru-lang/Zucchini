import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";

import {
  listOrders,
  getMyOrders,
  getOrder,
  createOrder,
} from "../controllers/orders.controller";

const router = Router();

/**
 * All order routes require authentication
 */
router.use(requireAuth);

/**
 * Orders monitoring
 * Used by Admin/Dispatcher dashboard
 */
router.get("/", listOrders);

/**
 * Rider's assigned orders
 */
router.get("/mine", getMyOrders);

/**
 * Get single order details
 */
router.get("/:id", getOrder);


/**
 * Create orders manually
 */
router.post(
  "/",
  requireRole("ADMIN", "DISPATCHER"),
  createOrder
);

export default router;
