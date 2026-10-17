#!/usr/bin/env bash
# Scan the authorized demo repo and refresh fixtures/demo-findings.json.
#   STRIX_MOCK=1 (default) -> worker/mock_strix.py (SIMULATED, no Docker)
#   STRIX_MOCK=0           -> real `strix` CLI (needs Docker + STRIX_LLM/LLM_API_KEY)
set -uo pipefail
cd "$(dirname "$0")/.."

TARGET="${1:-./demo-vulnerable-repo}"
RUN_NAME="reporaid_$(date +%Y%m%d-%H%M%S)"

# Only the team-controlled demo repo is allowlisted.
case "$(basename "$TARGET")" in
  demo-vulnerable-repo) ;;
  *) echo "refusing to scan non-allowlisted target: $TARGET" >&2; exit 1 ;;
esac

if [[ "${STRIX_MOCK:-1}" == "1" ]]; then
  python3 worker/mock_strix.py -n --target "$TARGET" --scan-mode quick --max-budget 5 \
    --run-name "$RUN_NAME" ${FAST:+--fast}
else
  strix -n --target "$TARGET" --scan-mode quick --max-budget 5
  RUN_NAME="$(ls -t strix_runs | head -1)"
fi
code=$?
# Strix exits nonzero when vulnerabilities are found; only >2 means the scan itself failed.
if (( code > 2 )); then echo "scan failed (exit $code)" >&2; exit "$code"; fi

python3 worker/post_findings.py "strix_runs/$RUN_NAME"
