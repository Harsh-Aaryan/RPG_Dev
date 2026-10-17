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
  verifier: 'server' | 'local-offline';
  signature: string;
};

export type TestResult = { name: string; passed: boolean; detail: string };

export type VerifyResponse = {
  passed: boolean;
  tests: TestResult[];
  receipt?: VerificationReceipt;
};

export type MentorMode = 'explain' | 'hint' | 'test';
