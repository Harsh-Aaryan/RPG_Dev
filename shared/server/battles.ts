import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { damageWeight } from '../game-rules';
import type {
  BattleEvent,
  BattleView,
  FindingsFixture,
  Participant,
  Quest,
  QuestContent,
  QuestSource,
  SafeFinding,
  ScanInfo,
  VerificationReceipt,
} from '../types';
import type { Db } from './db';

/** Repository for shared battles. All HP changes go through the SQL functions. */

const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';
export function newBattleId(len = 6): string {
  return Array.from(randomBytes(len), (b) => ALPHABET[b % ALPHABET.length]).join('');
}
const newQuestId = () => `q_${randomBytes(6).toString('hex')}`;
const newKey = () => randomBytes(24).toString('base64url');
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export type Credentials = { participantId: string; key: string; nickname: string };

type BattleRow = {
  id: string;
  name: string;
  repository_id: string;
  label: FindingsFixture['label'];
  scan: ScanInfo;
  findings: SafeFinding[];
  status: BattleView['status'];
  created_at: Date | string;
  defeated_at: Date | string | null;
};
type QuestRow = {
  id: string;
  battle_id: string;
  finding_id: string;
  content: QuestContent;
  source: QuestSource;
  model: string | null;
  damage: number;
  status: Quest['status'];
  claimed_by: string | null;
  attempts: number;
  issue: Quest['issue'] | null;
  receipt: VerificationReceipt | null;
};
type EventRow = {
  id: string | number;
  event_type: BattleEvent['type'];
  quest_id: string | null;
  actor: string | null;
  damage: number;
  message: string;
  created_at: Date | string;
};

const iso = (d: Date | string | null) => (d === null ? undefined : new Date(d).toISOString());

export async function createBattle(
  db: Db,
  input: {
    name: string;
    hostNickname: string;
    label: FindingsFixture['label'];
    scan: ScanInfo;
    findings: SafeFinding[];
    quests: Record<string, { quest: QuestContent; source: QuestSource; model?: string }>;
  },
): Promise<{ battleId: string; host: Credentials }> {
  const battleId = newBattleId();
  const key = newKey();
  return db.tx(async (tx) => {
    await tx.query(
      `insert into battles (id, name, repository_id, label, scan, findings, status) values ($1, $2, $3, $4, $5, $6, 'active')`,
      [battleId, input.name, input.scan.repositoryId, input.label, JSON.stringify(input.scan), JSON.stringify(input.findings)],
    );
    const [host] = await tx.query<{ id: string }>(
      `insert into participants (battle_id, nickname, role) values ($1, $2, 'host') returning id`,
      [battleId, input.hostNickname],
    );
    await tx.query(`insert into participant_secrets (participant_id, secret_hash) values ($1, $2)`, [host.id, sha256(key)]);
    for (const [i, f] of input.findings.entries()) {
      const g = input.quests[f.id];
      await tx.query(
        `insert into quests (id, battle_id, finding_id, position, content, source, model, damage) values ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [newQuestId(), battleId, f.id, i, JSON.stringify(g.quest), g.source, g.model ?? null, damageWeight(f.severity)],
      );
    }
    await tx.query(`select recompute_battle($1)`, [battleId]);
    await tx.query(`insert into battle_events (battle_id, event_type, actor, message) values ($1, 'created', $2, $3)`, [
      battleId,
      host.id,
      `${input.hostNickname} opened the raid on ${input.scan.repositoryId}`,
    ]);
    return { battleId, host: { participantId: host.id, key, nickname: input.hostNickname } };
  });
}

export async function getBattle(db: Db, battleId: string): Promise<BattleView | null> {
  const [b] = await db.query<BattleRow>(`select * from battles where id = $1`, [battleId]);
  if (!b) return null;
  const [quests, participants, events] = await Promise.all([
    db.query<QuestRow>(`select * from quests where battle_id = $1 order by position`, [battleId]),
    db.query<Participant & { created_at: string }>(
      `select id, nickname, xp, role, created_at from participants where battle_id = $1 order by created_at`,
      [battleId],
    ),
    db.query<EventRow>(
      `select id, event_type, quest_id, actor, damage, message, created_at from battle_events where battle_id = $1 order by id desc limit 60`,
      [battleId],
    ),
  ]);
  return {
    id: b.id,
    name: b.name,
    repositoryId: b.repository_id,
    label: b.label,
    scan: b.scan,
    status: b.status,
    createdAt: iso(b.created_at)!,
    defeatedAt: iso(b.defeated_at),
    findings: b.findings,
    quests: quests.map((q) => ({
      id: q.id,
      battleId: q.battle_id,
      findingId: q.finding_id,
      content: q.content,
      source: q.source,
      model: q.model ?? undefined,
      status: q.status,
      damage: q.damage,
      claimedBy: q.claimed_by ?? undefined,
      attempts: q.attempts,
      issue: q.issue ?? undefined,
      receipt: q.receipt ?? undefined,
    })),
    participants: participants.map((p) => ({ id: p.id, nickname: p.nickname, xp: p.xp, role: p.role })),
    // Oldest first, like the local store; the feed reverses for display.
    events: events.reverse().map((e) => ({
      id: String(e.id),
      type: e.event_type,
      text: e.message,
      actor: e.actor ?? undefined,
      questId: e.quest_id ?? undefined,
      damage: e.damage || undefined,
      createdAt: iso(e.created_at)!,
    })),
    remote: true,
  };
}

export async function joinBattle(db: Db, battleId: string, nickname: string): Promise<Credentials | null> {
  const key = newKey();
  return db.tx(async (tx) => {
    const [b] = await tx.query(`select id from battles where id = $1`, [battleId]);
    if (!b) return null;
    const [p] = await tx.query<{ id: string }>(`insert into participants (battle_id, nickname) values ($1, $2) returning id`, [battleId, nickname]);
    await tx.query(`insert into participant_secrets (participant_id, secret_hash) values ($1, $2)`, [p.id, sha256(key)]);
    await tx.query(`insert into battle_events (battle_id, event_type, actor, message) values ($1, 'join', $2, $3)`, [
      battleId,
      p.id,
      `${nickname} joined the party`,
    ]);
    return { participantId: p.id, key, nickname };
  });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Participant whose key matches, and who belongs to this battle. */
export async function authParticipant(db: Db, battleId: string, participantId: string | null, key: string | null) {
  if (!participantId || !key || !UUID.test(participantId)) return null;
  const [row] = await db.query<{ id: string; nickname: string; role: Participant['role']; battle_id: string; secret_hash: string }>(
    `select p.id, p.nickname, p.role, p.battle_id, s.secret_hash
       from participants p join participant_secrets s on s.participant_id = p.id
      where p.id = $1`,
    [participantId],
  );
  if (!row || row.battle_id !== battleId) return null;
  const a = Buffer.from(sha256(key));
  const b = Buffer.from(row.secret_hash);
  return a.length === b.length && timingSafeEqual(a, b) ? { id: row.id, nickname: row.nickname, role: row.role } : null;
}

export async function getQuest(db: Db, battleId: string, questId: string): Promise<QuestRow | null> {
  const [q] = await db.query<QuestRow>(`select * from quests where id = $1 and battle_id = $2`, [questId, battleId]);
  return q ?? null;
}

export async function claimQuest(db: Db, battleId: string, questId: string, actor: { id: string; nickname: string }) {
  return db.tx(async (tx) => {
    const [q] = await tx.query<QuestRow>(`select * from quests where id = $1 and battle_id = $2 for update`, [questId, battleId]);
    if (!q) return 'not_found' as const;
    if (q.status === 'verified') return 'verified' as const;
    await tx.query(
      `update quests set claimed_by = $2, status = case when status in ('open', 'rejected') then 'claimed' else status end where id = $1`,
      [questId, actor.id],
    );
    await tx.query(`insert into battle_events (battle_id, event_type, quest_id, actor, message) values ($1, 'claim', $2, $3, $4)`, [
      battleId,
      questId,
      actor.id,
      `${actor.nickname} accepted “${q.content.questTitle}”`,
    ]);
    return 'ok' as const;
  });
}

/** A failed attempt is recorded; a passing one only moves the quest to verifying until the hit lands. */
export async function recordAttempt(db: Db, battleId: string, questId: string, actor: { id: string; nickname: string }, passed: boolean) {
  await db.tx(async (tx) => {
    const [q] = await tx.query<QuestRow>(`select * from quests where id = $1 and battle_id = $2 for update`, [questId, battleId]);
    if (!q || q.status === 'verified') return;
    await tx.query(`update quests set attempts = attempts + 1, status = $2 where id = $1`, [questId, passed ? 'verifying' : 'rejected']);
    if (!passed) {
      await tx.query(`insert into battle_events (battle_id, event_type, quest_id, actor, message) values ($1, 'attempt', $2, $3, $4)`, [
        battleId,
        questId,
        actor.id,
        `${actor.nickname}'s fix for “${q.content.questTitle}” failed the regression test`,
      ]);
    }
  });
}

export type HitResult = { applied: boolean; reason?: string; damage?: number; event_id?: number; status?: string; current_hp?: number; max_hp?: number };

export async function recordVerifiedHit(db: Db, questId: string, participantId: string | null, receipt: VerificationReceipt): Promise<HitResult> {
  const [row] = await db.query<{ r: HitResult }>(`select record_verified_hit($1, $2, $3) as r`, [questId, participantId, JSON.stringify(receipt)]);
  return row.r;
}

export async function invalidateHit(db: Db, questId: string, reason: string): Promise<HitResult> {
  const [row] = await db.query<{ r: HitResult }>(`select invalidate_hit($1, $2) as r`, [questId, reason]);
  return row.r;
}

export async function attachIssue(db: Db, battleId: string, questId: string, issue: NonNullable<Quest['issue']>) {
  await db.tx(async (tx) => {
    const [q] = await tx.query<QuestRow>(`select * from quests where id = $1 and battle_id = $2 for update`, [questId, battleId]);
    if (!q) return;
    await tx.query(`update quests set issue = $2 where id = $1`, [questId, JSON.stringify(issue)]);
    await tx.query(`insert into battle_events (battle_id, event_type, quest_id, message) values ($1, 'issue', $2, $3)`, [
      battleId,
      questId,
      issue.mock ? `Drafted safe issue for “${q.content.questTitle}” (simulated)` : `Opened GitHub issue #${issue.number}`,
    ]);
  });
}
