import type { SafeFinding, Severity } from './types';

export const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low'];

export const DAMAGE: Record<Severity, number> = {
  critical: 400,
  high: 250,
  medium: 100,
  low: 50,
};

export const XP_PER_DAMAGE = 0.5;

export function damageWeight(severity: Severity): number {
  return DAMAGE[severity];
}

export function bossMaxHP(findings: Pick<SafeFinding, 'severity'>[]): number {
  return findings.reduce((sum, f) => sum + damageWeight(f.severity), 0);
}

/**
 * HP is derived from verified quest state, never decremented by events, so a
 * duplicate verification cannot double-count and an invalidated fix restores HP.
 */
export function bossCurrentHP(
  findings: Pick<SafeFinding, 'id' | 'severity'>[],
  verifiedFindingIds: Iterable<string>,
): number {
  const verified = new Set(verifiedFindingIds);
  const dealt = findings
    .filter((f) => verified.has(f.id))
    .reduce((sum, f) => sum + damageWeight(f.severity), 0);
  return bossMaxHP(findings) - dealt;
}

export function bossLevel(maxHP: number): number {
  return Math.max(1, Math.ceil(maxHP / 250));
}

export function bossSizeScale(findingCount: number): number {
  return Math.min(1.75, 1.0 + 0.07 * findingCount);
}

export function highestSeverity(findings: Pick<SafeFinding, 'severity'>[]): Severity | null {
  for (const s of SEVERITY_ORDER) if (findings.some((f) => f.severity === s)) return s;
  return null;
}

export type BossVariant = { name: string; title: string };

export function bossVariant(severity: Severity | null): BossVariant {
  switch (severity) {
    case 'critical':
      return { name: 'Rootkit Wyrm', title: 'Devourer of Trust' };
    case 'high':
      return { name: 'Cipher Golem', title: 'Warden of Broken Paths' };
    default:
      return { name: 'Null Wisp', title: 'Whisper in the Logs' };
  }
}
