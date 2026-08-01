import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env";

export interface AccessTokenPayload {
  sub: string; // user id
  role: string;
  riderId?: string | null;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: env.accessTokenTtl });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
}

// Refresh tokens are random opaque strings; we store a hash of them in the DB
// so a leaked database dump alone can't be replayed as a valid refresh token.
export function generateRefreshToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(48).toString("hex");
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  return { token, hash };
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
