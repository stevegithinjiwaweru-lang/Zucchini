/**
 * One-time migration: fix legacy orders missing a proper order number.
 *
 * Rules:
 * - Never overwrite a valid externalId
 * - Treat externalId as invalid when null, empty, or equal to the Prisma/cuid id
 * - Assign LEGACY-000001, LEGACY-000002, ... and flag needsOrderNumberReview
 *
 * Usage:
 *   npx ts-node --project scripts/tsconfig.json scripts/migrate-legacy-orders.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function looksLikeSystemId(value: string | null | undefined, orderId: string): boolean {
  if (!value) return true;
  const v = value.trim();
  if (!v) return true;
  // Same as the internal id (or first 8 chars uppercased — old UI fallback)
  if (v === orderId) return true;
  if (v === orderId.slice(0, 8).toUpperCase()) return true;
  // cuid-like (starts with c, alphanumeric, length ~25)
  if (/^c[a-z0-9]{20,}$/i.test(v) && v.length >= 20) return true;
  return false;
}

async function main() {
  const orders = await prisma.order.findMany({
    select: { id: true, externalId: true, needsOrderNumberReview: true },
    orderBy: { createdAt: "asc" },
  });

  const toFix = orders.filter((o) => looksLikeSystemId(o.externalId, o.id));
  console.log(`Found ${toFix.length} legacy order(s) to fix out of ${orders.length}`);

  // Find highest existing LEGACY-NNNNNN to avoid collisions
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
  for (const order of toFix) {
    const externalId = `LEGACY-${String(next).padStart(6, "0")}`;
    next += 1;
    try {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          externalId,
          needsOrderNumberReview: true,
        },
      });
      updated += 1;
      console.log(`  ${order.id} → ${externalId}`);
    } catch (e: any) {
      console.error(`  Failed ${order.id}:`, e?.message || e);
    }
  }

  console.log(`Done. Updated ${updated} order(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
