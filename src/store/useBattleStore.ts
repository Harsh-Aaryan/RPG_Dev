import { create } from "zustand";
import { persist } from "zustand/middleware";
import { buildBattle, nextId } from "../data/demo";
import { bossStats } from "../lib/game-rules";
import type { Battle, FindingsSource, Quest } from "../lib/types";

interface RepoRaidState {
  battles: Record<string, Battle>;
  nickname: string;
  reducedMotion: boolean;
  setNickname: (nickname: string) => void;
  setReducedMotion: (value: boolean) => void;
  createBattle: (host: string, source: FindingsSource) => string;
  joinBattle: (battleId: string, nickname: string) => void;
  closeIssue: (battleId: string, questId: string) => void;
  beginVerify: (battleId: string, questId: string) => boolean;
  completeVerify: (battleId: string, questId: string) => { damage: number; defeated: boolean } | null;
  revealHint: (battleId: string, questId: string) => void;
  markHitPlayed: (battleId: string) => void;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function withQuest(battle: Battle, questId: string, update: (quest: Quest) => Quest): Battle | null {
  const quest = battle.quests.find((item) => item.id === questId);
  if (!quest) return null;
  return {
    ...battle,
    quests: battle.quests.map((item) => (item.id === questId ? update(item) : item)),
  };
}

export function findQuest(battles: Record<string, Battle>, questId: string) {
  for (const battle of Object.values(battles)) {
    const quest = battle.quests.find((item) => item.id === questId);
    if (quest) return { battle, quest };
  }
  return null;
}

const demoBattle = buildBattle({ id: "demo", host: "Host", source: "cached-fixture" });

export const useBattleStore = create<RepoRaidState>()(
  persist(
    (set) => ({
      battles: { demo: demoBattle },
      nickname: "",
      reducedMotion: prefersReducedMotion(),
      setNickname: (nickname) => set({ nickname }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
      createBattle: (host, source) => {
        const id = `raid-${Math.random().toString(36).slice(2, 6)}`;
        const battle = buildBattle({ id, host, source });
        set((state) => ({
          nickname: host,
          battles: { ...state.battles, [id]: battle },
        }));
        return id;
      },
      joinBattle: (battleId, nickname) => {
        const clean = nickname.trim();
        if (!clean) return;
        set((state) => {
          const battle = state.battles[battleId];
          if (!battle) return { nickname: clean };
          if (battle.participants.some((player) => player.nickname.toLowerCase() === clean.toLowerCase())) {
            return { nickname: clean };
          }
          const hasHost = battle.participants.some((player) => player.role === "host");
          return {
            nickname: clean,
            battles: {
              ...state.battles,
              [battleId]: {
                ...battle,
                participants: [
                  ...battle.participants,
                  {
                    id: nextId("player"),
                    nickname: clean,
                    role: hasHost ? "player" : "host",
                    xp: 0,
                  },
                ],
              },
            },
          };
        });
      },
      closeIssue: (battleId, questId) => {
        set((state) => {
          const battle = state.battles[battleId];
          if (!battle) return state;
          const current = battle.quests.find((quest) => quest.id === questId);
          if (!current || current.issueClosed || current.status === "verified") return state;
          const next = withQuest(battle, questId, (quest) => ({ ...quest, issueClosed: true }));
          if (!next) return state;
          return {
            battles: {
              ...state.battles,
              [battleId]: {
                ...next,
                events: [
                  {
                    id: nextId("event"),
                    at: Date.now(),
                    message: `Issue #${current.githubIssueNumber} marked closed. Boss HP unchanged — only a verified test deals damage.`,
                  },
                  ...battle.events,
                ].slice(0, 16),
              },
            },
          };
        });
      },
      beginVerify: (battleId, questId) => {
        let started = false;
        set((state) => {
          const battle = state.battles[battleId];
          if (!battle) return state;
          const current = battle.quests.find((quest) => quest.id === questId);
          if (!current || (current.status !== "open" && current.status !== "claimed")) return state;
          const next = withQuest(battle, questId, (quest) => ({ ...quest, status: "verifying" }));
          if (!next) return state;
          started = true;
          return {
            battles: {
              ...state.battles,
              [battleId]: {
                ...next,
                events: [
                  {
                    id: nextId("event"),
                    at: Date.now(),
                    message: `Regression test started for “${current.questTitle}”.`,
                  },
                  ...battle.events,
                ].slice(0, 16),
              },
            },
          };
        });
        return started;
      },
      completeVerify: (battleId, questId) => {
        let result: { damage: number; defeated: boolean } | null = null;
        set((state) => {
          const battle = state.battles[battleId];
          if (!battle) return state;
          const current = battle.quests.find((quest) => quest.id === questId);
          if (!current || current.status !== "verifying") return state;
          const quests = battle.quests.map((quest) =>
            quest.id === questId ? { ...quest, status: "verified" as const } : quest,
          );
          const stats = bossStats(quests);
          const defeated = stats.currentHP <= 0;
          const who = state.nickname || "Guest";
          const xpGain = Math.round(current.damage / 5);
          const participants = battle.participants.some((player) => player.nickname === who)
            ? battle.participants.map((player) =>
                player.nickname === who ? { ...player, xp: player.xp + xpGain } : player,
              )
            : battle.participants;
          result = { damage: current.damage, defeated };
          return {
            battles: {
              ...state.battles,
              [battleId]: {
                ...battle,
                quests,
                participants,
                status: defeated ? "defeated" : "active",
                lastHit: { amount: current.damage, at: Date.now(), played: false },
                events: [
                  {
                    id: nextId("event"),
                    at: Date.now(),
                    damage: current.damage,
                    message: `${who} verified “${current.questTitle}”. −${current.damage} HP`,
                  },
                  ...battle.events,
                ].slice(0, 16),
              },
            },
          };
        });
        return result;
      },
      revealHint: (battleId, questId) => {
        set((state) => {
          const battle = state.battles[battleId];
          if (!battle) return state;
          const next = withQuest(battle, questId, (quest) => ({
            ...quest,
            hintsRevealed: Math.min(3, quest.hintsRevealed + 1),
          }));
          if (!next) return state;
          return { battles: { ...state.battles, [battleId]: next } };
        });
      },
      markHitPlayed: (battleId) => {
        set((state) => {
          const battle = state.battles[battleId];
          if (!battle?.lastHit || battle.lastHit.played) return state;
          return {
            battles: {
              ...state.battles,
              [battleId]: { ...battle, lastHit: { ...battle.lastHit, played: true } },
            },
          };
        });
      },
    }),
    {
      name: "reporaid.frontend.v1",
      partialize: (state) => ({
        battles: state.battles,
        nickname: state.nickname,
        reducedMotion: state.reducedMotion,
      }),
    },
  ),
);
