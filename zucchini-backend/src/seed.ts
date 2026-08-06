import { prisma } from "./lib/prisma";
import { hashPassword } from "./utils/password";

/**
 * Seeds:
 *  - Admin + Dispatcher accounts
 *  - Sample riders with phone + bcrypt password (RD001…)
 *
 * Default password for all seeded accounts: ChangeMe123!
 * Change immediately after first login in production.
 */
async function ensureUser(opts: {
  name: string;
  phone: string;
  password: string;
  role: "ADMIN" | "DISPATCHER" | "RIDER";
  riderId?: string;
}) {
  const existing = await prisma.user.findUnique({ where: { phone: opts.phone } });
  if (existing) {
    console.log(`  User ${opts.phone} already exists — skip`);
    return existing;
  }
  const user = await prisma.user.create({
    data: {
      name: opts.name,
      phone: opts.phone,
      passwordHash: await hashPassword(opts.password),
      role: opts.role,
      riderId: opts.riderId,
    },
  });
  console.log(`  Created ${opts.role}: ${opts.phone} / ${opts.password}`);
  return user;
}



async function ensureRider(opts: {
  name: string;
  phone: string;
  password: string;
  vehicleType?: string;
  branch?: string;
}) {
  const existing = await prisma.rider.findUnique({ where: { phone: opts.phone } });
  if (existing) {
    console.log(`  Rider ${opts.phone} already exists — skip`);
    await ensureUser({
      name: opts.name,
      phone: opts.phone,
      password: opts.password,
      role: "RIDER",
      riderId: existing.id,
    });
    return existing;
  }

  const rider = await prisma.rider.create({
  data: {
    name: opts.name,
    phone: opts.phone,
    vehicleType: opts.vehicleType || "Motorcycle",
    branch: opts.branch || "Nairobi",
    status: "AVAILABLE",
  },
});

await ensureUser({
  name: opts.name,
  phone: opts.phone,
  password: opts.password,
  role: "RIDER",
  riderId: rider.id,
});

console.log(`  Rider ${opts.name} (${opts.phone}) / ${opts.password}`);

return rider;

  await ensureUser({
    name: opts.name,
    phone: opts.phone,
    password: opts.password,
    role: "RIDER",
    riderId: rider.id,
  });

  console.log(`  Rider ${opts.name} (${opts.phone}) / ${opts.password}`);
  return rider;
}

async function main() {
  const defaultPassword = "ChangeMe123!";

  console.log("Seeding admin & dispatcher…");
  await ensureUser({
    name: "Admin",
    phone: "0700000001",
    password: defaultPassword,
    role: "ADMIN",
  });
  await ensureUser({
    name: "Dispatcher",
    phone: "0700000002",
    password: defaultPassword,
    role: "DISPATCHER",
  });

  console.log("Seeding sample riders…");
  await ensureRider({
    name: "James Mwangi",
    phone: "0711000001",
    password: defaultPassword,
    vehicleType: "Motorcycle",
    branch: "Nairobi CBD",
  });
  await ensureRider({
    name: "Grace Wanjiku",
    phone: "0711000002",
    password: defaultPassword,
    vehicleType: "Motorcycle",
    branch: "Westlands",
  });
  await ensureRider({
    name: "Peter Ochieng",
    phone: "0711000003",
    password: defaultPassword,
    vehicleType: "Bicycle",
    branch: "Kilimani",
  });

  console.log("\nDone.");
  console.log("IMPORTANT: change all seeded passwords after first login in production.");
  console.log("Admin:      0700000001 / ChangeMe123!");
  console.log("Dispatcher: 0700000002 / ChangeMe123!");
  console.log("Riders:     0711000001–0711000003 / ChangeMe123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
