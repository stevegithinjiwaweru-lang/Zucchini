import { Request, Response } from "express";
import { verifyShopifyHmac } from "../utils/crypto";
import { prisma } from "../lib/prisma";
import { importShopifyOrder } from "../services/shopify.service";
import { asyncHandler, ApiError } from "../utils/asyncHandler";

/**
 * POST /api/shopify/webhooks/orders-create
 * - express.raw mounted the router so req.body is a Buffer (raw JSON)
 * - verify HMAC using merchant's webhook secret (preferred) or app secret fallback
 * - import order via importShopifyOrder
 */
export const handleOrdersCreate = asyncHandler(async (req: Request, res: Response) => {
  // raw body buffer
  const raw = req.body as Buffer;
  const hmacHeader = req.headers["x-shopify-hmac-sha256"] as string | undefined;
  const shopDomain = req.headers["x-shopify-shop-domain"] as string | undefined;

  if (!hmacHeader || !shopDomain) {
    return res.status(400).json({ ok: false, message: "Missing Shopify webhook headers" });
  }

  const merchant = await prisma.merchant.findFirst({ where: { shopifyShopDomain: shopDomain } });
  const secret = merchant?.shopifyWebhookSecret || process.env.SHOPIFY_CLIENT_SECRET || "";

  if (!secret) {
    console.warn("No webhook secret available", { shopDomain });
    throw new ApiError(403, "Webhook verification not possible");
  }

  const verified = verifyShopifyHmac(Buffer.isBuffer(raw) ? raw : Buffer.from(JSON.stringify(raw)), hmacHeader, secret);
  if (!verified) {
    console.warn("Invalid Shopify webhook HMAC", { shopDomain });
    throw new ApiError(403, "Invalid webhook signature");
  }

  if (!merchant) {
    console.warn("Webhook for unregistered merchant", { shopDomain });
    return res.status(404).json({ ok: false, message: "Merchant not registered" });
  }

  const payload = typeof raw === "string" ? JSON.parse(raw) : (req as any).body;
  try {
    await importShopifyOrder(merchant.id, payload);
    return res.json({ ok: true });
  } catch (e: any) {
    console.error("Failed to import Shopify order", { err: e?.message || e });
    throw e;
  }
});
