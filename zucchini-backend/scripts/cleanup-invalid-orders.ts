#!/usr/bin/env ts-node
import "dotenv/config";
import fs from "fs";
import path from "path";
import { prisma } from "../src/lib/prisma";

async function main() {
  const beforeArg = process.argv.find((a) => a.startsWith("--before="));
  const confirmed = process.argv.includes("--confirm");
  const beforeDate = beforeArg ? new Date(beforeArg.split("=")[1]) : new Date("2026-07-01T00:00:00.000Z");

  // Candidate criteria: externalId is null OR matches test patterns OR createdAt < beforeDate
  const candidates = await prisma.order.findMany({
    where: {
      OR: [
        { externalId: null },
        { externalId: { matches: "^(test|dummy|sample|order|tmp|id)", mode: "insensitive" } },
        { externalId: { matches: "^[a-f0-9]{24}$", mode: "insensitive" } },
        { createdAt: { lt: beforeDate } },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${candidates.length} candidate order(s) for deletion.`);
  const out = candidates.map((o) => ({ id: o.id, externalId: o.externalId, customerName: o.customerName, phone: o.phone, createdAt: o.createdAt }));
  const backupPath = path.resolve(process.cwd(), `cleanup-orders-backup-${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(out, null, 2));
  console.log(`Backup written to ${backupPath}`);

  if (!confirmed) {
    console.log("Dry run — no changes made. Rerun with --confirm to delete these orders.");
    return;
  }

  const ids = candidates.map((c) => c.id);
  const deleted = await prisma.order.deleteMany({ where: { id: { in: ids } } });
  console.log(`Deleted ${deleted.count} order(s).`);

  // Free riders that may have been BUSY/IN_DELIVERY because of these orders
  const freed = await prisma.rider.updateMany({ where: { status: { in: ["BUSY", "IN_DELIVERY"] } }, data: { status: "AVAILABLE" } });
  console.log(`Reset ${freed.count} rider(s) back to AVAILABLE.`);
}

main()
  .catch((err) => {
    console.error("Failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
