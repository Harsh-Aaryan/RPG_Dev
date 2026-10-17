import { motion } from "motion/react";
import { FormEvent, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScanMock } from "../components/create/ScanMock";
import { btnPrimary, Shell } from "../components/layout/Shell";
import { DEMO_REPOSITORY, FIXTURE_DISCLAIMER, FORGE_MS, questsForBattle } from "../data/demo";
import { SEVERITY_LABEL } from "../lib/game-rules";
import type { FindingsSource } from "../lib/types";
import { useBattleStore } from "../store/useBattleStore";

export function CreateBattlePage() {
  const reducedMotion = useBattleStore((state) => state.reducedMotion);
  const storedName = useBattleStore((state) => state.nickname);
  const createBattle = useBattleStore((state) => state.createBattle);
  const navigate = useNavigate();
  const [nickname, setNickname] = useState(storedName || "");
  const [source, setSource] = useState<FindingsSource>("mocked-scan");
  const [phase, setPhase] = useState<"setup" | "import" | "forge">("setup");
  const [imported, setImported] = useState(false);
  const [error, setError] = useState("");
  const preview = questsForBattle("preview");

  const finishImport = useCallback(() => setImported(true), []);

  function onSetup(event: FormEvent) {
    event.preventDefault();
    if (nickname.trim().length < 2) {
      setError("Enter a nickname of at least 2 characters.");
      return;
    }
    setError("");
    setImported(false);
    setPhase("import");
    if (source === "cached-fixture") {
      window.setTimeout(() => setImported(true), 400);
    }
  }

  function forge() {
    setPhase("forge");
    window.setTimeout(() => {
      const id = createBattle(nickname.trim(), source);
      navigate(`/battle/${id}`);
    }, FORGE_MS);
  }

  return (
    <Shell>
      <motion.div initial={{ opacity: 0, y: reducedMotion ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-3xl">
        <p className="kicker">Host setup</p>
        <h1 className="mt-2 font-display text-4xl font-semibold">Open a raid</h1>
        <p className="mt-2 text-sm leading-6 text-sand/75">
          Only the allowlisted demo repository is selectable. Nothing is cloned, scanned, or sent to an API.
        </p>

        {phase === "setup" ? (
          <form onSubmit={onSetup} className="frame mt-6 space-y-5 p-5">
            <label className="block text-sm">
              Host nickname
              <input value={nickname} onChange={(event) => setNickname(event.target.value)} className="field" maxLength={16} required />
            </label>
            <fieldset>
              <legend className="text-sm">Repository</legend>
              <label className="choice mt-2">
                <input type="radio" name="repo" defaultChecked className="mt-1" />
                <span>
                  <span className="font-semibold">{DEMO_REPOSITORY}</span>
                  <span className="mt-1 block text-sm text-sand/70">Authorized demo target. Findings below are simulated.</span>
                </span>
              </label>
              <label className="choice mt-2">
                <input type="radio" name="repo" disabled className="mt-1" />
                <span>
                  <span className="font-semibold">any other repository</span>
                  <span className="mt-1 block text-sm text-sand/70">Not on the allowlist. Arbitrary scans are out of scope.</span>
                </span>
              </label>
            </fieldset>
            <fieldset>
              <legend className="text-sm">Findings</legend>
              <label className="choice mt-2">
                <input type="radio" name="source" checked={source === "mocked-scan"} onChange={() => setSource("mocked-scan")} className="mt-1" />
                <span>
                  <span className="font-semibold">Run Strix scan</span>
                  <span className="mt-1 block text-sm text-sand/70">About 20 minutes on a real worker. This demo finishes in a few seconds with placeholder findings.</span>
                </span>
              </label>
              <label className="choice mt-2">
                <input type="radio" name="source" checked={source === "cached-fixture"} onChange={() => setSource("cached-fixture")} className="mt-1" />
                <span>
                  <span className="font-semibold">Use cached fixture</span>
                  <span className="mt-1 block text-sm text-sand/70">Skip the timer and load the same simulated set immediately.</span>
                </span>
              </label>
            </fieldset>
            {error ? <p className="text-sm text-coral">{error}</p> : null}
            <button type="submit" className={btnPrimary}>
              Import findings
            </button>
          </form>
        ) : null}

        {phase !== "setup" ? (
          <div className="mt-6 space-y-4">
            {phase === "import" && source === "mocked-scan" && !imported ? <ScanMock onComplete={finishImport} /> : null}
            {phase === "import" && source === "cached-fixture" && !imported ? <p className="text-sm text-cyan">Loading cached fixture…</p> : null}
            {imported && phase !== "forge" ? (
              <section className="space-y-3">
                <p className="border border-ember/40 bg-ember/10 px-3 py-2 text-sm text-sand">{FIXTURE_DISCLAIMER}</p>
                {preview.map((quest) => (
                  <article key={quest.id} className="frame p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-cyan">
                      {SEVERITY_LABEL[quest.severity]} · {quest.cwe} · {quest.damage} HP
                    </p>
                    <h2 className="mt-1 font-display text-lg font-semibold">{quest.title}</h2>
                    <p className="mt-2 text-sm text-sand/75">{quest.safeSummary}</p>
                  </article>
                ))}
                <button type="button" className={btnPrimary} onClick={forge}>
                  Forge Gemma quests
                </button>
              </section>
            ) : null}
            {phase === "forge" ? (
              <div className="frame p-5" role="status">
                <p className="font-display text-lg font-semibold">Forging quests</p>
                <p className="mt-2 text-sm text-sand/75">Turning sanitized findings into learning goals and hints. This text is local demo copy, not a live Gemma 4 call.</p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-ink">
                  <div className="h-full w-2/3 animate-pulse bg-violet" />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </motion.div>
    </Shell>
  );
}
