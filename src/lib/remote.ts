import { ApiError, ApiUnavailable, request, type GeneratedQuest } from './api-client';
import { participantHeaders, setParticipant, type ParticipantCreds } from './identity';
import type { BattleView, ServerConfig } from './types';

/** Shared battles: thin wrappers over the battle functions. */

let config: Promise<ServerConfig | null> | null = null;

/** What this deployment supports. Null when there is no API (e.g. `vite preview`). */
export function getServerConfig(): Promise<ServerConfig | null> {
  config ??= request<ServerConfig>('config', { method: 'GET' }).catch(() => null);
  return config;
}

/** Null when the battle doesn't exist on the server. */
export async function fetchBattle(battleId: string): Promise<BattleView | null> {
  try {
    return await request<BattleView>(`battle?id=${encodeURIComponent(battleId)}`, { method: 'GET' });
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) return null;
    throw err;
  }
}

export async function createSharedBattle(input: {
  name: string;
  hostNickname: string;
  findingIds: string[];
  quests: Record<string, GeneratedQuest>;
}): Promise<string> {
  const res = await request<{ battleId: string; host: ParticipantCreds }>('create-battle', { body: input });
  setParticipant(res.battleId, res.host);
  return res.battleId;
}

export async function joinSharedBattle(battleId: string, nickname: string): Promise<void> {
  const creds = await request<ParticipantCreds>('join-battle', { body: { battleId, nickname } });
  setParticipant(battleId, creds);
}

export async function claimSharedQuest(battleId: string, questId: string): Promise<void> {
  await request('claim-quest', { body: { battleId, questId }, headers: participantHeaders(battleId) });
}

export async function reopenSharedQuest(battleId: string, questId: string, reason = ''): Promise<void> {
  await request('reopen-quest', { body: { battleId, questId, reason }, headers: participantHeaders(battleId) });
}

export { ApiUnavailable };
