# LinkedIn Engage

A Chrome Extension and standalone Playwright connector for automating LinkedIn networking — connections, company follows, and feed engagement.

## Features

### Chrome Extension
- **Tag-based search builder** — compose LinkedIn search queries by selecting Role, Industry, Market Focus, and Level tags
- **6 note templates** — Senior, Mid-Level, Junior, Tech Lead, General Networking, and Custom
- **300-char validation** — enforces LinkedIn's invitation note character limit
- **Smart prioritization** — profiles with mutual connections and closer network degree are processed first
- **Follow-to-Connect** — handles profiles showing "Follow" instead of "Connect" by opening the "More" menu to find the hidden Connect option
- **Connect mode follow fallback** — if a profile has only `Follow` and no `Connect` option, Connect mode follows the person instead of skipping
- **Already-connected suppression** — Connect mode ignores cards marked as `1st`/`1º grau`, preventing attempts on people who are already in your network
- **Email modal detection** — auto-skips profiles that require email verification (3rd+ degree with no mutuals)
- **LATAM recruiter targeting** — Market Focus tags (LATAM, Brazil, Nearshore, Remote) + configurable recruiter region selector
- **"Actively Hiring" filter** — leverages LinkedIn's undocumented `activelyHiring=true` URL parameter
- **Weekly limit guard** — tracks invites per week (150 max), blocks/adjusts when approaching limit
- **CAPTCHA detection** — auto-stops on security challenges (checkpoint, captcha, verification pages)
- **Connection log export** — download CSV of sent/skipped profiles with timestamps
- **Scheduled runs** — recurring automation via Chrome Alarms API (configurable interval)
- **Engagement mode** — visit profiles + follow as alternative when connect invites are exhausted; toggle in popup or auto-fallback on quota hit
- **Company follow mode** — searches each target company by name individually for high hit rate; 60 curated mid-size (150-500 employee) LATAM-hiring companies as defaults; scheduled recurring runs with batch rotation
- **Feed engagement mode** — auto-react and comment on LinkedIn feed posts based on content; smart reaction selection (Celebrate, Support, Insightful, Funny, Love) via keyword matching; scheduled recurring runs
- **Warmup-first feed learning** — first feed runs (default: 2) run in react+learn mode only (no comments) so thread patterns are learned before comment unlock
- **Feed warmup controls** — configurable warmup enable/disable, required run count (0-10), live progress indicator, and reset action in popup
- **Goal mode selector** — choose between `Networking & Visibility` (passive) and `Actively Looking` (more direct) to control hiring-post comment tone across Connect and Feed Engage
- **Never first-comment safeguard** — comment automation skips posts with zero existing comments to avoid starting threads
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
- **Dashboard page** — stats overview with weekly/total/accepted counts and connection history log
- **Multi-query rotation** — scheduled runs cycle through multiple saved queries automatically
- **Recent profiles** — last 5 connection profiles shown inline in popup with avatar, name, headline, and status badge
- **Error resilience** — tab load timeout, script injection error handling, tab close detection with notifications
- **Human timing guardrails** — burst delays never reduce below the 500ms floor, preventing unrealistic timing spikes and test flakiness
- **Dark mode** — respects system `prefers-color-scheme` with GitHub-inspired dark palette
- **Activity chart** — 14-day bar chart on dashboard showing daily send volume
- **Feed analytics** — comment success rate, reaction breakdown chart, top reaction type, skip counts on dashboard
- **State persistence** — all settings saved via `chrome.storage.local`, survives popup close/reopen
- **Custom query mode** — toggle between tag builder and manual query input
- **Auto-pagination** — navigates through search result pages automatically
- **Personalized notes** — extracts first name from invite modal and injects it via `{name}` template variable
- **Brazilian connect notes in PT-BR** — when profile cues indicate a Brazilian contact, Connect automatically switches the default invite note to Portuguese
- **PT-BR detection kept in More-menu connect** — when Connect is triggered from the card’s `More` menu, profile context is preserved so Brazilian contacts still receive Portuguese notes
- **Brazil search language lock** — when Recruiter Location/search geo targets Brazil, Connect enforces PT-BR invitation notes even for English-profile cards
- **Same-company recruiter skip** — optional `My Company` filter skips Connect attempts when a profile headline matches your current company
- **Open-to-Work recruiter skip** — optional Connect safeguard skips recruiter-like profiles when explicit `Open to Work` signals are present on the card/profile
- **Job-seeking signal skip** — optional Connect filter skips profiles with explicit job-seeking signals (`actively looking`, `#opentowork`, `buscando oportunidades`, etc.)
- **Connect relevance scoring** — target ordering now prioritizes recruiter-like profiles, mutual connections, degree proximity, domain fit, and geo context for more precise outreach
- **Connect ranking runtime stability** — ranked-target logging now uses derived counters, preventing runtime `ReferenceError` interruptions during automation
- **Skip reason insights** — dashboard shows top skip reasons with counts (`open-to-work`, `same-company`, `duplicate`, etc.) for faster filter tuning
- **Context-first safe commenting v2** — AI comments now prioritize thread context before post text, enforce non-polemic/non-ironic output, and skip on low-confidence context
- **Hard comment pattern learning (v3)** — deterministic thread pattern analysis (top 15 comments with recency weighting) extracts opener/length/rhythm/intent/n-gram signals and constrains generation to match thread naturality
- **Persistent local pattern memory** — stores learned style buckets per `lang|category` in `chrome.storage.local` (`commentPatternMemoryV1`) with bounded EMA/decay maps for openers, n-grams, and intent
- **Pattern-fit gating + low-signal skip** — comments are skipped when thread pattern signal is weak or generated text breaks dominant thread style constraints
- **Comment skip telemetry** — feed comment decisions now log `skip-low-confidence`, `skip-safety-guard`, `skip-context-mismatch`, `skip-pattern-low-signal`, and `skip-pattern-fit` for faster prompt/filter calibration

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
2. Select your search tags (Role, Industry, Market Focus, Level)
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
  feed-engage.js    <- MAIN world feed reaction/comment automation
  bridge.js         <- ISOLATED world messaging bridge (chrome.runtime <-> postMessage)
  background.js     <- Service worker (tab management, alarms, notifications)
  lib/
    invite-utils.js  <- Shared invite/connect utility functions
    feed-utils.js    <- Shared feed engagement utility functions
    pattern-memory.js <- Shared pattern-memory bucket merge/guidance helpers
    feed-warmup.js   <- Shared feed warmup runtime/state helpers
    company-utils.js <- Shared company follow utility functions
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

**Cross-document querying** — `getAllDocuments()` collects the main `document` plus all same-origin iframe `contentDocument` objects. All element queries (`findInviteButtons`, `dismissModal`, etc.) search across all documents.

**Direct `aria-label` selectors** — LinkedIn's dense DOM (thousands of elements) makes text-based iteration unreliable. Direct CSS selectors like `button[aria-label="Add a note"]` are exact, fast, and unambiguous.

**React textarea bypass** — LinkedIn uses React's synthetic event system. Setting textarea values requires the native property descriptor setter (`HTMLTextAreaElement.prototype.value.set`) followed by dispatching `input` and `change` events.

**Network-first prioritization** — Profiles are sorted before processing: mutual connections first, then by connection degree (2nd > 3rd+). Email-required modals (3rd+ with no mutuals) are auto-dismissed.

## Search Tips

- LinkedIn basic search supports **one OR group max** — keep queries flat
- Use the tag builder for most cases; switch to manual for advanced queries
- Set **Recruiter Location** to where the recruiter IS (US/EU), not where they hire from
- Add LATAM/Remote/Nearshore market tags to find recruiters who hire from Latin America

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| Limit | 50 | Max connection requests per run |
| Region | Global (US/CA/UK/DE/NL) | Geographic filter for search results |
| Connection Degree | 2nd + 3rd+ | Filter by connection degree (uses LinkedIn `network` param) |
| Actively Hiring | Off | Only show profiles with hiring badge |
| Engagement Only | Off | Visit profiles + follow instead of connecting |
| Send Note | On | Include personalized message |
| Template | Senior Engineer | Pre-written note template |
| Weekly Limit | 150 | Max invites per week (auto-enforced) |
| Schedule | Off | Recurring runs every N hours (Chrome must be open) |
| Query Rotation | Empty | Multiple queries (one per line) cycled on each scheduled run |
| Company Query | Empty | Search term for company follow mode |
| Target Companies | Empty | Only follow companies matching these names (one per line) |
| Feed React | On | React to feed posts (smart reaction based on content) |
| Feed Comment | Off | Comment on feed posts using templates |
| Enable Warmup Learning | On | For feed mode, force first N runs to react+learn only (no comments) |
| Warmup Runs Required | 2 | Number of learn-only feed runs before comments unlock (0-10) |
| Role Terms Limit | 6 | Maximum number of role tags included in the `OR` role query (1-10) to keep results precise |
| Skip Open to Work Recruiters | On | Skips recruiter-like profiles when explicit Open to Work signals are detected |
| Skip Job-seeking Signals | Off | Skips explicit job-seeking profiles/signals to reduce low-fit outreach |
| Goal Mode | Networking & Visibility | `passive` avoids job-seeking signals; `active` allows stronger hiring-post positioning |
| Comment Templates | Empty | One template per line; `{topic}` and `{excerpt}` are auto-replaced |
| Skip Keywords | Empty | Skip posts containing these words (one per line) |
| My Company | Empty | If set, skips connecting with profiles whose headline contains your company name |

## Releasing

Push a version tag to trigger the release workflow:

```bash
git tag v1.0.0
git push origin v1.0.0
```

This creates a GitHub Release with auto-generated release notes and a downloadable `extension.zip`.

## Disclaimer

This tool is for personal networking purposes. Use responsibly and in accordance with LinkedIn's Terms of Service. Excessive automation may result in account restrictions. Recommended limits:

- **50-100 requests per day** max
- **Random delays** between actions (built-in)
- **Auto-backoff** on rate limits (429) — pauses 30-60s after 3 consecutive failures
- **Don't run 24/7** — simulate human behavior

## License

[MIT](LICENSE)
