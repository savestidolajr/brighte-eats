import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SERVICES = [
  { code: "delivery", label: "Delivery" },
  { code: "pick-up", label: "Pick-up" },
  { code: "payment", label: "Payment" },
];

async function main() {
  for (const s of SERVICES) {
    await prisma.service.upsert({
      where: { code: s.code },
      update: { label: s.label },
      create: s,
    });
  }
  console.log(`Seeded ${SERVICES.length} services`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
