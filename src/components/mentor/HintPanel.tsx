import { BookOpen, FlaskConical, Lightbulb, Send } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { askMentor, type MentorReply } from '../../lib/api-client';
import type { MentorMode, QuestContent, SafeFinding } from '../../lib/types';
import { SourceBadge } from '../ui/Badges';
import { Spinner } from '../ui/Spinner';

type Entry = MentorReply & { id: number; label: string };

export function HintPanel({ finding, quest }: { finding: SafeFinding; quest: QuestContent }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [hintLevel, setHintLevel] = useState(0);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState<MentorMode | null>(null);
  const [error, setError] = useState('');

  async function ask(mode: MentorMode, label: string, extra: { hintLevel?: number; question?: string } = {}) {
    setBusy(mode);
    setError('');
    try {
      const reply = await askMentor({ mode, finding, quest, ...extra });
      setEntries((e) => [...e, { ...reply, id: Date.now(), label }]);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mentor unavailable');
      return false;
    } finally {
      setBusy(null);
    }
  }

  const nextHint = hintLevel + 1;

  return (
    <section className="frame p-5" aria-labelledby="mentor-title">
      <h2 id="mentor-title" className="rule-heading">
        Mentor
      </h2>
      <p className="mt-1 text-xs text-ink-3">Gemma 4 answers when it's configured. Otherwise you get the hand-written guide.</p>

      <div className="mt-4 grid gap-2">
        <button className="btn-secondary justify-start" disabled={!!busy} onClick={() => ask('explain', 'Explain it')}>
          {busy === 'explain' ? <Spinner /> : <BookOpen size={14} aria-hidden />}
          Explain it
        </button>
        <button
          className="btn-secondary justify-start"
          disabled={!!busy || nextHint > 3}
          onClick={async () => {
            if (await ask('hint', `Hint ${nextHint} of 3`, { hintLevel: nextHint })) setHintLevel(nextHint);
          }}
        >
          {busy === 'hint' ? <Spinner /> : <Lightbulb size={14} aria-hidden />}
          <span className="flex-1 text-left">{nextHint > 3 ? 'All hints used' : 'Give me a hint'}</span>
          <span className="sr-only">({hintLevel} of 3 used)</span>
          <span className="flex gap-1" aria-hidden>
            {[1, 2, 3].map((n) => (
              <span key={n} className={`h-1.5 w-1.5 rotate-45 ${n <= hintLevel ? 'bg-copper' : 'border border-line'}`} />
            ))}
          </span>
        </button>
        <button className="btn-secondary justify-start" disabled={!!busy} onClick={() => ask('test', 'What does the test check?')}>
          {busy === 'test' ? <Spinner /> : <FlaskConical size={14} aria-hidden />}
          What does the test check?
        </button>
      </div>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!question.trim()) return;
          void ask('explain', `“${question.trim()}”`, { question: question.trim() }).then((ok) => ok && setQuestion(''));
        }}
      >
        <label className="sr-only" htmlFor="mentor-q">
          Ask the mentor a question
        </label>
        <input
          id="mentor-q"
          className="field text-sm"
          placeholder="Ask about this weakness…"
          maxLength={300}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button className="btn-secondary shrink-0 px-3" disabled={!!busy || !question.trim()} aria-label="Ask the mentor">
          <Send size={14} aria-hidden />
        </button>
      </form>

      {error && (
        <p className="mt-3 text-sm text-ember" role="alert">
          {error}
        </p>
      )}

      <div className="mt-4 space-y-3" aria-live="polite">
        <AnimatePresence initial={false}>
          {entries.map((e) => (
            <motion.div key={e.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="border-l-2 border-copper/50 bg-abyss/70 py-3 pl-3.5 pr-3">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-copper-hi">{e.label}</span>
                <SourceBadge source={e.source} model={e.model} />
              </div>
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink">{e.text}</p>
            </motion.div>
          ))}
        </AnimatePresence>
        {entries.length === 0 && (
          <p className="text-sm text-ink-3">
            Hints are progressive: the first only points where to look. The mentor teaches, but it never decides whether a fix counts.
          </p>
        )}
      </div>
    </section>
  );
}
