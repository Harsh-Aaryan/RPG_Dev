import { getBattle } from '../../shared/server/battles';
import { getDb } from '../../shared/server/db';
import { json, methodNotAllowed, notConfigured } from '../../shared/server/http';

/** GET /api/battle?id= — the public, sanitized state of a shared battle. */
export default async (req: Request) => {
  if (req.method !== 'GET') return methodNotAllowed();
  const db = getDb();
  if (!db) return notConfigured();
  const id = new URL(req.url).searchParams.get('id') ?? '';
  if (!/^[a-z0-9]{4,16}$/.test(id)) return json({ error: 'Invalid battle id' }, 400);
  const battle = await getBattle(db, id);
  return battle ? json(battle) : json({ error: 'Battle not found' }, 404);
};
