import { z } from 'zod';
import fixture from '../../fixtures/demo-findings.json';
import { isHost, json, methodNotAllowed, readJson, safeEqual } from '../../shared/server/http';

const FindingSchema = z.object({
  id: z.string(),
  ruleId: z.string(),
  title: z.string().max(120),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  safeSummary: z.string().max(400),
  remediationSummary: z.string().max(400),
}).passthrough();

const PayloadSchema = z.object({
  label: z.enum(['simulated', 'live']),
  scan: z.object({ id: z.string(), repositoryId: z.literal('demo-vulnerable-repo'), complete: z.boolean() }).passthrough(),
  findings: z.array(FindingSchema).max(50),
});

const FORBIDDEN = ['poc', 'evidence', 'payload', 'exploit', 'request', 'response'];

/**
 * GET  -> the last approved sanitized fixture (host only).
 * POST -> validate a worker upload (x-worker-secret). Persisting it needs Supabase;
 *         without it the worker's fixture file is the source of truth.
 */
export default async (req: Request) => {
  if (req.method === 'GET') {
    if (!isHost(req)) return json({ error: 'Host token required' }, 401);
    return json(fixture);
  }
  if (req.method !== 'POST') return methodNotAllowed();

  const secret = process.env.SCAN_WORKER_SHARED_SECRET;
  if (!secret || !safeEqual(req.headers.get('x-worker-secret') ?? '', secret)) {
    return json({ error: 'Worker secret required' }, 401);
  }
  const parsed = PayloadSchema.safeParse(await readJson(req));
  if (!parsed.success) return json({ error: 'Invalid payload', issues: parsed.error.issues }, 400);
  const leaked = parsed.data.findings.filter((f) => FORBIDDEN.some((k) => k in f));
  if (leaked.length) return json({ error: 'Unsanitized fields present', findings: leaked.map((f) => f.id) }, 422);

  return json({ accepted: parsed.data.findings.length, persisted: false, label: parsed.data.label }, 202);
};
