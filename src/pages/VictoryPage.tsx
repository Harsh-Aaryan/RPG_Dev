import { Link, useParams } from "react-router-dom";
import { btnGhost, btnPrimary, Shell } from "../components/layout/Shell";
import { bossStats, SEVERITY_LABEL } from "../lib/game-rules";
import { useBattleStore } from "../store/useBattleStore";

export function VictoryPage() {
  const { battleId = "" } = useParams();
  const battle = useBattleStore((state) => state.battles[battleId]);

  if (!battle) {
    return (
      <Shell>
        <div className="frame max-w-lg p-6">
          <h1 className="font-display text-2xl font-semibold">No victory record here</h1>
          <Link to="/create" className={`${btnPrimary} mt-4`}>
            Start battle
          </Link>
        </div>
      </Shell>
    );
  }

  const stats = bossStats(battle.quests);
  const resolved = battle.quests.filter((quest) => quest.status === "verified");
  const xp = battle.participants.reduce((sum, player) => sum + player.xp, 0);
  const defeated = battle.status === "defeated";

  return (
    <Shell>
      <div className="mx-auto max-w-4xl">
        <p className={`kicker ${defeated ? "text-emerald" : ""}`}>{defeated ? "Boss defeated" : "Raid in progress"}</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-display text-4xl font-semibold sm:text-6xl">{defeated ? "The vault is quiet." : "The boss still stands."}</h1>
          <p className="font-display text-5xl font-semibold tabular-nums text-coral">
            {stats.currentHP}
            <span className="ml-2 text-lg text-sand/50">/ {stats.maxHP} HP</span>
          </p>
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-sand/70">
          Every listed hit came from a verified quest, once. {xp} XP is spread across the party.
        </p>
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <section className="frame p-4">
            <h2 className="kicker">Security changes</h2>
            <ul className="mt-3 divide-y divide-sand/10">
              {resolved.length === 0 ? <li className="py-3 text-sm text-sand/70">No verified fixes yet.</li> : null}
              {resolved.map((quest) => (
                <li key={quest.id} className="flex items-baseline justify-between gap-3 py-3 text-sm">
                  <span>
                    <span className="block font-display font-semibold">{quest.questTitle}</span>
                    <span className="text-sand/55">{SEVERITY_LABEL[quest.severity]}</span>
                  </span>
                  <span className="font-display text-coral">−{quest.damage}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="frame p-4">
            <h2 className="kicker">Contributors</h2>
            <ul className="mt-3 divide-y divide-sand/10">
              {battle.participants.map((player) => (
                <li key={player.id} className="flex items-baseline justify-between gap-3 py-3 text-sm">
                  <span>
                    {player.nickname} <span className="text-sand/45">{player.role}</span>
                  </span>
                  <span className="font-display text-emerald">{player.xp} XP</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <p className="mt-6 text-xs text-sand/45">Share path /victory/{battle.id}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to={`/battle/${battle.id}`} className={btnPrimary}>
            Return to arena
          </Link>
          <Link to="/create" className={btnGhost}>
            Raid again
          </Link>
        </div>
      </div>
    </Shell>
  );
}
