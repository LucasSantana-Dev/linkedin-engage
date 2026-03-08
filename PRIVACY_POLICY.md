# Privacy Policy — LinkedIn Engage

**Last updated:** March 8, 2026

## What LinkedIn Engage Does

LinkedIn Engage is a Chrome extension that helps you network on LinkedIn by automating connection requests, company follows, and feed engagement (reactions and comments). All automation is user-initiated and runs locally in your browser.

## Data Collection

### Data We Collect Locally
- **LinkedIn profile URLs and names** of profiles you interact with (connection log)
- **Engagement history** — which posts you've reacted to or commented on (URN tracking)
- **Extension settings** — search tags, note templates, schedule preferences, limits
- **Feed analytics** — reaction counts, comment success rates, category breakdowns

### Data We Do NOT Collect
- We do not collect passwords or login credentials
- We do not collect data from other users' profiles beyond what is visible in your feed
- We do not track browsing activity outside of LinkedIn
- We do not collect personally identifiable information for analytics

## Data Storage

All data is stored **locally on your device** using Chrome's `chrome.storage.local` API. No data is sent to our servers. We do not operate any backend servers or databases.

## Third-Party Services

### Groq API (Optional)
If you enable AI-powered comment generation, your extension sends the following to the Groq API (`api.groq.com`):
- The text of the LinkedIn post you are commenting on
- Existing comments on that post (text only, no profile data)
- The detected language (English or Portuguese)

This feature requires you to provide your own Groq API key. We do not provide, store, or have access to your API key beyond your local browser storage.

No other third-party services receive data from the extension.

## Permissions Explained

| Permission | Why It's Needed |
|-----------|----------------|
| `activeTab` | Access the current LinkedIn tab to read posts and interact with the page |
| `storage` | Save your settings, connection log, and engagement history locally |
| `tabs` | Open LinkedIn search tabs and manage automation tabs |
| `scripting` | Inject automation scripts into LinkedIn pages |
| `alarms` | Schedule recurring automation runs |
| `notifications` | Notify you when automation completes or encounters errors |
| `linkedin.com` | Interact with LinkedIn pages for connections, follows, and feed engagement |
| `api.groq.com` | Send post text to Groq API for AI comment generation (optional, user-provided key) |

## Data Sharing

We do not sell, share, or transfer any user data to third parties. The only external data transmission is the optional Groq API integration described above, which is initiated by the user and uses their own API key.

## Data Retention and Deletion

All data is stored locally and persists until you:
- Clear the extension's storage (via Chrome's extension management page)
- Uninstall the extension
- Manually clear specific data through the extension's dashboard

## Children's Privacy

This extension is not intended for use by children under 13. We do not knowingly collect data from children.

## Changes to This Policy

We may update this privacy policy from time to time. Changes will be reflected in the "Last updated" date above.

## Contact

For questions about this privacy policy, open an issue at:
https://github.com/LucasSantana-Dev/linkedin-engage/issues
