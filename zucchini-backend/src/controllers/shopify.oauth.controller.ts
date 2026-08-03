// zucchini-backend/src/controllers/shopify.oauth.controller.ts
import { Request, Response } from "express";
import crypto from "crypto";
import fetch from "node-fetch";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { asyncHandler, ApiError } from "../utils/asyncHandler";
import { prisma } from "../lib/prisma";
import { encryptSecret } from "../utils/crypto";
import { registerShopifyWebhooks } from "../services/shopify.service";
import { ShopifyAccessTokenResponse } from "../types/shopify";

/**
 * Shopify OAuth flow:
 * - GET /api/shopify/install?shop=...  -> validate shop, sign state, set cookie, redirect to Shopify OAuth
 * - GET /api/shopify/callback         -> verify state cookie, verify callback HMAC, exchange code for token,
 *                                       persist encrypted token, register webhooks (best-effort), return success
 */

// Validate a shop domain like "example.myshopify.com"
function validShopDomain(shop?: string): shop is string {
  if (!shop) return false;
  return /^[a-z0-9][a-z0-9\-]*\.myshopify\.com$/i.test(shop);
}

function signState(shop: string, nonce: string) {
  return jwt.sign({ shop, nonce }, env.jwtAccessSecret, { expiresIn: "10m" });
}
function verifyStateToken(token: string) {
  return jwt.verify(token, env.jwtAccessSecret) as { shop: string; nonce: string };
}

function buildShopifyAuthUrl(shop: string, state: string) {
  const clientId = env.shopifyClientId;
  const redirect = env.shopifyRedirectUri || `${env.shopifyAppUrl}/api/shopify/callback`;
  const scopes = ["read_orders", "read_customers"].join(","); // minimal requested scopes
  const url = new URL(`https://${shop}/admin/oauth/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", scopes);
  url.searchParams.set("redirect_uri", redirect);
  url.searchParams.set("state", state);
  return url.toString();
}

export const install = asyncHandler(async (req: Request, res: Response) => {
  const shop = String(req.query.shop || "").trim();
  if (!validShopDomain(shop)) throw new ApiError(400, "Invalid shop parameter");

  if (!env.shopifyClientId || !env.shopifyClientSecret || !env.shopifyAppUrl) {
    throw new ApiError(500, "Shopify OAuth is not configured on this server");
  }

  const nonce = crypto.randomBytes(16).toString("hex");
  const stateToken = signState(shop, nonce);

  res.cookie("shopify_oauth_state", stateToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60 * 1000,
  });

  const redirectUrl = buildShopifyAuthUrl(shop, stateToken);
  res.redirect(302, redirectUrl);
});

export const callback = asyncHandler(async (req: Request, res: Response) => {
  const { shop, code, state, hmac } = req.query as Record<string, string | undefined>;
  if (!shop || !code || !state) throw new ApiError(400, "Missing OAuth callback parameters");
  if (!validShopDomain(shop)) throw new ApiError(400, "Invalid shop parameter");
  if (!env.shopifyClientId || !env.shopifyClientSecret) throw new ApiError(500, "Shopify OAuth not configured on this server");

  // parse cookie header manually (no cookie-parser dependency)
  const cookieHeader = (req.headers.cookie as string) || "";
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [k, ...rest] = c.trim().split("=");
      return [k, decodeURIComponent(rest.join("="))];
    })
  );
  const stateCookie = cookies["shopify_oauth_state"];
  if (!stateCookie) throw new ApiError(400, "Missing OAuth state cookie");

  try {
    const decoded = verifyStateToken(stateCookie);
    if (decoded.shop !== shop) throw new ApiError(400, "OAuth state mismatch (shop)");
  } catch {
    throw new ApiError(400, "Invalid or expired OAuth state token");
  }

  // verify HMAC on callback parameters (exclude hmac)
  const secret = env.shopifyClientSecret;
  const message = Object.keys(req.query)
    .filter((k) => k !== "hmac" && req.query[k] !== undefined)
    .sort()
    .map((k) => `${k}=${(req.query as any)[k]}`)
    .join("&");
  const computed = crypto.createHmac("sha256", secret).update(message).digest("hex");
  if (!crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(String(hmac || "")))) {
    throw new ApiError(400, "Invalid HMAC on OAuth callback");
  }

  // exchange code for access token
  const tokenUrl = `https://${shop}/admin/oauth/access_token`;
  const resp = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: env.shopifyClientId, client_secret: env.shopifyClientSecret, code }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    console.error("Shopify token exchange failed", { shop, status: resp.status, body: t });
    throw new ApiError(502, "Failed to exchange authorization code for access token");
  }

  const tokenBody = (await resp.json()) as ShopifyAccessTokenResponse;
  if (!tokenBody.access_token) throw new ApiError(502, "Shopify access token missing in response");

  // store encrypted token in Merchant (create/update)
  const encrypted = encryptSecret(tokenBody.access_token);
  let merchant = await prisma.merchant.findFirst({ where: { shopifyShopDomain: shop } });
  if (!merchant) {
    merchant = await prisma.merchant.create({
      data: { name: shop, connector: "API", status: "CONNECTED", shopifyShopDomain: shop, shopifyAccessTokenEnc: encrypted },
    });
  } else {
    merchant = await prisma.merchant.update({ where: { id: merchant.id }, data: { shopifyAccessTokenEnc: encrypted, shopifyShopDomain: shop, status: "CONNECTED" } });
  }

  // register webhooks (best-effort)
  try {
    const perConnectionSecret = await registerShopifyWebhooks(shop, tokenBody.access_token);
    if (perConnectionSecret) {
      await prisma.merchant.update({ where: { id: merchant.id }, data: { shopifyWebhookSecret: perConnectionSecret } });
    }
  } catch (e: any) {
    console.warn("Failed to register Shopify webhooks", { shop, err: e?.message || e });
    // do not fail install
  }

  res.json({ ok: true, message: "Shopify app installed", merchant: { id: merchant.id, shop: merchant.shopifyShopDomain } });
});
