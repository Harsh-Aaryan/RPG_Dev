export type Severity = "critical" | "high" | "medium" | "low";

export type BossType = "null-wisp" | "cipher-golem" | "rootkit-wyrm";

export type QuestStatus = "open" | "claimed" | "verifying" | "verified" | "rejected";

export type BattleStatus = "forming" | "active" | "defeated";

export type FindingsSource = "cached-fixture" | "mocked-scan";

export interface Quest {
  id: string;
  findingId: string;
  title: string;
  severity: Severity;
  cwe?: string;
  safeSummary: string;
  remediationSummary: string;
  affectedPath?: string;
  questTitle: string;
  plainEnglishExplanation: string;
  learningGoal: string;
  hints: [string, string, string];
  mentorExplain: string;
  testCheck: string;
  fixAcceptanceCriteria: string[];
  damage: number;
  status: QuestStatus;
  hintsRevealed: number;
  issueClosed: boolean;
  githubIssueNumber: number;
}

export interface Participant {
  id: string;
  nickname: string;
  role: "host" | "player";
  xp: number;
}

export interface BattleEvent {
  id: string;
  message: string;
  damage?: number;
  at: number;
}

export interface LastHit {
  amount: number;
  at: number;
  played: boolean;
}

export interface Battle {
  id: string;
  name: string;
  repository: string;
  source: FindingsSource;
  sourceLabel: string;
  status: BattleStatus;
  quests: Quest[];
  participants: Participant[];
  events: BattleEvent[];
  lastHit: LastHit | null;
  createdAt: number;
}

export interface BossStats {
  maxHP: number;
  currentHP: number;
  level: number;
  sizeScale: number;
  type: BossType;
  highest: Severity;
}
