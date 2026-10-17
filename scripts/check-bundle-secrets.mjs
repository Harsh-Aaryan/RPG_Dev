#!/usr/bin/env node
// Fails if the built site could leak a secret: any server-only env value, any
// token-shaped string, or code from server-only modules in dist/.
//   npm run build && node --env-file-if-exists=.env scripts/check-bundle-secrets.mjs
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const dist = process.argv[2] ?? 'dist';
const SERVER_ONLY = [
  'GEMINI_API_KEY',
  'GITHUB_TOKEN',
  'GITHUB_WEBHOOK_SECRET',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_DB_URL',
  'SUPABASE_DB_CA',
  'HOST_TOKEN',
  'VERIFIER_SECRET',
  'SCAN_WORKER_SHARED_SECRET',
  'LLM_API_KEY',
];
const secrets = SERVER_ONLY.map((k) => [k, process.env[k]]).filter(([, v]) => v && v.length >= 8);
const TOKEN_SHAPES = [
  /gh[pousr]_[A-Za-z0-9]{20,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{20,}/,
  /AIza[0-9A-Za-z_-]{30,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /postgres(?:ql)?:\/\/[^\s"'`]+:[^\s"'`]+@/,
];
// Strings that only appear in server-side dependencies.
const SERVER_MODULES = [/generativelanguage\.googleapis\.com/, /octokit\/rest/, /pg-pool/, /SCRAM-SHA-256/];

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(js|mjs|css|html|json|map|txt|svg)$/.test(name)) files.push(p);
  }
})(dist);

const problems = [];
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const where = relative(process.cwd(), file);
  for (const [name, value] of secrets) if (text.includes(value)) problems.push(`${where}: contains the value of ${name}`);
  for (const re of TOKEN_SHAPES) if (re.test(text)) problems.push(`${where}: token-shaped string ${re}`);
  if (!file.endsWith('.map')) for (const re of SERVER_MODULES) if (re.test(text)) problems.push(`${where}: server-only code ${re}`);
}

console.log(`Scanned ${files.length} files in ${dist}/ for ${secrets.length} configured secret value(s), token shapes and server-only modules.`);
if (problems.length) {
  for (const p of problems) console.error(`FAIL: ${p}`);
  process.exit(1);
}
console.log('PASS: no secrets or server-only code in the bundle');
