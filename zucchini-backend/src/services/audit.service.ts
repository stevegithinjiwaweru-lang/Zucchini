import { prisma } from "../lib/prisma";
import { AuthedRequest } from "../middleware/auth";

export type AuditAction =
  | "ORDER_CREATED"
  | "ORDER_EDITED"
  | "ORDER_ASSIGNED"
  | "ORDER_REASSIGNED"
  | "ORDER_STATUS_CHANGED"
  | "ORDER_DELIVERED"
  | "ORDER_CANCELLED"
  | "ORDER_DELETED"
  | "ORDER_RESTORED"
  | "RIDER_CREATED"
  | "RIDER_UPDATED"
  | "RIDER_DELETED";

export interface AuditInput {
  action: AuditAction | string;
  entityType: "Order" | "Rider" | string;
  entityId?: string | null;
  previousValues?: unknown;
  newValues?: unknown;
  req?: AuthedRequest;
  userId?: string | null;
  username?: string | null;
  ipAddress?: string | null;
}

function clientIp(req?: AuthedRequest): string | null {
  if (!req) return null;
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length) return xf.split(",")[0].trim();
  return req.ip || req.socket?.remoteAddress || null;
}

/**
 * Fire-and-forget audit log. Never throws to the caller — logging failures
 * must not break business operations.
 */
export async function writeAudit(input: AuditInput): Promise<void> {
  try {
    const userId = input.userId ?? input.req?.user?.id ?? null;
    let username = input.username ?? null;
    if (!username && userId) {
      try {
        const u = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, phone: true } });
        username = u?.name || u?.phone || null;
      } catch {
        /* ignore */
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: userId || undefined,
        username: username || undefined,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId || undefined,
        previousValues: input.previousValues != null ? (input.previousValues as any) : undefined,
        newValues: input.newValues != null ? (input.newValues as any) : undefined,
        ipAddress: input.ipAddress ?? clientIp(input.req) ?? undefined,
      },
    });
  } catch (e) {
    console.error("[audit] failed to write log:", (e as any)?.message || e);
  }
}
