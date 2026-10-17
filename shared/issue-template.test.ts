import { describe, expect, it } from 'vitest';
import fixture from '../fixtures/demo-findings.json';
import { buildIssue, templateQuest } from './quest';
import type { SafeFinding } from './types';

const finding = fixture.findings[0] as SafeFinding;

describe('safe GitHub issue', () => {
  it('uses the exact title, labels and sections', () => {
    const issue = buildIssue(finding, templateQuest(finding));
    expect(issue.title).toBe(`RepoRaid Security Quest — ${finding.title}`);
    expect(issue.labels).toEqual(['reporaid', 'security-quest', 'severity:critical']);
    for (const heading of ['### What needs improving?', '### Goal', '### Acceptance criteria', '### Completion']) {
      expect(issue.body).toContain(heading);
    }
    expect(issue.body.trimEnd().endsWith('> Detailed exploit material is not included in this public task.')).toBe(true);
    expect(issue.body).toContain(`<!-- reporaid-finding:${finding.id} -->`);
  });

  it('never carries code excerpts, secrets, mentions or markup', () => {
    const hostile: SafeFinding = {
      ...finding,
      title: 'SQLi cc @maintainer',
      safeSummary: 'Found ghp_abcdefghijklmnopqrstuvwxyz0123456789 near http://192.168.1.5/admin',
      remediationSummary: 'Use parameters. <img src=x onerror=alert(1)>',
    };
    const quest = { ...templateQuest(finding), fixAcceptanceCriteria: ['password=hunter2 must not leak'] };
    const issue = buildIssue(hostile, quest);
    const all = issue.title + issue.body;
    expect(all).not.toContain(finding.codeExcerpt!);
    expect(all).not.toContain('ghp_abcdef');
    expect(all).not.toContain('192.168.1.5');
    expect(all).not.toContain('hunter2');
    expect(all).not.toContain('<img');
    expect(all).not.toMatch(/@maintainer/);
  });
});
