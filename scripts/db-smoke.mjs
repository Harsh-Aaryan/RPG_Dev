#!/usr/bin/env node
// Smoke test for the HP invariants against the real database (Review Focus #1):
// two connections verify the same quest at the same moment → exactly one hit.
//   node --env-file=.env scripts/db-smoke.mjs
import { randomBytes } from 'node:crypto';
import { connect } from './lib/pg.mjs';

const id = `smoke${randomBytes(3).toString('hex')}`;
const a = await connect();
const b = await connect();
let failed = false;
const check = (ok, label) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
  if (!ok) failed = true;
};

try {
  await a.query(
    `insert into battles (id, name, repository_id, label, scan, findings) values ($1, 'db smoke test', 'demo-vulnerable-repo', 'simulated', '{}'::jsonb, '[]'::jsonb)`,
    [id],
  );
  await a.query(
    `insert into quests (id, battle_id, finding_id, position, content, source, damage) values
       ($1 || '_q1', $1, 'f_smoke1', 0, '{"questTitle":"Smoke one"}', 'template', 400),
       ($1 || '_q2', $1, 'f_smoke2', 1, '{"questTitle":"Smoke two"}', 'template', 100)`,
    [id],
  );
  await a.query('select recompute_battle($1)', [id]);

  const hit = (client) => client.query(`select record_verified_hit($1, null, '{"codeHash":"smoke"}'::jsonb) as r`, [`${id}_q1`]);
  const [r1, r2] = await Promise.all([hit(a), hit(b)]);
  const applied = [r1, r2].filter((r) => r.rows[0].r.applied).length;
  check(applied === 1, `simultaneous verifications applied once (applied=${applied})`);

  const hp = async () => (await a.query('select max_hp, current_hp, status from battles where id = $1', [id])).rows[0];
  let s = await hp();
  check(s.max_hp === 500 && s.current_hp === 100, `HP = max − damage (${s.current_hp}/${s.max_hp})`);
  const hits = (await a.query(`select count(*)::int as n from battle_events where battle_id = $1 and event_type = 'hit'`, [id])).rows[0].n;
  check(hits === 1, `exactly one hit event (${hits})`);

  await a.query(`select invalidate_hit($1, 'smoke test')`, [`${id}_q1`]);
  s = await hp();
  check(s.current_hp === 500, `invalidation restores HP (${s.current_hp}/${s.max_hp})`);

  await a.query(`select record_verified_hit($1, null, '{}'::jsonb)`, [`${id}_q1`]);
  await a.query(`select record_verified_hit($1, null, '{}'::jsonb)`, [`${id}_q2`]);
  s = await hp();
  check(s.current_hp === 0 && s.status === 'defeated', `all quests verified defeats the boss (${s.status})`);
} finally {
  await a.query('delete from battles where id = $1', [id]).catch(() => {});
  await a.end();
  await b.end();
}
process.exitCode = failed ? 1 : 0;
