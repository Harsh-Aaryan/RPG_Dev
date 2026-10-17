import { ArrowLeft, Check, ExternalLink, FlaskConical, GitPullRequest, ScrollText, Wand2, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { RULES } from '../../shared/verifier';
import { Emblem } from '../components/art/Emblem';
import { Seal, SwordGlyph } from '../components/art/Sigils';
import { HintPanel } from '../components/mentor/HintPanel';
import { SeverityBadge, SourceBadge } from '../components/ui/Badges';
import { Shell } from '../components/ui/Shell';
import { Spinner } from '../components/ui/Spinner';
import { createGithubIssue, verifyFix } from '../lib/api-client';
import { SEVERITY_STYLE } from '../lib/game-rules';
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
        <div className="frame mx-auto mt-16 max-w-md p-7 text-center">
          <Emblem size={36} className="mx-auto" />
          <h1 className="mt-3 font-display text-2xl font-bold text-ink">This quest isn't on this device</h1>
          <p className="mt-2 text-sm text-ink-2">Quests live with their battle. Open the battle first, then pick the quest from its board.</p>
          <Link to={battle ? `/battle/${battleId}` : '/'} className="btn-secondary mt-5">
            {battle ? 'Back to the arena' : 'Back to raids'}
          </Link>
        </div>
      </Shell>
    );
  }

  const isHost = myRole(battle, me) === 'host';
  const verified = quest.status === 'verified';
  const rule = RULES[finding.ruleId];
  const sev = SEVERITY_STYLE[finding.severity];
  const claimedByMe = quest.claimedBy === me;
  const claimer = battle.participants.find((p) => p.id === quest.claimedBy)?.nickname;

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
      <div className="pt-5">
        <Link to={`/battle/${battleId}`} className="inline-flex items-center gap-1.5 rounded-xs text-sm text-ink-2 hover:text-ink">
          <ArrowLeft size={14} aria-hidden /> Back to the arena
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_25rem]">
        <div className="min-w-0 space-y-6">
          <section className="frame relative overflow-hidden p-6 sm:p-7">
            <span className={`absolute inset-y-0 left-0 w-[3px] ${verified ? 'bg-sage/70' : sev.bar}`} aria-hidden />
            {verified && (
              <span className="pointer-events-none absolute right-5 top-5" aria-hidden>
                <Seal size={64} className="-rotate-[8deg]" />
              </span>
            )}
            <div className="flex flex-wrap items-center gap-2 pr-16">
              <SeverityBadge severity={finding.severity} size="md" />
              <SourceBadge source={quest.source} model={quest.model} long />
              {finding.cwe && <span className="tag font-mono">{finding.cwe}</span>}
              <span className="tag text-[#e39a8d]">
                <SwordGlyph size={13} /> {quest.damage} damage
              </span>
            </div>
            <h1 className="mt-4 font-display text-4xl font-bold leading-[1.02] text-ink sm:text-5xl">{quest.content.questTitle}</h1>
            <p className="mt-2 text-sm text-ink-3">
              {finding.title} in{' '}
              <span className="font-mono text-ink-2">
                {finding.affectedPath}
                {finding.line ? `:${finding.line}` : ''}
              </span>
            </p>
            <p className="mt-5 max-w-[65ch] leading-relaxed text-ink">{quest.content.plainEnglishExplanation}</p>

            <div className="mt-6 border-l-2 border-copper/70 bg-copper/[0.05] py-3 pl-4 pr-3">
              <p className="text-sm font-semibold text-copper-hi">Learning goal</p>
              <p className="mt-1 text-sm text-ink">{quest.content.learningGoal}</p>
            </div>

            <div className="mt-6">
              <h2 className="text-sm font-semibold text-ink">Acceptance criteria</h2>
              <ul className="mt-2 space-y-1.5 text-sm text-ink-2">
                {quest.content.fixAcceptanceCriteria.map((c) => (
                  <li key={c} className="flex gap-2.5">
                    <svg width="10" height="10" viewBox="0 0 10 10" className="mt-1.5 shrink-0" aria-hidden>
                      <path d="M5 0.8 9.2 5 5 9.2 0.8 5Z" fill={verified ? '#82a58a' : 'none'} stroke={verified ? '#82a58a' : '#c99460'} strokeWidth="1.2" />
                    </svg>
                    {c}
                  </li>
                ))}
              </ul>
            </div>

            {!verified &&
              (claimedByMe ? (
                <p className="mt-6 inline-flex items-center gap-2 text-sm text-copper">
                  <Check size={15} aria-hidden /> You've accepted this quest. Forge a fix below.
                </p>
              ) : (
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button className="btn-primary min-h-11 px-5" onClick={() => claimQuest(battleId, questId)}>
                    <ScrollText size={16} aria-hidden /> Accept quest
                  </button>
                  {claimer && <span className="text-sm text-ink-3">{claimer} has accepted it. Accepting moves the claim to you.</span>}
                </div>
              ))}
          </section>

          <section className="frame p-6 sm:p-7" aria-labelledby="forge-title">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
              <h2 id="forge-title" className="font-display text-2xl font-semibold text-ink">
                Patch forge
              </h2>
              {isHost && !verified && rule && (
                <button className="btn-ghost text-xs" onClick={() => setCode(rule.referencePatch)} title="Host-only demo shortcut">
                  <Wand2 size={13} aria-hidden /> Load reference patch (host demo)
                </button>
              )}
            </div>
            <p className="mb-4 text-sm text-ink-2">
              Edit <span className="font-mono text-ink">{finding.affectedFunction}()</span> from{' '}
              <span className="font-mono text-ink">{finding.affectedPath}</span>, then run the regression test. Only a passing test deals
              damage.
            </p>

            <div className="well overflow-hidden">
              <div className="flex items-center gap-2 border-b border-line-soft bg-night-2 px-3 py-1.5 font-mono text-[0.7rem] text-ink-3">
                <span className="h-2 w-2 rotate-45 bg-copper/70" aria-hidden />
                {finding.affectedPath}
                <span className="text-ink-2">› {finding.affectedFunction}()</span>
              </div>
              <label htmlFor="patch" className="sr-only">
                Proposed fix
              </label>
              <textarea
                id="patch"
                className="block h-60 w-full resize-y bg-transparent p-3.5 font-mono text-[13px] leading-relaxed text-ink outline-none placeholder:text-ink-3 focus-visible:shadow-[inset_0_0_0_1px_var(--color-copper)] disabled:opacity-60"
                spellCheck={false}
                value={code}
                disabled={verified}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4">
              <button className="btn-primary min-h-11 px-5" onClick={runVerify} disabled={busy !== null || verified || !code.trim()}>
                {busy === 'verify' ? <Spinner size={16} /> : <FlaskConical size={16} aria-hidden />}
                {busy === 'verify' ? 'Running the test…' : 'Run regression test'}
              </button>
              <span className="text-xs text-ink-3">
                Attempts <span className="font-mono text-ink-2">{quest.attempts}</span>
              </span>
            </div>

            {tests && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="well mt-5 p-4">
                <p className="mb-3 font-mono text-xs text-ink-3">
                  regression {finding.ruleId} · {offline ? 'local verifier (API offline, unsigned)' : 'server verifier'}
                </p>
                <ul className="space-y-2 font-mono text-xs">
                  {tests.map((t) => (
                    <li key={t.name} className="flex gap-2.5">
                      {t.passed ? (
                        <Check size={14} className="mt-px shrink-0 text-sage" aria-label="pass" />
                      ) : (
                        <X size={14} className="mt-px shrink-0 text-ember" aria-label="fail" />
                      )}
                      <span>
                        <span className={t.passed ? 'text-sage' : 'text-ember'}>{t.passed ? 'PASS' : 'FAIL'}</span>{' '}
                        <span className="text-ink">{t.name}</span>
                        {!t.passed && <span className="mt-0.5 block text-ink-3">{t.detail}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {verified && quest.receipt && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-5 flex items-center gap-4 border border-sage/40 bg-sage/[0.07] p-4"
              >
                <Seal size={48} className="shrink-0 -rotate-6" />
                <div className="min-w-0">
                  <p className="font-display text-xl font-semibold text-ink">Verified fix: −{quest.damage} HP dealt</p>
                  <p className="mt-1 break-all font-mono text-[0.7rem] text-ink-3">
                    {quest.receipt.verifier} · code {quest.receipt.codeHash} · sig {quest.receipt.signature.slice(0, 16)}… ·{' '}
                    {new Date(quest.receipt.verifiedAt).toLocaleString()}
                  </p>
                </div>
              </motion.div>
            )}
            {error && (
              <p className="mt-4 text-sm text-ember" role="alert">
                {error}
              </p>
            )}
          </section>
        </div>

        <div className="space-y-5">
          <HintPanel finding={finding} quest={quest.content} />

          <section className="frame p-5" aria-labelledby="gh-title">
            <h2 id="gh-title" className="rule-heading mb-3">
              GitHub issue
            </h2>
            {quest.issue ? (
              <div className="space-y-2.5 text-sm">
                {quest.issue.mock ? (
                  <p className="text-gold">Simulated issue (no GITHUB_TOKEN configured). This is the safe body that would be posted:</p>
                ) : (
                  <a className="inline-flex items-center gap-1.5 text-copper-hi hover:underline" href={quest.issue.url} target="_blank" rel="noreferrer">
                    <GitPullRequest size={14} aria-hidden /> Issue #{quest.issue.number} <ExternalLink size={12} aria-hidden />
                  </a>
                )}
                <details>
                  <summary className="cursor-pointer text-ink-2 hover:text-ink">Issue body</summary>
                  <pre className="well mt-2 max-h-64 overflow-auto whitespace-pre-wrap p-3 font-mono text-[11px] text-ink-2">{quest.issue.body}</pre>
                </details>
              </div>
            ) : isHost ? (
              <>
                <p className="mb-3 text-sm text-ink-2">Publish an owner-approved, exploit-free remediation task to the demo repo.</p>
                <button className="btn-secondary" onClick={openIssue} disabled={busy !== null}>
                  {busy === 'issue' ? <Spinner size={14} /> : <GitPullRequest size={14} aria-hidden />}
                  Create safe issue
                </button>
              </>
            ) : (
              <p className="text-sm text-ink-3">The host hasn't published an issue for this quest yet.</p>
            )}
            <p className="mt-4 border-t border-line-soft pt-3 text-xs text-ink-3">Closing the issue alone never damages the boss.</p>
          </section>
        </div>
      </div>
    </Shell>
  );
}
