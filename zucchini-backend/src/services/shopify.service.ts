import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { decryptSecret } from "../utils/crypto";
import { ApiError } from "../utils/asyncHandler";
import { getIO } from "../socket";
import { OrderStatus } from "@prisma/client";

const SHOPIFY_API_VERSION = "2024-10";

function adminUrl(shopDomain: string, path: string) {
  return `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}${path}`;
}

// Verifies the token/domain actually work before we save them, so a typo'd
// token doesn't get silently stored as "CONNECTED".
export async function testShopifyCredentials(shopDomain: string, accessToken: string) {
  const resp = await fetch(adminUrl(shopDomain, "/shop.json"), {
    headers: { "X-Shopify-Access-Token": accessToken },
  });
  if (!resp.ok) {
    throw new ApiError(400, "Could not authenticate with Shopify — check the shop domain and access token");
  }
}

// Registers the orders/create webhook pointing at our /api/shopify/webhooks endpoint,
// and returns a per-connection secret used to verify the HMAC signature on incoming
// webhook calls. Shopify signs webhooks with the *app's* API secret rather than a
// per-webhook value, so in a multi-merchant setup you'd normally look that secret up
// per shop; here we generate and store one and expect it configured on the Shopify
// app's webhook signing key (see README for the manual step required).
export async function registerShopifyWebhooks(shopDomain: string, accessToken: string): Promise<string> {
  const callbackBase = process.env.PUBLIC_BACKEND_URL || "http://localhost:4000";
  const address = `${callbackBase}/api/shopify/webhooks/orders-create`;

  const resp = await fetch(adminUrl(shopDomain, "/webhooks.json"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({
      webhook: { topic: "orders/create", address, format: "json" },
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new ApiError(400, `Failed to register Shopify webhook: ${text}`);
  }

  // Secret used to verify this shop's webhook payloads (see README: set this as
  // the app's Client Secret in the Shopify Partner/App settings for HMAC to match).
  return crypto.randomBytes(24).toString("hex");
}

interface ShopifyOrderPayload {
  id: number;
  name: string; // e.g. "#1001"
  customer?: { first_name?: string; last_name?: string; phone?: string };
  phone?: string;
  total_price?: string;
  financial_status?: string;
  shipping_address?: {
    address1?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
}

// Maps a raw Shopify order payload into our internal Order shape and creates it,
// tagging the source as SHOPIFY and storing the Shopify order id for idempotency
// (re-deliveries of the same webhook, or a backfill overlapping a webhook, won't
// create duplicates because externalId is unique).
export async function importShopifyOrder(merchantId: string, payload: ShopifyOrderPayload) {
  const externalId = `shopify:${payload.id}`;

  const existing = await prisma.order.findUnique({ where: { externalId } });
  if (existing) return existing;

  const customerName =
    [payload.customer?.first_name, payload.customer?.last_name].filter(Boolean).join(" ") ||
    "Shopify Customer";
  const phone = payload.customer?.phone || payload.phone || "unknown";
  const address = [payload.shipping_address?.address1, payload.shipping_address?.city]
    .filter(Boolean)
    .join(", ") || "No address provided";

  const order = await prisma.order.create({
    data: {
      merchantId,
      customerName,
      phone,
      address,
      pickupLat: payload.shipping_address?.latitude ?? undefined,
      pickupLng: payload.shipping_address?.longitude ?? undefined,
      amount: payload.total_price ? parseFloat(payload.total_price) : 0,
      paymentType: payload.financial_status === "paid" ? "PREPAID" : "COD",
      status: OrderStatus.NEW,
      source: "SHOPIFY",
      externalId,
      notes: `Shopify order ${payload.name}`,
    },
  });

  getIO()?.emit("order:created", order);
  return order;
}

// Pulls the most recent orders directly from Shopify's REST API as a manual
// fallback/backfill in case a webhook delivery was missed.
export async function backfillRecentOrders(merchant: { id: string; shopifyShopDomain: string | null; shopifyAccessTokenEnc: string | null }) {
  if (!merchant.shopifyShopDomain || !merchant.shopifyAccessTokenEnc) {
    throw new ApiError(400, "Merchant is not connected to Shopify");
  }
  const accessToken = decryptSecret(merchant.shopifyAccessTokenEnc);

  const resp = await fetch(adminUrl(merchant.shopifyShopDomain, "/orders.json?status=any&limit=50"), {
    headers: { "X-Shopify-Access-Token": accessToken },
  });
  if (!resp.ok) {
    throw new ApiError(502, "Failed to fetch orders from Shopify");
  }
  const data = (await resp.json()) as { orders: ShopifyOrderPayload[] };

  let imported = 0;
  for (const raw of data.orders || []) {
    const externalId = `shopify:${raw.id}`;
    const existing = await prisma.order.findUnique({ where: { externalId } });
    if (existing) continue;
    await importShopifyOrder(merchant.id, raw);
    imported++;
  }
  return imported;
}
