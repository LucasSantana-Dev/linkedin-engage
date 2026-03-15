---
name: verify
description: Run linkedin-engage quality gates — lint, typecheck, test with coverage — and report results. Use before committing, pushing, or opening a PR.
metadata:
  owner: linkedin-engage
  tier: project
---

# Verify

Run the repo's quality gates and report pass/fail.

## When to use

- Before committing changes
- Before pushing to remote
- Before opening or merging a PR
- When asked to "verify", "check", or "run the gates"

## Steps

1. Run `npm run lint` — ESLint must pass clean (zero warnings, zero errors).
2. Run `npm run typecheck` — TypeScript must emit no errors.
3. Run `npm test -- --coverage --coverageReporters=text-summary` — all tests must pass and coverage thresholds must be met.

### Coverage thresholds (jest.config.cjs)

| Metric | Threshold |
|---|---|
| Statements | 84% |
| Branches | 70% |
| Functions | 90% |
| Lines | 88% |

## Commands

```bash
npm run lint
npm run typecheck
npm test -- --coverage --coverageReporters=text-summary
```

## Cross-platform note

Run on Node 18, 20, or 22. CI tests all three. If a test passes locally on Node 22 but fails on 18, the issue is usually:
- `crypto.subtle` not globally available (needs `require('crypto').webcrypto` fallback)
- jsdom cross-realm `ArrayBuffer` (wrap in `Uint8Array` before passing to SubtleCrypto)
- `btoa`/`atob` not available (use `Buffer.from` fallback)

## Failure handling

If lint fails: fix the lint errors before proceeding.
If typecheck fails: fix the type errors before proceeding.
If tests fail: read the failure output, fix the code or tests, and re-run.
If coverage fails: add tests for uncovered lines until thresholds are met.
