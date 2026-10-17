import { QuestContentSchema, templateQuest } from '../../shared/quest';
import { createBattle } from '../../shared/server/battles';
import { getDb } from '../../shared/server/db';
import { knownFinding } from '../../shared/server/findings';
import { isHost, json, methodNotAllowed, notConfigured, questSignature, readJson, safeEqual } from '../../shared/server/http';
import fixture from '../../fixtures/demo-findings.json';
import type { FindingsFixture, QuestContent, QuestSource, SafeFinding } from '../../shared/types';

type GeneratedQuest = { quest: QuestContent; source: QuestSource; model?: string; signature?: string };
type Body = { name?: string; hostNickname?: string; findingIds?: string[]; quests?: Record<string, GeneratedQuest> };

const demo = fixture as FindingsFixture;

/**
 * Host-only. Creates a shared battle from approved findings of the demo scan.
 * Quest text is accepted only with this server's signature; anything else is
 * replaced by the hand-written template and labelled as such.
 */
export default async (req: Request) => {
  if (req.method !== 'POST') return methodNotAllowed();
  if (!isHost(req)) return json({ error: 'Host token required' }, 401);
  const db = getDb();
  if (!db) return notConfigured();

  const b = await readJson<Body>(req);
  const ids = Array.isArray(b?.findingIds) ? [...new Set(b.findingIds)] : [];
  const findings = ids.map(knownFinding).filter((f): f is SafeFinding => f !== null);
  if (!findings.length || findings.length !== ids.length) return json({ error: 'findingIds must be approved findings of the demo scan' }, 400);

  const quests: Record<string, { quest: QuestContent; source: QuestSource; model?: string }> = {};
  for (const f of findings) {
    const g = b?.quests?.[f.id];
    const parsed = QuestContentSchema.safeParse(g?.quest);
    const signed =
      g && parsed.success && typeof g.signature === 'string' && safeEqual(g.signature, questSignature(f.id, g.source, g.model, g.quest));
    quests[f.id] = signed ? { quest: parsed.data, source: g.source, model: g.model } : { quest: templateQuest(f), source: 'template' };
  }

  const name = (b?.name ?? '').trim().slice(0, 60) || 'Demo Raid';
  const hostNickname = (b?.hostNickname ?? '').trim().slice(0, 24) || 'Host';
  const created = await createBattle(db, { name, hostNickname, label: demo.label, scan: demo.scan, findings, quests });
  return json(created, 201);
};
