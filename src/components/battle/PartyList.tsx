import { Crown } from 'lucide-react';
import type { Participant } from '../../lib/types';

const HUES = ['#9c78ff', '#49dbf2', '#61e6ac', '#ffb35c', '#ff6c79'];

export function PartyList({ participants, me }: { participants: Participant[]; me: string }) {
  return (
    <ul className="space-y-2">
      {[...participants]
        .sort((a, b) => b.xp - a.xp)
        .map((p, i) => (
          <li key={p.id} className="flex items-center gap-3">
            <span
              className="grid h-8 w-8 shrink-0 place-items-center font-display text-sm font-bold text-obsidian [clip-path:polygon(50%_0,100%_25%,100%_75%,50%_100%,0_75%,0_25%)]"
              style={{ background: HUES[i % HUES.length] }}
              aria-hidden
            >
              {p.nickname.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm">
              {p.nickname}
              {p.id === me && <span className="text-mist"> (you)</span>}
            </span>
            {p.role === 'host' && <Crown size={14} className="text-amber" aria-label="Host" />}
            <span className="font-mono text-xs text-emerald">{p.xp} XP</span>
          </li>
        ))}
    </ul>
  );
}
