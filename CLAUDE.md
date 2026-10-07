# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run lint                                                    # ESLint — must produce zero warnings/errors
npm run typecheck                                               # tsc --noEmit (allowJs, checkJs: false)
npm test                                                        # Jest --verbose
npm test -- --testPathPattern=<name>                           # Single test file
npm test -- --coverage --coverageReporters=text-summary        # With coverage summary
npm run install-hooks                                           # Install local git hooks
```

CI runs lint + typecheck on Node 20 only; tests run on Node 18, 20, and 22.

## Architecture

Chrome Extension (Manifest V3). **No build step**: the extension runs raw JS directly in Chrome.

### Extension entry points

| File | World | Purpose |
|---|---|---|
| `extension/content.js` | MAIN | Connect automation (reads LinkedIn's JS context) |
| `extension/company-follow.js` | MAIN | Company follow automation |
| `extension/jobs-assist.js` | MAIN | Jobs Easy Apply assistant |
| `extension/bridge.js` | ISOLATED | `chrome.runtime` ↔ `postMessage` relay |
| `extension/background.js` | Service worker | Tab management, Chrome Alarms, notifications |
| `extension/popup/popup.js` | — | Settings UI |
| `extension/options.js` | — | Dashboard (stats, history, logs) |

**Why MAIN world?** LinkedIn renders invite modals inside `about:blank` iframes. ISOLATED-world content scripts cannot access those elements. `bridge.js` in ISOLATED world relays `chrome.runtime` messages via `window.postMessage`.

### lib/ modules (`extension/lib/`)

Pure-logic modules testable in Node. They follow a UMD wrapper pattern so they load in both Node (`require`) and Chrome (global assignment):

```js
(function(root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
    root.LinkedInFoo = api;
    Object.keys(api).forEach(k => { if (typeof root[k] === 'undefined') root[k] = api[k]; });
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
    // ... pure functions ...
    return Object.freeze({ publicFn1, publicFn2 });
});
```

Non-pure dependencies (functions from the host file) are injected as parameters rather than referenced as globals — see `buildRelaxedConnectConfig(config, normalizeTemplateMeta)` in `connect-query.js`.

Key lib modules:
- `connect-config.js` — area presets (19), company presets, `STATE_TAG_VERSION` (must bump when adding presets)
- `search-templates.js` — Boolean template engine, `AREA_FAMILY_MAP`, `SEARCH_TEMPLATES`
- `search-language.js` — 400+ EN/PT-BR term variants, locale-aware query compilation
- `i18n.js` — locale catalog loader; keys in `_locales/*/messages.json` must match `[A-Za-z0-9_]` only
- `popup-state.js` — popup DEFAULT_* constants and state normalization
- `jobs-career-intelligence.js` — resume analysis + jobs plan generation (pure, no chrome API)
- `jobs-career-vault.js` — AES-GCM + PBKDF2 encrypted IndexedDB; needs `require('crypto').webcrypto` fallback for Node 18

### Cross-document querying

`getAllDocuments()` collects the main `document` plus all same-origin iframe `contentDocument` objects. All DOM queries run across all documents to handle LinkedIn's `about:blank` iframes.

### Localization

UI locale (popup/dashboard copy) is global. Search locale is resolved independently per mode (`Connect`, `Companies`, `Jobs`). Locale keys use underscores only — Chrome/Brave reject dots in `messages.json` keys. Dotted logical keys are normalized at the `i18n.js` boundary.

## Testing

Tests live in `tests/`. Test file naming mirrors the lib module: `extension/lib/foo.js` → `tests/foo.test.js`.

Coverage applies to `extension/lib/**` only (`collectCoverageFrom` in `jest.config.cjs`).

**Thresholds** (enforced by Jest and required for PR merge):

| Metric | Threshold |
|---|---|
| Statements | 96% |
| Branches | 85.7% |
| Functions | 99% |
| Lines | 97.5% |

Function headroom is tightest (+0.06pp over threshold: 638/644 at 99%). Watch this on refactors that add or remove functions.

**Node cross-version gotchas:**
- `crypto.subtle` — not a global on Node 18; use `require('crypto').webcrypto` fallback
- `btoa`/`atob` — not available in Node 18; use `Buffer.from` fallback
- jsdom cross-realm `ArrayBuffer` — wrap in `Uint8Array` before passing to SubtleCrypto

## Release flow

Releases always go through a PR (main is branch-protected). The release skill is at `.agents/skills/release/SKILL.md`.

1. Branch: `git checkout -b chore/release-X.Y.Z`
2. Bump: `npm version patch --no-git-tag-version` + update `extension/manifest.json` version manually
3. Update `CHANGELOG.md` — move items from `[Unreleased]` into a new `## [X.Y.Z] - YYYY-MM-DD` section
4. Commit: `chore(release): bump version to X.Y.Z`
5. PR → CI green → squash merge
6. Tag: `git tag -a vX.Y.Z -m "..."` + `git push origin vX.Y.Z`
7. `release.yml` auto-packages `extension/` into `linkedin-engage-vX.Y.Z.zip` and uploads it to GitHub Releases (zip only)

## Conventions

- **Conventional commits**: `feat:`, `fix:`, `refactor:`, `test:`, `chore:`, `docs:`
- **Squash merge** to main; trunk-based development
- **`extension/lib/` = testable in Node** — no `chrome.*`, no `document.*`; `extension/*.js` = Chrome-only
- **Bump `STATE_TAG_VERSION`** in `connect-config.js` whenever adding/removing area presets (triggers storage migration)
- **Full EN/PT-BR parity** — every UI string needs a key in both `_locales/en/messages.json` and `_locales/pt_BR/messages.json`

## Project skills

| Skill | Invoke | Purpose |
|---|---|---|
| `verify` | `/verify` | Lint + typecheck + test with coverage; warns when branches < 86.0% |
| `release` | `/ship` | Full release flow |
| `area-preset-authoring` | explicit | Adding new area presets |
| `extension-i18n-search-l10n` | explicit | Modifying UI copy or search localization |
| `extract-umd-lib` | explicit | Extracting a pure-function cluster from a monolith into `lib/` (E-11 recipe) |
| `backlog-sweep` | explicit | Refresh backlog plan at session start when HEAD has moved |
