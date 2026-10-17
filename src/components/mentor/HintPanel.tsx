import { BookOpen, FlaskConical, Lightbulb, Loader2, Send, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { askMentor, type MentorReply } from '../../lib/api-client';
import type { MentorMode, QuestContent, SafeFinding } from '../../lib/types';
import { SourceBadge } from '../ui/Badges';

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
    <section className="panel p-4" aria-labelledby="mentor-title">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles size={16} className="text-emerald" aria-hidden />
        <h2 id="mentor-title" className="font-display font-semibold">
          Mentor
        </h2>
        <span className="text-xs text-mist">· powered by Gemma 4 when configured</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost px-3 py-2 text-sm" disabled={!!busy} onClick={() => ask('explain', 'Explain it')}>
          {busy === 'explain' ? <Loader2 size={14} className="animate-spin" /> : <BookOpen size={14} aria-hidden />}
          Explain it
        </button>
        <button
          className="btn-ghost px-3 py-2 text-sm"
          disabled={!!busy || nextHint > 3}
          onClick={async () => {
            if (await ask('hint', `Hint ${nextHint} of 3`, { hintLevel: nextHint })) setHintLevel(nextHint);
          }}
        >
          {busy === 'hint' ? <Loader2 size={14} className="animate-spin" /> : <Lightbulb size={14} aria-hidden />}
          {nextHint > 3 ? 'All hints used' : `Give me a hint (${nextHint}/3)`}
        </button>
        <button className="btn-ghost px-3 py-2 text-sm" disabled={!!busy} onClick={() => ask('test', 'What does the test check?')}>
          {busy === 'test' ? <Loader2 size={14} className="animate-spin" /> : <FlaskConical size={14} aria-hidden />}
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
          className="input py-2 text-sm"
          placeholder="Ask a question about this weakness…"
          maxLength={300}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button className="btn-ghost px-3" disabled={!!busy || !question.trim()} aria-label="Ask">
          <Send size={14} aria-hidden />
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-coral">{error}</p>}

      <div className="mt-4 space-y-3" aria-live="polite">
        <AnimatePresence initial={false}>
          {entries.map((e) => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-white/8 bg-obsidian/60 p-3"
            >
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="label">{e.label}</span>
                <SourceBadge source={e.source} model={e.model} />
              </div>
              <p className="whitespace-pre-line text-sm leading-relaxed text-sand/90">{e.text}</p>
            </motion.div>
          ))}
        </AnimatePresence>
        {entries.length === 0 && (
          <p className="text-sm text-mist">
            Hints are progressive: the first only points where to look. The mentor teaches. It never decides whether a fix counts.
          </p>
        )}
      </div>
    </section>
  );
}
