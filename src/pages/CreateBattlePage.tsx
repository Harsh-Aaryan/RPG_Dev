import { Check, CircleAlert, Database, KeyRound, Lock, PlayCircle, Radio, Server, Smartphone, TerminalSquare } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SeveritySigil, SwordGlyph } from '../components/art/Sigils';
import { ScanTerminal } from '../components/battle/ScanTerminal';
import { ScanLabel, SeverityBadge, SourceBadge } from '../components/ui/Badges';
import { Shell } from '../components/ui/Shell';
import { Spinner } from '../components/ui/Spinner';
import { generateQuest, type GeneratedQuest } from '../lib/api-client';
import { demoFixture } from '../lib/fixture';
import { createSharedBattle, getServerConfig } from '../lib/remote';
import { bossLevel, bossMaxHP, bossVariant, highestSeverity, SEVERITY_STYLE } from '../lib/game-rules';
import { useBattleStore } from '../store/useBattleStore';

type Step = 'setup' | 'scan' | 'review' | 'generate';
type Source = 'fixture' | 'replay';

const REPOS = [
  { id: 'demo-vulnerable-repo', label: 'reporaid/demo-vulnerable-repo', note: 'Team-controlled and intentionally vulnerable', allowed: true },
  { id: 'other', label: 'Any other repository', note: 'Needs owner authorization (not in this MVP)', allowed: false },
];

export function CreateBattlePage() {
  const navigate = useNavigate();
  const store = useBattleStore();
  const reducedMotion = store.reducedMotion;
  const [step, setStep] = useState<Step>('setup');
  const [name, setName] = useState('Friday Night Raid');
  const [nickname, setNickname] = useState(store.nickname || '');
  const [hostToken, setHostToken] = useState(store.hostToken);
  const [source, setSource] = useState<Source>('replay');
  const [approved, setApproved] = useState<Set<string>>(new Set(demoFixture.findings.map((f) => f.id)));
  const [quests, setQuests] = useState<Record<string, GeneratedQuest | 'loading' | { error: string }>>({});

  const [shared, setShared] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState('');
  useEffect(() => {
    void getServerConfig().then((c) => setShared(Boolean(c?.shared)));
  }, []);

  const findings = demoFixture.findings.filter((f) => approved.has(f.id));
  const finishScan = useCallback(() => setStep('review'), []);

  async function generateAll() {
    setStep('generate');
    setQuests(Object.fromEntries(findings.map((f) => [f.id, 'loading' as const])));
    await Promise.all(
      findings.map(async (f) => {
        try {
          const q = await generateQuest(f);
          setQuests((s) => ({ ...s, [f.id]: q }));
        } catch (err) {
          setQuests((s) => ({ ...s, [f.id]: { error: err instanceof Error ? err.message : 'failed' } }));
        }
      }),
    );
  }

  const ready = findings.length > 0 && findings.every((f) => {
    const q = quests[f.id];
    return q && q !== 'loading' && 'quest' in q;
  });
  const forging = step === 'generate' && !ready;

  async function start() {
    if (shared) {
      setStarting(true);
      setStartError('');
      try {
        const id = await createSharedBattle({
          name: name.trim() || 'Demo Raid',
          hostNickname: store.nickname || 'Host',
          findingIds: findings.map((f) => f.id),
          quests: quests as Record<string, GeneratedQuest>,
        });
        navigate(`/battle/${id}`);
      } catch (err) {
        setStartError(err instanceof Error ? err.message : 'Could not create the shared battle');
      } finally {
        setStarting(false);
      }
      return;
    }
    const id = store.createBattle({
      name: name.trim() || 'Demo Raid',
      fixture: { ...demoFixture, findings },
      quests: quests as Record<string, GeneratedQuest>,
      asHost: true,
    });
    navigate(`/battle/${id}`);
  }

  return (
    <Shell>
      <div className="mx-auto max-w-3xl pt-10">
        <h1 className="font-display text-5xl font-bold leading-none text-ink">Summon a boss</h1>
        <p className="mt-3 max-w-xl text-ink-2">
          Pick the target, load its sanitized findings, approve what becomes a quest, and let Gemma 4 write the briefings.
        </p>
        <Stepper step={step} />

        {step === 'setup' && (
          <form
            className="frame mt-8 space-y-7 p-6"
            onSubmit={(e) => {
              e.preventDefault();
              store.setNickname(nickname.trim() || 'Host');
              store.setHostToken(hostToken.trim());
              setStep(source === 'replay' ? 'scan' : 'review');
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Battle name" id="bname">
                <input id="bname" className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
              </Field>
              <Field label="Your nickname" id="nick">
                <input id="nick" className="field" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Host" maxLength={24} />
              </Field>
            </div>

            <fieldset>
              <legend className="rule-heading mb-3 w-full">Target repository</legend>
              <div className="space-y-2">
                {REPOS.map((r) => (
                  <label
                    key={r.id}
                    className={`flex items-center gap-3 border p-3.5 transition-colors ${
                      r.allowed ? 'cursor-pointer border-copper/50 bg-copper/[0.06]' : 'cursor-not-allowed border-line-soft opacity-55'
                    }`}
                  >
                    <input type="radio" name="repo" defaultChecked={r.allowed} disabled={!r.allowed} className="accent-copper" />
                    {r.allowed ? <Database size={16} className="text-copper" aria-hidden /> : <Lock size={16} className="text-ink-3" aria-hidden />}
                    <span className="flex-1">
                      <span className="block font-mono text-sm text-ink">{r.label}</span>
                      <span className="text-xs text-ink-3">{r.note}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="rule-heading mb-3 w-full">Findings source</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                <SourceOption
                  checked={source === 'replay'}
                  onChange={() => setSource('replay')}
                  icon={TerminalSquare}
                  title="Replay simulated scan"
                  text="Watch the mock Strix worker's run, then load its findings."
                />
                <SourceOption
                  checked={source === 'fixture'}
                  onChange={() => setSource('fixture')}
                  icon={Database}
                  title="Cached scan"
                  text="Load the last approved, sanitized fixture instantly."
                />
                <SourceOption
                  disabled
                  checked={false}
                  onChange={() => {}}
                  icon={Server}
                  title="Live Strix scan"
                  text="Runs on a Docker worker, not Netlify. Use worker/run_scan.sh."
                />
              </div>
            </fieldset>

            <details className="group border-t border-line-soft pt-5 text-sm">
              <summary className="inline-flex cursor-pointer items-center gap-2 text-ink-2 hover:text-ink">
                <KeyRound size={14} aria-hidden /> Host token (optional)
              </summary>
              <p className="mt-2 text-xs text-ink-3">Needed only if the deployment sets HOST_TOKEN. It's sent to host-only functions.</p>
              <input
                className="field mt-2 font-mono"
                type="password"
                value={hostToken}
                onChange={(e) => setHostToken(e.target.value)}
                aria-label="Host token"
                autoComplete="off"
              />
            </details>

            <button className="btn-primary min-h-11 w-full px-5 sm:w-auto">
              <PlayCircle size={18} aria-hidden /> {source === 'replay' ? 'Run simulated scan' : 'Load findings'}
            </button>
          </form>
        )}

        {step === 'scan' && (
          <div className="frame mt-8 p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-2xl font-semibold text-ink">
                Scanning <span className="font-mono text-lg">{demoFixture.scan.repositoryId}</span>
              </h2>
              <ScanLabel label={demoFixture.label} />
            </div>
            <ScanTerminal fixture={demoFixture} onDone={finishScan} fast={reducedMotion} />
          </div>
        )}

        {(step === 'review' || step === 'generate') && (
          <div className="mt-8 space-y-5">
            <div className="frame flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3.5 text-sm">
              <ScanLabel label={demoFixture.label} />
              <span className="text-ink-3">
                Commit <span className="font-mono text-ink-2">{demoFixture.scan.commitSha.slice(0, 10)}</span>
              </span>
              <span className="text-ink-3">
                Run <span className="font-mono text-ink-2">{demoFixture.scan.runName}</span>
              </span>
              <span className="text-ink-3">{demoFixture.scan.complete ? 'Scan completed' : 'Scan incomplete'}</span>
            </div>

            <div className="frame p-6">
              <h2 className="font-display text-2xl font-semibold text-ink">{step === 'review' ? 'Owner review' : 'Gemma 4 quest forge'}</h2>
              <p className="mb-4 mt-1 text-sm text-ink-2">
                {step === 'review'
                  ? 'Approve which sanitized findings become quests. Proofs of concept and secrets were stripped by the adapter.'
                  : 'Each sanitized finding goes to Gemma 4, and its JSON reply is validated with Zod before it becomes a quest.'}
              </p>
              <ul className="space-y-2">
                {demoFixture.findings.map((f) => {
                  const q = quests[f.id];
                  const on = approved.has(f.id);
                  if (step === 'generate' && !on) return null;
                  return (
                    <li key={f.id} className={`relative border bg-abyss/60 py-3.5 pl-5 pr-4 ${on ? 'border-line' : 'border-line-soft opacity-60'}`}>
                      <span className={`absolute inset-y-2 left-0 w-[3px] ${SEVERITY_STYLE[f.severity].bar}`} aria-hidden />
                      <div className="flex items-start gap-3">
                        {step === 'review' ? (
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 accent-copper"
                            checked={on}
                            aria-label={`Approve ${f.title}`}
                            onChange={() =>
                              setApproved((s) => {
                                const n = new Set(s);
                                if (n.has(f.id)) n.delete(f.id);
                                else n.add(f.id);
                                return n;
                              })
                            }
                          />
                        ) : q === 'loading' ? (
                          <span className="mt-0.5 text-copper">
                            <Spinner size={16} label="Generating" />
                          </span>
                        ) : q && 'quest' in q ? (
                          <Check size={16} className="mt-0.5 text-sage" aria-label="Generated" />
                        ) : (
                          <CircleAlert size={16} className="mt-0.5 text-ember" aria-label="Failed" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <SeverityBadge severity={f.severity} />
                            <span className="font-medium text-ink">{f.title}</span>
                            <span className="font-mono text-xs text-ink-3">{f.cwe}</span>
                          </div>
                          {q && q !== 'loading' && 'quest' in q ? (
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                              <span className="font-display text-lg font-semibold text-copper-hi">{q.quest.questTitle}</span>
                              <SourceBadge source={q.source} model={q.model} />
                              {q.reason && <span className="text-xs text-ink-3">({q.reason})</span>}
                            </div>
                          ) : q && q !== 'loading' && 'error' in q ? (
                            <p className="mt-1 text-sm text-ember">{q.error}</p>
                          ) : (
                            <p className="mt-1.5 text-sm text-ink-2">{f.safeSummary}</p>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <BossPreview findings={findings} />

            <p className="flex items-start gap-2 text-sm text-ink-2">
              {shared ? (
                <>
                  <Radio size={15} className="mt-0.5 shrink-0 text-sage" aria-hidden />
                  Shared battle: everyone who opens the invite fights the same boss, and HP is kept on the server.
                </>
              ) : (
                <>
                  <Smartphone size={15} className="mt-0.5 shrink-0 text-ink-3" aria-hidden />
                  This battle will live on this device. Other devices that scan the invite get their own copy until shared battles are
                  configured.
                </>
              )}
            </p>
            {startError && (
              <p className="text-sm text-ember" role="alert">
                {startError}
              </p>
            )}

            {step === 'review' ? (
              <button className="btn-primary min-h-11 px-5" disabled={!findings.length} onClick={generateAll}>
                <Check size={18} aria-hidden /> Approve {findings.length} and forge quests
              </button>
            ) : (
              <button className="btn-primary min-h-11 px-5" disabled={!ready || starting} onClick={() => void start()}>
                {forging || starting ? <Spinner size={16} /> : <SwordGlyph size={18} />}{' '}
                {forging ? 'Forging quests…' : starting ? 'Summoning…' : 'Start the battle'}
              </button>
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}

function BossPreview({ findings }: { findings: typeof demoFixture.findings }) {
  const max = bossMaxHP(findings);
  const sev = highestSeverity(findings);
  const v = bossVariant(sev);
  return (
    <div className="flex items-center gap-4 border-y border-line-soft py-4">
      <span className={`grid h-11 w-11 shrink-0 place-items-center border border-line bg-abyss ${sev ? SEVERITY_STYLE[sev].text : 'text-ink-3'}`}>
        {sev ? <SeveritySigil severity={sev} size={22} /> : null}
      </span>
      <div className="min-w-0">
        <p className="font-display text-xl font-bold uppercase tracking-[0.05em] text-ink">{v.name}</p>
        <p className="text-sm text-ink-2">
          Level {String(bossLevel(max)).padStart(2, '0')}, <span className="font-mono">{max}</span> HP, born from {findings.length} finding
          {findings.length === 1 ? '' : 's'}
        </p>
      </div>
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const steps: [Step, string][] = [
    ['setup', 'Setup'],
    ['scan', 'Scan'],
    ['review', 'Review'],
    ['generate', 'Quests'],
  ];
  const idx = steps.findIndex(([s]) => s === step);
  return (
    <ol className="mt-8 flex items-center" aria-label="Progress">
      {steps.map(([s, label], i) => {
        const done = i < idx;
        const current = i === idx;
        return (
          <li key={s} aria-current={current ? 'step' : undefined} className="flex flex-1 items-center gap-2 last:flex-none">
            <span className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden className="shrink-0">
                <path
                  d="M9 1 17 9 9 17 1 9Z"
                  fill={done ? '#82a58a' : current ? '#c99460' : '#181f1b'}
                  stroke={done ? '#82a58a' : current ? '#dda875' : '#415044'}
                  strokeWidth="1.2"
                />
              </svg>
              <span className={`text-sm font-medium ${current ? 'text-ink' : done ? 'text-sage' : 'text-ink-3'}`}>
                {label}
                {done && <span className="sr-only"> (done)</span>}
              </span>
            </span>
            {i < steps.length - 1 && <span className={`mx-2 h-px flex-1 ${done ? 'bg-sage/60' : 'bg-line'}`} aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {children}
    </div>
  );
}

function SourceOption(props: {
  checked: boolean;
  onChange: () => void;
  icon: typeof Database;
  title: string;
  text: string;
  disabled?: boolean;
}) {
  const Icon = props.icon;
  return (
    <label
      className={`relative flex flex-col gap-1.5 border p-3.5 text-sm transition-colors ${
        props.disabled
          ? 'cursor-not-allowed border-line-soft opacity-50'
          : props.checked
            ? 'cursor-pointer border-copper bg-copper/[0.07]'
            : 'cursor-pointer border-line-soft hover:border-line'
      }`}
    >
      <span className="flex items-center gap-2 font-semibold text-ink">
        <input type="radio" name="source" className="accent-copper" checked={props.checked} onChange={props.onChange} disabled={props.disabled} />
        <Icon size={15} className={props.checked ? 'text-copper' : 'text-ink-3'} aria-hidden /> {props.title}
      </span>
      <span className="text-xs text-ink-3">{props.text}</span>
    </label>
  );
}
