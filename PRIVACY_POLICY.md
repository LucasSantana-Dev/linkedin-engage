# Privacy Policy: LinkedIn Engage

**Last updated:** October 7, 2026

## What LinkedIn Engage Does

LinkedIn Engage is a Chrome extension for personal LinkedIn networking. It helps you build searches, send connection requests, follow companies and prepare job applications. All automation is started by you and runs locally in your browser.

## Data Stored Locally

All data stays on your device.

In `chrome.storage.local`:
- **Settings:** search tags, note templates, schedule preferences, limits and language
- **Sent profile URLs** of people you invited, used for deduplication
- **Stats and run history:** per-run counters, outcomes and logs shown in the dashboard
- **Rate-limit counters:** hourly, daily and weekly counts, cleaned automatically
- **Resume parse counters** (`resumeParseStats`): aggregate counts of how resume parsing went, with no resume content

In IndexedDB:
- **Resume cache:** if you import a resume for Jobs mode, the imported resume document is stored encrypted (AES-GCM, key derived with PBKDF2) on your device only.

### Data We Do NOT Collect
- Passwords, login credentials or session tokens
- Your LinkedIn messages, contacts or connection list
- Browsing activity outside LinkedIn
- Analytics or telemetry of any kind

## Network Activity

The extension communicates only with `linkedin.com`, as required for its automation. No data is sent to us or to any third-party service. We do not operate any backend servers or databases.

## Permissions Explained

| Permission | Why It's Needed |
|-----------|----------------|
| `activeTab` | Interact with the current LinkedIn tab |
| `storage` | Save settings, stats, run history and counters locally |
| `tabs` | Open and manage LinkedIn search and automation tabs |
| `scripting` | Inject automation scripts into LinkedIn pages |
| `alarms` | Schedule recurring automation runs |
| `notifications` | Notify you when automation completes or encounters errors |
| `https://www.linkedin.com/*` | Interact with LinkedIn pages for connections, company follows and jobs |

## Data Sharing

We do not sell, share or transfer any user data to third parties.

## Data Retention and Deletion

All data persists until you:
- Clear the extension's storage (via Chrome's extension management page)
- Uninstall the extension
- Reset data through the extension's dashboard

## Children's Privacy

This extension is not intended for use by children under 13. We do not knowingly collect data from children.

## Changes to This Policy

We may update this policy from time to time. Changes will be reflected in the "Last updated" date above.

## Contact

For questions about this privacy policy, open an issue at:
https://github.com/LucasSantana-Dev/linkedin-engage/issues
