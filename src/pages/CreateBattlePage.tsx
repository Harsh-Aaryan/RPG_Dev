import { Check, CheckCircle2, Database, Loader2, Lock, PlayCircle, Server, Swords, TerminalSquare } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanTerminal } from '../components/battle/ScanTerminal';
import { ScanLabel, SeverityBadge, SourceBadge } from '../components/ui/Badges';
import { Shell } from '../components/ui/Shell';
import { generateQuest, type GeneratedQuest } from '../lib/api-client';
import { demoFixture } from '../lib/fixture';
import { bossLevel, bossMaxHP, bossVariant, highestSeverity } from '../lib/game-rules';
import { useBattleStore } from '../store/useBattleStore';

type Step = 'setup' | 'scan' | 'review' | 'generate';
type Source = 'fixture' | 'replay';

const REPOS = [
  { id: 'demo-vulnerable-repo', label: 'reporaid/demo-vulnerable-repo', note: 'Team-controlled, intentionally vulnerable', allowed: true },
  { id: 'other', label: 'Any other repository', note: 'Requires owner authorization (not in MVP)', allowed: false },
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

  function start() {
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
      <div className="mx-auto max-w-3xl pt-8">
        <p className="label text-cyan">Host setup</p>
        <h1 className="mt-1 font-display text-3xl font-bold">Summon a boss</h1>
        <Stepper step={step} />

        {step === 'setup' && (
          <form
            className="panel mt-6 space-y-6 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              store.setNickname(nickname.trim() || 'Host');
              store.setHostToken(hostToken.trim());
              setStep(source === 'replay' ? 'scan' : 'review');
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Battle name" id="bname">
                <input id="bname" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
              </Field>
              <Field label="Your nickname" id="nick">
                <input id="nick" className="input" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Host" maxLength={24} />
              </Field>
            </div>

            <fieldset>
              <legend className="label mb-2">Target repository</legend>
              <div className="space-y-2">
                {REPOS.map((r) => (
                  <label
                    key={r.id}
                    className={`flex items-center gap-3 rounded-xl border p-3 ${
                      r.allowed ? 'border-violet/50 bg-violet/10' : 'cursor-not-allowed border-white/8 opacity-50'
                    }`}
                  >
                    <input type="radio" name="repo" defaultChecked={r.allowed} disabled={!r.allowed} className="accent-violet" />
                    {r.allowed ? <Database size={16} aria-hidden /> : <Lock size={16} aria-hidden />}
                    <span className="flex-1">
                      <span className="block font-mono text-sm">{r.label}</span>
                      <span className="text-xs text-mist">{r.note}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="label mb-2">Findings source</legend>
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

            <details className="text-sm">
              <summary className="cursor-pointer text-mist">Host token (optional)</summary>
              <p className="mt-2 text-xs text-mist">Required only if the deployment sets HOST_TOKEN. Sent to host-only functions.</p>
              <input
                className="input mt-2"
                type="password"
                value={hostToken}
                onChange={(e) => setHostToken(e.target.value)}
                aria-label="Host token"
                autoComplete="off"
              />
            </details>

            <button className="btn-primary w-full sm:w-auto">
              <PlayCircle size={18} aria-hidden /> {source === 'replay' ? 'Run simulated scan' : 'Load findings'}
            </button>
          </form>
        )}

        {step === 'scan' && (
          <div className="panel mt-6 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display font-semibold">Scanning {demoFixture.scan.repositoryId}</h2>
              <ScanLabel label={demoFixture.label} />
            </div>
            <ScanTerminal fixture={demoFixture} onDone={finishScan} fast={reducedMotion} />
          </div>
        )}

        {(step === 'review' || step === 'generate') && (
          <div className="mt-6 space-y-4">
            <div className="panel flex flex-wrap items-center gap-x-6 gap-y-2 p-4 text-sm">
              <ScanLabel label={demoFixture.label} />
              <span className="text-mist">
                commit <span className="font-mono text-sand">{demoFixture.scan.commitSha.slice(0, 10)}</span>
              </span>
              <span className="text-mist">
                run <span className="font-mono text-sand">{demoFixture.scan.runName}</span>
              </span>
              <span className="text-mist">{demoFixture.scan.complete ? 'scan completed' : 'scan incomplete'}</span>
            </div>

            <div className="panel p-4">
              <h2 className="font-display font-semibold">{step === 'review' ? 'Owner review' : 'Gemma 4 quest forge'}</h2>
              <p className="mb-3 text-sm text-mist">
                {step === 'review'
                  ? 'Approve which sanitized findings become quests. Proofs-of-concept and secrets were stripped by the adapter.'
                  : 'Each sanitized finding is sent to Gemma 4 and the JSON reply is validated with Zod.'}
              </p>
              <ul className="space-y-2">
                {demoFixture.findings.map((f) => {
                  const q = quests[f.id];
                  const on = approved.has(f.id);
                  if (step === 'generate' && !on) return null;
                  return (
                    <li key={f.id} className="rounded-xl border border-white/8 bg-obsidian/50 p-3">
                      <div className="flex items-start gap-3">
                        {step === 'review' ? (
                          <input
                            type="checkbox"
                            className="mt-1 accent-violet"
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
                          <Loader2 size={16} className="mt-0.5 animate-spin text-violet" aria-label="Generating" />
                        ) : q && 'quest' in q ? (
                          <CheckCircle2 size={16} className="mt-0.5 text-emerald" aria-label="Generated" />
                        ) : (
                          <span className="mt-0.5 text-coral">!</span>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <SeverityBadge severity={f.severity} />
                            <span className="font-medium">{f.title}</span>
                            <span className="text-xs text-mist">{f.cwe}</span>
                          </div>
                          {q && q !== 'loading' && 'quest' in q ? (
                            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
                              <span className="font-display font-semibold text-violet">{q.quest.questTitle}</span>
                              <SourceBadge source={q.source} model={q.model} />
                              {q.reason && <span className="text-xs text-mist">({q.reason})</span>}
                            </div>
                          ) : q && q !== 'loading' && 'error' in q ? (
                            <p className="mt-1 text-sm text-coral">{q.error}</p>
                          ) : (
                            <p className="mt-1 text-sm text-sand/75">{f.safeSummary}</p>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <BossPreview findings={findings} />

            {step === 'review' ? (
              <button className="btn-primary" disabled={!findings.length} onClick={generateAll}>
                <Check size={18} aria-hidden /> Approve {findings.length} & generate quests
              </button>
            ) : (
              <button className="btn-primary" disabled={!ready} onClick={start}>
                <Swords size={18} aria-hidden /> Start battle
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
  const v = bossVariant(highestSeverity(findings));
  return (
    <p className="text-sm text-mist">
      Boss: <span className="font-display font-semibold text-sand">{v.name}</span> · Lv {bossLevel(max)} · {max} HP from{' '}
      {findings.length} finding{findings.length === 1 ? '' : 's'}
    </p>
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
    <ol className="mt-4 flex gap-2 text-xs" aria-label="Progress">
      {steps.map(([s, label], i) => (
        <li
          key={s}
          aria-current={s === step ? 'step' : undefined}
          className={`flex-1 rounded-full border px-2 py-1 text-center ${
            i < idx ? 'border-emerald/40 text-emerald' : i === idx ? 'border-violet bg-violet/15 text-sand' : 'border-white/10 text-mist'
          }`}
        >
          {i < idx ? '✓ ' : ''}
          {label}
        </li>
      ))}
    </ol>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="label mb-1.5 block">
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
      className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-3 text-sm transition ${
        props.disabled
          ? 'cursor-not-allowed border-white/8 opacity-50'
          : props.checked
            ? 'border-violet bg-violet/10'
            : 'border-white/10 hover:border-white/25'
      }`}
    >
      <span className="flex items-center gap-2 font-medium">
        <input type="radio" name="source" className="accent-violet" checked={props.checked} onChange={props.onChange} disabled={props.disabled} />
        <Icon size={15} aria-hidden /> {props.title}
      </span>
      <span className="text-xs text-mist">{props.text}</span>
    </label>
  );
}
