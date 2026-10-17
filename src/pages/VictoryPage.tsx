import { ArrowLeft, Check, Coins, Copy, ShieldCheck, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BossScene } from '../components/arena/BossScene';
import { PartyList } from '../components/battle/PartyList';
import { ScanLabel, SeverityBadge } from '../components/ui/Badges';
import { Shell } from '../components/ui/Shell';
import { bossSizeScale, bossVariant, highestSeverity } from '../lib/game-rules';
import { battleStats, useBattleStore } from '../store/useBattleStore';

export function VictoryPage() {
  const { battleId = '' } = useParams();
  const battle = useBattleStore((s) => s.battles[battleId]);
  const me = useBattleStore((s) => s.me);
  const reducedMotion = useBattleStore((s) => s.reducedMotion);
  const [copied, setCopied] = useState(false);

  if (!battle) {
    return (
      <Shell>
        <p className="mt-16 text-center">
          Battle not found. <Link to="/" className="text-cyan">Home</Link>
        </p>
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
      <div className="grid grid-cols-1 gap-4 pt-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-4">
          <div className="panel relative h-[42vh] min-h-[280px] overflow-hidden">
            <BossScene
              severity={severity}
              scale={bossSizeScale(battle.findings.length)}
              hpRatio={0}
              hitKey={0}
              defeated={defeated}
              reducedMotion={reducedMotion}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="pointer-events-none absolute inset-x-0 top-6 text-center"
            >
              <p className="label text-emerald">{defeated ? 'Raid complete' : 'Raid in progress'}</p>
              <h1 className="mt-1 font-display text-4xl font-bold sm:text-5xl">
                {defeated ? (
                  <>
                    <Trophy className="mb-1 mr-2 inline text-amber" size={36} aria-hidden />
                    Victory!
                  </>
                ) : (
                  'Not yet…'
                )}
              </h1>
              <p className="mt-1 text-sm text-sand/80">
                {variant.name} {defeated ? 'has fallen' : 'still stands'} · {battle.repositoryId}
              </p>
            </motion.div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Stat label="HP cleared" value={`${defeated ? maxHP : '—'}`} />
            <Stat label="Verified fixes" value={`${verifiedCount}/${battle.quests.length}`} />
            <Stat label="Time to victory" value={minutes ? `${minutes} min` : '—'} />
          </div>

          <section className="panel p-5" aria-labelledby="changes-title">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 id="changes-title" className="font-display text-lg font-semibold">
                Security changes
              </h2>
              <ScanLabel label={battle.label} />
            </div>
            <ul className="space-y-3">
              {battle.quests.map((q) => {
                const f = battle.findings.find((x) => x.id === q.findingId)!;
                const by = battle.participants.find((p) => p.id === q.claimedBy)?.nickname;
                return (
                  <li key={q.id} className="flex gap-3 rounded-xl border border-white/8 bg-obsidian/50 p-3">
                    <ShieldCheck size={18} className={q.status === 'verified' ? 'text-emerald' : 'text-mist'} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <SeverityBadge severity={f.severity} />
                        <span className="font-medium">{f.title}</span>
                      </div>
                      <p className="mt-1 text-sm text-sand/75">{f.remediationSummary}</p>
                      <p className="mt-1 font-mono text-[11px] text-mist">
                        {q.status === 'verified' && q.receipt
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
          <section className="panel p-4">
            <h2 className="label mb-3">Contributors</h2>
            <PartyList participants={battle.participants} me={me} />
          </section>
          <section className="panel p-4">
            <h2 className="label mb-2">Share</h2>
            <p className="text-sm text-sand/85">{shareText}</p>
            <button
              className="btn-ghost mt-3 text-sm"
              onClick={async () => {
                await navigator.clipboard?.writeText(`${shareText} ${window.location.origin}/battle/${battle.id}`);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />} {copied ? 'Copied' : 'Copy share text'}
            </button>
          </section>
          <section className="panel border-dashed p-4">
            <h2 className="flex items-center gap-2 font-display font-semibold">
              <Coins size={16} className="text-amber" aria-hidden /> Bounties: coming soon
            </h2>
            <p className="mt-1 text-sm text-mist">Funded, owner-approved remediation bounties are on the roadmap. No payouts today.</p>
          </section>
          <Link to={`/battle/${battle.id}`} className="btn-ghost w-full">
            <ArrowLeft size={14} aria-hidden /> Back to arena
          </Link>
        </aside>
      </div>
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel p-3 text-center">
      <p className="font-display text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-mist">{label}</p>
    </div>
  );
}
