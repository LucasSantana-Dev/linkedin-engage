# ADR-0004: Testing strategy for MAIN-world automation logic

- **Status:** Accepted
- **Date:** 2026-06-18
- **Deciders:** Lucas Santana
- **Tags:** testing, architecture, jobs, connect, content-scripts

## Context

The extension splits into two testability tiers:

- **`extension/lib/**.js`** — pure UMD modules, Node-testable, and the **only** files
  in Jest coverage scope (`collectCoverageFrom: ['extension/lib/**/*.js']`; thresholds
  stmt 96 / branch 85.7 / func 99 / lines 97.5).
- **`extension/*.js`** entry scripts (`content.js`, `jobs-assist.js`, `company-follow.js`)
  — run in the page **MAIN world** (live DOM + LinkedIn globals), are **not** in coverage,
  but **can** be loaded in jsdom.

Three test patterns already coexist:
- **(A) Pure-lib extraction** — pull logic into `lib/`, unit-test it. The bulk of the
  ~1540 tests. This session extracted `detectNoSearchResults`, `findMatchingOptionValue`,
  `resolveJobsLocale`, `jobsNotificationText`, `tallyResumeParse`.
- **(B) jsdom IIFE tests** — `tests/jobs-assist.test.js`, `tests/company-follow-runtime.test.js`
  `require()` the entry script in jsdom, build synthetic DOM, and drive the IIFE.
- **(C) Hand-authored HTML fixtures** — `tests/fixtures/linkedin-cards/*.html` (5 files)
  consumed by `tests/linkedin-dom-fixtures.test.js`. Most realistic; stale-prone (issue #134).

The forcing question came from issue #146 (Jobs Easy-Apply modal can abort as
"needs-manual-input"), and the recurring session pattern of MAIN-world logic being
untested. A `decision-critic` review (NEEDS_REVISION) flipped the #146 mapping — see Decision.

## Decision

A **layered** default for testing MAIN-world automation logic:

1. **PRIMARY — extract decision-shaped logic to a pure `lib/` function** and TDD it
   (counts toward coverage). Use when the logic is "given this data, what's the answer":
   classification, matching, scoring, locale, text. This is the session's proven pattern.
2. **FIRST-CLASS (not optional) — jsdom IIFE tests (pattern B) for observation, timing,
   and wiring logic** that a pure function cannot model: DOM-change detection, poll/retry
   timing, event sequencing, and that the entry script wires the pure logic to the real DOM.
3. **FIXTURES (pattern C)** for selector-level realism on a small curated set.
4. **REJECT** Playwright end-to-end vs. live LinkedIn as a CI gate (auth, ToS, flakiness,
   non-deterministic).
5. **REJECT** adding entry scripts to coverage scope (forces measuring thin glue;
   low value). Accepted consequence: see the coverage blind-spot below.

**#146 reclassified (critic correction).** Verified root cause: the abort is
`reason: "modal-step-timeout"` — `waitForModalStepChange` returns `!changed` because
`getModalSignature` can yield identical signatures for genuinely different steps
(same enabled-button text + required-count + 120-char headline). The button-priority
*decision* (submit > review > next) is already correct and re-checked each loop iteration.
So **#146 is an observation/timing bug, not a decision-logic bug** — a pure
`pickModalStepAction(state)` would NOT catch it. **#146's test vehicle is pattern B**
(a jsdom test that mutates a modal in a way the current signature misses, asserting
change-detection fires), plus likely a more discriminating `getModalSignature`.

## Alternatives considered

| Option | Verdict | Why |
|---|---|---|
| Pure-lib extraction as the *sole* mechanism | Rejected | Misses observation/timing bugs (exactly #146); creates false confidence |
| jsdom IIFE (B) as PRIMARY | Rejected as primary | Verbose, couples glue+logic, not coverage-counted — but promoted to first-class for observe/timing |
| Captured-fixture-driven as primary | Rejected | Stale-prone (#134); overkill for pure logic |
| Live Playwright e2e CI gate | Rejected | Auth/ToS/flakiness/non-deterministic |
| Add entry scripts to coverage | Rejected | Forces testing thin glue; low value |
| Status quo (manual) | Rejected | #146-class bugs slip; no regression net |

## Consequences

**Positive** — decision logic is unit-tested + coverage-counted; observe/timing logic has
a real (if uncounted) regression net; clear rule for *which* pattern fits a given bug.

**Negative / risk**
- **Coverage blind-spot (accepted):** an extracted pure fn can show 100% while the glue
  that calls it is unmeasured. Mitigated by pattern-B jsdom tests on the wiring, but those
  don't count toward the threshold — green coverage ≠ wired-correctly. Reviewers must not
  over-trust the number.
- **Three patterns to maintain.** Mitigated by the explicit "which pattern when" rule
  below; revisit if they diverge.
- **Fixture staleness (#134) is real and only partly mitigated.** A documented manual
  capture keeps the 5 curated fixtures fresh only if someone actually re-captures; an
  "optional" Playwright script that never runs = drift. Honest stance: low churn on these
  5 fixtures makes manual refresh acceptable *for now*; if selector breakage becomes the
  dominant failure mode, fund the automation (see revisit).

**Not measured (deferred):** the critic asked for a LOC/author-time comparison of pattern A
vs B, an entry-script glue-vs-logic LOC audit, and a 6-month test-regression root-cause
tally. Not done — the decision is actionable without them (the deciding fact, #146's root
cause, was verified). These would refine, not reverse, the strategy.

## Governance (to add to `.claude/standards/testing.md`)

- New **decision-shaped** logic in an entry script → extract to `lib/` and TDD before landing.
- New **observation/timing/wiring** logic → add at least one **pattern-B jsdom test**.
- Don't grow fixtures (C) without updating `fixtures/README.md` (#134).

## Revisit when

- A pure-extraction needs a >2-shim "DOM-state struct" that just re-models the DOM →
  that case belongs in pattern B, not A.
- LinkedIn DOM churn makes selector breakage (not logic) the dominant failure mode →
  fund #134's capture automation (make it mandatory, not optional).
- If pattern-B wiring bugs recur despite green coverage → reconsider adding targeted glue
  to coverage scope.
