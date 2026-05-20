// In-memory fixed-window limiter. Per-instance only (see README: use Redis at scale).
export class RateLimiter {
  private hits = new Map<string, { count: number; windowStart: number }>();

  constructor(
    private max: number,
    private windowMs: number,
    private now: () => number = () => Date.now()
  ) {}

  check(key: string): boolean {
    const t = this.now();
    const entry = this.hits.get(key);
    if (!entry || t - entry.windowStart >= this.windowMs) {
      this.hits.set(key, { count: 1, windowStart: t });
      return true;
    }
    if (entry.count >= this.max) return false;
    entry.count += 1;
    return true;
  }
}

export const registerLimiter = new RateLimiter(
  Number(process.env.RATE_LIMIT_MAX ?? 5),
  Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60000)
);
