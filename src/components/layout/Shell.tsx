import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useBattleStore } from "../../store/useBattleStore";

export function Shell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  const reducedMotion = useBattleStore((state) => state.reducedMotion);
  const setReducedMotion = useBattleStore((state) => state.setReducedMotion);

  return (
    <div className="min-h-screen">
      <header className="border-b border-sand/10 bg-ink/80 backdrop-blur-md">
        <div className={`mx-auto flex items-center justify-between gap-3 px-4 py-3 ${wide ? "max-w-[1440px]" : "max-w-6xl"}`}>
          <Link to="/" className="flex items-center gap-2.5 font-display text-lg font-semibold tracking-tight text-sand">
            <span className="grid h-8 w-8 place-items-center border border-cyan/60 text-[10px] font-bold text-cyan" aria-hidden="true">
              RR
            </span>
            RepoRaid
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link to="/create" className="min-h-11 rounded-sm px-3 py-2 text-sand/80 hover:text-sand">
              Start battle
            </Link>
            <Link to="/battle/demo" className="hidden min-h-11 rounded-sm px-3 py-2 text-sand/80 hover:text-sand sm:inline-flex sm:items-center">
              Demo arena
            </Link>
            <button
              type="button"
              className="min-h-11 border border-sand/20 px-3 py-2 text-sand/80"
              aria-pressed={reducedMotion}
              onClick={() => setReducedMotion(!reducedMotion)}
            >
              {reducedMotion ? "Motion off" : "Motion on"}
            </button>
          </nav>
        </div>
      </header>
      <main className={`mx-auto px-4 py-5 ${wide ? "max-w-[1440px]" : "max-w-6xl"}`}>{children}</main>
    </div>
  );
}

export const btnPrimary =
  "inline-flex min-h-11 items-center justify-center gap-2 bg-sand px-5 py-2.5 font-display text-sm font-semibold tracking-wide text-ink transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50";

export const btnGhost =
  "inline-flex min-h-11 items-center justify-center gap-2 border border-sand/30 bg-ink/50 px-5 py-2.5 font-display text-sm font-semibold text-sand transition hover:border-cyan disabled:cursor-not-allowed disabled:opacity-50";
