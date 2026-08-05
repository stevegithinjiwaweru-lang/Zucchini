import { Response } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler, ApiError } from "../utils/asyncHandler";
import { AuthedRequest } from "../middleware/auth";
import { comparePassword, hashPassword } from "../utils/password";

interface ChangePasswordBody {
  currentPassword?: string;
  newPassword: string;
}

// PATCH /api/users/:id/password
// - If caller is the same user: require currentPassword + newPassword
// - If caller is ADMIN: allow resetting another user's password with newPassword only
// Clears forcePasswordChange on success.
export const changePassword = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  const body = req.body as ChangePasswordBody;

  if (!body?.newPassword || typeof body.newPassword !== "string" || body.newPassword.length < 4) {
    throw new ApiError(400, "newPassword is required and must be at least 4 characters");
  }

  const targetUser = await prisma.user.findUnique({ where: { id } });
  if (!targetUser) throw new ApiError(404, "User not found");

  const callerId = req.user!.id;
  const callerRole = req.user!.role;

  if (callerId === id) {
    if (!body.currentPassword) throw new ApiError(400, "currentPassword is required when changing your own password");
    const valid = await comparePassword(body.currentPassword, targetUser.passwordHash);
    if (!valid) throw new ApiError(401, "Current password is incorrect");
  } else {
    if (callerRole !== "ADMIN") throw new ApiError(403, "Insufficient permissions to reset another user's password");
    // Admin reset allowed without currentPassword
  }

  const newHash = await hashPassword(body.newPassword);
  await prisma.user.update({ where: { id }, data: { passwordHash: newHash, forcePasswordChange: false } });

  res.json({ ok: true });
});
