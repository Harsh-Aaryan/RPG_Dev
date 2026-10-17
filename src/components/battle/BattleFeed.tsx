import { Crown, Flag, GitPullRequest, RotateCcw, UserPlus, XCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { ComponentType } from 'react';
import { XP_PER_DAMAGE } from '../../lib/game-rules';
import type { BattleEvent } from '../../lib/types';
import { ScrollGlyph, SwordGlyph, XpGlyph } from '../art/Sigils';

type Icon = ComponentType<{ size?: number; className?: string }>;

const KIND: Record<BattleEvent['type'], { icon: Icon; tone: string; label: string }> = {
  created: { icon: Flag, tone: 'text-ink-3', label: 'Raid opened' },
  join: { icon: UserPlus, tone: 'text-ink-2', label: 'Player joined' },
  claim: { icon: ScrollGlyph, tone: 'text-copper', label: 'Quest accepted' },
  issue: { icon: GitPullRequest, tone: 'text-ink-2', label: 'Issue drafted' },
  attempt: { icon: XCircle, tone: 'text-gold', label: 'Fix rejected' },
  hit: { icon: SwordGlyph, tone: 'text-ember', label: 'Boss damaged' },
  reopen: { icon: RotateCcw, tone: 'text-gold', label: 'Fix invalidated' },
  defeated: { icon: Crown, tone: 'text-sage', label: 'Boss defeated' },
};

/** The raid's event feed: newest first, each entry marked by what kind of moment it was. */
export function BattleFeed({ events, participantIds }: { events: BattleEvent[]; participantIds?: string[] }) {
  // XP only goes to raiders on the party list (see applyVerifiedHit).
  const members = new Set(participantIds ?? []);
  const recent = [...events].reverse().slice(0, 12);
  return (
    <ol className="divide-y divide-line-soft" aria-label="Battle log">
      <AnimatePresence initial={false}>
        {recent.map((e) => {
          const k = KIND[e.type];
          const Icon = k.icon;
          return (
            <motion.li
              key={e.id}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div
                className={`flex gap-3 py-2.5 ${
                  e.type === 'hit' ? 'bg-gradient-to-r from-ember/[0.08] to-transparent' : e.type === 'defeated' ? 'bg-gradient-to-r from-sage/[0.1] to-transparent' : ''
                }`}
              >
                <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center border border-line-soft bg-abyss ${k.tone}`} title={k.label}>
                  <Icon size={13} />
                  <span className="sr-only">{k.label}: </span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug text-ink">{e.text}</p>
                  {e.type === 'hit' && e.damage && e.actor && members.has(e.actor) ? (
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-copper">
                      <XpGlyph size={11} /> +{Math.round(e.damage * XP_PER_DAMAGE)} XP awarded
                    </p>
                  ) : null}
                </div>
                <time className="shrink-0 pt-0.5 font-mono text-[0.68rem] text-ink-3" dateTime={e.createdAt}>
                  {new Date(e.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </time>
              </div>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ol>
  );
}
