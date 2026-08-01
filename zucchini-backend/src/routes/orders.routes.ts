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

router.use(requireAuth);

router.get("/", listOrders);
router.get("/mine", getMyOrders);
router.get("/:id", getOrder);

router.post("/", requireRole("ADMIN", "DISPATCHER"), createOrder);
router.post("/whatsapp", requireRole("ADMIN", "DISPATCHER"), createWhatsappOrder);

// Support both paths seen in the frontend codebase (upload-csv is what the
// Dispatch page's "Upload CSV (WhatsApp orders)" button actually calls).
router.post("/upload-csv", requireRole("ADMIN", "DISPATCHER"), csvUpload.single("file"), bulkUploadCsv);
router.post("/bulk-csv", requireRole("ADMIN", "DISPATCHER"), csvUpload.single("file"), bulkUploadCsv);

router.post("/:id/assign", requireRole("ADMIN", "DISPATCHER"), assignOrder);
router.patch("/:id/status", updateOrderStatus); // riders update status on their own deliveries
router.post("/:id/pod", podUpload.single("file"), uploadPod);

export default router;
