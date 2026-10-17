import { authParticipant, getQuest, recordAttempt, recordVerifiedHit } from '../../shared/server/battles';
import { getDb } from '../../shared/server/db';
import { knownFinding } from '../../shared/server/findings';
import { hmac, json, methodNotAllowed, participantHeaders, readJson, serverSecret } from '../../shared/server/http';
import { codeHash, MAX_SUBMISSION_LENGTH, runRegressionChecks } from '../../shared/verifier';
import type { SafeFinding, VerificationReceipt, VerifyResponse } from '../../shared/types';

type Body = { battleId: string; questId: string; findingId?: string; code: string };

async function sign(battleId: string, questId: string, finding: SafeFinding, code: string): Promise<VerificationReceipt> {
  const unsigned: Omit<VerificationReceipt, 'signature'> = {
    battleId,
    questId,
    findingId: finding.id,
    codeHash: await codeHash(code),
    verifiedAt: new Date().toISOString(),
    verifier: 'server',
  };
  const payload = [unsigned.battleId, unsigned.questId, unsigned.findingId, unsigned.codeHash, unsigned.verifiedAt].join('|');
  return { ...unsigned, signature: hmac(serverSecret(), payload) };
}

/**
 * Trusted verifier. Accepts the proposed code, never a "verified" flag, runs the
 * deterministic regression checks for the finding's own rule, and signs a
 * receipt only when every check passes. In a shared battle it also lands the
 * hit through record_verified_hit, which applies each quest exactly once.
 */
export default async (req: Request) => {
  if (req.method !== 'POST') return methodNotAllowed();
  const b = await readJson<Body>(req);
  if (!b?.battleId || !b.questId || typeof b.code !== 'string') {
    return json({ error: 'battleId, questId, findingId and code are required' }, 400);
  }
  if (b.code.length > MAX_SUBMISSION_LENGTH) return json({ error: 'Submission too long' }, 413);

  const db = getDb();
  const h = participantHeaders(req);
  if (db && h.id) {
    const actor = await authParticipant(db, b.battleId, h.id, h.key);
    if (!actor) return json({ error: 'Join the battle first' }, 401);
    const quest = await getQuest(db, b.battleId, b.questId);
    const finding = quest && knownFinding(quest.finding_id);
    if (!quest || !finding) return json({ error: 'Quest not found' }, 404);
    if (quest.status === 'verified') return json({ passed: true, tests: [], alreadyVerified: true });

    const tests = runRegressionChecks(finding.ruleId, b.code);
    const passed = tests.every((t) => t.passed);
    await recordAttempt(db, b.battleId, b.questId, actor, passed);
    if (!passed) return json({ passed, tests } satisfies VerifyResponse);
    const receipt = await sign(b.battleId, b.questId, finding, b.code);
    const hit = await recordVerifiedHit(db, b.questId, actor.id, receipt);
    return json({ passed, tests, receipt, hit: { applied: hit.applied, eventId: hit.event_id ? String(hit.event_id) : undefined } });
  }

  // Local-first battle: the rule comes from the server's copy of the finding, so a
  // client cannot pass an easier rule's checks off as a fix for a harder quest.
  const finding = knownFinding(b.findingId);
  if (!finding) return json({ error: 'Unknown findingId' }, 400);
  const tests = runRegressionChecks(finding.ruleId, b.code);
  const passed = tests.every((t) => t.passed);
  const response: VerifyResponse = { passed, tests };
  if (passed) response.receipt = await sign(b.battleId, b.questId, finding, b.code);
  return json(response);
};
