import { SEVERITY_LABEL } from "../../lib/game-rules";
import type { Severity } from "../../lib/types";

export function FlatArena({ bossName, severity }: { bossName: string; severity: Severity }) {
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center gap-4 bg-obsidian px-6 text-center">
      <div
        className="grid h-28 w-28 place-items-center border border-violet/50 bg-slate"
        style={{ clipPath: "polygon(50% 0, 100% 28%, 82% 100%, 18% 100%, 0 28%)" }}
        aria-hidden="true"
      >
        <span className="h-6 w-6 rounded-full bg-coral" />
      </div>
      <p className="font-display text-xl font-semibold">{bossName}</p>
      <p className="max-w-sm text-sm text-sand/75">
        {SEVERITY_LABEL[severity]} threat. This browser has no WebGL, so the low-poly arena is shown as a flat stand-in.
      </p>
    </div>
  );
}
