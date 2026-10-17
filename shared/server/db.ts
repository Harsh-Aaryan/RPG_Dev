import pg from 'pg';

/** Minimal database surface used by the battle repository. */
export interface Db {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
  /** Run `fn` inside one transaction on one connection. */
  tx<T>(fn: (db: Db) => Promise<T>): Promise<T>;
}

let override: Db | null = null;
let pool: pg.Pool | null = null;

/** Tests inject an in-process Postgres (PGlite) here. */
export function setDb(db: Db | null) {
  override = db;
}

function wrap(client: pg.Pool | pg.PoolClient): Db {
  return {
    async query(text, params) {
      const res = await client.query(text, params as unknown[]);
      return res.rows;
    },
    async tx(fn) {
      if (!('release' in client)) {
        const conn = await (client as pg.Pool).connect();
        try {
          await conn.query('begin');
          const out = await fn(wrap(conn));
          await conn.query('commit');
          return out;
        } catch (err) {
          await conn.query('rollback').catch(() => {});
          throw err;
        } finally {
          conn.release();
        }
      }
      return fn(wrap(client));
    },
  };
}

/**
 * The shared-battle database, or null when this deployment runs in local mode.
 * SUPABASE_DB_URL is the Supabase session-pooler URI (server-only; never VITE_).
 */
export function getDb(): Db | null {
  if (override) return override;
  const url = process.env.SUPABASE_DB_URL;
  if (!url) return null;
  if (!pool) {
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
    // TLS is always verified. Supabase signs its pooler certificate with its own CA:
    // download it (Database settings → SSL) and put the PEM in SUPABASE_DB_CA.
    const ca = process.env.SUPABASE_DB_CA?.replace(/\\n/g, '\n');
    pool = new pg.Pool({
      connectionString: url.replace(/([?&])sslmode=[^&]*&?/, '$1').replace(/[?&]$/, ''),
      max: 2,
      idleTimeoutMillis: 10_000,
      ssl: local ? undefined : ca ? { ca } : true,
    });
  }
  return wrap(pool);
}
