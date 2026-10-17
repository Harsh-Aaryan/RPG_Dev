import { useEffect, useRef, useState } from 'react';
import type { FindingsFixture } from '../../lib/types';

/**
 * Replays the mock Strix worker's output in the browser. SIMULATED: no scan runs
 * here (Netlify can't run Docker). The findings shown are the sanitized fixture
 * produced by worker/run_scan.sh.
 */
export function ScanTerminal({ fixture, onDone, fast }: { fixture: FindingsFixture; onDone: () => void; fast: boolean }) {
  const lines = useRef<string[]>([
    `$ strix -n --target ./${fixture.scan.repositoryId} --scan-mode quick --max-budget 5`,
    `[strix:SIMULATED] pinned commit ${fixture.scan.commitSha.slice(0, 12)}`,
    '[strix:SIMULATED] Initializing sandbox (simulated — no Docker container started)',
    '[strix:SIMULATED] Recon agent: mapping routes and handlers',
    '[strix:SIMULATED] Static agent: tracing untrusted input to sinks',
    ...fixture.findings.map(
      (f) => `[strix:SIMULATED]   ↳ ${f.severity.toUpperCase().padEnd(8)} ${f.cwe ?? ''} ${f.affectedPath}:${f.line ?? '?'}`,
    ),
    '[strix:SIMULATED] Validation agent: confirming exploitability in sandbox',
    `[strix:SIMULATED] ${fixture.findings.length} validated finding(s) → strix_runs/${fixture.scan.runName}`,
    '$ python3 worker/parse_strix.py … (sanitize: drop PoCs, redact secrets & internal URLs)',
    `✓ ${fixture.findings.length} safe findings ready for review`,
  ]).current;
  const [shown, setShown] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (shown >= lines.length) {
      const t = setTimeout(onDone, fast ? 0 : 400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setShown((n) => n + 1), fast ? 0 : 260 + Math.random() * 260);
    return () => clearTimeout(t);
  }, [shown, lines.length, onDone, fast]);

  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [shown]);

  return (
    <div
      ref={box}
      className="well h-64 overflow-y-auto p-3.5 font-mono text-[11px] leading-relaxed sm:text-xs"
      role="log"
      aria-label="Simulated Strix scan output"
    >
      {lines.slice(0, shown).map((l, i) => (
        <div
          key={i}
          className={
            l.startsWith('$') ? 'text-copper' : l.startsWith('✓') ? 'text-sage' : l.includes('↳') ? 'text-gold' : 'text-ink-3'
          }
        >
          {l}
        </div>
      ))}
      {shown < lines.length && <span className="inline-block h-3.5 w-2 animate-pulse bg-ink-3 align-middle" />}
    </div>
  );
}
