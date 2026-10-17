import { Flag, GitPullRequest, RotateCcw, Skull, Sparkles, Swords, UserPlus, XCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { BattleEvent } from '../../lib/types';

const ICONS = {
  created: Flag,
  join: UserPlus,
  claim: Sparkles,
  issue: GitPullRequest,
  attempt: XCircle,
  hit: Swords,
  reopen: RotateCcw,
  defeated: Skull,
} as const;

const TONE: Partial<Record<BattleEvent['type'], string>> = {
  hit: 'text-coral',
  defeated: 'text-emerald',
  attempt: 'text-amber',
  reopen: 'text-amber',
};

export function BattleFeed({ events }: { events: BattleEvent[] }) {
  const recent = [...events].reverse().slice(0, 12);
  return (
    <ol className="space-y-2" aria-label="Battle log">
      <AnimatePresence initial={false}>
        {recent.map((e) => {
          const Icon = ICONS[e.type];
          return (
            <motion.li
              key={e.id}
              layout
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex gap-2 text-sm"
            >
              <Icon size={15} className={`mt-0.5 shrink-0 ${TONE[e.type] ?? 'text-mist'}`} aria-hidden />
              <span className="min-w-0 flex-1">{e.text}</span>
              <time className="shrink-0 font-mono text-[10px] text-mist/70" dateTime={e.createdAt}>
                {new Date(e.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </time>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ol>
  );
}
