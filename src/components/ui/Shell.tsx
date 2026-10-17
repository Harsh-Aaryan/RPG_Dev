import { Accessibility, Swords } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useBattleStore } from '../../store/useBattleStore';

export function Shell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  const reducedMotion = useBattleStore((s) => s.reducedMotion);
  const setReducedMotion = useBattleStore((s) => s.setReducedMotion);
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-white/6 bg-obsidian/75 backdrop-blur-md">
        <div className={`mx-auto flex h-14 items-center justify-between px-4 ${wide ? 'max-w-7xl' : 'max-w-5xl'}`}>
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-violet text-obsidian">
              <Swords size={16} aria-hidden />
            </span>
            Repo<span className="text-violet">Raid</span>
          </Link>
          <button
            className="btn-ghost px-3 py-1.5 text-xs"
            onClick={() => setReducedMotion(!reducedMotion)}
            aria-pressed={reducedMotion}
            title="Toggle reduced motion"
          >
            <Accessibility size={14} aria-hidden />
            <span className="hidden sm:inline">Reduced motion: {reducedMotion ? 'on' : 'off'}</span>
          </button>
        </div>
      </header>
      <main className={`mx-auto px-4 pb-16 ${wide ? 'max-w-7xl' : 'max-w-5xl'}`}>{children}</main>
    </div>
  );
}
