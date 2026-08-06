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
  deleteOrder,
  restoreOrder,
  bulkUploadCsv,
  uploadPod,
  updateOrder,
  dashboardStats,
} from "../controllers/orders.controller";

import { csvUpload, podUpload } from "../utils/uploads";

const router = Router();

router.use(requireAuth);

router.get("/stats/dashboard", requireRole("ADMIN", "DISPATCHER"), dashboardStats);

router.get("/", listOrders);
router.get("/mine", getMyOrders);

router.post("/", requireRole("ADMIN", "DISPATCHER"), createOrder);
router.post("/whatsapp", requireRole("ADMIN", "DISPATCHER"), createWhatsappOrder);

router.post("/:id/assign", requireRole("ADMIN", "DISPATCHER"), assignOrder);
router.post("/:id/unassign", requireRole("ADMIN", "DISPATCHER"), unassignOrder);

router.put("/:id", requireRole("ADMIN", "DISPATCHER"), updateOrder);

router.delete("/:id", requireRole("ADMIN", "DISPATCHER"), deleteOrder);
router.post("/:id/restore", requireRole("ADMIN", "DISPATCHER"), restoreOrder);

router.patch("/:id/status", requireRole("ADMIN", "DISPATCHER", "RIDER"), updateOrderStatus);

router.post("/upload-csv", requireRole("ADMIN", "DISPATCHER"), csvUpload.single("file"), bulkUploadCsv);
router.post("/bulk-csv", requireRole("ADMIN", "DISPATCHER"), csvUpload.single("file"), bulkUploadCsv);

router.post("/:id/pod", requireRole("ADMIN", "DISPATCHER", "RIDER"), podUpload.single("file"), uploadPod);

router.get("/:id", getOrder);

export default router;
