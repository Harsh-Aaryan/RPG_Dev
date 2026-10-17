import { describe, expect, it, vi } from 'vitest';
import fixture from '../../fixtures/demo-findings.json';
import { extractJson } from '../quest';
import type { SafeFinding } from '../types';
import type { Ask } from './gemma';
import { resolveQuestContent } from './quest-service';

const finding = fixture.findings[0] as SafeFinding;
const quest = {
  questTitle: 'Seal the Unsafe Query',
  plainEnglishExplanation: 'The lookup glues user input into SQL, so input can change the query.',
  learningGoal: 'Use bound parameters.',
  hint1: 'Look at findUser in src/handlers.js.',
  hint2: 'The name is concatenated into the SQL string.',
  hint3: 'Use a placeholder and pass the value separately.',
  fixAcceptanceCriteria: ['No concatenated SQL', 'Regression test passes'],
};
const asJson = JSON.stringify(quest);

describe('extractJson', () => {
  it('reads fenced and prose-wrapped JSON', () => {
    expect(extractJson('```json\n' + asJson + '\n```')).toEqual(quest);
    expect(extractJson(`Sure! Here is your quest:\n${asJson}\nGood luck.`)).toEqual(quest);
  });
  it('throws when there is no object', () => {
    expect(() => extractJson('no json here')).toThrow();
  });
});

describe('resolveQuestContent', () => {
  it('labels live Gemma output', async () => {
    const ask: Ask = vi.fn(async () => '```json\n' + asJson + '\n```');
    const r = await resolveQuestContent(finding, ask, 'gemma-test');
    expect(r.source).toBe('gemma');
    expect(r.model).toBe('gemma-test');
    expect(r.quest).toEqual(quest);
    expect(ask).toHaveBeenCalledTimes(1);
  });

  it('repairs once with the validator error, then succeeds', async () => {
    const ask = vi.fn<Ask>().mockResolvedValueOnce('{"questTitle": "x"}').mockResolvedValueOnce(asJson);
    const r = await resolveQuestContent(finding, ask, 'gemma-test');
    expect(r.source).toBe('gemma');
    expect(ask).toHaveBeenCalledTimes(2);
    expect(ask.mock.calls[1][0]).toMatch(/could not be used because/);
  });

  it('falls back to the labelled template after a second bad reply', async () => {
    const ask = vi.fn<Ask>().mockResolvedValue('I cannot help with that.');
    const r = await resolveQuestContent(finding, ask, 'gemma-test');
    expect(r.source).toBe('template');
    expect(r.reason).toMatch(/failed validation twice|repair/);
    expect(ask).toHaveBeenCalledTimes(2);
  });

  it('falls back on timeouts and never throws', async () => {
    const ask = vi.fn<Ask>().mockRejectedValue(new Error('Gemma request timed out'));
    const r = await resolveQuestContent(finding, ask, 'gemma-test');
    expect(r.source).toBe('template');
    expect(r.reason).toMatch(/timed out/);
  });

  it('uses the template when no key is configured', async () => {
    const r = await resolveQuestContent(finding, null, 'gemma-test');
    expect(r.source).toBe('template');
    expect(r.quest.questTitle).toBeTruthy();
  });
});
