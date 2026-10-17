export * from '../../shared/game-rules';
import type { Severity } from '../../shared/types';

export const SEVERITY_STYLE: Record<Severity, { label: string; color: string; chip: string; glyph: string }> = {
  critical: { label: 'Critical', color: '#ff4d5e', chip: 'border-coral/50 bg-coral/15 text-coral', glyph: '◆◆◆◆' },
  high: { label: 'High', color: '#ffb35c', chip: 'border-amber/50 bg-amber/15 text-amber', glyph: '◆◆◆' },
  medium: { label: 'Medium', color: '#9c78ff', chip: 'border-violet/50 bg-violet/15 text-violet', glyph: '◆◆' },
  low: { label: 'Low', color: '#49dbf2', chip: 'border-cyan/50 bg-cyan/15 text-cyan', glyph: '◆' },
};
