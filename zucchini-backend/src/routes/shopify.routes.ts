import { Router } from "express";
import { install, callback } from "../controllers/shopify.oauth.controller";

/**
 * OAuth routes are also mounted explicitly in app.ts.
 * This router remains for consistency / future Shopify endpoints.
 * Webhook is mounted ONLY in app.ts with express.raw (do not add it here).
 */
const router = Router();

router.get("/install", install);
router.get("/callback", callback);

export default router;
