import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { BossScene } from "../components/arena/BossScene";
import { BattleFeed } from "../components/battle/BattleFeed";
import { BossHealthBar } from "../components/battle/BossHealthBar";
import { InviteQRCode } from "../components/battle/InviteQRCode";
import { PartyList } from "../components/battle/PartyList";
import { QuestCard } from "../components/battle/QuestCard";
import { btnPrimary, Shell } from "../components/layout/Shell";
import { bossStats } from "../lib/game-rules";
import { useBattleStore } from "../store/useBattleStore";

export function BattlePage() {
  const { battleId = "" } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const battle = useBattleStore((state) => state.battles[battleId]);
  const reducedMotion = useBattleStore((state) => state.reducedMotion);
  const markHitPlayed = useBattleStore((state) => state.markHitPlayed);
  const [shownHit, setShownHit] = useState<{ amount: number; nonce: number } | null>(null);
  const downed = params.get("downed") === "1";

  useEffect(() => {
    if (!battle?.lastHit || battle.lastHit.played) return;
    setShownHit({ amount: battle.lastHit.amount, nonce: battle.lastHit.at });
    markHitPlayed(battleId);
  }, [battle?.lastHit, battleId, markHitPlayed]);

  useEffect(() => {
    if (!downed || battle?.status !== "defeated") return;
    const timer = window.setTimeout(() => navigate(`/victory/${battleId}`), 2400);
    return () => window.clearTimeout(timer);
  }, [battle?.status, battleId, downed, navigate]);

  if (!battle) {
    return (
      <Shell>
        <div className="frame max-w-lg p-6">
          <h1 className="font-display text-2xl font-semibold">Battle not on this device</h1>
          <p className="mt-2 text-sm text-sand/75">Demo battles live in this browser. Start one, or open the seeded demo room.</p>
          <Link to="/create" className={`${btnPrimary} mt-4`}>
            Start battle
          </Link>
        </div>
      </Shell>
    );
  }

  const stats = bossStats(battle.quests);

  return (
    <Shell wide>
      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_332px]">
        <section className="frame overflow-hidden">
          <div className="relative h-[58vh] min-h-[380px] lg:h-[calc(100vh-6.5rem)]">
            <BossScene
              bossType={stats.type}
              severity={stats.highest}
              sizeScale={stats.sizeScale}
              defeated={battle.status === "defeated"}
              reducedMotion={reducedMotion}
              hit={shownHit}
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 p-3">
              <div className="hud-bar pointer-events-auto">
                <BossHealthBar stats={stats} />
              </div>
            </div>
            {shownHit ? (
              <p className="damage-pop absolute right-6 top-28" aria-hidden="true">
                −{shownHit.amount} HP
              </p>
            ) : null}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3">
              <PartyList participants={battle.participants} layout="chips" />
            </div>
          </div>
        </section>
        <aside className="flex flex-col gap-3">
          <section className="frame p-3">
            <div className="mb-2 flex items-baseline justify-between gap-2 px-1">
              <h2 className="kicker">Quests</h2>
              <p className="text-[11px] text-sand/50">{battle.repository}</p>
            </div>
            <div className="space-y-2">
              {battle.quests.map((quest) => (
                <QuestCard key={quest.id} quest={quest} />
              ))}
            </div>
            {battle.status === "defeated" ? (
              <p className="mt-3 px-1 text-sm text-emerald">Findings cleared. Victory is next.</p>
            ) : (
              <p className="mt-3 px-1 text-[11px] leading-4 text-sand/50">{battle.sourceLabel}</p>
            )}
          </section>
          <BattleFeed events={battle.events} />
          <InviteQRCode battleId={battle.id} />
        </aside>
      </div>
    </Shell>
  );
}
