import { BadgeCheck, CircleAlert, ExternalLink, GitPullRequestArrow, Hourglass, ShieldX } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { PrResult, PrVerdict } from '../../lib/api-client';
import { getServerConfig } from '../../lib/remote';
import { Spinner } from '../ui/Spinner';

const TONE: Record<PrVerdict['outcome'], { icon: typeof BadgeCheck; className: string; label: string }> = {
  verified: { icon: BadgeCheck, className: 'border-sage/45 text-sage', label: 'Verified' },
  pending: { icon: Hourglass, className: 'border-gold/45 text-gold', label: 'Not finished' },
  rejected: { icon: CircleAlert, className: 'border-ember/45 text-ember', label: 'No damage' },
  tampered: { icon: ShieldX, className: 'border-ember/45 text-ember', label: 'Rejected' },
  wrong_repo: { icon: ShieldX, className: 'border-ember/45 text-ember', label: 'Rejected' },
};

/**
 * Host-only check of a real pull request. Damage only lands when the PR's
 * `quest-<rule>` GitHub Actions check passed and the PR leaves tests and CI alone.
 */
export function PrPanel({
  ruleId,
  isHost,
  verified,
  onVerify,
}: {
  ruleId: string;
  isHost: boolean;
  verified: boolean;
  onVerify: (prNumber: number) => Promise<{ res: PrResult }>;
}) {
  const [github, setGithub] = useState<boolean | null>(null);
  const [pr, setPr] = useState('');
  const [busy, setBusy] = useState(false);
  const [verdict, setVerdict] = useState<PrVerdict | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    void getServerConfig().then((c) => setGithub(Boolean(c?.github)));
  }, []);

  const check = `quest-${ruleId}`;

  async function submit() {
    const n = Number(pr.replace(/^#/, ''));
    if (!Number.isInteger(n) || n < 1) {
      setError('Enter the pull request number, like 12.');
      return;
    }
    setBusy(true);
    setError('');
    setVerdict(null);
    try {
      setVerdict((await onVerify(n)).res.verdict);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not check the pull request');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="frame p-5" aria-labelledby="pr-title">
      <h2 id="pr-title" className="rule-heading mb-3">
        Pull request
      </h2>
      <p className="text-sm text-ink-2">
        A real fix lands as a pull request. It deals damage only when its <span className="font-mono text-ink">{check}</span> check passes in
        GitHub Actions and it doesn't touch the tests or CI.
      </p>

      {github === false && (
        <p className="mt-3 text-xs text-ink-3">
          Not connected on this deployment (set GITHUB_TOKEN and GITHUB_REPO). The patch forge still verifies fixes.
        </p>
      )}

      {github && isHost && !verified && (
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <label htmlFor="pr-number" className="sr-only">
            Pull request number
          </label>
          <input
            id="pr-number"
            className="field w-28 font-mono"
            inputMode="numeric"
            placeholder="#12"
            value={pr}
            onChange={(e) => setPr(e.target.value)}
          />
          <button className="btn-secondary flex-1" disabled={busy || !pr.trim()}>
            {busy ? <Spinner /> : <GitPullRequestArrow size={14} aria-hidden />}
            Check pull request
          </button>
        </form>
      )}
      {github && !isHost && !verified && <p className="mt-3 text-xs text-ink-3">The host checks pull requests for this quest.</p>}

      {verdict && (
        <div className={`mt-4 border-l-2 py-2 pl-3 text-sm ${TONE[verdict.outcome].className}`} role="status">
          <p className="flex items-center gap-1.5 font-semibold">
            {(() => {
              const Icon = TONE[verdict.outcome].icon;
              return <Icon size={14} aria-hidden />;
            })()}
            {TONE[verdict.outcome].label}
          </p>
          <p className="mt-1 text-ink-2">{verdict.detail}</p>
          {verdict.check?.url && (
            <a className="mt-1 inline-flex items-center gap-1 text-xs text-copper-hi hover:underline" href={verdict.check.url} target="_blank" rel="noreferrer">
              Open the check run <ExternalLink size={11} aria-hidden />
            </a>
          )}
        </div>
      )}
      {error && (
        <p className="mt-3 text-sm text-ember" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
