# Brighte Eats

Collect expressions of interest for **Brighte Eats** and view leads in a dashboard.
Customers register interest in one or more services (`delivery`, `pick-up`, `payment` —
extensible). A GraphQL API (TypeScript + Apollo Server + Prisma + PostgreSQL) backs a
React + Vite dashboard that runs against the **real** API.

```
brighte-eats/
  server/   # Apollo Server + Prisma + Postgres — register mutation, leads/lead/services queries
  web/      # React + Vite + Apollo Client — registration form + leads dashboard
```

## How to run

**Prereqs:** Docker (for Postgres) and Node 20. The repo pins Node via `.nvmrc`.

```bash
nvm use                      # Node 20 (or install Node 20 another way)
cp .env.example server/.env  # server reads server/.env (DATABASE_URL etc.)
# The leads dashboard requires the admin token. The default in .env.example is
# "dev-admin-token". Enter it in the "Unlock dashboard" gate in the web app.
npm install                  # root npm workspaces installs server + web

npm run db:up                # start Postgres (docker compose)
npm run db:migrate           # apply Prisma migrations
npm run db:seed              # seed the three service types

npm run dev                  # server on :4000 + web (Vite) concurrently
```

- GraphQL API + Apollo Sandbox: http://localhost:4000/
- Web app: the URL Vite prints (typically http://localhost:5173/)

The web app defaults to `http://localhost:4000/` for the API. To point it elsewhere,
create `web/.env` with `VITE_GRAPHQL_URL=...` (Vite reads env from the `web/` directory).

### Tests

Server tests run against a **separate** database (`brighte_eats_test`) so they never
touch your dev data. On a fresh `docker compose up` the test DB is created automatically
(via `server/docker/initdb`); apply migrations to it, then run the suite:

```bash
DATABASE_URL="postgresql://brighte:brighte@localhost:5432/brighte_eats_test?schema=public" \
  npm --workspace server run migrate:deploy

npm test                     # server (Vitest) + web (Vitest + Testing Library)
```

> If your Postgres volume already existed before this change, the auto-create won't have
> run — create the DB once with:
> `docker exec -i "$(docker compose ps -q db)" psql -U brighte -d postgres -c "CREATE DATABASE brighte_eats_test;"`

- Server: validation, register (happy path / duplicate / unknown + duplicate service code),
  leads pagination + filter, rate limiter — 13 tests.
- Web: registration form surfaces an API error, and blocks submit on invalid input — 2 tests.

## Why I chose [database / framework / frontend library]

- **PostgreSQL** — relational fit for leads ↔ services (many-to-many), real constraints
  (unique email), indexing, and a credible migration story.
- **Prisma** — type-safe queries, first-class migrations + seed, fast to build, and
  generated types keep the resolver layer honest.
- **Apollo Server (standalone)** — mature, minimal setup, clean typed error `extensions`.
- **React + Vite** — fast dev loop, ubiquitous, easy to reason about.
- **Apollo Client** — built-in loading/error state, a normalized cache that dedupes the
  shared `services` query, and simple `refetch` for retry.

## Data modelling trade-offs

Service types are a **reference table** (`Service`) plus a **join table** (`LeadService`),
not an enum or a JSON column.

- **Reference + join (chosen):** a new service type is one inserted row — no migration, no
  redeploy. Referential integrity is enforced, and filtering/indexing is straightforward.
- **Postgres enum:** type-safe at the DB, but adding a value needs an `ALTER TYPE`
  migration plus a redeploy — exactly the change the brief warns will happen.
- **JSON array column:** simplest to write, but no referential integrity, weaker
  filtering/indexing, and no DB-level validation of values.

This directly answers "service types may change over time": adding a type is data, not code.

## Validation strategy — client vs server

**Both.** The client (zod, `web/src/validation.ts`) gives instant feedback and avoids
round-trips. The server (zod, `server/src/validation.ts`) is **authoritative** and does
the one check the client cannot trust: every submitted service **code must exist** in the
`Service` table. The client is convenience; the server is the contract. We never trust
client input.

## Idempotency approach

`Lead.email` is `@unique`. A duplicate registration is caught from Prisma error `P2002`
and surfaced as a typed `GraphQLError` with `extensions.code = "EMAIL_TAKEN"`. Duplicate
service codes in a single request are de-duplicated before insert so they cannot violate
the `(leadId, serviceId)` composite key. Alternative considered: **upsert/merge** new
service interests into the existing lead — rejected for predictability, but it's the
natural next step if "re-registering updates your interests" becomes a requirement.

## Admin boundary (stretch)

Registration (`register` mutation) and service listing (`services` query) are **public** —
the sign-up form needs them with no credentials. The `leads` and `lead` queries expose PII
and are **admin-only**.

Enforcement is **server-side**: both resolvers call `requireAdmin(ctx)` before touching
the database. If the request does not carry `Authorization: Bearer <ADMIN_TOKEN>` matching
the server's `ADMIN_TOKEN` env var, a `UNAUTHENTICATED` GraphQL error is returned
regardless of what the frontend does.

The frontend complements this with a simple UX gate (`AdminGate` component): the dashboard
tab prompts for the token if none is stored. On entry the token is saved to `localStorage`
and an Apollo auth link attaches it as `Authorization: Bearer …` to every GraphQL request.
"Log out" removes the token and clears the Apollo cache so no PII lingers in memory.

This is a **deliberate lightweight choice** — a single shared secret is far simpler than
full user/JWT auth and appropriate for an internal prototype. At scale, replace with real
auth (e.g. Auth0 / Cognito), per-user JWTs, role-based access control, and token rotation.

## What I'd change at 10× scale

- **Connection pooling** (PgBouncer) and **read replicas** for the read-heavy dashboard.
- **Cursor-based pagination** instead of limit/offset (offset degrades on deep pages).
- **Redis** for a shared rate limiter (the current one is in-memory / per-instance) and
  for caching the `services` lookup.
- **Indexes / full-text search** on name + email as the leads table grows.
- **Observability** — structured logs, tracing, metrics — and a **queue** to absorb
  `register` spikes.
- N+1 is already handled: `Lead.services` is batched with a per-request **DataLoader**, so
  listing N leads is 1 query for leads + 1 batched query for their services.

## TODOs / known gaps

- The dashboard now has a shared-token admin boundary (see "Admin boundary" above), but it
  is a single shared secret — there are no per-user accounts, roles, or token rotation.
- Rate limiter is **in-memory**, so limits are per-process — fine for one instance only.
- **Offset** pagination, not cursor.
- No GraphQL code generation — the web TS types and operations are hand-written and kept
  in sync with the schema manually.
- Run the server with `NODE_ENV=production` in real deployments so Apollo omits error
  stack traces from responses (they're shown in dev for debugging).
- `npm audit` reports a few moderate advisories in dev-only tooling (Vite transitive
  deps); not in the runtime path.

## AI Assistance

- **Where AI helped:** scaffolding the monorepo, the Prisma schema, resolver boilerplate,
  the Vite/Apollo setup, and the test skeletons — then a multi-agent review pass over each
  unit (spec-compliance + code-quality).
- **What I verified / changed:** confirmed the DataLoader actually batches (no N+1) via a
  live query; de-duplicated service codes after review found a path that crashed with a
  misleading error; unified the `leads` sort-direction default to match the schema;
  cleared the stale Apollo mutation error on resubmit; added loading/error handling to the
  `services` query; made the test DB connection independent of module-load ordering; set
  `tsc --noEmit` on the web build so type-checking stops emitting stray JS into `src`.
- **Limitations encountered:** AI output needed adjusting for ESM `.js` import specifiers,
  for test-database isolation/env loading (added `dotenv` for Vitest), and for Vite's
  `import.meta.env` types (`vite/client`). Every change here was run and verified, not
  taken on faith.
