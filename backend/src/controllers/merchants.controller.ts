import { Response } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler, ApiError } from "../utils/asyncHandler";
import { connectShopifySchema } from "../utils/schemas";
import { encryptSecret } from "../utils/crypto";
import { AuthedRequest } from "../middleware/auth";
import { registerShopifyWebhooks, backfillRecentOrders, testShopifyCredentials } from "../services/shopify.service";

function serializeMerchant(m: any) {
  return {
    id: m.id,
    name: m.name,
    connector: m.connector,
    status: m.status,
    lastSyncAt: m.lastSyncAt,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
    shopifyShopDomain: m.shopifyShopDomain ?? undefined,
    // access token is intentionally never serialized back to the client
  };
}

export const listMerchants = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const merchants = await prisma.merchant.findMany({ orderBy: { createdAt: "asc" } });
  res.json({ ok: true, data: merchants.map(serializeMerchant) });
});

export const createMerchant = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { name, connector } = req.body || {};
  if (!name) throw new ApiError(400, "name is required");
  const merchant = await prisma.merchant.create({
    data: { name, connector: connector || "APP", status: "DISCONNECTED" },
  });
  res.status(201).json({ ok: true, data: serializeMerchant(merchant) });
});

export const updateMerchant = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  const { name } = req.body || {};
  const merchant = await prisma.merchant.update({ where: { id }, data: { name } }).catch(() => {
    throw new ApiError(404, "Merchant not found");
  });
  res.json({ ok: true, data: serializeMerchant(merchant) });
});

// Connects a merchant to Shopify using a custom-app Admin API access token
// (Settings > Apps > Develop apps in the Shopify admin). Registers the
// orders/create webhook so new Shopify orders flow into dispatch automatically.
export const connectShopify = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  const { shopDomain, accessToken } = connectShopifySchema.parse(req.body);

  const merchant = await prisma.merchant.findUnique({ where: { id } });
  if (!merchant) throw new ApiError(404, "Merchant not found");

  await testShopifyCredentials(shopDomain, accessToken);

  const webhookSecret = await registerShopifyWebhooks(shopDomain, accessToken);

  const updated = await prisma.merchant.update({
    where: { id },
    data: {
      connector: "API",
      status: "CONNECTED",
      shopifyShopDomain: shopDomain,
      shopifyAccessTokenEnc: encryptSecret(accessToken),
      shopifyWebhookSecret: webhookSecret,
      lastSyncAt: new Date(),
    },
  });

  res.json({ ok: true, data: serializeMerchant(updated) });
});

// Manual "sync now" — pulls recent orders in case a webhook was missed.
export const syncMerchant = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  const merchant = await prisma.merchant.findUnique({ where: { id } });
  if (!merchant) throw new ApiError(404, "Merchant not found");
  if (merchant.connector !== "API" || !merchant.shopifyShopDomain || !merchant.shopifyAccessTokenEnc) {
    throw new ApiError(400, "Merchant is not connected to Shopify");
  }

  const count = await backfillRecentOrders(merchant);

  const updated = await prisma.merchant.update({
    where: { id },
    data: { lastSyncAt: new Date() },
  });

  res.json({ ok: true, data: serializeMerchant(updated), imported: count });
});
