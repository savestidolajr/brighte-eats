# Brighte Eats — Design Spec

**Date:** 2026-05-20
**Status:** Approved (design); pending implementation plan

Take-home: collect expressions of interest for "Brighte Eats" and view leads in a
dashboard. Customers express interest in one or more services. Initial service types:
`delivery`, `pick-up`, `payment`. Service types may change over time.

## Goal of this build

Plan first, then build the full working end-to-end app in this repo. Frontend runs
against the real GraphQL API (no mocked data in the dashboard).

## Stack (all TypeScript)

| Layer | Choice | Why |
|-------|--------|-----|
| DB | PostgreSQL (docker-compose) | Relational, real migration story, indexing, production-realistic |
| ORM / migrations | Prisma | Type-safe, first-class migrations + seed, fast to build |
| GraphQL server | Apollo Server (Node) | Mature, simple, good error/extensions model |
| Frontend | React + Vite | Fast dev loop, ubiquitous, easy to reason about |
| GraphQL client | Apollo Client | Cache, loading/error states, optimistic option |
| Validation | zod (both sides) | One schema style client + server |
| Tests | Vitest | Same runner both packages |

Node runs locally; Postgres in Docker. Fastest dev loop while still satisfying
"docker-compose up" for the DB dependency.

## Repo layout (monorepo)

```
brighte-eats/
  docker-compose.yml      # postgres only
  .env.example
  README.md
  package.json            # root scripts orchestrate server + web
  docs/superpowers/specs/ # this spec
  server/
    prisma/schema.prisma
    prisma/migrations/
    prisma/seed.ts
    src/index.ts          # Apollo bootstrap
    src/schema.ts         # typeDefs
    src/resolvers/        # Query, Mutation, field resolvers
    src/context.ts        # PrismaClient + per-request DataLoaders
    src/loaders.ts        # DataLoader: services-by-leadId
    src/validation.ts     # zod schemas
    src/rateLimit.ts      # stretch goal
    src/__tests__/
  web/
    src/apollo.ts
    src/graphql/          # operations (queries/mutations)
    src/components/       # RegistrationForm, LeadsDashboard, LeadDetail
    src/__tests__/
```

## Data model

Service reference table + join table (chosen over enum / JSON for change-readiness).

- **Lead**: `id` (cuid), `name`, `email` **@unique**, `mobile`, `postcode`,
  `createdAt`, `updatedAt`
- **Service**: `id`, `code` **@unique** (`delivery` | `pick-up` | `payment`),
  `label`, `createdAt` — seeded
- **LeadService**: `leadId`, `serviceId`, `createdAt` — composite PK
  `(leadId, serviceId)`, FK both sides

Indexes: `Lead.email` unique, `Lead.createdAt` (sort), `LeadService.serviceId` (filter).

**Payoff:** a new service type = insert one `Service` row. No schema migration, no code
change. Referential integrity preserved; filtering/indexing straightforward.

Trade-offs vs alternatives:
- **Postgres enum + join**: type-safe at DB, but new value needs `ALTER TYPE` migration
  + redeploy.
- **JSON array column**: simplest, but no referential integrity, weaker
  filtering/indexing, no DB-level validation.

## GraphQL API

```graphql
type Lead {
  id: ID!
  name: String!
  email: String!
  mobile: String!
  postcode: String!
  createdAt: String!
  services: [Service!]!
}

type Service { id: ID! code: String! label: String! }

type LeadConnection {
  items: [Lead!]!
  totalCount: Int!
  limit: Int!
  offset: Int!
}

enum LeadSort { CREATED_AT NAME }
enum SortDir { ASC DESC }

input RegisterInput {
  name: String!
  email: String!
  mobile: String!
  postcode: String!
  services: [String!]!   # service CODES, validated against Service table
}

type Mutation {
  register(input: RegisterInput!): Lead!
}

type Query {
  leads(
    limit: Int = 20
    offset: Int = 0
    service: String           # filter by service code
    sortBy: LeadSort = CREATED_AT
    sortDir: SortDir = DESC
  ): LeadConnection!
  lead(id: ID!): Lead
  services: [Service!]!       # powers the dashboard filter dropdown (change-safe)
}
```

- `register` input `services` are codes; server rejects unknown codes.
- Pagination: limit/offset (per spec) + `totalCount` for UI paging controls.
- **N+1 avoided**: `Lead.services` field resolver uses a per-request DataLoader that
  batches `LeadService` lookups by `leadId`. Listing N leads = 1 query for leads + 1
  batched query for services.

## Validation strategy — client + server

- **Client (zod):** required fields, email format, mobile/postcode shape, ≥1 service.
  Purpose: fast UX feedback, fewer round-trips.
- **Server (zod, authoritative):** same checks **plus** every service code must exist in
  the `Service` table. The server is the contract; the client is convenience. Never
  trust the client.

## Idempotency / correctness

Unique constraint on `Lead.email`. On duplicate register, catch Prisma `P2002` and throw
`GraphQLError` with `extensions.code = 'EMAIL_TAKEN'` (BAD_USER_INPUT class). README
notes an upsert/merge alternative (merge new service interests into the existing lead) as
a deliberate trade-off.

## Frontend

- **RegistrationForm** — submits `register`. States: loading (disable submit), inline
  field validation, server-error banner (maps `extensions.code` → message), success
  confirmation + form reset.
- **LeadsDashboard** — paginated table from `leads`. Service filter dropdown sourced from
  the `services` query (so filter options stay change-safe). States: loading skeleton,
  error banner + retry, empty state. Row click opens detail.
- **LeadDetail** — calls `lead(id)`; shows the lead and their service interests.

Behavior when API slow/errors: loading indicators on every fetch; error banners with a
retry action; the dashboard never shows mocked data.

## Stretch goal — rate-limiting on `register`

In-memory fixed-window limiter keyed by client IP (e.g. 5 requests/min). Over limit →
`GraphQLError` with `extensions.code = 'TOO_MANY_REQUESTS'`. README notes: in-memory is
per-instance; use Redis for a shared limiter at multi-instance scale.

## Migrations

Prisma Migrate; migration files committed to git. `seed.ts` seeds the three services.
Schema evolution = a new migration. Examples called out in README:
- Adding a service type → insert a `Service` row (no migration needed).
- Making a required field optional (e.g. mobile) → migration making the column nullable.

## Tests (Vitest, ~5 well-chosen)

Server:
1. `register` happy path returns a lead with its services.
2. Duplicate email → `EMAIL_TAKEN` error.
3. Unknown service code → validation error (proves codes are checked against DB; and that
   adding a service is data, not code).

Frontend:
4. RegistrationForm shows an error when the API returns a failure.
5. RegistrationForm blocks submit on invalid input (validation feedback).

Maps directly to the exercise's suggested test candidates.

## Run instructions

```
cp .env.example .env
docker-compose up -d          # postgres
npm install                   # root (workspaces) installs server + web
npm run db:migrate            # prisma migrate
npm run db:seed               # seed services
npm run dev                   # server + web concurrently
```

`.env.example` keys: `DATABASE_URL`, `PORT`, `VITE_GRAPHQL_URL`, rate-limit settings. No
secrets in git.

## What I'd change at 10× scale

- Connection pooling (PgBouncer), read replicas.
- Cursor-based pagination instead of offset (offset degrades on deep pages).
- Redis for a shared rate-limiter and query/result caching.
- Search/filter indexes; possibly full-text search on name/email.
- Observability (structured logs, tracing, metrics) and a queue to absorb register spikes.
- DataLoader already mitigates N+1; add cached service lookups.

## README sections (their template)

How to run · Why I chose [DB/framework/frontend] · Data modelling trade-offs · Validation
strategy (client vs server) · Idempotency approach · What I'd change at 10× scale · TODOs
/ known gaps · AI Assistance.

## Build order

1. Scaffold monorepo + docker-compose + .env.example + root scripts.
2. Server: Prisma schema + initial migration + seed.
3. Server: Apollo bootstrap + typeDefs + resolvers + context + DataLoader + zod
   validation + rate-limit.
4. Server tests.
5. Frontend: Vite + React + Apollo Client setup.
6. Frontend: RegistrationForm + LeadsDashboard + LeadDetail.
7. Frontend tests.
8. README + design notes; incremental commits throughout.

## Known gaps / TODOs (intentional, timeboxed)

- Auth/admin boundary on the dashboard not built (stretch was rate-limiting).
- Rate limiter is in-memory (single instance) by design.
- Offset pagination, not cursor.
