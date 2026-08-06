/**
 * Remove or fix orders that still use the old generated-ID numbering scheme.
 *
 * Modes:
 *   --dry-run     (default) Report only
 *   --delete      Soft-delete matching orders (isDeleted=true)
 *   --relabel     Assign LEGACY-NNNNNN and set needsOrderNumberReview
 *
 * Matching criteria (same as migrate-legacy-orders):
 *   - externalId is null / empty
 *   - externalId equals the system id
 *   - externalId equals first 8 chars of system id (uppercased)
 *   - externalId looks like a cuid
 *
 * Usage:
 *   npx ts-node --project scripts/tsconfig.json scripts/cleanup-legacy-order-numbers.ts
 *   npx ts-node --project scripts/tsconfig.json scripts/cleanup-legacy-order-numbers.ts --delete
 *   npx ts-node --project scripts/tsconfig.json scripts/cleanup-legacy-order-numbers.ts --relabel
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const mode = process.argv.includes("--delete")
  ? "delete"
  : process.argv.includes("--relabel")
    ? "relabel"
    : "dry-run";

function isLegacyNumber(externalId: string | null | undefined, orderId: string): boolean {
  if (!externalId) return true;
  const v = externalId.trim();
  if (!v) return true;
  if (v === orderId) return true;
  if (v === orderId.slice(0, 8).toUpperCase()) return true;
  if (/^c[a-z0-9]{20,}$/i.test(v)) return true;
  // Old UI fallback style: 8 uppercase alphanumeric, no dash (e.g. CMSD4P3H)
  if (/^[A-Z0-9]{8}$/.test(v) && !v.startsWith("LEGACY") && !v.startsWith("ORD")) return true;
  return false;
}

async function main() {
  console.log(`Mode: ${mode}`);

  const orders = await prisma.order.findMany({
    select: {
      id: true,
      externalId: true,
      customerName: true,
      status: true,
      isDeleted: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const bad = orders.filter((o) => isLegacyNumber(o.externalId, o.id) && !o.isDeleted);
  console.log(`Found ${bad.length} order(s) with legacy / missing order numbers (of ${orders.length} total)`);

  if (!bad.length) {
    console.log("Nothing to clean up.");
    return;
  }

  for (const o of bad) {
    console.log(`  ${o.id}  externalId=${o.externalId ?? "(null)"}  ${o.customerName}  ${o.status}`);
  }

  if (mode === "dry-run") {
    console.log("\nDry run only. Re-run with --delete or --relabel to apply changes.");
    return;
  }

  if (mode === "delete") {
    const result = await prisma.order.updateMany({
      where: { id: { in: bad.map((o) => o.id) } },
      data: { isDeleted: true, deletedAt: new Date(), deletedBy: "cleanup-script" },
    });
    console.log(`Soft-deleted ${result.count} order(s).`);
    return;
  }

  // relabel
  const existingLegacy = await prisma.order.findMany({
    where: { externalId: { startsWith: "LEGACY-" } },
    select: { externalId: true },
  });
  let next = 1;
  for (const row of existingLegacy) {
    const m = row.externalId?.match(/^LEGACY-(\d+)$/);
    if (m) next = Math.max(next, parseInt(m[1], 10) + 1);
  }

  let updated = 0;
  for (const o of bad) {
    const externalId = `LEGACY-${String(next).padStart(6, "0")}`;
    next += 1;
    await prisma.order.update({
      where: { id: o.id },
      data: { externalId, needsOrderNumberReview: true },
    });
    console.log(`  ${o.id} → ${externalId}`);
    updated += 1;
  }
  console.log(`Relabeled ${updated} order(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
