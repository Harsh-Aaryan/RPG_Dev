import fixture from '../../fixtures/demo-findings.json';
import type { FindingsFixture, SafeFinding } from '../types';

const FINDINGS = new Map((fixture as FindingsFixture).findings.map((f) => [f.id, f]));

/**
 * The server's own copy of each approved finding. Functions look findings up
 * by id instead of trusting finding text sent by the browser.
 */
export function knownFinding(id: unknown): SafeFinding | null {
  return typeof id === 'string' ? (FINDINGS.get(id) ?? null) : null;
}
