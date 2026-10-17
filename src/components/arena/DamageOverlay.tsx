import { AnimatePresence, motion } from 'motion/react';

/** Damage numbers that rise from the boss, plus a brief warm flash across the arena. */
export function DamageOverlay({ hits, reducedMotion = false }: { hits: { id: string; damage: number }[]; reducedMotion?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-live="polite">
      <AnimatePresence>
        {hits.map((h) => (
          <motion.div
            key={`flash-${h.id}`}
            className="absolute inset-0"
            style={{ background: 'radial-gradient(60% 55% at 50% 42%, rgb(255 214 170 / 0.32), rgb(198 106 94 / 0.12) 55%, transparent 80%)' }}
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0.2 : 0.55, ease: 'easeOut' }}
          />
        ))}
        {hits.map((h, i) => (
          <motion.div
            key={h.id}
            className="absolute left-1/2 top-[30%] flex -translate-x-1/2 flex-col items-center"
            style={{ marginLeft: i * 28, marginTop: i * 22 }}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 1.45 }}
            animate={reducedMotion ? { opacity: [0, 1, 1, 0] } : { opacity: [0, 1, 1, 0], y: [18, 0, -26, -64], scale: [1.45, 1, 1, 0.96] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.7, times: [0, 0.12, 0.7, 1], ease: 'easeOut' }}
          >
            <span
              className="font-display text-6xl font-bold leading-none text-[#f2b3a6] sm:text-7xl"
              style={{ textShadow: '0 2px 0 #4a1d17, 0 0 22px rgb(198 106 94 / 0.55), 0 0 2px #000' }}
            >
              −{h.damage}
            </span>
            <span className="mt-1 text-xs font-semibold tracking-wide text-ink" style={{ textShadow: '0 1px 2px #000' }}>
              Verified fix
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
