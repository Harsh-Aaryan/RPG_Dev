import { Link } from "react-router-dom";
import { SEVERITY_LABEL } from "../../lib/game-rules";
import type { Quest } from "../../lib/types";

const STATUS_LABEL: Record<Quest["status"], string> = {
  open: "Open",
  claimed: "Claimed",
  verifying: "Verifying",
  verified: "Verified",
  rejected: "Rejected",
};

export function QuestCard({ quest }: { quest: Quest }) {
  return (
    <Link
      to={`/quest/${quest.id}`}
      className="quest-card"
      aria-label={`${quest.questTitle}, ${SEVERITY_LABEL[quest.severity]}, ${quest.damage} HP, ${STATUS_LABEL[quest.status]}`}
    >
      <span className={`sev sev-${quest.severity}`}>{SEVERITY_LABEL[quest.severity]}</span>
      <span className="min-w-0">
        <span className="block font-display text-base font-semibold leading-tight">{quest.questTitle}</span>
        <span className="mt-1 block text-xs leading-5 text-sand/65">{quest.learningGoal}</span>
      </span>
      <span className="text-right">
        <span className="block font-display text-lg font-semibold leading-none text-ember">{quest.damage}</span>
        <span className="mt-1 block text-[10px] uppercase tracking-[0.14em] text-sand/50">HP</span>
        <span className="mt-1 block text-[11px] text-sand/75">{STATUS_LABEL[quest.status]}</span>
      </span>
    </Link>
  );
}
