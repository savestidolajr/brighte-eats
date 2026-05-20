-- Runs automatically on first Postgres container start (empty data volume).
-- Creates the dedicated test database so `npm test` works after a fresh
-- `docker compose up`. Migrations are applied separately via `migrate:deploy`.
CREATE DATABASE brighte_eats_test;
