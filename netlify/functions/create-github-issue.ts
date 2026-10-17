import { Octokit } from '@octokit/rest';
import { buildIssue, QuestContentSchema, templateQuest } from '../../shared/quest';
import { knownFinding } from '../../shared/server/findings';
import { isHost, json, methodNotAllowed, readJson } from '../../shared/server/http';
import type { QuestContent } from '../../shared/types';

const ALLOWED_REPO = process.env.GITHUB_REPO; // owner/name of the team-controlled demo repo

/**
 * Host-only. `dryRun: true` returns the exact title, body and labels for the
 * host to review; only a second call without dryRun publishes the issue.
 */
export default async (req: Request) => {
  if (req.method !== 'POST') return methodNotAllowed();
  if (!isHost(req)) return json({ error: 'Host token required' }, 401);
  const b = await readJson<{ findingId: string; quest: QuestContent; dryRun?: boolean }>(req);
  const finding = knownFinding(b?.findingId);
  if (!finding) return json({ error: 'Unknown findingId' }, 400);
  const parsed = QuestContentSchema.safeParse(b?.quest);
  const issue = buildIssue(finding, parsed.success ? parsed.data : templateQuest(finding));

  if (b?.dryRun) return json({ preview: true, ...issue });

  if (!process.env.GITHUB_TOKEN || !ALLOWED_REPO) {
    return json({ mock: true, reason: 'GITHUB_TOKEN / GITHUB_REPO not configured', ...issue });
  }

  const [owner, repo] = ALLOWED_REPO.split('/');
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const marker = `reporaid-finding:${finding.id}`;

  // Idempotency: reuse an existing issue for this finding fingerprint.
  const existing = await octokit.search.issuesAndPullRequests({
    q: `repo:${owner}/${repo} is:issue in:body "${marker}"`,
    per_page: 1,
  });
  const found = existing.data.items[0];
  if (found) return json({ mock: false, reused: true, number: found.number, url: found.html_url, ...issue });

  const created = await octokit.issues.create({ owner, repo, title: issue.title, body: issue.body, labels: issue.labels });
  return json({ mock: false, number: created.data.number, url: created.data.html_url, ...issue });
};
