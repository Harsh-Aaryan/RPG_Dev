import { buildIssue, templateQuest, type IssuePreview } from '../../shared/quest';
import { codeHash, RULES, runRegressionChecks } from '../../shared/verifier';
import type { MentorMode, QuestContent, QuestSource, SafeFinding, VerifyResponse } from './types';

/**
 * Thin client for the Netlify Functions. Every call has an offline fallback so
 * the judge demo still works when functions are unreachable (e.g. `vite preview`);
 * fallbacks are always labelled in the UI.
 *
 * Findings travel by id: the server looks up its own copy instead of trusting
 * finding text from the browser.
 */

let hostToken = '';
export function setHostToken(token: string) {
  hostToken = token;
}

export class ApiUnavailable extends Error {}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** JSON request to a Netlify Function. Throws ApiUnavailable when there is no API to talk to. */
export async function request<T>(path: string, init: { method?: 'GET' | 'POST'; body?: unknown; headers?: Record<string, string> } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/${path}`, {
      method: init.method ?? 'POST',
      headers: {
        ...(init.body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(hostToken ? { 'x-host-token': hostToken } : {}),
        ...init.headers,
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiUnavailable('network');
  }
  const type = res.headers.get('content-type') ?? '';
  if (!type.includes('application/json')) throw new ApiUnavailable(String(res.status));
  const data = await res.json();
  if (!res.ok) {
    // A function that doesn't exist (e.g. `vite preview`) still counts as offline.
    if (res.status === 404 && !data?.error) throw new ApiUnavailable('404');
    throw new ApiError(data.error ?? `Request failed (${res.status})`, res.status);
  }
  return data as T;
}

const post = <T,>(path: string, body: unknown, headers?: Record<string, string>) => request<T>(path, { body, headers });

export type GeneratedQuest = { source: QuestSource; model?: string; reason?: string; quest: QuestContent; signature?: string };

export async function generateQuest(finding: SafeFinding): Promise<GeneratedQuest> {
  try {
    return await post<GeneratedQuest>('generate-quest', { findingId: finding.id });
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
    return await post<MentorReply>('mentor', {
      mode: args.mode,
      hintLevel: args.hintLevel,
      question: args.question,
      findingId: args.finding.id,
      quest: args.quest,
    });
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

export type VerifyResult = VerifyResponse & { offline?: boolean; alreadyVerified?: boolean; hit?: { applied: boolean; eventId?: string } };

export async function verifyFix(
  args: { battleId: string; questId: string; findingId: string; ruleId: string; code: string },
  /** Participant headers for a shared battle: the server then lands the hit itself. */
  participant?: Record<string, string>,
): Promise<VerifyResult> {
  try {
    const { ruleId: _ruleId, ...body } = args;
    void _ruleId; // the server derives the rule from findingId
    return await post<VerifyResult>('verify-fix', body, participant);
  } catch (err) {
    if (!(err instanceof ApiUnavailable) || participant) throw err;
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

export type { IssuePreview };
export type IssueResult = { mock: boolean; reused?: boolean; number?: number; url?: string; title: string; body: string; reason?: string };

/** The exact issue the host is about to publish. Nothing is posted. */
export async function previewGithubIssue(finding: SafeFinding, quest: QuestContent): Promise<IssuePreview & { offline?: boolean }> {
  try {
    const { title, body, labels } = await post<IssuePreview>('create-github-issue', { findingId: finding.id, quest, dryRun: true });
    return { title, body, labels };
  } catch (err) {
    if (!(err instanceof ApiUnavailable)) throw err;
    return { ...buildIssue(finding, quest), offline: true };
  }
}

export async function createGithubIssue(finding: SafeFinding, quest: QuestContent, shared?: { battleId: string; questId: string }): Promise<IssueResult> {
  try {
    return await post<IssueResult>('create-github-issue', { findingId: finding.id, quest, ...shared });
  } catch (err) {
    if (!(err instanceof ApiUnavailable)) throw err;
    const { title, body } = buildIssue(finding, quest);
    return { mock: true, reason: 'API offline', title, body };
  }
}
