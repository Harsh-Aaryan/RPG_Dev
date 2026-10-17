import type { BossStats, BossType, Quest, Severity } from "./types";

export const DAMAGE: Record<Severity, number> = {
  critical: 400,
  high: 250,
  medium: 100,
  low: 50,
};

export const SEVERITY_RANK: Record<Severity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const BOSS_NAME: Record<BossType, string> = {
  "null-wisp": "Null Wisp",
  "cipher-golem": "Cipher Golem",
  "rootkit-wyrm": "Rootkit Wyrm",
};

export const AURA_COLOR: Record<Severity, string> = {
  critical: "#FF6C79",
  high: "#FF9B54",
  medium: "#9C78FF",
  low: "#49DBF2",
};

export function bossTypeFor(severity: Severity): BossType {
  if (severity === "critical") return "rootkit-wyrm";
  if (severity === "high") return "cipher-golem";
  return "null-wisp";
}

export function bossStats(quests: Quest[]): BossStats {
  const maxHP = quests.reduce((sum, quest) => sum + quest.damage, 0);
  const dealt = quests
    .filter((quest) => quest.status === "verified")
    .reduce((sum, quest) => sum + quest.damage, 0);
  const currentHP = Math.max(0, maxHP - dealt);
  const highest = quests.reduce<Severity>(
    (best, quest) => (SEVERITY_RANK[quest.severity] > SEVERITY_RANK[best] ? quest.severity : best),
    "low",
  );
  return {
    maxHP,
    currentHP,
    level: Math.max(1, Math.ceil(maxHP / 250)),
    sizeScale: Math.min(1.75, 1 + 0.07 * quests.length),
    type: bossTypeFor(highest),
    highest,
  };
}

export function isSeverity(value: string): value is Severity {
  return value === "critical" || value === "high" || value === "medium" || value === "low";
}
