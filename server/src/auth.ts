import { GraphQLError } from "graphql";
import { timingSafeEqual } from "node:crypto";
import type { Context } from "./context.js";

// True if the Authorization header carries the configured admin bearer token.
// Timing-safe comparison; returns false if no ADMIN_TOKEN is configured.
export function isAdminToken(authHeader: string): boolean {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;
  const prefix = "Bearer ";
  if (!authHeader.startsWith(prefix)) return false;
  const provided = Buffer.from(authHeader.slice(prefix.length));
  const expected = Buffer.from(token);
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}

// Throws UNAUTHENTICATED unless the request is an authenticated admin.
export function requireAdmin(ctx: Context): void {
  if (!ctx.isAdmin) {
    throw new GraphQLError("Admin access required", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }
}
