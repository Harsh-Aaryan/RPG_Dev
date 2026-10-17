# RepoRaid scanner worker

Runs **outside Netlify** (on a laptop for the demo, later a Docker-capable host). It scans the allowlisted demo repo, sanitizes the results, and refreshes `fixtures/demo-findings.json`.

> **Strix is mocked in this build.** `mock_strix.py` imitates the Strix CLI's flags, exit codes and `strix_runs/<run>/` artifact layout, and it detects the four demo bugs with deterministic pattern checks. Everything it produces is labelled `simulated`, both in the fixture and in the UI. To use real Strix, install it and run with `STRIX_MOCK=0`.

| File | Purpose |
|---|---|
| `mock_strix.py` | Simulated Strix CLI. Writes `run.json`, `vulnerabilities.json`, `findings.sarif` and per-finding `.md` files. Exits `2` when it finds issues, like Strix does. |
| `parse_strix.py` | Adapter that turns Strix artifacts into `SafeFinding` records. Drops PoCs and evidence, redacts secrets and internal URLs, and fingerprints each finding. |
| `post_findings.py` | Writes the fixture and, if `REPORAID_IMPORT_URL` is set, POSTs it to `/api/import-fixture` with `SCAN_WORKER_SHARED_SECRET`. |
| `run_scan.sh` | Allowlist check → scan (mock or real) → adapter → fixture. |
| `verify_fix.py` | Runtime verification. Patches a temp copy of the repo, runs the real regression test, and with `--rescan` re-scans. |

```bash
FAST=1 ./worker/run_scan.sh                      # simulated scan → fixtures/demo-findings.json
python3 worker/verify_fix.py rr-sqli patch.js --rescan

# Real Strix (Docker running; review the installer first)
curl -sSL https://strix.ai/install | bash
export STRIX_LLM="<provider/model>" LLM_API_KEY="<scanner key>"
STRIX_MOCK=0 ./worker/run_scan.sh
```

Real Strix output may use different field names from the mock. `parse_strix.py` falls back to `findings.sarif` and maps unknown severities to `medium`. Check its output against a real run before relying on it.
