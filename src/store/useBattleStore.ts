import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { bossCurrentHP, bossMaxHP, damageWeight, XP_PER_DAMAGE } from '../lib/game-rules';
import { clientId, shortId } from '../lib/id';
import type { GeneratedQuest, IssueResult } from '../lib/api-client';
import type { BattleEvent, BattleEventType, BattleView, FindingsFixture, Participant, VerificationReceipt } from '../lib/types';

export type Battle = BattleView;

type State = {
  me: string;
  nickname: string;
  hostToken: string;
  reducedMotion: boolean;
  battles: Record<string, Battle>;

  setNickname: (n: string) => void;
  setHostToken: (t: string) => void;
  setReducedMotion: (v: boolean) => void;

  createBattle: (args: {
    id?: string;
    name: string;
    fixture: FindingsFixture;
    quests: Record<string, GeneratedQuest>;
    asHost: boolean;
  }) => string;
  join: (battleId: string, nickname: string) => void;
  claimQuest: (battleId: string, questId: string) => void;
  attachIssue: (battleId: string, questId: string, issue: IssueResult) => void;
  recordAttempt: (battleId: string, questId: string, passed: boolean) => void;
  applyVerifiedHit: (battleId: string, questId: string, receipt: VerificationReceipt) => BattleEvent | null;
  reopenQuest: (battleId: string, questId: string) => void;
  deleteBattle: (battleId: string) => void;
};

function event(type: BattleEventType, text: string, extra: Partial<BattleEvent> = {}): BattleEvent {
  return { id: shortId(10), type, text, createdAt: new Date().toISOString(), ...extra };
}

function nameOf(b: Battle, id: string): string {
  return b.participants.find((p) => p.id === id)?.nickname ?? 'Someone';
}

export const useBattleStore = create<State>()(
  persist(
    (set, get) => {
      const update = (battleId: string, fn: (b: Battle) => Battle | void) =>
        set((s) => {
          const b = s.battles[battleId];
          if (!b) return s;
          const draft: Battle = structuredClone(b);
          const next = fn(draft) ?? draft;
          return { battles: { ...s.battles, [battleId]: next } };
        });

      return {
        me: clientId(),
        nickname: '',
        hostToken: '',
        reducedMotion:
          typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
        battles: {},

        setNickname: (nickname) => set({ nickname }),
        setHostToken: (hostToken) => set({ hostToken }),
        setReducedMotion: (reducedMotion) => set({ reducedMotion }),

        createBattle: ({ id, name, fixture, quests, asHost }) => {
          const battleId = id ?? shortId(6);
          const { me, nickname } = get();
          const findings = fixture.findings.filter((f) => f.status !== 'needs_review');
          const battle: Battle = {
            id: battleId,
            name,
            repositoryId: fixture.scan.repositoryId,
            label: fixture.label,
            scan: fixture.scan,
            status: 'active',
            createdAt: new Date().toISOString(),
            findings,
            quests: findings.map((f) => {
              const g = quests[f.id];
              return {
                id: `q_${f.id.slice(2, 10)}`,
                findingId: f.id,
                battleId,
                content: g.quest,
                source: g.source,
                model: g.model,
                status: 'open',
                damage: damageWeight(f.severity),
                attempts: 0,
              };
            }),
            // Guests get no participant row yet, so the arena prompts them for a nickname.
            participants: asHost ? [{ id: me, nickname: nickname || 'Host', xp: 0, role: 'host' }] : [],
            events: [],
          };
          battle.events.push(
            asHost
              ? event('created', `${battle.participants[0].nickname} opened the raid on ${battle.repositoryId}`, { actor: me })
              : event('created', `Demo raid on ${battle.repositoryId} loaded on this device`),
          );
          set((s) => ({ battles: { ...s.battles, [battleId]: battle } }));
          return battleId;
        },

        join: (battleId, nickname) => {
          const { me } = get();
          set({ nickname });
          update(battleId, (b) => {
            const existing = b.participants.find((p) => p.id === me);
            if (existing) {
              existing.nickname = nickname;
              return;
            }
            b.participants.push({ id: me, nickname, xp: 0, role: 'player' });
            b.events.push(event('join', `${nickname} joined the party`, { actor: me }));
          });
        },

        claimQuest: (battleId, questId) => {
          const { me } = get();
          update(battleId, (b) => {
            const q = b.quests.find((x) => x.id === questId);
            if (!q || q.status === 'verified') return;
            q.claimedBy = me;
            if (q.status === 'open' || q.status === 'rejected') q.status = 'claimed';
            b.events.push(event('claim', `${nameOf(b, me)} accepted “${q.content.questTitle}”`, { actor: me, questId }));
          });
        },

        attachIssue: (battleId, questId, issue) =>
          update(battleId, (b) => {
            const q = b.quests.find((x) => x.id === questId);
            if (!q) return;
            q.issue = { mock: issue.mock, number: issue.number, url: issue.url, title: issue.title, body: issue.body };
            b.events.push(
              event('issue', issue.mock ? `Drafted safe issue for “${q.content.questTitle}” (simulated)` : `Opened GitHub issue #${issue.number}`, {
                questId,
              }),
            );
          }),

        recordAttempt: (battleId, questId, passed) => {
          const { me } = get();
          update(battleId, (b) => {
            const q = b.quests.find((x) => x.id === questId);
            if (!q || q.status === 'verified') return;
            q.attempts += 1;
            q.status = passed ? 'verifying' : 'rejected';
            if (!passed) {
              b.events.push(event('attempt', `${nameOf(b, me)}'s fix for “${q.content.questTitle}” failed the regression test`, { actor: me, questId }));
            }
          });
        },

        /** Idempotent: a quest can only be hit once, and only with a matching receipt. */
        applyVerifiedHit: (battleId, questId, receipt) => {
          const { me } = get();
          let hit: BattleEvent | null = null;
          update(battleId, (b) => {
            const q = b.quests.find((x) => x.id === questId);
            if (!q || q.status === 'verified') return;
            if (receipt.battleId !== battleId || receipt.questId !== questId || receipt.findingId !== q.findingId) return;
            q.status = 'verified';
            q.receipt = receipt;
            const actor = b.participants.find((p) => p.id === me);
            if (actor) actor.xp += Math.round(q.damage * XP_PER_DAMAGE);
            hit = event('hit', `${nameOf(b, me)} landed a verified fix: −${q.damage} HP`, { actor: me, questId, damage: q.damage });
            b.events.push(hit);
            const hp = bossCurrentHP(b.findings, b.quests.filter((x) => x.status === 'verified').map((x) => x.findingId));
            if (hp <= 0 && b.status !== 'defeated') {
              b.status = 'defeated';
              b.defeatedAt = new Date().toISOString();
              b.events.push(event('defeated', 'The boss shatters! Every finding is verified fixed.'));
            }
          });
          return hit;
        },

        reopenQuest: (battleId, questId) =>
          update(battleId, (b) => {
            const q = b.quests.find((x) => x.id === questId);
            if (!q || q.status !== 'verified') return;
            q.status = 'open';
            q.receipt = undefined;
            b.status = 'active';
            b.defeatedAt = undefined;
            b.events.push(event('reopen', `Fix for “${q.content.questTitle}” was invalidated; +${q.damage} HP restored`, { questId }));
          }),

        deleteBattle: (battleId) =>
          set((s) => {
            const { [battleId]: _removed, ...rest } = s.battles;
            void _removed;
            return { battles: rest };
          }),
      };
    },
    {
      name: 'reporaid',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        nickname: s.nickname,
        hostToken: s.hostToken,
        reducedMotion: s.reducedMotion,
        battles: s.battles,
      }),
    },
  ),
);

// Keep tabs on the same device in sync (lightweight stand-in for Supabase Realtime).
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'reporaid') void useBattleStore.persist.rehydrate();
  });
}

export function battleStats(b: Battle) {
  const verified = b.quests.filter((q) => q.status === 'verified').map((q) => q.findingId);
  const maxHP = bossMaxHP(b.findings);
  const hp = bossCurrentHP(b.findings, verified);
  return { maxHP, hp, verifiedCount: verified.length };
}

export function myRole(b: Battle | undefined, me: string): Participant['role'] | null {
  return b?.participants.find((p) => p.id === me)?.role ?? null;
}
