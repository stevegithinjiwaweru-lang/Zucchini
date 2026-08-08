/**
 * Offline unit tests for Shopify helpers (no live Shopify, no DB required for crypto/HMAC).
 * Run: npx ts-node --project scripts/tsconfig.json scripts/test-shopify.ts
 */
import crypto from "crypto";
import assert from "assert";

// --- inline copies of pure functions under test (mirrors production logic) ---
function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function verifyShopifyHmac(rawBody: Buffer, hmacHeader: string, secret: string): boolean {
  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  return timingSafeEqual(digest, hmacHeader);
}

function validShopDomain(shop?: string): boolean {
  if (!shop) return false;
  return /^[a-z0-9][a-z0-9\-]*\.myshopify\.com$/i.test(shop);
}

function mapExternalId(payload: { id: number | string }) {
  return `shopify:${payload.id}`;
}

function buildAuthUrl(opts: { shop: string; clientId: string; redirect: string; state: string }) {
  const scopes = ["read_orders", "read_customers"].join(",");
  const url = new URL(`https://${opts.shop}/admin/oauth/authorize`);
  url.searchParams.set("client_id", opts.clientId);
  url.searchParams.set("scope", scopes);
  url.searchParams.set("redirect_uri", opts.redirect);
  url.searchParams.set("state", opts.state);
  return url.toString();
}

let passed = 0;
let failed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (e: any) {
    console.error(`  FAIL  ${name}: ${e.message}`);
    failed++;
  }
}

console.log("Shopify unit tests\n");

test("valid shop domain accepts *.myshopify.com", () => {
  assert.strictEqual(validShopDomain("zucchini-ke.myshopify.com"), true);
});

test("valid shop domain rejects storefront and empty", () => {
  assert.strictEqual(validShopDomain("zucchini.co.ke"), false);
  assert.strictEqual(validShopDomain(""), false);
  assert.strictEqual(validShopDomain("https://foo.myshopify.com"), false);
});

test("OAuth URL generation includes required params", () => {
  const url = buildAuthUrl({
    shop: "demo.myshopify.com",
    clientId: "test-client-id",
    redirect: "https://backend.example/api/shopify/callback",
    state: "state-token",
  });
  assert.ok(url.startsWith("https://demo.myshopify.com/admin/oauth/authorize"));
  assert.ok(url.includes("client_id=test-client-id"));
  assert.ok(url.includes("redirect_uri="));
  assert.ok(url.includes("state=state-token"));
  assert.ok(url.includes("read_orders"));
});

test("HMAC accepts valid signature", () => {
  const secret = "test-secret";
  const body = Buffer.from(JSON.stringify({ id: 99, name: "#1001" }), "utf8");
  const hmac = crypto.createHmac("sha256", secret).update(body).digest("base64");
  assert.strictEqual(verifyShopifyHmac(body, hmac, secret), true);
});

test("HMAC rejects invalid signature", () => {
  const secret = "test-secret";
  const body = Buffer.from(JSON.stringify({ id: 99 }), "utf8");
  assert.strictEqual(verifyShopifyHmac(body, "not-a-valid-hmac========", secret), false);
});

test("HMAC rejects empty signature", () => {
  const body = Buffer.from("{}");
  assert.strictEqual(verifyShopifyHmac(body, "", "secret"), false);
});

test("HMAC does not use re-serialized JSON (raw body only)", () => {
  const secret = "s";
  // Compact JSON vs spaced JSON are different bytes → different HMAC
  const compact = Buffer.from('{"id":1}');
  const spaced = Buffer.from('{ "id": 1 }');
  const hmacCompact = crypto.createHmac("sha256", secret).update(compact).digest("base64");
  assert.strictEqual(verifyShopifyHmac(spaced, hmacCompact, secret), false);
  assert.strictEqual(verifyShopifyHmac(compact, hmacCompact, secret), true);
});

test("order externalId is deterministic and Shopify-prefixed", () => {
  assert.strictEqual(mapExternalId({ id: 12345 }), "shopify:12345");
  assert.strictEqual(mapExternalId({ id: "12345" }), "shopify:12345");
  // Does not look like manual ORD-* numbers
  assert.ok(!mapExternalId({ id: 1 }).startsWith("ORD-"));
});

test("idempotency key stable across duplicate payloads", () => {
  const a = mapExternalId({ id: 42 });
  const b = mapExternalId({ id: 42 });
  assert.strictEqual(a, b);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
