import { useEffect, useState } from "react";
import { SCAN_MS } from "../../data/demo";

const LINES = [
  { at: 0.06, text: "worker · checkout pinned commit on the allowlisted demo repo" },
  { at: 0.24, text: "strix · quick scan started — a real run is about 20 minutes" },
  { at: 0.5, text: "strix · collecting findings (demo fast-forward, scanner not running)" },
  { at: 0.74, text: "adapter · drop secrets, payloads, and private paths" },
  { at: 0.92, text: "ready · 3 sanitized simulated findings" },
];

export function ScanMock({ onComplete }: { onComplete: () => void }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let frame = 0;
    let finished = false;
    const tick = (now: number) => {
      const next = Math.min(SCAN_MS, now - start);
      setElapsed(next);
      if (next >= SCAN_MS) {
        if (!finished) {
          finished = true;
          onComplete();
        }
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [onComplete]);

  const seconds = (elapsed / 1000).toFixed(1);
  const ratio = elapsed / SCAN_MS;

  return (
    <div className="terminal p-4" role="status" aria-live="polite">
      <p className="text-xs uppercase tracking-[0.14em] text-cyan">Mocked Strix scan</p>
      <p className="mt-1 text-sm text-sand">Demo clock {seconds}s · a real scan is about 20:00</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate">
        <div className="h-full bg-cyan" style={{ width: `${ratio * 100}%` }} />
      </div>
      <ol className="mt-4 space-y-1.5 text-xs leading-5">
        {LINES.filter((line) => ratio >= line.at).map((line) => (
          <li key={line.text}>{line.text}</li>
        ))}
      </ol>
    </div>
  );
}
