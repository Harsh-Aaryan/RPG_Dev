# RepoRaid

**Defeat vulnerabilities. Level up security.**

RepoRaid is a low-poly multiplayer boss fight in which verified security fixes damage the boss. Strix finds weaknesses in a repository, Gemma 4 turns them into educational quests, GitHub records the work, and only fixes that pass a regression test deal damage.

Built for the *Best Use of Gemma 4* and *Best Open-Source AI Project* tracks.

> **Honesty labels.** In this build **Strix is mocked** (`worker/mock_strix.py`), and every finding it produces is shown as **Simulated Strix scan**. Gemma 4 and GitHub are real integrations that switch on when their keys are set. Until then the UI shows **Template** and **simulated issue** badges.

## Demo loop

```
Select demo repo → Import (simulated) Strix findings → Generate Gemma quests → 3D boss
→ Create safe GitHub issue → Run regression test on a proposed fix → Verified hit → Boss loses HP → Victory
```

1. **Start Battle** → *Replay simulated scan* → approve findings → *generate quests* → *Start battle*.
2. Open a quest. Ask the mentor for a hint, create the safe issue, and edit the vulnerable function in the **Patch forge**.
3. **Run regression test**. A failing fix does nothing. A passing fix returns a signed receipt, and the boss takes exactly that quest's damage, once.
4. Clear all four quests (800 HP) to reach the victory screen.

As host you can use *Load reference patch (host demo)* to keep a live demo short.

## Architecture

```
Browser (React + R3F) ──/api/*──▶ Netlify Functions ──▶ Gemini API (Gemma 4), GitHub API
        │                                   ▲
   localStorage (MVP)                       │ sanitized fixture
                                            │
                    Scanner worker (local, not Netlify): mock_strix.py | strix → parse_strix.py
                                            │
                                demo-vulnerable-repo/ (authorized target)
```

| Path | What it is |
|---|---|
| `src/` | Vite + React + TypeScript app: Tailwind v4, React Three Fiber, Motion, Zustand, React Router |
| `src/components/arena/` | Procedural low-poly boss, floating island, hit and shatter effects, 2D fallback when WebGL is missing |
| `shared/` | Code shared by the client and functions: game rules, quest schema (Zod), prompts, regression verifier |
| `netlify/functions/` | `generate-quest`, `mentor`, `verify-fix`, `create-github-issue`, `github-webhook`, `import-fixture`, `create-battle` |
| `worker/` | Mock Strix CLI, Strix → SafeFinding adapter, scan script, runtime fix verifier ([details](worker/README.md)) |
| `demo-vulnerable-repo/` | The only allowlisted target: 4 intentional bugs, each with a security test that fails until fixed |
| `fixtures/demo-findings.json` | Sanitized output of the last scan, committed so the demo never depends on a live scan |
| `supabase/migrations/` | Schema with RLS and derived HP, for the realtime multiplayer step |

### Game rules

| Severity | Damage | Boss cue |
|---|---:|---|
| Critical | 400 | Crimson aura, 9 spikes (Rootkit Wyrm) |
| High | 250 | Amber aura, 7 spikes (Cipher Golem) |
| Medium | 100 | Violet aura (Null Wisp) |
| Low | 50 | Cyan aura (Null Wisp) |

`maxHP = Σ damage`, `level = ceil(maxHP / 250)`, `size = min(1.75, 1 + 0.07·findings)`. HP is **derived** from verified quests and never decremented by events, so duplicate verifications can't double-count. When the host reopens a quest because its fix was invalidated, the HP comes back.

### Trust model

- `verify-fix` accepts **code, never a `verified` flag**. It runs deterministic regression checks and signs an HMAC receipt only when all of them pass. The client applies damage only with a receipt that matches the battle, quest and finding.
- Player code is **not executed** in Netlify Functions. The function uses static checks that mirror `demo-vulnerable-repo/test/security.test.js`. `shared/verifier.test.ts` proves that the static checks and the real `node --test` suite agree on both the vulnerable code and the reference fixes. `worker/verify_fix.py` runs the real tests (plus an optional re-scan) outside Netlify.
- `github-webhook` checks the HMAC signature and **never** awards damage. Closing an issue alone does nothing.
- Gemma gets only sanitized fields, wrapped as untrusted content. Its JSON output is validated with Zod and retried once, and the template is the fallback. Gemma teaches but never decides whether a fix counts.
- Issues contain no exploit material and are deduplicated by finding fingerprint.

### MVP limitations

- Battle state lives in `localStorage`. Tabs on the same device stay in sync; another device that joins by QR gets its own copy of the demo battle. Shared realtime HP needs Supabase (schema provided, client not wired).
- If `/api` is unreachable (e.g. `vite preview`), the app falls back to the same checks in the browser and labels receipts `local-offline` / `unsigned`.
- Without `HOST_TOKEN`, host-only functions are open. Set it in any shared deployment.

## Run locally

```bash
npm install
npm run dev            # Vite + Netlify Functions emulation on http://localhost:5173
npm test               # game rules + verifier (cross-checked against the real security tests)
npm run scan:mock      # re-run the simulated Strix scan → fixtures/demo-findings.json
```

Optional `.env` (see `.env.example`): `GEMINI_API_KEY` (Gemma 4 via the Gemini API, model `gemma-4-26b-a4b-it`), `GITHUB_TOKEN` + `GITHUB_REPO` (fine-grained token for the demo repo, issues: write), `HOST_TOKEN`, `VERIFIER_SECRET`, `GITHUB_WEBHOOK_SECRET`. Never prefix secrets with `VITE_`.

## Deploy to Netlify

Import the repo in Netlify. `netlify.toml` already sets build `npm run build`, publish `dist`, functions `netlify/functions`, the `/api/*` rewrite and the SPA fallback. Add the private env vars above, scoped to Functions. The scanner worker is **not** deployed to Netlify.

## Roadmap

Supabase Realtime battles · GitHub App per repository · webhook-driven PR verification in CI · hosted Docker scanner with real Strix · **RepoRaid Bounties** (funded, owner-approved; *coming soon, no payments today*).

## Acknowledgements

[Strix](https://github.com/usestrix/strix) (CLI interface imitated by our mock; not bundled) · [Gemma 4](https://ai.google.dev/gemma) via the Gemini API · [three.js](https://threejs.org) / [React Three Fiber](https://github.com/pmndrs/react-three-fiber) / [drei](https://github.com/pmndrs/drei) · [Motion](https://motion.dev) · [Zustand](https://github.com/pmndrs/zustand) · [lucide](https://lucide.dev) · [qrcode.react](https://github.com/zpao/qrcode.react) · [Zod](https://zod.dev) · [Octokit](https://github.com/octokit/rest.js) · [Tailwind CSS](https://tailwindcss.com).

## License

MIT. See [LICENSE](LICENSE).
