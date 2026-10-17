import { PGlite, type Transaction } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Db } from './db';

const MIGRATION = join(__dirname, '..', '..', 'supabase', 'migrations', '001_initial.sql');

/**
 * In-process Postgres with the real migration applied, plus the roles and
 * publication Supabase would provide. Test-only.
 */
export async function createTestDb(): Promise<{ db: Db; pg: PGlite }> {
  const pg = new PGlite();
  await pg.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin;
    create publication supabase_realtime;
  `);
  await pg.exec(readFileSync(MIGRATION, 'utf8'));

  const wrapTx = (t: Transaction): Db => ({
    query: async (text, params) => (await t.query(text, params)).rows as never,
    tx: (fn) => fn(wrapTx(t)),
  });
  const db: Db = {
    query: async (text, params) => (await pg.query(text, params)).rows as never,
    tx: (fn) => pg.transaction((t) => fn(wrapTx(t))),
  };
  return { db, pg };
}
