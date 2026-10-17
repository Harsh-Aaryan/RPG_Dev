/**
 * Decides whether a pull request proves a quest is fixed. Pure function over
 * evidence fetched from GitHub, so every rule is unit-testable.
 *
 * Only a completed, successful check run named `quest-<ruleId>` created by
 * GitHub Actions on the PR's head commit counts. Closing an issue, a PR title,
 * a check from any other app, or a PR that edits the tests never does.
 */

export type CheckRun = {
  name: string;
  status: 'queued' | 'in_progress' | 'completed' | string;
  conclusion: string | null;
  appSlug: string | null;
  url: string | null;
};

export type PrEvidence = {
  number: number;
  headSha: string;
  baseRepo: string;
  files: string[];
  checks: CheckRun[];
};

export type PrOutcome = 'verified' | 'pending' | 'rejected' | 'tampered' | 'wrong_repo';

export type PrVerdict = { outcome: PrOutcome; detail: string; check?: CheckRun };

/** Paths a quest PR may not touch: the tests that judge it and the CI that runs them. */
export const PROTECTED_PATHS = [/^test\//, /^\.github\//];

export const TRUSTED_APP = 'github-actions';

export function evaluatePr(ruleId: string, expectedRepo: string, ev: PrEvidence): PrVerdict {
  if (ev.baseRepo.toLowerCase() !== expectedRepo.toLowerCase()) {
    return { outcome: 'wrong_repo', detail: `PR #${ev.number} targets ${ev.baseRepo}, not ${expectedRepo}.` };
  }
  const touched = ev.files.filter((f) => PROTECTED_PATHS.some((p) => p.test(f)));
  if (touched.length) {
    return { outcome: 'tampered', detail: `PR #${ev.number} changes protected files (${touched.slice(0, 3).join(', ')}). Quest fixes may only change application code.` };
  }

  const name = `quest-${ruleId}`;
  const named = ev.checks.filter((c) => c.name === name);
  const trusted = named.filter((c) => c.appSlug === TRUSTED_APP);
  if (!trusted.length) {
    if (named.length) {
      return { outcome: 'rejected', detail: `The ${name} check on this PR wasn't created by GitHub Actions, so it can't be trusted.`, check: named[0] };
    }
    return { outcome: 'pending', detail: `No ${name} check has reported on commit ${ev.headSha.slice(0, 7)} yet.` };
  }

  // Latest trusted run wins (re-runs append new check runs).
  const check = trusted[trusted.length - 1];
  if (check.status !== 'completed') {
    return { outcome: 'pending', detail: `${name} is ${check.status.replace('_', ' ')}. Try again when it finishes.`, check };
  }
  if (check.conclusion === 'success') {
    return { outcome: 'verified', detail: `${name} passed on commit ${ev.headSha.slice(0, 7)}.`, check };
  }
  return { outcome: 'rejected', detail: `${name} finished with "${check.conclusion ?? 'no conclusion'}". The fix doesn't pass the regression test yet.`, check };
}
