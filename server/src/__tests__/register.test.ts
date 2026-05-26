import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { prisma, resetDb, seedServices } from "./testDb.js";
import { registerLead } from "../resolvers.js";

beforeAll(async () => {
  await resetDb();
});
beforeEach(async () => {
  await resetDb();
  await seedServices();
});
afterAll(async () => {
  await prisma.$disconnect();
});

const input = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  mobile: "0412345678",
  postcode: "2000",
  suburb: "Sydney",
  services: ["delivery", "payment"],
};

describe("registerLead", () => {
  it("creates a lead with its services on the happy path", async () => {
    const lead = await registerLead(prisma, input);
    expect(lead.email).toBe("ada@example.com");
    const links = await prisma.leadService.findMany({
      where: { leadId: lead.id },
    });
    expect(links).toHaveLength(2);
  });

  it("rejects a duplicate email with EMAIL_TAKEN", async () => {
    await registerLead(prisma, input);
    await expect(registerLead(prisma, input)).rejects.toMatchObject({
      extensions: { code: "EMAIL_TAKEN" },
    });
  });

  it("rejects an unknown service code", async () => {
    await expect(
      registerLead(prisma, { ...input, services: ["teleport"] })
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
  });

  it("deduplicates repeated service codes", async () => {
    const lead = await registerLead(prisma, {
      ...input,
      services: ["delivery", "delivery"],
    });
    const links = await prisma.leadService.findMany({
      where: { leadId: lead.id },
    });
    expect(links).toHaveLength(1);
  });

  it("logs ADDED history for each service at registration", async () => {
    const lead = await registerLead(prisma, input);
    const changes = await prisma.serviceInterestChange.findMany({
      where: { leadId: lead.id },
    });
    expect(changes).toHaveLength(2);
    expect(changes.every((c) => c.action === "ADDED")).toBe(true);
    expect(changes.every((c) => c.source === "registration")).toBe(true);
  });
});
