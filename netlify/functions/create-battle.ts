import { randomBytes } from 'node:crypto';
import { isHost, json, methodNotAllowed, readJson } from '../../shared/server/http';

const ALLOWLIST = new Set(['demo-vulnerable-repo']);

export default async (req: Request) => {
  if (req.method !== 'POST') return methodNotAllowed();
  if (!isHost(req)) return json({ error: 'Host token required' }, 401);
  const b = await readJson<{ repositoryId: string; name?: string }>(req);
  if (!b || !ALLOWLIST.has(b.repositoryId)) {
    return json({ error: 'Repository is not on the authorized allowlist' }, 403);
  }
  return json({
    battleId: randomBytes(4).toString('hex'),
    repositoryId: b.repositoryId,
    name: (b.name ?? 'Demo Raid').slice(0, 60),
    status: 'forming',
  });
};
