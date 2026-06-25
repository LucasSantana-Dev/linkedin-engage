# ADR-0006: Jobs Sprint 3 feature priority — fill quality before query quality

- **Status:** Accepted
- **Date:** 2026-06-25
- **Deciders:** Lucas Santana
- **Tags:** jobs, roadmap, planning, fill-quality, query-quality

## Context

After Sprint 1–2 (search query fixes, career intel UX, session dedup), three
Sprint 3 candidates were identified:

- **J1** — `fillKnownFields`: handle `years-of-experience` select dropdowns
  (aria-label pattern `years.*experience|experiencia.*anos`), populated from
  inferred seniority (senior→5+, mid→3–5, junior→0–2).
- **J2** — `fillKnownFields`: handle first/last-name split fields (current
  code only matches combined `full name` labels).
- **J4** — `buildJobsCareerSearchPlan`: reweight top-2 tech-stack keyword
  terms from `should` to `must` in `compileBooleanQuery`, producing tighter
  AND queries when career intel is active.
- **J7** — Options/dashboard: render `jobsAssistHistory` as a sortable table
  with a "Clear history" button.

The question was: which to build first, and what to defer?

Code inspection clarified the primary bottleneck: `countRequiredMissingFields`
(jobs-assist.js:475) works correctly (uses HTML5 validity API + aria-required).
The root cause of `needs-manual-input` is not detection but **filling** — the
form fields the extension cannot fill are the ones that block `ready-manual-review`.

## Decision

**Sprint 3 scope: J1 + J2 + J4 (if time allows). Defer J7.**

Order: J1 → J2 → J4. Rationale:

1. **J1+J2 attack the primary bottleneck.** `fillKnownFields` handles 7
   patterns; `years-of-experience` select and first/last-name split are the
   next two highest-frequency patterns in LinkedIn Easy Apply forms. Fixing
   them directly reduces the `needs-manual-input` rate.
2. **J4 is parallel-safe.** It lives entirely in `lib/jobs-career-intelligence.js`
   (testable in Node, no DOM), is independent of J1+J2, and can be done in the
   same sprint if time allows or deferred to Sprint 4 without blocking J1+J2.
3. **J7 is premature.** History is now persisted (Sprint 3-A), but there is
   not yet enough accumulated data to make a dashboard useful. Deferred until
   `jobsAssistHistory` shows meaningful data in practice.

## Alternatives considered

| Option | Verdict | Why |
|---|---|---|
| A — Fill quality first (J1+J2) | **Accepted** | Directly reduces needs-manual-input rate; isolated to `fillKnownFields`; testable in jsdom; highest user-visible impact |
| B — Query quality first (J4) | Accepted as follow-on (Sprint 3 or 4) | Independent, low-risk; but only affects ~20% of flows (career-intel + keyword-active); doesn't help flows blocked by unfilled fields |
| C — Observability first (J7) | Deferred | Zero impact on fill or query rates; useful only after fill-rate data exists to analyze |

## Consequences

**Positive**
- J1+J2 extend `fillKnownFields` using the same pattern established in the
  existing code — no architectural change required.
- J1 and J2 are independently testable in jsdom (pattern-B, per ADR-0004).
- J4 improves career-intel query precision at zero risk (pure lib logic,
  covered by existing `jobs-career-intelligence.test.js`).

**Negative / risk**
- `years-of-experience` field frequency in LinkedIn Easy Apply is assumed
  (not instrumented). If it appears in <30% of real forms, J1 impact is
  lower than expected.
- First/last-name split logic must handle edge cases: single-word names,
  hyphenated surnames, names with particles (de, van, da). A naïve `.split(' ')[0]`
  will be wrong for a subset of users.

## Revisit when

1. If instrumentation shows `years-of-experience` appears in <30% of
   encountered Easy Apply forms — reprioritize J4 to lead Sprint 3 instead.
2. If J4 proves implementable in <2 hours — do J1+J2+J4 together in Sprint 3
   rather than sequentially.
3. J7 becomes Sprint 4 scope when `jobsAssistHistory` accumulates ≥100 entries
   from real runs (user has meaningful history to display).
