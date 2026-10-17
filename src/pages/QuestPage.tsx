import { FormEvent, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BossHealthBar } from "../components/battle/BossHealthBar";
import { btnGhost, btnPrimary, Shell } from "../components/layout/Shell";
import { HintPanel } from "../components/mentor/HintPanel";
import { VERIFY_MS } from "../data/demo";
import { bossStats, SEVERITY_LABEL } from "../lib/game-rules";
import { findQuest, useBattleStore } from "../store/useBattleStore";

export function QuestPage() {
  const { questId = "" } = useParams();
  const navigate = useNavigate();
  const battles = useBattleStore((state) => state.battles);
  const closeIssue = useBattleStore((state) => state.closeIssue);
  const beginVerify = useBattleStore((state) => state.beginVerify);
  const completeVerify = useBattleStore((state) => state.completeVerify);
  const revealHint = useBattleStore((state) => state.revealHint);
  const found = findQuest(battles, questId);
  const [issueOpen, setIssueOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [verifying, setVerifying] = useState(false);

  if (!found) {
    return (
      <Shell>
        <div className="frame max-w-lg p-6">
          <h1 className="font-display text-2xl font-semibold">Quest not found</h1>
          <Link to="/" className={`${btnPrimary} mt-4`}>
            Back home
          </Link>
        </div>
      </Shell>
    );
  }

  const { battle, quest } = found;
  const stats = bossStats(battle.quests);

  function onCloseIssue() {
    closeIssue(battle.id, quest.id);
    setNotice(`Issue #${quest.githubIssueNumber} is marked closed. The boss still has ${stats.currentHP} HP.`);
  }

  function onVerify(event: FormEvent) {
    event.preventDefault();
    const started = beginVerify(battle.id, quest.id);
    if (!started) return;
    setVerifying(true);
    setNotice("Running the mocked regression test…");
    window.setTimeout(() => {
      const result = completeVerify(battle.id, quest.id);
      setVerifying(false);
      if (!result) {
        setNotice("This quest was already verified. Damage is counted once.");
        return;
      }
      if (result.defeated) {
        navigate(`/battle/${battle.id}?downed=1`);
        return;
      }
      setNotice(`Test passed. The boss lost ${result.damage} HP. A second verification will not hit again.`);
    }, VERIFY_MS);
  }

  return (
    <Shell wide>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link to={`/battle/${battle.id}`} className="text-sm text-cyan">
          ← Arena
        </Link>
        <p className="text-xs uppercase tracking-[0.16em] text-sand/45">{battle.repository}</p>
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.25fr)_340px]">
        <article className="frame p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <p className="kicker">
              {SEVERITY_LABEL[quest.severity]} · {quest.cwe}
            </p>
            <p className="font-display text-3xl font-semibold text-ember">{quest.damage} HP</p>
          </div>
          <h1 className="mt-3 font-display text-4xl font-semibold leading-tight">{quest.questTitle}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-sand/85">{quest.plainEnglishExplanation}</p>
          <p className="mt-4 border-l-2 border-cyan pl-3 text-sm text-sand/75">Learning goal: {quest.learningGoal}</p>
          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-sand/50">Safe summary</dt>
              <dd>{quest.safeSummary}</dd>
            </div>
            <div>
              <dt className="text-sand/50">Remediation</dt>
              <dd>{quest.remediationSummary}</dd>
            </div>
            {quest.affectedPath ? (
              <div>
                <dt className="text-sand/50">Affected path</dt>
                <dd className="font-mono text-xs">{quest.affectedPath}</dd>
              </div>
            ) : null}
          </dl>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" className={btnGhost} onClick={() => setIssueOpen((open) => !open)}>
              {issueOpen ? "Hide issue preview" : `Preview issue #${quest.githubIssueNumber}`}
            </button>
            <button type="button" className={btnGhost} onClick={onCloseIssue} disabled={quest.issueClosed || quest.status === "verified"}>
              {quest.issueClosed ? "Issue closed · no damage" : "Close GitHub issue"}
            </button>
          </div>
          {issueOpen ? (
            <pre className="mt-4 overflow-auto rounded-xl bg-ink p-4 text-xs leading-5 text-sand/85">
{`## RepoRaid Security Quest
Severity: ${SEVERITY_LABEL[quest.severity]}
CWE: ${quest.cwe}

### What needs improving?
${quest.safeSummary}

### Goal
${quest.remediationSummary}

### Completion
A maintainer verifies the fix and the associated security test passes.

> Detailed exploit material is not included in this public task.

Demo only — this issue was not published to GitHub.`}
            </pre>
          ) : null}
          <form onSubmit={onVerify} className="mt-6 border border-emerald/40 bg-emerald/10 p-4">
            <h2 className="font-display text-lg font-semibold">Verify fix</h2>
            <p className="mt-1 text-sm text-sand/75">
              Demo fast-forward of a trusted regression test. Closing the issue does not award this hit.
            </p>
            <button type="submit" className={`${btnPrimary} mt-4`} disabled={verifying || quest.status === "verified" || quest.status === "verifying"}>
              {quest.status === "verified" ? "Already verified" : verifying || quest.status === "verifying" ? "Testing…" : "Run regression test"}
            </button>
            {verifying ? <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink"><div className="h-full w-1/2 animate-pulse bg-emerald" /></div> : null}
            {notice ? <p className="mt-3 text-sm text-sand" aria-live="polite">{notice}</p> : null}
          </form>
        </article>
        <div className="space-y-3">
          <div className="frame p-4">
            <BossHealthBar stats={stats} />
          </div>
          <HintPanel quest={quest} onRevealHint={() => revealHint(battle.id, quest.id)} />
          <ul className="frame space-y-2 p-4 text-sm">
            {quest.fixAcceptanceCriteria.map((criterion) => (
              <li key={criterion}>• {criterion}</li>
            ))}
          </ul>
        </div>
      </div>
    </Shell>
  );
}
