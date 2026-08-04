import { prisma } from "./lib/prisma";
import { hashPassword } from "./utils/password";

async function main() {
  // Merchants have been removed from the platform; seed only users.

  const adminPhone = "0700000001";
  const adminPassword = "ChangeMe123!";
  const existingAdmin = await prisma.user.findUnique({ where: { phone: adminPhone } });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        name: "Admin",
        phone: adminPhone,
        passwordHash: await hashPassword(adminPassword),
        role: "ADMIN",
        forcePasswordChange: true,
      },
    });
    console.log(`Created admin login -> phone: ${adminPhone}, password: ${adminPassword}`);
  } else {
    console.log("Admin login already exists, skipping.");
  }

  const dispatcherPhone = "0700000002";
  const dispatcherPassword = "ChangeMe123!";
  const existingDispatcher = await prisma.user.findUnique({ where: { phone: dispatcherPhone } });
  if (!existingDispatcher) {
    await prisma.user.create({
      data: {
        name: "Dispatcher",
        phone: dispatcherPhone,
        passwordHash: await hashPassword(dispatcherPassword),
        role: "DISPATCHER",
        forcePasswordChange: true,
      },
    });
    console.log(`Created dispatcher login -> phone: ${dispatcherPhone}, password: ${dispatcherPassword}`);
  } else {
    console.log("Dispatcher login already exists, skipping.");
  }

  console.log("\nIMPORTANT: change these passwords after first login.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
