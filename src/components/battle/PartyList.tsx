import { Crown } from 'lucide-react';
import type { Participant } from '../../lib/types';
import { AvatarCrest } from '../art/Crest';
import { XpGlyph } from '../art/Sigils';

/** Party roster: crest, role, and each raider's share of the party's XP. */
export function PartyList({ participants, me }: { participants: Participant[]; me: string }) {
  const sorted = [...participants].sort((a, b) => b.xp - a.xp);
  const top = Math.max(1, ...sorted.map((p) => p.xp));

  if (!sorted.length) {
    return <p className="text-sm text-ink-3">No raiders yet. Share the invite to fill the party.</p>;
  }

  return (
    <ul className="divide-y divide-line-soft">
      {sorted.map((p) => (
        <li key={p.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
          <AvatarCrest name={p.nickname} host={p.role === 'host'} size={34} />
          <div className="min-w-0 flex-1">
            <p className="flex items-baseline gap-1.5 truncate text-sm font-semibold text-ink">
              <span className="truncate">{p.nickname}</span>
              {p.id === me && <span className="shrink-0 text-xs font-normal text-ink-3">you</span>}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-3">
              {p.role === 'host' ? (
                <>
                  <Crown size={12} className="text-copper" aria-hidden /> Host
                </>
              ) : (
                'Raider'
              )}
            </p>
            <div className="mt-1.5 h-[3px] w-full bg-abyss" aria-hidden>
              <div className="h-full bg-copper/80 transition-[width] duration-700" style={{ width: `${(p.xp / top) * 100}%` }} />
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 font-mono text-xs tabular-nums text-ink-2" aria-label={`${p.xp} XP`}>
            <XpGlyph size={12} className="text-copper" />
            {p.xp}
          </span>
        </li>
      ))}
    </ul>
  );
}
