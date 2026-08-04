/**
 * One-off cleanup script: deletes ALL orders from the database and resets
 * any riders who were BUSY/IN_DELIVERY (because of those now-deleted orders)
 * back to AVAILABLE.
 *
 * This does NOT touch Users, Riders, or Merchants — only the Order table.
 *
 * Usage:
 *   cd zucchini-backend
 *   npm install                     # if you haven't already
 *   DATABASE_URL="postgres://..." npx ts-node scripts/clear-orders.ts --confirm
 *
 * If you already have a .env file with DATABASE_URL set (e.g. pointing at
 * your Render/production database), you can just run:
 *   npx ts-node scripts/clear-orders.ts --confirm
 *
 * Omitting --confirm runs in dry-run mode: it prints how many orders would
 * be deleted without touching anything.
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const confirmed = process.argv.includes("--confirm");

  const count = await prisma.order.count();
  console.log(`Found ${count} order(s) in the database.`);

  if (count === 0) {
    console.log("Nothing to delete.");
    return;
  }

  if (!confirmed) {
    console.log("\nDry run only — no changes made.");
    console.log("Re-run with --confirm to actually delete these orders:");
    console.log("  npx ts-node scripts/clear-orders.ts --confirm\n");
    return;
  }

  const result = await prisma.order.deleteMany({});
  console.log(`Deleted ${result.count} order(s).`);

  // Any rider left BUSY/IN_DELIVERY was only in that state because of the
  // orders we just deleted — free them up.
  const freed = await prisma.rider.updateMany({
    where: { status: { in: ["BUSY", "IN_DELIVERY"] } },
    data: { status: "AVAILABLE" },
  });
  console.log(`Reset ${freed.count} rider(s) back to AVAILABLE.`);
}

main()
  .catch((err) => {
    console.error("Failed to clear orders:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
