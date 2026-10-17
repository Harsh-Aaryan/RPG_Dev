import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import fixture from '../../fixtures/demo-findings.json';
import { getBattle, joinBattle } from '../../shared/server/battles';
import { setDb, type Db } from '../../shared/server/db';
import type { PrEvidence } from '../../shared/server/pr-verify';
import { createTestDb } from '../../shared/server/test-db';

const evidence: { current: PrEvidence | Error } = { current: new Error('unset') };
vi.mock('../../shared/server/github', () => ({
  demoRepo: () => (process.env.GITHUB_REPO ? { owner: 'team', repo: 'demo', fullName: process.env.GITHUB_REPO } : null),
  fetchPrEvidence: async () => {
    if (evidence.current instanceof Error) throw evidence.current;
    return evidence.current;
  },
}));

const { default: verifyPr } = await import('../functions/verify-pr');
const { default: createBattle } = await import('../functions/create-battle');

const REPO = 'team/demo';
const sqli = fixture.findings[0];
const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('http://localhost/api/verify-pr', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const green = (over: Partial<PrEvidence> = {}): PrEvidence => ({
  number: 4,
  headSha: '0123456789abcdef0123',
  baseRepo: REPO,
  files: ['src/handlers.js'],
  checks: [{ name: 'quest-rr-sqli', status: 'completed', conclusion: 'success', appSlug: 'github-actions', url: null }],
  ...over,
});

let db: Db;
beforeAll(async () => {
  db = (await createTestDb()).db;
}, 60_000);
beforeEach(() => {
  vi.stubEnv('HOST_TOKEN', '');
  vi.stubEnv('GITHUB_REPO', REPO);
  vi.stubEnv('GITHUB_TOKEN', 'test');
  setDb(null);
});
afterAll(() => {
  setDb(null);
  vi.unstubAllEnvs();
});

describe('verify-pr', () => {
  it('is unavailable until GitHub is configured', async () => {
    vi.stubEnv('GITHUB_REPO', '');
    expect((await verifyPr(post({ battleId: 'b', questId: 'q', findingId: sqli.id, prNumber: 4 }))).status).toBe(503);
  });

  it('signs a github-actions receipt for a green, code-only PR', async () => {
    evidence.current = green();
    const data = await (await verifyPr(post({ battleId: 'b', questId: 'q', findingId: sqli.id, prNumber: 4 }))).json();
    expect(data.verdict.outcome).toBe('verified');
    expect(data.receipt).toMatchObject({ verifier: 'github-actions', prNumber: 4, findingId: sqli.id });
  });

  it('gives no receipt for tampered, pending or untrusted evidence', async () => {
    for (const ev of [
      green({ files: ['test/security.test.js'] }),
      green({ checks: [] }),
      green({ checks: [{ name: 'quest-rr-sqli', status: 'completed', conclusion: 'success', appSlug: 'some-other-app', url: null }] }),
    ]) {
      evidence.current = ev;
      const data = await (await verifyPr(post({ battleId: 'b', questId: 'q', findingId: sqli.id, prNumber: 4 }))).json();
      expect(data.receipt).toBeUndefined();
      expect(data.verdict.outcome).not.toBe('verified');
    }
  });

  it('reports a missing PR clearly', async () => {
    evidence.current = Object.assign(new Error('Not Found'), { status: 404 });
    const res = await verifyPr(post({ battleId: 'b', questId: 'q', findingId: sqli.id, prNumber: 99 }));
    expect(res.status).toBe(404);
  });

  it('lands exactly one hit in a shared battle, for the battle host only', async () => {
    setDb(db);
    const created = await (await createBattle(post({ findingIds: fixture.findings.map((f) => f.id) }))).json();
    const quest = (await getBattle(db, created.battleId))!.quests[0];
    const ada = (await joinBattle(db, created.battleId, 'Ada'))!;
    evidence.current = green();
    const body = { battleId: created.battleId, questId: quest.id, prNumber: 4 };

    const asPlayer = await verifyPr(post(body, { 'x-participant-id': ada.participantId, 'x-participant-key': ada.key }));
    expect(asPlayer.status).toBe(403);

    const hostHeaders = { 'x-participant-id': created.host.participantId, 'x-participant-key': created.host.key };
    const first = await (await verifyPr(post(body, hostHeaders))).json();
    const second = await (await verifyPr(post(body, hostHeaders))).json();
    expect(first.hit.applied).toBe(true);
    expect(second.alreadyVerified).toBe(true);
    const state = (await getBattle(db, created.battleId))!;
    expect(state.events.filter((e) => e.type === 'hit')).toHaveLength(1);
    expect(state.quests[0].receipt).toMatchObject({ verifier: 'github-actions', prNumber: 4 });
  });
});
