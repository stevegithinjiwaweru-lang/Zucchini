import { Request, Response } from "express";
import { verifyShopifyHmac } from "../utils/crypto";
import { prisma } from "../lib/prisma";
import { importShopifyOrder } from "../services/shopify.service";
import { asyncHandler, ApiError } from "../utils/asyncHandler";
import { env } from "../config/env";

/**
 * POST /api/shopify/webhooks/orders-create
 *
 * Mounted with express.raw so req.body is a Buffer (required for HMAC).
 * HMAC is verified with the app Client Secret (Shopify signs app webhooks with it).
 * Merchant-specific secret is only used if present (legacy); Client Secret is primary.
 */
export const handleOrdersCreate = asyncHandler(async (req: Request, res: Response) => {
  const raw: Buffer = Buffer.isBuffer(req.body)
    ? req.body
    : Buffer.from(typeof req.body === "string" ? req.body : "", "utf8");

  const hmacHeader = String(req.headers["x-shopify-hmac-sha256"] || "");
  const shopDomain = String(req.headers["x-shopify-shop-domain"] || "").toLowerCase();

  if (!hmacHeader || !shopDomain) {
    return res.status(400).json({ ok: false, error: "Missing Shopify webhook headers" });
  }

  // Prefer app client secret (correct for Admin API–registered webhooks).
  // Fall back to per-merchant secret only if client secret is unset (misconfiguration).
  const merchant = await prisma.merchant.findFirst({
    where: { shopifyShopDomain: shopDomain },
  });
  const secret =
    env.shopifyClientSecret ||
    merchant?.shopifyWebhookSecret ||
    process.env.SHOPIFY_CLIENT_SECRET ||
    "";

  if (!secret) {
    console.warn("Shopify webhook: no verification secret configured", { shopDomain });
    return res.status(503).json({ ok: false, error: "Webhook verification not configured" });
  }

  const verified = verifyShopifyHmac(raw, hmacHeader, secret);
  if (!verified) {
    console.warn("Shopify webhook: invalid HMAC", { shopDomain });
    return res.status(401).json({ ok: false, error: "Invalid webhook signature" });
  }

  if (!merchant) {
    console.warn("Shopify webhook: shop not connected", { shopDomain });
    return res.status(404).json({ ok: false, error: "Shop not registered — complete OAuth install first" });
  }

  let payload: any;
  try {
    payload = JSON.parse(raw.toString("utf8"));
  } catch {
    return res.status(400).json({ ok: false, error: "Invalid JSON body" });
  }

  if (!payload || typeof payload.id === "undefined") {
    return res.status(400).json({ ok: false, error: "Malformed Shopify order payload" });
  }

  try {
    const order = await importShopifyOrder(merchant.id, payload);
    return res.status(200).json({
      ok: true,
      orderId: order.id,
      orderNumber: order.externalId,
      externalId: order.externalId,
    });
  } catch (e: any) {
    console.error("Shopify webhook: import failed", { err: e?.message || String(e) });
    // Acknowledge to Shopify to avoid infinite retries on permanent mapping errors
    // when it's a known business error; otherwise 500 so Shopify retries.
    if (e instanceof ApiError && e.status < 500) {
      return res.status(e.status).json({ ok: false, error: e.message });
    }
    throw e;
  }
});
