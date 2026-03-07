# LinkedIn Auto-Connect

A Chrome Extension and standalone Playwright connector for automating LinkedIn connection requests with personalized notes.

## Features

### Chrome Extension
- **Tag-based search builder** — compose LinkedIn search queries by selecting Role, Industry, Market Focus, and Level tags
- **6 note templates** — Senior, Mid-Level, Junior, Tech Lead, General Networking, and Custom
- **300-char validation** — enforces LinkedIn's invitation note character limit
- **Smart prioritization** — profiles with mutual connections and closer network degree are processed first
- **Follow-to-Connect** — handles profiles showing "Follow" instead of "Connect" by opening the "More" menu to find the hidden Connect option
- **Email modal detection** — auto-skips profiles that require email verification (3rd+ degree with no mutuals)
- **LATAM recruiter targeting** — Market Focus tags (LATAM, Brazil, Nearshore, Remote) + configurable recruiter region selector
- **"Actively Hiring" filter** — leverages LinkedIn's undocumented `activelyHiring=true` URL parameter
- **State persistence** — all settings saved via `chrome.storage.local`, survives popup close/reopen
- **Custom query mode** — toggle between tag builder and manual query input
- **Auto-pagination** — navigates through search result pages automatically
- **Personalized notes** — extracts first name from invite modal and injects it via `{name}` template variable

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
git clone https://github.com/LucasSantana-Dev/linkedin-auto-connect.git
```

**Option B — Download a release:**
Go to [Releases](https://github.com/LucasSantana-Dev/linkedin-auto-connect/releases), download the `.zip` file, and extract it.

#### 2. Open Chrome Extensions page

Navigate to `chrome://extensions/` in your Chrome browser.

#### 3. Enable Developer Mode

Toggle **Developer mode** in the top-right corner of the extensions page.

#### 4. Load the extension

Click **Load unpacked** and select the `extension/` folder (not the repo root).

> If you downloaded a release zip, select the extracted folder directly.

#### 5. Pin the extension

Click the puzzle icon in Chrome's toolbar and pin **LinkedIn Auto-Connect** for easy access.

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
git clone https://github.com/LucasSantana-Dev/linkedin-auto-connect.git
cd linkedin-auto-connect
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
  content.js    <- MAIN world automation (cross-iframe DOM queries)
  bridge.js     <- ISOLATED world messaging bridge (chrome.runtime <-> postMessage)
  background.js <- Service worker (tab creation, dual-world script injection)
  popup/        <- Settings UI (search builder, templates, filters)
  manifest.json <- Chrome MV3 manifest
linkedin-connector.js      <- Standalone Playwright version
n8n-linkedin-workflow.json <- n8n workflow for scheduled runs
.github/workflows/
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
| Actively Hiring | Off | Only show profiles with hiring badge |
| Send Note | On | Include personalized message |
| Template | Senior Engineer | Pre-written note template |

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
- **Don't run 24/7** — simulate human behavior

## License

[MIT](LICENSE)
