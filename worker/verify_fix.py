#!/usr/bin/env python3
"""Runtime verification of a proposed fix (the "better path").

Copies the demo repo to a throwaway directory, swaps in the proposed
function, and runs the real regression test for that rule with node --test.
Optionally re-runs the (mock) Strix scan on the patched copy to confirm the
finding is gone. Exit code 0 means verified.

Usage:
    python3 worker/verify_fix.py rr-sqli patch.js [--rescan]
"""
from __future__ import annotations

import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REPO = ROOT / "demo-vulnerable-repo"
FUNCTIONS = {"rr-sqli": "findUser", "rr-path": "downloadFile", "rr-xss": "renderSearch", "rr-errleak": "handleError"}


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) != 2 or args[0] not in FUNCTIONS:
        print(__doc__, file=sys.stderr)
        return 1
    rule, patch = args[0], Path(args[1]).read_text()
    name = FUNCTIONS[rule]
    if not re.search(rf"^function {name}\(", patch, re.M):
        print(f"patch must define function {name}()", file=sys.stderr)
        return 1

    with tempfile.TemporaryDirectory(prefix="reporaid-verify-") as tmp:
        work = Path(tmp) / "repo"
        shutil.copytree(REPO, work)
        handlers = work / "src" / "handlers.js"
        src = handlers.read_text()
        patched, n = re.subn(rf"^function {name}\(.*?^\}}", lambda _: patch.strip(), src, flags=re.S | re.M)
        if n != 1:
            print(f"could not locate {name}() in handlers.js", file=sys.stderr)
            return 1
        handlers.write_text(patched)

        test = subprocess.run(
            ["node", "--test", "--test-name-pattern", rule, "test/security.test.js"],
            cwd=work, capture_output=True, text=True, timeout=60,
        )
        ok = test.returncode == 0
        print(f"regression {rule}: {'PASS' if ok else 'FAIL'}")
        if not ok:
            print(test.stdout[-1500:])

        if ok and "--rescan" in sys.argv:
            scan = subprocess.run(
                [sys.executable, str(ROOT / "worker" / "mock_strix.py"), "-n", "--target", str(work),
                 "--fast", "--out", str(Path(tmp) / "runs")],
                capture_output=True, text=True,
            )
            still = rule in (Path(scan.stdout.strip().splitlines()[-1]) / "vulnerabilities.json").read_text()
            print(f"re-scan (simulated): finding {'STILL PRESENT' if still else 'gone'}")
            ok = not still
    return 0 if ok else 2


if __name__ == "__main__":
    sys.exit(main())
