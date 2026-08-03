// zucchini-backend/src/services/shopify.oauth.service.ts
import { decryptSecret } from "../utils/crypto";

const SHOPIFY_API_VERSION = "2024-10";

/**
 * Generic Shopify Admin API request helper which injects X-Shopify-Access-Token
 * by decrypting the stored token. Throws on non-2xx responses with details.
 */
export async function shopifyRequest<T = any>(
  shopDomain: string,
  encryptedToken: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  path = "/",
  body?: any,
  extraHeaders: Record<string, string> = {}
): Promise<T> {
  const accessToken = decryptSecret(encryptedToken);
  const url = `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}${path}`;
  const opts: any = { method, headers: { "X-Shopify-Access-Token": accessToken, "Content-Type": "application/json", Accept: "application/json", ...extraHeaders } };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const resp = await fetch(url, opts as any);
  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`Shopify request failed (${resp.status}): ${text}`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    return (text as unknown) as T;
  }
}

export async function fetchShopifyOrders(shopDomain: string, encryptedToken: string, params = "") {
  return shopifyRequest<{ orders: any[] }>(shopDomain, encryptedToken, "GET", `/orders.json${params ? "?" + params : ""}`);
}

export async function registerOrdersCreateWebhook(shopDomain: string, encryptedToken: string, callbackUrl: string) {
  const body = { webhook: { topic: "orders/create", address: callbackUrl, format: "json" } };
  return shopifyRequest(shopDomain, encryptedToken, "POST", "/webhooks.json", body);
}
