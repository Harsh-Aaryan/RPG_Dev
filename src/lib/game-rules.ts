export * from '../../shared/game-rules';
import type { Severity } from '../../shared/types';

/**
 * Presentation for each severity tier. Colour is never the only cue:
 * SeverityBadge always pairs it with a sigil, threat pips and the label.
 */
export const SEVERITY_STYLE: Record<Severity, { label: string; threat: string; color: string; text: string; border: string; bar: string }> = {
  critical: { label: 'Critical', threat: 'Critical threat', color: '#c66a5e', text: 'text-sev-critical', border: 'border-sev-critical/45', bar: 'bg-sev-critical' },
  high: { label: 'High', threat: 'High threat', color: '#d0a260', text: 'text-sev-high', border: 'border-sev-high/45', bar: 'bg-sev-high' },
  medium: { label: 'Medium', threat: 'Moderate threat', color: '#b9a684', text: 'text-sev-medium', border: 'border-sev-medium/45', bar: 'bg-sev-medium' },
  low: { label: 'Low', threat: 'Minor threat', color: '#8d9a92', text: 'text-sev-low', border: 'border-sev-low/45', bar: 'bg-sev-low' },
};
