import type { Participant } from "../../lib/types";

export function PartyList({ participants, layout = "list" }: { participants: Participant[]; layout?: "list" | "chips" }) {
  if (layout === "chips") {
    return (
      <ul className="pointer-events-auto flex max-w-xl flex-wrap gap-2" aria-label="Party">
        {participants.map((player) => (
          <li key={player.id} className="hud-chip">
            <span className="hud-mark" aria-hidden="true">
              {player.nickname.slice(0, 1).toUpperCase()}
            </span>
            <span>
              <span className="block text-xs font-semibold leading-tight">{player.nickname}</span>
              <span className="block text-[10px] uppercase tracking-[0.12em] text-sand/55">
                {player.role} · {player.xp} XP
              </span>
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section className="frame p-4" aria-label="Party">
      <h2 className="kicker">Party</h2>
      <ul className="mt-3 space-y-2">
        {participants.map((player) => (
          <li key={player.id} className="flex items-center justify-between gap-3 text-sm">
            <span>
              <span className="font-semibold">{player.nickname}</span>
              <span className="ml-2 text-sand/60">{player.role}</span>
            </span>
            <span className="text-emerald">{player.xp} XP</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
