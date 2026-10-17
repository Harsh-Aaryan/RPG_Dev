export type Severity = 'critical' | 'high' | 'medium' | 'low';

export type SafeFinding = {
  id: string; // stable fingerprint (repo + commit + source finding id)
  sourceId?: string;
  ruleId: string; // maps to a regression check in shared/verifier.ts
  repositoryId: string;
  scanId: string;
  title: string;
  severity: Severity;
  cwe?: string;
  safeSummary: string; // no secrets or live exploit payloads
  remediationSummary: string;
  affectedPath?: string;
  affectedFunction?: string;
  line?: number;
  codeExcerpt?: string; // only for public demo repos
  status: 'needs_review' | 'approved' | 'in_progress' | 'verified';
};

export type ScanInfo = {
  id: string;
  repositoryId: string;
  runName: string;
  commitSha: string;
  source: string;
  scanMode?: string;
  complete: boolean;
  finishedAt?: string;
};

export type FindingsFixture = {
  label: 'simulated' | 'live';
  scan: ScanInfo;
  findings: SafeFinding[];
};

export type QuestContent = {
  questTitle: string;
  plainEnglishExplanation: string;
  learningGoal: string;
  hint1: string;
  hint2: string;
  hint3: string;
  fixAcceptanceCriteria: string[];
};

export type QuestSource = 'gemma' | 'template';

export type QuestStatus = 'open' | 'claimed' | 'submitted' | 'verifying' | 'verified' | 'rejected';

export type VerificationReceipt = {
  battleId: string;
  questId: string;
  findingId: string;
  codeHash: string;
  verifiedAt: string;
  verifier: 'server' | 'local-offline' | 'github-actions';
  signature: string;
  /** Pull request whose quest check proved the fix (github-actions receipts). */
  prNumber?: number;
};

export type TestResult = { name: string; passed: boolean; detail: string };

export type VerifyResponse = {
  passed: boolean;
  tests: TestResult[];
  receipt?: VerificationReceipt;
};

export type MentorMode = 'explain' | 'hint' | 'test';

export type Quest = {
  id: string;
  findingId: string;
  battleId: string;
  content: QuestContent;
  source: QuestSource;
  model?: string;
  status: QuestStatus;
  damage: number;
  claimedBy?: string;
  attempts: number;
  issue?: { mock: boolean; number?: number; url?: string; title: string; body: string };
  receipt?: VerificationReceipt;
};

export type Participant = { id: string; nickname: string; xp: number; role: 'host' | 'player' };

export type BattleEventType = 'created' | 'join' | 'claim' | 'issue' | 'attempt' | 'hit' | 'reopen' | 'defeated';

export type BattleEvent = {
  id: string;
  type: BattleEventType;
  text: string;
  actor?: string;
  questId?: string;
  damage?: number;
  createdAt: string;
};

/** A battle as the browser renders it, whether it lives on this device or in the shared database. */
export type BattleView = {
  id: string;
  name: string;
  repositoryId: string;
  label: FindingsFixture['label'];
  scan: ScanInfo;
  status: 'forming' | 'active' | 'defeated';
  createdAt: string;
  defeatedAt?: string;
  findings: SafeFinding[];
  quests: Quest[];
  participants: Participant[];
  events: BattleEvent[];
  /** Shared battle backed by the server; absent for device-local battles. */
  remote?: boolean;
};

/** What the server can do in this deployment (GET /api/config). */
export type ServerConfig = { shared: boolean; gemma: boolean; github: boolean; hostTokenRequired: boolean };
