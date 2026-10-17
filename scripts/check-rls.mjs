#!/usr/bin/env node
// Confirms what the browser's publishable (anon) key can do through Supabase's
// public API: read battle_events (for Realtime) and nothing else.
//   node --env-file=.env scripts/check-rls.mjs
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const anon = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !anon) {
  console.error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required.');
  process.exit(2);
}
const sb = createClient(url, anon, { auth: { persistSession: false } });
let failed = false;
const check = (ok, label) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
  if (!ok) failed = true;
};

const events = await sb.from('battle_events').select('id').limit(1);
check(!events.error, 'anon can read battle_events');

for (const table of ['battles', 'participants', 'participant_secrets', 'quests', 'contributions']) {
  const res = await sb.from(table).select('*').limit(1);
  check(Boolean(res.error) || (res.data ?? []).length === 0, `anon cannot read ${table}`);
}

const insert = await sb.from('battle_events').insert({ battle_id: 'x', event_type: 'hit', message: 'rls probe' });
check(Boolean(insert.error), 'anon cannot write battle_events');

for (const [fn, args] of [
  ['record_verified_hit', { p_quest_id: 'x', p_participant_id: null, p_receipt: {} }],
  ['invalidate_hit', { p_quest_id: 'x', p_reason: '' }],
]) {
  const res = await sb.rpc(fn, args);
  check(Boolean(res.error), `anon cannot call ${fn}`);
}
process.exitCode = failed ? 1 : 0;
