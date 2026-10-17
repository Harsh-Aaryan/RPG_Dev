import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import fixture from '../../fixtures/demo-findings.json';
import { setDb } from '../../shared/server/db';
import { createTestDb } from '../../shared/server/test-db';
import type { BattleView } from '../../shared/types';
import { RULES } from '../../shared/verifier';
import battle from '../functions/battle';
import claimQuest from '../functions/claim-quest';
import config from '../functions/config';
import createBattle from '../functions/create-battle';
import createIssue from '../functions/create-github-issue';
import generateQuest from '../functions/generate-quest';
import joinBattle from '../functions/join-battle';
import reopenQuest from '../functions/reopen-quest';
import verifyFix from '../functions/verify-fix';

const ids = fixture.findings.map((f) => f.id);
const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('http://localhost/api/x', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const asParticipant = (c: { participantId: string; key: string }) => ({ 'x-participant-id': c.participantId, 'x-participant-key': c.key });
const getState = async (id: string) => (await (await battle(new Request(`http://localhost/api/battle?id=${id}`))).json()) as BattleView;

beforeAll(async () => {
  vi.stubEnv('HOST_TOKEN', '');
  vi.stubEnv('GEMINI_API_KEY', '');
  vi.stubEnv('GITHUB_TOKEN', '');
  setDb((await createTestDb()).db);
}, 60_000);
afterAll(() => {
  setDb(null);
  vi.unstubAllEnvs();
});

async function hostBattle(quests: Record<string, unknown> = {}) {
  const res = await createBattle(post({ name: 'Shared Raid', hostNickname: 'Hostess', findingIds: ids, quests }));
  expect(res.status).toBe(201);
  return (await res.json()) as { battleId: string; host: { participantId: string; key: string } };
}

describe('shared battles over the API', () => {
  it('reports shared mode once a database is configured', async () => {
    expect(await (await config()).json()).toMatchObject({ shared: true, gemma: false });
  });

  it('accepts only quest text this server signed', async () => {
    const signed = await (await generateQuest(post({ findingId: ids[0] }))).json();
    const forged = { quest: { ...signed.quest, questTitle: 'Totally Gemma, honest' }, source: 'gemma', model: 'gemma-4', signature: signed.signature };
    const { battleId } = await hostBattle({ [ids[0]]: signed, [ids[1]]: forged });
    const state = await getState(battleId);
    expect(state.quests[0].content).toEqual(signed.quest);
    expect(state.quests[1].source).toBe('template');
    expect(state.quests[1].content.questTitle).not.toBe('Totally Gemma, honest');
  });

  it('rejects findings outside the approved scan', async () => {
    const res = await createBattle(post({ findingIds: ['f_forged'] }));
    expect(res.status).toBe(400);
  });

  it('lets a second device join, claim and land exactly one hit', async () => {
    const { battleId } = await hostBattle();
    const ada = await (await joinBattle(post({ battleId, nickname: 'Ada' }))).json();
    const sqli = (await getState(battleId)).quests[0];

    expect((await claimQuest(post({ battleId, questId: sqli.id }))).status).toBe(401);
    expect((await claimQuest(post({ battleId, questId: sqli.id }, asParticipant(ada)))).status).toBe(200);

    const miss = await (await verifyFix(post({ battleId, questId: sqli.id, code: 'function findUser() {}' }, asParticipant(ada)))).json();
    expect(miss.passed).toBe(false);

    const code = RULES['rr-sqli'].referencePatch;
    const hit = await (await verifyFix(post({ battleId, questId: sqli.id, code }, asParticipant(ada)))).json();
    expect(hit).toMatchObject({ passed: true, hit: { applied: true } });
    const again = await (await verifyFix(post({ battleId, questId: sqli.id, code }, asParticipant(ada)))).json();
    expect(again.alreadyVerified).toBe(true);

    const state = await getState(battleId);
    expect(state.quests[0].status).toBe('verified');
    expect(state.events.filter((e) => e.type === 'hit')).toHaveLength(1);
    expect(state.events.find((e) => e.type === 'hit')?.id).toBe(hit.hit.eventId);
    expect(state.participants.find((p) => p.nickname === 'Ada')?.xp).toBe(200);
    expect(state.events.map((e) => e.type)).toEqual(['created', 'join', 'claim', 'attempt', 'hit']);
  });

  it('only verifies for participants of this battle', async () => {
    const a = await hostBattle();
    const b = await hostBattle();
    const q = (await getState(a.battleId)).quests[0];
    const res = await verifyFix(post({ battleId: a.battleId, questId: q.id, code: RULES['rr-sqli'].referencePatch }, asParticipant(b.host)));
    expect(res.status).toBe(401);
  });

  it('lets only the battle host reopen a verified quest', async () => {
    const { battleId, host } = await hostBattle();
    const ada = await (await joinBattle(post({ battleId, nickname: 'Ada' }))).json();
    const q = (await getState(battleId)).quests[3];
    await verifyFix(post({ battleId, questId: q.id, code: RULES['rr-errleak'].referencePatch }, asParticipant(ada)));
    expect((await reopenQuest(post({ battleId, questId: q.id }, asParticipant(ada)))).status).toBe(403);
    const res = await (await reopenQuest(post({ battleId, questId: q.id, reason: 'test' }, asParticipant(host)))).json();
    expect(res).toMatchObject({ applied: true, current_hp: 800 });
    expect((await getState(battleId)).quests[3].status).toBe('open');
  });

  it('records a published (or simulated) issue on the shared quest', async () => {
    const { battleId } = await hostBattle();
    const q = (await getState(battleId)).quests[1];
    const res = await (await createIssue(post({ findingId: q.findingId, quest: q.content, battleId, questId: q.id }))).json();
    expect(res.mock).toBe(true);
    const state = await getState(battleId);
    expect(state.quests[1].issue).toMatchObject({ mock: true, title: res.title });
    expect(state.events.at(-1)?.type).toBe('issue');
  });

  it('returns 404 for unknown battles', async () => {
    expect((await battle(new Request('http://localhost/api/battle?id=zzzzzz'))).status).toBe(404);
  });
});
