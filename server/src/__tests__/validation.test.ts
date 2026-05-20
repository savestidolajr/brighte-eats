import { describe, it, expect } from "vitest";
import { registerInputSchema } from "../validation.js";

describe("registerInputSchema", () => {
  const valid = {
    name: "Ada Lovelace",
    email: "ada@example.com",
    mobile: "0412345678",
    postcode: "2000",
    services: ["delivery"],
  };

  it("accepts a valid input", () => {
    const r = registerInputSchema.safeParse(valid);
    expect(r.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const r = registerInputSchema.safeParse({ ...valid, email: "nope" });
    expect(r.success).toBe(false);
  });

  it("rejects empty services", () => {
    const r = registerInputSchema.safeParse({ ...valid, services: [] });
    expect(r.success).toBe(false);
  });

  it("rejects a bad postcode", () => {
    const r = registerInputSchema.safeParse({ ...valid, postcode: "12" });
    expect(r.success).toBe(false);
  });

  // Guards the contract: mobile is currently REQUIRED. If a future change makes
  // it optional, this test fails and forces that decision to be deliberate.
  it("rejects a missing mobile (mobile is required today)", () => {
    const { mobile, ...withoutMobile } = valid;
    const r = registerInputSchema.safeParse(withoutMobile);
    expect(r.success).toBe(false);
  });
});
