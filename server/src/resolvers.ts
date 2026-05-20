import type { Context } from "./context.js";

export const resolvers = {
  Query: {
    services: (_p: unknown, _a: unknown, ctx: Context) =>
      ctx.prisma.service.findMany({ orderBy: { code: "asc" } }),
  },
};
