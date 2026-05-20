import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { prisma, resetDb, seedServices } from "./testDb.js";
import { registerLead, resolvers } from "../resolvers.js";
import { buildContext } from "../context.js";

function ctx() {
  return buildContext(prisma, "test-ip");
}

beforeAll(async () => {
  await resetDb();
});
beforeEach(async () => {
  await resetDb();
  await seedServices();
  await registerLead(prisma, {
    name: "A", email: "a@x.com", mobile: "0400000001",
    postcode: "2000", services: ["delivery"],
  });
  await registerLead(prisma, {
    name: "B", email: "b@x.com", mobile: "0400000002",
    postcode: "2000", services: ["payment"],
  });
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe("leads query", () => {
  it("paginates with totalCount", async () => {
    const res = await resolvers.Query.leads({}, { limit: 1, offset: 0 }, ctx());
    expect(res.items).toHaveLength(1);
    expect(res.totalCount).toBe(2);
  });

  it("filters by service code", async () => {
    const res = await resolvers.Query.leads(
      {}, { service: "payment" }, ctx()
    );
    expect(res.items).toHaveLength(1);
    expect(res.items[0].email).toBe("b@x.com");
  });
});
