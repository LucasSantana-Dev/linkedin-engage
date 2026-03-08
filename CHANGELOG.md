# Changelog

All notable changes to this project will be documented in this file.

## [1.11.0] - 2026-03-08

### Added
- **Project rebrand**: "LinkedIn Auto-Connect" → "LinkedIn Engage" across manifest, package.json, README, release workflow
- **Concept-based comment generation**: `extractConcepts()` pulls specific technologies, patterns, and tools from post text — comments reference actual content instead of generic topics
- **Composed template system**: `COMPOSED_EN` and `COMPOSED_PT` template functions generate context-aware comments using extracted concepts for 10 post categories (hiring, achievement, technical, question, opinion, motivation, project, jobseeking, newjob, generic)
- **Expanded PT-BR keywords**: Achievement, technical, hiring, newjob categories now include Portuguese keywords for better bilingual classification
- **Expanded reaction keywords**: Tech-specific terms (shipped, launched, certified, burnout, laid off, clean code, ci/cd, friday deploy) and PT-BR equivalents for smarter reaction selection
- **Server hardening**: Added `helmet`, `express-rate-limit`, and `zod` dependencies for Playwright connector security

### Improved
- **Post text extraction**: Individual selector iteration with length validation replaces combined selector string — catches more LinkedIn DOM variants including `span[dir="ltr"]` nested in commentary divs
- **Comment submit reliability**: 8 retry attempts (up from 6), keyboard event simulation (keydown/keyup) to trigger React state updates, `focus()` before input dispatch, post-submit verification
- **React button detection**: `reactToPost()` now iterates all buttons checking aria-label and text content instead of relying on a single combined selector
- **Comment flow**: Concepts → composed templates → string templates fallback chain. Removed follow-up appending for cleaner output

### Fixed
- **extractTopic default**: Returns "tech" instead of "this topic" for unrecognized content — more natural in generated comments

## [1.10.2] - 2026-03-08

### Added
- **"See more" text expansion**: `expandSeeMore()` clicks LinkedIn's truncation button ("...more" / "...mais") before extracting post text — full content available for classification and comment generation
- **Session management**: `ensureLoggedIn()` pre-flight check validates session, restores saved cookies, falls back to manual login with timeout. Cookies saved to `linkedin_cookies.json` after successful login
- **Session API endpoint**: `GET /api/linkedin/session` returns session health (cookie age, session dir existence, login timeout)
- **Login wall detection**: Feed engagement detects login/authwall/challenge pages at start, sends `LINKEDIN_BOT_LOGIN_REQUIRED` notification via bridge relay

### Fixed
- **Technical keyword precision**: Removed overly broad keywords (`backend`, `aws`, `cloud`) that caused false positives in job-seeking posts. Kept specific terms (`.net`, `dependency injection`, `singleton`, `terraform`)

## [1.10.1] - 2026-03-08

### Fixed
- **Content-aware comments**: `getPostText()` now captures article titles (`.feed-shared-article__title`, `.update-components-article__title`) in addition to body text — shared articles are now correctly classified instead of falling back to generic templates
- **Comment submit button**: `setEditorText()` now uses `document.execCommand('insertText')` for React/draft-js compatibility — LinkedIn's React state updates properly, enabling the submit button. Added retry loop (6 attempts) waiting for button to become enabled
- **Submit button selectors**: Broadened selectors to match current LinkedIn markup including `comments-comment-box__submit-button`, PT-BR labels (`Publicar`, `Enviar`), and artdeco button variants
- **Technical classification**: Added `.net`, `dependency`, `injection`, `singleton`, `design pattern`, `infrastructure`, `backend`, `frontend`, `devops`, `cloud`, `aws`, `azure` keywords to technical category

### Added
- **Debug logging**: Post classification logs showing extracted text, detected language, and category for each post processed
- **2 new tests**: Article title extraction tests in feed-engage.test.js (total: 234 tests)

## [1.10.0] - 2026-03-08

### Added
- **Scheduled company follow**: Chrome Alarms-based recurring company follow with batch rotation — configurable interval and batch size, rotates through company list across runs
- **Scheduled feed engagement**: Chrome Alarms-based recurring feed engagement with current react/comment settings
- **Feed analytics dashboard**: Comment success rate, reaction breakdown bar chart, top reaction type, feed skip count — new metrics grid in options page
- **38 new tests**: `tests/company-follow.test.js` covering URL building, button detection, CAPTCHA detection, batch rotation scheduling, and integration flows (total: 196 tests across 4 suites)
- **Extracted company-follow functions**: `detectChallenge`, `buildCompanySearchUrl`, `findCompanyCards`, `findFollowBtnInCard`, `buildBatchFromRotation` moved to `company-utils.js` for testability
- **dotenv support**: `.env` configuration for PORT, HEADLESS, CLICK_LIMIT, LOGIN_TIMEOUT, USER_DATA_DIR, CACHED_SELECTORS_FILE
- `.env.example` template included

### Fixed
- **detectChallenge jsdom compatibility**: `innerText || textContent` fallback for test environments
- **Dashboard schedule display**: Shows Connect, Company, and Feed schedule status when active

## [1.9.0] - 2026-03-08

### Added
- **6 new post categories**: humor, critique, motivation, project, jobseeking, newjob — with EN + PT-BR conversational templates
- **Curated company list**: DEFAULT_LATAM_COMPANIES now 60 mid-size (150-500 employee) companies that actively hire from Brazil/LATAM (Hotjar, Doist, Toggl, QuintoAndar, CloudWalk, Creditas, etc.)
- **Per-company search**: Company follow now searches each target company name individually instead of one broad query — much higher hit rate
- **Category-aware follow-ups**: Follow-up questions match post category (e.g., "what stack?" for technical, "is it open source?" for projects)
- **Smart template selection**: Skips `{keyPhrase}` templates when no phrase extracted; prefers short templates for short posts

### Fixed
- **Bottom-up post discovery**: `findPosts()` now finds Like/Comment buttons first and walks UP DOM tree to container — more resilient than class-based selectors
- **Comment editor polling**: Replaced fixed 2s delay with polling loop (500ms × 10 attempts) for editor to appear
- **Submit button scoping**: Search within post element first, document fallback only if needed
- **Comment text input**: Uses `innerText` + dispatch input event instead of DOM manipulation (createElement)
- Added `submit-button--cr` class variant for LinkedIn's current comment submit button

## [1.8.1] - 2026-03-07

### Added
- **PT-BR comment templates**: Language-aware comment generation — detects Portuguese posts and uses conversational PT-BR templates automatically
- `detectLanguage()` function with 50+ Portuguese marker words (3+ threshold)
- `CATEGORY_TEMPLATES_PT` with templates for all 8 categories, plus PT-BR openers/follow-ups
- **Duplicate post guard**: Engaged post URNs persisted via `chrome.storage.local` across sessions (keeps last 2000)
- Bridge.js `SAVE_ENGAGED`/`LOAD_ENGAGED` message handlers for feed engagement persistence
- **Dashboard: company follow + feed engagement stats**: Companies Followed and Feed Engaged cards
- History persistence for company follow and feed engagement modes (`companyFollowHistory`, `feedEngageHistory`)
- Log table merges all three modes sorted by time with color-coded badges
- Activity chart counts company follows and feed engagements alongside connection sends
- CSV export includes all modes
- **company-utils.js**: Extracted testable functions (`extractCompanyInfo`, `matchesTargetCompanies`, `isFollowingText`, `isNextPageButton`)
- 32 new tests: 22 company-utils + 10 feed-utils PT-BR (152 total across 3 suites)

### Fixed
- Feed engagement `findPosts()` returning 0 posts due to LinkedIn DOM changes — added broader selectors and button-detection fallback
- Updated `getPostText`, `getPostAuthor`, `getPostUrn`, `reactToPost` selectors for current LinkedIn DOM

## [1.8.0] - 2026-03-07

### Added
- **Company follow mode**: Search and auto-follow companies on LinkedIn (e.g., big tech, startups)
- Optional target company filter (only follow matching names from a user-provided list)
- **Feed engagement mode**: Auto-react and comment on LinkedIn feed posts
- Content-based smart reactions: keyword matching maps posts to Celebrate, Support, Insightful, Funny, or Love
- Comment templates with `{topic}` auto-detection (AI, leadership, hiring, etc.) and `{excerpt}` placeholders
- Skip keywords to avoid engaging with sponsored/promoted content
- Multi-mode popup UI: Connect / Companies / Feed selector with per-mode settings
- Shared utility library (`lib/feed-utils.js`) with pure functions for feed engagement logic
- Generic script injection (`injectAndStart`, `injectScriptsSequentially`) in background.js
- Generic `runCustom` bridge relay for arbitrary content script message types
- 30 new tests for feed-utils.js (getReactionType, buildCommentFromPost, extractTopic, isReactablePost, shouldSkipPost, isCompanyFollowText)

### Improved
- State persistence now covers all new mode fields (companyQuery, targetCompanies, feedReact, feedComment, commentTemplates, skipKeywords, currentMode)
- Progress indicator adapts verb per mode: Sent / Followed / Engaged

## [1.7.0] - 2026-03-07

### Added
- **Engagement mode**: Profile visit + follow automation as alternative to connect invites
- Popup toggle: "Engagement only" checkbox skips connect attempts, visits profiles and clicks Follow
- Auto-fallback: when weekly invite quota is hit mid-run, automatically switches to engagement mode for remaining profiles
- `runEngagement()` function with hidden iframe profile visits and Follow button detection
- PT-BR Follow button support (`Seguir`)
- Dashboard cards: Engaged count and Followed count with purple theme
- `badge-engaged` status in dashboard log (light/dark mode)
- Engagement statuses in CSV export: `visited`, `followed`, `visited-followed`

### Fixed
- `fuseLimitHit` now persisted via `chrome.storage.local` — survives page navigation (content.js re-injection)
- Bridge.js handles `SET_FUSE_LIMIT` / `CHECK_FUSE_LIMIT` messages for cross-world persistence
- `fuseLimitRetry` alarm clears persisted fuse flag before retry probe

### Improved
- Exponential backoff for unverified invite retries: 30s, 60s, 120s... up to 5min cap (was fixed 30-60s)
- Backoff multiplier resets on successful verified send
- Shared functions in `lib/invite-utils.js` are now the single source of truth (100 lines removed from content.js)

### CI
- GitHub Actions workflow for Jest test suite on push/PR to main

## [1.6.0] - 2026-03-07

### Fixed
- False positive invites: Connect button showed "Pending" in logs but invites were silently rejected by LinkedIn (HTTP 429 FUSE_LIMIT_EXCEEDED)

### Added
- 4-layer invite verification: button state filtering, InMails modal handling, DOM pending state polling, network API interception
- `verifyPendingState()` — polls DOM 6x (3s) to confirm button changed to "Pending" before counting as sent
- Fetch/XHR interceptors for LinkedIn's `verifyQuotaAndCreateV2` API — detects 429 rate limits in real-time
- `fuseLimitHit` flag stops automation immediately when weekly quota is exhausted
- Chrome notification on FUSE_LIMIT_EXCEEDED: "Weekly invitation limit reached"
- `skipped-unverified` status for invites that failed DOM verification
- `stopped-quota` status when API rate limit is detected
- `isButtonClickable()` filter skips `:disabled` and `.artdeco-button--muted` buttons
- Button disabling after click prevents re-scanning same button
- `dismissInMailsModal()` handles Send InMail overlay that blocks automation flow
- Precise send button selector (`div.send-invite button.artdeco-button--primary`) before text-based fallback
- PT-BR support for `Conectar` button text and `Pendente` status

## [1.5.0] - 2026-03-07

### Added
- PT-BR note templates with language-aware background (scheduled runs use correct language)
- Dark mode via `prefers-color-scheme` for popup and dashboard
- 14-day activity bar chart on dashboard showing daily send volume

## [1.4.0] - 2026-03-07

### Added
- Error resilience: lastError checks, 60s tab load timeout, tab close detection, notification on all error paths
- Recent profiles card UI in popup showing last 5 connections with avatar initials, linked name, headline, and status badge
- i18n support (EN/PT-BR) — auto-detects browser language, translates all popup and dashboard UI text

## [1.3.0] - 2026-03-07

### Added
- Duplicate profile detection across runs via persistent URL tracking
- Desktop notifications on automation completion or stop
- Connection acceptance tracker (cross-references connections page)
- Dashboard page with weekly/total/accepted stats and connection history
- Multi-query rotation for scheduled runs (one query per line, cycles each trigger)

### Fixed
- connectionLog accumulating across runs (now cleared at start)
- CAPTCHA detection sending duplicate DONE messages
- Alarm handler using stale customQuery when useCustomQuery was false
- XSS risk in dashboard — replaced innerHTML with safe DOM methods
- Error resilience: lastError checks on script injection, tab load timeout, tab close handling

## [1.2.0] - 2026-03-07

### Added
- Weekly invitation limit guard (150/week with ISO week tracking)
- CAPTCHA and security challenge detection (auto-stop)
- Connection log export as CSV
- Scheduled runs via Chrome Alarms API (configurable interval)

## [1.1.0] - 2026-03-07

### Added
- Stop button with live progress counter
- 429 rate limit backoff (30-60s pause after 3 consecutive failures)
- Connection degree filter (2nd/3rd+ via LinkedIn `network` param)

### Changed
- Simplified standalone connector to accept query from request body

### Removed
- test-search.js (broken complex boolean queries)

## [1.0.0] - 2026-03-07

### Added
- Chrome Extension with tag-based search builder (Role, Industry, Market Focus, Level)
- 6 note templates (Senior, Mid, Junior, Lead, General, Custom)
- 300-character note validation
- Smart profile prioritization (mutual connections first, then by degree)
- Follow-to-Connect via "More actions" dropdown
- Email-required modal detection and auto-skip
- LATAM recruiter targeting with configurable region selector
- "Actively Hiring" filter
- Cross-iframe DOM querying (LinkedIn renders modals in iframes)
- Dual-world injection (MAIN for DOM, ISOLATED for chrome.runtime)
- Auto-pagination through search results
- Personalized notes with `{name}` template variable
- Standalone Playwright connector with Express API
- n8n workflow integration
- GitHub Actions release workflow
