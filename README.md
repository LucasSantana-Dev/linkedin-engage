# LinkedIn Auto-Connect

A Chrome Extension and standalone Playwright connector for automating LinkedIn connection requests with personalized notes.

## Features

### Chrome Extension
- **Tag-based search builder** — compose LinkedIn search queries by selecting Role, Industry, Market Focus, and Level tags
- **6 note templates** — Senior, Mid-Level, Junior, Tech Lead, General Networking, and Custom
- **300-char validation** — enforces LinkedIn's invitation note character limit
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

## Architecture

```
extension/
  content.js    ← MAIN world automation (searches across iframes)
  bridge.js     ← ISOLATED world messaging bridge (chrome.runtime ↔ postMessage)
  background.js ← Service worker (tab creation, script injection)
  popup/        ← Settings UI (search builder, templates, filters)
  manifest.json ← MV3 manifest
linkedin-connector.js ← Standalone Playwright version
n8n-linkedin-workflow.json ← n8n workflow for scheduled runs
```

### Key Technical Decisions

**Dual-world injection** — LinkedIn renders invite modals inside `about:blank` iframes. Content scripts in Chrome's default ISOLATED world cannot see these elements. The extension injects `content.js` in MAIN world (shares LinkedIn's JS context) and uses `bridge.js` in ISOLATED world for `chrome.runtime` messaging, connected via `window.postMessage`.

**Cross-document querying** — `getAllDocuments()` collects the main `document` plus all same-origin iframe `contentDocument` objects. All element queries (`findInviteButtons`, `dismissModal`, etc.) search across all documents.

**Direct `aria-label` selectors** — LinkedIn's dense DOM (thousands of elements) makes text-based iteration unreliable. Direct CSS selectors like `button[aria-label="Add a note"]` are exact, fast, and unambiguous.

**React textarea bypass** — LinkedIn uses React's synthetic event system. Setting textarea values requires the native property descriptor setter (`HTMLTextAreaElement.prototype.value.set`) followed by dispatching `input` and `change` events.

## Installation

### Chrome Extension

1. Clone this repository
2. Open `chrome://extensions/` in Chrome
3. Enable "Developer mode" (top right toggle)
4. Click "Load unpacked" and select the `extension/` folder
5. The LinkedIn Auto-Connect icon appears in your toolbar

### Standalone Connector

```bash
npm install
node linkedin-connector.js
# In another terminal:
curl -X POST http://localhost:3000/api/linkedin/connect
```

> First run opens a browser window for manual LinkedIn login. The session is saved in `linkedin_session/` for subsequent runs.

## Usage

### Extension

1. Click the extension icon on any page
2. Select search tags or write a custom query
3. Choose a note template and customize if needed
4. Set connection limit and recruiter region
5. Click **Launch Automation**

The extension opens a new tab with the LinkedIn search results and begins sending connection requests.

### Search Tips

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

## Disclaimer

This tool is for personal networking purposes. Use responsibly and in accordance with LinkedIn's Terms of Service. Excessive automation may result in account restrictions. Recommended limits:

- **50-100 requests per day** max
- **Random delays** between actions (built-in)
- **Don't run 24/7** — simulate human behavior

## License

MIT
