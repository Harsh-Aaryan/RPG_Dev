#!/usr/bin/env python3
"""Normalize Strix artifacts into RepoRaid SafeFinding records.

Reads strix_runs/<run>/vulnerabilities.json (falling back to findings.sarif)
plus run.json, then strips everything players and Gemma must not see:
proofs-of-concept, raw evidence, credentials, internal URLs.

Usage:
    python3 worker/parse_strix.py strix_runs/<run> --repository-id demo-vulnerable-repo
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

SEVERITIES = {"critical", "high", "medium", "low"}
SEVERITY_ALIASES = {"error": "high", "warning": "medium", "note": "low", "info": "low"}

# Fields that may carry exploit material or secrets: never forwarded.
DROPPED_FIELDS = {"poc", "evidence", "request", "response", "payload", "exploit", "steps"}

REDACTIONS = [
    (re.compile(r"(?i)(password|passwd|secret|token|api[_-]?key)\s*[=:]\s*\S+"), r"\1=[REDACTED]"),
    (re.compile(r"\b(ghp|gho|github_pat|sk|AKIA)[A-Za-z0-9_\-]{8,}\b"), "[REDACTED_TOKEN]"),
    (re.compile(r"https?://(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|"
                r"172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?\S*"), "[INTERNAL_URL]"),
    (re.compile(r"<script\b[^>]*>.*?</script>", re.I | re.S), "[PAYLOAD_REMOVED]"),
]

# Repos whose source is public demo material may share code excerpts with players.
PUBLIC_DEMO_REPOS = {"demo-vulnerable-repo"}


def sanitize(text: str | None, limit: int = 400) -> str:
    if not text:
        return ""
    for pattern, repl in REDACTIONS:
        text = pattern.sub(repl, text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[: limit - 1] + "…" if len(text) > limit else text


def normalize_severity(value: str | None) -> str:
    v = (value or "").lower()
    v = SEVERITY_ALIASES.get(v, v)
    return v if v in SEVERITIES else "medium"


def fingerprint(repo: str, commit: str, source_id: str) -> str:
    return "f_" + hashlib.sha256(f"{repo}|{commit}|{source_id}".encode()).hexdigest()[:16]


def load_raw(run_dir: Path) -> list[dict]:
    vj = run_dir / "vulnerabilities.json"
    if vj.exists():
        data = json.loads(vj.read_text())
        return data if isinstance(data, list) else data.get("vulnerabilities", [])
    sarif = run_dir / "findings.sarif"
    if sarif.exists():
        out = []
        for run in json.loads(sarif.read_text()).get("runs", []):
            for r in run.get("results", []):
                loc = (r.get("locations") or [{}])[0].get("physicalLocation", {})
                out.append({
                    "id": r.get("ruleId"),
                    "title": r.get("message", {}).get("text"),
                    "severity": r.get("level"),
                    "location": {"file": loc.get("artifactLocation", {}).get("uri"),
                                 "line": loc.get("region", {}).get("startLine")},
                })
        return out
    raise FileNotFoundError(f"no vulnerabilities.json or findings.sarif in {run_dir}")


def parse(run_dir: Path, repository_id: str) -> dict:
    run_meta = {}
    if (run_dir / "run.json").exists():
        run_meta = json.loads((run_dir / "run.json").read_text())
    commit = run_meta.get("commit_sha", "unknown")
    scan_id = "scan_" + hashlib.sha256(run_dir.name.encode()).hexdigest()[:10]
    include_code = repository_id in PUBLIC_DEMO_REPOS

    findings = []
    for raw in load_raw(run_dir):
        loc = raw.get("location") or {}
        f = {
            "id": fingerprint(repository_id, commit, str(raw.get("id"))),
            "sourceId": raw.get("id"),
            "ruleId": raw.get("rule_hint") or raw.get("id"),
            "repositoryId": repository_id,
            "scanId": scan_id,
            "title": sanitize(raw.get("title"), 120),
            "severity": normalize_severity(raw.get("severity")),
            "cwe": raw.get("cwe"),
            "safeSummary": sanitize(raw.get("description")),
            "remediationSummary": sanitize(raw.get("remediation")),
            "affectedPath": loc.get("file"),
            "affectedFunction": loc.get("function"),
            "line": loc.get("line"),
            "status": "approved",
        }
        if include_code and raw.get("code_snippet"):
            f["codeExcerpt"] = raw["code_snippet"]
        assert not DROPPED_FIELDS & f.keys()
        findings.append({k: v for k, v in f.items() if v is not None})

    order = ["critical", "high", "medium", "low"]
    findings.sort(key=lambda f: order.index(f["severity"]))
    complete = run_meta.get("status") == "completed" and run_meta.get("stop_reason") != "budget"
    return {
        "label": "simulated" if run_meta.get("simulated") else "live",
        "scan": {
            "id": scan_id,
            "repositoryId": repository_id,
            "runName": run_dir.name,
            "commitSha": commit,
            "source": run_meta.get("tool", "strix"),
            "scanMode": run_meta.get("scan_mode"),
            "complete": complete,
            "finishedAt": run_meta.get("finished_at"),
        },
        "findings": findings,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("run_dir")
    ap.add_argument("--repository-id", default="demo-vulnerable-repo")
    ap.add_argument("-o", "--output", help="write JSON here instead of stdout")
    args = ap.parse_args()
    result = parse(Path(args.run_dir), args.repository_id)
    text = json.dumps(result, indent=2) + "\n"
    if args.output:
        Path(args.output).write_text(text)
        print(f"wrote {len(result['findings'])} sanitized finding(s) to {args.output}", file=sys.stderr)
    else:
        sys.stdout.write(text)
    return 0


if __name__ == "__main__":
    sys.exit(main())
