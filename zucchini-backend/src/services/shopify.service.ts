import { prisma } from "../lib/prisma";
import { decryptSecret } from "../utils/crypto";
import { ApiError } from "../utils/asyncHandler";
import { getIO } from "../socket";
import { OrderStatus } from "../types/enums";
import { env } from "../config/env";
import { ShopifyOrderPayload } from "../types/shopify";

const SHOPIFY_API_VERSION = "2024-10";

function adminUrl(shopDomain: string, path: string) {
  return `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}${path}`;
}

/**
 * Register orders/create webhook pointing at this backend.
 * Shopify signs these webhooks with the app Client Secret — do NOT invent a random secret.
 */
export async function registerShopifyWebhooks(shopDomain: string, accessToken: string): Promise<void> {
  const base = (env.publicBackendUrl || env.shopifyAppUrl || "").replace(/\/$/, "");
  if (!base) {
    throw new ApiError(500, "PUBLIC_BACKEND_URL or SHOPIFY_APP_URL must be set to register webhooks");
  }
  const address = `${base}/api/shopify/webhooks/orders-create`;

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
    // 422 often means webhook already exists — treat as success for idempotent re-install
    if (resp.status === 422 && /already been taken|has already been taken/i.test(text)) {
      return;
    }
    throw new ApiError(400, `Failed to register Shopify webhook (${resp.status})`);
  }
}

export async function testShopifyCredentials(shopDomain: string, accessToken: string) {
  const resp = await fetch(adminUrl(shopDomain, "/shop.json"), {
    headers: { "X-Shopify-Access-Token": accessToken },
  });
  if (!resp.ok) {
    throw new ApiError(401, "Shopify credentials rejected");
  }
  return resp.json();
}

/**
 * Map Shopify order → Zucchini Order.
 * externalId = shopify:{numericId} for stable idempotency (never collides with manual ORD-*).
 * Human-readable Shopify name (e.g. #1001) is stored in notes.
 * Does NOT touch or regenerate manual dispatcher order numbers.
 */
export async function importShopifyOrder(merchantId: string, payload: ShopifyOrderPayload) {
  if (payload == null || payload.id == null) {
    throw new ApiError(400, "Invalid Shopify order payload");
  }

  const externalId = `shopify:${payload.id}`;

  const existing = await prisma.order.findUnique({ where: { externalId } });
  if (existing) return existing;

  const customerName =
    [payload.customer?.first_name, payload.customer?.last_name].filter(Boolean).join(" ").trim() ||
    "Shopify Customer";

  const phone =
    (payload.customer?.phone || payload.phone || payload.shipping_address?.phone || "").trim() ||
    "unknown";

  const destination = [payload.shipping_address?.address1, payload.shipping_address?.address2, payload.shipping_address?.city, payload.shipping_address?.province, payload.shipping_address?.country]
    .filter(Boolean)
    .join(", ");

  // Pickup: not always in order payload; leave address as shipping for dispatch routing
  const address = destination || "No address provided";

  const amount = payload.total_price ? parseFloat(String(payload.total_price)) : 0;
  const paymentType = payload.financial_status === "paid" ? "PREPAID" : "COD";
  const shopifyName = payload.name || String(payload.id);

  try {
    const order = await prisma.order.create({
      data: {
        merchantId,
        customerName,
        phone,
        address,
        destination: destination || null,
        pickupLat: payload.shipping_address?.latitude ?? undefined,
        pickupLng: payload.shipping_address?.longitude ?? undefined,
        destinationLat: payload.shipping_address?.latitude ?? undefined,
        destinationLng: payload.shipping_address?.longitude ?? undefined,
        amount: Number.isFinite(amount) ? amount : 0,
        paymentType,
        status: OrderStatus.NEW,
        source: "SHOPIFY",
        externalId,
        notes: `Shopify ${shopifyName}`,
        isDeleted: false,
      },
    });

    const serialized = {
      ...order,
      orderNumber: order.externalId,
    };
    try {
      getIO()?.emit("order.created", serialized);
      getIO()?.emit("order:created", serialized);
    } catch {
      /* socket optional */
    }
    return order;
  } catch (e: any) {
    // Race: concurrent webhook delivery — unique on externalId
    if (e?.code === "P2002") {
      const again = await prisma.order.findUnique({ where: { externalId } });
      if (again) return again;
    }
    throw e;
  }
}

/** Manual backfill of recent Shopify orders (idempotent). */
export async function backfillRecentOrders(merchant: {
  id: string;
  shopifyShopDomain: string | null;
  shopifyAccessTokenEnc: string | null;
}) {
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
    const before = await prisma.order.findUnique({ where: { externalId: `shopify:${raw.id}` } });
    await importShopifyOrder(merchant.id, raw);
    if (!before) imported++;
  }
  return imported;
}
