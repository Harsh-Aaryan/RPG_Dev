import { AURA_COLOR, BOSS_NAME, SEVERITY_LABEL } from "../../lib/game-rules";
import type { BossStats } from "../../lib/types";

export function BossHealthBar({ stats, bossName }: { stats: BossStats; bossName?: string }) {
  const ratio = stats.maxHP === 0 ? 0 : stats.currentHP / stats.maxHP;
  const name = bossName ?? BOSS_NAME[stats.type];
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div>
          <p className="font-display text-xl font-semibold leading-none">{name}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-sand/70">
            Level {stats.level} · {SEVERITY_LABEL[stats.highest]} threat
          </p>
        </div>
        <p className="font-display text-lg font-semibold tabular-nums text-sand" aria-live="polite">
          {stats.currentHP}
          <span className="text-sand/50"> / {stats.maxHP} HP</span>
        </p>
      </div>
      <div
        className="hp-track"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={stats.maxHP}
        aria-valuenow={stats.currentHP}
        aria-label={`${name} health`}
      >
        <div
          className="hp-fill"
          style={{
            width: `${Math.max(0, Math.min(1, ratio)) * 100}%`,
            background: `linear-gradient(90deg, ${AURA_COLOR[stats.highest]}, #f0e6d2)`,
          }}
        />
      </div>
    </div>
  );
}
