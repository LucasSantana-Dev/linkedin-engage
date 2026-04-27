---
name: capture-linkedin-card
description: Capture a real LinkedIn search-result card from a live profile session, sanitize it, and add it as a regression fixture. Use when LinkedIn DOM drift broke a scanner (people-search, recruiter, profile-walker, follow-fallback) or when adding a new card variant is needed.
metadata:
  owner: linkedin-engage
  tier: project
---

# Capture LinkedIn card

Replace hand-authored fixtures in `tests/fixtures/linkedin-cards/` with sanitized real captures. Pairs with the regression suite locked by PR #67 (`test(dom): regression fixtures lock LinkedIn card scanners against DOM drift`).

## When to use

- A scanner regression is reported (Connect / Follow / More-menu / pending state).
- Adding coverage for a new card variant LinkedIn rolled out (e.g. "Open to work" badge, new follow-first toggle markup).
- Replacing one of the 5 hand-authored fixtures (`connect-available.html`, `connect-via-more.html`, `follow-only.html`, `pending.html`, `universal-template-follow.html`) with a real-DOM equivalent — see backlog item B-3.

## Steps

1. **Open LinkedIn People search** with a query that surfaces the card variant you need (e.g. for `connect-via-more`, use a 3rd-degree query in a market where Connect lands behind the More menu).
2. **DevTools → Elements** → right-click the card's outer `<li class="reusable-search__result-container">` → Copy → Copy outerHTML.
3. **Paste into a scratch buffer** and run the sanitization checklist below.
4. **Save** to `tests/fixtures/linkedin-cards/<variant>.html`. Keep filenames kebab-case and aligned with scanner-state vocabulary (`connect-available`, `follow-only`, `pending`, `connect-via-more`, `universal-template-follow`, …).
5. **Add a regression case** in the matching `tests/*.test.js` file that loads the fixture via the existing `loadFixture()` helper and asserts the scanner's classification + extracted button selector.
6. **Run** `npm test -- linkedin-cards` to confirm green; commit on a `test(dom): capture <variant> from real linkedin DOM` branch.

## Sanitization checklist (before committing)

Strip everything that is PII, ephemeral, or visual-only. The fixtures only need enough markup for scanners to make decisions.

- **Member URNs / member IDs:** replace `urn:li:member:123456789` with `urn:li:member:123`. Same for `data-chameleon-result-urn`, `data-test-result-card-urn`, etc.
- **Profile URLs:** replace `linkedin.com/in/<slug>-abc123` with `linkedin.com/in/test-profile-1`.
- **Names + titles:** replace with neutral placeholders (`Test Person`, `Software Engineer`). Don't keep real names even if "the user is public" — captures live in git history forever.
- **Avatar URLs / image src:** replace with `data:image/gif;base64,…` 1×1 or strip the `<img>` if the scanner doesn't read it.
- **Tracking attrs:** drop `data-finite-scroll-hotkey-context`, `data-test-app-aware-link`, `data-tracking-control-name` values. Keep the attribute names if a scanner queries on them; replace values with stable placeholders.
- **Aria-labels with names:** `aria-label="Connect with John Smith"` → `aria-label="Connect with Test Person"`.
- **Inline styles:** drop entirely unless scanner depends on `display:none` or similar.
- **Comments / `<!-- -->`:** strip.
- **JSON blobs in `data-*`:** if a scanner reads them, replace personal IDs with `123`/`test-…`; otherwise drop the attribute.

The acceptance bar: a teammate could read the fixture and not learn anything about a real person.

## What to keep

- **Class names** the scanner queries on (`reusable-search__result-container`, `entity-result__primary-subtitle`, `artdeco-button`, `artdeco-button--secondary`, `artdeco-button__text`, …).
- **Aria roles + button text** that drive the Connect/Follow/More classification.
- **Pending / disabled state** classes/attrs (`disabled`, `aria-disabled="true"`, `artdeco-button--muted`).
- **Nested structure depth** the scanner walks — don't flatten if `closest()` is used.

## Reproduction recipes per variant

Use these as starting queries when capturing — adjust market/keyword to match the recruiter family you've configured locally.

- `connect-available` — 2nd-degree contact, common role. Connect button visible inline.
- `connect-via-more` — 3rd-degree or out-of-network. Connect lives behind a `…` More-actions menu. Capture the card *with the menu collapsed* (the scanner opens it itself).
- `follow-only` — content creator / public figure. Primary CTA is Follow, no Connect.
- `pending` — search yourself or a teammate after sending a recent invite. Card shows Pending / disabled state.
- `universal-template-follow` — a verified entity (newsroom, brand) where the universal template renders Follow as primary.

## Validation

Before opening the PR:

```bash
npm test -- linkedin-cards     # scanner regression suite
npm test                       # full suite (no skipped)
```

Then sanity-check the diff for any `urn:li:member:[0-9]{4,}` (real ID leakage), `linkedin.com/in/[a-z0-9-]{5,}` (real slug), or any name longer than `Test Person`.

## Out of scope

- Capturing the full search-results page (use the per-card fixtures — scanners take a single card as input).
- Live Playwright e2e against linkedin.com (parked in backlog J — auth fragility, IP risk).
- Replicating LinkedIn's tracking JS — fixtures are static HTML only.
