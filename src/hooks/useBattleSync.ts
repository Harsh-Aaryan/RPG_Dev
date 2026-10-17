import { useCallback, useEffect, useRef, useState } from 'react';
import { getParticipant } from '../lib/identity';
import { subscribeToBattleEvents } from '../lib/realtime';
import { fetchBattle, getServerConfig } from '../lib/remote';
import { useBattleStore, type Battle } from '../store/useBattleStore';

export type Connection = 'device' | 'realtime' | 'polling' | 'offline';
export type SyncState = {
  /** local: lives on this device; ready: shared and fetched; missing: nowhere to be found. */
  phase: 'local' | 'loading' | 'ready' | 'missing';
  connection: Connection;
  /** True once this page has the server's current state (not a cached copy). */
  synced: boolean;
  refresh: () => Promise<void>;
};

/**
 * Keeps a battle current. Device-local battles need nothing. Shared battles are
 * fetched on mount, refetched (debounced) on every Realtime insert into
 * battle_events, and polled as a fallback: every 4 s without Realtime, every
 * 15 s with it, paused while the tab is hidden.
 */
export function useBattleSync(battleId: string): SyncState {
  const battle = useBattleStore((s) => s.battles[battleId]) as Battle | undefined;
  const upsert = useBattleStore((s) => s.upsertBattle);
  const isLocal = Boolean(battle && !battle.remote);

  const [phase, setPhase] = useState<SyncState['phase']>(isLocal ? 'local' : 'loading');
  const [connection, setConnection] = useState<Connection>(isLocal ? 'device' : 'polling');
  const [synced, setSynced] = useState(false);
  const live = useRef(false);

  const refresh = useCallback(async () => {
    if (isLocal) return;
    try {
      const fresh = await fetchBattle(battleId);
      if (fresh) {
        upsert(fresh);
        setPhase('ready');
        setSynced(true);
        if (!live.current) setConnection('polling');
      } else {
        setPhase('missing');
      }
    } catch {
      setConnection('offline');
      setPhase((p) => (p === 'loading' ? (useBattleStore.getState().battles[battleId] ? 'ready' : 'missing') : p));
    }
  }, [battleId, isLocal, upsert]);

  useEffect(() => {
    if (isLocal) {
      setPhase('local');
      setConnection('device');
      return;
    }
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let debounce: ReturnType<typeof setTimeout> | undefined;
    let unsubscribe: (() => void) | null = null;

    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(
        async () => {
          if (!document.hidden) await refresh();
          if (!disposed) schedule();
        },
        live.current ? 15_000 : 4_000,
      );
    };

    void (async () => {
      const cfg = await getServerConfig();
      if (disposed) return;
      if (!cfg?.shared) {
        // No shared backend: a cached copy of a shared battle can still be viewed.
        setPhase(useBattleStore.getState().battles[battleId] ? 'ready' : 'missing');
        setConnection('offline');
        return;
      }
      await refresh();
      if (disposed) return;
      unsubscribe = subscribeToBattleEvents(
        battleId,
        () => {
          clearTimeout(debounce);
          debounce = setTimeout(() => void refresh(), 150);
        },
        (isLive) => {
          live.current = isLive;
          setConnection(isLive ? 'realtime' : 'polling');
        },
      );
      schedule();
    })();

    const onVisible = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      disposed = true;
      clearTimeout(timer);
      clearTimeout(debounce);
      unsubscribe?.();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [battleId, isLocal, refresh]);

  return { phase, connection, synced: isLocal || synced, refresh };
}

/** Who "I" am in this battle: the shared participant id, or this device's id for local battles. */
export function useMe(battle: Battle | undefined): string {
  const deviceId = useBattleStore((s) => s.me);
  if (!battle?.remote) return deviceId;
  return getParticipant(battle.id)?.participantId ?? '';
}
