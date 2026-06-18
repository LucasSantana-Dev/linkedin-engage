# ADR-0002: Connect "no search results" detection strategy

- **Status:** Accepted
- **Date:** 2026-06-17
- **Deciders:** Lucas Santana
- **Tags:** connect, detection, robustness, linkedin-dom

## Context

The Connect automation (`content.js`, MAIN world) now detects when a mounted
LinkedIn search returned zero matches, via `invite-utils.detectNoSearchResults()`.
The first cut was **text-only**: a regex (EN + PT-BR) tested against
`.artdeco-empty-state` / `main` text. That is a single, hardcoded-copy signal —
brittle to LinkedIn copy/markup changes (a false-negative makes Connect paginate
into the void again, the exact bug this feature fixed).

The Company flow already carries a richer detector in `company-utils.js`
(`getResultsCountText` → `parseResultsCountHint` count===0, `findCompanyCards`,
`detectExplicitNoResults`). So the question: what detection strategy should
Connect use, and should the two flows be unified?

A `decision-critic` review (NEEDS_REVISION) flipped two parts of the initial
proposal — recorded under Decision below.

## Decision

**Use a hybrid boolean signal, in-place in `invite-utils`, with no precedence and
no card-counting:**

```
no-results  ==  explicit empty-state text matches  OR  results-count header parses to 0
```

1. **Two independent signals, OR'd — no precedence.** Because the result is a
   boolean, it does not matter which signal is more frequent. The empty-state
   text catches the common people-search true-zero case (where LinkedIn replaces
   the results list with an `.artdeco-empty-state` card and *no* count header).
   The count===0 signal catches the case where a "0 results" header is shown.
   Either firing ⇒ no-results.
2. **Drop the card-absence / settle-delay signal.** Counting zero result cards
   conflates "still loading", "all already-connected", and "all filtered" with
   "genuinely empty" → false positives, plus a per-search latency tax. The two
   signals above cover the real cases without it. Connect already only triggers
   the check when it found zero action targets, so card-absence would be redundant.
3. **Extend in-place; do NOT extract a shared module now.** Pulling the detector
   into a module both flows inject adds coupling, injection-order risk, and
   test-migration cost. People-search and Company-search DOMs are not proven to
   co-evolve, so a shared selector set could drift apart anyway. Connect borrows
   the same regex shape as company-utils but keeps its own copy.

**False-positive safety (verified):** the count regex
`/([\d][\d.,]*)\s*(?:results?|resultados?)/i` requires the literal word
"results"/"resultados" adjacent to the number, and `getResultsCountText` gates on
`/\b(results?|resultados?)\b/` — so "0 filters", "0 endorsements", etc. never
parse as a zero count.

## Alternatives considered

| Option | Verdict | Why |
|---|---|---|
| Text/selector match only (first cut) | Superseded | Single hardcoded-copy signal; false-negative when LinkedIn changes empty-state text |
| Results-count===0 only | Rejected | Header often ABSENT on people-search true-zero — would miss the main case |
| Card-absence + settle timeout | Rejected | Conflates loading / all-filtered / truly-empty → false positives + latency |
| Hybrid + card-absence tertiary | Rejected (critic) | Tertiary adds false-positives + latency for no gain over empty-state OR count |
| Extract shared module (both flows) | **Deferred (critic)** | Coupling + injection-order + test-migration cost > drift benefit; DOM parity unproven |
| Keep text-only (do nothing) | Rejected | Leaves the brittleness that motivated the ADR |

## Consequences

**Positive**
- Two independent signals → far lower false-negative rate than text-only; resilient
  if LinkedIn changes either the empty-state copy or the count header (not both).
- No card-counting → no settle-delay latency, no loading/filtered false positives.
- In-place → zero injection/coupling risk; trivially reversible (one function).

**Negative / risk**
- Two divergent detectors (connect vs company) can still drift. Accepted for now;
  see revisit trigger. A code comment in each points at the other.
- Both detectors remain selector/regex-based — a simultaneous change to BOTH the
  empty-state markup AND the count header would still defeat detection (low odds).

**Neutral**
- Connect's detector grows ~15 lines + branches; coverage gate must stay green
  (tests added for the count-signal path).

## Revisit when

- **Unify trigger:** after both detectors have run for ≥1 release cycle AND a real
  LinkedIn DOM change is observed that would affect Connect and Company *identically*
  → extract the shared detector then (evidence the selectors co-evolve). Owner: Lucas.
- **Simplify trigger:** if LinkedIn ships a stable machine-readable empty-state
  marker (e.g. a `data-test-*` attribute) → collapse to that single signal.
- **Locale trigger:** adding a new UI locale requires extending the detection terms
  (ties to the separate detection-term localization question).
