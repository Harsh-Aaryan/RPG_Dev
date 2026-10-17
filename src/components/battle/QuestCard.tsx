import { CheckCircle2, ChevronRight, CircleDashed, GitPullRequest, Swords } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import type { Quest, SafeFinding } from '../../lib/types';
import { SeverityBadge, SourceBadge } from '../ui/Badges';

const STATUS: Record<Quest['status'], string> = {
  open: 'Open',
  claimed: 'In progress',
  submitted: 'Submitted',
  verifying: 'Verifying',
  verified: 'Verified fix',
  rejected: 'Needs another try',
};

export function QuestCard({ quest, finding, claimer }: { quest: Quest; finding: SafeFinding; claimer?: string }) {
  const done = quest.status === 'verified';
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Link
        to={`/quest/${quest.battleId}/${quest.id}`}
        className={`panel group block p-4 transition hover:border-violet/50 hover:bg-slate-2/70 ${done ? 'opacity-70' : ''}`}
      >
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <SeverityBadge severity={finding.severity} />
          <SourceBadge source={quest.source} model={quest.model} />
          {quest.issue && (
            <span className="chip border-white/15 text-mist">
              <GitPullRequest size={12} aria-hidden /> {quest.issue.mock ? 'draft' : `#${quest.issue.number}`}
            </span>
          )}
        </div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className={`font-display text-base font-semibold ${done ? 'line-through decoration-emerald/70' : ''}`}>
              {quest.content.questTitle}
            </h3>
            <p className="mt-0.5 truncate text-xs text-mist">
              {finding.cwe} · {finding.affectedPath}
            </p>
            <p className="mt-2 line-clamp-2 text-sm text-sand/80">{quest.content.learningGoal}</p>
          </div>
          <ChevronRight className="mt-1 shrink-0 text-mist transition group-hover:translate-x-0.5 group-hover:text-violet" size={18} aria-hidden />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className={`inline-flex items-center gap-1 ${done ? 'text-emerald' : 'text-mist'}`}>
            {done ? <CheckCircle2 size={14} aria-hidden /> : <CircleDashed size={14} aria-hidden />}
            {STATUS[quest.status]}
            {claimer && !done && <> · {claimer}</>}
          </span>
          <span className="inline-flex items-center gap-1 font-mono font-medium text-coral">
            <Swords size={13} aria-hidden /> {quest.damage} dmg
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
