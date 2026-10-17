import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase Realtime for battle_events. The browser only ever gets the
 * publishable (anon) key, which RLS limits to SELECT on battle_events.
 * Returns null when Realtime isn't configured, and callers fall back to polling.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client: Promise<SupabaseClient> | null = null;

export const realtimeConfigured = Boolean(url && anonKey);

export function subscribeToBattleEvents(battleId: string, onInsert: () => void, onStatus: (live: boolean) => void): (() => void) | null {
  if (!realtimeConfigured) return null;
  let cancelled = false;
  let cleanup: (() => void) | null = null;
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(url!, anonKey!, { auth: { persistSession: false, autoRefreshToken: false } }),
  );
  client
    .then((sb) => {
      if (cancelled) return;
      const channel = sb
        .channel(`battle:${battleId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'battle_events', filter: `battle_id=eq.${battleId}` }, onInsert)
        .subscribe((status) => onStatus(status === 'SUBSCRIBED'));
      cleanup = () => {
        void sb.removeChannel(channel);
      };
    })
    .catch(() => onStatus(false));
  return () => {
    cancelled = true;
    cleanup?.();
  };
}
