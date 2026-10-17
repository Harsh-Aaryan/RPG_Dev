import { authParticipant, claimQuest } from '../../shared/server/battles';
import { getDb } from '../../shared/server/db';
import { json, methodNotAllowed, notConfigured, participantHeaders, readJson } from '../../shared/server/http';

/** Participant-only. Accepting a quest never affects HP. */
export default async (req: Request) => {
  if (req.method !== 'POST') return methodNotAllowed();
  const db = getDb();
  if (!db) return notConfigured();
  const b = await readJson<{ battleId?: string; questId?: string }>(req);
  if (!b?.battleId || !b.questId) return json({ error: 'battleId and questId are required' }, 400);
  const h = participantHeaders(req);
  const actor = await authParticipant(db, b.battleId, h.id, h.key);
  if (!actor) return json({ error: 'Join the battle first' }, 401);
  const res = await claimQuest(db, b.battleId, b.questId, actor);
  if (res === 'not_found') return json({ error: 'Quest not found' }, 404);
  if (res === 'verified') return json({ error: 'This quest is already verified' }, 409);
  return json({ ok: true });
};
