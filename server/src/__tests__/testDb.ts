import { PrismaClient } from "@prisma/client";

// Point Prisma at the test database before instantiating the client.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

export const prisma = new PrismaClient();

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
