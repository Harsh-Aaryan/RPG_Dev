const fs = require('fs');
const path = require('path');

const FILES_DIR = path.join(__dirname, '..', 'files');

// QUEST rr-sqli: untrusted input is concatenated into SQL.
function findUser(db, name) {
  return db.query("SELECT id, name FROM users WHERE name = '" + name + "'");
}

// QUEST rr-path: user-controlled path segment is joined without containment.
function downloadFile(fileName) {
  const target = path.join(FILES_DIR, fileName);
  return fs.readFileSync(target, 'utf8');
}

// QUEST rr-xss: search term is reflected into HTML unescaped.
function renderSearch(q) {
  return `<h1>Results for ${q}</h1>`;
}

// QUEST rr-errleak: internal error details are returned to the client.
function handleError(err) {
  return { status: 500, body: { error: err.message, stack: err.stack } };
}

module.exports = { findUser, downloadFile, renderSearch, handleError, FILES_DIR };
