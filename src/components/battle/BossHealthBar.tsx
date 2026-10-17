import { animate, motion } from 'motion/react';
import { useEffect, useState } from 'react';

type Props = { name: string; title: string; level: number; hp: number; maxHP: number; reducedMotion: boolean };

export function BossHealthBar({ name, title, level, hp, maxHP, reducedMotion }: Props) {
  const [shown, setShown] = useState(hp);
  useEffect(() => {
    if (reducedMotion) {
      setShown(hp);
      return;
    }
    const c = animate(shown, hp, { duration: 1.1, ease: 'easeOut', onUpdate: (v) => setShown(Math.round(v)) });
    return () => c.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hp, reducedMotion]);

  const pct = maxHP ? (hp / maxHP) * 100 : 0;
  const shownPct = maxHP ? (shown / maxHP) * 100 : 0;
  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-end justify-between gap-3">
        <div>
          <p className="font-display text-lg font-bold leading-tight sm:text-xl">
            {name} <span className="text-sm font-medium text-mist">Lv {level}</span>
          </p>
          <p className="text-xs text-mist">{title}</p>
        </div>
        <p className="font-mono text-sm font-medium tabular-nums" aria-live="polite">
          <span className="sr-only">Boss health </span>
          {shown} / {maxHP} HP
        </p>
      </div>
      <div
        className="relative h-4 overflow-hidden rounded-full border border-white/15 bg-obsidian"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={maxHP}
        aria-valuenow={hp}
        aria-label="Boss health"
      >
        <div className="absolute inset-y-0 left-0 bg-white/40" style={{ width: `${shownPct}%` }} />
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-coral via-[#ff8a6c] to-amber"
          animate={{ width: `${pct}%` }}
          transition={{ duration: reducedMotion ? 0 : 0.35 }}
        />
        <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent_0_23px,rgb(0_0_0/0.35)_23px_25px)]" />
      </div>
    </div>
  );
}
