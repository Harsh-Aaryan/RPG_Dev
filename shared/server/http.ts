import { createHmac, timingSafeEqual } from 'node:crypto';

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
