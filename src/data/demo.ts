import fixture from "../../fixtures/demo-findings.json";
import { DAMAGE, isSeverity } from "../lib/game-rules";
import type { Battle, FindingsSource, Quest } from "../lib/types";

export const DEMO_REPOSITORY = fixture.repository.fullName;
export const FIXTURE_DISCLAIMER = fixture.disclaimer;

export const SCAN_MS = 5200;
export const FORGE_MS = 1700;
export const VERIFY_MS = 2400;
export const MENTOR_MS = 700;

let eventCounter = 0;

export function nextId(prefix: string): string {
  eventCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${eventCounter}`;
}

export function questsForBattle(battleId: string): Quest[] {
  return fixture.findings.map((finding) => {
    if (!isSeverity(finding.severity)) {
      throw new Error(`Unknown severity on ${finding.id}`);
    }
    const quest: Quest = {
      id: `${battleId}:${finding.id}`,
      findingId: finding.id,
      title: finding.title,
      severity: finding.severity,
      cwe: finding.cwe,
      safeSummary: finding.safeSummary,
      remediationSummary: finding.remediationSummary,
      affectedPath: finding.affectedPath,
      questTitle: finding.questTitle,
      plainEnglishExplanation: finding.plainEnglishExplanation,
      learningGoal: finding.learningGoal,
      hints: [finding.hint1, finding.hint2, finding.hint3],
      mentorExplain: finding.mentorExplain,
      testCheck: finding.testCheck,
      fixAcceptanceCriteria: [...finding.fixAcceptanceCriteria],
      damage: DAMAGE[finding.severity],
      status: "open",
      hintsRevealed: 0,
      issueClosed: false,
      githubIssueNumber: finding.githubIssueNumber,
    };
    return quest;
  });
}

export function buildBattle(options: {
  id: string;
  host: string;
  source: FindingsSource;
}): Battle {
  const sourceLabel =
    options.source === "mocked-scan"
      ? "Simulated scan — a real Strix run is about 20 minutes and is not executed here."
      : "Cached simulated fixture — no scanner ran.";

  return {
    id: options.id,
    name: "Vault Raid",
    repository: DEMO_REPOSITORY,
    source: options.source,
    sourceLabel,
    status: "active",
    quests: questsForBattle(options.id),
    participants: [
      { id: nextId("player"), nickname: options.host, role: "host", xp: 0 },
      { id: nextId("player"), nickname: "Rune", role: "player", xp: 40 },
      { id: nextId("player"), nickname: "Glitch", role: "player", xp: 15 },
    ],
    events: [
      {
        id: nextId("event"),
        at: Date.now(),
        message:
          options.source === "mocked-scan"
            ? "Mocked Strix scan finished. Three simulated findings imported."
            : "Cached demo fixture imported. Three simulated findings are ready.",
      },
      {
        id: nextId("event"),
        at: Date.now() + 1,
        message: "Quest text forged from sanitized findings. Gemma 4 was not called.",
      },
    ],
    lastHit: null,
    createdAt: Date.now(),
  };
}

export function makeBattleId(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let id = "raid-";
  for (let index = 0; index < 4; index += 1) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return id;
}
