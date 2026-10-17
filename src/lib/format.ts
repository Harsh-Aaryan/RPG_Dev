import type { VerificationReceipt } from './types';

/** One-line provenance for a verified fix, e.g. "GitHub Actions · PR #4 · commit 0123456". */
export function describeReceipt(r: VerificationReceipt): string {
  if (r.verifier === 'github-actions') return `GitHub Actions · PR #${r.prNumber ?? '?'} · commit ${r.codeHash.slice(0, 7)}`;
  if (r.verifier === 'local-offline') return `local verifier (API offline, unsigned) · code ${r.codeHash}`;
  return `server verifier · code ${r.codeHash}`;
}
