import type { TestResult } from './types';

/**
 * Deterministic regression checks for the demo repo's four findings.
 *
 * These are static checks that mirror demo-vulnerable-repo/test/security.test.js.
 * We deliberately do NOT execute player-submitted code inside a Netlify Function.
 * The authoritative runtime check is the real test suite (worker/verify_fix.sh / CI);
 * shared/verifier.test.ts proves the reference patches pass both.
 */

type Check = { name: string; test: (code: string) => boolean; failDetail: string };

type Rule = {
  functionName: string;
  checks: Check[];
  referencePatch: string;
  testDescription: string;
};

function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

export const RULES: Record<string, Rule> = {
  'rr-sqli': {
    functionName: 'findUser',
    testDescription:
      'Calls findUser with a hostile name and checks the SQL text the database receives never contains the input, and that the input is passed as a bound parameter instead.',
    checks: [
      {
        name: 'User input is not concatenated or interpolated into SQL',
        test: (c) =>
          !/query\(\s*"[^"]*"\s*\+|query\(\s*'[^']*'\s*\+|query\(\s*`[^`]*\$\{/.test(c) &&
          !/\+\s*name\b/.test(c) &&
          !/\$\{\s*name\s*\}/.test(c),
        failDetail: 'The name value still reaches the SQL string directly.',
      },
      {
        name: 'Query uses a placeholder',
        test: (c) => /query\(\s*(["'`])[^"'`]*(\?|\$1)[^"'`]*\1/.test(c),
        failDetail: 'Expected a ? (or $1) placeholder in the SQL text.',
      },
      {
        name: 'Input is passed as a bound parameter',
        test: (c) => /query\([\s\S]*?,\s*\[\s*name\s*\]\s*\)/.test(c),
        failDetail: 'Expected db.query(sql, [name]).',
      },
    ],
    referencePatch: `function findUser(db, name) {
  return db.query('SELECT id, name FROM users WHERE name = ?', [name]);
}`,
  },
  'rr-path': {
    functionName: 'downloadFile',
    testDescription:
      'Requests ../package.json (must throw) and readme.txt (must still be returned), proving traversal is blocked without breaking legitimate downloads.',
    checks: [
      {
        name: 'Path is resolved or reduced before use',
        test: (c) => /path\.(resolve|basename|normalize)\(/.test(c),
        failDetail: 'Resolve the final path (path.resolve) or reduce input with path.basename.',
      },
      {
        name: 'Resolved path is contained in the download directory',
        test: (c) =>
          /\.startsWith\(\s*(FILES_DIR|base|root|dir)/.test(c) ||
          /path\.basename\(\s*fileName\s*\)/.test(c),
        failDetail: 'Check the resolved path still starts with FILES_DIR.',
      },
      {
        name: 'Escaping requests are refused',
        test: (c) => /throw\b/.test(c) || /path\.basename\(\s*fileName\s*\)/.test(c),
        failDetail: 'Throw (or otherwise refuse) when the path escapes the directory.',
      },
    ],
    referencePatch: `function downloadFile(fileName) {
  const target = path.resolve(FILES_DIR, fileName);
  if (!target.startsWith(FILES_DIR + path.sep)) {
    throw new Error('Invalid file');
  }
  return fs.readFileSync(target, 'utf8');
}`,
  },
  'rr-xss': {
    functionName: 'renderSearch',
    testDescription:
      'Renders a search term containing HTML markup and checks the output contains the escaped form (&lt;img) and never the raw tag.',
    checks: [
      {
        name: 'Search term is not reflected raw',
        test: (c) => !/\$\{\s*q\s*\}/.test(c) && !/\+\s*q\b/.test(c),
        failDetail: 'The raw q value is still inserted into the HTML.',
      },
      {
        name: 'Markup characters are HTML-escaped',
        test: (c) => c.includes('&lt;') && c.includes('&amp;'),
        failDetail: 'Escape at least & and < (to &amp; and &lt;) before inserting.',
      },
    ],
    referencePatch: `function renderSearch(q) {
  const safe = String(q)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  return \`<h1>Results for \${safe}</h1>\`;
}`,
  },
  'rr-errleak': {
    functionName: 'handleError',
    testDescription:
      'Passes an error whose message contains a fake password and checks the response is still a 500 but exposes neither the message nor a stack trace.',
    checks: [
      {
        name: 'Stack trace is not returned',
        test: (c) => !/\bstack\b/.test(c.replace(/console\.error\([^)]*\)/g, '')),
        failDetail: 'Remove the stack from the response body.',
      },
      {
        name: 'Raw error message is not returned',
        test: (c) => !/err\.message/.test(c.replace(/console\.error\([^)]*\)/g, '')),
        failDetail: 'Return a generic message instead of err.message.',
      },
      {
        name: 'Still responds with HTTP 500',
        test: (c) => /status:\s*500/.test(c),
        failDetail: 'Keep status: 500 so clients know the request failed.',
      },
    ],
    referencePatch: `function handleError(err) {
  console.error(err);
  return { status: 500, body: { error: 'Internal server error' } };
}`,
  },
};

export const MAX_SUBMISSION_LENGTH = 4000;

export function runRegressionChecks(ruleId: string, submitted: string): TestResult[] {
  const rule = RULES[ruleId];
  if (!rule) return [{ name: 'Known rule', passed: false, detail: `No verifier for ${ruleId}` }];
  if (submitted.length > MAX_SUBMISSION_LENGTH) {
    return [{ name: 'Submission size', passed: false, detail: 'Submission is too long.' }];
  }
  const code = stripComments(submitted);
  const results: TestResult[] = [
    {
      name: `Defines ${rule.functionName}()`,
      passed: new RegExp(`function\\s+${rule.functionName}\\s*\\(`).test(code),
      detail: `Keep the ${rule.functionName} function signature.`,
    },
  ];
  for (const check of rule.checks) {
    const passed = check.test(code);
    results.push({ name: check.name, passed, detail: passed ? 'ok' : check.failDetail });
  }
  return results;
}

export async function codeHash(code: string): Promise<string> {
  const normalized = stripComments(code).replace(/\s+/g, ' ').trim();
  const bytes = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}
