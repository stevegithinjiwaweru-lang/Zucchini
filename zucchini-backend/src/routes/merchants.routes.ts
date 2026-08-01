import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  listMerchants,
  createMerchant,
  updateMerchant,
  connectShopify,
  syncMerchant,
} from "../controllers/merchants.controller";

const router = Router();

router.use(requireAuth);

router.get("/", listMerchants);
router.post("/", requireRole("ADMIN"), createMerchant);
router.patch("/:id", requireRole("ADMIN"), updateMerchant);
router.post("/:id/connect-shopify", requireRole("ADMIN"), connectShopify);
router.post("/:id/sync", requireRole("ADMIN", "DISPATCHER"), syncMerchant);

export default router;
