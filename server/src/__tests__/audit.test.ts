import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma, resetDb, seedServices } from "./testDb.js";
import { registerLead, setLeadServices, resolvers } from "../resolvers.js";
import { buildContext } from "../context.js";

beforeEach(async () => {
  await resetDb();
  await seedServices();
});
afterAll(async () => {
  await prisma.$disconnect();
});

async function makeLead() {
  return registerLead(prisma, {
    name: "Ada", email: "ada@example.com", mobile: "0412345678",
    postcode: "2000", services: ["delivery"],
  });
}

describe("setLeadServices", () => {
  it("adds and removes interests and logs both changes", async () => {
    const lead = await makeLead();
    await setLeadServices(prisma, lead.id, ["payment", "pick-up"]);

    const links = await prisma.leadService.findMany({ where: { leadId: lead.id } });
    expect(links).toHaveLength(2); // delivery removed; payment + pick-up added

    const changes = await prisma.serviceInterestChange.findMany({
      where: { leadId: lead.id, source: "admin_edit" },
    });
    const added = changes.filter((c) => c.action === "ADDED").map((c) => c.serviceCode).sort();
    const removed = changes.filter((c) => c.action === "REMOVED").map((c) => c.serviceCode);
    expect(added).toEqual(["payment", "pick-up"]);
    expect(removed).toEqual(["delivery"]);
  });

  it("rejects unknown service codes", async () => {
    const lead = await makeLead();
    await expect(
      setLeadServices(prisma, lead.id, ["teleport"])
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
  });

  it("rejects a non-admin via the mutation resolver", async () => {
    const lead = await makeLead();
    const anon = buildContext(prisma, "ip", false);
    await expect(
      resolvers.Mutation.setLeadServices({}, { leadId: lead.id, services: ["payment"] }, anon)
    ).rejects.toMatchObject({ extensions: { code: "UNAUTHENTICATED" } });
  });
});
