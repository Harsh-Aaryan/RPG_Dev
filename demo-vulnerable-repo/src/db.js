// Minimal fake database that records the SQL it receives, so tests can
// tell the difference between interpolated and parameterized queries.
class FakeDb {
  constructor() { this.log = []; }
  query(sql, params = []) {
    this.log.push({ sql, params });
    return [];
  }
}
module.exports = { FakeDb };
