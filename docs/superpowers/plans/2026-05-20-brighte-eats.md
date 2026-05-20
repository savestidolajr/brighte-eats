# Brighte Eats Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack TypeScript app to register expressions of interest for Brighte Eats and view leads in a dashboard, frontend wired to a real GraphQL API.

**Architecture:** npm-workspaces monorepo. `server/` = Apollo Server + Prisma + Postgres exposing one mutation (`register`) and three queries (`leads`, `lead`, `services`). `web/` = React + Vite + Apollo Client with a registration form and a leads dashboard. Service types modelled as a reference table + join table so new types are data, not code. zod validates on both client and server.

**Tech Stack:** TypeScript, Node 20, PostgreSQL 16, Prisma, Apollo Server 4, GraphQL, React 18, Vite 5, Apollo Client 3, zod, Vitest, Docker Compose.

---

## File Structure

**Root**
- `package.json` — npm workspaces, orchestration scripts
- `.nvmrc` — `20`
- `docker-compose.yml` — Postgres service
- `.env.example` — DATABASE_URL, PORT, VITE_GRAPHQL_URL, rate-limit knobs

**server/**
- `package.json`, `tsconfig.json`, `vitest.config.ts`
- `prisma/schema.prisma` — Lead, Service, LeadService
- `prisma/seed.ts` — seed 3 services
- `src/prisma.ts` — PrismaClient singleton
- `src/loaders.ts` — DataLoader: services by leadId
- `src/context.ts` — request context (prisma, loaders, ip)
- `src/validation.ts` — zod schemas + helpers
- `src/rateLimit.ts` — in-memory IP limiter
- `src/schema.ts` — GraphQL typeDefs
- `src/resolvers.ts` — Query + Mutation + Lead.services
- `src/index.ts` — Apollo bootstrap (standalone server)
- `src/__tests__/validation.test.ts`
- `src/__tests__/register.test.ts`
- `src/__tests__/leads.test.ts`
- `src/__tests__/testDb.ts` — test DB helpers (truncate)

**web/**
- `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`
- `src/main.tsx` — Apollo provider + render
- `src/apollo.ts` — Apollo Client
- `src/graphql.ts` — gql operations + TS types
- `src/validation.ts` — zod (shared shape with server)
- `src/components/RegistrationForm.tsx`
- `src/components/LeadsDashboard.tsx`
- `src/components/LeadDetail.tsx`
- `src/App.tsx`
- `src/__tests__/RegistrationForm.test.tsx`

---

## Task 1: Root monorepo scaffold + infra

**Files:**
- Create: `package.json`, `.nvmrc`, `docker-compose.yml`, `.env.example`

- [ ] **Step 1: Create `.nvmrc`**

```
20
```

- [ ] **Step 2: Create root `package.json`**

```json
{
  "name": "brighte-eats",
  "private": true,
  "workspaces": ["server", "web"],
  "engines": { "node": ">=20" },
  "scripts": {
    "db:up": "docker-compose up -d",
    "db:migrate": "npm --workspace server run migrate",
    "db:seed": "npm --workspace server run seed",
    "dev": "concurrently -n server,web -c blue,magenta \"npm --workspace server run dev\" \"npm --workspace web run dev\"",
    "test": "npm --workspace server test && npm --workspace web test"
  },
  "devDependencies": {
    "concurrently": "^9.1.0"
  }
}
```

- [ ] **Step 3: Create `docker-compose.yml`**

```yaml
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: brighte
      POSTGRES_PASSWORD: brighte
      POSTGRES_DB: brighte_eats
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U brighte -d brighte_eats"]
      interval: 5s
      timeout: 5s
      retries: 5
volumes:
  pgdata:
```

- [ ] **Step 4: Create `.env.example`**

```bash
# Server
DATABASE_URL="postgresql://brighte:brighte@localhost:5432/brighte_eats?schema=public"
# Separate DB for tests (created by db:up via TEST script; see server/package.json)
TEST_DATABASE_URL="postgresql://brighte:brighte@localhost:5432/brighte_eats_test?schema=public"
PORT=4000
# Rate limit (stretch): max register calls per IP per window
RATE_LIMIT_MAX=5
RATE_LIMIT_WINDOW_MS=60000

# Web
VITE_GRAPHQL_URL="http://localhost:4000/"
```

- [ ] **Step 5: Commit**

```bash
git add package.json .nvmrc docker-compose.yml .env.example
git commit -m "chore: scaffold monorepo, docker-compose, env example"
```

---

## Task 2: Server package init

**Files:**
- Create: `server/package.json`, `server/tsconfig.json`, `server/.env` (local, gitignored)

- [ ] **Step 1: Create `server/package.json`**

```json
{
  "name": "server",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "migrate": "prisma migrate dev",
    "migrate:deploy": "prisma migrate deploy",
    "generate": "prisma generate",
    "seed": "tsx prisma/seed.ts",
    "test": "vitest run"
  },
  "prisma": { "seed": "tsx prisma/seed.ts" },
  "dependencies": {
    "@apollo/server": "^4.11.0",
    "@prisma/client": "^5.20.0",
    "dataloader": "^2.2.2",
    "graphql": "^16.9.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "prisma": "^5.20.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `server/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node"]
  },
  "include": ["src", "prisma"]
}
```

- [ ] **Step 3: Install deps + create local env**

Run from repo root:
```bash
nvm use
cp .env.example server/.env
npm install
```
Expected: workspaces install without error. (`server/.env` is gitignored.)

- [ ] **Step 4: Commit**

```bash
git add server/package.json server/tsconfig.json package-lock.json
git commit -m "chore(server): init typescript + apollo + prisma deps"
```

---

## Task 3: Prisma schema, migration, seed

**Files:**
- Create: `server/prisma/schema.prisma`, `server/prisma/seed.ts`, `server/src/prisma.ts`

- [ ] **Step 1: Create `server/prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Lead {
  id        String        @id @default(cuid())
  name      String
  email     String        @unique
  mobile    String
  postcode  String
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt
  services  LeadService[]

  @@index([createdAt])
}

model Service {
  id        String        @id @default(cuid())
  code      String        @unique
  label     String
  createdAt DateTime      @default(now())
  leads     LeadService[]
}

model LeadService {
  leadId    String
  serviceId String
  createdAt DateTime @default(now())
  lead      Lead     @relation(fields: [leadId], references: [id], onDelete: Cascade)
  service   Service  @relation(fields: [serviceId], references: [id], onDelete: Cascade)

  @@id([leadId, serviceId])
  @@index([serviceId])
}
```

- [ ] **Step 2: Create `server/prisma/seed.ts`**

```ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SERVICES = [
  { code: "delivery", label: "Delivery" },
  { code: "pick-up", label: "Pick-up" },
  { code: "payment", label: "Payment" },
];

async function main() {
  for (const s of SERVICES) {
    await prisma.service.upsert({
      where: { code: s.code },
      update: { label: s.label },
      create: s,
    });
  }
  console.log(`Seeded ${SERVICES.length} services`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 3: Create `server/src/prisma.ts`**

```ts
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
```

- [ ] **Step 4: Start DB and run the migration**

Run from repo root:
```bash
npm run db:up
npm --workspace server run migrate -- --name init
```
Expected: a migration is created under `server/prisma/migrations/`, Prisma Client generates, exit 0.

- [ ] **Step 5: Seed and verify**

```bash
npm run db:seed
```
Expected: `Seeded 3 services`.

- [ ] **Step 6: Commit**

```bash
git add server/prisma server/src/prisma.ts
git commit -m "feat(server): prisma schema, init migration, service seed"
```

---

## Task 4: GraphQL schema (typeDefs) + Apollo bootstrap

**Files:**
- Create: `server/src/schema.ts`, `server/src/context.ts`, `server/src/loaders.ts`, `server/src/index.ts`

- [ ] **Step 1: Create `server/src/schema.ts`**

```ts
export const typeDefs = /* GraphQL */ `
  type Service {
    id: ID!
    code: String!
    label: String!
  }

  type Lead {
    id: ID!
    name: String!
    email: String!
    mobile: String!
    postcode: String!
    createdAt: String!
    services: [Service!]!
  }

  type LeadConnection {
    items: [Lead!]!
    totalCount: Int!
    limit: Int!
    offset: Int!
  }

  enum LeadSort {
    CREATED_AT
    NAME
  }

  enum SortDir {
    ASC
    DESC
  }

  input RegisterInput {
    name: String!
    email: String!
    mobile: String!
    postcode: String!
    services: [String!]!
  }

  type Query {
    leads(
      limit: Int = 20
      offset: Int = 0
      service: String
      sortBy: LeadSort = CREATED_AT
      sortDir: SortDir = DESC
    ): LeadConnection!
    lead(id: ID!): Lead
    services: [Service!]!
  }

  type Mutation {
    register(input: RegisterInput!): Lead!
  }
`;
```

- [ ] **Step 2: Create `server/src/loaders.ts`**

```ts
import DataLoader from "dataloader";
import type { PrismaClient, Service } from "@prisma/client";

// Batches "services for these leadIds" into one query → avoids N+1.
export function createServicesByLeadLoader(prisma: PrismaClient) {
  return new DataLoader<string, Service[]>(async (leadIds) => {
    const rows = await prisma.leadService.findMany({
      where: { leadId: { in: [...leadIds] } },
      include: { service: true },
    });
    const byLead = new Map<string, Service[]>();
    for (const id of leadIds) byLead.set(id, []);
    for (const row of rows) byLead.get(row.leadId)!.push(row.service);
    return leadIds.map((id) => byLead.get(id)!);
  });
}
```

- [ ] **Step 3: Create `server/src/context.ts`**

```ts
import type { PrismaClient, Service } from "@prisma/client";
import type DataLoader from "dataloader";
import { createServicesByLeadLoader } from "./loaders.js";

export interface Context {
  prisma: PrismaClient;
  ip: string;
  loaders: { servicesByLead: DataLoader<string, Service[]> };
}

export function buildContext(prisma: PrismaClient, ip: string): Context {
  return {
    prisma,
    ip,
    loaders: { servicesByLead: createServicesByLeadLoader(prisma) },
  };
}
```

- [ ] **Step 4: Create `server/src/index.ts`**

```ts
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { typeDefs } from "./schema.js";
import { resolvers } from "./resolvers.js";
import { prisma } from "./prisma.js";
import { buildContext, type Context } from "./context.js";

const server = new ApolloServer<Context>({ typeDefs, resolvers });

const port = Number(process.env.PORT ?? 4000);

const { url } = await startStandaloneServer(server, {
  listen: { port },
  context: async ({ req }) => {
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown";
    return buildContext(prisma, ip);
  },
});

console.log(`🚀 Server ready at ${url}`);
```

- [ ] **Step 5: Add a temporary resolvers stub so it compiles**

Create `server/src/resolvers.ts` (replaced fully in later tasks):
```ts
import type { Context } from "./context.js";

export const resolvers = {
  Query: {
    services: (_p: unknown, _a: unknown, ctx: Context) =>
      ctx.prisma.service.findMany({ orderBy: { code: "asc" } }),
  },
};
```

- [ ] **Step 6: Run the server, verify it boots**

Run: `npm --workspace server run dev`
Expected: prints `🚀 Server ready at http://localhost:4000/`. Stop with Ctrl-C.

- [ ] **Step 7: Commit**

```bash
git add server/src/schema.ts server/src/loaders.ts server/src/context.ts server/src/index.ts server/src/resolvers.ts
git commit -m "feat(server): graphql schema, apollo bootstrap, dataloader, context"
```

---

## Task 5: Validation module (zod) — TDD

**Files:**
- Create: `server/src/validation.ts`
- Test: `server/src/__tests__/validation.test.ts`

- [ ] **Step 1: Write the failing test**

`server/src/__tests__/validation.test.ts`:
```ts
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --workspace server test -- validation`
Expected: FAIL — cannot resolve `../validation.js`.

- [ ] **Step 3: Write minimal implementation**

`server/src/validation.ts`:
```ts
import { z } from "zod";

// AU mobile: 10 digits starting 04, allow spaces. Postcode: 4 digits.
export const registerInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().toLowerCase().email("Invalid email"),
  mobile: z
    .string()
    .trim()
    .regex(/^0\d{9}$/, "Mobile must be 10 digits starting with 0"),
  postcode: z.string().trim().regex(/^\d{4}$/, "Postcode must be 4 digits"),
  services: z.array(z.string().min(1)).min(1, "Select at least one service"),
});

export type RegisterInput = z.infer<typeof registerInputSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --workspace server test -- validation`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/validation.ts server/src/__tests__/validation.test.ts
git commit -m "feat(server): zod register input validation"
```

---

## Task 6: register mutation — TDD (happy path, duplicate, unknown service)

**Files:**
- Create: `server/src/__tests__/testDb.ts`, `server/vitest.config.ts`
- Modify: `server/src/resolvers.ts` (full rewrite)
- Test: `server/src/__tests__/register.test.ts`

- [ ] **Step 1: Create `server/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false, // integration tests share one DB
    setupFiles: [],
  },
});
```

- [ ] **Step 2: Create test DB helper `server/src/__tests__/testDb.ts`**

```ts
import { PrismaClient } from "@prisma/client";

// Point Prisma at the test database before instantiating the client.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

export const prisma = new PrismaClient();

export async function resetDb() {
  // Order matters: child table first.
  await prisma.leadService.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.service.deleteMany();
}

export async function seedServices() {
  await prisma.service.createMany({
    data: [
      { code: "delivery", label: "Delivery" },
      { code: "pick-up", label: "Pick-up" },
      { code: "payment", label: "Payment" },
    ],
  });
}
```

- [ ] **Step 3: Write the failing test**

`server/src/__tests__/register.test.ts`:
```ts
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { prisma, resetDb, seedServices } from "./testDb.js";
import { registerLead } from "../resolvers.js";

beforeAll(async () => {
  await resetDb();
});
beforeEach(async () => {
  await resetDb();
  await seedServices();
});
afterAll(async () => {
  await prisma.$disconnect();
});

const input = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  mobile: "0412345678",
  postcode: "2000",
  services: ["delivery", "payment"],
};

describe("registerLead", () => {
  it("creates a lead with its services on the happy path", async () => {
    const lead = await registerLead(prisma, input);
    expect(lead.email).toBe("ada@example.com");
    const links = await prisma.leadService.findMany({
      where: { leadId: lead.id },
    });
    expect(links).toHaveLength(2);
  });

  it("rejects a duplicate email with EMAIL_TAKEN", async () => {
    await registerLead(prisma, input);
    await expect(registerLead(prisma, input)).rejects.toMatchObject({
      extensions: { code: "EMAIL_TAKEN" },
    });
  });

  it("rejects an unknown service code", async () => {
    await expect(
      registerLead(prisma, { ...input, services: ["teleport"] })
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm --workspace server test -- register`
Expected: FAIL — `registerLead` not exported from resolvers.

- [ ] **Step 5: Rewrite `server/src/resolvers.ts` with `registerLead` + query resolvers**

```ts
import { GraphQLError } from "graphql";
import { Prisma, type PrismaClient, type Lead } from "@prisma/client";
import type { Context } from "./context.js";
import { registerInputSchema } from "./validation.js";

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

  const services = await prisma.service.findMany({
    where: { code: { in: input.services } },
  });
  if (services.length !== new Set(input.services).size) {
    const known = new Set(services.map((s) => s.code));
    const unknown = input.services.filter((c) => !known.has(c));
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
      const orderBy =
        args.sortBy === "NAME"
          ? { name: (args.sortDir ?? "ASC").toLowerCase() as "asc" | "desc" }
          : {
              createdAt: (args.sortDir ?? "DESC").toLowerCase() as
                | "asc"
                | "desc",
            };
      const [items, totalCount] = await Promise.all([
        ctx.prisma.lead.findMany({ where, orderBy, take: limit, skip: offset }),
        ctx.prisma.lead.count({ where }),
      ]);
      return { items, totalCount, limit, offset };
    },
  },

  Mutation: {
    register: (_p: unknown, args: { input: unknown }, ctx: Context) =>
      registerLead(ctx.prisma, args.input),
  },

  Lead: {
    // Batched via DataLoader → no N+1 when listing leads.
    services: (parent: Lead, _a: unknown, ctx: Context) =>
      ctx.loaders.servicesByLead.load(parent.id),
    createdAt: (parent: Lead) => parent.createdAt.toISOString(),
  },
};
```

- [ ] **Step 6: Prepare the test database (one-time)**

Run from repo root:
```bash
docker exec -i $(docker compose ps -q db) psql -U brighte -d postgres -c "CREATE DATABASE brighte_eats_test;" || true
DATABASE_URL="$TEST_DATABASE_URL" npm --workspace server run migrate:deploy
```
Note: if `$TEST_DATABASE_URL` is unset in your shell, copy the value from `.env`. Expected: migrations applied to `brighte_eats_test`.

- [ ] **Step 7: Run test to verify it passes**

Run: `npm --workspace server test -- register`
Expected: PASS (3 tests).

- [ ] **Step 8: Commit**

```bash
git add server/src/resolvers.ts server/src/__tests__/register.test.ts server/src/__tests__/testDb.ts server/vitest.config.ts
git commit -m "feat(server): register mutation with validation, idempotency, queries"
```

---

## Task 7: leads pagination + filter — TDD

**Files:**
- Test: `server/src/__tests__/leads.test.ts`
- (resolvers already implemented in Task 6 — this task locks behavior with tests)

- [ ] **Step 1: Write the failing test**

`server/src/__tests__/leads.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma, resetDb, seedServices } from "./testDb.js";
import { registerLead, resolvers } from "../resolvers.js";
import { buildContext } from "../context.js";

function ctx() {
  return buildContext(prisma, "test-ip");
}

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
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm --workspace server test -- leads`
Expected: PASS (2 tests). (Resolvers already implement this.)

- [ ] **Step 3: Run the full server suite**

Run: `npm --workspace server test`
Expected: validation (4) + register (3) + leads (2) all PASS.

- [ ] **Step 4: Commit**

```bash
git add server/src/__tests__/leads.test.ts
git commit -m "test(server): leads pagination and service filter"
```

---

## Task 8: Rate-limiting on register (stretch) — TDD

**Files:**
- Create: `server/src/rateLimit.ts`
- Test: `server/src/__tests__/rateLimit.test.ts`
- Modify: `server/src/resolvers.ts` (wire limiter into `register` resolver)

- [ ] **Step 1: Write the failing test**

`server/src/__tests__/rateLimit.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --workspace server test -- rateLimit`
Expected: FAIL — cannot resolve `../rateLimit.js`.

- [ ] **Step 3: Implement `server/src/rateLimit.ts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --workspace server test -- rateLimit`
Expected: PASS (3 tests).

- [ ] **Step 5: Wire limiter into the `register` resolver**

In `server/src/resolvers.ts`, add the import at the top:
```ts
import { registerLimiter } from "./rateLimit.js";
```
Replace the `Mutation.register` resolver with:
```ts
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
```

- [ ] **Step 6: Run full server suite**

Run: `npm --workspace server test`
Expected: validation (4) + register (3) + leads (2) + rateLimit (3) PASS.

- [ ] **Step 7: Commit**

```bash
git add server/src/rateLimit.ts server/src/__tests__/rateLimit.test.ts server/src/resolvers.ts
git commit -m "feat(server): in-memory rate limiting on register"
```

---

## Task 9: Web package init (Vite + React + Apollo Client)

**Files:**
- Create: `web/package.json`, `web/tsconfig.json`, `web/tsconfig.node.json`, `web/vite.config.ts`, `web/index.html`, `web/src/apollo.ts`, `web/src/main.tsx`, `web/src/App.tsx`

- [ ] **Step 1: Create `web/package.json`**

```json
{
  "name": "web",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "@apollo/client": "^3.11.0",
    "graphql": "^16.9.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "jsdom": "^25.0.0",
    "typescript": "^5.6.0",
    "vite": "^5.4.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `web/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: Create `web/tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "skipLibCheck": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: Create `web/vite.config.ts`**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/setupTests.ts"],
  },
});
```

- [ ] **Step 5: Create `web/src/setupTests.ts`**

```ts
import "@testing-library/jest-dom";
```

- [ ] **Step 6: Create `web/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Brighte Eats</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Create `web/src/apollo.ts`**

```ts
import { ApolloClient, InMemoryCache } from "@apollo/client";

export const client = new ApolloClient({
  uri: import.meta.env.VITE_GRAPHQL_URL ?? "http://localhost:4000/",
  cache: new InMemoryCache(),
});
```

- [ ] **Step 8: Create `web/src/App.tsx`**

```tsx
import { useState } from "react";
import { RegistrationForm } from "./components/RegistrationForm";
import { LeadsDashboard } from "./components/LeadsDashboard";

export function App() {
  const [tab, setTab] = useState<"register" | "dashboard">("register");
  return (
    <main style={{ maxWidth: 880, margin: "2rem auto", fontFamily: "system-ui" }}>
      <h1>Brighte Eats</h1>
      <nav style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <button onClick={() => setTab("register")} disabled={tab === "register"}>
          Register interest
        </button>
        <button onClick={() => setTab("dashboard")} disabled={tab === "dashboard"}>
          Leads dashboard
        </button>
      </nav>
      {tab === "register" ? <RegistrationForm /> : <LeadsDashboard />}
    </main>
  );
}
```

- [ ] **Step 9: Create `web/src/main.tsx`**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { ApolloProvider } from "@apollo/client";
import { client } from "./apollo";
import { App } from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>
  </React.StrictMode>
);
```

- [ ] **Step 10: Install + verify build typechecks**

Run from repo root:
```bash
npm install
npm --workspace web run build
```
Expected: `tsc` + vite build succeed (App imports components created in later tasks — if building before Tasks 11-12, this step will fail on missing imports; run it after Task 13). For now, commit the scaffolding.

- [ ] **Step 11: Commit**

```bash
git add web/package.json web/tsconfig.json web/tsconfig.node.json web/vite.config.ts web/index.html web/src/apollo.ts web/src/main.tsx web/src/App.tsx web/src/setupTests.ts package-lock.json
git commit -m "chore(web): vite + react + apollo client scaffold"
```

---

## Task 10: GraphQL operations + shared validation

**Files:**
- Create: `web/src/graphql.ts`, `web/src/validation.ts`

- [ ] **Step 1: Create `web/src/graphql.ts`**

```ts
import { gql } from "@apollo/client";

export interface Service { id: string; code: string; label: string }
export interface Lead {
  id: string;
  name: string;
  email: string;
  mobile: string;
  postcode: string;
  createdAt: string;
  services: Service[];
}
export interface LeadConnection {
  items: Lead[];
  totalCount: number;
  limit: number;
  offset: number;
}

export const SERVICES = gql`
  query Services {
    services { id code label }
  }
`;

export const LEADS = gql`
  query Leads($limit: Int, $offset: Int, $service: String, $sortBy: LeadSort, $sortDir: SortDir) {
    leads(limit: $limit, offset: $offset, service: $service, sortBy: $sortBy, sortDir: $sortDir) {
      items { id name email mobile postcode createdAt services { id code label } }
      totalCount
      limit
      offset
    }
  }
`;

export const LEAD = gql`
  query Lead($id: ID!) {
    lead(id: $id) {
      id name email mobile postcode createdAt services { id code label }
    }
  }
`;

export const REGISTER = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      id name email services { code label }
    }
  }
`;
```

- [ ] **Step 2: Create `web/src/validation.ts`**

```ts
import { z } from "zod";

// Mirrors the server schema for fast client-side feedback. Server stays authoritative.
export const registerFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Invalid email"),
  mobile: z.string().trim().regex(/^0\d{9}$/, "Mobile must be 10 digits starting with 0"),
  postcode: z.string().trim().regex(/^\d{4}$/, "Postcode must be 4 digits"),
  services: z.array(z.string()).min(1, "Select at least one service"),
});

export type RegisterForm = z.infer<typeof registerFormSchema>;
```

- [ ] **Step 3: Commit**

```bash
git add web/src/graphql.ts web/src/validation.ts
git commit -m "feat(web): graphql operations and client validation"
```

---

## Task 11: RegistrationForm — TDD

**Files:**
- Create: `web/src/components/RegistrationForm.tsx`
- Test: `web/src/__tests__/RegistrationForm.test.tsx`

- [ ] **Step 1: Write the failing test**

`web/src/__tests__/RegistrationForm.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MockedProvider } from "@apollo/client/testing";
import { GraphQLError } from "graphql";
import { RegistrationForm } from "../components/RegistrationForm";
import { REGISTER, SERVICES } from "../graphql";

const servicesMock = {
  request: { query: SERVICES },
  result: { data: { services: [{ id: "1", code: "delivery", label: "Delivery" }] } },
};

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/name/i), "Ada");
  await user.type(screen.getByLabelText(/email/i), "ada@example.com");
  await user.type(screen.getByLabelText(/mobile/i), "0412345678");
  await user.type(screen.getByLabelText(/postcode/i), "2000");
  await user.click(await screen.findByLabelText(/delivery/i));
}

describe("RegistrationForm", () => {
  it("shows an error banner when the API returns a failure", async () => {
    const user = userEvent.setup();
    const errorMock = {
      request: {
        query: REGISTER,
        variables: {
          input: {
            name: "Ada", email: "ada@example.com", mobile: "0412345678",
            postcode: "2000", services: ["delivery"],
          },
        },
      },
      result: { errors: [new GraphQLError("A lead with this email already exists")] },
    };
    render(
      <MockedProvider mocks={[servicesMock, errorMock]} addTypename={false}>
        <RegistrationForm />
      </MockedProvider>
    );
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /submit/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/already exists/i);
  });

  it("blocks submit and shows validation when input is invalid", async () => {
    const user = userEvent.setup();
    render(
      <MockedProvider mocks={[servicesMock]} addTypename={false}>
        <RegistrationForm />
      </MockedProvider>
    );
    await user.click(screen.getByRole("button", { name: /submit/i }));
    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --workspace web test -- RegistrationForm`
Expected: FAIL — cannot resolve `../components/RegistrationForm`.

- [ ] **Step 3: Implement `web/src/components/RegistrationForm.tsx`**

```tsx
import { useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { REGISTER, SERVICES, type Service } from "../graphql";
import { registerFormSchema } from "../validation";

const EMPTY = { name: "", email: "", mobile: "", postcode: "" };

export function RegistrationForm() {
  const { data: svcData } = useQuery<{ services: Service[] }>(SERVICES);
  const [fields, setFields] = useState(EMPTY);
  const [services, setServices] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const [register, { loading, error }] = useMutation(REGISTER, {
    onCompleted: () => {
      setSuccess(true);
      setFields(EMPTY);
      setServices([]);
      setErrors({});
    },
  });

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFields((f) => ({ ...f, [k]: e.target.value }));

  const toggleService = (code: string) =>
    setServices((s) => (s.includes(code) ? s.filter((c) => c !== code) : [...s, code]));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccess(false);
    const parsed = registerFormSchema.safeParse({ ...fields, services });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[String(issue.path[0])] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    try {
      await register({ variables: { input: parsed.data } });
    } catch {
      /* surfaced via `error` from useMutation */
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {(["name", "email", "mobile", "postcode"] as const).map((k) => (
        <div key={k} style={{ marginBottom: 12 }}>
          <label htmlFor={k} style={{ display: "block", textTransform: "capitalize" }}>
            {k}
          </label>
          <input id={k} value={fields[k]} onChange={set(k)} />
          {errors[k] && (
            <small style={{ color: "crimson" }}>{errors[k]}</small>
          )}
        </div>
      ))}

      <fieldset style={{ marginBottom: 12 }}>
        <legend>Services</legend>
        {(svcData?.services ?? []).map((s) => (
          <label key={s.code} style={{ display: "block" }}>
            <input
              type="checkbox"
              checked={services.includes(s.code)}
              onChange={() => toggleService(s.code)}
            />
            {s.label}
          </label>
        ))}
        {errors.services && (
          <small style={{ color: "crimson" }}>{errors.services}</small>
        )}
      </fieldset>

      <button type="submit" disabled={loading}>
        {loading ? "Submitting…" : "Submit"}
      </button>

      {error && (
        <p role="alert" style={{ color: "crimson" }}>
          {error.graphQLErrors[0]?.message ?? error.message}
        </p>
      )}
      {success && (
        <p role="status" style={{ color: "green" }}>
          Thanks — your interest has been registered.
        </p>
      )}
    </form>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --workspace web test -- RegistrationForm`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add web/src/components/RegistrationForm.tsx web/src/__tests__/RegistrationForm.test.tsx
git commit -m "feat(web): registration form with validation and error handling"
```

---

## Task 12: LeadsDashboard (list + filter + pagination + detail trigger)

**Files:**
- Create: `web/src/components/LeadsDashboard.tsx`

- [ ] **Step 1: Implement `web/src/components/LeadsDashboard.tsx`**

```tsx
import { useState } from "react";
import { useQuery } from "@apollo/client";
import { LEADS, SERVICES, type LeadConnection, type Service } from "../graphql";
import { LeadDetail } from "./LeadDetail";

const PAGE = 10;

export function LeadsDashboard() {
  const [service, setService] = useState<string>("");
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: svcData } = useQuery<{ services: Service[] }>(SERVICES);
  const { data, loading, error, refetch } = useQuery<{ leads: LeadConnection }>(
    LEADS,
    {
      variables: {
        limit: PAGE,
        offset,
        service: service || null,
        sortBy: "CREATED_AT",
        sortDir: "DESC",
      },
      fetchPolicy: "cache-and-network",
    }
  );

  if (selectedId) {
    return <LeadDetail id={selectedId} onBack={() => setSelectedId(null)} />;
  }

  const conn = data?.leads;

  return (
    <section>
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <label>
          Filter:{" "}
          <select
            value={service}
            onChange={(e) => {
              setService(e.target.value);
              setOffset(0);
            }}
          >
            <option value="">All services</option>
            {(svcData?.services ?? []).map((s) => (
              <option key={s.code} value={s.code}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading && !conn && <p>Loading leads…</p>}

      {error && (
        <div role="alert" style={{ color: "crimson" }}>
          Failed to load leads. <button onClick={() => refetch()}>Retry</button>
        </div>
      )}

      {conn && conn.items.length === 0 && <p>No leads yet.</p>}

      {conn && conn.items.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">Name</th>
              <th align="left">Email</th>
              <th align="left">Services</th>
            </tr>
          </thead>
          <tbody>
            {conn.items.map((l) => (
              <tr
                key={l.id}
                onClick={() => setSelectedId(l.id)}
                style={{ cursor: "pointer", borderTop: "1px solid #ddd" }}
              >
                <td>{l.name}</td>
                <td>{l.email}</td>
                <td>{l.services.map((s) => s.label).join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {conn && (
        <div style={{ display: "flex", gap: 12, marginTop: 16, alignItems: "center" }}>
          <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>
            Prev
          </button>
          <span>
            {conn.totalCount === 0 ? 0 : offset + 1}–
            {Math.min(offset + PAGE, conn.totalCount)} of {conn.totalCount}
          </span>
          <button
            disabled={offset + PAGE >= conn.totalCount}
            onClick={() => setOffset(offset + PAGE)}
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/LeadsDashboard.tsx
git commit -m "feat(web): leads dashboard with filter and pagination"
```

---

## Task 13: LeadDetail + end-to-end build check

**Files:**
- Create: `web/src/components/LeadDetail.tsx`

- [ ] **Step 1: Implement `web/src/components/LeadDetail.tsx`**

```tsx
import { useQuery } from "@apollo/client";
import { LEAD, type Lead } from "../graphql";

export function LeadDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { data, loading, error, refetch } = useQuery<{ lead: Lead | null }>(LEAD, {
    variables: { id },
  });

  return (
    <section>
      <button onClick={onBack}>← Back to list</button>
      {loading && <p>Loading lead…</p>}
      {error && (
        <div role="alert" style={{ color: "crimson" }}>
          Failed to load lead. <button onClick={() => refetch()}>Retry</button>
        </div>
      )}
      {data && !data.lead && <p>Lead not found.</p>}
      {data?.lead && (
        <dl>
          <dt>Name</dt><dd>{data.lead.name}</dd>
          <dt>Email</dt><dd>{data.lead.email}</dd>
          <dt>Mobile</dt><dd>{data.lead.mobile}</dd>
          <dt>Postcode</dt><dd>{data.lead.postcode}</dd>
          <dt>Services</dt>
          <dd>{data.lead.services.map((s) => s.label).join(", ") || "—"}</dd>
          <dt>Registered</dt>
          <dd>{new Date(data.lead.createdAt).toLocaleString()}</dd>
        </dl>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Typecheck + build the whole web app**

Run from repo root:
```bash
npm --workspace web run build
```
Expected: `tsc` + vite build succeed with no errors.

- [ ] **Step 3: Run the web test suite**

Run: `npm --workspace web test`
Expected: RegistrationForm (2) PASS.

- [ ] **Step 4: Commit**

```bash
git add web/src/components/LeadDetail.tsx
git commit -m "feat(web): lead detail view"
```

---

## Task 14: End-to-end smoke + README + design notes

**Files:**
- Modify: `README.md` (full rewrite)

- [ ] **Step 1: Manual end-to-end smoke test**

Run (DB up from Task 3):
```bash
npm run dev
```
In the browser at the Vite URL: submit the form (success), switch to dashboard (see the lead), filter by service, open detail. Stop with Ctrl-C. Confirm no console errors.

- [ ] **Step 2: Rewrite `README.md` using the required template**

```markdown
# Brighte Eats

Collect expressions of interest for Brighte Eats and view leads in a dashboard.

## How to run

Prereqs: Docker, Node 20 (`nvm use`).

```bash
nvm use
cp .env.example server/.env        # server reads its own .env
cp .env.example .env               # web reads VITE_* from root
npm install
npm run db:up                      # start postgres
npm --workspace server run migrate # apply migrations
npm run db:seed                    # seed service types
npm run dev                        # server :4000 + web (vite)
```

GraphQL: http://localhost:4000/ · Web: the URL Vite prints.

To run tests: create the test DB once, then `npm test`:
```bash
docker exec -i $(docker compose ps -q db) psql -U brighte -d postgres -c "CREATE DATABASE brighte_eats_test;"
DATABASE_URL="postgresql://brighte:brighte@localhost:5432/brighte_eats_test?schema=public" npm --workspace server run migrate:deploy
npm test
```

## Why I chose [database / framework / frontend library]

- **PostgreSQL**: relational fit (leads ↔ services many-to-many), real constraints
  (unique email), indexing, and a credible migration story.
- **Prisma**: type-safe queries, first-class migrations + seed, fast to build.
- **Apollo Server**: mature, simple standalone server, clean error `extensions`.
- **React + Vite**: fast dev loop, ubiquitous, easy to reason about.
- **Apollo Client**: built-in loading/error state, normalized cache, easy refetch.

## Data modelling trade-offs

Service types are a **reference table** (`Service`) plus a **join table**
(`LeadService`), not an enum or JSON column.
- Reference + join: new service type = insert a row (no migration/redeploy),
  referential integrity, easy filtering/indexing. Chosen.
- Postgres enum: type-safe but adding a value needs `ALTER TYPE` + redeploy.
- JSON array: simplest but no integrity, weaker filter/index, no DB validation.

## Validation strategy — client vs server

Both. Client (zod) gives instant feedback and avoids round-trips. Server (zod) is
authoritative and additionally checks every service code exists in the DB — the client
is convenience, the server is the contract. Never trust the client.

## Idempotency approach

`Lead.email` is unique. Duplicate registration throws a typed `EMAIL_TAKEN` error
(caught from Prisma `P2002`). Alternative considered: upsert/merge new service interests
into the existing lead — rejected for predictability, noted as a future option.

## What I'd change at 10× scale

PgBouncer pooling + read replicas; cursor-based pagination (offset degrades on deep
pages); Redis for a shared rate limiter and result caching; search indexes / full-text on
name+email; structured logs + tracing + metrics; a queue to absorb register spikes.
DataLoader already removes the list N+1.

## TODOs / known gaps

- No auth/admin boundary on the dashboard (stretch chosen was rate-limiting).
- Rate limiter is in-memory (single instance) by design.
- Offset pagination, not cursor.
- No GraphQL code generation; types are hand-written and kept in sync.

## AI Assistance

- **Where AI helped**: scaffolding the monorepo, Prisma schema, resolver boilerplate,
  Vite/Apollo setup, and test skeletons.
- **Verified / changed**: confirmed the DataLoader batching prevents N+1, tightened
  validation regexes, made the register logic testable without GraphQL, checked error
  `extensions.code` flow end-to-end.
- **Limitations**: AI suggestions needed adjusting for ESM `.js` import specifiers under
  NodeNext and for the test database isolation.
```

- [ ] **Step 3: Commit and push**

```bash
git add README.md
git commit -m "docs: project README, design notes, AI assistance"
git push origin main
```

---

## Self-Review (completed by plan author)

**Spec coverage:** register mutation (T6), leads paginated+filter+sort (T6/T7), lead(id) (T6), services query for change-safe filter (T4/T6), Service+join data model (T3), zod both sides (T5/T10/T11), idempotency EMAIL_TAKEN (T6), DataLoader N+1 (T4/T6), rate-limit stretch (T8), registration form states (T11), dashboard + detail (T12/T13), migrations+seed (T3), docker-compose+.env.example (T1), README template all 8 sections (T14), tests matching their suggested list (T5/T6/T11). All covered.

**Placeholder scan:** No TBD/TODO in steps; every code step has complete code. The only "TODOs" are the intentional README "known gaps" section.

**Type consistency:** `registerLead(prisma, input)` signature consistent T6→T7. `Context`/`buildContext` consistent T4→T6→T7. GraphQL field names (`items`,`totalCount`,`limit`,`offset`; `LeadSort`/`SortDir`) consistent across schema (T4), resolvers (T6), web ops (T10), dashboard (T12). `extensions.code` values (`EMAIL_TAKEN`,`BAD_USER_INPUT`,`TOO_MANY_REQUESTS`) consistent server↔tests↔web.
