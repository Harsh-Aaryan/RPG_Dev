import { joinBattle } from '../../shared/server/battles';
import { getDb } from '../../shared/server/db';
import { json, methodNotAllowed, notConfigured, rateLimited, readJson } from '../../shared/server/http';

/** POST {battleId, nickname} → participant credentials. The key is shown once and stored only as a hash. */
export default async (req: Request) => {
  if (req.method !== 'POST') return methodNotAllowed();
  const db = getDb();
  if (!db) return notConfigured();
  if (rateLimited(req, 20)) return json({ error: 'Too many joins from this device. Try again in a minute.' }, 429);
  const b = await readJson<{ battleId?: string; nickname?: string }>(req);
  const nickname = (b?.nickname ?? '').replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 24);
  if (!b?.battleId || !nickname) return json({ error: 'battleId and nickname are required' }, 400);
  const creds = await joinBattle(db, b.battleId, nickname);
  return creds ? json(creds, 201) : json({ error: 'Battle not found' }, 404);
};
