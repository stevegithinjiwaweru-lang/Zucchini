import { Router } from "express";
import { handleOrdersCreate } from "../controllers/shopify.controller";

const router = Router();

// No auth middleware here — Shopify calls this directly and authenticates via
// HMAC signature (verified inside the controller), not a bearer token.
router.post("/webhooks/orders-create", handleOrdersCreate);

export default router;
