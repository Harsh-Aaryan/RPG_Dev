export type * from '../../shared/types';
import type { QuestContent, QuestSource, QuestStatus, VerificationReceipt } from '../../shared/types';

export type Quest = {
  id: string;
  findingId: string;
  battleId: string;
  content: QuestContent;
  source: QuestSource;
  model?: string;
  status: QuestStatus;
  damage: number;
  claimedBy?: string;
  attempts: number;
  issue?: { mock: boolean; number?: number; url?: string; title: string; body: string };
  receipt?: VerificationReceipt;
};

export type Participant = { id: string; nickname: string; xp: number; role: 'host' | 'player' };

export type BattleEventType = 'created' | 'join' | 'claim' | 'issue' | 'attempt' | 'hit' | 'reopen' | 'defeated';

export type BattleEvent = {
  id: string;
  type: BattleEventType;
  text: string;
  actor?: string;
  questId?: string;
  damage?: number;
  createdAt: string;
};
