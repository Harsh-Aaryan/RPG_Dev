# RepoRaid demo vulnerable repo

> **Intentionally vulnerable. For authorized RepoRaid demos and local training only. Do not deploy.**

This tiny service is the *only* authorized scan target for the RepoRaid demo.
Each vulnerable function lives in `src/handlers.js` and has a matching
regression test in `test/security.test.js` that **fails until the quest is fixed**.

```bash
node --test test/*.test.js                                   # 4 failing security tests = 4 unresolved findings
node --test --test-name-pattern "^rr-sqli:" test/security.test.js   # one quest's test
```

## Verifying fixes from pull requests

To verify real pull requests, publish this folder as its own GitHub repository
(the workflows only run from a repository root) and point RepoRaid's
`GITHUB_REPO` at it.

- `.github/workflows/quests.yml` runs one check per quest, named
  `quest-rr-sqli`, `quest-rr-path`, `quest-rr-xss` and `quest-rr-errleak`.
  It always runs the **base branch's** tests against the PR, so a PR cannot
  weaken its own test.
- `.github/workflows/guard.yml` fails any PR that changes `test/` or `.github/`.

RepoRaid's `verify-pr` function awards damage only when the matching
`quest-<rule>` check, created by GitHub Actions, passed on the PR's head commit
and the PR leaves `test/` and `.github/` alone. Closing an issue never counts.
