import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BossScene } from "../components/arena/BossScene";
import { btnGhost, btnPrimary, Shell } from "../components/layout/Shell";
import { bossTypeFor } from "../lib/game-rules";
import type { Severity } from "../lib/types";
import { useBattleStore } from "../store/useBattleStore";

const PREVIEWS: Array<{ severity: Severity; label: string }> = [
  { severity: "critical", label: "Rootkit Wyrm" },
  { severity: "high", label: "Cipher Golem" },
  { severity: "medium", label: "Null Wisp" },
];

const STEPS = [
  ["01", "Import", "Cached fixture or a fast-forwarded scan."],
  ["02", "Forge", "Quests from sanitized findings."],
  ["03", "Verify", "A test, not a closed issue."],
  ["04", "Strike", "Damage lands once, by severity."],
];

export function LandingPage() {
  const reducedMotion = useBattleStore((state) => state.reducedMotion);
  const nickname = useBattleStore((state) => state.nickname);
  const setNickname = useBattleStore((state) => state.setNickname);
  const joinBattle = useBattleStore((state) => state.joinBattle);
  const battles = useBattleStore((state) => state.battles);
  const navigate = useNavigate();
  const [severity, setSeverity] = useState<Severity>("critical");
  const [battleId, setBattleId] = useState("demo");
  const [name, setName] = useState(nickname || "");
  const [error, setError] = useState("");
  const [bountiesOpen, setBountiesOpen] = useState(false);

  function onJoin(event: FormEvent) {
    event.preventDefault();
    const id = battleId.trim() || "demo";
    const clean = name.trim();
    if (clean.length < 2) {
      setError("Enter a nickname of at least 2 characters.");
      return;
    }
    if (!battles[id]) {
      setError("No battle with that id is stored on this device.");
      return;
    }
    setError("");
    setNickname(clean);
    joinBattle(id, clean);
    navigate(`/battle/${id}`);
  }

  return (
    <Shell wide>
      <div className="grid items-stretch gap-6 lg:grid-cols-12">
        <div className="flex flex-col justify-center lg:col-span-5">
          <p className="kicker">Frontend demo · scans mocked</p>
          <h1 className="mt-3 max-w-xl font-display text-4xl font-semibold leading-[1.05] sm:text-6xl">
            Defeat vulnerabilities. Level up security.
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-sand/75">
            Strix finds weaknesses. Gemma turns them into quests. Verified fixes damage a shared low-poly boss. The 20-minute scan is a short simulation.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/create" className={btnPrimary}>
              Start battle
            </Link>
            <a href="#join" className={btnGhost}>
              Join battle
            </a>
            <button type="button" className={btnGhost} onClick={() => setBountiesOpen(true)}>
              Bounties
            </button>
          </div>
        </div>
        <div className="frame overflow-hidden lg:col-span-7">
          <div className="h-[460px] sm:h-[560px] lg:h-[640px]">
            <BossScene bossType={bossTypeFor(severity)} severity={severity} sizeScale={1.2} preview reducedMotion={reducedMotion} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-sand/10 px-4 py-3">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Boss preview">
              {PREVIEWS.map((preview) => (
                <button
                  key={preview.severity}
                  type="button"
                  className={`min-h-11 px-3 text-xs tracking-wide ${severity === preview.severity ? "bg-sand text-ink" : "border border-sand/20 text-sand"}`}
                  onClick={() => setSeverity(preview.severity)}
                  aria-pressed={severity === preview.severity}
                >
                  {preview.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-sand/45">Kenney graveyard kit</p>
          </div>
        </div>
      </div>

      <ol className="step-rail mt-6">
        {STEPS.map(([step, title, copy]) => (
          <li key={step}>
            <p className="font-display text-xs text-cyan">{step}</p>
            <p className="mt-1 font-display font-semibold">{title}</p>
            <p className="mt-1 text-sm text-sand/65">{copy}</p>
          </li>
        ))}
      </ol>

      <form id="join" onSubmit={onJoin} className="frame mt-6 grid gap-4 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="text-sm">
          Nickname
          <input value={name} onChange={(event) => setName(event.target.value)} className="field" maxLength={16} required />
        </label>
        <label className="text-sm">
          Battle id
          <input value={battleId} onChange={(event) => setBattleId(event.target.value)} className="field" />
        </label>
        <button type="submit" className={btnPrimary}>
          Enter arena
        </button>
        {error ? <p className="text-sm text-coral sm:col-span-3">{error}</p> : <p className="text-xs text-sand/50 sm:col-span-3">Seeded room id is demo.</p>}
      </form>

      {bountiesOpen ? (
        <div className="fixed inset-0 z-20 grid place-items-center bg-ink/75 px-4" role="dialog" aria-modal="true" aria-labelledby="bounties-title">
          <div className="frame max-w-lg p-6">
            <p className="kicker text-ember">Coming soon</p>
            <h2 id="bounties-title" className="mt-2 font-display text-3xl font-semibold">
              Bounties
            </h2>
            <p className="mt-3 text-sm leading-6 text-sand/80">
              A funded, owner-approved marketplace can come later. This demo does not move money, escrow rewards, or pay contributors. The game is the verified security fix.
            </p>
            <button type="button" className={`${btnPrimary} mt-5`} onClick={() => setBountiesOpen(false)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
      <p className="mt-6 text-[11px] leading-5 text-sand/40">
        Characters, trees, rocks, lanterns, and ruins are Kenney’s Graveyard Kit (CC0). The boss and island are original procedural meshes.
      </p>
    </Shell>
  );
}
