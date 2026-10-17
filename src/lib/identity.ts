/** Per-battle participant credentials for shared battles. Stored only on this device. */
export type ParticipantCreds = { participantId: string; key: string; nickname: string };

const keyFor = (battleId: string) => `reporaid.participant.${battleId}`;

export function getParticipant(battleId: string): ParticipantCreds | null {
  try {
    const raw = localStorage.getItem(keyFor(battleId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ParticipantCreds;
    return parsed?.participantId && parsed.key ? parsed : null;
  } catch {
    return null;
  }
}

export function setParticipant(battleId: string, creds: ParticipantCreds | null) {
  try {
    if (creds) localStorage.setItem(keyFor(battleId), JSON.stringify(creds));
    else localStorage.removeItem(keyFor(battleId));
  } catch {
    // Private mode or blocked storage: the player can still watch, just not act.
  }
}

export function participantHeaders(battleId: string): Record<string, string> {
  const c = getParticipant(battleId);
  return c ? { 'x-participant-id': c.participantId, 'x-participant-key': c.key } : {};
}
