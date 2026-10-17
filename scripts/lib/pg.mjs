import pg from 'pg';

/**
 * Connection to the shared-battle database for maintenance scripts.
 * Run scripts with `node --env-file=.env …` so secrets never hit the shell history.
 * TLS is always verified; Supabase's CA goes in SUPABASE_DB_CA (PEM).
 */
export function dbConfig() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    console.error('SUPABASE_DB_URL is not set. Add it to .env and run with: node --env-file=.env <script>');
    process.exit(2);
  }
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  const ca = process.env.SUPABASE_DB_CA?.replace(/\n/g, '\n');
  return {
    connectionString: url.replace(/([?&])sslmode=[^&]*&?/, '$1').replace(/[?&]$/, ''),
    ssl: local ? undefined : ca ? { ca } : true,
  };
}

export async function connect() {
  const client = new pg.Client(dbConfig());
  await client.connect();
  return client;
}
