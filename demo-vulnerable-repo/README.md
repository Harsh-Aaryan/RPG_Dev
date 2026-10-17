# RepoRaid demo vulnerable repo

> **Intentionally vulnerable. For local training only. Do not deploy.**

This tiny service is the *only* authorized scan target for the RepoRaid demo.
Each vulnerable function lives in `src/handlers.js` and has a matching
regression test in `test/security.test.js` that **fails until the quest is fixed**.

```bash
node --test test/*.test.js   # 4 failing security tests = 4 unresolved findings
```
