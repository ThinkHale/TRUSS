/**
 * A real Postgres, in-process, with every migration applied.
 *
 * The schema's promises — one tenant cannot read another's rows, a rep cannot
 * rewrite their own score, an operator cannot read Coach conversations — are
 * made in SQL, so they have to be tested in SQL. PGlite is Postgres compiled to
 * WebAssembly: no Docker, no network, no Supabase project, so the suite runs in
 * CI and on a laptop the same way.
 *
 * Supabase provides a few things the migrations assume and plain Postgres does
 * not: the `auth` schema and `auth.uid()`, the `anon` / `authenticated` /
 * `service_role` roles, pgcrypto in an `extensions` schema, and default grants
 * on public tables. The shim below recreates exactly those, the way Supabase
 * defines them, and nothing more — anything a migration needs beyond this is a
 * real dependency the test should surface.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite, type Transaction } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { vector } from '@electric-sql/pglite-pgvector';

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');

const SUPABASE_SHIM = `
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;

create schema extensions;
create extension pgcrypto schema extensions;
grant usage on schema extensions to anon, authenticated, service_role;

create schema auth;
grant usage on schema auth to anon, authenticated, service_role;

create table auth.users (
  id                  uuid primary key default gen_random_uuid(),
  email               text unique,
  raw_user_meta_data  jsonb not null default '{}'::jsonb,
  email_confirmed_at  timestamptz,
  last_sign_in_at     timestamptz,
  created_at          timestamptz not null default now()
);

-- Supabase's definition: the subject claim of the request's JWT.
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`;

export interface TestDb {
  db: PGlite;
  /** Runs `fn` as a signed-in user, with RLS applied, in a rolled-back transaction. */
  as<T>(userId: string, fn: (tx: Transaction) => Promise<T>): Promise<T>;
  /** Runs `fn` as the anonymous role — what the publishable key reaches. */
  asAnon<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>;
  /** Runs `fn` as the service role — what server routes holding the secret key reach. */
  asService<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>;
  /** Creates an auth user (the signup trigger creates the profile). */
  createUser(email: string, opts?: { confirmed?: boolean }): Promise<string>;
}

export function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d{4}_.+\.sql$/.test(f))
    .sort();
}

// Written without a parameter property: Node runs these files by stripping
// types, and strip-only mode cannot emit the assignment one implies.
class Rollback extends Error {
  readonly value: unknown;
  constructor(value: unknown) {
    super('rollback');
    this.value = value;
  }
}

/**
 * A fresh database with the shim and every migration applied, in order.
 * Throws with the migration's file name if one fails, so a broken migration is
 * reported as that rather than as a failing assertion somewhere later.
 */
export async function createTestDb(): Promise<TestDb> {
  const db = await PGlite.create({ extensions: { pgcrypto, vector } });
  await db.exec(SUPABASE_SHIM);

  for (const file of migrationFiles()) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    try {
      await db.exec(sql);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Migration ${file} failed: ${message}`);
    }
  }

  // Each helper runs inside a transaction that is always rolled back, so tests
  // cannot leak state into each other through the shared database.
  async function scoped<T>(
    setup: (tx: Transaction) => Promise<void>,
    fn: (tx: Transaction) => Promise<T>,
  ): Promise<T> {
    try {
      await db.transaction(async (tx) => {
        await setup(tx);
        const value = await fn(tx);
        throw new Rollback(value);
      });
    } catch (err) {
      if (err instanceof Rollback) return err.value as T;
      throw err;
    }
    throw new Error('unreachable');
  }

  return {
    db,
    as: (userId, fn) =>
      scoped(async (tx) => {
        await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId]);
        await tx.exec('set local role authenticated');
      }, fn),
    asAnon: (fn) =>
      scoped(async (tx) => {
        await tx.query(`select set_config('request.jwt.claim.sub', '', true)`);
        await tx.exec('set local role anon');
      }, fn),
    asService: (fn) =>
      scoped(async (tx) => {
        await tx.query(`select set_config('request.jwt.claim.sub', '', true)`);
        await tx.exec('set local role service_role');
      }, fn),
    async createUser(email, opts = {}) {
      const { rows } = await db.query<{ id: string }>(
        `insert into auth.users (email, email_confirmed_at) values ($1, $2) returning id`,
        [email, opts.confirmed === false ? null : new Date().toISOString()],
      );
      return rows[0].id;
    },
  };
}

/**
 * Two companies, each with an owner, a manager, and a rep, created the way the
 * product creates them — through create_organization() as the signed-in owner —
 * and then written directly as the database superuser for the rest, which is
 * what an operator or the service role would do.
 */
export async function seedTwoTenants(t: TestDb) {
  const people = {
    ownerA: await t.createUser('owner-a@example.com'),
    managerA: await t.createUser('manager-a@example.com'),
    repA: await t.createUser('rep-a@example.com'),
    ownerB: await t.createUser('owner-b@example.com'),
    managerB: await t.createUser('manager-b@example.com'),
    repB: await t.createUser('rep-b@example.com'),
  };

  const orgA = await createOrgAs(t, people.ownerA, 'Apex Roofing');
  const orgB = await createOrgAs(t, people.ownerB, 'Bluebonnet Exteriors');

  await t.db.query(
    `insert into memberships (org_id, user_id, role) values
       ($1, $2, 'manager'), ($1, $3, 'rep'),
       ($4, $5, 'manager'), ($4, $6, 'rep')`,
    [orgA, people.managerA, people.repA, orgB, people.managerB, people.repB],
  );
  await t.db.query(`update organizations set seat_limit = null, plan = 'team' where id in ($1, $2)`, [orgA, orgB]);

  return { ...people, orgA, orgB };
}

async function createOrgAs(t: TestDb, userId: string, name: string): Promise<string> {
  // Committed, unlike `as()`: the org has to exist for the rest of the suite.
  return t.db.transaction(async (tx) => {
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId]);
    await tx.exec('set local role authenticated');
    const { rows } = await tx.query<{ id: string }>(`select create_organization($1) as id`, [name]);
    return rows[0].id;
  });
}

/** Postgres SQLSTATE of a failed query, or null if it did not fail. */
export async function sqlState(run: () => Promise<unknown>): Promise<string | null> {
  try {
    await run();
    return null;
  } catch (err) {
    return (err as { code?: string }).code ?? 'unknown';
  }
}
