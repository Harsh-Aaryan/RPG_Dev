import { Octokit } from '@octokit/rest';
import { issueBody, QuestContentSchema } from '../../shared/quest';
import { isHost, json, methodNotAllowed, readJson } from '../../shared/server/http';
import type { QuestContent, SafeFinding } from '../../shared/types';

const ALLOWED_REPO = process.env.GITHUB_REPO; // owner/name of the team-controlled demo repo

export default async (req: Request) => {
  if (req.method !== 'POST') return methodNotAllowed();
  if (!isHost(req)) return json({ error: 'Host token required' }, 401);
  const b = await readJson<{ finding: SafeFinding; quest: QuestContent }>(req);
  if (!b?.finding?.id || !QuestContentSchema.safeParse(b.quest).success) {
    return json({ error: 'finding and a valid quest are required' }, 400);
  }
  const title = `[RepoRaid] ${b.quest.questTitle}`;
  const body = issueBody(b.finding, b.quest);

  if (!process.env.GITHUB_TOKEN || !ALLOWED_REPO) {
    return json({ mock: true, reason: 'GITHUB_TOKEN / GITHUB_REPO not configured', title, body });
  }

  const [owner, repo] = ALLOWED_REPO.split('/');
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const marker = `reporaid-finding:${b.finding.id}`;

  // Idempotency: reuse an existing issue for this finding fingerprint.
  const existing = await octokit.search.issuesAndPullRequests({
    q: `repo:${owner}/${repo} is:issue in:body "${marker}"`,
    per_page: 1,
  });
  const found = existing.data.items[0];
  if (found) return json({ mock: false, reused: true, number: found.number, url: found.html_url, title, body });

  const created = await octokit.issues.create({ owner, repo, title, body, labels: ['security', 'reporaid'] });
  return json({ mock: false, number: created.data.number, url: created.data.html_url, title, body });
};
