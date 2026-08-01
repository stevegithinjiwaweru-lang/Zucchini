import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { podUpload, csvUpload } from "../utils/uploads";

import {
  listOrders,
  getMyOrders,
  getOrder,
  createOrder,
  createWhatsappOrder,
  bulkUploadCsv,
  assignOrder,
  updateOrderStatus,
  uploadPod,
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


/**
 * WhatsApp order creation
 */
router.post(
  "/whatsapp",
  requireRole("ADMIN", "DISPATCHER"),
  createWhatsappOrder
);


/**
 * CSV uploads
 * Supports old frontend naming
 */
router.post(
  "/upload-csv",
  requireRole("ADMIN", "DISPATCHER"),
  csvUpload.single("file"),
  bulkUploadCsv
);

router.post(
  "/bulk-csv",
  requireRole("ADMIN", "DISPATCHER"),
  csvUpload.single("file"),
  bulkUploadCsv
);


/**
 * Assignment
 * Used from Dispatch module
 */
router.post(
  "/:id/assign",
  requireRole("ADMIN", "DISPATCHER"),
  assignOrder
);


/**
 * Update order status
 * Riders can update delivery progress
 */
router.patch(
  "/:id/status",
  updateOrderStatus
);


/**
 * Proof of delivery upload
 */
router.post(
  "/:id/pod",
  podUpload.single("file"),
  uploadPod
);


export default router;