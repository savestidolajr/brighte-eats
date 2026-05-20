import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isAdminToken } from "../auth.js";

describe("isAdminToken", () => {
  const original = process.env.ADMIN_TOKEN;
  beforeEach(() => {
    process.env.ADMIN_TOKEN = "secret-token";
  });
  afterEach(() => {
    process.env.ADMIN_TOKEN = original;
  });

  it("accepts the correct bearer token", () => {
    expect(isAdminToken("Bearer secret-token")).toBe(true);
  });
  it("rejects a wrong token", () => {
    expect(isAdminToken("Bearer nope")).toBe(false);
  });
  it("rejects a missing Bearer prefix", () => {
    expect(isAdminToken("secret-token")).toBe(false);
  });
  it("rejects when no ADMIN_TOKEN is configured", () => {
    delete process.env.ADMIN_TOKEN;
    expect(isAdminToken("Bearer secret-token")).toBe(false);
  });
});
