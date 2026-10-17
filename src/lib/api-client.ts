import { issueBody, templateQuest } from '../../shared/quest';
import { codeHash, RULES, runRegressionChecks } from '../../shared/verifier';
import type { MentorMode, QuestContent, QuestSource, SafeFinding, VerifyResponse } from './types';

/**
 * Thin client for the Netlify Functions. Every call has an offline fallback so
 * the judge demo still works when functions are unreachable (e.g. `vite preview`);
 * fallbacks are always labelled in the UI.
 */

let hostToken = '';
export function setHostToken(token: string) {
  hostToken = token;
}

class ApiUnavailable extends Error {}

async function post<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(hostToken ? { 'x-host-token': hostToken } : {}) },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiUnavailable('network');
  }
  const type = res.headers.get('content-type') ?? '';
  if (res.status === 404 || !type.includes('application/json')) throw new ApiUnavailable(String(res.status));
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

export type GeneratedQuest = { source: QuestSource; model?: string; reason?: string; quest: QuestContent };

export async function generateQuest(finding: SafeFinding): Promise<GeneratedQuest> {
  try {
    return await post<GeneratedQuest>('generate-quest', { finding });
  } catch (err) {
    if (err instanceof ApiUnavailable) {
      return { source: 'template', reason: 'API offline', quest: templateQuest(finding) };
    }
    throw err;
  }
}

export type MentorReply = { source: QuestSource; model?: string; text: string; reason?: string };

export async function askMentor(args: {
  mode: MentorMode;
  hintLevel?: number;
  question?: string;
  finding: SafeFinding;
  quest: QuestContent;
}): Promise<MentorReply> {
  try {
    return await post<MentorReply>('mentor', args);
  } catch (err) {
    if (!(err instanceof ApiUnavailable)) throw err;
    const level = Math.min(3, Math.max(1, args.hintLevel ?? 1));
    const text =
      args.mode === 'hint'
        ? args.quest[`hint${level}` as 'hint1']
        : args.mode === 'test'
          ? (RULES[args.finding.ruleId]?.testDescription ?? '')
          : `${args.quest.plainEnglishExplanation} ${args.finding.remediationSummary}`;
    return { source: 'template', text, reason: 'API offline' };
  }
}

export async function verifyFix(args: {
  battleId: string;
  questId: string;
  findingId: string;
  ruleId: string;
  code: string;
}): Promise<VerifyResponse & { offline?: boolean }> {
  try {
    return await post<VerifyResponse>('verify-fix', args);
  } catch (err) {
    if (!(err instanceof ApiUnavailable)) throw err;
    // Offline demo fallback: same deterministic checks, but the receipt is unsigned and labelled.
    const tests = runRegressionChecks(args.ruleId, args.code);
    const passed = tests.every((t) => t.passed);
    return {
      offline: true,
      passed,
      tests,
      receipt: passed
        ? {
            battleId: args.battleId,
            questId: args.questId,
            findingId: args.findingId,
            codeHash: await codeHash(args.code),
            verifiedAt: new Date().toISOString(),
            verifier: 'local-offline',
            signature: 'unsigned',
          }
        : undefined,
    };
  }
}

export type IssueResult = { mock: boolean; reused?: boolean; number?: number; url?: string; title: string; body: string; reason?: string };

export async function createGithubIssue(finding: SafeFinding, quest: QuestContent): Promise<IssueResult> {
  try {
    return await post<IssueResult>('create-github-issue', { finding, quest });
  } catch (err) {
    if (!(err instanceof ApiUnavailable)) throw err;
    return { mock: true, reason: 'API offline', title: `[RepoRaid] ${quest.questTitle}`, body: issueBody(finding, quest) };
  }
}
