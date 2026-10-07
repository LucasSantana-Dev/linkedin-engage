# In-page footprint

Issue: #240.

## Context

In March 2026 LinkedIn was reported ("BrowserGate") to probe for installed
extensions in two ways: fetching `chrome-extension://<id>/<file>` for known
extension ids and file names, and scanning the page for `chrome-extension://`
strings. Anything an extension injects into the LinkedIn page (DOM ids,
classes, globals, resource URLs) is observable by page scripts.

This extension already exposes no `web_accessible_resources`, so id probing by
fetch fails. Keep it that way: never add `web_accessible_resources`.

## Done in #240

- `extension/lib/ui-notify.js`: the notification container id was the fixed
  string `linkedin-engage-notify-container`, bars used `le-notify-N` ids and
  the action button used `data-le-action`. All of them now derive from a random
  per-page token (`n` + 16 hex chars from `crypto.getRandomValues`, with a
  `Math.random` fallback). Re-injecting the script into the same page reuses the
  token (the hoisted global keeps the earlier value), so the container is
  reused, not duplicated.
- Removed the unused `tabs` permission (every URL read targets linkedin.com
  tabs, covered by the host permission). Less permission surface to describe.
- Audit: no extension code writes `chrome-extension://` or
  `chrome.runtime.getURL()` results into the LinkedIn DOM. The only
  `getURL` uses are `lib/i18n.js` (fetch of locale catalogs, extension pages and
  service worker) and `lib/jobs-career-parser.js` (adds a script tag for
  `vendor/mammoth.browser.min.js`, loaded only by `popup/popup.html`, an
  extension page).
- No other MAIN-world file creates DOM nodes with fixed ids or classes
  (`content.js` and `jobs-assist.js` were out of scope for this pass, see
  follow-up).

## Globals left on `window` in the LinkedIn page

MAIN-world injected scripts (by `background.js`):

- Connect: `lib/ui-notify.js`, `lib/search-no-results.js`,
  `lib/invite-utils.js`, `lib/invite-note.js`, `lib/human-behavior.js`,
  `lib/connect-action-utils.js`, `content.js`
- Companies: `lib/ui-notify.js`, `lib/search-no-results.js`,
  `lib/company-utils.js`, `lib/human-behavior.js`, `company-follow.js`
- Jobs: `lib/ui-notify.js`, `lib/jobs-utils.js`, `jobs-assist.js`
- Withdraw invites: `lib/ui-notify.js`, `lib/human-behavior.js`,
  `lib/invite-withdraw.js`, `withdraw-invites.js`

`bridge.js` and `search-filter.js` run in the ISOLATED world and leave nothing
on the page `window`.

| Global | Set by | Used by other scripts | Proposal |
|---|---|---|---|
| `linkedInAutoConnectInjected` | `content.js` | Idempotency guard only | Fold into the shared namespace |
| `linkedInCompanyFollowInjected` | `company-follow.js` | Guard only | Same |
| `linkedInJobsAssistInjected` | `jobs-assist.js` | Guard only | Same |
| `linkedInWithdrawInvitesInjected` | `withdraw-invites.js` | Guard only | Same |
| `LinkedInInviteNote`, `LinkedInConnectActionUtils`, `LinkedInCompanyUtils`, `LinkedInJobsUtils`, `LinkedInInviteWithdraw` (UMD namespaces) | the matching `lib/*.js` | Yes: the entry scripts read them | Move under the shared namespace |
| Mirrored UMD function names (each key of the API object copied to `window` when free) | the same UMD wrapper | Yes: entry scripts call them bare | Stop mirroring in MAIN, destructure from the namespace |
| `isButtonClickable`, `isConnectButtonText`, `isPendingState` ... (about 23 functions) | `lib/invite-utils.js` (plain top-level functions) | Yes: `content.js` | Wrap in an IIFE or UMD, export to the namespace |
| `humanDelay`, `actionDelay`, `typingDelay`, `gaussianRandom` ... (12 functions) | `lib/human-behavior.js` | Yes: all entry scripts | Same |
| `normalizeCompanyName`, `findCompanyCards`, `detectChallenge` ... (about 25 functions) | `lib/company-utils.js` (UMD plus top-level functions) | Yes: `company-follow.js` | Same |
| `detectNoSearchResults` | `lib/search-no-results.js` | Yes: connect, company | Same |
| `uiNotifyRandomToken`, `UI_NOTIFY_*`, `getNotifyContainer`, `showTopNotification`, `dismissTopNotification`, `clearAllTopNotifications` | `lib/ui-notify.js` (top-level `var`/`function`) | Yes: all entry scripts | Same; `UI_NOTIFY_CONTAINER_ID` must stay a global string until the namespace exists, it carries the reuse token |
| Function declarations inside the `if (!injected) { ... }` blocks of the entry scripts | `content.js`, `company-follow.js`, `jobs-assist.js`, `withdraw-invites.js` | No | Verify with `Object.keys(window)` diff in a real page; sloppy-mode block functions can leak |

## Follow-up proposal (not in #240)

1. One namespace object under a per-page random key, for example
   `window[Symbol.for(token)]` is not usable because Symbols are enumerable via
   `Object.getOwnPropertySymbols`; prefer a closure plus a non-enumerable
   property defined with `Object.defineProperty(window, randomKey, { value })`
   created by the first injected script and looked up by a key passed through
   `executeScript({ args })`.
2. Wrap every MAIN-world lib in an IIFE that registers its API on that object
   and no longer mirrors names onto `window`.
3. Replace the four `*Injected` flags with a lookup on the namespace.
4. This touches `content.js` and `jobs-assist.js`, which were being refactored
   in #239B, so it should land after that work. Tests that `require()` the libs
   keep working because the Node export path stays.
5. Verify in a real LinkedIn tab with a before/after `Object.keys(window)` diff.

Issue #240 is closed by the changes above; item 1 to 5 stay as the follow-up.
