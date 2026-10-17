import { Info, Radio, RotateCcw, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { templateQuest } from '../../shared/quest';
import { ArenaView } from '../components/arena/ArenaView';
import { DamageOverlay } from '../components/arena/DamageOverlay';
import { Emblem } from '../components/art/Emblem';
import { CornerBrackets } from '../components/art/Ornaments';
import { BattleFeed } from '../components/battle/BattleFeed';
import { BossHealthBar } from '../components/battle/BossHealthBar';
import { InviteQRCode } from '../components/battle/InviteQRCode';
import { PartyList } from '../components/battle/PartyList';
import { QuestCard } from '../components/battle/QuestCard';
import { ScanLabel } from '../components/ui/Badges';
import { Shell } from '../components/ui/Shell';
import { Spinner } from '../components/ui/Spinner';
import { useBattleActions } from '../hooks/useBattleActions';
import { useBattleSync, useMe, type Connection } from '../hooks/useBattleSync';
import { demoFixture } from '../lib/fixture';
import { bossLevel, bossSizeScale, bossVariant, highestSeverity } from '../lib/game-rules';
import { battleStats, myRole, useBattleStore } from '../store/useBattleStore';

export function BattlePage() {
  const { battleId = '' } = useParams();
  const battle = useBattleStore((s) => s.battles[battleId]);
  const sync = useBattleSync(battleId);
  const me = useMe(battle);
  const actions = useBattleActions(battle, sync.refresh);
  const reducedMotion = useBattleStore((s) => s.reducedMotion);
  const location = useLocation();
  const navigate = useNavigate();

  // Animate hits that arrive while the arena is open, plus the one we were sent here to see.
  const strikeId = useRef((location.state as { strike?: string } | null)?.strike).current;
  const seen = useRef<Set<string> | null>(null);
  const [pending, setPending] = useState<{ id: string; damage: number }[]>([]);
  const [hits, setHits] = useState<{ id: string; damage: number }[]>([]);
  const [hitKey, setHitKey] = useState(0);
  const [hpOffset, setHpOffset] = useState(0);

  // Compact HP strip on phones once the arena scrolls away.
  const arenaRef = useRef<HTMLDivElement>(null);
  const [arenaVisible, setArenaVisible] = useState(true);
  useEffect(() => {
    const el = arenaRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setArenaVisible(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [battle?.id]);

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
    // Shared battles wait for the server's state, so a cached copy never replays old hits.
    if (!battle || !sync.synced) return;
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
  }, [battle, sync.synced, strikeId, navigate]);

  if (!battle) {
    if (sync.phase === 'loading') return <LoadingBattle />;
    if (sync.phase === 'error') return <UnreachableBattle onRetry={() => void sync.refresh()} />;
    return <MissingBattle battleId={battleId} shared={sync.shared} />;
  }

  const { hp, maxHP } = battleStats(battle);
  const unresolved = battle.findings.filter((f) => battle.quests.find((q) => q.findingId === f.id)?.status !== 'verified');
  const severity = highestSeverity(unresolved.length ? unresolved : battle.findings);
  const variant = bossVariant(highestSeverity(battle.findings));
  const isHost = myRole(battle, me) === 'host';
  const joined = myRole(battle, me) !== null;
  const defeated = battle.status === 'defeated';
  const shownHP = Math.min(maxHP, hp + hpOffset);
  const verifiedCount = battle.quests.filter((q) => q.status === 'verified').length;
  const threat = unresolved.length ? highestSeverity(unresolved) : null;

  return (
    <Shell wide>
      {!joined && <JoinModal shared={Boolean(battle.remote)} onJoin={actions.join} />}

      {/* phone HUD strip */}
      <div
        className={`fixed inset-x-0 top-[3.75rem] z-20 border-b border-line-soft bg-night/95 px-4 py-2 backdrop-blur-sm transition-transform duration-200 lg:hidden ${
          arenaVisible ? '-translate-y-full opacity-0' : 'translate-y-0'
        }`}
        aria-hidden
      >
        <div className="flex items-center gap-3">
          <span className="truncate font-display text-sm font-bold uppercase tracking-[0.06em]">{variant.name}</span>
          <span className="h-1.5 flex-1 bg-abyss">
            <span className="block h-full bg-ember transition-[width] duration-500" style={{ width: `${maxHP ? (shownHP / maxHP) * 100 : 0}%` }} />
          </span>
          <span className="font-mono text-xs tabular-nums text-ink-2">
            {shownHP}/{maxHP}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 pt-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-7">
        <div className="min-w-0 space-y-8">
          <div
            ref={arenaRef}
            className="plate relative h-[56vh] min-h-[360px] lg:h-[64vh] lg:min-h-[480px]"
            style={{ ['--cut' as string]: '22px', ['--fill' as string]: '#121714', ['--edge' as string]: '#415044' }}
          >
            <div className="absolute inset-[1px] overflow-hidden [clip-path:polygon(21px_0,100%_0,100%_calc(100%-21px),calc(100%-21px)_100%,0_100%,0_21px)]">
              <ArenaView
                severity={severity}
                form={highestSeverity(battle.findings)}
                scale={bossSizeScale(battle.findings.length)}
                hpRatio={maxHP ? hp / maxHP : 0}
                hitKey={hitKey}
                defeated={defeated && hits.length === 0}
                reducedMotion={reducedMotion}
                hudInset={0.14}
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-night/95 via-night/60 to-transparent px-5 pb-16 pt-5 sm:px-7 sm:pt-6">
                  <BossHealthBar
                    name={variant.name}
                    title={variant.title}
                    level={bossLevel(maxHP)}
                    hp={shownHP}
                    maxHP={maxHP}
                    threat={threat}
                    reducedMotion={reducedMotion}
                  />
                </div>
                <div className="pointer-events-none absolute bottom-5 left-6 z-10 flex flex-wrap items-center gap-2">
                  <ScanLabel label={battle.label} />
                </div>
                <DamageOverlay hits={hits} reducedMotion={reducedMotion} />
                {defeated && hits.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9, duration: 0.4 }}
                    className="absolute inset-x-0 bottom-14 z-20 flex justify-center px-4"
                  >
                    <Link to={`/victory/${battle.id}`} className="btn-primary min-h-12 px-6 text-base">
                      <Trophy size={18} aria-hidden /> Claim the victory
                    </Link>
                  </motion.div>
                )}
              </ArenaView>
            </div>
            <CornerBrackets inset={12} />
          </div>

          <section aria-labelledby="quests-title">
            <div className="mb-4 flex items-baseline justify-between gap-4">
              <h2 id="quests-title" className="rule-heading flex-1 text-2xl">
                Quests
              </h2>
              <p className="shrink-0 text-sm text-ink-2">
                <span className="font-mono tabular-nums text-ink">
                  {verifiedCount}/{battle.quests.length}
                </span>{' '}
                verified
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
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

        <aside className="space-y-4" aria-label="Raid details">
          <section className="frame overflow-hidden p-5">
            <span className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-copper/80 via-copper/30 to-transparent" aria-hidden />
            <h1 className="font-display text-[1.7rem] font-bold leading-tight text-ink">{battle.name}</h1>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-ink-3">Target</dt>
              <dd className="truncate font-mono text-ink-2">{battle.repositoryId}</dd>
              <dt className="text-ink-3">Party</dt>
              <dd className="text-ink-2">
                {battle.participants.length} {battle.participants.length === 1 ? 'raider' : 'raiders'}
              </dd>
              <dt className="text-ink-3">Status</dt>
              <dd className={defeated ? 'text-sage' : 'text-ink-2'}>{defeated ? 'Boss defeated' : 'Battle underway'}</dd>
              <dt className="text-ink-3">Sync</dt>
              <dd>
                <ConnectionLabel connection={sync.connection} />
              </dd>
            </dl>
          </section>

          <section className="frame p-5" aria-labelledby="party-title">
            <h2 id="party-title" className="rule-heading mb-4">
              Party
            </h2>
            <PartyList participants={battle.participants} me={me} />
          </section>

          <section className="frame p-5" aria-labelledby="invite-title">
            <h2 id="invite-title" className="rule-heading mb-4">
              Invite
            </h2>
            <InviteQRCode battleId={battle.id} />
            <p className="mt-4 flex gap-2 border-t border-line-soft pt-3 text-xs text-ink-3">
              <Info size={13} className="mt-0.5 shrink-0" aria-hidden />
              {battle.remote
                ? 'Everyone who opens this link fights the same boss and sees the same HP.'
                : 'Tabs on this device stay in sync. Other devices get their own copy of the demo battle until shared battles are configured.'}
            </p>
          </section>

          <section className="frame p-5" aria-labelledby="log-title">
            <h2 id="log-title" className="rule-heading mb-2">
              Battle log
            </h2>
            <BattleFeed events={battle.events} participantIds={battle.participants.map((p) => p.id)} />
          </section>

          {isHost && battle.quests.some((q) => q.status === 'verified') && (
            <section className="frame p-5" aria-labelledby="host-title">
              <h2 id="host-title" className="rule-heading mb-2">
                Host controls
              </h2>
              <p className="mb-3 text-xs text-ink-3">If a fix is later invalidated, reopen its quest to restore the boss's HP.</p>
              <ul className="space-y-2">
                {battle.quests
                  .filter((q) => q.status === 'verified')
                  .map((q) => (
                    <li key={q.id}>
                      <button className="btn-danger min-h-9 w-full justify-start px-3 py-1.5 text-left text-xs" onClick={() => void actions.reopen(q.id)}>
                        <RotateCcw size={13} className="shrink-0" aria-hidden />
                        <span className="truncate">
                          Reopen “{q.content.questTitle}” (+{q.damage} HP)
                        </span>
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

function ConnectionLabel({ connection }: { connection: Connection }) {
  const label = { device: 'This device only', realtime: 'Live', polling: 'Live (refreshing every few seconds)', offline: 'Offline, showing the last copy' }[connection];
  const tone = connection === 'realtime' || connection === 'polling' ? 'text-sage' : connection === 'offline' ? 'text-gold' : 'text-ink-2';
  return (
    <span className={`inline-flex items-center gap-1.5 ${tone}`}>
      {(connection === 'realtime' || connection === 'polling') && <Radio size={13} aria-hidden />}
      {label}
    </span>
  );
}

function LoadingBattle() {
  return (
    <Shell>
      <div className="mx-auto mt-24 flex max-w-sm flex-col items-center text-center text-ink-2" role="status">
        <span className="text-copper">
          <Spinner size={28} />
        </span>
        <p className="mt-4 font-display text-2xl font-semibold text-ink">Opening the arena…</p>
        <p className="mt-1 text-sm">Fetching the battle from the server.</p>
      </div>
    </Shell>
  );
}

function JoinModal({ shared, onJoin }: { shared: boolean; onJoin: (nickname: string) => Promise<void> }) {
  const saved = useBattleStore((s) => s.nickname);
  const [nick, setNick] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-abyss/80 p-4 backdrop-blur-[2px]" role="dialog" aria-modal aria-labelledby="join-title">
      <motion.form
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="plate plate-lift w-full max-w-sm p-6"
        style={{ ['--cut' as string]: '16px', ['--fill' as string]: '#202923', ['--edge' as string]: '#415044' }}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!nick.trim() || busy) return;
          setBusy(true);
          setError('');
          try {
            await onJoin(nick.trim().slice(0, 24));
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not join the battle');
          } finally {
            setBusy(false);
          }
        }}
      >
        <Emblem size={36} />
        <h2 id="join-title" className="mt-3 font-display text-3xl font-bold text-ink">
          Join the raid
        </h2>
        <p className="mt-1 text-sm text-ink-2">
          Choose the name your party will see on the roster and in the battle log.
          {shared && ' Everyone in this raid shares one boss.'}
        </p>
        <label htmlFor="join-nick" className="field-label mt-5">
          Nickname
        </label>
        <input id="join-nick" className="field" autoFocus value={nick} onChange={(e) => setNick(e.target.value)} maxLength={24} placeholder="e.g. NullByteNinja" />
        {error && (
          <p className="mt-3 text-sm text-ember" role="alert">
            {error}
          </p>
        )}
        <button className="btn-primary mt-5 w-full" disabled={!nick.trim() || busy}>
          {busy && <Spinner />} Join the party
        </button>
      </motion.form>
    </div>
  );
}

function UnreachableBattle({ onRetry }: { onRetry: () => void }) {
  return (
    <Shell>
      <div className="frame mx-auto mt-16 max-w-lg p-7 text-center" role="alert">
        <Emblem size={40} className="mx-auto" />
        <h1 className="mt-4 font-display text-3xl font-bold text-ink">The arena didn't answer</h1>
        <p className="mt-3 text-sm text-ink-2">The server couldn't load this battle just now. Check your connection and try again.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button className="btn-primary" onClick={onRetry}>
            Try again
          </button>
          <Link to="/" className="btn-secondary">
            Back to raids
          </Link>
        </div>
      </div>
    </Shell>
  );
}

function MissingBattle({ battleId, shared }: { battleId: string; shared: boolean }) {
  const createBattle = useBattleStore((s) => s.createBattle);
  const quests = useMemo(
    () => Object.fromEntries(demoFixture.findings.map((f) => [f.id, { source: 'template' as const, quest: templateQuest(f) }])),
    [],
  );
  return (
    <Shell>
      <div className="frame mx-auto mt-16 max-w-lg p-7 text-center">
        <Emblem size={40} className="mx-auto" />
        <h1 className="mt-4 font-display text-3xl font-bold text-ink">
          {shared ? 'No battle with code ' : 'Battle '}
          <span className="font-mono text-2xl tracking-wider">{battleId}</span>
          {shared ? '' : " isn't on this device"}
        </h1>
        <p className="mt-3 text-sm text-ink-2">
          {shared
            ? 'Check the code with your host, or start a battle of your own.'
            : "Battles on this deployment live on the host's device. You can join a fresh copy of the demo battle with the same code."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {shared ? (
            <Link to="/create" className="btn-primary">
              Start a battle
            </Link>
          ) : (
            <button
              className="btn-primary"
              onClick={() => createBattle({ id: battleId, name: `Raid ${battleId}`, fixture: demoFixture, quests, asHost: false })}
            >
              Join the demo copy
            </button>
          )}
          <Link to="/" className="btn-secondary">
            Back to raids
          </Link>
        </div>
      </div>
    </Shell>
  );
}
