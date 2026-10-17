import { animate, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { SEVERITY_STYLE } from '../../lib/game-rules';
import type { Severity } from '../../lib/types';
import { SeveritySigil } from '../art/Sigils';

type Props = {
  name: string;
  title: string;
  level: number;
  hp: number;
  maxHP: number;
  /** Highest unresolved severity; null once every finding is fixed. */
  threat: Severity | null;
  reducedMotion: boolean;
};

const TRACK_CLIP = 'polygon(7px 0, calc(100% - 7px) 0, 100% 50%, calc(100% - 7px) 100%, 7px 100%, 0 50%)';

/**
 * Encounter-style HP bar: iron track, ember fill, a pale trail that drains after
 * each verified hit, minor ticks every 50 HP and major ticks every boss level (250 HP).
 */
export function BossHealthBar({ name, title, level, hp, maxHP, threat, reducedMotion }: Props) {
  const [shown, setShown] = useState(hp);
  const [flash, setFlash] = useState(0);
  const prev = useRef(hp);

  useEffect(() => {
    if (hp < prev.current) setFlash((f) => f + 1);
    prev.current = hp;
    if (reducedMotion) {
      setShown(hp);
      return;
    }
    const c = animate(shown, hp, { duration: 1.1, delay: 0.25, ease: 'easeOut', onUpdate: (v) => setShown(Math.round(v)) });
    return () => c.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hp, reducedMotion]);

  const pct = maxHP ? (hp / maxHP) * 100 : 0;
  const shownPct = maxHP ? (shown / maxHP) * 100 : 0;
  const minor = maxHP ? (50 / maxHP) * 100 : 100;
  const major = maxHP ? (250 / maxHP) * 100 : 100;
  const t = threat ? SEVERITY_STYLE[threat] : null;

  return (
    <div className="w-full">
      <div className="mb-2.5 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="font-display text-[1.7rem] font-bold uppercase leading-[0.95] tracking-[0.06em] text-ink drop-shadow-[0_2px_6px_rgb(0_0_0/0.8)] sm:text-4xl">
            {name}
          </p>
          <p className="mt-1 font-display text-base italic text-ink-2 sm:text-lg">{title}</p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-ink-2">
            <span>Level {String(level).padStart(2, '0')}</span>
            <svg width="6" height="6" viewBox="0 0 6 6" aria-hidden>
              <path d="M3 0 6 3 3 6 0 3Z" fill="#8a5f38" />
            </svg>
            {t ? (
              <span className={`inline-flex items-center gap-1.5 ${t.text}`}>
                <SeveritySigil severity={threat!} size={13} /> {t.threat}
              </span>
            ) : (
              <span className="text-sage">Threat cleared</span>
            )}
          </p>
        </div>
        <p className="shrink-0 text-right font-mono tabular-nums" aria-live="polite">
          <span className="sr-only">Boss health </span>
          <span className="text-xl font-medium text-ink sm:text-2xl">{shown}</span>
          <span className="text-sm text-ink-3"> / {maxHP}</span>
          <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink-3">Hit points</span>
        </p>
      </div>

      <div
        className="relative h-[15px] bg-line p-px"
        style={{ clipPath: TRACK_CLIP }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={maxHP}
        aria-valuenow={hp}
        aria-label="Boss health"
      >
        <div className="relative h-full overflow-hidden bg-[#0f1311] shadow-[inset_0_2px_4px_rgb(0_0_0/0.7)]" style={{ clipPath: TRACK_CLIP }}>
          {/* trail */}
          <div className="absolute inset-y-0 left-0 bg-[#e3c39b]/55" style={{ width: `${shownPct}%` }} />
          {/* fill */}
          <motion.div
            className="absolute inset-y-0 left-0"
            style={{ background: 'linear-gradient(180deg, #d98676 0%, #c66a5e 45%, #9b4439 100%)' }}
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ duration: reducedMotion ? 0 : 0.32, ease: 'easeOut' }}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-white/30" />
          </motion.div>
          {/* ticks */}
          <div
            className="absolute inset-0"
            style={{ backgroundImage: `repeating-linear-gradient(90deg, transparent 0 calc(${minor}% - 1px), rgb(10 13 11 / 0.55) calc(${minor}% - 1px) ${minor}%)` }}
          />
          <div
            className="absolute inset-0"
            style={{ backgroundImage: `repeating-linear-gradient(90deg, transparent 0 calc(${major}% - 2px), rgb(10 13 11 / 0.9) calc(${major}% - 2px) ${major}%)` }}
          />
          {flash > 0 && <div key={flash} className="absolute inset-0 animate-hp-flash bg-[#fff1dc] opacity-0" />}
        </div>
      </div>
    </div>
  );
}
