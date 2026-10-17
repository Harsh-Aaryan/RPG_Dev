#!/usr/bin/env node
/**
 * Local stand-in for Supabase Postgres, for trying shared battles without a
 * Supabase project. Runs PGlite with the real migration and speaks the
 * Postgres wire protocol on 127.0.0.1.
 *
 *   npm run db:dev                      # in one terminal
 *   SUPABASE_DB_URL=postgres://postgres@127.0.0.1:54329/postgres npm run dev
 *
 * Data lives in .local-db/ (gitignored). Delete it to start fresh.
 * Realtime is not emulated; the app falls back to polling.
 */
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.DEV_DB_PORT ?? 54329);
const db = new PGlite(join(root, '.local-db'));

// Roles and publication Supabase provides, so the migration's RLS grants apply.
await db.exec(`
  do $$ begin
    if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
    if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
    if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then create publication supabase_realtime; end if;
  end $$;
`);
await db.exec(readFileSync(join(root, 'supabase', 'migrations', '001_initial.sql'), 'utf8'));

// Each function keeps its own small pool, so allow plenty of connections; queries are queued.
const server = new PGLiteSocketServer({ db, port, host: '127.0.0.1', maxConnections: 32 });
await server.start();
console.log(`Local shared-battle database ready.\nSUPABASE_DB_URL=postgres://postgres@127.0.0.1:${port}/postgres`);

const stop = async () => {
  await server.stop();
  await db.close();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
