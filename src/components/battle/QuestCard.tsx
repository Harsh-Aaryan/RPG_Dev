import { BadgeCheck, ChevronRight, CircleDashed, Flag, GitPullRequest, Hourglass, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { SEVERITY_STYLE } from '../../lib/game-rules';
import type { Quest, SafeFinding } from '../../lib/types';
import { Seal, SwordGlyph } from '../art/Sigils';
import { SeverityBadge, SourceBadge } from '../ui/Badges';

const STATUS: Record<Quest['status'], { label: string; icon: typeof Flag; tone: string }> = {
  open: { label: 'Open for a raider', icon: CircleDashed, tone: 'text-ink-3' },
  claimed: { label: 'In progress', icon: Flag, tone: 'text-copper' },
  submitted: { label: 'Fix submitted', icon: Hourglass, tone: 'text-gold' },
  verifying: { label: 'Verifying', icon: Hourglass, tone: 'text-gold' },
  verified: { label: 'Verified fix', icon: BadgeCheck, tone: 'text-sage' },
  rejected: { label: 'Needs another try', icon: RotateCcw, tone: 'text-ember' },
};

/** A mission card: what is broken, where, what fixing it is worth, and how far along it is. */
export function QuestCard({ quest, finding, claimer }: { quest: Quest; finding: SafeFinding; claimer?: string }) {
  const done = quest.status === 'verified';
  // Stamp the seal only when the quest is verified while this card is on screen.
  const wasDone = useRef(done);
  const status = STATUS[quest.status];
  const StatusIcon = status.icon;
  const sev = SEVERITY_STYLE[finding.severity];

  return (
    <motion.div layout transition={{ duration: 0.25 }}>
      <Link
        to={`/quest/${quest.battleId}/${quest.id}`}
        className={`plate plate-lift group block h-full py-4 pl-5 pr-4 hover:-translate-y-0.5 hover:[--edge:rgb(201_148_96/0.55)] ${
          done ? '[--fill:#1d2520] [--edge:rgb(130_165_138/0.35)]' : '[--edge:var(--color-line-soft)]'
        }`}
        style={{ ['--cut' as string]: '14px' }}
        aria-label={`${quest.content.questTitle}: ${sev.label} severity, ${quest.damage} damage, ${status.label}`}
      >
        {/* severity rail */}
        <span className={`absolute inset-y-3 left-0 w-[3px] ${done ? 'bg-sage/70' : sev.bar}`} aria-hidden />

        {done && (
          <span className={`pointer-events-none absolute -right-1 -top-2 ${wasDone.current ? '-rotate-[8deg]' : 'animate-seal-in'}`} aria-hidden>
            <Seal size={46} />
          </span>
        )}

        <div className="flex flex-wrap items-center gap-2 pr-10">
          <SeverityBadge severity={finding.severity} />
          {finding.cwe && <span className="tag font-mono text-[0.7rem] tracking-tight">{finding.cwe}</span>}
          {quest.issue && (
            <span className="tag text-ink-3" title={quest.issue.mock ? 'Simulated issue draft' : `GitHub issue #${quest.issue.number}`}>
              <GitPullRequest size={12} aria-hidden /> {quest.issue.mock ? 'Draft issue' : `#${quest.issue.number}`}
            </span>
          )}
        </div>

        <h3 className={`mt-3 font-display text-[1.35rem] font-semibold leading-tight ${done ? 'text-ink-2' : 'text-ink'}`}>
          {quest.content.questTitle}
        </h3>
        <p className="mt-1 truncate font-mono text-xs text-ink-3">
          {finding.affectedPath}
          {finding.affectedFunction && <span className="text-ink-2"> › {finding.affectedFunction}()</span>}
        </p>
        <p className="mt-2.5 line-clamp-2 text-sm text-ink-2">
          <span className="font-semibold text-ink">Objective: </span>
          {quest.content.learningGoal}
        </p>

        <div className="mt-4 flex items-center gap-3 border-t border-line-soft pt-3 text-xs">
          <span className={`inline-flex min-w-0 items-center gap-1.5 font-medium ${status.tone}`}>
            <StatusIcon size={14} aria-hidden className="shrink-0" />
            <span className="truncate">
              {status.label}
              {claimer && !done && <span className="text-ink-3"> · {claimer}</span>}
            </span>
          </span>
          <span className="ml-auto hidden sm:inline-flex">
            <SourceBadge source={quest.source} model={quest.model} />
          </span>
          <span
            className={`inline-flex shrink-0 items-center gap-1 font-mono text-sm font-medium tabular-nums ${done ? 'text-sage' : 'text-[#e39a8d]'}`}
            title={done ? `${quest.damage} damage dealt` : `Deals ${quest.damage} damage when verified`}
          >
            <SwordGlyph size={14} />
            {quest.damage}
            <span className="text-[0.65rem] uppercase tracking-wider text-ink-3">{done ? 'dealt' : 'dmg'}</span>
          </span>
          <ChevronRight className="shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-copper" size={16} aria-hidden />
        </div>
      </Link>
    </motion.div>
  );
}
