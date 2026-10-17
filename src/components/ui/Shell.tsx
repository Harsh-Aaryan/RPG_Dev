import { Pause, Play } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useBattleStore } from '../../store/useBattleStore';
import { Emblem, Wordmark } from '../art/Emblem';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `relative px-1 py-1 text-sm font-medium transition-colors ${
    isActive ? 'text-ink after:absolute after:inset-x-1 after:-bottom-[13px] after:h-px after:bg-copper' : 'text-ink-2 hover:text-ink'
  }`;

export function Shell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  const reducedMotion = useBattleStore((s) => s.reducedMotion);
  const setReducedMotion = useBattleStore((s) => s.setReducedMotion);
  const width = wide ? 'max-w-[84rem]' : 'max-w-6xl';
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:bg-iron focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-line-soft bg-night/90 backdrop-blur-sm">
        <div className={`mx-auto flex h-[3.75rem] items-center gap-4 px-4 sm:gap-6 ${width}`}>
          <Link to="/" className="shrink-0 rounded-sm" aria-label="RepoRaid home">
            <Wordmark />
          </Link>
          <span className="hidden h-6 w-px bg-line-soft sm:block" aria-hidden />
          <nav className="hidden items-center gap-5 sm:flex" aria-label="Main">
            <NavLink to="/" end className={navClass}>
              Raids
            </NavLink>
            <NavLink to="/create" className={navClass}>
              Start a battle
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button
              className={`btn-ghost text-xs ${reducedMotion ? 'border-copper/40 text-copper-hi' : ''}`}
              onClick={() => setReducedMotion(!reducedMotion)}
              aria-pressed={reducedMotion}
              title={reducedMotion ? 'Animations are reduced. Select to restore them.' : 'Reduce animations'}
            >
              {reducedMotion ? <Play size={14} aria-hidden /> : <Pause size={14} aria-hidden />}
              <span className="sr-only sm:not-sr-only">Reduce motion</span>
            </button>
          </div>
        </div>
      </header>
      <main id="main" className={`mx-auto w-full flex-1 px-4 pb-16 ${width}`}>
        {children}
      </main>
      <footer className="border-t border-line-soft">
        <div className={`mx-auto flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-5 text-xs text-ink-3 ${width}`}>
          <span className="inline-flex items-center gap-2 text-ink-2">
            <Emblem size={18} /> RepoRaid
          </span>
          <span>Open source under the MIT license.</span>
          <span>Strix finds, Gemma 4 teaches, and only a passing regression test deals damage.</span>
        </div>
      </footer>
    </div>
  );
}
