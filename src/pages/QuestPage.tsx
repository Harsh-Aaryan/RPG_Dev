import { ArrowLeft, CheckCircle2, ExternalLink, FlaskConical, GitPullRequest, Loader2, ShieldCheck, Sparkles, Swords, Wand2, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { RULES } from '../../shared/verifier';
import { HintPanel } from '../components/mentor/HintPanel';
import { SeverityBadge, SourceBadge } from '../components/ui/Badges';
import { Shell } from '../components/ui/Shell';
import { createGithubIssue, verifyFix } from '../lib/api-client';
import type { TestResult } from '../lib/types';
import { myRole, useBattleStore } from '../store/useBattleStore';

export function QuestPage() {
  const { battleId = '', questId = '' } = useParams();
  const navigate = useNavigate();
  const battle = useBattleStore((s) => s.battles[battleId]);
  const me = useBattleStore((s) => s.me);
  const { claimQuest, attachIssue, recordAttempt, applyVerifiedHit } = useBattleStore.getState();

  const quest = battle?.quests.find((q) => q.id === questId);
  const finding = battle?.findings.find((f) => f.id === quest?.findingId);
  const [code, setCode] = useState(finding?.codeExcerpt ?? '');
  const [tests, setTests] = useState<TestResult[] | null>(null);
  const [offline, setOffline] = useState(false);
  const [busy, setBusy] = useState<'verify' | 'issue' | null>(null);
  const [error, setError] = useState('');

  if (!battle || !quest || !finding) {
    return (
      <Shell>
        <div className="panel mx-auto mt-16 max-w-md p-6 text-center">
          <p>Quest not found on this device.</p>
          <Link to={battle ? `/battle/${battleId}` : '/'} className="btn-ghost mt-4">
            Back
          </Link>
        </div>
      </Shell>
    );
  }

  const isHost = myRole(battle, me) === 'host';
  const verified = quest.status === 'verified';
  const rule = RULES[finding.ruleId];

  async function runVerify() {
    setBusy('verify');
    setError('');
    try {
      const res = await verifyFix({ battleId, questId, findingId: finding!.id, ruleId: finding!.ruleId, code });
      setTests(res.tests);
      setOffline(!!res.offline);
      recordAttempt(battleId, questId, res.passed);
      if (res.passed && res.receipt) {
        const hit = applyVerifiedHit(battleId, questId, res.receipt);
        if (hit) setTimeout(() => navigate(`/battle/${battleId}`, { state: { strike: hit.id } }), 1200);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed to run');
    } finally {
      setBusy(null);
    }
  }

  async function openIssue() {
    setBusy('issue');
    setError('');
    try {
      attachIssue(battleId, questId, await createGithubIssue(finding!, quest!.content));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create issue');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Shell wide>
      <div className="pt-4">
        <Link to={`/battle/${battleId}`} className="inline-flex items-center gap-1 text-sm text-mist hover:text-sand">
          <ArrowLeft size={14} aria-hidden /> Back to arena
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-4">
          <section className="panel p-5">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={finding.severity} />
              <SourceBadge source={quest.source} model={quest.model} />
              <span className="chip border-white/15 text-mist">{finding.cwe}</span>
              <span className="chip border-coral/40 text-coral">
                <Swords size={12} aria-hidden /> {quest.damage} damage
              </span>
              {verified && (
                <span className="chip border-emerald/50 bg-emerald/10 text-emerald">
                  <CheckCircle2 size={12} aria-hidden /> Verified
                </span>
              )}
            </div>
            <h1 className="mt-3 font-display text-2xl font-bold sm:text-3xl">{quest.content.questTitle}</h1>
            <p className="mt-1 text-sm text-mist">
              {finding.title} · <span className="font-mono">{finding.affectedPath}{finding.line ? `:${finding.line}` : ''}</span>
            </p>
            <p className="mt-4 leading-relaxed text-sand/90">{quest.content.plainEnglishExplanation}</p>
            <div className="mt-4 rounded-xl border border-violet/30 bg-violet/10 p-3">
              <p className="label text-violet">Learning goal</p>
              <p className="mt-1 text-sm">{quest.content.learningGoal}</p>
            </div>
            <div className="mt-4">
              <p className="label mb-2">Acceptance criteria</p>
              <ul className="space-y-1 text-sm">
                {quest.content.fixAcceptanceCriteria.map((c) => (
                  <li key={c} className="flex gap-2">
                    <span className="text-violet" aria-hidden>◆</span> {c}
                  </li>
                ))}
              </ul>
            </div>
            {!verified && quest.claimedBy !== me && (
              <button className="btn-primary mt-5" onClick={() => claimQuest(battleId, questId)}>
                <Sparkles size={16} aria-hidden /> Accept quest
              </button>
            )}
          </section>

          <section className="panel p-5" aria-labelledby="forge-title">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 id="forge-title" className="font-display text-lg font-semibold">
                Patch forge
              </h2>
              {isHost && !verified && rule && (
                <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setCode(rule.referencePatch)} title="Host-only demo shortcut">
                  <Wand2 size={13} aria-hidden /> Load reference patch (host demo)
                </button>
              )}
            </div>
            <p className="mb-2 text-sm text-mist">
              Edit <span className="font-mono">{finding.affectedFunction}()</span> from{' '}
              <span className="font-mono">{finding.affectedPath}</span>, then run the regression test. Only a passing test deals damage.
            </p>
            <label htmlFor="patch" className="sr-only">
              Proposed fix
            </label>
            <textarea
              id="patch"
              className="input h-56 resize-y font-mono text-[13px] leading-relaxed"
              spellCheck={false}
              value={code}
              disabled={verified}
              onChange={(e) => setCode(e.target.value)}
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button className="btn-primary" onClick={runVerify} disabled={busy !== null || verified || !code.trim()}>
                {busy === 'verify' ? <Loader2 size={16} className="animate-spin" /> : <FlaskConical size={16} aria-hidden />}
                Run regression test
              </button>
              <span className="text-xs text-mist">Attempts: {quest.attempts}</span>
            </div>

            {tests && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 rounded-xl border border-white/10 bg-[#0a0c14] p-3">
                <p className="mb-2 font-mono text-xs text-mist">
                  regression {finding.ruleId} · {offline ? 'local verifier (API offline, unsigned)' : 'server verifier'}
                </p>
                <ul className="space-y-1.5 font-mono text-xs">
                  {tests.map((t) => (
                    <li key={t.name} className="flex gap-2">
                      {t.passed ? (
                        <CheckCircle2 size={14} className="shrink-0 text-emerald" aria-label="pass" />
                      ) : (
                        <XCircle size={14} className="shrink-0 text-coral" aria-label="fail" />
                      )}
                      <span>
                        <span className={t.passed ? 'text-sand' : 'text-coral'}>{t.passed ? 'PASS' : 'FAIL'}</span> {t.name}
                        {!t.passed && <span className="block text-mist">{t.detail}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {verified && quest.receipt && (
              <div className="mt-4 rounded-xl border border-emerald/40 bg-emerald/10 p-3 text-sm">
                <p className="flex items-center gap-2 font-medium text-emerald">
                  <ShieldCheck size={16} aria-hidden /> Verified fix: −{quest.damage} HP dealt
                </p>
                <p className="mt-1 font-mono text-[11px] text-mist">
                  {quest.receipt.verifier} · code {quest.receipt.codeHash} · sig {quest.receipt.signature.slice(0, 16)}… ·{' '}
                  {new Date(quest.receipt.verifiedAt).toLocaleString()}
                </p>
              </div>
            )}
            {error && <p className="mt-3 text-sm text-coral">{error}</p>}
          </section>
        </div>

        <div className="space-y-4">
          <HintPanel finding={finding} quest={quest.content} />

          <section className="panel p-4" aria-labelledby="gh-title">
            <h2 id="gh-title" className="mb-2 flex items-center gap-2 font-display font-semibold">
              <GitPullRequest size={16} aria-hidden /> GitHub issue
            </h2>
            {quest.issue ? (
              <div className="space-y-2 text-sm">
                {quest.issue.mock ? (
                  <p className="text-amber">Simulated issue (no GITHUB_TOKEN configured). Here is the safe body that would be posted:</p>
                ) : (
                  <a className="inline-flex items-center gap-1 text-cyan hover:underline" href={quest.issue.url} target="_blank" rel="noreferrer">
                    Issue #{quest.issue.number} <ExternalLink size={12} aria-hidden />
                  </a>
                )}
                <details>
                  <summary className="cursor-pointer text-mist">Issue body</summary>
                  <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-obsidian/70 p-2 font-mono text-[11px] text-sand/85">
                    {quest.issue.body}
                  </pre>
                </details>
              </div>
            ) : isHost ? (
              <>
                <p className="mb-3 text-sm text-mist">Publish an owner-approved, exploit-free remediation task to the demo repo.</p>
                <button className="btn-ghost text-sm" onClick={openIssue} disabled={busy !== null}>
                  {busy === 'issue' ? <Loader2 size={14} className="animate-spin" /> : <GitPullRequest size={14} aria-hidden />}
                  Create safe issue
                </button>
              </>
            ) : (
              <p className="text-sm text-mist">The host hasn't published an issue for this quest yet.</p>
            )}
            <p className="mt-3 text-xs text-mist">Closing the issue alone never damages the boss.</p>
          </section>
        </div>
      </div>
    </Shell>
  );
}
