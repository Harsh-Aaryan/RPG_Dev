import { describe, expect, it } from 'vitest';
import { evaluatePr, type CheckRun, type PrEvidence } from './pr-verify';

const REPO = 'team/reporaid-demo-vulnerable-repo';
const check = (over: Partial<CheckRun> = {}): CheckRun => ({
  name: 'quest-rr-sqli',
  status: 'completed',
  conclusion: 'success',
  appSlug: 'github-actions',
  url: 'https://github.com/team/repo/runs/1',
  ...over,
});
const pr = (over: Partial<PrEvidence> = {}): PrEvidence => ({
  number: 7,
  headSha: 'abcdef1234567',
  baseRepo: REPO,
  files: ['src/handlers.js'],
  checks: [check()],
  ...over,
});

describe('PR verification (Review Focus #5)', () => {
  it('verifies a code-only PR whose quest check passed in GitHub Actions', () => {
    expect(evaluatePr('rr-sqli', REPO, pr())).toMatchObject({ outcome: 'verified' });
  });

  it('rejects PRs that touch the tests or CI, even with a green check', () => {
    expect(evaluatePr('rr-sqli', REPO, pr({ files: ['src/handlers.js', 'test/security.test.js'] })).outcome).toBe('tampered');
    expect(evaluatePr('rr-sqli', REPO, pr({ files: ['.github/workflows/quests.yml'] })).outcome).toBe('tampered');
  });

  it('waits while the check is queued or running, or has not reported', () => {
    expect(evaluatePr('rr-sqli', REPO, pr({ checks: [check({ status: 'in_progress', conclusion: null })] })).outcome).toBe('pending');
    expect(evaluatePr('rr-sqli', REPO, pr({ checks: [check({ status: 'queued', conclusion: null })] })).outcome).toBe('pending');
    expect(evaluatePr('rr-sqli', REPO, pr({ checks: [] })).outcome).toBe('pending');
  });

  it('ignores checks for other quests', () => {
    expect(evaluatePr('rr-sqli', REPO, pr({ checks: [check({ name: 'quest-rr-xss' })] })).outcome).toBe('pending');
  });

  it('never trusts a quest check from another app', () => {
    const v = evaluatePr('rr-sqli', REPO, pr({ checks: [check({ appSlug: 'evil-ci' })] }));
    expect(v.outcome).toBe('rejected');
    expect(v.detail).toMatch(/wasn't created by GitHub Actions/);
  });

  it('rejects a failing check and uses the latest trusted run', () => {
    expect(evaluatePr('rr-sqli', REPO, pr({ checks: [check({ conclusion: 'failure' })] })).outcome).toBe('rejected');
    const rerun = [check({ conclusion: 'failure' }), check({ conclusion: 'success' })];
    expect(evaluatePr('rr-sqli', REPO, pr({ checks: rerun })).outcome).toBe('verified');
  });

  it('rejects PRs against any other repository', () => {
    expect(evaluatePr('rr-sqli', REPO, pr({ baseRepo: 'someone/else' })).outcome).toBe('wrong_repo');
  });
});
