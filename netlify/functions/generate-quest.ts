import { knownFinding } from '../../shared/server/findings';
import { askGemma, gemmaAvailable, GEMMA_MODEL } from '../../shared/server/gemma';
import { isHost, json, methodNotAllowed, readJson } from '../../shared/server/http';
import { resolveQuestContent, type QuestResult } from '../../shared/server/quest-service';

// Cache per finding fingerprint for the lifetime of the function instance.
const cache = new Map<string, QuestResult>();

export default async (req: Request) => {
  if (req.method !== 'POST') return methodNotAllowed();
  if (!isHost(req)) return json({ error: 'Host token required' }, 401);
  const body = await readJson<{ findingId?: string; force?: boolean }>(req);
  // Only findings the server already knows about become prompts; browser-sent text never does.
  const finding = knownFinding(body?.findingId);
  if (!finding) return json({ error: 'Unknown findingId' }, 400);

  const cached = cache.get(finding.id);
  if (cached && !body?.force) return json(cached);

  const result = await resolveQuestContent(finding, gemmaAvailable() ? askGemma : null, GEMMA_MODEL);
  if (result.source === 'gemma') cache.set(finding.id, result);
  return json(result);
};
