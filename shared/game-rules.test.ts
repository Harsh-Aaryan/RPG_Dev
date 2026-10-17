import { describe, expect, it } from 'vitest';
import { bossCurrentHP, bossLevel, bossMaxHP, bossSizeScale, highestSeverity } from './game-rules';

const findings = [
  { id: 'a', severity: 'critical' as const },
  { id: 'b', severity: 'high' as const },
  { id: 'c', severity: 'medium' as const },
  { id: 'd', severity: 'low' as const },
];

describe('game rules', () => {
  it('derives boss stats from findings', () => {
    expect(bossMaxHP(findings)).toBe(800);
    expect(bossLevel(800)).toBe(4);
    expect(bossSizeScale(4)).toBeCloseTo(1.28);
    expect(bossSizeScale(40)).toBe(1.75);
    expect(highestSeverity(findings)).toBe('critical');
  });

  it('counts each verified finding once', () => {
    expect(bossCurrentHP(findings, ['a', 'a', 'a'])).toBe(400);
    expect(bossCurrentHP(findings, ['a', 'b', 'c', 'd'])).toBe(0);
    expect(bossCurrentHP(findings, ['unknown'])).toBe(800);
  });
});
