/**
 * Order display identifier
 *
 * This returns the externally-provided order identifier (externalId) when present.
 * We intentionally DO NOT fall back to id.slice(...) or auto-generated UUID display.
 * If externalId is not present, return a neutral placeholder.
 */
export function getOrderDisplayNumber(order: { externalId?: string | null } | null | undefined): string {
  if (!order) return "—";
  const v = (order.externalId ?? "").toString().trim();
  return v.length ? v : "—";
}
