import { Info, RotateCcw, ScrollText, Trophy, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { templateQuest } from '../../shared/quest';
import { BossScene } from '../components/arena/BossScene';
import { DamageOverlay } from '../components/arena/DamageEffect';
import { BattleFeed } from '../components/battle/BattleFeed';
import { BossHealthBar } from '../components/battle/BossHealthBar';
import { InviteQRCode } from '../components/battle/InviteQRCode';
import { PartyList } from '../components/battle/PartyList';
import { QuestCard } from '../components/battle/QuestCard';
import { ScanLabel } from '../components/ui/Badges';
import { Shell } from '../components/ui/Shell';
import { demoFixture } from '../lib/fixture';
import { bossLevel, bossSizeScale, bossVariant, highestSeverity } from '../lib/game-rules';
import { battleStats, myRole, useBattleStore } from '../store/useBattleStore';

export function BattlePage() {
  const { battleId = '' } = useParams();
  const battle = useBattleStore((s) => s.battles[battleId]);
  const me = useBattleStore((s) => s.me);
  const reducedMotion = useBattleStore((s) => s.reducedMotion);
  const reopenQuest = useBattleStore((s) => s.reopenQuest);
  const location = useLocation();
  const navigate = useNavigate();

  // Animate hits that arrive while the arena is open, plus the one we were sent here to see.
  const strikeId = useRef((location.state as { strike?: string } | null)?.strike).current;
  const seen = useRef<Set<string> | null>(null);
  const [pending, setPending] = useState<{ id: string; damage: number }[]>([]);
  const [hits, setHits] = useState<{ id: string; damage: number }[]>([]);
  const [hitKey, setHitKey] = useState(0);
  const [hpOffset, setHpOffset] = useState(0);

  useEffect(() => {
    if (!pending.length) return;
    const t = setTimeout(() => {
      setHpOffset(0);
      setHitKey((k) => k + pending.length);
      setHits(pending);
      setPending([]);
    }, 450);
    return () => clearTimeout(t);
  }, [pending]);

  useEffect(() => {
    if (!hits.length) return;
    const t = setTimeout(() => setHits([]), 1800);
    return () => clearTimeout(t);
  }, [hits]);

  useEffect(() => {
    if (!battle) return;
    const hitEvents = battle.events.filter((e) => e.type === 'hit');
    if (!seen.current) {
      seen.current = new Set(hitEvents.filter((e) => e.id !== strikeId).map((e) => e.id));
      const strike = hitEvents.find((e) => e.id === strikeId);
      if (strike) {
        // Show pre-hit HP first, then let the bar drain when the hit lands.
        setHpOffset(strike.damage ?? 0);
        navigate('.', { replace: true, state: null });
      }
    }
    const fresh = hitEvents.filter((e) => !seen.current!.has(e.id));
    if (!fresh.length) return;
    fresh.forEach((e) => seen.current!.add(e.id));
    setPending((p) => [...p, ...fresh.map((e) => ({ id: e.id, damage: e.damage ?? 0 }))]);
  }, [battle, strikeId, navigate]);

  if (!battle) return <MissingBattle battleId={battleId} />;

  const { hp, maxHP } = battleStats(battle);
  const unresolved = battle.findings.filter((f) => battle.quests.find((q) => q.findingId === f.id)?.status !== 'verified');
  const severity = highestSeverity(unresolved.length ? unresolved : battle.findings);
  const variant = bossVariant(highestSeverity(battle.findings));
  const isHost = myRole(battle, me) === 'host';
  const joined = myRole(battle, me) !== null;
  const defeated = battle.status === 'defeated';
  const shownHP = Math.min(maxHP, hp + hpOffset);

  return (
    <Shell wide>
      {!joined && <JoinModal battleId={battle.id} />}
      <div className="grid grid-cols-1 gap-4 pt-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <div className="panel relative h-[46vh] min-h-[300px] overflow-hidden lg:h-[58vh]">
            <BossScene
              severity={severity}
              scale={bossSizeScale(battle.findings.length)}
              hpRatio={maxHP ? hp / maxHP : 0}
              hitKey={hitKey}
              defeated={defeated && hits.length === 0}
              reducedMotion={reducedMotion}
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-obsidian/90 to-transparent p-4">
              <BossHealthBar
                name={variant.name}
                title={variant.title}
                level={bossLevel(maxHP)}
                hp={shownHP}
                maxHP={maxHP}
                reducedMotion={reducedMotion}
              />
            </div>
            <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-2">
              <ScanLabel label={battle.label} />
              {severity && (
                <span className="chip border-white/15 bg-obsidian/70 text-sand">
                  Threat: {unresolved.length ? severity : 'none'}
                </span>
              )}
            </div>
            {!reducedMotion && <DamageOverlay hits={hits} />}
            {defeated && hits.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 }}
                className="absolute inset-x-0 bottom-6 flex justify-center"
              >
                <Link to={`/victory/${battle.id}`} className="btn-primary px-6 py-3 text-lg">
                  <Trophy size={20} aria-hidden /> Victory! See the results
                </Link>
              </motion.div>
            )}
          </div>

          <section aria-labelledby="quests-title">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 id="quests-title" className="font-display text-lg font-semibold">
                Quests
              </h2>
              <span className="text-xs text-mist">
                {battle.quests.filter((q) => q.status === 'verified').length}/{battle.quests.length} verified
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {battle.quests.map((q) => (
                <QuestCard
                  key={q.id}
                  quest={q}
                  finding={battle.findings.find((f) => f.id === q.findingId)!}
                  claimer={battle.participants.find((p) => p.id === q.claimedBy)?.nickname}
                />
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="panel p-4">
            <h1 className="font-display text-xl font-bold">{battle.name}</h1>
            <p className="text-xs text-mist">
              {battle.repositoryId} · code <span className="font-mono text-sand">{battle.id}</span>
            </p>
          </div>
          <section className="panel p-4" aria-labelledby="party-title">
            <h2 id="party-title" className="label mb-3 flex items-center gap-2">
              <Users size={14} aria-hidden /> Party
            </h2>
            <PartyList participants={battle.participants} me={me} />
          </section>
          <section className="panel p-4">
            <h2 className="label mb-3">Invite</h2>
            <InviteQRCode battleId={battle.id} />
            <p className="mt-3 flex gap-1.5 text-xs text-mist">
              <Info size={13} className="mt-0.5 shrink-0" aria-hidden />
              Tabs on this device stay in sync. Other devices get their own copy of the demo battle until Supabase Realtime is
              configured.
            </p>
          </section>
          <section className="panel p-4" aria-labelledby="log-title">
            <h2 id="log-title" className="label mb-3 flex items-center gap-2">
              <ScrollText size={14} aria-hidden /> Battle log
            </h2>
            <BattleFeed events={battle.events} />
          </section>
          {isHost && battle.quests.some((q) => q.status === 'verified') && (
            <section className="panel p-4">
              <h2 className="label mb-2">Host controls</h2>
              <p className="mb-2 text-xs text-mist">If a fix is later invalidated, reopen its quest to restore the boss's HP.</p>
              <ul className="space-y-1.5">
                {battle.quests
                  .filter((q) => q.status === 'verified')
                  .map((q) => (
                    <li key={q.id}>
                      <button className="btn-danger w-full justify-start px-3 py-1.5 text-xs" onClick={() => reopenQuest(battle.id, q.id)}>
                        <RotateCcw size={13} aria-hidden /> Reopen “{q.content.questTitle}” (+{q.damage} HP)
                      </button>
                    </li>
                  ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </Shell>
  );
}

function JoinModal({ battleId }: { battleId: string }) {
  const join = useBattleStore((s) => s.join);
  const saved = useBattleStore((s) => s.nickname);
  const [nick, setNick] = useState(saved);
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-obsidian/70 p-4 backdrop-blur-sm" role="dialog" aria-modal aria-labelledby="join-title">
      <form
        className="panel w-full max-w-sm p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (nick.trim()) join(battleId, nick.trim().slice(0, 24));
        }}
      >
        <h2 id="join-title" className="font-display text-xl font-bold">
          Join the raid
        </h2>
        <p className="mt-1 text-sm text-mist">Pick a nickname for the party list.</p>
        <label htmlFor="join-nick" className="sr-only">
          Nickname
        </label>
        <input id="join-nick" className="input mt-4" autoFocus value={nick} onChange={(e) => setNick(e.target.value)} maxLength={24} placeholder="e.g. NullByteNinja" />
        <button className="btn-primary mt-4 w-full" disabled={!nick.trim()}>
          Join party
        </button>
      </form>
    </div>
  );
}

function MissingBattle({ battleId }: { battleId: string }) {
  const createBattle = useBattleStore((s) => s.createBattle);
  const quests = useMemo(
    () => Object.fromEntries(demoFixture.findings.map((f) => [f.id, { source: 'template' as const, quest: templateQuest(f) }])),
    [],
  );
  return (
    <Shell>
      <div className="panel mx-auto mt-16 max-w-lg p-6 text-center">
        <h1 className="font-display text-2xl font-bold">Battle {battleId} isn't on this device</h1>
        <p className="mt-2 text-sm text-mist">
          In this MVP, battle state lives on the host's device (shared realtime needs Supabase). You can join a fresh copy of
          the demo battle with the same code.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <button
            className="btn-primary"
            onClick={() => createBattle({ id: battleId, name: `Raid ${battleId}`, fixture: demoFixture, quests, asHost: false })}
          >
            Join demo copy
          </button>
          <Link to="/" className="btn-ghost">
            Home
          </Link>
        </div>
      </div>
    </Shell>
  );
}
