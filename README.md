# LinkedIn Engage

A Chrome Extension and standalone Playwright connector for automating LinkedIn networking — connections, company follows, and feed engagement.

## Features

### Chrome Extension
- **Tag-based search builder** — compose LinkedIn search queries by selecting Role, Industry, Market Focus, and Level tags
- **Boolean-optimized search templates (v1)** — deterministic template engine
  for Connect/Companies/Jobs with per-mode goals, expected-result buckets
  (`precise`, `balanced`, `broad`), and controlled operator budgets
- **Full EN/PT-BR UI localization** — popup, dashboard, notifications, and runtime status copy now follow a single UI language switch (`Auto`, `English`, `Português (Brasil)`) with no inline bilingual UI labels
- **Locale-aware search language** — Connect, Companies, and Jobs each have an independent search-language strategy (`auto`, `en`, `pt_BR`, `bilingual`) so generated queries can use local-market or global-language terms without changing the UI locale
- **Area presets for non-tech networking** — one-click presets for Tech, Finance, Real Estate, Headhunting, Legal/Judicial Media, Environmental, Sanitary, Healthcare, Education, Marketing, Sales, Graphic Design, Art Direction, Branding, UI/UX, Motion Design, Video Editing, and Videomaker
- **Auto + manual template override** — each search mode supports
  `Usage Goal`, `Expected Results`, `Template`, and `Auto-select template`
  controls; scheduled runs reuse the same template resolution logic
- **Intent preset picker** — top-of-popup `Preset intent` selector with curated one-click intents (Recruiters — Tech / Senior / Remote / Startup / Agency / Brasil / Design; Peer networking — Tech; Tech decision-makers; Custom). Selecting one cascades area preset + usage goal + expected results + search language + goal mode in a single click; the previous seven sub-controls now live in a collapsed "Advanced search settings" accordion (#65, v1.36.19)
- **Recruiter preset family** — six area presets tailored for outreach to recruiters (`recruiter-tech-general`, `-senior`, `-remote-global`, `-startup-saas`, `-agency`, `-brazil`), each with role/industry tags and a research-backed Boolean default query (#59, v1.36.17)
- **Seniority chips: Intern → Staff** — Connect "Level They Hire" group covers Intern, Associate, Junior, Mid-Level, Senior, Lead, Staff with EN/PT-BR localization (`estagiário`, `assistente`, `júnior`, `pleno`, `sênior`) (#72, v1.36.21)
- **Work Mode filter group** — area-agnostic chips for Remote / On-site / Hybrid that compose with any area preset and localize to PT-BR (`remoto` / `presencial` / `híbrido`) via the search-language selector (#72, v1.36.21)
- **Exclude-keywords filter** — free-text comma- or newline-separated exclusion list threads into the compiled query as Boolean `NOT` segments; standalone operator tokens (`AND`/`OR`/`NOT`) are filtered out so user typos can't break the query (#60, v1.36.17 / #71, v1.36.21)
- **Years-of-experience range** — optional `yearsMin` / `yearsMax` filter applied client-side during card scanning, with a `skipped-years-range` skip reason in the run log (#60, v1.36.17)
- **Live Boolean preview** — compiled Boolean query rendered live (150 ms debounce) on every tag, preset, or exclude-keyword change so the URL-bound query is visible before launch (#60, v1.36.17)
- **Profile-view walker (passive visibility)** — opt-in background tab walker drives the "people viewed your profile" counter with 6–10 s dwell + jitter; clamped daily target ([0, 50]) and per-minute throttle; respects stop / daily-cap / challenge signals (#61, v1.36.17)
- **Follow-fallback / follow-first toggles** — `Follow fallback` (default on) makes follow the explicit action when LinkedIn hides the Connect button; `Follow-first mode` prefers follow over connect when both are visible; `Max follows per run` caps follow volume (#58, v1.36.17)
- **Area-aware note templates** — Senior, Mid-Level, Junior, Lead, General Networking, and Custom with role-neutral wording adapted to the selected area
- **300-char validation** — enforces LinkedIn's invitation note character limit
- **Smart prioritization** — profiles with mutual connections and closer network degree are processed first
- **Follow-to-Connect** — handles profiles showing "Follow" instead of "Connect" by opening the "More" menu to find the hidden Connect option
- **Connect mode follow fallback** — if a profile has only `Follow` and no `Connect` option, Connect mode follows the person instead of skipping
- **Already-connected suppression** — Connect mode ignores cards marked as `1st`/`1º grau`, preventing attempts on people who are already in your network
- **Email modal detection** — auto-skips profiles that require email verification (3rd+ degree with no mutuals)
- **Neutral search defaults** — first load starts without preselected role/industry/market tags so users can choose their own area scope
- **LATAM recruiter targeting** — Market Focus tags (LATAM, Brazil, Nearshore, Remote) + configurable recruiter region selector
- **"Actively Hiring" filter** — leverages LinkedIn's undocumented `activelyHiring=true` URL parameter
- **Weekly limit guard** — tracks invites per week (150 max), blocks/adjusts when approaching limit
- **CAPTCHA detection** — auto-stops on security challenges (checkpoint, captcha, verification pages)
- **Connection log export** — download CSV of sent/skipped profiles with timestamps
- **Scheduled runs** — recurring automation via Chrome Alarms API (configurable interval)
- **Deterministic run outcomes** — every Connect/Feed/Companies/Jobs run emits normalized outcome metadata (`runStatus`, `reason`, `processedCount`, `actionCount`, `skippedCount`)
- **Consistent stop behavior** — clicking `Stop` now finalizes runs as `canceled` (not success/failure), with stable popup messaging and history diagnostics
- **Engagement mode** — visit profiles + follow as alternative when connect invites are exhausted; toggle in popup or auto-fallback on quota hit
- **Company follow mode** — background-managed queue runs one target-company search at a time with resilient re-injection across navigation; each step polls for DOM readiness (up to 20s), differentiates explicit `no results` pages from card-detection timeouts, and emits a single final completion when the full queue finishes; supports creative company-area presets (Graphic Design, Art Direction, Branding, UI/UX, Motion Design, Video Editing, Videomaker) with default query + curated global/Brazil company lists; custom preset keeps LATAM defaults; scheduled recurring runs keep batch rotation only when explicit target companies are set and otherwise run by query; empty target list means follow all results
- **Companies follow confirmation retries** — each follow click is verified in-card with bounded retries and signal polling (`Following`/`Seguindo`, aria followed state, follow-success toast); `already-following` is only counted on confirmed followed state, while unconfirmed attempts are logged as `skipped-follow-not-confirmed` and zero-follow runs can fail with `follow-not-confirmed`
- **Jobs assist mode (LinkedIn Easy Apply)** — ranks visible jobs by best-fit signals (title/seniority/location/recency/company), honors the `Jobs Easy Apply Only` toggle, skips already-applied/excluded-company listings, progresses multi-step Easy Apply (`Next/Continue` + `Review`) automatically, and stops before final submit
- **Encrypted jobs profile cache** — structured applicant fields are stored locally with PBKDF2 + AES-GCM encryption; use `Unlock Cache` with a session passphrase to load cached fields (passphrase is never persisted)
- **Jobs Career Intelligence** — local-only analysis of uploaded `PDF`/`DOCX` resumes plus an explicit LinkedIn profile import derives best-fit roles, hard-skill keywords, seniority, and search terms; generated Jobs query/filters remain editable
- **Brazil Offshore Friendly jobs filter** — boosts/filters roles using remote contractor signals (`Brazil`, `LATAM`, `contractor`, `EOR`, `nearshore`, `timezone overlap`) and suppresses listings with explicit international restrictions (`US only`, residency/citizenship requirements, on-site only)
- **Feed engagement mode** — auto-react and comment on LinkedIn feed posts based on content; smart reaction selection (Celebrate, Support, Insightful, Funny, Love) via keyword matching; scheduled recurring runs
- **Warmup-first feed learning** — first feed runs (default: 2) run in react+learn mode only (no comments) so thread patterns are learned before comment unlock
- **Feed warmup controls** — configurable warmup enable/disable, required run count (0-10), live progress indicator, and reset action in popup
- **Comment signal-aware thread gate** — “never first comment” now uses detected post comment counts (EN/PT labels + compact numbers) instead of only currently visible expanded comments
- **Thread context hydration** — before commenting, feed can open/load comment thread context (up to 2 batches) to reduce false low-context skips
- **Goal mode selector** — choose between `Networking & Visibility` (passive) and `Actively Looking` (more direct) to control hiring-post comment tone across Connect and Feed Engage
- **Never first-comment safeguard** — comment automation skips posts with zero detected comment signal to avoid starting threads
- **13 post categories** — hiring, achievement, technical, question, tips, story, news, humor, critique, motivation, project, jobseeking, newjob — each with dedicated comment templates
- **Smart comment generation** — category-aware follow-ups, post-length awareness (short posts get short comments), `{keyPhrase}` templates only when extractable, `{topic}` auto-detected from post content
- **Thread-style AI comments** — analyzes existing comments (sentiment, brevity, energy, common openers, emoji/question/exclamation style), extracts thread keywords/phrases, and mirrors the conversation vibe with original wording
- **Hiring tone safety rails** — hiring posts are forced to hiring category and blocked from humor/irony tone; comments avoid ambiguous or offensive phrasing
- **Context-aware tone engine** — combines post text, image cues, author title archetype, and reaction intensity/dominant reaction to make comments feel native to each post
- **PT-BR comments** — auto-detects Portuguese posts and generates conversational PT-BR comments with language-appropriate openers/follow-ups
- **Duplicate post guard** — persists engaged post URNs across sessions to avoid re-engaging the same posts
- **429 rate limit backoff** — detects failed sends, exponential backoff (30s, 60s, 120s... up to 5min) after 3 consecutive failures
- **Invite verification** — 4-layer defense against false positives: button state filtering, InMails modal handling, DOM pending state polling, and network API interception (catches LinkedIn's `FUSE_LIMIT_EXCEEDED` 429 responses)
- **Quota detection** — stops immediately and notifies when LinkedIn's weekly invitation limit is exhausted
- **Duplicate detection** — skips profiles already sent in previous runs via persistent URL tracking
- **Desktop notifications** — Chrome notification when automation completes or stops
- **Acceptance tracker** — check which sent invitations were accepted (cross-references connections page)
- **Connect-first progressive popup UX** — core run controls stay visible while `Refine Filters`, `Message`, `Automation`, and `Tools` panels are collapsed by default to reduce setup noise
- **Dashboard page** — stats overview with weekly/total/accepted counts and connection history log
- **Tabbed dashboard IA** — dashboard is split into `Overview`, `Activity`, `Feed`, `Nurture`, and `Logs` with persisted active tab state
- **Multi-query rotation** — scheduled runs cycle through multiple saved queries automatically
- **Recent profiles** — last 5 connection profiles shown inline in popup with avatar, name, headline, and status badge
- **Error resilience** — tab load timeout, script injection error handling, tab close detection with notifications
- **Human timing guardrails** — burst delays never reduce below the 500ms floor, preventing unrealistic timing spikes and test flakiness
- **Dark mode** — respects system `prefers-color-scheme` with GitHub-inspired dark palette
- **Activity chart** — 14-day bar chart on dashboard showing daily send volume
- **Feed analytics** — comment success rate, reaction breakdown chart, top reaction type, skip counts on dashboard
- **State persistence** — all settings saved via `chrome.storage.local`, survives popup close/reopen
- **UI layout persistence** — popup accordion states/tag search and dashboard active tab are restored between sessions
- **Custom query mode** — toggle between tag builder and manual query input
- **Auto-pagination** — navigates through search result pages automatically
- **Personalized notes** — extracts first name from invite modal and injects it via `{name}` template variable
- **Brazilian connect notes in PT-BR** — when profile cues indicate a Brazilian contact, Connect automatically switches the default invite note to Portuguese
- **PT-BR detection kept in More-menu connect** — when Connect is triggered from the card’s `More` menu, profile context is preserved so Brazilian contacts still receive Portuguese notes
- **Brazil search language lock** — when Recruiter Location/search geo targets Brazil, Connect enforces PT-BR invitation notes even for English-profile cards
- **Multi-company exclusion skip** — optional `Excluded Companies` filter skips Connect attempts when a profile headline matches any listed company (one per line)
- **Open-to-Work recruiter skip** — optional Connect safeguard skips recruiter-like profiles when explicit `Open to Work` signals are present on the card/profile
- **Job-seeking signal skip** — optional Connect filter skips profiles with explicit job-seeking signals (`actively looking`, `#opentowork`, `buscando oportunidades`, etc.)
- **Connect relevance scoring** — target ordering now prioritizes recruiter-like profiles, mutual connections, degree proximity, domain fit, and geo context for more precise outreach
- **Connect ranking runtime stability** — ranked-target logging now uses derived counters, preventing runtime `ReferenceError` interruptions during automation
- **Skip reason insights** — dashboard shows top skip reasons with counts (`open-to-work`, `same-company`, `duplicate`, etc.) for faster filter tuning
- **Context-first safe commenting v2** — AI comments now prioritize thread context before post text, enforce non-polemic/non-ironic output, and skip on low-confidence context
- **Hard comment pattern learning (v3)** — deterministic thread pattern analysis (top 15 comments with recency weighting) extracts opener/length/rhythm/intent/n-gram signals and constrains generation to match thread naturality
- **Persistent local pattern memory** — stores learned style buckets per `lang|category` in `chrome.storage.local` (`commentPatternMemoryV1`) with bounded EMA/decay maps for openers, n-grams, and intent
- **Pattern-fit gating + low-signal skip** — comments are skipped when thread pattern signal is weak or generated text breaks dominant thread style constraints
- **Balanced low-signal recovery** — after warmup, posts with real comment signal can still attempt safe AI/fallback comments even when visible-thread pattern confidence is low
- **Anti-copy comment hardening** — AI and fallback comments now run deterministic near-duplicate checks against visible thread comments, retry AI once on copy-risk, and skip with explicit `skip-copy-risk` diagnostics when originality is not met
- **Stranger-distance tone guard (career milestones)** — for `newjob`, `career`, and `achievement`, AI/fallback comments block overpersonal wording (`happy for you`, `orgulho de você`, `muito realizado`), retry AI once with stricter neutral wording, then skip with `skip-distance-risk` when needed
- **Comment skip telemetry** — feed comment decisions now log `skip-low-confidence`, `skip-safety-guard`, `skip-context-mismatch`, `skip-pattern-low-signal`, `skip-pattern-fit`, `skip-copy-risk`, and `skip-distance-risk` for faster prompt/filter calibration

### Standalone Connector
- **Playwright-based** — runs a full Chromium browser with persistent login session
- **Express API** — trigger automation via HTTP POST (`/api/linkedin/connect`)
- **n8n compatible** — includes workflow JSON for scheduled automation via n8n

## Installation

### Chrome Extension (from source)

<details>
<summary><strong>Step-by-step with screenshots</strong></summary>

#### 1. Download the extension

**Option A — Clone the repo:**
```bash
git clone https://github.com/LucasSantana-Dev/linkedin-engage.git
```

**Option B — Download a release:**
Go to [Releases](https://github.com/LucasSantana-Dev/linkedin-engage/releases), download the `.zip` file, and extract it.

#### 2. Open Chrome Extensions page

Navigate to `chrome://extensions/` in your Chrome browser.

#### 3. Enable Developer Mode

Toggle **Developer mode** in the top-right corner of the extensions page.

#### 4. Load the extension

Click **Load unpacked** and select the `extension/` folder (not the repo root).

> If you downloaded a release zip, select the extracted folder directly.

#### 5. Pin the extension

Click the puzzle icon in Chrome's toolbar and pin **LinkedIn Engage** for easy access.

#### 6. Configure and launch

1. Click the extension icon
2. Select an Area Preset (optional) and adjust search tags (Role, Industry, Market Focus, Level)
3. Choose a note template or write a custom message
4. Set your connection limit and recruiter region
5. Click **Launch Automation**

The extension opens a LinkedIn search tab and begins sending connection requests automatically.

</details>

### Standalone Connector (Playwright)

```bash
git clone https://github.com/LucasSantana-Dev/linkedin-engage.git
cd linkedin-engage
npm install
node linkedin-connector.js
```

In another terminal:
```bash
curl -X POST http://localhost:3000/api/linkedin/connect
```

> First run opens a browser window for manual LinkedIn login. The session is saved in `linkedin_session/` for subsequent runs.

### n8n Integration

Import `n8n-linkedin-workflow.json` into your n8n instance to schedule automated runs via webhook triggers.

## Architecture

```
extension/
  content.js        <- MAIN world automation (connect + engagement)
  company-follow.js <- MAIN world company follow automation
  jobs-assist.js    <- MAIN world jobs apply assistant (easy-apply prep, manual submit stop)
  feed-engage.js    <- MAIN world feed reaction/comment automation
  bridge.js         <- ISOLATED world messaging bridge (chrome.runtime <-> postMessage)
  background.js     <- Service worker (tab management, alarms, notifications)
  lib/
    invite-utils.js  <- Shared invite/connect utility functions
    feed-utils.js    <- Shared feed engagement utility functions
    search-templates.js <- Shared search template schema/compiler/resolver
    jobs-cache.js    <- Shared encrypted jobs profile cache helpers
    jobs-career-cache.js <- Shared encrypted jobs intelligence helpers
    jobs-career-intelligence.js <- Shared deterministic resume/profile analysis + jobs-plan generation
    jobs-utils.js    <- Shared jobs ranking and skip-rule helpers
    pattern-memory.js <- Shared pattern-memory bucket merge/guidance helpers
    feed-warmup.js   <- Shared feed warmup runtime/state helpers
    company-utils.js <- Shared company follow utility functions
    ui-layout.js     <- Shared popup/dashboard UI layout state helpers
  popup/            <- Settings UI (search builder, templates, filters, schedule)
  options.html      <- Dashboard page (stats, connection history)
  options.js        <- Dashboard logic
  manifest.json     <- Chrome MV3 manifest
linkedin-connector.js      <- Standalone Playwright version
n8n-linkedin-workflow.json <- n8n workflow for scheduled runs
.github/workflows/
  ci.yml        <- Jest test suite on push/PR to main
  release.yml   <- Auto-creates GitHub release + zip on version tags
```

### Key Technical Decisions

**Dual-world injection** — LinkedIn renders invite modals inside `about:blank` iframes. Content scripts in Chrome's default ISOLATED world cannot see these elements. The extension injects `content.js` in MAIN world (shares LinkedIn's JS context) and uses `bridge.js` in ISOLATED world for `chrome.runtime` messaging, connected via `window.postMessage`.

**Chrome-native locale catalogs** — UI copy is stored in `extension/_locales/*/messages.json` and resolved through `extension/lib/i18n.js`. Locale catalog keys stay underscore-only for Chrome/Brave compatibility, while dotted logical keys remain the application-level lookup contract. UI locale is global, while search locale is resolved independently per mode (`Connect`, `Companies`, `Jobs`).

**Cross-document querying** — `getAllDocuments()` collects the main `document` plus all same-origin iframe `contentDocument` objects. All element queries (`findInviteButtons`, `dismissModal`, etc.) search across all documents.

**Direct `aria-label` selectors** — LinkedIn's dense DOM (thousands of elements) makes text-based iteration unreliable. Direct CSS selectors like `button[aria-label="Add a note"]` are exact, fast, and unambiguous.

**React textarea bypass** — LinkedIn uses React's synthetic event system. Setting textarea values requires the native property descriptor setter (`HTMLTextAreaElement.prototype.value.set`) followed by dispatching `input` and `change` events.

**Network-first prioritization** — Profiles are sorted before processing: mutual connections first, then by connection degree (2nd > 3rd+). Email-required modals (3rd+ with no mutuals) are auto-dismissed.

## Search Tips

- LinkedIn basic search supports **one OR group max** — keep queries flat
- Keep operators explicit and uppercase (`AND`, `OR`, `NOT`) and quote
  multi-word terms
- Use the tag builder for most cases; switch to manual for advanced queries
- Set **Recruiter Location** to where the recruiter IS (US/EU), not where they hire from
- Add LATAM/Remote/Nearshore market tags to find recruiters who hire from Latin America

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| UI Language | Auto (Browser) | Extension-owned UI locale for popup, dashboard, notifications, and status copy (`auto`, `en`, `pt_BR`) |
| Limit | 50 | Max connection requests per run |
| Region | Global (US/CA/UK/DE/NL) | Geographic filter for search results |
| Connection Degree | 2nd + 3rd+ | Filter by connection degree (uses LinkedIn `network` param) |
| Actively Hiring | Off | Only show profiles with hiring badge |
| Engagement Only | Off | Visit profiles + follow instead of connecting |
| Send Note | On | Include personalized message |
| Template | General Networking | Pre-written note template (area-aware) |
| Weekly Limit | 150 | Max invites per week (auto-enforced) |
| Schedule | Off | Recurring runs every N hours (Chrome must be open) |
| Query Rotation | Empty | Multiple queries (one per line) cycled on each scheduled run |
| Area Preset | Custom | One-click role/industry targeting for 18 supported professional areas |
| Connect Usage Goal | recruiter_outreach | Template goal for Connect (`recruiter_outreach`, `peer_networking`, `decision_makers`, `brazil_focus`) |
| Connect Expected Results | balanced | Connect query strictness bucket (`precise`, `balanced`, `broad`) |
| Connect Search Language | auto | Query language strategy for Connect (`auto`, `en`, `pt_BR`, `bilingual`) |
| Connect Auto-select Template | On | Uses exact/family/default template fallback for Connect unless manual template is forced |
| Company Area Preset | Custom | Company-mode preset (`custom` + 7 creative presets) with default company search query and curated target-company defaults |
| Company Usage Goal | talent_watchlist | Template goal for Companies (`talent_watchlist`, `brand_watchlist`, `competitor_watch`) |
| Company Expected Results | balanced | Company query strictness bucket (`precise`, `balanced`, `broad`) |
| Company Search Language | auto | Query language strategy for Companies (`auto`, `en`, `pt_BR`, `bilingual`) |
| Company Auto-select Template | On | Uses exact/family/default template fallback for Companies unless manual template is forced |
| Company Query | Empty | Search term for company follow mode |
| Target Companies | Empty | Empty means follow all results; only explicit names (one per line) activate filtering. `Load defaults` is preset-aware and custom keeps LATAM defaults |
| Jobs Area Preset | Custom | Optional jobs ranking context preset (reuses area taxonomy from Connect) |
| Jobs Usage Goal | high_fit_easy_apply | Template goal for Jobs (`high_fit_easy_apply`, `market_scan`, `target_company_roles`) |
| Jobs Expected Results | balanced | Jobs query strictness bucket (`precise`, `balanced`, `broad`) |
| Jobs Search Language | auto | Query language strategy for Jobs (`auto`, `en`, `pt_BR`, `bilingual`) with `auto` preferring global English for offshore/international searches and Portuguese for Brazil-local searches |
| Jobs Auto-select Template | On | Uses exact/family/default template fallback for Jobs unless manual template is forced |
| Jobs Query | Empty | LinkedIn Jobs keywords query; if empty, inferred from role terms/preset |
| Jobs Use Career Intelligence | Off | Enables encrypted local resume/profile analysis for Jobs search generation and ranking |
| Jobs Keyword Terms | Empty | Extra hard-skill/domain keywords used for ranking and generated queries |
| Jobs Brazil Offshore Friendly | Off | Biases Jobs search/ranking toward remote employers that contract from Brazil/LATAM and filters strong international restrictions |
| Jobs Easy Apply Only | On | Restricts assistant to LinkedIn Easy Apply opportunities |
| Jobs Excluded Companies | Empty | Skips job cards whose company matches any excluded entry (one per line) |
| Jobs Profile Cache | Off | Optional encrypted local cache of structured applicant fields; if configured, Jobs start requires passphrase unlock and supports per-run form-field overrides |
| Feed React | On | React to feed posts (smart reaction based on content) |
| Feed Comment | Off | Comment on feed posts using templates |
| Departure-only Guard | On | If a post only announces leaving a company (no new role in same post), comments stay neutral and non-congratulatory |
| Enable Warmup Learning | On | For feed mode, force first N runs to react+learn only (no comments) |
| Warmup Runs Required | 2 | Number of learn-only feed runs before comments unlock (0-10) |
| Role Terms Limit | 6 | Maximum number of role tags included in the `OR` role query (1-10) to keep results precise |
| Skip Open to Work Recruiters | On | Skips recruiter-like profiles when explicit Open to Work signals are detected |
| Skip Job-seeking Signals | Off | Skips explicit job-seeking profiles/signals to reduce low-fit outreach |
| Goal Mode | Networking & Visibility | `passive` avoids job-seeking signals; `active` allows stronger hiring-post positioning |
| Comment Templates | Empty | One template per line; `{topic}` and `{excerpt}` are auto-replaced |
| Skip Keywords | Empty | Skip posts containing these words (one per line) |
| Excluded Companies | Empty | If set, skips connecting with profiles whose headline contains any listed company name |

## Troubleshooting Console Noise

- This extension now returns deterministic fallbacks for bridge/runtime callback failures (`bridge-runtime-error`) instead of leaving async channels open.
- Some console errors are external and not owned by this extension:
  - `net::ERR_BLOCKED_BY_CLIENT` from ad blockers/privacy extensions
  - `installHook.js` / vendor framework errors from third-party page scripts
  - Trusted Types/CSP warnings from page bundles
  - repeated `chrome-extension://invalid/...` fetch failures from other extensions
- Non-HTTP(S) fetches are bypassed by invite-status tracking instrumentation, so this extension does not instrument `chrome-extension://` resource checks.

## Releasing

Push a version tag to trigger the release workflow:

```bash
git tag v1.0.0
git push origin v1.0.0
```

This creates a GitHub Release with auto-generated release notes and a downloadable `linkedin-engage-v<version>.zip` asset.

If a previous tag release appears without assets, re-upload with:
```bash
gh release upload <tag> linkedin-engage-<tag>.zip --clobber
```

Workflows currently use `actions/checkout@v6` and `actions/setup-node@v6` for Node 24-ready GitHub Actions runtime compatibility.

Coverage policy is enforced in Jest for shared testable modules (`extension/lib/**`) with release gate minimums of `96%` statements / `85.7%` branches / `99%` functions / `97.5%` lines (see `jest.config.cjs`).

## Disclaimer

This tool is for personal networking purposes. Use responsibly and in accordance with LinkedIn's Terms of Service. Excessive automation may result in account restrictions. Recommended limits:

- **50-100 requests per day** max
- **Random delays** between actions (built-in)
- **Auto-backoff** on rate limits (429) — pauses 30-60s after 3 consecutive failures
- **Don't run 24/7** — simulate human behavior
- **Jobs mode requires manual final submit** — review each Easy Apply before submitting
- **Jobs mode may stop with `manual-input-required`** — complete missing required answers in the open Easy Apply modal; `Continue Manually` now focuses the existing Jobs tab instead of starting a new run

## License

[MIT](LICENSE)
