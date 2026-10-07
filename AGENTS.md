# linkedin-engage

Chrome Extension (Manifest V3) for LinkedIn networking automation: connections, company follows, and job applications.

## Quick Reference

```bash
npm run lint          # ESLint
npm run typecheck     # TypeScript (checkJs: false, allowJs: true)
npm run test          # Jest --verbose
npm run test:coverage # Jest --coverage --text-summary
```

## Structure

```
extension/
  _locales/en/         # EN locale catalog (370 keys)
  _locales/pt_BR/      # PT-BR locale catalog (370 keys, full parity)
  lib/                 # 35 pure-logic modules (testable in Node)
  popup/               # Popup UI (popup.html + popup.js)
  options.html         # Options/dashboard page
  options.js           # Options page logic
  background.js        # Service worker (Manifest V3)
  content.js           # Content script
  company-follow.js    # Company follow content script
  jobs-assist.js       # Jobs Easy Apply content script
  vendor/              # mammoth.browser.min.js, pdf.min.mjs, pdf.worker.min.mjs
  manifest.json        # MV3 manifest
tests/                 # 47 test files
.agents/skills/        # 4 project skills
.github/workflows/     # ci.yml + release.yml
```

## Tech Stack

- **Runtime**: Chrome Extension (Manifest V3), service worker + content scripts
- **Language**: JavaScript (no build step, no bundler)
- **Testing**: Jest + jest-environment-jsdom, Node 18/20/22
- **Linting**: ESLint
- **Type checking**: TypeScript (allowJs, noEmit)
- **CI**: GitHub Actions (lint + typecheck on Node 20, tests on Node 18/20/22)
- **Release**: Automatic GitHub Release + zip on `v*` tags

## Key Modules (extension/lib/)

| Module | Purpose |
|---|---|
| `connect-config.js` | Area presets (19), company presets, role priority, area labels, STATE_TAG_VERSION |
| `search-templates.js` | Boolean search template engine, AREA_FAMILY_MAP, SEARCH_TEMPLATES array |
| `search-language.js` | EN/PT-BR term variants (400+), alias resolution, locale-aware query compilation |
| `jobs-career-intelligence.js` | Resume analysis, career search plan generation, seniority/preset inference |
| `jobs-career-vault.js` | Encrypted IndexedDB resume storage (AES-GCM + PBKDF2) |
| `jobs-career-cache.js` | Encrypted career intelligence state cache |
| `jobs-cache.js` | Encrypted structured applicant profile cache |
| `jobs-utils.js` | Job ranking, seniority scoring, offshore compatibility, URL builder |
| `jobs-profile-import.js` | LinkedIn profile DOM extraction for jobs context |
| `i18n.js` | Locale catalog loader, getMessage, applyTranslations, key normalization |
| `analytics.js` | Run analytics, best hour/day, top category tracking |
| `ui-notify.js` | Fixed top-bar notification overlay for errors/blockers (injected in all content scripts) |

## Extension Modes

| Mode | Description |
|---|---|
| Connect | Automated people connections with preset-based search |
| Companies | Company follow with talent watchlist and brand watchlist |
| Jobs | Job search + Easy Apply with career intelligence |

## Area Presets (19 total)

- **Tech family** (10): tech, tech-frontend, tech-backend, tech-fullstack, tech-devops, tech-data, tech-cloud, tech-security, tech-mobile, tech-ml-ai
- **Business**: finance, real-estate, marketing, sales, headhunting
- **Regulated**: legal-judicial-media, environmental-engineering, sanitary-engineering, healthcare, education
- **Creative**: graphic-design, art-direction, branding, ui-ux, motion-design, video-editing, videomaker

## Coverage

```
Thresholds: 96 stmts | 85.7 branches | 99 functions | 97.5 lines
Tightest margin: functions (+0.06pp, 638/644)
```

CI auto-posts a coverage table comment on every PR.

## Skills (.agents/skills/)

| Skill | Use when |
|---|---|
| `verify` | Running quality gates before commit/PR (`/verify`) |
| `release` | Shipping a release: version bump + changelog + tag (`/ship`) |
| `area-preset-authoring` | Adding new area presets to Connect/Companies/Jobs |
| `extension-i18n-search-l10n` | Modifying UI copy or search-query localization |

## Conventions

- **No build step** — extension runs raw JS in Chrome
- **UMD-style modules** — `(function(root, factory) { ... })` pattern for Node + browser compatibility
- **Dark-only UI** — no light theme support
- **EN/PT-BR** — full locale parity required (370 keys each)
- **Conventional commits** — `feat:`, `fix:`, `test:`, `chore:`, `refactor:`, `docs:`
- **Trunk-based development** — PRs to `main`, squash merge

## Gotchas

- `extension/lib/` modules are testable in Node; `extension/*.js` scripts are Chrome-only runtime
- `jobs-career-parser.js` lines 27-56 (loadPdfJs/extractTextFromPdf) require `chrome.runtime.getURL` — untestable in Node/jsdom
- `jobs-career-vault.js` needs `require('crypto').webcrypto` fallback for Node 18 (no global `crypto.subtle`)
- `STATE_TAG_VERSION` in `connect-config.js` must be bumped when adding presets (triggers migration)
- Locale keys in `_locales/*/messages.json` must use `[A-Za-z0-9_]` only — dotted keys are normalized at the i18n boundary
