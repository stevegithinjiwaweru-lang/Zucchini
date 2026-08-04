import { Router } from "express";
import { install, callback } from "../controllers/shopify.oauth.controller";
import { handleOrdersCreate } from "../controllers/shopify.controller";

const router = Router();

router.get("/install", install);
router.get("/callback", callback);

// Webhook endpoint receives raw body (app mounts this router with express.raw)
router.post("/webhooks/orders-create", handleOrdersCreate);

export default router;
