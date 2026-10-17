import { extractJson, QuestContentSchema, templateQuest } from '../quest';
import type { QuestContent, QuestSource, SafeFinding } from '../types';
import type { Ask } from './gemma';
import { questPrompt, repairPrompt } from './prompts';

export type QuestResult = { source: QuestSource; model?: string; reason?: string; quest: QuestContent; latencyMs: number };

function parseQuest(text: string): { quest?: QuestContent; error?: string } {
  try {
    const parsed = QuestContentSchema.safeParse(extractJson(text));
    if (parsed.success) return { quest: parsed.data };
    return { error: parsed.error.issues.map((i) => `${i.path.join('.') || 'reply'}: ${i.message}`).join('; ') };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'unparseable reply' };
  }
}

/**
 * Live Gemma → one repair retry → hand-written template. Never throws, and the
 * returned `source` always says which one the player is reading.
 */
export async function resolveQuestContent(finding: SafeFinding, ask: Ask | null, model: string): Promise<QuestResult> {
  const started = Date.now();
  const template = (reason: string): QuestResult => ({ source: 'template', reason, quest: templateQuest(finding), latencyMs: Date.now() - started });
  if (!ask) return template('GEMINI_API_KEY not configured');

  let reply: string;
  try {
    reply = await ask(questPrompt(finding));
  } catch (err) {
    return template(`Gemma unavailable: ${err instanceof Error ? err.message : String(err)}`);
  }
  const first = parseQuest(reply);
  if (first.quest) return { source: 'gemma', model, quest: first.quest, latencyMs: Date.now() - started };

  try {
    const repaired = parseQuest(await ask(repairPrompt(finding, reply, first.error ?? 'invalid')));
    if (repaired.quest) return { source: 'gemma', model, quest: repaired.quest, latencyMs: Date.now() - started };
    return template(`Gemma reply failed validation twice: ${repaired.error}`);
  } catch (err) {
    return template(`Gemma repair failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}
