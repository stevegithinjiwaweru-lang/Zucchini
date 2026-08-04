import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";

import {
  listOrders,
  getMyOrders,
  getOrder,
  createOrder,
  createWhatsappOrder,
  assignOrder,
  unassignOrder,
  updateOrderStatus,
  bulkUploadCsv,
  uploadPod,
} from "../controllers/orders.controller";

import { csvUpload, podUpload } from "../utils/uploads";

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
 * Create orders manually
 */
router.post("/", requireRole("ADMIN", "DISPATCHER"), createOrder);

/**
 * Manual WhatsApp order entry (single)
 */
router.post("/whatsapp", requireRole("ADMIN", "DISPATCHER"), createWhatsappOrder);

/**
 * Assign / unassign order to rider
 */
router.post("/:id/assign", requireRole("ADMIN", "DISPATCHER"), assignOrder);
router.post("/:id/unassign", requireRole("ADMIN", "DISPATCHER"), unassignOrder);

/**
 * Update order status
 */
router.patch("/:id/status", requireRole("ADMIN", "DISPATCHER", "RIDER"), updateOrderStatus);

/**
 * Bulk CSV upload (multipart form-data: file + merchantId)
 * Support both /upload-csv and /bulk-csv endpoints because the frontend contains
 * references to both names in different places (legacy vs endpoints.ts).
 */
router.post("/upload-csv", requireRole("ADMIN", "DISPATCHER"), csvUpload.single("file"), bulkUploadCsv);
router.post("/bulk-csv", requireRole("ADMIN", "DISPATCHER"), csvUpload.single("file"), bulkUploadCsv);

/**
 * Upload proof-of-delivery (image)
 */
router.post("/:id/pod", requireRole("ADMIN", "DISPATCHER", "RIDER"), podUpload.single("file"), uploadPod);

/**
 * Get single order details
 */
router.get("/:id", getOrder);

export default router;
