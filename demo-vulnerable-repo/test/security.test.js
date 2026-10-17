const test = require('node:test');
const assert = require('node:assert');
const { FakeDb } = require('../src/db');
const h = require('../src/handlers');

test('rr-sqli: user input is never part of the SQL text', () => {
  const db = new FakeDb();
  const input = "x' OR '1'='1";
  h.findUser(db, input);
  const { sql, params } = db.log[0];
  assert.ok(!sql.includes(input), 'input leaked into SQL string');
  assert.deepStrictEqual(params, [input]);
});

test('rr-path: files outside the download directory are refused', () => {
  assert.throws(() => h.downloadFile('../package.json'));
  assert.strictEqual(h.downloadFile('readme.txt').trim(), 'Public download.');
});

test('rr-xss: reflected search term is HTML-escaped', () => {
  const html = h.renderSearch('<img src=x onerror=alert(1)>');
  assert.ok(!html.includes('<img'), 'raw markup reflected');
  assert.ok(html.includes('&lt;img'));
});

test('rr-errleak: error responses do not expose internals', () => {
  const res = h.handleError(new Error('db password=hunter2 at /srv/app'));
  const text = JSON.stringify(res.body);
  assert.strictEqual(res.status, 500);
  assert.ok(!text.includes('hunter2') && !text.includes('stack'));
});
