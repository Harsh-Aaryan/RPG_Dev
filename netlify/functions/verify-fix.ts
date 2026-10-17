import { hmac, json, methodNotAllowed, readJson } from '../../shared/server/http';
import { codeHash, MAX_SUBMISSION_LENGTH, runRegressionChecks } from '../../shared/verifier';
import type { VerificationReceipt, VerifyResponse } from '../../shared/types';

type Body = { battleId: string; questId: string; findingId: string; ruleId: string; code: string };

/**
 * Trusted verifier. Accepts the proposed code, never a "verified" flag, runs the
 * deterministic regression checks, and signs a receipt only when every check passes.
 */
export default async (req: Request) => {
  if (req.method !== 'POST') return methodNotAllowed();
  const b = await readJson<Body>(req);
  if (!b?.battleId || !b.questId || !b.findingId || !b.ruleId || typeof b.code !== 'string') {
    return json({ error: 'battleId, questId, findingId, ruleId and code are required' }, 400);
  }
  if (b.code.length > MAX_SUBMISSION_LENGTH) return json({ error: 'Submission too long' }, 413);

  const tests = runRegressionChecks(b.ruleId, b.code);
  const passed = tests.every((t) => t.passed);
  const response: VerifyResponse = { passed, tests };

  if (passed) {
    const secret = process.env.VERIFIER_SECRET || process.env.SCAN_WORKER_SHARED_SECRET || 'dev-only-secret';
    const unsigned: Omit<VerificationReceipt, 'signature'> = {
      battleId: b.battleId,
      questId: b.questId,
      findingId: b.findingId,
      codeHash: await codeHash(b.code),
      verifiedAt: new Date().toISOString(),
      verifier: 'server',
    };
    const payload = [unsigned.battleId, unsigned.questId, unsigned.findingId, unsigned.codeHash, unsigned.verifiedAt].join('|');
    response.receipt = { ...unsigned, signature: hmac(secret, payload) };
  }
  return json(response);
};
