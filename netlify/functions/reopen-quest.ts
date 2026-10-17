import { authParticipant, getQuest, invalidateHit } from '../../shared/server/battles';
import { getDb } from '../../shared/server/db';
import { isHost, json, methodNotAllowed, notConfigured, participantHeaders, readJson } from '../../shared/server/http';

/**
 * Host-only. Invalidates a verified fix: the quest reopens and the boss regains
 * exactly that quest's HP (invalidate_hit in SQL).
 */
export default async (req: Request) => {
  if (req.method !== 'POST') return methodNotAllowed();
  if (!isHost(req)) return json({ error: 'Host token required' }, 401);
  const db = getDb();
  if (!db) return notConfigured();
  const b = await readJson<{ battleId?: string; questId?: string; reason?: string }>(req);
  if (!b?.battleId || !b.questId) return json({ error: 'battleId and questId are required' }, 400);
  const h = participantHeaders(req);
  const actor = await authParticipant(db, b.battleId, h.id, h.key);
  if (actor?.role !== 'host') return json({ error: 'Only this battle’s host can reopen quests' }, 403);
  if (!(await getQuest(db, b.battleId, b.questId))) return json({ error: 'Quest not found' }, 404);
  const res = await invalidateHit(db, b.questId, (b.reason ?? '').slice(0, 120));
  return json(res);
};
