import { extractJson, questPrompt, QuestContentSchema, templateQuest } from '../../shared/quest';
import { askGemma, gemmaAvailable, GEMMA_MODEL } from '../../shared/server/gemma';
import { isHost, json, methodNotAllowed, readJson } from '../../shared/server/http';
import type { SafeFinding } from '../../shared/types';

// Cache per finding fingerprint for the lifetime of the function instance.
const cache = new Map<string, unknown>();

export default async (req: Request) => {
  if (req.method !== 'POST') return methodNotAllowed();
  if (!isHost(req)) return json({ error: 'Host token required' }, 401);
  const body = await readJson<{ finding: SafeFinding }>(req);
  const finding = body?.finding;
  if (!finding?.id || !finding.title || !finding.severity) {
    return json({ error: 'finding is required' }, 400);
  }

  if (cache.has(finding.id)) return json(cache.get(finding.id));

  if (!gemmaAvailable()) {
    return json({ source: 'template', reason: 'GEMINI_API_KEY not configured', quest: templateQuest(finding) });
  }

  let lastError = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const text = await askGemma(questPrompt(finding));
      const quest = QuestContentSchema.parse(extractJson(text));
      const result = { source: 'gemma', model: GEMMA_MODEL, quest };
      cache.set(finding.id, result);
      return json(result);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }
  return json({ source: 'template', reason: `Gemma failed validation: ${lastError}`, quest: templateQuest(finding) });
};
