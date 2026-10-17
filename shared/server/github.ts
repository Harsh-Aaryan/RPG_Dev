import { Octokit } from '@octokit/rest';
import type { PrEvidence } from './pr-verify';

/** owner/name of the team-controlled demo repo, or null when GitHub isn't configured. */
export function demoRepo(): { owner: string; repo: string; fullName: string } | null {
  const full = process.env.GITHUB_REPO;
  if (!process.env.GITHUB_TOKEN || !full || !/^[\w.-]+\/[\w.-]+$/.test(full)) return null;
  const [owner, repo] = full.split('/');
  return { owner, repo, fullName: full };
}

/** Everything the verifier needs about a PR, read with the server's fine-grained token. */
export async function fetchPrEvidence(prNumber: number): Promise<PrEvidence> {
  const target = demoRepo();
  if (!target) throw new Error('GitHub is not configured');
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const { owner, repo } = target;

  const pr = await octokit.pulls.get({ owner, repo, pull_number: prNumber });
  const files = await octokit.paginate(octokit.pulls.listFiles, { owner, repo, pull_number: prNumber, per_page: 100 });
  const checks = await octokit.paginate(octokit.checks.listForRef, { owner, repo, ref: pr.data.head.sha, per_page: 100 });

  return {
    number: prNumber,
    headSha: pr.data.head.sha,
    baseRepo: pr.data.base.repo.full_name,
    files: files.flatMap((f) => [f.filename, ...(f.previous_filename ? [f.previous_filename] : [])]),
    checks: checks.map((c) => ({
      name: c.name,
      status: c.status,
      conclusion: c.conclusion ?? null,
      appSlug: c.app?.slug ?? null,
      url: c.html_url ?? null,
    })),
  };
}
