import { findingForModel, MENTOR_SYSTEM_PROMPT } from '../../shared/quest';
import { askGemma, gemmaAvailable, GEMMA_MODEL } from '../../shared/server/gemma';
import { json, methodNotAllowed, rateLimited, readJson } from '../../shared/server/http';
import { RULES } from '../../shared/verifier';
import type { MentorMode, QuestContent, SafeFinding } from '../../shared/types';

type Body = {
  mode: MentorMode;
  hintLevel?: number;
  question?: string;
  finding: SafeFinding;
  quest: QuestContent;
};

function fallback(b: Body): string {
  const level = Math.min(3, Math.max(1, b.hintLevel ?? 1));
  if (b.mode === 'hint') return b.quest[`hint${level}` as 'hint1'];
  if (b.mode === 'test') return RULES[b.finding.ruleId]?.testDescription ?? 'A maintainer-run security test.';
  return `${b.quest.plainEnglishExplanation} ${b.finding.remediationSummary}`;
}

function prompt(b: Body): string {
  const level = Math.min(3, Math.max(1, b.hintLevel ?? 1));
  const task = {
    explain: 'Explain this weakness in plain English for a junior developer: what it is, why it matters, and the general defence. 4 sentences max. No exploit payloads.',
    hint: `Give progressive hint number ${level} of 3. Level 1 only says where to look. Level 2 explains the mechanism. Level 3 describes the fix pattern, but never write the full corrected function. 2 sentences max.`,
    test: 'Explain in 3 sentences what the regression test below checks and why passing it shows the weakness is fixed.',
  }[b.mode];
  const question = b.question?.slice(0, 300);
  return `${MENTOR_SYSTEM_PROMPT}

Task: ${task}
Reply in plain text (no JSON, no markdown headings).

<untrusted_finding>
${JSON.stringify(findingForModel(b.finding))}
</untrusted_finding>
<quest>${JSON.stringify({ title: b.quest.questTitle, goal: b.quest.learningGoal })}</quest>
${b.mode === 'test' ? `<regression_test>${RULES[b.finding.ruleId]?.testDescription ?? ''}</regression_test>` : ''}
${question ? `<untrusted_player_question>${question}</untrusted_player_question>` : ''}`;
}

export default async (req: Request) => {
  if (req.method !== 'POST') return methodNotAllowed();
  if (rateLimited(req)) return json({ error: 'Slow down, adventurer. Try again in a minute.' }, 429);
  const body = await readJson<Body>(req);
  if (!body?.finding || !body.quest || !['explain', 'hint', 'test'].includes(body.mode)) {
    return json({ error: 'mode, finding and quest are required' }, 400);
  }
  if (!gemmaAvailable()) {
    return json({ source: 'template', text: fallback(body) });
  }
  try {
    const text = await askGemma(prompt(body), 20_000);
    return json({ source: 'gemma', model: GEMMA_MODEL, text: text.slice(0, 1200) });
  } catch (err) {
    return json({ source: 'template', reason: String(err), text: fallback(body) });
  }
};
