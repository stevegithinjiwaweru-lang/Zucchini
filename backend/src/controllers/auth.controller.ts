import { Response } from "express";
import { prisma } from "../lib/prisma";
import { comparePassword } from "../utils/password";
import { signAccessToken, generateRefreshToken, hashRefreshToken } from "../utils/jwt";
import { loginSchema, refreshSchema } from "../utils/schemas";
import { asyncHandler, ApiError } from "../utils/asyncHandler";
import { env } from "../config/env";
import { AuthedRequest } from "../middleware/auth";

function publicUser(user: { id: string; name: string; phone: string; role: string; riderId?: string | null }) {
  return { id: user.id, name: user.name, phone: user.phone, role: user.role, riderId: user.riderId ?? null };
}

async function issueTokens(user: { id: string; role: string; riderId?: string | null }) {
  const accessToken = signAccessToken({ sub: user.id, role: user.role, riderId: user.riderId });
  const { token: refreshToken, hash } = generateRefreshToken();
  const expiresAt = new Date(Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: { tokenHash: hash, userId: user.id, expiresAt },
  });
  return { accessToken, refreshToken };
}

export const login = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { phone, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) throw new ApiError(401, "Invalid phone or password");

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) throw new ApiError(401, "Invalid phone or password");

  const { accessToken, refreshToken } = await issueTokens(user);

  res.json({ ok: true, accessToken, refreshToken, user: publicUser(user) });
});

export const refresh = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { refreshToken } = refreshSchema.parse(req.body);
  const hash = hashRefreshToken(refreshToken);

  const record = await prisma.refreshToken.findUnique({ where: { tokenHash: hash } });
  if (!record || record.revoked || record.expiresAt < new Date()) {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const user = await prisma.user.findUnique({ where: { id: record.userId } });
  if (!user) throw new ApiError(401, "User no longer exists");

  // Rotate: revoke the old refresh token and issue a new pair.
  await prisma.refreshToken.update({ where: { id: record.id }, data: { revoked: true } });
  const tokens = await issueTokens(user);

  res.json({ ok: true, ...tokens, user: publicUser(user) });
});

export const me = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) throw new ApiError(404, "User not found");
  res.json({ ok: true, user: publicUser(user) });
});

export const logout = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { refreshToken } = req.body || {};
  if (refreshToken) {
    const hash = hashRefreshToken(refreshToken);
    await prisma.refreshToken.updateMany({ where: { tokenHash: hash }, data: { revoked: true } });
  }
  res.json({ ok: true });
});
