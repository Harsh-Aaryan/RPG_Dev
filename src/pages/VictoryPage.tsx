import { ArrowLeft, Check, Coins, Copy } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArenaView } from '../components/arena/ArenaView';
import { Emblem } from '../components/art/Emblem';
import { VictoryCrest } from '../components/art/Illustrations';
import { CornerBrackets } from '../components/art/Ornaments';
import { Seal } from '../components/art/Sigils';
import { PartyList } from '../components/battle/PartyList';
import { ScanLabel, SeverityBadge } from '../components/ui/Badges';
import { Shell } from '../components/ui/Shell';
import { Spinner } from '../components/ui/Spinner';
import { useBattleSync, useMe } from '../hooks/useBattleSync';
import { bossSizeScale, bossVariant, highestSeverity } from '../lib/game-rules';
import { battleStats, useBattleStore } from '../store/useBattleStore';

export function VictoryPage() {
  const { battleId = '' } = useParams();
  const battle = useBattleStore((s) => s.battles[battleId]);
  const sync = useBattleSync(battleId);
  const me = useMe(battle);
  const reducedMotion = useBattleStore((s) => s.reducedMotion);
  const [copied, setCopied] = useState(false);

  if (!battle && sync.phase === 'loading') {
    return (
      <Shell>
        <div className="mx-auto mt-24 flex max-w-sm flex-col items-center text-center" role="status">
          <span className="text-copper">
            <Spinner size={28} />
          </span>
          <p className="mt-4 font-display text-2xl font-semibold text-ink">Gathering the raid's record…</p>
        </div>
      </Shell>
    );
  }

  if (!battle) {
    return (
      <Shell>
        <div className="frame mx-auto mt-16 max-w-md p-7 text-center">
          <Emblem size={36} className="mx-auto" />
          <h1 className="mt-3 font-display text-2xl font-bold text-ink">This battle isn't on this device</h1>
          <p className="mt-2 text-sm text-ink-2">Victory records live with the battle they belong to.</p>
          <Link to="/" className="btn-secondary mt-5">
            Back to raids
          </Link>
        </div>
      </Shell>
    );
  }

  const { maxHP, verifiedCount } = battleStats(battle);
  const defeated = battle.status === 'defeated';
  const severity = highestSeverity(battle.findings);
  const variant = bossVariant(severity);
  const minutes = battle.defeatedAt
    ? Math.max(1, Math.round((Date.parse(battle.defeatedAt) - Date.parse(battle.createdAt)) / 60000))
    : null;
  const shareText = `We defeated ${variant.name} on RepoRaid: ${verifiedCount} verified security fixes, ${maxHP} HP of vulnerabilities cleared.`;

  return (
    <Shell wide>
      <div className="grid grid-cols-1 gap-6 pt-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          <div
            className="plate relative h-[48vh] min-h-[340px]"
            style={{ ['--cut' as string]: '22px', ['--fill' as string]: '#121714', ['--edge' as string]: defeated ? 'rgb(130 165 138 / 0.5)' : '#415044' }}
          >
            <div className="absolute inset-[1px] overflow-hidden [clip-path:polygon(21px_0,100%_0,100%_calc(100%-21px),calc(100%-21px)_100%,0_100%,0_21px)]">
              <ArenaView
                severity={severity}
                scale={bossSizeScale(battle.findings.length)}
                hpRatio={0}
                hitKey={0}
                defeated={defeated}
                reducedMotion={reducedMotion}
                hudInset={0.12}
              >
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col items-center bg-gradient-to-b from-night/90 via-night/50 to-transparent px-4 pb-14 pt-6 text-center"
                >
                  {defeated && (
                    <div className="relative overflow-hidden">
                      <VictoryCrest className="h-20 w-20 sm:h-24 sm:w-24" />
                      {!reducedMotion && (
                        <span
                          className="absolute inset-y-0 left-0 w-1/3 animate-shimmer bg-gradient-to-r from-transparent via-[#fff1dc]/25 to-transparent"
                          aria-hidden
                        />
                      )}
                    </div>
                  )}
                  <h1 className="mt-2 font-display text-5xl font-bold uppercase tracking-[0.06em] text-ink drop-shadow-[0_2px_8px_rgb(0_0_0/0.9)] sm:text-6xl">
                    {defeated ? 'Victory' : 'Not yet'}
                  </h1>
                  <p className="mt-1 font-display text-lg italic text-ink-2">
                    {variant.name} {defeated ? 'has fallen' : 'still stands'} in <span className="font-mono not-italic text-base">{battle.repositoryId}</span>
                  </p>
                </motion.div>
              </ArenaView>
            </div>
            <CornerBrackets inset={12} />
          </div>

          <dl className="grid grid-cols-3 divide-x divide-line-soft border-y border-line-soft">
            <Stat label="HP cleared" value={`${defeated ? maxHP : '—'}`} />
            <Stat label="Verified fixes" value={`${verifiedCount}/${battle.quests.length}`} />
            <Stat label="Time to victory" value={minutes ? `${minutes} min` : '—'} />
          </dl>

          <section className="frame p-6" aria-labelledby="changes-title">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 id="changes-title" className="font-display text-2xl font-semibold text-ink">
                Security changes
              </h2>
              <ScanLabel label={battle.label} />
            </div>
            <ul className="divide-y divide-line-soft">
              {battle.quests.map((q) => {
                const f = battle.findings.find((x) => x.id === q.findingId)!;
                const by = battle.participants.find((p) => p.id === q.claimedBy)?.nickname;
                const done = q.status === 'verified';
                return (
                  <li key={q.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                    {done ? (
                      <Seal size={36} className="shrink-0 -rotate-6" />
                    ) : (
                      <span className="grid h-9 w-9 shrink-0 place-items-center border border-dashed border-line text-xs text-ink-3" aria-label="Unresolved">
                        ?
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <SeverityBadge severity={f.severity} />
                        <span className="font-medium text-ink">{f.title}</span>
                      </div>
                      <p className="mt-1.5 text-sm text-ink-2">{f.remediationSummary}</p>
                      <p className="mt-1.5 font-mono text-[0.7rem] text-ink-3">
                        {done && q.receipt
                          ? `verified by ${q.receipt.verifier} verifier · code ${q.receipt.codeHash}${by ? ` · ${by}` : ''}`
                          : 'unresolved'}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="frame p-5" aria-labelledby="contrib-title">
            <h2 id="contrib-title" className="rule-heading mb-4">
              Contributors
            </h2>
            <PartyList participants={battle.participants} me={me} />
          </section>
          <section className="frame p-5" aria-labelledby="share-title">
            <h2 id="share-title" className="rule-heading mb-3">
              Share
            </h2>
            <p className="text-sm text-ink-2">{shareText}</p>
            <button
              className="btn-secondary mt-4"
              onClick={async () => {
                await navigator.clipboard?.writeText(`${shareText} ${window.location.origin}/battle/${battle.id}`);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? <Check size={14} className="text-sage" aria-hidden /> : <Copy size={14} aria-hidden />} {copied ? 'Copied' : 'Copy share text'}
            </button>
          </section>
          <section className="border-y border-line-soft py-4">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
              <Coins size={16} className="text-gold" aria-hidden /> Bounties are coming
            </h2>
            <p className="mt-1 text-sm text-ink-3">Funded, owner-approved remediation bounties are on the roadmap. No payouts today.</p>
          </section>
          <Link to={`/battle/${battle.id}`} className="btn-secondary w-full">
            <ArrowLeft size={14} aria-hidden /> Back to the arena
          </Link>
        </aside>
      </div>
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col-reverse px-3 py-4 text-center">
      <dt className="mt-1 text-xs text-ink-3">{label}</dt>
      <dd className="font-display text-3xl font-bold tabular-nums text-ink sm:text-4xl">{value}</dd>
    </div>
  );
}
