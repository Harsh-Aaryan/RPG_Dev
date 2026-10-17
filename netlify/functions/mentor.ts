import { QuestContentSchema, templateQuest } from '../../shared/quest';
import { knownFinding } from '../../shared/server/findings';
import { askGemma, gemmaAvailable, GEMMA_MODEL } from '../../shared/server/gemma';
import { json, methodNotAllowed, rateLimited, readJson } from '../../shared/server/http';
import { mentorPrompt } from '../../shared/server/prompts';
import { RULES } from '../../shared/verifier';
import type { MentorMode, QuestContent, SafeFinding } from '../../shared/types';

type Body = {
  mode: MentorMode;
  hintLevel?: number;
  question?: string;
  findingId: string;
  quest?: QuestContent;
};

function fallback(mode: MentorMode, hintLevel: number | undefined, finding: SafeFinding, quest: QuestContent): string {
  const level = Math.min(3, Math.max(1, hintLevel ?? 1));
  if (mode === 'hint') return quest[`hint${level}` as 'hint1'];
  if (mode === 'test') return RULES[finding.ruleId]?.testDescription ?? 'A maintainer-run security test.';
  return `${quest.plainEnglishExplanation} ${finding.remediationSummary}`;
}

export default async (req: Request) => {
  if (req.method !== 'POST') return methodNotAllowed();
  if (rateLimited(req, 8)) return json({ error: 'Slow down, adventurer. The mentor answers 8 questions a minute.' }, 429);
  const body = await readJson<Body>(req);
  if (!body || !['explain', 'hint', 'test'].includes(body.mode)) return json({ error: 'mode and findingId are required' }, 400);
  const finding = knownFinding(body.findingId);
  if (!finding) return json({ error: 'Unknown findingId' }, 400);

  // Quest text comes from the browser in the local-first MVP, so it must parse and is only used inside tags.
  const parsed = QuestContentSchema.safeParse(body.quest);
  const quest = parsed.success ? parsed.data : templateQuest(finding);

  if (!gemmaAvailable()) {
    return json({ source: 'template', text: fallback(body.mode, body.hintLevel, finding, quest) });
  }
  try {
    const text = await askGemma(
      mentorPrompt({
        mode: body.mode,
        hintLevel: body.hintLevel,
        question: typeof body.question === 'string' ? body.question : undefined,
        finding,
        quest,
        testDescription: RULES[finding.ruleId]?.testDescription,
      }),
      { maxOutputTokens: 400 },
    );
    return json({ source: 'gemma', model: GEMMA_MODEL, text: text.slice(0, 1200) });
  } catch (err) {
    return json({ source: 'template', reason: String(err), text: fallback(body.mode, body.hintLevel, finding, quest) });
  }
};
