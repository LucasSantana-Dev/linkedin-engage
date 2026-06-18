# ADR-0003: Disposition of the two feature-toggle PRs (#141 vs #138)

- **Status:** Accepted
- **Date:** 2026-06-18
- **Deciders:** Lucas Santana
- **Tags:** process, feature-toggles, feed-removal, incremental-delivery

## Context

Two open PRs both add a Connect/Jobs/Companies feature-toggle system:

- **#141** (`feat/toggles`, 1 commit): `feature-toggles.js` + popup checkbox UI +
  EN/PT-BR strings + a richer 177-line lib test. **But its `background.js` change is a
  single `importScripts('lib/feature-toggles.js')` line — no flow reads the toggle
  values.** The toggles are **non-functional**: the UI persists a preference nothing
  enforces (disable Connect → Connect still runs). The branch also carries agent-OS
  cruft (`.serena/cache/*.pkl` ~2MB, `.agents/`).
- **#138** (`feat/v2-scope`, 8 commits, +499/−1721): the **byte-identical**
  `feature-toggles.js`, a leaner 106-line test, **real background enforcement**
  (the toggle reads that actually gate automation), **plus removal of the entire Feed
  feature and Chrome Alarms.** Its stated rationale: *"Alarms-driven automation was
  premature for this phase. Focuses the extension on Connect and Jobs."* — a **scope
  reduction**, not a correctness/security fix.

Verified: #138's `feat(feature-toggles)` commit (65cdc27) is ordered **after** the
feed/alarm-removal commits and itself removes popup/test code — so it is **entangled**
with the v2 reduction and cannot be cleanly cherry-picked onto current `main` (which
still has Feed). `decision-critic` review: SOUND-WITH-FIXES; its flip-condition (the
cost of rebasing/extracting #138) was verified as **expensive** → extraction path confirmed.

Repo standard: prefer incremental delivery; a demand-blind removal of a shipped
user-facing feature must first measure that feature's usage. Feed is **not instrumented**.

## Decision

1. **Close #141.** Non-functional scaffolding (cosmetic toggles) — shipping it would be
   a user-visible lie (a setting that does nothing). Its only unique value is the richer
   lib test, which is cheaply portable. Branch also carries cruft.
2. **Do NOT merge #138 as-is.** It bundles a **demand-blind Feed removal** (gate
   violation — Feed usage is unmeasured) with the toggle feature, and its toggle work is
   entangled with that removal (not cleanly separable).
3. **Build a functional-toggles-only increment, fresh off `main`:** copy the (identical)
   `feature-toggles.js`, add the background toggle-enforcement reads (so toggles actually
   gate Connect/Jobs/Companies), the popup UI, locale strings, and port #141's richer
   test. Toggles default **ON** (= current behavior; shipping the gate changes nothing
   until a user flips a switch). No Feed/alarm removal.
4. **Gate Feed removal as a separate decision.** First instrument Feed usage, observe a
   data window, then decide. #138 remains the candidate vehicle for that v2 reduction,
   re-scoped to *only* the removal once toggles land independently.

## Alternatives considered

| Option | Verdict | Why |
|---|---|---|
| Merge #138 as-is | Rejected | Ships demand-blind Feed removal (gate violation) bundled with toggles |
| Merge #141 as-is | Rejected | Toggles don't gate anything → dead/lying setting |
| Cherry-pick #138's toggle commit onto main | Rejected | Verified entangled (built atop feed removal + removes popup/test code) → conflicts |
| Finish #141 in place (add gating) | Rejected | Branch carries 2MB cruft + divergent test; fresh-off-main is cleaner |
| Keep both PRs open | Rejected | Duplicate/diverging toggle code → drift + eventual conflict |

## Consequences

**Positive**
- Functional toggles ship as a small, reviewable, default-ON increment (no behavior change on install).
- Feed removal decoupled and gated → no demand-blind loss of a shipped feature.
- Eliminates two diverging toggle PRs and their drift.

**Negative / risk**
- A third toggle artifact is built rather than reusing existing PR work (accepted: the
  existing work is either non-functional (#141) or entangled (#138)).
- Closing #141 loses its branch history; the richer test is ported, not referenced.

**Neutral**
- #138 stays open, re-scoped to the Feed-removal v2 decision.

## Revisit when

- **Feed-removal trigger:** after Feed usage is instrumented and a data window observed
  → decide removal then; if approved, the toggles-only increment was its first step.
- **Toggle-default trigger:** if any toggle ever needs to default OFF, re-review the
  silent-disable risk (a flow off by default with no clear UI signal).
