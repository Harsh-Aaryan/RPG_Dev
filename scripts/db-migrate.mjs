#!/usr/bin/env node
// Apply supabase/migrations/*.sql in order. Every migration is idempotent.
//   node --env-file=.env scripts/db-migrate.mjs
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect } from './lib/pg.mjs';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'migrations');
const client = await connect();
try {
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    await client.query(readFileSync(join(dir, file), 'utf8'));
    console.log(`applied ${file}`);
  }
  const { rows } = await client.query(
    `select count(*)::int as n from information_schema.routines where routine_name in ('record_verified_hit', 'invalidate_hit', 'recompute_battle')`,
  );
  console.log(rows[0].n === 3 ? 'PASS: HP functions present' : 'FAIL: HP functions missing');
  process.exitCode = rows[0].n === 3 ? 0 : 1;
} finally {
  await client.end();
}
