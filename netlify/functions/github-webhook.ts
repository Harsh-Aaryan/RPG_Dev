import { hmac, json, methodNotAllowed, safeEqual } from '../../shared/server/http';

/**
 * Records GitHub issue/PR activity. By design it never awards damage:
 * closing an issue or merging a PR only queues the quest for verification.
 */
export default async (req: Request) => {
  if (req.method !== 'POST') return methodNotAllowed();
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) return json({ error: 'Webhook not configured' }, 503);

  const raw = await req.text();
  const signature = req.headers.get('x-hub-signature-256') ?? '';
  if (!safeEqual(signature, `sha256=${hmac(secret, raw)}`)) {
    return json({ error: 'Invalid signature' }, 401);
  }

  const event = req.headers.get('x-github-event');
  const payload = JSON.parse(raw);
  const marker = /reporaid-finding:(f_[a-f0-9]+)/.exec(
    payload.issue?.body ?? payload.pull_request?.body ?? '',
  )?.[1];

  if (event === 'issues' && payload.action === 'closed') {
    return json({ findingId: marker, damage: 0, note: 'Issue closed. Closing alone does not damage the boss.' });
  }
  if (event === 'pull_request' && payload.action === 'closed' && payload.pull_request?.merged) {
    return json({ findingId: marker, damage: 0, next: 'verification-queued' });
  }
  return json({ ignored: true, event });
};
