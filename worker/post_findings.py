#!/usr/bin/env python3
"""Publish sanitized findings from a Strix run.

Always writes fixtures/demo-findings.json (the judge-safe fallback the app
ships with). If REPORAID_IMPORT_URL is set, also POSTs the same payload to
the `import-fixture` Netlify Function, authenticated with
SCAN_WORKER_SHARED_SECRET.

Usage:
    python3 worker/post_findings.py strix_runs/<run>
"""
from __future__ import annotations

import json
import os
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from parse_strix import parse  # noqa: E402

FIXTURE = Path(__file__).resolve().parent.parent / "fixtures" / "demo-findings.json"


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__, file=sys.stderr)
        return 1
    payload = parse(Path(sys.argv[1]), "demo-vulnerable-repo")
    FIXTURE.write_text(json.dumps(payload, indent=2) + "\n")
    print(f"wrote {len(payload['findings'])} sanitized finding(s) -> {FIXTURE.relative_to(Path.cwd())}"
          f" [{payload['label']}]")

    url = os.environ.get("REPORAID_IMPORT_URL")
    if url:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode(),
            headers={
                "content-type": "application/json",
                "x-worker-secret": os.environ.get("SCAN_WORKER_SHARED_SECRET", ""),
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=15) as res:
            print(f"posted to {url}: HTTP {res.status}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
