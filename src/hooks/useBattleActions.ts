import { createGithubIssue, verifyFix, verifyPullRequest } from '../lib/api-client';
import { participantHeaders } from '../lib/identity';
import { claimSharedQuest, joinSharedBattle, reopenSharedQuest } from '../lib/remote';
import type { QuestContent, SafeFinding } from '../lib/types';
import { useBattleStore, type Battle } from '../store/useBattleStore';

/**
 * Battle actions that work the same for both kinds of battle: device-local
 * battles update the local store; shared battles call the server and refetch,
 * so HP is never written by the browser.
 */
export function useBattleActions(battle: Battle | undefined, refresh: () => Promise<void>) {
  const store = useBattleStore.getState();
  const shared = Boolean(battle?.remote);

  return {
    async join(nickname: string) {
      if (!battle) return;
      if (shared) {
        await joinSharedBattle(battle.id, nickname);
        store.setNickname(nickname);
        await refresh();
      } else store.join(battle.id, nickname);
    },

    async claim(questId: string) {
      if (!battle) return;
      if (shared) {
        await claimSharedQuest(battle.id, questId);
        await refresh();
      } else store.claimQuest(battle.id, questId);
    },

    async reopen(questId: string) {
      if (!battle) return;
      if (shared) {
        await reopenSharedQuest(battle.id, questId);
        await refresh();
      } else store.reopenQuest(battle.id, questId);
    },

    async publishIssue(questId: string, finding: SafeFinding, quest: QuestContent) {
      if (!battle) return;
      const issue = await createGithubIssue(finding, quest, shared ? { battleId: battle.id, questId } : undefined);
      if (shared) await refresh();
      else store.attachIssue(battle.id, questId, issue);
    },

    /**
     * Run the regression test. Returns the test results and, when a hit landed,
     * the id of its battle-log event so the arena can play it.
     */
    async verify(questId: string, finding: SafeFinding, code: string) {
      if (!battle) throw new Error('No battle');
      const args = { battleId: battle.id, questId, findingId: finding.id, ruleId: finding.ruleId, code };
      if (shared) {
        const res = await verifyFix(args, participantHeaders(battle.id));
        await refresh();
        return { res, hitEventId: res.hit?.applied ? res.hit.eventId : undefined };
      }
      const res = await verifyFix(args);
      store.recordAttempt(battle.id, questId, res.passed);
      const hit = res.passed && res.receipt ? store.applyVerifiedHit(battle.id, questId, res.receipt) : null;
      return { res, hitEventId: hit?.id };
    },

    /** Host: check a pull request's GitHub Actions quest check. Lands the hit when it passed. */
    async verifyPr(questId: string, finding: SafeFinding, prNumber: number) {
      if (!battle) throw new Error('No battle');
      const args = { battleId: battle.id, questId, findingId: finding.id, prNumber };
      if (shared) {
        const res = await verifyPullRequest(args, participantHeaders(battle.id));
        await refresh();
        return { res, hitEventId: res.hit?.applied ? res.hit.eventId : undefined };
      }
      const res = await verifyPullRequest(args);
      const hit = res.receipt ? store.applyVerifiedHit(battle.id, questId, res.receipt) : null;
      return { res, hitEventId: hit?.id };
    },
  };
}
