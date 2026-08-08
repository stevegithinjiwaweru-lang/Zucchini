/**
 * Consistent order number display across the app.
 *
 * Rules:
 * - Always prefer the dispatcher-provided value (orderNumber / externalId).
 * - NEVER treat the Prisma system id as an order number for display.
 * - For legacy rows with no externalId, show a clear placeholder — not a
 *   truncated cuid that looks like a real order number (e.g. CMSD4P3H).
 */
export function getOrderDisplayNumber(order: {
  externalId?: string | null;
  orderNumber?: string | null;
  id?: string;
  source?: string;
} | null | undefined): string {
  if (!order) return "—";
  const num = (order.orderNumber || order.externalId || "").trim();
  if (num) {
    // Guard: if externalId was accidentally set to the system id, don't show it
    if (order.id && (num === order.id || num === order.id.slice(0, 8).toUpperCase())) {
      return "—";
    }
    return num;
  }
  return "—";
}
