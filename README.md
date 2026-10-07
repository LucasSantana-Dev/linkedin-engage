# LinkedIn Engage

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)](https://developer.chrome.com/docs/extensions/mv3/)

A Chrome/Brave extension (Manifest V3) for personal LinkedIn networking: build Boolean searches, send connection requests with notes, follow companies, and get help with Easy Apply job applications. Everything runs locally in your browser. No backend, no analytics, no third-party API.

Personal use only. It is distributed as a GitHub release zip, not through the Chrome Web Store.

---

## What it does

| Mode | Features |
|------|----------|
| **Connect** | Boolean search builder (EN/PT-BR, 19 area presets), candidate scoring, connection invites with area-aware notes |
| **Companies** | Batch-follow target companies by query or list, with preset queues |
| **Jobs** | Rank Easy Apply listings by fit score, pre-fill forms from an encrypted local resume cache, never submits for you |

Also built in: scheduled recurring runs, rate limits (hourly, daily, weekly cap of 100 invites), CAPTCHA/security-challenge detection that stops the run, background task management, and an activity dashboard with stats, history and logs.

---

## Installation

> **Requirements:** Google Chrome or Brave (desktop). No build step.

### Option A: download a release zip

1. Open the [Releases page](https://github.com/LucasSantana-Dev/linkedin-engage/releases), download the latest `linkedin-engage-vX.Y.Z.zip` and extract it.
2. Open `chrome://extensions` (Chrome) or `brave://extensions` (Brave).

<img src="docs/media/install-step2-extensions-page.png" width="700" alt="Extensions page"/>

3. Turn on **Developer mode** (top-right), click **Load unpacked** and select the extracted folder (the one containing `manifest.json`).

<img src="docs/media/install-step3-developer-mode.png" width="700" alt="Developer mode on, Load unpacked button visible"/>

4. Pin **LinkedIn Engage** from the puzzle piece menu, open [linkedin.com](https://www.linkedin.com) and click the extension icon.

<img src="docs/media/install-extensions-page.png" width="700" alt="Extension loaded and enabled"/>

### Option B: clone the repository

```bash
git clone https://github.com/LucasSantana-Dev/linkedin-engage.git
```

Then follow steps 2 to 4 above and select the `extension/` folder with **Load unpacked**.

### Updating

Download the new zip (or `git pull`), then click the reload button on the LinkedIn Engage card in the extensions page.

---

## Screenshots

<table>
  <tr>
    <td align="center"><img src="docs/media/popup-connect.png" width="240" alt="Connect mode"/><br/><sub>Connect</sub></td>
    <td align="center"><img src="docs/media/popup-companies.png" width="240" alt="Companies mode"/><br/><sub>Companies</sub></td>
    <td align="center"><img src="docs/media/popup-jobs.png" width="240" alt="Jobs mode"/><br/><sub>Jobs</sub></td>
  </tr>
</table>

<img src="docs/media/dashboard.png" width="900" alt="Dashboard with activity stats and charts"/>

---

## Responsible use

- Built-in delays and human-like timing apply automatically; keep daily volume modest.
- The weekly invite cap is 100 (daily 40, hourly 12). The extension stops and notifies you when it is reached.
- Low acceptance throttle: once at least 30 invites are verified sent and fewer than 20% were accepted (use "check accepted" on the dashboard to refresh), the Connect daily limit is halved until the rate is back to 20%. A warning shows in the popup and on the dashboard.
- Warm-up preset (opt-in, popup toggle): Connect is limited to 10 invites per day in week 1, 20 in week 2 and 30 in week 3, counted from when you enable it. After three weeks the normal limits apply.
- Jobs mode never submits an application. You review and submit each one yourself.
- A CAPTCHA or security challenge stops the run so you can solve it manually.

Use in accordance with [LinkedIn's User Agreement](https://www.linkedin.com/legal/user-agreement). Automation may result in account restrictions.

---

## Permissions and privacy

| Permission | Why it is needed |
|------------|------------------|
| `activeTab` | Interact with the current LinkedIn tab |
| `storage` | Save settings, stats, run history and quota counters locally |
| `tabs` | Open and manage LinkedIn search and automation tabs |
| `scripting` | Inject the automation scripts into LinkedIn pages |
| `alarms` | Run scheduled sessions in the background |
| `notifications` | Tell you when a run finishes or hits an error |
| Host `https://www.linkedin.com/*` | Interact with LinkedIn pages |

No data leaves your browser. The extension talks only to linkedin.com, has no analytics or telemetry, and sends nothing to any other server. See [PRIVACY_POLICY.md](PRIVACY_POLICY.md).

---

## Development

Plain JavaScript, no bundler. Pure-logic modules live in `extension/lib/` and are tested in Node with Jest.

```bash
npm install
npm run lint
npm run typecheck
npm test
```

See [CLAUDE.md](CLAUDE.md) for architecture and conventions.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## License

[MIT](LICENSE)
