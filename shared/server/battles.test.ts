import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import fixture from '../../fixtures/demo-findings.json';
import { templateQuest } from '../quest';
import type { FindingsFixture, VerificationReceipt } from '../types';
import {
  attachIssue,
  authParticipant,
  claimQuest,
  createBattle,
  getBattle,
  invalidateHit,
  joinBattle,
  recordAttempt,
  recordVerifiedHit,
  type Credentials,
} from './battles';
import type { Db } from './db';
import { createTestDb } from './test-db';

const demo = fixture as FindingsFixture;
let db: Db;
let pg: PGlite;

const receipt = (battleId: string, questId: string, findingId: string): VerificationReceipt => ({
  battleId,
  questId,
  findingId,
  codeHash: 'abc123',
  verifiedAt: new Date().toISOString(),
  verifier: 'server',
  signature: 'sig',
});

async function newBattle(): Promise<{ battleId: string; host: Credentials }> {
  return createBattle(db, {
    name: 'Test Raid',
    hostNickname: 'Hostess',
    label: demo.label,
    scan: demo.scan,
    findings: demo.findings,
    quests: Object.fromEntries(demo.findings.map((f) => [f.id, { quest: templateQuest(f), source: 'template' as const }])),
  });
}

beforeAll(async () => {
  ({ db, pg } = await createTestDb());
}, 60_000);

describe('shared battles', () => {
  it('creates a battle whose boss HP comes from its quests', async () => {
    const { battleId, host } = await newBattle();
    const b = (await getBattle(db, battleId))!;
    expect(b.remote).toBe(true);
    expect(b.quests).toHaveLength(4);
    expect(b.quests.reduce((s, q) => s + q.damage, 0)).toBe(800);
    expect(b.participants).toEqual([{ id: host.participantId, nickname: 'Hostess', xp: 0, role: 'host' }]);
    expect(b.events.map((e) => e.type)).toEqual(['created']);
    const [row] = await db.query<{ max_hp: number; current_hp: number; status: string }>('select * from battles where id = $1', [battleId]);
    expect(row).toMatchObject({ max_hp: 800, current_hp: 800, status: 'active' });
  });

  it('authenticates participants by key and battle', async () => {
    const a = await newBattle();
    const other = await newBattle();
    const ada = (await joinBattle(db, a.battleId, 'Ada'))!;
    expect(await authParticipant(db, a.battleId, ada.participantId, ada.key)).toMatchObject({ nickname: 'Ada', role: 'player' });
    expect(await authParticipant(db, a.battleId, ada.participantId, 'wrong-key')).toBeNull();
    expect(await authParticipant(db, other.battleId, ada.participantId, ada.key)).toBeNull();
    expect(await authParticipant(db, a.battleId, 'not-a-uuid', ada.key)).toBeNull();
    expect(await joinBattle(db, 'nope', 'Ghost')).toBeNull();
  });

  it('records claims, failed attempts and issues as events', async () => {
    const { battleId, host } = await newBattle();
    const q = (await getBattle(db, battleId))!.quests[1];
    expect(await claimQuest(db, battleId, q.id, { id: host.participantId, nickname: 'Hostess' })).toBe('ok');
    await recordAttempt(db, battleId, q.id, { id: host.participantId, nickname: 'Hostess' }, false);
    await attachIssue(db, battleId, q.id, { mock: true, title: 't', body: 'b' });
    const b = (await getBattle(db, battleId))!;
    const quest = b.quests[1];
    expect(quest).toMatchObject({ status: 'rejected', attempts: 1, claimedBy: host.participantId, issue: { mock: true } });
    expect(b.events.map((e) => e.type)).toEqual(['created', 'claim', 'attempt', 'issue']);
  });

  it('applies a verified hit exactly once (Review Focus #1)', async () => {
    const { battleId, host } = await newBattle();
    const sqli = (await getBattle(db, battleId))!.quests[0];
    const first = await recordVerifiedHit(db, sqli.id, host.participantId, receipt(battleId, sqli.id, sqli.findingId));
    const second = await recordVerifiedHit(db, sqli.id, host.participantId, receipt(battleId, sqli.id, sqli.findingId));
    expect(first).toMatchObject({ applied: true, damage: 400, current_hp: 400 });
    expect(second).toMatchObject({ applied: false, reason: 'already_verified' });
    const b = (await getBattle(db, battleId))!;
    expect(b.events.filter((e) => e.type === 'hit')).toHaveLength(1);
    expect(b.participants[0].xp).toBe(200);
    expect(b.quests[0].status).toBe('verified');
  });

  it('serializes simultaneous verifications of one quest', async () => {
    const { battleId, host } = await newBattle();
    const q = (await getBattle(db, battleId))!.quests[1];
    const results = await Promise.all(
      [1, 2, 3].map(() => recordVerifiedHit(db, q.id, host.participantId, receipt(battleId, q.id, q.findingId))),
    );
    expect(results.filter((r) => r.applied)).toHaveLength(1);
    const [row] = await db.query<{ current_hp: number }>('select current_hp from battles where id = $1', [battleId]);
    expect(row.current_hp).toBe(550);
    const [{ n }] = await db.query<{ n: number }>(
      `select count(*)::int as n from contributions where quest_id = $1 and verification_state = 'verified'`,
      [q.id],
    );
    expect(n).toBe(1);
  });

  it('invalidation reopens the quest and restores HP and XP', async () => {
    const { battleId, host } = await newBattle();
    const q = (await getBattle(db, battleId))!.quests[2];
    await recordVerifiedHit(db, q.id, host.participantId, receipt(battleId, q.id, q.findingId));
    const res = await invalidateHit(db, q.id, 'regression found');
    expect(res).toMatchObject({ applied: true, current_hp: 800 });
    expect(await invalidateHit(db, q.id, 'again')).toMatchObject({ applied: false, reason: 'not_verified' });
    const b = (await getBattle(db, battleId))!;
    expect(b.quests[2].status).toBe('open');
    expect(b.participants[0].xp).toBe(0);
    expect(b.events.at(-1)?.text).toMatch(/invalidated \(regression found\); \+100 HP restored/);
  });

  it('defeats the boss once every quest is verified', async () => {
    const { battleId, host } = await newBattle();
    const quests = (await getBattle(db, battleId))!.quests;
    for (const q of quests) await recordVerifiedHit(db, q.id, host.participantId, receipt(battleId, q.id, q.findingId));
    await recordVerifiedHit(db, quests[0].id, host.participantId, receipt(battleId, quests[0].id, quests[0].findingId));
    const b = (await getBattle(db, battleId))!;
    expect(b.status).toBe('defeated');
    expect(b.defeatedAt).toBeTruthy();
    expect(b.events.filter((e) => e.type === 'defeated')).toHaveLength(1);
  });
});

describe('row level security', () => {
  async function asAnon<T>(fn: () => Promise<T>): Promise<T> {
    await pg.exec('set role anon');
    try {
      return await fn();
    } finally {
      await pg.exec('reset role');
    }
  }

  it('lets the browser role read battle events only', async () => {
    const { battleId } = await newBattle();
    await expect(asAnon(() => pg.query('select count(*) from battle_events'))).resolves.toBeTruthy();
    for (const table of ['battles', 'participants', 'participant_secrets', 'quests', 'contributions']) {
      await expect(asAnon(() => pg.query(`select * from ${table} limit 1`))).rejects.toThrow(/permission denied/);
    }
    await expect(
      asAnon(() => pg.query(`insert into battle_events (battle_id, event_type, message) values ($1, 'hit', 'x')`, [battleId])),
    ).rejects.toThrow(/permission denied/);
  });

  it('keeps the HP functions away from the browser role', async () => {
    await expect(asAnon(() => pg.query(`select record_verified_hit('q_x', null, '{}'::jsonb)`))).rejects.toThrow(/permission denied/);
    await expect(asAnon(() => pg.query(`select invalidate_hit('q_x', '')`))).rejects.toThrow(/permission denied/);
  });
});
