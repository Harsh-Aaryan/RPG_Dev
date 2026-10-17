import { Bot, Coins, GitPullRequest, ScanSearch, ShieldCheck, Swords, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BossScene } from '../components/arena/BossScene';
import { Shell } from '../components/ui/Shell';
import { battleStats, useBattleStore } from '../store/useBattleStore';

const STEPS = [
  { icon: ScanSearch, title: 'Strix finds', text: 'An authorized scan of the demo repo surfaces validated weaknesses, sanitized before anyone sees them.' },
  { icon: Bot, title: 'Gemma teaches', text: 'Gemma 4 turns each finding into a quest with a plain-English explanation and three progressive hints.' },
  { icon: GitPullRequest, title: 'GitHub records', text: 'Each quest becomes a safe, exploit-free issue in the team-controlled repo.' },
  { icon: ShieldCheck, title: 'Verified fixes strike', text: 'Only a passing regression test deals damage. Closing an issue or asking the AI never does.' },
];

export function LandingPage() {
  const reducedMotion = useBattleStore((s) => s.reducedMotion);
  const battles = useBattleStore((s) => s.battles);
  const deleteBattle = useBattleStore((s) => s.deleteBattle);
  const [code, setCode] = useState('');
  const navigate = useNavigate();
  const list = Object.values(battles).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <Shell>
      <section className="grid grid-cols-1 items-center gap-6 pt-6 lg:grid-cols-[1.05fr_1fr] lg:pt-12">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="label mb-3 text-cyan">Multiplayer security boss fights</p>
          <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            Defeat vulnerabilities.
            <br />
            <span className="bg-gradient-to-r from-violet via-cyan to-emerald bg-clip-text text-transparent">Level up security.</span>
          </h1>
          <p className="mt-4 max-w-xl text-base text-sand/80 sm:text-lg">
            Every unresolved finding in your repo feeds a low-poly boss. Your party learns the fix with Gemma 4, ships it, and
            every <strong className="text-sand">verified</strong> fix knocks off HP.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/create" className="btn-primary px-5 py-3">
              <Swords size={18} aria-hidden /> Start Battle
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
                Battle code or link
              </label>
              <input
                id="join-code"
                className="input w-40 py-3 sm:w-48"
                placeholder="Battle code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <button className="btn-ghost px-4 py-3" disabled={!code.trim()}>
                Join Battle
              </button>
            </form>
          </div>
        </motion.div>
        <div className="panel relative h-[320px] overflow-hidden sm:h-[420px]">
          <BossScene severity="critical" scale={1.28} hpRatio={1} hitKey={0} defeated={false} reducedMotion={reducedMotion} />
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-obsidian/70 px-3 py-1.5 text-xs backdrop-blur">
            <span className="font-display font-semibold">Rootkit Wyrm</span>
            <span className="text-mist"> · born from 4 findings</span>
          </div>
        </div>
      </section>

      {list.length > 0 && (
        <section className="mt-12">
          <h2 className="label mb-3">Your raids</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {list.map((b) => {
              const { hp, maxHP } = battleStats(b);
              return (
                <li key={b.id} className="panel flex items-center gap-3 p-4">
                  <Link to={`/battle/${b.id}`} className="min-w-0 flex-1">
                    <p className="truncate font-display font-semibold">{b.name}</p>
                    <p className="text-xs text-mist">
                      {b.repositoryId} · {b.status === 'defeated' ? 'Defeated' : `${hp}/${maxHP} HP`} · code{' '}
                      <span className="font-mono">{b.id}</span>
                    </p>
                  </Link>
                  <button className="btn-ghost p-2" aria-label={`Delete ${b.name}`} onClick={() => deleteBattle(b.id)}>
                    <Trash2 size={14} aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="mt-14">
        <h2 className="label mb-4">How a raid works</h2>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="panel p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="font-mono text-xs text-mist">0{i + 1}</span>
                <Icon size={18} className="text-violet" aria-hidden />
              </div>
              <h3 className="font-display font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-sand/75">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="panel mt-6 flex flex-col items-start gap-3 border-dashed p-5 sm:flex-row sm:items-center">
        <Coins className="text-amber" aria-hidden />
        <div className="flex-1">
          <h2 className="font-display font-semibold">
            RepoRaid Bounties <span className="chip ml-1 border-amber/40 text-amber">Coming soon</span>
          </h2>
          <p className="text-sm text-sand/75">
            Maintainer-funded, owner-approved remediation bounties with verified payouts. Not live: no payments are processed today.
          </p>
        </div>
      </section>
    </Shell>
  );
}
