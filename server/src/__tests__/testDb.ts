import { PrismaClient } from "@prisma/client";

// Use the dedicated test database; injected explicitly so it never depends on
// module-load ordering relative to dotenv setup.
const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) {
  throw new Error("TEST_DATABASE_URL or DATABASE_URL must be set for tests");
}

export const prisma = new PrismaClient({ datasources: { db: { url } } });

export async function resetDb() {
  // Order matters: child table first.
  await prisma.leadService.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.service.deleteMany();
}

export async function seedServices() {
  await prisma.service.createMany({
    data: [
      { code: "delivery", label: "Delivery" },
      { code: "pick-up", label: "Pick-up" },
      { code: "payment", label: "Payment" },
    ],
  });
}
