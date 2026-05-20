import { GraphQLError } from "graphql";
import { Prisma, type PrismaClient, type Lead } from "@prisma/client";
import type { Context } from "./context.js";
import { registerInputSchema } from "./validation.js";
import { registerLimiter } from "./rateLimit.js";

// Core register logic, decoupled from GraphQL args for direct unit testing.
export async function registerLead(
  prisma: PrismaClient,
  rawInput: unknown
): Promise<Lead> {
  const parsed = registerInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new GraphQLError(parsed.error.issues[0].message, {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }
  const input = parsed.data;
  const uniqueCodes = [...new Set(input.services)];

  const services = await prisma.service.findMany({
    where: { code: { in: uniqueCodes } },
  });
  if (services.length !== uniqueCodes.length) {
    const known = new Set(services.map((s) => s.code));
    const unknown = uniqueCodes.filter((c) => !known.has(c));
    throw new GraphQLError(`Unknown service code(s): ${unknown.join(", ")}`, {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }

  try {
    return await prisma.lead.create({
      data: {
        name: input.name,
        email: input.email,
        mobile: input.mobile,
        postcode: input.postcode,
        services: {
          create: services.map((s) => ({ serviceId: s.id })),
        },
      },
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      throw new GraphQLError("A lead with this email already exists", {
        extensions: { code: "EMAIL_TAKEN" },
      });
    }
    throw e;
  }
}

type LeadsArgs = {
  limit?: number;
  offset?: number;
  service?: string | null;
  sortBy?: "CREATED_AT" | "NAME";
  sortDir?: "ASC" | "DESC";
};

export const resolvers = {
  Query: {
    services: (_p: unknown, _a: unknown, ctx: Context) =>
      ctx.prisma.service.findMany({ orderBy: { code: "asc" } }),

    lead: (_p: unknown, args: { id: string }, ctx: Context) =>
      ctx.prisma.lead.findUnique({ where: { id: args.id } }),

    leads: async (_p: unknown, args: LeadsArgs, ctx: Context) => {
      const limit = Math.min(Math.max(args.limit ?? 20, 1), 100);
      const offset = Math.max(args.offset ?? 0, 0);
      const where = args.service
        ? { services: { some: { service: { code: args.service } } } }
        : {};
      const dir = (args.sortDir ?? "DESC").toLowerCase() as "asc" | "desc";
      const orderBy =
        args.sortBy === "NAME" ? { name: dir } : { createdAt: dir };
      const [items, totalCount] = await Promise.all([
        ctx.prisma.lead.findMany({ where, orderBy, take: limit, skip: offset }),
        ctx.prisma.lead.count({ where }),
      ]);
      return { items, totalCount, limit, offset };
    },
  },

  Mutation: {
    register: (_p: unknown, args: { input: unknown }, ctx: Context) => {
      if (!registerLimiter.check(ctx.ip)) {
        throw new GraphQLError("Too many registrations, slow down", {
          extensions: { code: "TOO_MANY_REQUESTS" },
        });
      }
      return registerLead(ctx.prisma, args.input);
    },
  },

  Lead: {
    // Batched via DataLoader → no N+1 when listing leads.
    services: (parent: Lead, _a: unknown, ctx: Context) =>
      ctx.loaders.servicesByLead.load(parent.id),
    createdAt: (parent: Lead) => parent.createdAt.toISOString(),
  },
};
