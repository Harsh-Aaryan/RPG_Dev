import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

export function methodNotAllowed(): Response {
  return json({ error: 'Method not allowed' }, 405);
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Host-only actions require HOST_TOKEN when it is configured (always set it in production). */
export function isHost(req: Request): boolean {
  const expected = process.env.HOST_TOKEN;
  if (!expected) return true;
  return safeEqual(req.headers.get('x-host-token') ?? '', expected);
}

const buckets = new Map<string, { count: number; reset: number }>();

/** Best-effort per-instance limiter; swap for a shared store in production. */
export function rateLimited(req: Request, limit = 20, windowMs = 60_000): boolean {
  const key = req.headers.get('x-nf-client-connection-ip') ?? req.headers.get('x-forwarded-for') ?? 'anon';
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return false;
  }
  b.count += 1;
  return b.count > limit;
}

export function hmac(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export async function readJson<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

/** Server-side HMAC secret for receipts and quest signatures. */
export function serverSecret(): string {
  return process.env.VERIFIER_SECRET || process.env.SCAN_WORKER_SHARED_SECRET || 'dev-only-secret';
}

/**
 * Signature over generated quest content, so a shared battle only accepts quest
 * text (and its Gemma/template label) that this server actually produced.
 */
export function questSignature(findingId: string, source: string, model: string | undefined, quest: unknown): string {
  const digest = createHash('sha256').update(canonicalJson(quest)).digest('hex');
  return hmac(serverSecret(), [findingId, source, model ?? '', digest].join('|'));
}

export function participantHeaders(req: Request): { id: string | null; key: string | null } {
  return { id: req.headers.get('x-participant-id'), key: req.headers.get('x-participant-key') };
}

export function notConfigured(): Response {
  return json({ error: 'Shared battles are not configured on this deployment (set SUPABASE_DB_URL).' }, 503);
}

/** JSON with sorted object keys, so equal values always hash the same. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}
