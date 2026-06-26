# LinkedIn Engage

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)](https://developer.chrome.com/docs/extensions/mv3/)
[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Available-brightgreen)](https://chromewebstore.google.com/detail/linkedin-engage/naofclbmkhogidppkccoojdjhllmfcbh)

**AI-powered LinkedIn automation** — Generate personalized comments with Groq, automate connection requests, pre-fill job applications, and boost your networking — all with zero tracking.

[<img src="docs/media/chrome-webstore-badge.png" alt="Available in the Chrome Web Store" height="58"/>](https://chromewebstore.google.com/detail/linkedin-engage/naofclbmkhogidppkccoojdjhllmfcbh)

---

## What it does

| Mode | AI/Automation Features |
|------|------------------------|
| **Connect** | Search LinkedIn profiles, score candidates, generate personalized connection notes with area-aware templates |
| **Companies** | Batch-follow target companies by query or list; preset queues for creative/tech industries |
| **Jobs** | Rank Easy Apply listings by fit score; auto-fill forms from encrypted local profile cache; review before submit |
| **Feed** | Generate contextual comments on posts using AI + thread-context awareness; auto-react with category templates |

**Built-in guardrails:** Boolean search builder (EN/PT-BR), scheduled recurring runs, weekly quota guard (150 invites/week), CAPTCHA detection, background task management, and activity dashboard with charts.

---

## Installation

> **Requirements:** Google Chrome or Brave (desktop). No build step.

### Option A — Chrome Web Store (recommended)

[Install directly from the Chrome Web Store](https://chromewebstore.google.com/detail/linkedin-engage/naofclbmkhogidppkccoojdjhllmfcbh) — one click, automatic updates.

### Option B — Manual (load unpacked from a release zip)

#### Step 1 — Download the extension

Go to the [Releases page](https://github.com/LucasSantana-Dev/linkedin-engage/releases), download the latest `linkedin-engage-vX.Y.Z.zip`, and extract it anywhere on your computer.

#### Step 2 — Open the Extensions page

Type `brave://extensions` (Brave) or `chrome://extensions` (Chrome) in your address bar.

<img src="docs/media/install-step2-extensions-page.png" width="700" alt="Brave Extensions page"/>

#### Step 3 — Enable Developer Mode, then load the extension

Toggle **Developer mode** on (top-right corner). Three buttons appear — click **Load unpacked** and select the extracted folder (the one containing `manifest.json`).

<img src="docs/media/install-step3-developer-mode.png" width="700" alt="Developer mode ON — Load unpacked button visible"/>

#### Step 4 — Pin it and start

Click the puzzle piece icon in the toolbar, pin **LinkedIn Engage**, then open [linkedin.com](https://www.linkedin.com) and click the extension icon to open the popup.

<img src="docs/media/install-extensions-page.png" width="700" alt="Extension loaded and enabled"/>

---

## Configuration

### Groq API Key (for AI-powered comments and content generation)

LinkedIn Engage uses [Groq](https://groq.com) to generate personalized comments and connection notes in real-time. Set up is one-time:

1. **Get a free Groq API key:**
   - Go to [console.groq.com](https://console.groq.com)
   - Sign up (free tier available)
   - Copy your API key from the dashboard

2. **Add it to LinkedIn Engage:**
   - Open the extension popup on [linkedin.com](https://www.linkedin.com)
   - Go to **Settings** → **API Configuration**
   - Paste your Groq API key
   - Save

That's it — AI features are now active. No data is sent to external servers except your Groq API calls (which use your own API key).

---

## Screenshots

<table>
  <tr>
    <td align="center"><img src="docs/media/popup-connect.png" width="240" alt="Connect mode"/><br/><sub>Connect mode</sub></td>
    <td align="center"><img src="docs/media/popup-companies.png" width="240" alt="Companies mode"/><br/><sub>Companies mode</sub></td>
    <td align="center"><img src="docs/media/popup-feed.png" width="240" alt="Feed mode"/><br/><sub>Feed mode</sub></td>
    <td align="center"><img src="docs/media/popup-jobs.png" width="240" alt="Jobs mode"/><br/><sub>Jobs mode</sub></td>
  </tr>
</table>

<img src="docs/media/dashboard.png" width="900" alt="Dashboard — activity stats and charts"/>

---

## Updating

Download the new zip from the [Releases page](https://github.com/LucasSantana-Dev/linkedin-engage/releases), replace the old folder, then go to `brave://extensions` / `chrome://extensions` and click the reload button (↻) on the LinkedIn Engage card.

---

## Standalone Playwright connector

```bash
git clone https://github.com/LucasSantana-Dev/linkedin-engage.git
cd linkedin-engage && npm install
node linkedin-connector.js          # opens browser for first-time login
curl -X POST http://localhost:3000/api/linkedin/connect
```

Import `n8n-linkedin-workflow.json` into n8n for scheduled webhook-triggered runs.

---

## Responsible use

- **50–100 requests/day max** — built-in delays and human-timing guardrails apply automatically
- **Weekly invite cap** — enforced at 150; the extension stops and notifies when the limit is hit
- **Jobs mode requires manual final submit** — review each application before submitting
- **Auto-backoff on 429s** — pauses 30 s → 60 s → 120 s after consecutive failures

Use in accordance with [LinkedIn's Terms of Service](https://www.linkedin.com/legal/user-agreement). Excessive automation may result in account restrictions.

---

## Privacy & Permissions

LinkedIn Engage is intentionally minimal with permissions:

| Permission | Why it's needed |
|------------|-----------------|
| `activeTab` | Read the current LinkedIn page to extract post content and profiles |
| `storage` | Save your settings and quota counters locally (never uploaded) |
| `scripting` | Inject the automation logic on linkedin.com |
| `alarms` | Run scheduled automation sessions in the background |

**What LinkedIn Engage does NOT do:**
- ✓ No data sent to external servers (except your own Groq API calls with your API key)
- ✓ No access to your messages, contacts, or connection list
- ✓ No analytics or telemetry
- ✓ Fully open-source — read the code: [github.com/LucasSantana-Dev/linkedin-engage](https://github.com/LucasSantana-Dev/linkedin-engage)

---

## Tech Stack

- **Frontend:** TypeScript, React (popup UI)
- **Runtime:** Chrome Extension (Manifest V3)
- **AI:** Groq API for comment generation and context analysis
- **Bundler:** Webpack
- **Background Tasks:** Service Workers
- **Storage:** Chrome local storage (encrypted)
- **Build:** Node.js, npm

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for the full feature and fix history.

---

## License

[MIT](LICENSE)
