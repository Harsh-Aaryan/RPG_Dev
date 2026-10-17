import { useState } from "react";
import { MENTOR_MS } from "../../data/demo";
import type { Quest } from "../../lib/types";

interface HintPanelProps {
  quest: Quest;
  onRevealHint: () => void;
}

export function HintPanel({ quest, onRevealHint }: HintPanelProps) {
  const [busy, setBusy] = useState<"explain" | "hint" | "test" | null>(null);
  const [explain, setExplain] = useState("");
  const [test, setTest] = useState("");

  function wait(kind: "explain" | "hint" | "test", after: () => void) {
    if (busy) return;
    setBusy(kind);
    window.setTimeout(() => {
      after();
      setBusy(null);
    }, MENTOR_MS);
  }

  return (
    <section className="frame p-4" aria-label="Mentor">
      <h2 className="kicker">Mentor</h2>
      <p className="mt-2 text-sm text-sand/70">Demo replies are prewritten. Gemma 4 is not called from the browser.</p>
      <div className="mt-4 flex flex-col gap-2">
        <button type="button" className="min-h-11 border border-sand/20 px-3 text-left text-sm hover:border-cyan" onClick={() => wait("explain", () => setExplain(quest.mentorExplain))} disabled={Boolean(busy)}>
          Explain it
        </button>
        <button
          type="button"
          className="min-h-11 border border-sand/20 px-3 text-left text-sm hover:border-cyan"
          onClick={() => wait("hint", onRevealHint)}
          disabled={Boolean(busy) || quest.hintsRevealed >= 3}
        >
          Give me a hint
        </button>
        <button type="button" className="min-h-11 border border-sand/20 px-3 text-left text-sm hover:border-cyan" onClick={() => wait("test", () => setTest(quest.testCheck))} disabled={Boolean(busy)}>
          What does the test check?
        </button>
      </div>
      {busy ? <p className="mt-3 text-sm text-cyan">Drafting a demo reply…</p> : null}
      {explain ? <p className="mt-3 text-sm leading-6 text-sand/90">{explain}</p> : null}
      <ol className="mt-3 space-y-2">
        {quest.hints.slice(0, quest.hintsRevealed).map((hint, index) => (
          <li key={hint} className="rounded-xl bg-ink/70 px-3 py-2 text-sm">
            <span className="font-display text-cyan">Hint {index + 1}. </span>
            {hint}
          </li>
        ))}
      </ol>
      {test ? <p className="mt-3 text-sm leading-6 text-sand/90">{test}</p> : null}
    </section>
  );
}
