import type { BattleEvent } from "../../lib/types";

export function BattleFeed({ events, layout = "panel" }: { events: BattleEvent[]; layout?: "panel" | "log" }) {
  const items = layout === "log" ? events.slice(0, 4) : events;
  const list = (
    <ul className={layout === "log" ? "space-y-1" : "mt-3 space-y-2"} aria-live="polite">
      {items.length === 0 ? <li className="text-xs text-sand/60">No hits yet. Closing an issue will not damage the boss.</li> : null}
      {items.map((event) => (
        <li key={event.id} className={layout === "log" ? "text-xs leading-5 text-sand/85" : "text-sm text-sand/85"}>
          <span className="mr-2 text-cyan/80">{new Date(event.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          {event.message}
        </li>
      ))}
    </ul>
  );

  if (layout === "log") {
    return (
      <section className="hud-log pointer-events-auto w-full max-w-md" aria-label="Attack feed">
        <h2 className="kicker mb-1">Attack feed</h2>
        {list}
      </section>
    );
  }

  return (
    <section className="frame p-4" aria-label="Attack feed">
      <h2 className="kicker">Attack feed</h2>
      {list}
    </section>
  );
}
