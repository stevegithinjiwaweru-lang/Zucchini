import { Router } from "express";
import { handleOrdersCreate } from "../controllers/shopify.controller";

const router = Router();

// Return 410 for all Shopify webhook endpoints after merchant removal.
router.post("/webhooks/orders-create", handleOrdersCreate);

export default router;
