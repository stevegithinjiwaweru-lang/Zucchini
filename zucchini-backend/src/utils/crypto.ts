import crypto from "crypto";
import { env } from "../config/env";

// Derives a 32-byte key from whatever string is in TOKEN_ENCRYPTION_KEY so the
// operator can set any secret value (hex, passphrase, etc.) in .env.
function getKey(): Buffer {
  return crypto.createHash("sha256").update(env.tokenEncryptionKey).digest();
}

// Encrypts a plaintext secret (e.g. a Shopify Admin API access token) for storage.
// Format: iv:authTag:ciphertext (all hex), so it's safe to store as a single string column.
export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptSecret(payload: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(":");
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error("Malformed encrypted payload");
  }
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

// Constant-time comparison for verifying Shopify HMAC webhook signatures.
export function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function verifyShopifyHmac(rawBody: Buffer, hmacHeader: string, secret: string): boolean {
  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  return timingSafeEqual(digest, hmacHeader);
}
