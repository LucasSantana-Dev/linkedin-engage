# ADR-0005: Jobs Easy Apply automation boundary — keep manual-review model

- **Status:** Accepted
- **Date:** 2026-06-25
- **Deciders:** Lucas Santana
- **Tags:** jobs, automation, ux, architecture, tos

## Context

`jobs-assist.js` navigates the LinkedIn Easy Apply modal: it opens the
application, traverses multi-step forms via `runModalStepFlow`, fills known
fields via `fillKnownFields` (email, phone, full name, title, portfolio, city,
summary), and then stops — returning `status: 'ready-manual-review'`. The user
clicks Submit manually.

The question arose while planning Sprint 3: should the extension auto-click
the Submit button when all required fields are satisfied, reducing the user's
action to zero clicks?

Two factors forced a formal decision:

1. **Field detection accuracy gap.** `isRequiredField()` (jobs-assist.js:441)
   detects required fields using only the HTML5 `required` attribute and
   `aria-required="true"`. LinkedIn's Easy Apply forms use additional
   visual/JS markers (CSS red asterisks in label text, custom JS validation
   state) not captured by the current scanner. Estimated accuracy: ~85–90%
   of required fields detected correctly.

2. **Irreversibility.** LinkedIn provides no application-withdrawal API or
   UI. A wrongly auto-submitted application (wrong contact data, wrong
   experience level, answered "no" to a required question incorrectly) cannot
   be undone without manual LinkedIn support contact. Damage is permanent.

ADR-0004 established that observation/timing logic (including the decision of
when automation is "done enough") belongs to the wiring tier, not the pure-lib
tier, and should be confirmed by a human in the loop.

## Decision

**Keep the manual-review model. The extension does not click Submit.**

`runModalStepFlow` navigates to the final modal step and returns
`status: 'ready-manual-review'`. The user reviews the prepared form and
submits. This is documented in README.md as an intentional design feature,
not a limitation.

Auto-submit (Option B) is explicitly rejected at current field-detection
accuracy. If accuracy is verified at ≥99% on real LinkedIn forms in the
future, the decision may be revisited (see Revisit When).

## Alternatives considered

| Option | Verdict | Why |
|---|---|---|
| A — Status quo (manual-review) | **Accepted** | Zero ToS exposure; zero irreversibility risk; ~1-2 sec overhead per job is acceptable |
| B — Opt-in auto-submit (toggle, default OFF) | Rejected | 85-90% required-field detection accuracy insufficient for irreversible action; LinkedIn ToS language on automated form submission unverified; no user demand signal |
| C — Dry-run preview mode | Rejected | Zero user-facing value; adds code complexity with no ROI; shows what would submit but doesn't reduce user effort |

## Consequences

**Positive**
- No risk of submitting an application with wrong data (undetected missing
  fields, wrong profile data, wrong answer on a required question).
- No LinkedIn ToS exposure from automated form submission.
- User reviews every application before it goes out — preserves intentional
  application quality control.
- No change required to `runModalStepFlow` or `fillKnownFields`.

**Negative / risk**
- User must click Submit for every application (~1-2 seconds, 1 click per job).
- If `fillKnownFields` fills all fields correctly and the form is genuinely
  ready, the final Submit click is purely mechanical — a real UX friction point.

**Accepted consequence:** the Submit click stays manual until field-detection
accuracy is demonstrably sufficient. The friction is the safety mechanism.

## Revisit when

1. Field detection is integration-tested against ≥50 real LinkedIn Easy Apply
   form snapshots (not jsdom mocks) and reaches **≥99% required-field coverage**
   including LinkedIn's custom CSS/JS markers.
2. LinkedIn's Terms of Service (or official developer documentation) explicitly
   permits opt-in automated form submission with per-submission user consent.
3. User feedback from ≥70% of active users explicitly requests auto-submit
   (no demand signal exists today).
