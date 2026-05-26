import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma, resetDb, seedServices } from "./testDb.js";
import { resolvers, registerLead } from "../resolvers.js";
import { buildContext } from "../context.js";

const admin = () => buildContext(prisma, "ip", true);
const anon = () => buildContext(prisma, "ip", false);

beforeEach(async () => {
  await resetDb();
  await seedServices();
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe("service catalog management", () => {
  it("creates a new service (admin)", async () => {
    const svc = await resolvers.Mutation.createService(
      {}, { code: "installation", label: "Installation" }, admin()
    );
    expect(svc.code).toBe("installation");
    expect(svc.active).toBe(true);
    const all = await prisma.service.count();
    expect(all).toBe(4);
  });

  it("rejects createService for a non-admin", async () => {
    await expect(
      resolvers.Mutation.createService({}, { code: "x", label: "X" }, anon())
    ).rejects.toMatchObject({ extensions: { code: "UNAUTHENTICATED" } });
  });

  it("rejects a duplicate service code", async () => {
    await expect(
      resolvers.Mutation.createService(
        {}, { code: "delivery", label: "Delivery again" }, admin()
      )
    ).rejects.toMatchObject({ extensions: { code: "CODE_TAKEN" } });
  });

  it("updates a service label", async () => {
    const svc = await resolvers.Mutation.updateService(
      {}, { code: "delivery", label: "Home Delivery" }, admin()
    );
    expect(svc.label).toBe("Home Delivery");
  });

  it("retiring a service hides it from the public services query but keeps it in allServices", async () => {
    await resolvers.Mutation.setServiceActive(
      {}, { code: "payment", active: false }, admin()
    );
    const publicList = await resolvers.Query.services({}, {}, anon());
    expect(publicList.map((s) => s.code)).not.toContain("payment");
    const adminList = await resolvers.Query.allServices({}, {}, admin());
    expect(adminList.map((s) => s.code)).toContain("payment");
  });

  it("register rejects a retired service code", async () => {
    await resolvers.Mutation.setServiceActive(
      {}, { code: "payment", active: false }, admin()
    );
    await expect(
      registerLead(prisma, {
        name: "Z", email: "z@x.com", mobile: "0400000000",
        postcode: "2000", suburb: "Sydney", services: ["payment"],
      })
    ).rejects.toMatchObject({ extensions: { code: "SERVICE_UNAVAILABLE" } });
  });

  it("rejects updateService for a non-admin", async () => {
    await expect(
      resolvers.Mutation.updateService({}, { code: "delivery", label: "X" }, anon())
    ).rejects.toMatchObject({ extensions: { code: "UNAUTHENTICATED" } });
  });

  it("rejects setServiceActive for a non-admin", async () => {
    await expect(
      resolvers.Mutation.setServiceActive({}, { code: "delivery", active: false }, anon())
    ).rejects.toMatchObject({ extensions: { code: "UNAUTHENTICATED" } });
  });

  it("rejects allServices for a non-admin", async () => {
    await expect(
      resolvers.Query.allServices({}, {}, anon())
    ).rejects.toMatchObject({ extensions: { code: "UNAUTHENTICATED" } });
  });

  it("updateService returns NOT_FOUND for an unknown code", async () => {
    await expect(
      resolvers.Mutation.updateService({}, { code: "nonexistent", label: "X" }, admin())
    ).rejects.toMatchObject({ extensions: { code: "NOT_FOUND" } });
  });

  it("setServiceActive returns NOT_FOUND for an unknown code", async () => {
    await expect(
      resolvers.Mutation.setServiceActive({}, { code: "nonexistent", active: false }, admin())
    ).rejects.toMatchObject({ extensions: { code: "NOT_FOUND" } });
  });

  it("rejects createService with an invalid code format", async () => {
    await expect(
      resolvers.Mutation.createService({}, { code: "HAS SPACES", label: "X" }, admin())
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
  });

  it("rejects createService with an empty label", async () => {
    await expect(
      resolvers.Mutation.createService({}, { code: "valid-code", label: "" }, admin())
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
  });
});
