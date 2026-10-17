import { z } from 'zod';
import { sanitizeForIssue } from './sanitize';
import type { QuestContent, SafeFinding } from './types';

export const QuestContentSchema = z.object({
  questTitle: z.string().min(3).max(80),
  plainEnglishExplanation: z.string().min(10).max(600),
  learningGoal: z.string().min(5).max(200),
  hint1: z.string().min(5).max(300),
  hint2: z.string().min(5).max(300),
  hint3: z.string().min(5).max(400),
  fixAcceptanceCriteria: z.array(z.string().min(3).max(200)).min(1).max(5),
});

/** Pull the JSON object out of model output that may be fenced or wrapped in prose. */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('No JSON object in model output');
  return JSON.parse(body.slice(start, end + 1));
}

/** Hand-written quests used when Gemma is unavailable. Always labelled as templates in the UI. */
export const TEMPLATE_QUESTS: Record<string, QuestContent> = {
  'rr-sqli': {
    questTitle: 'Seal the Unsafe Query',
    plainEnglishExplanation:
      'The user lookup glues whatever name a visitor types straight into a database command. A crafted name can change what the command means, for example returning every user instead of one.',
    learningGoal: 'Understand why parameterized queries keep data and code separate.',
    hint1: 'Open src/handlers.js and find the function that builds the users query.',
    hint2: 'Look at how the name value is joined into the SQL string with +. The database cannot tell where your SQL ends and the visitor’s text begins.',
    hint3: 'Replace the concatenation with a placeholder in the SQL text and pass the value separately as a parameter array.',
    fixAcceptanceCriteria: [
      'No untrusted string is concatenated into the SQL expression',
      'The name is passed as a bound parameter',
      'Regression test rr-sqli passes',
    ],
  },
  'rr-path': {
    questTitle: 'Bar the Wandering Path',
    plainEnglishExplanation:
      'The download handler trusts the file name it is given. Names containing ../ can walk out of the downloads folder and read other files on the server.',
    learningGoal: 'Learn to resolve paths and enforce that they stay inside an allowed directory.',
    hint1: 'Find the function that turns a requested file name into a path on disk.',
    hint2: 'path.join happily resolves ../ segments, so the final path can point anywhere.',
    hint3: 'Resolve the full path, then refuse the request unless it still starts with the downloads directory.',
    fixAcceptanceCriteria: [
      'Requests that escape the download directory are refused',
      'Legitimate files still download',
      'Regression test rr-path passes',
    ],
  },
  'rr-xss': {
    questTitle: 'Silence the Echoing Script',
    plainEnglishExplanation:
      'The search page repeats the visitor’s search term back as HTML. If the term contains markup, the browser runs it as part of the page.',
    learningGoal: 'Understand output encoding and why untrusted text must be escaped for its context.',
    hint1: 'Find the function that builds the search results heading.',
    hint2: 'The search term goes into an HTML template literal exactly as typed, so characters like < become real tags.',
    hint3: 'Convert &, <, >, and quotes to their HTML entities before inserting the term into the markup.',
    fixAcceptanceCriteria: [
      'The raw search term is never inserted into HTML',
      'Markup characters are HTML-escaped',
      'Regression test rr-xss passes',
    ],
  },
  'rr-errleak': {
    questTitle: 'Muffle the Oversharing Oracle',
    plainEnglishExplanation:
      'When something breaks, the server sends its internal error message and stack trace to the visitor. That can reveal file paths, library versions, or even secrets.',
    learningGoal: 'Learn to log details privately and return generic errors publicly.',
    hint1: 'Find the function that shapes error responses.',
    hint2: 'Notice which fields of the error object end up in the JSON body.',
    hint3: 'Log the error on the server and return a fixed, generic message with the same 500 status.',
    fixAcceptanceCriteria: [
      'Responses contain no stack trace or raw error message',
      'Status code remains 500',
      'Regression test rr-errleak passes',
    ],
  },
};

export function templateQuest(f: SafeFinding): QuestContent {
  return (
    TEMPLATE_QUESTS[f.ruleId] ?? {
      questTitle: `Mend: ${f.title}`.slice(0, 80),
      plainEnglishExplanation: f.safeSummary,
      learningGoal: f.remediationSummary,
      hint1: `Start in ${f.affectedPath ?? 'the affected file'}.`,
      hint2: f.safeSummary,
      hint3: f.remediationSummary,
      fixAcceptanceCriteria: ['A maintainer verifies the fix', 'The security test passes'],
    }
  );
}

export type IssuePreview = { title: string; body: string; labels: string[] };

const NO_EXPLOIT_NOTICE = '> Detailed exploit material is not included in this public task.';

/**
 * Safe public GitHub issue for a quest. Every interpolated value is sanitized
 * (no secrets, internal hosts, mentions or markup) and no exploit steps or
 * payloads are ever included.
 */
export function buildIssue(f: SafeFinding, q: QuestContent): IssuePreview {
  const sev = f.severity[0].toUpperCase() + f.severity.slice(1);
  const meta = [
    `**Severity:** ${sev}`,
    f.cwe ? `**CWE:** ${sanitizeForIssue(f.cwe, 20)}` : null,
    f.affectedPath ? `**Where:** \`${sanitizeForIssue(f.affectedPath, 120)}\`` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const criteria = q.fixAcceptanceCriteria.map((c) => `- [ ] ${sanitizeForIssue(c, 200)}`).join('\n');
  const body = `<!-- reporaid-finding:${f.id} -->
## RepoRaid Security Quest
${meta}

### What needs improving?
${sanitizeForIssue(f.safeSummary)}

### Goal
${sanitizeForIssue(f.remediationSummary)}
Add or keep a regression test that proves the fix.

### Acceptance criteria
${criteria}

### Completion
A maintainer verifies the fix and the \`${sanitizeForIssue(f.ruleId, 40)}\` regression check passes. Closing this issue alone does not count.

${NO_EXPLOIT_NOTICE}`;
  return {
    title: `RepoRaid Security Quest — ${sanitizeForIssue(f.title, 120)}`,
    body,
    labels: ['reporaid', 'security-quest', `severity:${f.severity}`],
  };
}

export function issueBody(f: SafeFinding, q: QuestContent): string {
  return buildIssue(f, q).body;
}
