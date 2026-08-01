import jwt, { Secret, SignOptions } from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env";

export interface AccessTokenPayload {
  sub: string;
  role: string;
  riderId?: string | null;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.accessTokenTtl as SignOptions["expiresIn"],
  };

  return jwt.sign(payload, env.jwtAccessSecret as Secret, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwtAccessSecret as Secret) as AccessTokenPayload;
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