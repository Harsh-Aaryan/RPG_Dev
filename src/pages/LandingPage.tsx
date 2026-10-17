import { ChevronRight, Coins, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArenaView } from '../components/arena/ArenaView';
import { EmptyDais } from '../components/art/Illustrations';
import { CornerBrackets } from '../components/art/Ornaments';
import { Seal, SwordGlyph } from '../components/art/Sigils';
import { Shell } from '../components/ui/Shell';
import { demoFixture } from '../lib/fixture';
import { bossMaxHP, bossVariant, highestSeverity } from '../lib/game-rules';
import { battleStats, useBattleStore } from '../store/useBattleStore';

const STEPS = [
  { title: 'Strix finds', text: 'An authorized scan of the demo repo surfaces validated weaknesses, sanitized before anyone sees them.' },
  { title: 'Gemma teaches', text: 'Gemma 4 turns each finding into a quest with a plain-English explanation and three progressive hints.' },
  { title: 'GitHub records', text: 'Each quest becomes a safe, exploit-free issue in the team-controlled repo.' },
  { title: 'Verified fixes strike', text: 'Only a passing regression test deals damage. Closing an issue or asking the AI never does.' },
];

const NUMERALS = ['I', 'II', 'III', 'IV'];

export function LandingPage() {
  const reducedMotion = useBattleStore((s) => s.reducedMotion);
  const battles = useBattleStore((s) => s.battles);
  const deleteBattle = useBattleStore((s) => s.deleteBattle);
  const [code, setCode] = useState('');
  const navigate = useNavigate();
  const list = Object.values(battles).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const demoBoss = bossVariant(highestSeverity(demoFixture.findings));

  return (
    <Shell>
      <section className="grid grid-cols-1 items-center gap-8 pt-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)] lg:gap-12 lg:pt-16">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}>
          <h1 className="font-display text-[3.4rem] font-bold leading-[0.92] tracking-[-0.01em] text-ink sm:text-7xl lg:text-[5.4rem]">
            Every bug
            <br />
            has a boss.
          </h1>
          <p className="mt-5 font-display text-xl italic leading-snug text-copper-hi sm:text-2xl">
            Find vulnerabilities. Defeat the threat. Level up together.
          </p>
          <p className="mt-5 max-w-[34rem] text-base text-ink-2 sm:text-lg sm:leading-relaxed">
            Each unresolved finding in your repository feeds a boss. Your party learns the fix with Gemma 4, ships it, and every
            fix that passes its regression test takes HP off the boss.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link to="/create" className="btn-primary min-h-12 px-6 text-base">
              <SwordGlyph size={18} /> Start a battle
            </Link>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const id = code.trim().split('/').pop();
                if (id) navigate(`/battle/${id}`);
              }}
            >
              <label htmlFor="join-code" className="sr-only">
                Battle code or invite link
              </label>
              <input
                id="join-code"
                className="field min-h-12 w-full font-mono tracking-wider sm:w-44"
                placeholder="Battle code"
                autoComplete="off"
                spellCheck={false}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <button className="btn-secondary min-h-12 px-4" disabled={!code.trim()}>
                Join battle
              </button>
            </form>
          </div>
        </motion.div>

        <motion.div
          className="plate relative h-[340px] sm:h-[460px] lg:h-[520px]"
          style={{ ['--cut' as string]: '22px', ['--fill' as string]: '#121714', ['--edge' as string]: '#415044' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.15 }}
        >
          <div className="absolute inset-[1px] overflow-hidden [clip-path:polygon(21px_0,100%_0,100%_calc(100%-21px),calc(100%-21px)_100%,0_100%,0_21px)]">
            <ArenaView severity="critical" scale={1.28} hpRatio={1} hitKey={0} defeated={false} reducedMotion={reducedMotion} />
          </div>
          <CornerBrackets inset={12} />
          <div className="pointer-events-none absolute bottom-5 left-6 right-6 z-10 flex items-end justify-between gap-4">
            <div>
              <p className="font-display text-2xl font-bold uppercase tracking-[0.06em] text-ink drop-shadow-[0_2px_6px_rgb(0_0_0/0.9)]">
                {demoBoss.name}
              </p>
              <p className="font-display text-base italic text-ink-2">{demoBoss.title}</p>
            </div>
            <p className="text-right text-xs text-ink-2 drop-shadow-[0_1px_3px_rgb(0_0_0/0.9)]">
              Born from {demoFixture.findings.length} findings
              <span className="block font-mono text-ink-3">{bossMaxHP(demoFixture.findings)} HP</span>
            </p>
          </div>
        </motion.div>
      </section>

      <section className="mt-20" aria-labelledby="raids-title">
        <h2 id="raids-title" className="rule-heading mb-4 text-2xl">
          Your raids
        </h2>
        {list.length > 0 ? (
          <ul className="grid gap-3 md:grid-cols-2">
            {list.map((b) => {
              const { hp, maxHP } = battleStats(b);
              const defeated = b.status === 'defeated';
              return (
                <li key={b.id} className="frame group flex items-center gap-4 p-4 transition-colors hover:border-line">
                  <Link to={`/battle/${b.id}`} className="flex min-w-0 flex-1 items-center gap-4 rounded-xs">
                    {defeated ? (
                      <Seal size={38} className="shrink-0 -rotate-6" />
                    ) : (
                      <span className="grid h-[38px] w-[38px] shrink-0 place-items-center border border-line-soft bg-abyss text-ember">
                        <SwordGlyph size={18} />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-xl font-semibold leading-tight text-ink">{b.name}</span>
                      <span className="mt-1 flex items-center gap-3 text-xs text-ink-3">
                        <span className="truncate font-mono">{b.repositoryId}</span>
                        <span className="font-mono text-ink-2">{b.id}</span>
                      </span>
                      <span className="mt-2 flex items-center gap-2">
                        <span className="h-1 flex-1 bg-abyss">
                          <span
                            className={`block h-full ${defeated ? 'bg-sage/70' : 'bg-ember'}`}
                            style={{ width: `${defeated ? 100 : maxHP ? (hp / maxHP) * 100 : 0}%` }}
                          />
                        </span>
                        <span className="shrink-0 font-mono text-[0.7rem] tabular-nums text-ink-2">
                          {defeated ? 'Defeated' : `${hp} / ${maxHP} HP`}
                        </span>
                      </span>
                    </span>
                    <ChevronRight size={16} className="shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-copper" aria-hidden />
                  </Link>
                  <button className="btn-ghost shrink-0 px-2" aria-label={`Delete ${b.name}`} title="Delete this raid from this device" onClick={() => deleteBattle(b.id)}>
                    <Trash2 size={14} aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="frame flex flex-col items-center gap-2 px-6 py-8 text-center sm:flex-row sm:gap-6 sm:text-left">
            <EmptyDais className="h-20 w-36 shrink-0" />
            <div>
              <p className="font-display text-xl font-semibold text-ink">The arena is quiet.</p>
              <p className="mt-1 text-sm text-ink-2">Start a battle to summon a boss from the demo repo, or join one with the code your host shares.</p>
            </div>
          </div>
        )}
      </section>

      <section className="mt-20" aria-labelledby="how-title">
        <h2 id="how-title" className="rule-heading mb-8 text-2xl">
          How a raid works
        </h2>
        <ol className="relative grid gap-8 md:grid-cols-4 md:gap-6">
          <span className="absolute left-[19px] top-2 bottom-2 w-px bg-line md:left-5 md:right-5 md:top-[19px] md:bottom-auto md:h-px md:w-auto" aria-hidden />
          {STEPS.map(({ title, text }, i) => (
            <li key={title} className="relative flex gap-4 md:flex-col md:gap-3">
              <span className="relative grid h-10 w-10 shrink-0 place-items-center" aria-hidden>
                <svg viewBox="0 0 40 40" className="absolute inset-0">
                  <path d="M20 2 38 20 20 38 2 20Z" fill="#181f1b" stroke={i === 3 ? '#c99460' : '#415044'} strokeWidth="1.5" />
                </svg>
                <span className={`relative font-display text-sm font-bold ${i === 3 ? 'text-copper' : 'text-ink-2'}`}>{NUMERALS[i]}</span>
              </span>
              <div>
                <h3 className="font-display text-xl font-semibold text-ink">{title}</h3>
                <p className="mt-1 text-sm text-ink-2">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-16 flex flex-col gap-3 border-y border-line-soft py-5 sm:flex-row sm:items-center sm:gap-5" aria-labelledby="bounty-title">
        <Coins className="shrink-0 text-gold" size={22} aria-hidden />
        <div className="flex-1">
          <h2 id="bounty-title" className="font-display text-lg font-semibold text-ink">
            RepoRaid Bounties <span className="tag ml-2 align-middle font-sans text-gold">Coming soon</span>
          </h2>
          <p className="text-sm text-ink-2">
            Maintainer-funded, owner-approved remediation bounties with verified payouts. Not live yet: no payments are processed today.
          </p>
        </div>
      </section>
    </Shell>
  );
}
