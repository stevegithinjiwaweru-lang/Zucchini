import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { verifyShopifyHmac } from "../utils/crypto";
import { importShopifyOrder } from "../services/shopify.service";

// Shopify webhooks must be verified using the RAW request body (before JSON
// parsing) — see app.ts, which mounts this route with express.raw() instead
// of express.json(). req.body here is a Buffer.
export const handleOrdersCreate = asyncHandler(async (req: Request, res: Response) => {
  const shopDomain = req.header("X-Shopify-Shop-Domain");
  const hmacHeader = req.header("X-Shopify-Hmac-Sha256");
  const rawBody = req.body as Buffer;

  if (!shopDomain || !hmacHeader) {
    return res.status(400).json({ ok: false, error: "Missing Shopify headers" });
  }

  const merchant = await prisma.merchant.findUnique({ where: { shopifyShopDomain: shopDomain } });
  if (!merchant || !merchant.shopifyWebhookSecret) {
    // Respond 200 so Shopify doesn't endlessly retry a webhook for a shop we've
    // since disconnected, but don't process it.
    return res.status(200).json({ ok: true, ignored: true });
  }

  const valid = verifyShopifyHmac(rawBody, hmacHeader, merchant.shopifyWebhookSecret);
  if (!valid) {
    return res.status(401).json({ ok: false, error: "Invalid webhook signature" });
  }

  const payload = JSON.parse(rawBody.toString("utf8"));
  await importShopifyOrder(merchant.id, payload);

  res.status(200).json({ ok: true });
});
