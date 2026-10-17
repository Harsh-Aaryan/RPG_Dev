import { Bot, FlaskConical, ScrollText } from 'lucide-react';
import { SEVERITY_STYLE } from '../../lib/game-rules';
import type { QuestSource, Severity } from '../../lib/types';

export function SeverityBadge({ severity }: { severity: Severity }) {
  const s = SEVERITY_STYLE[severity];
  return (
    <span className={`chip ${s.chip}`} title={`${s.label} severity`}>
      <span aria-hidden>{s.glyph}</span>
      {s.label}
    </span>
  );
}

export function SourceBadge({ source, model }: { source: QuestSource; model?: string }) {
  return source === 'gemma' ? (
    <span className="chip border-emerald/40 bg-emerald/10 text-emerald" title={model}>
      <Bot size={12} aria-hidden /> Gemma 4
    </span>
  ) : (
    <span className="chip border-white/15 bg-white/5 text-mist" title="Gemma unavailable — hand-written template">
      <ScrollText size={12} aria-hidden /> Template
    </span>
  );
}

export function ScanLabel({ label }: { label: 'simulated' | 'live' }) {
  return label === 'simulated' ? (
    <span className="chip border-amber/40 bg-amber/10 text-amber" title="Findings come from the mock Strix worker, not a real Strix run">
      <FlaskConical size={12} aria-hidden /> Simulated Strix scan
    </span>
  ) : (
    <span className="chip border-emerald/40 bg-emerald/10 text-emerald">
      <FlaskConical size={12} aria-hidden /> Live Strix scan
    </span>
  );
}
