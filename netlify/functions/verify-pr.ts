import { authParticipant, getQuest, recordVerifiedHit } from '../../shared/server/battles';
import { getDb } from '../../shared/server/db';
import { knownFinding } from '../../shared/server/findings';
import { demoRepo, fetchPrEvidence } from '../../shared/server/github';
import { hmac, isHost, json, methodNotAllowed, participantHeaders, readJson, serverSecret } from '../../shared/server/http';
import { evaluatePr } from '../../shared/server/pr-verify';
import type { SafeFinding, VerificationReceipt } from '../../shared/types';

type Body = { battleId?: string; questId?: string; findingId?: string; prNumber?: number };

/**
 * Host-only. Verifies a quest from a real pull request: the PR must target the
 * demo repo, change only application code, and carry a successful
 * `quest-<rule>` check run created by GitHub Actions on its head commit.
 * Nothing the browser sends about the PR (titles, "verified" flags) counts.
 */
export default async (req: Request) => {
  if (req.method !== 'POST') return methodNotAllowed();
  if (!isHost(req)) return json({ error: 'Host token required' }, 401);
  const target = demoRepo();
  if (!target) return json({ error: 'Pull request verification needs GITHUB_TOKEN and GITHUB_REPO.' }, 503);

  const b = await readJson<Body>(req);
  const prNumber = Number(b?.prNumber);
  if (!b?.battleId || !b.questId || !Number.isInteger(prNumber) || prNumber < 1 || prNumber > 1e7) {
    return json({ error: 'battleId, questId and a pull request number are required' }, 400);
  }

  const db = getDb();
  const h = participantHeaders(req);
  let finding: SafeFinding | null;
  let actorId: string | null = null;
  if (db && h.id) {
    const actor = await authParticipant(db, b.battleId, h.id, h.key);
    if (actor?.role !== 'host') return json({ error: 'Only this battle’s host can verify pull requests' }, 403);
    actorId = actor.id;
    const quest = await getQuest(db, b.battleId, b.questId);
    if (!quest) return json({ error: 'Quest not found' }, 404);
    if (quest.status === 'verified') return json({ verdict: { outcome: 'verified', detail: 'This quest is already verified.' }, alreadyVerified: true });
    finding = knownFinding(quest.finding_id);
  } else {
    finding = knownFinding(b.findingId);
  }
  if (!finding) return json({ error: 'Unknown finding' }, 400);

  let evidence;
  try {
    evidence = await fetchPrEvidence(prNumber);
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 404) return json({ error: `Pull request #${prNumber} was not found in ${target.fullName}.` }, 404);
    return json({ error: 'GitHub could not be reached. Try again in a moment.' }, 502);
  }

  const verdict = evaluatePr(finding.ruleId, target.fullName, evidence);
  if (verdict.outcome !== 'verified') return json({ verdict });

  const unsigned: Omit<VerificationReceipt, 'signature'> = {
    battleId: b.battleId,
    questId: b.questId,
    findingId: finding.id,
    codeHash: evidence.headSha.slice(0, 16),
    verifiedAt: new Date().toISOString(),
    verifier: 'github-actions',
    prNumber,
  };
  const payload = [unsigned.battleId, unsigned.questId, unsigned.findingId, unsigned.codeHash, unsigned.verifiedAt, prNumber].join('|');
  const receipt: VerificationReceipt = { ...unsigned, signature: hmac(serverSecret(), payload) };

  if (db && actorId) {
    const hit = await recordVerifiedHit(db, b.questId, actorId, receipt);
    return json({ verdict, receipt, hit: { applied: hit.applied, eventId: hit.event_id ? String(hit.event_id) : undefined } });
  }
  return json({ verdict, receipt });
};
