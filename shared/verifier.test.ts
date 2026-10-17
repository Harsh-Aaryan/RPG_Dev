import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import fixture from '../fixtures/demo-findings.json';
import { RULES, runRegressionChecks } from './verifier';

const repo = join(__dirname, '..', 'demo-vulnerable-repo');
const allPass = (ruleId: string, code: string) =>
  runRegressionChecks(ruleId, code).every((t) => t.passed);

function runRealTest(ruleId: string, patch?: string): boolean {
  const dir = mkdtempSync(join(tmpdir(), 'reporaid-'));
  try {
    cpSync(repo, dir, { recursive: true });
    if (patch) {
      const file = join(dir, 'src', 'handlers.js');
      const name = RULES[ruleId].functionName;
      const src = readFileSync(file, 'utf8');
      writeFileSync(file, src.replace(new RegExp(`^function ${name}\\(.*?^\\}`, 'ms'), patch));
    }
    execFileSync('node', ['--test', '--test-name-pattern', ruleId, 'test/security.test.js'], {
      cwd: dir,
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('regression verifier', () => {
  for (const finding of fixture.findings) {
    const rule = RULES[finding.ruleId];

    it(`${finding.ruleId}: vulnerable excerpt fails static and runtime checks`, () => {
      expect(allPass(finding.ruleId, finding.codeExcerpt!)).toBe(false);
      expect(runRealTest(finding.ruleId)).toBe(false);
    });

    it(`${finding.ruleId}: reference patch passes static and runtime checks`, () => {
      expect(allPass(finding.ruleId, rule.referencePatch)).toBe(true);
      expect(runRealTest(finding.ruleId, rule.referencePatch)).toBe(true);
    });
  }

  it('ignores fixes that only exist in comments', () => {
    const code = `function findUser(db, name) {
  // db.query('SELECT 1 WHERE name = ?', [name])
  return db.query("SELECT id FROM users WHERE name = '" + name + "'");
}`;
    expect(allPass('rr-sqli', code)).toBe(false);
  });

  it('rejects unknown rules', () => {
    expect(allPass('nope', 'function x() {}')).toBe(false);
  });
});
