/**
 * Text hygiene for anything that leaves the trust boundary: prompts sent to
 * Gemma and bodies posted to public GitHub issues. Mirrors (and extends) the
 * redactions in worker/parse_strix.py.
 */

const REDACTIONS: [RegExp, string][] = [
  // PEM private keys, whole block.
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(-----END [A-Z ]*PRIVATE KEY-----|$)/g, '[REDACTED_KEY]'],
  // key=value style secrets.
  [/\b(password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key|client[_-]?secret)\s*[=:]\s*["']?[^\s"',;]+/gi, '$1=[REDACTED]'],
  // Provider tokens: GitHub, OpenAI/Anthropic-style, AWS, Slack, Google, JWTs.
  [/\b(gh[pousr]_[A-Za-z0-9]{16,}|github_pat_[A-Za-z0-9_]{20,})\b/g, '[REDACTED_TOKEN]'],
  [/\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{16,}\b/g, '[REDACTED_TOKEN]'],
  [/\b(AKIA|ASIA)[A-Z0-9]{16}\b/g, '[REDACTED_TOKEN]'],
  [/\bxox[abposr]-[A-Za-z0-9-]{10,}\b/g, '[REDACTED_TOKEN]'],
  [/\bAIza[0-9A-Za-z_-]{30,}\b/g, '[REDACTED_TOKEN]'],
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, '[REDACTED_TOKEN]'],
  // Internal hosts and private address space.
  [
    /\b(?:https?:\/\/)?(?:localhost|127\.\d{1,3}\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:internal|local|corp|lan|intranet))(?::\d+)?(?:\/[^\s)"'<>]*)?/gi,
    '[INTERNAL_HOST]',
  ],
  // Email addresses.
  [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[REDACTED_EMAIL]'],
  // Script payloads.
  [/<script\b[^>]*>[\s\S]*?(<\/script>|$)/gi, '[PAYLOAD_REMOVED]'],
];

// Phrases that try to re-task a model. Kept as inert, visibly-marked text.
const INJECTION = [
  /\b(ignore|disregard|forget|override)\b[^.\n]{0,40}\b(previous|prior|above|earlier|all|any|system|your)\b[^.\n]{0,40}\b(instructions?|prompts?|rules?|directions?)\b/gi,
  /\byou are now\b/gi,
  /\b(system|developer)\s*(prompt|message)\s*:/gi,
  /\bact as\b[^.\n]{0,30}\b(unrestricted|jailbroken|dan|admin)\b/gi,
  /\b(reveal|print|show|output)\b[^.\n]{0,30}\b(system prompt|hidden instructions|secrets?|api keys?|env(ironment)? var(iable)?s?)\b/gi,
];

// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g;

export function redact(text: string): string {
  let out = text;
  for (const [pattern, replacement] of REDACTIONS) out = out.replace(pattern, replacement);
  return out;
}

export function neutralizeInjection(text: string): string {
  let out = text;
  for (const pattern of INJECTION) out = out.replace(pattern, (m) => `[quoted instruction: "${m.replace(/["\[\]]/g, '')}"]`);
  return out;
}

function cap(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/**
 * For model prompts: strip control characters, redact secrets, mark injection
 * attempts as quoted data, and replace angle brackets so untrusted text can
 * never open or close the <finding>/<question> tags around it.
 */
export function sanitizeForModel(value: unknown, max = 600): string {
  if (value === null || value === undefined) return '';
  let text = String(value).replace(CONTROL, '').replace(/\r\n?/g, '\n');
  text = redact(text);
  text = neutralizeInjection(text);
  text = text.replace(/</g, '‹').replace(/>/g, '›');
  return cap(text.replace(/[ \t]+/g, ' ').trim(), max);
}

/**
 * For public GitHub issues: the same redactions, plus no @mentions (which
 * would ping strangers), no raw HTML and no auto-linked internal hosts.
 */
export function sanitizeForIssue(value: unknown, max = 800): string {
  if (value === null || value === undefined) return '';
  let text = String(value).replace(CONTROL, '').replace(/\r\n?/g, '\n');
  text = redact(text);
  text = neutralizeInjection(text);
  text = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  text = text.replace(/(^|[^\w`])@([A-Za-z0-9-]+)/g, '$1@​$2');
  return cap(text.replace(/[ \t]+/g, ' ').trim(), max);
}
