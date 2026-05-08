# In-Progress Task — 2026-05-06 GMT-3

## Task
Idle — session complete. Feed/nurture removal shipped.

## Completed This Session
- **v1.37.0**: Removed feed engagement + nurture features (LinkedIn ToS violation)
  - 43 files changed, 12,533 lines deleted
  - Deleted: extension/feed-engage.js, all extension/lib/feed-*.js, extension/lib/nurture.js, 11 test files
  - Cleaned: background.js, bridge.js, content.js, options.js, popup.js, popup.html, privacy.html, all lib files
  - Tests: 1486 passing, 46 suites
- **CI fix**: `secrets.*` invalid in job-level `if:` — replaced with step-level skip guard in release.yml
- Tag v1.37.0 pushed; Chrome Web Store publish triggered (secrets added by user)

## Current HEAD
- Branch: `main`
- HEAD: `aa9cd6f` — fix(ci): replace invalid secrets job-if with step-level skip guard
- Version: `v1.37.0`
- Uncommitted: only `.agents/memory/`, `.claudeignore`, `.serena/` (non-repo tooling)

## Next Steps
1. **Boolean search fix**: Add NOT filters for influencer keywords in connect search builder; use `currentJobFunction=["2"]` URL param to filter recruiters (research already done — ready to implement)
2. Check Chrome Web Store publish result for v1.37.0

## Branch
main (trunk-based)
