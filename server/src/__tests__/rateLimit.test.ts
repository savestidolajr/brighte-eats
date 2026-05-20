import { describe, it, expect } from "vitest";
import { RateLimiter } from "../rateLimit.js";

describe("RateLimiter", () => {
  it("allows up to max then blocks within the window", () => {
    const rl = new RateLimiter(2, 1000);
    expect(rl.check("ip1")).toBe(true);
    expect(rl.check("ip1")).toBe(true);
    expect(rl.check("ip1")).toBe(false);
  });

  it("tracks ips independently", () => {
    const rl = new RateLimiter(1, 1000);
    expect(rl.check("ip1")).toBe(true);
    expect(rl.check("ip2")).toBe(true);
    expect(rl.check("ip1")).toBe(false);
  });

  it("resets after the window elapses", () => {
    let now = 0;
    const rl = new RateLimiter(1, 1000, () => now);
    expect(rl.check("ip1")).toBe(true);
    expect(rl.check("ip1")).toBe(false);
    now = 1001;
    expect(rl.check("ip1")).toBe(true);
  });
});
