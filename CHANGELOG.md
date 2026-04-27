# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [1.36.23] - 2026-04-27

### Performance
- **Outer button scan scoped to `<main>`** (#83): connect-mode poll loop in `extension/content.js` now queries `document.querySelector('main')?.querySelectorAll('button:enabled, a')` with fallback to `document` when the landmark is absent. The previous full-document scan revisited every button in the global header, nav, messaging overlay, and toaster on each 3-second poll. Strict narrowing — the scanner already rejected out-of-main buttons via `isButtonClickable` / `shouldExcludeButton` filters, so no behavior change in normal cases.
- **`customQueryInput` live preview debounced to 150ms** (#84): the custom-query textarea fired `updateQueryPreview()` + `saveState()` on every keystroke. Both can hit the search-template plan path and write to `chrome.storage.local`. Wrapped in the same 150ms debounce already used by `excludeKeywordsInput` / `yearsMin` / `yearsMax`.

### Internal
- **`popupState` extracted to `extension/lib/popup-state.js`** (#85, #86): UMD module, frozen `DEFAULT_POPUP_STATE`, `loadPopupState(migrate)` and `savePopupState(state, uiLanguageMode)` helpers. 12 contract tests lock the public API. Phase 2 swapped `loadState()` / `saveState()` call sites in `extension/popup/popup.js` to use the new module; the inline migration block is removed. -22/+10 LOC in popup.js.
- **lkdDebug-gated launch breadcrumb** (#81): `logLaunchBreadcrumb` in `extension/background.js` `launchAutomation`. Off by default. Toggle per-machine via `chrome.storage.local.set({ lkdDebug: true })` in the SW console; logs `{rawQuery, searchKeywords, searchUrl, geoUrn, networkFilter, areaPreset, goalMode, templateId, usageGoal, operatorCount, compiledQueryLength, followFallback, followFirstMode, relaxAttempt, excludeKeywordsCount}` once per launch. No user-facing output.
- **`capture-linkedin-card` skill doc** (#82): `.agents/skills/capture-linkedin-card/SKILL.md` documents the workflow + sanitization checklist for replacing hand-authored fixtures in `tests/fixtures/linkedin-cards/` with sanitized real captures.

## [1.36.22] - 2026-04-25

### Fixed
- **User-selected chips silently trimmed by template-default budget** (#77): `mergeGroupTerms` concatenated template defaults first, then user selections, before piping the merged list into `compileBooleanQuery`. Two effects worked against user intent: `uniqueNormalized` keeps the first occurrence on dedupe (so a template-default form of a term won over a user-typed variant), and `trimShouldByBudget` pops from the **tail** when over the 12-operator budget (so user selections were trimmed first while busy templates' defaults were preserved). Surfaced during PR #72 testing — with `connect.tech.peer_networking.balanced`, a user clicking `Intern` got a query containing `mid-level` and `senior` (template) but not `intern` (user). Single-line swap in `mergeGroupTerms`: user selections now lead. Effects: dedupe favors user-typed term, budget trim drops template defaults first, and `groupTerms.role.slice(0, roleLimit)` now keeps user-selected roles even when `roleTermsLimit` is small. Three regression cases lock the precedence at index 0 for level / industry / role.

### Internal
- **Pre-commit credential-pattern scan** (#76): `scripts/install-hooks.sh` now also installs a `pre-commit` hook that scans staged additions for JWT (`eyJ`...), Google API (`AIza`...), OpenAI (`sk-`...), and LinkedIn `li_at` cookie patterns. Bypassable with `git commit --no-verify`. Existing pre-push gate (lint/typecheck/test) untouched.
- **`INTENT_PRESETS` extracted to `extension/lib/intent-presets.js`** (#74): UMD module, frozen. Six contract assertions in `tests/intent-presets.test.js` lock `areaPreset` ⊂ `AREA_PRESETS`, `usageGoal` ⊂ `MODE_USAGE_GOALS.connect`, `expectedResults` ⊂ `EXPECTED_RESULTS_BUCKETS`, `language` ⊂ `SEARCH_LANGUAGE_MODES`, `goalMode` ∈ {`passive`, `active`}, dict frozen.

### Documentation
- **README catch-up for v1.36.17–21 features** (#75): added bullets for intent preset picker, recruiter preset family, seniority chips, Work Mode group, exclude-keywords filter, years-of-experience range, live Boolean preview, profile-view walker, and follow-fallback / follow-first toggles. Corrected the Releasing section's coverage threshold figures (was `80% / 80%`, actual is `96% / 85.7% / 99% / 97.5%` per `jest.config.cjs`).

## [1.36.21] - 2026-04-25

### Added
- **Seniority chips and Work Mode filter group with EN/PT-BR localization** (#72): Added `Intern` and `Associate` chips to the Connect "Level They Hire" group (now covers intern → staff). New "Work Mode" tag group with `Remote` / `On-site` / `Hybrid`. Both groups are area-agnostic — they compose with any area preset (tech, design, regulated engineering, business). New `TERM_VARIANTS` for `junior`, `staff`, `intern`, `associate`, `on-site` with PT-BR variants (`estagiário`/`estágio`, `assistente`, `presencial`, `engenheiro staff`, `júnior`). The existing Search Language selector localizes them automatically. No `STATE_TAG_VERSION` bump — additive change to existing groups.

### Fixed
- **Standalone Boolean operators in `excludeKeywords` produced malformed queries** (#71): A user typing `AND`/`OR`/`NOT` (case-insensitive) into the exclude-keywords input added in v1.36.17 produced `NOT AND` / `NOT OR` / `NOT NOT` in the final clause string. `getExcludeKeywordsTerms()` forwarded the raw token to `compileBooleanQuery`'s `mustNot` bucket, and the existing `sanitizeBooleanTerm` preserved standalone operators as uppercase. Fixed at the compile boundary in `extension/lib/search-templates.js` — after the sanitize map, filter `^(AND|OR|NOT)$` tokens out of `should`/`must`/`mustNot`. All callers benefit (popup free-text, template-defined excludes, future callers); `sanitizeBooleanTerm`'s contract unchanged.

## [1.36.20] - 2026-04-25

### Fixed
- **MV3 message-channel-closed warnings on every completion** (#69): `chrome.runtime.sendMessage` returns a Promise in MV3 when no callback is given. The six fire-and-forget bridge → background dispatches in `extension/bridge.js` never attached a `.catch`, so when the popup closed mid-flight (or the service worker idled) the rejection bubbled to Chrome's unhandled-promise warning. New `safeSend(payload)` helper attaches a no-op `.catch` and wraps in try/catch for the extension-reload race; replaces all six callsites.

### Internal
- **No-vuln baseline restored** (#68): `npm audit` now reports 0 vulnerabilities. Cleared `@xmldom/xmldom` DoS + XML-injection (transitive via `mammoth`) and `picomatch` ReDoS. Lockfile-only — no shipped extension code change.

## [1.36.19] - 2026-04-24

### Fixed
- **Follow-fallback silently skipped every card with a screen-reader "connect" hint** (#65): `cardHasExplicitConnect` matched any span containing the word `connect`, including screen-reader text like "View profile and connect with them". Tightened to actionable `button, a` only, exact `/^(connect|conectar)$/` text match (or short "Connect X" labels), and stricter `invite … to connect` aria patterns. Disabled buttons are ignored.
- **Boolean query demolished at URL-build time** (#65): `buildConnectSearchKeywords` was stripping OR/AND/NOT operators, quotes, and parens before sending the search URL — turning recruiter presets' Boolean templates into plain space-separated keywords. Boolean syntax now passes through verbatim; plain-text queries still get the word-cap sanitization.

### Changed
- **Preset intent picker** (#65): new top-level `intentPresetSelect` with nine curated intents (Recruiters — Tech / Senior / Remote / Startup / Agency / Brasil / Design; Peer networking — Tech; Tech decision-makers; Custom). Selecting one cascades area preset, usage goal, expected results, search language, goal mode, and auto-template. The previous seven search-builder sub-controls moved into a collapsed "Advanced search settings" accordion.
- **Popup IA redesign** (#65): single 13-control Audience Filters accordion replaced with Compiled query (prominent), Exclusions, Audience filters, and Automation behavior sections. Every element id preserved; popup.js wiring untouched.

## [1.36.18] - 2026-04-24

### Fixed
- **Follow-when-no-Connect not firing on live LinkedIn search** (#63): the follow-card pass used selectors that no longer match LinkedIn's current DOM, and the fallback text matcher required exact `"Follow"`/`"Seguir"` so it silently skipped the `"+ Follow"` button label. Introduced `isFollowActionTextPermissive` (strips `+ ` prefix, word-start match), broadened the follow-card selector to include `[data-chameleon-result-urn]` and `search-entity-result-universal-template`, and added a final button-first follow scan that works independently of card class.
- **Duplicate search tab on relaxed retry** (#63): when a run returned zero targets, `launchAutomation(relaxedConfig)` opened a new tab without closing the old one, leaving two automation loops running in parallel against the same account. Background now fires a `chrome.tabs.remove` on the stale tab before launching the retry.

## [1.36.17] - 2026-04-24

### Added
- **Follow-fallback and follow-first toggles for people search** (#58): `followFallbackCheckbox` (default on) makes follow the explicit action when LinkedIn hides the Connect button; `followFirstModeCheckbox` prefers follow over connect when both are visible; `followMaxInput` caps follows per run. State persists in `popupState.follow*`; flags flow popup → background → content.
- **Recruiter preset family** (#59): six new people-search presets (`recruiter-tech-general`, `-senior`, `-remote-global`, `-startup-saas`, `-agency`, `-brazil`) grouped under a "Recruiters" optgroup. Each bundles role/industry tags, a research-backed Boolean template via new `getAreaPresetDefaultQuery`, and auto-sets `connectUsageGoal='recruiter_outreach'` on selection.
- **Exclude-keywords, years-of-experience range, and live Boolean preview** (#60): `excludeKeywordsInput` threads into `buildConnectQueryPlan` as `mustNot[]`, producing `NOT term` segments; `yearsMin`/`yearsMax` filter cards client-side in `runAutomation` with a `skipped-years-range` log reason; `booleanPreviewPre` renders the compiled query live (150 ms debounce) on every tag, preset, or exclude-keyword change.
- **Profile-view walker for passive-inbound signal** (#61): opt-in "Passive visibility" section drives the "people viewed your profile" counter by opening LinkedIn profiles in background tabs with 6–10s dwell and jitter. New `extension/lib/profile-visitor.js` with dependency-injected `runProfileWalk`; per-day counter at `profileWalkCount_YYYY_MM_DD` (auto-rollover); clamped `dailyTarget` to [0,50], `perMinuteMax` throttle; respects `shouldStop`, `isDailyCapReached`, `isChallengeDetected`.

### Fixed
- **Offshore query sanitization, multiline split, and target deduplication** (#56): hardened companies-mode offshore-hiring intent detection.

### Changed
- **Jobs-career-parser pdfjs loader is now injectable** (#57): `_setPdfJsLoader(fn)` seam lets tests swap in a CJS fake, removing the `file://` ESM workaround. New `tests/fixtures/fake-pdfjs.cjs` drives the jobs-career-parser coverage path in Node Jest.

## [1.36.16] - 2026-03-28

### Fixed
- **Companies tech preset simplification and normalization**: Reduced Companies mode tech selector surface to the generic `tech` preset and normalized legacy `tech-*` values to `tech` across popup launch payloads, config normalization, and template resolution.

### Added
- **Regression coverage for Companies fallback paths**: Expanded search-template and popup runtime tests to lock legacy tech-preset normalization, Companies custom balanced fallback selection, and tech-subpreset offshore-keyword interleave ordering.

## [1.36.15] - 2026-03-28

### Fixed
- **Companies offshore-anchor retention under boolean budget**: `buildCompaniesQueryPlan` now interleaves offshore/LATAM anchors with tech sub-preset specialization terms so operator trimming does not drop all offshore intent from compiled queries.
- **Tech preset consistency for LATAM/offshore hiring**: Tightened remaining tech sub-preset company defaults (`tech-devops`, `tech-data`, `tech-cloud`, `tech-security`, `tech-mobile`, `tech-ml-ai`) to include remote LATAM-hiring phrasing and low-fit exclusions.

### Added
- **Regression coverage for anchor preservation**: Expanded search-template tests to assert tech-devops Companies planning keeps offshore anchors and exclusion clauses in generated query output.

## [1.36.14] - 2026-03-28

### Fixed
- **Companies auto-follow execution reliability**: Company follow runtime now recollects lazy-loaded result cards before processing, improving follow execution when LinkedIn loads additional cards only after scrolling.
- **Pagination next-button detection robustness**: Added broader next-page button detection (`Next` / `Avançar` and additional selectors) so multi-page company runs continue more reliably.
- **Low-fit classifier false positives**: Narrowed group-related low-fit patterns to explicit community/study group signals so legitimate company names containing “Group” are no longer skipped by default.

### Added
- **Runtime regression coverage for lazy-load follow flow**: Added tests to verify additional cards collected after scroll are processed and followed automatically.

## [1.36.13] - 2026-03-28

### Fixed
- **Stricter offshore LATAM tech targeting**: Tightened Companies tech and key tech sub-preset (`tech-frontend`, `tech-backend`, `tech-fullstack`) search terms to emphasize remote/nearshore product engineering and LATAM hiring intent.
- **Noise suppression in company search queries**: Added bounded exclusion terms (`NOT university/college/institute`) in template compilation and preset defaults to reduce education/group/job-board noise in LinkedIn company results while keeping queries within boolean budget.

### Added
- **Regression coverage for stricter company query strategy**: Expanded search-template tests to lock in offshore/LATAM keyword and exclusion behavior for Companies planning.

## [1.36.12] - 2026-03-28

### Fixed
- **Companies search quality**: Tightened tech talent-watchlist query terms toward offshore/LATAM software employers and added exclusion clauses to reduce education/group noise in company search results.
- **Low-fit entity handling in runtime**: Company follow automation now classifies and skips low-fit entities (for example universities, institutes, generic groups, and job-board-like pages) before attempting follow actions.

### Added
- **Companies quality diagnostics and regressions**: Added runtime and query-planning coverage for low-fit skipping and exclusion-aware Companies query generation.

## [1.36.11] - 2026-03-28

### Fixed
- **Auto-connect follow-only handling**: Connect automation now processes profiles that only expose follow actions, attempting implicit connect from the card action menu first and falling back to follow when connect is unavailable.
- **Implicit connect detection robustness**: Added shared connect-action utilities to detect more-actions triggers, connect menu entries, and explicit card connect controls across localized UI variants.

### Added
- **Connect action regression coverage**: Added focused tests for connect-action utility behavior and branch-level detection paths to prevent follow/connect fallback regressions.

## [1.36.10] - 2026-03-28

### Added
- **Companies tech presets in popup**: Added software-engineering focused Companies area preset options in the popup selector (`tech`, `tech-fullstack`, `tech-frontend`, `tech-backend`, `tech-devops`, `tech-data`, `tech-cloud`, `tech-security`, `tech-mobile`, `tech-ml-ai`).
- **Generic Companies tech preset defaults**: Added a base `tech` Companies preset with curated default query and target companies for talent-watchlist workflows.

### Fixed
- **Preset migration alignment**: Bumped area preset state tag to `8` and updated regression coverage to ensure migration and config normalization include the new generic Companies `tech` preset.
- **Manifest/package parity**: Aligned extension manifest version with the package release line (`1.36.10`).

## [1.36.9] - 2026-03-28

### Fixed
- **Connect search hardening**: Launch keywords are now sanitized into plain deduplicated terms (boolean operators stripped) before building LinkedIn People URLs, reducing zero-result runs caused by over-restrictive boolean payloads.
- **Companies runtime reliability**: Added scheduled rate-limit guard, multi-page pagination processing, and stronger boundary-aware company target matching to improve follow execution consistency.
- **Runtime outcome and messaging stability**: Normalized company explicit no-results outcomes as success where appropriate, fixed sync bridge message handling to avoid pending channel warnings, and reduced noisy Connect runtime logging.

### Added
- **Feed skip-keyword templates**: Added reusable templates (including `crypto_hype` and `job_spam`) with apply/append controls in popup, plus EN/PT-BR localization support.
- **Regression coverage**: Expanded test suites for connect runtime fallback, companies orchestration/runtime/utils, bridge sync handling, popup template/companies UX behavior, and run-outcome status branches.

## [1.36.8] - 2026-03-23

### Fixed
- **Connect filter precedence**: Connect launches (manual, scheduled, and quota-retry) now always honor user-selected popup filters (`degree2nd`, `degree3rd`, `activelyHiring`) instead of silently prioritizing template `filterSpec` defaults.
- **Connect zero-results recovery**: Added a one-time automatic relaxed retry when a Connect run ends with no processed items, broadening network scope to 2nd+3rd degree, disabling `activelyHiring`, and simplifying overly restrictive boolean queries.
- **Test runtime portability**: Updated Jest scripts to use portable `NODE_OPTIONS` flags across CI Node versions and removed forced Jest exit behavior to avoid runtime warning noise while keeping full test compatibility.

## [1.36.7] - 2026-03-19

### Fixed
- **Jobs effective payload parity**: `startJobsAssist` now sends resolved planner diagnostics term arrays (`roleTerms`, `locationTerms`, `keywordTerms`) instead of raw refine inputs, keeping launch payload behavior aligned with the generated Jobs query.
- **Jobs popup runtime hardening**: Added regression assertions in `tests/popup-connect-refine-runtime.test.js` to verify blank refine fields remain treated as missing planner inputs and that launch payload terms use effective planner values.

## [1.36.6] - 2026-03-19

### Fixed
- **Jobs and Companies optional-group parity**: Search template planners now honor explicit empty arrays for optional groups in Jobs (`roleTerms`, `locationTerms`, `keywords`) and Companies (`keywords`), allowing intentional omission of defaults while preserving defaults when keys are missing or `undefined`.
- **Jobs popup planner alignment**: Popup jobs search planning now forwards raw role/location/keyword inputs into template planning instead of forcing preset role fallbacks, so user-cleared groups are respected consistently.

### Added
- New **`tests/popup-connect-refine-runtime.test.js`** runtime regression suite covering area-pill group isolation, hidden-selected-tag recoverability/count integrity, and 9th-tag-per-group limit behavior with shake feedback reset.
- Extended **`tests/search-templates.test.js`** with missing-vs-empty-vs-undefined parity coverage for Companies and Jobs planners.

## [1.36.5] - 2026-03-18

### Fixed
- **Connect optional group semantics**: Connect search planning now omits template defaults for `role` and `industry` only when those groups are explicitly provided as empty arrays, preserving previous defaults when keys are missing/undefined. This enables intentionally running without industry/domain terms while avoiding accidental broad queries from callers that do not send those keys.
- **Connect fallback query consistency**: The popup connect manual fallback now composes role/industry/market/level terms as a single OR chain, matching the template planner semantics and preventing mixed query behavior when template helpers are unavailable.

### Added
- Extended **`tests/search-templates.test.js`** with explicit contract tests for omitted vs missing role/industry selections and undefined-value behavior.

## [1.36.4] - 2026-03-16

### Changed
- **Coverage improvements**: Boosted branch coverage from 85.77% to 85.95% by adding 22 targeted tests across `company-utils.js` (+16 tests: `extractCompanySlugName` no-match, `extractCompanyInfo` innerText branches, `findFallbackCompanyContainers`, `getCompanyFollowConfirmationSignals` aria-pressed + btn.disabled, `isNextPageButton` null/disabled, `getCompanySearchPageState` body-text fallback + detectExplicit + parseResultsCount patterns) and `jobs-career-intelligence.js` (+6 tests: `uniqueList` dedup, `detectMatches` limit, `inferLocationTerms` brazil+latam, `inferKeywordTerms` ≥8 detected, `chooseTemplateId` custom+precise→balanced). Branch coverage threshold ratcheted 85.5% → 85.7%.

## [1.36.3] - 2026-03-16

### Fixed
- **Search tag quoted values**: All `data-value` attributes in popup.html had `&quot;` HTML entities embedding double-quote characters into tag values (e.g., `"talent acquisition"`). These quoted values flowed into the boolean query as `"talent acquisition"` which LinkedIn People Search rejects. Removed all 134 `&quot;` entities so tags emit clean unquoted values. Added defensive `.replace(/"/g, '')` to `sanitizeBooleanTerm()` to guard against future regressions. Bumped `STATE_TAG_VERSION` 6→7 to clear any stale Chrome storage entries containing old quoted values.

## [1.36.2] - 2026-03-16

### Fixed
- **Connect query OR logic**: `buildConnectQueryPlan` now merges industry/market/level tags into the `should` (OR) bucket instead of `must`. Previously, tags from Industry, Market Focus, and Level They Hire were placed in the `must` parameter of `compileBooleanQuery`, which caused them to be space-appended after the OR chain (implicit AND), over-constraining the query and returning "No results found". All tag groups now join with `OR` as expected by LinkedIn People Search.

## [1.36.1] - 2026-03-16

### Fixed
- **Boolean search quoted phrases**: `sanitizeBooleanTerm()` no longer wraps multi-word terms in double quotes. LinkedIn people/company search does not support quoted phrase syntax (`"talent acquisition"`) in keyword boolean queries — this caused "No results found" for any search using multi-word role or industry tags. Multi-word terms now remain unquoted (`talent acquisition OR hiring manager`).

## [1.36.0] - 2026-03-15

### Added
- Extended **`tests/feed-dom-extraction.test.js`**: `getPostAuthorTitle` full suite (null return, actor/header fallback, short-text filter), `innerText` branch tests via `Object.defineProperty`, visible-thread comment signal, fallback comment traversal (parentElement chain).
- New **`tests/company-utils-challenge-url.test.js`**: URL-based `detectChallenge` using `@jest-environment-options` jsdom URL, hits line 197 URL branch.
- Extended **`tests/company-utils.test.js`**: `getResultsCountText` `innerText` branch via `Object.defineProperty`.
- Extended **`tests/connect-config.test.js`**: `buildConnectQueryFromTags` single-role branch (no OR), `migrateConnectPopupState` with `Array.isArray(excludedCompanies)`.
- Extended **`tests/jobs-career-intelligence.test.js`**: `validateResumeVaultFileMeta` size≤0 and size>MAX_RESUME_BYTES branches.
- Extended **`tests/jobs-utils.test.js`**: `inferSeniority` → lead/junior/intern via `rankJobsForApply`, sort tie-break by `postedHoursAgo`.
- Extended **`tests/feed-comment-generation.test.js`**: `lastRejectReason` set on pattern low-signal, `effectiveLang='pt'` from majority PT comments, `departure_transition`/`hiring_active`/`avoidCelebration` preferredCat branches, `avoidAgreement` filter.
- Extended **`tests/search-templates.test.js`**: `listFrom` string→`split('\n')` branch, `buildJobsQueryPlan` `manualQuery` path.
- Extended **`tests/pattern-memory.test.js`** (41 tests): `cloneObject` null-obj branch, `topKeys` zero/negative-value filter, `ema` Infinity guard, `mergeUnique` dedup via `seen.has`, `pickTop` `|| null` path.

### Changed
- **Coverage thresholds ratcheted**: stmts 95→96, branches 84→85.5, lines 97→97.5.
- **42 suites, 1584 tests** (+51). 96.35% stmts, 85.7% branches, 99.36% functions, 97.84% lines.

## [1.35.0] - 2026-03-15

### Added
- **`tests/feed-comment-analysis.test.js`**: 41 new tests covering `classifyCommentSentiment` all 8 sentiments, `summarizeCommentThread` brevity long/medium/short, energy high/low/balanced, `mapSentimentToStyle` all 8 mappings, short token skip, short phrase skip, opener length≤2 guard.
- Extended **`tests/pattern-memory.test.js`**: normalizeWeightedMap object items with text/key/weight/value fields, weight≤0 skip, mergeWeightedMaps near-zero decay, ema non-finite, loadPatternBucket null return, mergePatternBucket null memory, buildPatternGuidance lowSignal.
- Extended **`tests/company-utils.test.js`**: non-clickable-following signal, aria-disabled path, detectChallenge via body text, getResultsCountText body fallback, detectExplicitNoResults node match.
- Extended **`tests/jobs-utils.test.js`**: inferSeniority lead/intern, getOffshoreCompatibility empty text, rankJobsForApply hours tiebreak.

### Changed
- **Coverage thresholds ratcheted**: stmts 94→95, branches 83→84, funcs 98→99, lines 96→97.
- **41 suites, 1533 tests** (+60). 95.67% stmts, 84.29% branches, 99.2% functions, 97.24% lines.

## [1.34.0] - 2026-03-15

### Added
- **`tests/feed-copy-guard.test.js`**: 48 new tests covering all exports + uncovered branches (`buildCharTrigramSet` short text, `computeTokenContainment` empty, rank 4 medium-token-high-char, rank 5 short-near-clone).
- **`tests/feed-comment-patterns.test.js`**: 96 new tests covering all exports + uncovered branches (`getLengthBand` short/long, `detectPunctuationRhythm` flat, `extractIntent` humor/neutral, `resolveStyleFamily` all 4 branches, `analyzeCommentPatterns` zero-count, `collectPatternLexicon` bucket ngrams, `validateCommentPatternFit` question/emoji/rhythm/lexicon/irony/polemic/discussion rejections).
- **`tests/feed-comment-generation.test.js`**: 26 new tests covering all exports + uncovered branches (`finalizeGeneratedComment` distanceRisk/safety/copy-risk rejections, `buildCommentFromPost` ptCount→pt lang, isDepartureOnly, avoidCelebration+career/generic, double-quote replacement).

### Changed
- **Coverage thresholds ratcheted**: stmts 93→94, branches 81→83, lines 95→96.
- **40 suites, 1473 tests** (+123). 94.98% stmts, 83.35% branches, 98.88% functions, 96.73% lines.

## [1.33.0] - 2026-03-15

### Added
- **`tests/feed-post-classification.test.js`**: 49 new tests covering `getReactionType`, `classifyPost` (support reactions boost, humor boost patterns, critique boost patterns, hiring safety override), `isMetricsOrSocialImpactPostContext` (with `imageSignals.samples`), `detectCareerTransitionSignals`, `isPolemicPost`.
- **`tests/search-templates.test.js`**: Extended with `normalizeMode` fallback, `sanitizeBooleanTerm` empty, `compileBooleanQuery` NOT clause, `listSearchTemplates` full coverage, `buildSearchTemplatePlan` null return, `findModeDefaultTemplate` final fallback.
- **`tests/jobs-cache.test.js`**: Extended with browser `toBase64`/`fromBase64` paths (btoa/atob), `toIsoDate` NaN fallback, `decryptJobsProfileCache` JSON.parse error.
- **`tests/ui-notify.test.js`**: Fixed OOM crash in capacity management tests; added timer-driven path coverage.

### Changed
- **Coverage thresholds ratcheted**: stmts 91→93, branches 78→81, functions 96→98, lines 93→95.
- **37 suites, 1348 tests** (+85). 93.7% stmts, 81.5% branches, 98.9% functions, 95.7% lines.

## [1.32.0] - 2026-03-15

### Added
- **7 `connect.{preset}.recruiter_outreach.precise` templates** for creative sub-presets (graphic-design, art-direction, branding, ui-ux, motion-design, video-editing, videomaker) targeting Brazil recruiters with `activelyHiring: true`.
- **`tests/feed-dom-extraction.test.js`**: 86 new tests (jsdom) covering all 7 image signal cue types, reaction alt-text fallback parsing, totalEl count extraction, `data-view-tracking-scope` URN path, `parseCompactCountToken` decimal branches, `extractCommentCountFromText` keyword-first pattern, parent traversal in `getPostCommentSignal` and `getExistingComments`.
- **`scripts/install-hooks.sh`** + `npm run install-hooks`: reproducible pre-push hook installer for fresh clones. Runs lint + typecheck + test:coverage before every push.
- Pre-push git hook installed locally.

### Changed
- **Coverage thresholds ratcheted**: stmts 90→91, branches 76→78, lines 92→93.
- **36 suites, 1263 tests** (+94). 91.4% stmts, 78.7% branches, 96.8% functions, 93.3% lines.
- Updated `verify` skill thresholds to match `jest.config.cjs`.

### Fixed
- `jobs-career-vault.js` branch coverage improved: null/undefined passphrase fallback, existing-store upgrade skip, transaction error rejection, `openVault` onerror rejection.

## [1.31.0] - 2026-03-15

### Added
- **21 dedicated search templates for 7 creative sub-presets**: `graphic-design`, `art-direction`, `branding`, `ui-ux`, `motion-design`, `video-editing`, `videomaker` now each have Connect (`peer_networking.balanced`), Companies (`talent_watchlist.balanced`), and Jobs (`high_fit_easy_apply.precise`) templates — matching the tech sub-preset pattern from v1.28.0. Includes curated Brazilian + global studio company lists.
- **`tests/feed-safety-guards.test.js`**: 70 new tests covering all four exported functions with full branch paths (filler/sarcasm/overlap detection, PT-BR distance phrases, humor guard, departure-only transitions, bookmark intent, custom duration options).

### Changed
- **Coverage thresholds ratcheted**: stmts 84→90, branches 70→76, functions 90→96, lines 88→92.
- **35 suites, 1169 tests** (+117). 90.3% stmts, 76.9% branches, 96.5% functions, 92.4% lines.
- `jest.config.cjs` — added `forceExit: true` to prevent jsdom RAF open-handle warnings.

## [1.30.0] - 2026-03-15

### Refactored
- **Split `feed-utils.js` (2359 lines) into 8 focused modules**: `feed-copy-guard.js`, `feed-nlp-utils.js`, `feed-comment-analysis.js`, `feed-post-classification.js`, `feed-dom-extraction.js`, `feed-comment-patterns.js`, `feed-safety-guards.js`, `feed-comment-generation.js`. `feed-utils.js` remains as a backward-compatible barrel re-export.

### Added
- **`ui-notify.js`**: Fixed top-bar notification overlay injected into LinkedIn pages for real-time visibility of errors, blockers, and rate-limit hits. 4 notification types (error/warning/info/success), auto-dismiss, close button, max 4 visible, dark theme, backdrop blur, slide-in animation.
- Integrated into all 4 content scripts at CAPTCHA detection, HTTP 429 rate limits, manual-input-required, and runtime error points.
- **34 suites, 1052 tests** (32 new). 89% stmts, 76% branches, 93% functions, 91% lines.

## [1.29.1] - 2026-03-15

### Added
- **AGENTS.md**: Comprehensive AI agent onboarding guide — project structure, 24 lib modules, 28 area presets, 4 skills, coverage thresholds, conventions, and gotchas. Eliminates cold-start context loading.

## [1.29.0] - 2026-03-15

### Added
- **PR coverage report automation**: CI now posts a coverage table comment on every PR with statements, branches, functions, and lines percentages.
- **PR template**: `.github/pull_request_template.md` with summary, type checklist, and validation checklist.
- **Verify skill**: `.agents/skills/verify/SKILL.md` — quality gate sequence for `/verify` command.
- **Release skill**: `.agents/skills/release/SKILL.md` — release flow automation for `/ship` command.

### Changed
- **Jest coverage thresholds ratcheted**: statements 80%→84%, branches +70% (new), functions +90% (new), lines 80%→88%. Prevents regression from the current 88/75/92/90 floor.
- **`.gitignore`**: Added `coverage/` and `opencode.jsonc`.

## [1.28.3] - 2026-03-15

### Changed
- **Test coverage raised**: 64 new tests (1020 total). `feed-utils.js` 77%→84% stmts / 63%→72% branches. Overall lines 88%→**90.81%**.

## [1.28.2] - 2026-03-15

### Changed
- **Test coverage raised**: 65 new tests (956 total). `jobs-career-intelligence.js` 84%→97% stmts / 57%→79% branches, `jobs-utils.js` 78%→88% stmts / 64%→80% branches. Overall lines 87%→88%.

## [1.28.1] - 2026-03-15

### Changed
- **Test coverage raised**: 160 new tests (891 total from 731). `templates.js` 28% → 76%, `jobs-career-cache.js` 74% → 87%, overall statements 82% → 84%, functions 82% → 91%, lines 85% → 87%.

## [1.28.0] - 2026-03-15

### Added
- **9 software engineering sub-presets**: Added `tech-frontend`, `tech-backend`, `tech-fullstack`, `tech-devops`, `tech-data`, `tech-cloud`, `tech-security`, `tech-mobile`, and `tech-ml-ai` as first-class presets across Connect, Companies, and Jobs modes.
- **Company watchlists for all tech sub-presets**: Each new preset ships with curated `defaultTargetCompanies` (global leaders + Brazil-focused scale-ups) and a `defaultQuery` for the Companies mode preset selector.
- **29 new search templates**: 11 Connect peer_networking/recruiter_outreach templates, 9 Companies talent_watchlist templates, and 9 Jobs high_fit_easy_apply templates — one per sub-preset per mode.
- **190+ EN/PT-BR term variants**: Extended `search-language.js` with specialist roles (devops engineer, SRE, ML engineer, security architect, iOS/Android developer, etc.) and their disciplines, enabling full locale-aware query generation for all new presets.

### Changed
- **STATE_TAG_VERSION bumped to 6**: Triggers automatic state migration for existing users selecting a preset that has been added or renamed.

## [1.27.0] - 2026-03-15

### Added
- **Jobs Career Intelligence**: Added a local-only Jobs intelligence layer with encrypted derived state in `chrome.storage.local`, encrypted resume vault storage in IndexedDB, and deterministic analysis of uploaded `PDF`/`DOCX` resumes plus explicit LinkedIn profile imports.
- **Jobs search generation from personal context**: Added `Analyze & Generate` flow to derive best-fit Jobs query, role terms, keyword terms, location terms, work type, and experience level from the user's career signals while keeping all generated fields editable.
- **Brazil Offshore Friendly jobs filter**: Added a Jobs-only filter/payload flag that injects Brazil/LATAM offshore hiring terms into generated search plans and uses detail-text compatibility scoring for remote contractor-friendly roles.
- **Full EN/PT-BR UI localization**: Added a real UI language layer backed by Chrome `_locales` catalogs plus a shared runtime i18n helper for popup, dashboard, notifications, and runtime status copy.
- **Per-mode search language controls**: Added locale-aware search-language settings for Connect, Companies, and Jobs (`auto`, `en`, `pt_BR`, `bilingual`) with deterministic locale resolution before query compilation.

### Changed
- **Jobs ranking inputs expanded**: Jobs ranking now considers keyword overlap and offshore compatibility alongside title, seniority, location, company preference, and recency.
- **Jobs runtime detail enrichment**: Jobs runtime now opens visible job cards to read detail-pane text before ranking when keyword or Brazil-offshore context is needed.
- **UI locale and search locale are now separate layers**: Extension-owned UI follows the global UI language switch, while Connect/Companies/Jobs queries can independently resolve to English, Portuguese, or bilingual term sets per mode.
- **Locale-aware search template generation**: Search templates now resolve localized role, industry, market, and keyword variants instead of relying on English-only literals.
- **Test coverage raised**: Statements 78% -> 83%, Lines 81% -> 86%, 32 suites / 723 tests across Node 18/20/22.

### Fixed
- **Jobs cache scope separation**: Structured applicant autofill cache remains isolated from resume/profile intelligence, preventing encrypted form-fill state from being overloaded with search-intelligence data.
- **Jobs start behavior with locked intelligence**: When Career Intelligence is enabled and encrypted intelligence exists, Jobs start now blocks deterministically until the session passphrase is provided.
- **Inline bilingual UI copy**: Removed the remaining mixed EN/PT popup/dashboard labels (`Filter tags / Filtrar tags`, template toggles, language labels, dashboard subtitles) in favor of full catalog-driven localization with English fallback for missing keys.
- **Chrome extension load blocker from locale catalogs**: Replaced invalid dotted `_locales` message keys with Chrome-safe catalog keys and normalized dotted logical keys at the i18n helper boundary so the unpacked extension loads again in Chrome/Brave.
- **Locale catalog regression coverage**: Added validation that `_locales` keys stay within Chrome's `[A-Za-z0-9_]` requirement while helper-based lookups still resolve dotted logical keys from code.
- **Options dashboard async DOM errors**: Hardened dashboard rendering so async storage callbacks no longer write into missing/unmounted nodes, eliminating extension-owned null dereference noise in DevTools.
- **Jobs Brazil-local auto locale precedence**: Jobs auto search language no longer flips to English just because a template contributes `remote`; Brazil-local searches now stay PT-BR unless offshore/global intent is explicitly stronger.
- **Profile import skills selector bleed**: Fixed CSS selector from `~` (general sibling) to `+` (adjacent sibling) to prevent skills extraction from picking up experience section spans.
- **Vault crypto Node 18 compatibility**: Added `require('crypto').webcrypto` fallback, Buffer-based Base64 helpers, and Uint8Array wrapping for cross-realm ArrayBuffer in Node 18 jsdom.

## [1.26.5] - 2026-03-13

### Changed
- **Companies follow confirmation hardening**: Company follow attempts now use bounded in-card confirmation polling with retries (initial click + 2 retries), re-querying buttons between attempts to survive LinkedIn DOM re-renders.
- **Companies diagnostics expanded**: Company runtime diagnostics now include `followAttempts`, `unconfirmedFollowCount`, and `confirmSignalsSeen` summaries to make false-negative follow outcomes actionable.
- **Jobs Easy Apply step progression**: Jobs runtime now advances deterministic multi-step Easy Apply flows (`Next/Continue` and `Review/Revisar`) until the manual review stage without submitting the application.
- **Jobs manual-required stop semantics**: `needs-manual-input` is now terminal for the current run with explicit `reason: manual-input-required`, keeping the active application open for user completion.

### Fixed
- **Companies false 0-follow outcomes**: Added deterministic `follow-not-confirmed` failure mapping when follow clicks are attempted but no followed-state signal is confirmed after retries.
- **Companies per-card failure status precision**: Unconfirmed follow attempts now log `skipped-follow-not-confirmed` instead of generic failed skips.
- **Companies already-following classification tightening**: Cards without a clickable follow button are only counted as `already-following` when a followed-state signal is confirmed; otherwise they remain unconfirmed skips.
- **Popup company failure messaging**: Popup now maps company failure reasons (`follow-not-confirmed`, `no-target-matches`, `already-following-only`) to actionable user-facing error text.
- **Jobs required-field detection**: Required Easy Apply fields now validate from runtime field values/validity (input/textarea/select) instead of brittle `[value]` attribute checks.
- **Jobs full-name autofill precision**: Full-name autofill now targets explicit person-name fields only (and no longer treats generic `name` fields like `company name` as candidate name fields).
- **Jobs popup completion feedback**: Manual-required jobs outcomes now show actionable warning text instead of generic error messaging.
- **Jobs modal transition safety**: Easy Apply step progression no longer reuses stale modal references when the dialog closes after `Next`/`Review`; the run exits deterministically with `reason: modal-closed`.
- **Jobs continue-manually CTA behavior**: `Continue Manually` now focuses an existing LinkedIn Jobs tab instead of starting a fresh Jobs automation run.
- **Jobs continue-manually state reset**: Manual-resume mode now clears only after a successful Jobs-tab focus, so retries remain available when tab focus fails.
- **Company disabled-button confirmation hardening**: Disabled buttons are no longer treated as followed by default; fallback confirmation now requires follow-specific text/ARIA/class semantics.

## [1.26.4] - 2026-03-13

### Changed
- **Jobs profile runtime merge policy**: Jobs runs now accept ephemeral `profileDraft` form data per run; when encrypted cache is unlocked, non-empty draft fields override decrypted cache values for that run only.

### Fixed
- **Jobs encrypted cache recovery path**: Added explicit cache unlock/load runtime contract (`loadJobsProfileCache`) so persisted encrypted profile data can be decrypted back into popup form fields.
- **Jobs start behavior with missing cache**: Jobs runs now use current form profile fields when no encrypted cache is configured instead of silently running with an empty profile.
- **Jobs easy-apply filter toggle**: `Jobs Easy Apply Only` is now honored end-to-end (background + ranking skip logic) instead of being hard-forced on at runtime.

## [1.26.3] - 2026-03-12

### Changed
- **Companies target-filter semantics**: Empty `Target Companies` now always means “follow all visible company results”; template default target lists are no longer auto-applied implicitly on manual or scheduled runs.
- **Companies scheduled/manual parity**: Both launch paths now use only explicit user-provided target companies for filtered runs.

### Fixed
- **Companies hidden over-filtering**: Fixed the “tab opens, 0 follows” behavior caused by implicit template target defaults filtering out all cards.
- **Deterministic 0-follow outcomes in Companies**: Added explicit failure reasons for zero-follow runs (`no-target-matches`, `already-following-only`, `no-companies-followed`) instead of silent success-like outcomes.
- **Companies skip diagnostics**: Added `skipped-target-filter` log status and per-step diagnostics (`cardsScanned`, `targetMatched`, `followed`, `alreadyFollowing`) to make filter misses visible in history/runtime payloads.

## [1.26.2] - 2026-03-12

### Changed
- **Deterministic run outcome contract**: Connect/Feed/Companies/Jobs now normalize every run into `runStatus` (`success`, `failed`, `canceled`) with canonical reason codes and deterministic counters (`processedCount`, `actionCount`, `skippedCount`).
- **Manual stop semantics**: User-triggered stop now finalizes as `canceled` instead of success/failure across popup/background/runtime flows.
- **Strict success criteria**: Runs are only successful when at least one item is processed and no runtime error occurs; zero-processed runs now resolve as failed (`no-items-processed`).
- **Warmup progression hardening**: Feed warmup run progression now keys off normalized `runStatus=success` plus processed posts, so canceled/failed runs never advance unlock progress.

### Fixed
- **Departure-only comment guard**: Feed AI/fallback now blocks congratulatory wording on posts announcing departure from a company unless the same post also includes explicit new-job signals.
- **Career transition context detection**: Added deterministic EN/PT transition signal detection (`departure-only` vs `departure + new role`) and applied it to prompt tone guidance plus comment safety validation.
- **Neutral transition fallback templates**: Added dedicated EN/PT neutral transition templates so departure-only posts avoid milestone congratulations while still allowing respectful acknowledgements.

## [1.26.1] - 2026-03-12

### Fixed
- **Bridge callback runtime hardening**: `LINKEDIN_BOT_AI_COMMENT` relay now handles `chrome.runtime.lastError` deterministically and returns `reason: bridge-runtime-error` with safe diagnostics instead of uncaught callback noise.
- **Pattern learn channel warning reduction**: `LINKEDIN_BOT_PATTERN_LEARN` relay is now fire-and-forget (no callback channel), preventing async response warning spam.
- **Background single-response guard**: Added response hardening for async runtime actions so `sendResponse` resolves once even on failures, with explicit fallback handling in connect/company/jobs start branches.
- **checkAccepted failure safety**: Added deterministic error response and timeout/cleanup handling for tab creation, script execution, and storage read failures in accepted-connections checks.
- **Fetch instrumentation containment**: Invite tracking now bypasses all non-HTTP(S) URLs and keeps tracking logic isolated from extension-resource fetch noise.

### Added
- **Console troubleshooting guidance**: README now documents external DevTools noise categories (`ERR_BLOCKED_BY_CLIENT`, third-party vendor/CSP warnings, `chrome-extension://invalid`) vs extension-owned failures.
- **Regression tests for runtime hardening**: Added bridge and background tests for `bridge-runtime-error`, fire-and-forget pattern learning relay, and deterministic fallback responses on async failures.

## [1.26.0] - 2026-03-12

### Added
- **Jobs tab (LinkedIn Easy Apply assistant)**: New `jobs` mode in popup/background with best-fit ranking (title, seniority, location, recency, company) and deterministic skip rules for non-Easy-Apply, already-applied, and excluded-company jobs.
- **Encrypted jobs profile cache**: Added local structured profile cache with `PBKDF2-SHA256` key derivation and `AES-GCM` encryption, plus runtime actions `saveJobsProfileCache`, `getJobsProfileCacheStatus`, and `clearJobsProfileCache`.
- **Jobs runtime scripts**: Added `extension/jobs-assist.js`, `extension/lib/jobs-utils.js`, and `extension/lib/jobs-cache.js` for jobs orchestration, ranking helpers, and encrypted profile storage.
- **Jobs mode tests**: Added `tests/jobs-cache.test.js`, `tests/jobs-utils.test.js`, and `tests/jobs-orchestration.test.js`, plus analytics/rate-limit coverage extensions for jobs mode.
- **Search Templates v1 engine**: Added deterministic
  `extension/lib/search-templates.js` with per-mode template schema (`connect`,
  `companies`, `jobs`), goal catalogs, expected-results buckets, area-family
  fallback, and boolean query compiler/operator budgeting.
- **Template resolution and compiler tests**: Added
  `tests/search-templates.test.js` covering exact match, family fallback,
  auto/manual precedence, and boolean compiler budget behavior.

### Changed
- **Rate limiting now includes jobs mode**: Added `jobsAssist` hourly/daily limits and popup rate-limit visibility for Jobs mode.
- **Popup mode system expanded**: Added `Jobs` mode UI with refine/profile accordions and encrypted-cache controls while keeping existing connect/company/feed contracts unchanged.
- **History persistence for jobs runs**: Background run finalization now stores jobs logs in `jobsAssistHistory`.
- **Search builders now template-driven**: Connect, Companies, and Jobs now
  support per-mode `Usage Goal`, `Expected Results`, template selector, and
  `Auto-select template` with persisted popup state.
- **Scheduled/manual parity for template logic**: Scheduled Connect and
  Companies runs now resolve template query/filter metadata from stored state
  with the same fallback precedence as manual starts.
- **Template diagnostics in runtime logs**: Connect/Companies/Jobs run payloads
  now carry `templateMeta` (`templateId`, `usageGoal`,
  `expectedResultsBucket`, `operatorCount`, `compiledQueryLength`) for history
  and analytics.

## [1.25.0] - 2026-03-12

### Changed
- **Connect-first popup IA with progressive disclosure**: Popup now prioritizes core controls per mode and moves lower-frequency controls into collapsed accordions (`Refine Filters`, `Audience Filters`, `Message`, `Automation`, `Tools`) with targeted EN/PT helper hints.
- **Dashboard cognitive load reduction**: Options dashboard now uses tabbed navigation (`Overview`, `Activity`, `Feed`, `Nurture`, `Logs`) instead of a single long scroll, while preserving existing metrics/cards/tables and automation behavior.
- **Coverage gate alignment for releases**: Jest coverage is now formally enforced for shared testable modules (`extension/lib/**`) with minimum thresholds of `80%` statements and `80%` lines.

### Added
- **UI-only popup persistence (`popupState.ui`)**: Added optional persistence for accordion open/closed state, last-open subpanel, and connect tag-search text without changing automation contracts/state keys.
- **UI-only dashboard persistence (`dashboardState.activeTab`)**: Added persisted dashboard tab restore via `chrome.storage.local` with safe tab normalization.
- **Coverage runner script**: Added `npm run test:coverage` for local/CI coverage gate validation.

### Fixed
- **Release docs asset mismatch**: README release section now references the actual published asset format (`linkedin-engage-v<version>.zip`) instead of generic `extension.zip`.

## [1.24.0] - 2026-03-12

### Changed
- **Connect supports broader multi-area targeting**: Search Builder now includes 18 professional area presets (`tech`, `finance`, `real-estate`, `headhunting`, `legal-judicial-media`, `environmental-engineering`, `sanitary-engineering`, `healthcare`, `education`, `marketing`, `sales`, `graphic-design`, `art-direction`, `branding`, `ui-ux`, `motion-design`, `video-editing`, `videomaker`) with EN/PT-BR role+industry taxonomy, selector options, and role-priority coverage.
- **Neutral Connect defaults on first load**: Role, Industry, and Market tags are no longer preselected by default, avoiding implicit tech/LATAM bias for new users.
- **Connect templates are now area-aware and role-neutral**: Built-in Senior/Mid/Junior/Lead/Networking templates adapt wording to the selected area preset and no longer assume software-engineering identity by default.
- **Companies preset-aware defaults and scheduling**: Companies mode now supports a `companyAreaPreset` selector (`custom` + 7 creative presets), preset-aware default company lists, start-time query fallback from preset defaults when query/targets are empty, and scheduled single-query fallback when target-company rotation is empty.
- **Company mode runtime orchestration moved to background queue**: Multi-company runs are now coordinated by `background.js` instead of in-page navigation loops, so query-to-query navigation no longer tears down the active execution context.
- **Company run completion semantics**: Company mode now reports a single final completion after the full search queue (or stop/error), with aggregate logs and rate counting applied once per run.
- **Injection start race hardening**: `injectAndStart(...)` now checks current tab status immediately via `chrome.tabs.get` in addition to `tabs.onUpdated`, preventing missed injections on fast page loads.
- **Company page-state gating before actions**: Company mode now polls page readiness every 500ms (up to 20s) and uses deterministic state (`cardsFound`, `isExplicitNoResults`, `resultsCountHint`) before attempting follows.
- **Company card discovery resilience**: `findCompanyCards` now combines legacy selectors with safe link-based container fallback and deduplication to reduce false zero-card runs on LinkedIn DOM variants.
- **Company rate counting precision**: Company mode now increments rate counters only for `followed` entries, preventing timeout/error log rows from consuming company follow quota.
- **Feed originality guidance hardened**: AI prompt now emphasizes style inspiration without phrase reuse and explicitly forbids reusing contiguous 4-word spans from thread comments.
- **AI copy-risk retry flow**: Background AI comment generation now retries once with stricter originality guidance and slightly higher creativity when the first candidate is flagged as copy-risk.
- **Career-milestone tone policy hardened**: For `newjob`, `career`, and `achievement`, AI prompt instructions now enforce professional-neutral wording (brief congrats + neutral wish) and explicitly forbid close-friend phrasing.
- **Release workflow hardening**: Tag releases now use `gh` CLI create/upload/verify flow with idempotent asset upload (`--clobber`), controlled retry, and tag-scoped workflow concurrency.
- **GitHub Actions runtime compatibility**: CI and Release workflows now use `actions/checkout@v6` and `actions/setup-node@v6` to align with GitHub’s Node 24 migration timeline.

### Fixed
- **Single-company skip limitation in Connect**: Replaced legacy single `My Company` behavior with multi-company exclusion list support (`Excluded Companies`), including migration of legacy state to the new field.
- **Companies tab hang on multi-query runs**: Fixed the “starts then hangs” failure where company-follow context could be lost during internal page navigation.
- **Company follow button detection resilience**: `isCompanyFollowText` now accepts label variants like `Follow <Company>` / `Seguir <Empresa>` while still rejecting `Following` / `Seguindo`.
- **False `0 company cards` on visible result pages**: Company mode now distinguishes explicit no-results pages from DOM-detection timeout failures and fails clearly when cards do not appear despite result signals.
- **Near-duplicate feed comments**: Feed mode now blocks near-verbatim AI/fallback comments using deterministic copy-risk rules (exact match, 4-gram reuse, token containment, and trigram similarity).
- **Overpersonal feed comments on stranger career posts**: Added deterministic distance-risk detection for EN/PT intimate phrasing (`happy for you`, `proud of you`, `muito realizado`, `orgulho de você`, etc.), with one AI retry and final `skip-distance-risk` fallback/AI skip behavior.
- **Release asset publication reliability**: Added explicit post-upload asset verification to prevent “published release without assets” when GitHub API finalization is flaky.

### Added
- **Connect config migration + schema hardening**: Popup state migration now upgrades legacy `myCompany` to `excludedCompanies`, normalizes `areaPreset`, and bumps tag-state version for multi-area behavior consistency.
- **Creative company preset helper API**: Shared config now exposes `normalizeCompanyAreaPreset(...)`, `getCompanyAreaPresetDefaultQuery(...)`, and `getCompanyAreaPresetDefaultTargetCompanies(...)` for consistent popup/background behavior.
- **Connect runtime regression coverage**: Added tests for area preset/query composition, excluded-company matching (case/accent-insensitive), and background forwarding of `areaPreset + excludedCompanies` on direct and scheduled runs.
- **Creative preset regression coverage**: Added tests for creative preset validity/query priority, company preset default-query/default-target resolution, and company start/schedule fallback behavior when `companyAreaPreset` must supply the query.
- **Company orchestration regression coverage**: New `tests/company-orchestration.test.js` validates multi-query queue execution, stop behavior, step-error finalization, and scheduled company-flow reuse of the same orchestrator.
- **Company page-state diagnostics**: Company step payload now includes `stepCode` (`ok`, `no-results`, `cards-timeout`, `challenge`) and `diagnostics` metadata for debugging.
- **Copy-risk telemetry contract**: `LINKEDIN_BOT_AI_COMMENT_RESULT` now carries optional `diagnostics` and retry `attempts`; feed logs/analytics include explicit `skip-copy-risk` diagnostics fields.
- **Distance-risk diagnostics contract**: AI/fallback skip diagnostics now also support `riskType: "distance"` payloads and emit explicit `skip-distance-risk` statuses in feed analytics.

## [1.22.1] - 2026-03-10

### Added
- **Comment signal detection for thread gating**: Feed now detects real post comment signal from social/action labels (EN/PT, compact counts like `1.2k`) via `getPostCommentSignal`, instead of relying only on visible expanded comments.
- **Limited thread context hydration**: Before commenting, feed can open the comment area and load up to 2 extra batches to gather visible context for safer, more natural comments.

### Changed
- **Balanced low-signal recovery after warmup**: Post-warmup comment flow no longer hard-skips solely on low pattern confidence when the post has comment signal; AI/fallback can run in recovery mode with strict safety/context guards still enforced.
- **Never-first-comment guard refined**: The guard now uses detected post comment signal (`count === 0`) rather than only `existing.length === 0`.
- **Feed observability diagnostics**: Feed history entries now include `commentSignalCount`, `commentSignalSource`, `visibleCommentsBefore`, `visibleCommentsAfter`, and `usedLowSignalRecovery` for skip tuning.

### Fixed
- **DOM comment extraction coverage**: `getExistingComments` now supports additional LinkedIn comment container/item variants, reducing false “no context” results on posts that already have comments.

## [1.22.0] - 2026-03-10

### Added
- **Feed warmup state machine (`feedWarmupStateV1`)**: Added global feed warmup persistence with `completedRuns`, `requiredRuns`, `enabled`, `lastRunAt`, `totalLearnedPosts`, and `totalLearnedThreads`.
- **Feed warmup popup controls**: New Feed settings for `Enable Warmup Learning`, configurable `Warmup Runs Required` (0-10), `Reset Learning Progress`, and live `Learning progress X/N` UI.
- **Warmup observability statuses**: Feed logs now emit `warmup-learning` and `warmup-reacted` statuses during learn-only runs.
- **Learn-only pattern ingestion path**: Added `LINKEDIN_BOT_PATTERN_LEARN` bridge relay and background `ingestPatternProfile` action so pattern memory is updated even when commenting is disabled.
- **Warmup analytics counters**: `computeStats` now returns `warmupRuns`, `warmupPostsLearned`, and `warmupThreadsLearned` totals.

### Changed
- **Warmup-first feed behavior (runs 1-2 by default)**: Warmup-active feed runs force reactions on, force comments off, and unlock comments from run 3+ (or configured threshold).
- **Feed run completion contract**: Feed results now include `warmupActive`, `processedPosts`, `warmupPostsLearned`, and `warmupThreadsLearned` so background can deterministically advance warmup state.
- **Feed rate counting refinement**: `warmup-learning` entries no longer count toward per-mode action increments, while `warmup-reacted` still does.

## [1.21.0] - 2026-03-10

### Added
- **Hard comment pattern learning layer (Context-First v3)**: Added deterministic thread pattern extraction (`analyzeCommentPatterns`) using up to 15 comments with recency weighting, extracting opener families, length bands, punctuation rhythm, intent/sentiment mix, frequent n-grams, and risk markers.
- **Persistent local pattern memory**: New `commentPatternMemoryV1` storage with `lang|category` buckets (`pt|hiring`, `en|technical`, etc.), bounded maps, and decay/EMA merge strategy to keep learned style signals fresh without unbounded growth.
- **Pattern memory helper module**: Added `extension/lib/pattern-memory.js` with `loadPatternBucket`, `mergePatternBucket`, and `buildPatternGuidance` helpers.
- **Pattern-fit and low-signal statuses**: Added feed skip reason statuses `skip-pattern-low-signal` and `skip-pattern-fit`, including pattern snapshot fields (`confidence`, `style`, `length band`) in skip logs.

### Changed
- **AI prompt contract priority update**: Prompt now prioritizes existing comments + thread pattern profile first, learned bucket guidance second, then reactions/author context, and finally post text/image.
- **Style-cloning constraints**: AI is instructed to mirror thread sentence shape, length band, and tone intensity without copying exact phrases or using generic AI filler.
- **Fallback comment pipeline under pattern discipline**: `buildCommentFromPost(...)` now accepts optional `patternProfile` and applies pattern-fit validation in addition to existing safety checks.
- **Bridge relay contract expanded**: `LINKEDIN_BOT_AI_COMMENT` now forwards `patternProfile` payload to background unchanged.
- **Analytics skip distribution**: `computeStats` now tracks `bySkipReason` and treats both `skipped-*` and `skip-*` statuses as skipped items for engagement-rate calculations.

### Fixed
- **Pattern analysis runtime error**: Added missing grounding tokenizer in `feed-utils` to resolve `ReferenceError` during pattern extraction/fit validation.

## [1.20.1] - 2026-03-10

### Added
- **Context-first AI confidence scoring**: AI comment acceptance now uses a deterministic confidence score (thread evidence, reaction evidence, grounding ratio, and category-signal consistency) and skips low-confidence outputs.
- **Comment safety guardrail status codes**: Feed logs now include explicit comment skip reasons (`skip-low-confidence`, `skip-safety-guard`, `skip-context-mismatch`) for precision tuning.
- **Bridge relay coverage**: Added automated test coverage for AI relay payload forwarding (`goalMode`) and reason propagation.

### Changed
- **Prompt contract v2 for comments**: AI prompt now prioritizes existing comments/thread style first, then reaction context, then post text; includes stricter category matrix and ambiguity/discussion bans.
- **Humor policy hardening**: Humor comments are now restricted to short natural-laugh style only, with explicit anti-congrats and anti-irony enforcement.
- **Fallback comment safety parity**: Template/composed fallback comments now run through the same safety guardrails as AI comments before posting.
- **Fallback classification now reaction-aware**: `buildCommentFromPost` now classifies with reaction context when available (not only post text).

### Fixed
- **Connect runtime crash on ranked targets**: Replaced stale `networked/unnetworked` log references with counters derived from the `ranked` list, fixing `ReferenceError: networked is not defined`.
- **Feed AI goal mode relay**: Bridge now forwards `goalMode` in AI comment requests so active/passive hiring tone logic is consistently applied.
- **Risky fallback phrasing cleanup**: Removed bookmark/save/forward/team-share wording from EN/PT template pools to avoid out-of-context or risky comments.

## [1.20.0] - 2026-03-10

### Added
- **Open to Work recruiter safeguard**: New Connect toggle to skip recruiter-like profiles when explicit Open to Work signals are detected in card/profile metadata.
- **Job-seeking signal safeguard**: Optional Connect toggle to skip explicit job-seeking profiles (`actively looking`, `open to opportunities`, `buscando novas oportunidades`, `#opentowork`).
- **Skip reason breakdown in dashboard**: Dashboard now shows the top skip reasons with counts to calibrate precision filters quickly.
- **Engineering quality-gate scripts**: Added `npm run lint` and `npm run typecheck` scripts and wired both into CI on Node 20.

### Changed
- **Connect relevance prioritization**: Connect target ordering now uses a weighted score (recruiter profile fit, mutual network signals, degree, domain cues, and geo context) to process higher-fit targets first.

## [1.19.1] - 2026-03-09

### Fixed
- **LinkedIn no-results on oversized role OR queries**: Connect query builder now caps role OR terms to a LinkedIn-safe set (top 6) to avoid People search collapsing to zero results when too many role tags are selected simultaneously.

### Added
- **Configurable role-query precision limit**: New `Role Terms Limit` setting (1-10, default 6) in Search Builder controls how many role tags are included in the boolean `OR` query for more assertive, precise results.

## [1.19.0] - 2026-03-09

### Added
- **Goal mode for engagement strategy**: New popup selector with two modes — `Networking & Visibility` (passive) and `Actively Looking` (active). Mode now propagates through Connect and Feed Engage flows to tune hiring-comment tone.
- **Same-company Connect safeguard**: New optional `My Company` input in popup; Connect skips profiles whose headline matches the configured company, reducing same-company recruiter outreach.
- **Active hiring template set**: Added dedicated `hiring_active` templates (EN + PT-BR, simple + composed) so active mode can sound intentional without explicit job-seeking phrases.

### Changed
- **Thread-first comment grounding**: AI prompt now prioritizes existing comments as primary context and post text as secondary context for safer in-thread tone matching.
- **No first-comment behavior**: Feed comment automation now skips posts that have zero existing comments, avoiding thread-start risk.
- **Hiring tone controls by mode**: Hiring prompt guidance now branches by goal mode while explicitly forbidding humor/irony and ambiguous/offensive wording.

### Fixed
- **Hiring misclassification safety**: Added hard override to keep strong hiring posts in `hiring` category when humor/critique heuristics collide, preventing wrong-tone comments on job posts.

## [1.18.3] - 2026-03-09

### Fixed
- **Card dimming now works**: Changed button text matching from substring (`includes('connect')`) to exact match (`=== 'connect'`). The old approach matched "connections", "connected", "mutual connections" — so every card falsely got `hasConnect = true` and was never dimmed
- **Narrowed card selector**: Removed bare `li` selector (matched too many unrelated elements). Now targets only `.entity-result` and `.reusable-search__result-container`
- **Targeted button text lookup**: Query `button span, a span` instead of `button, a` to read only the label text, not the full card contents
- **Fixed chrome-extension://invalid/ fetch error spam**: Added early return in fetch monkey-patch for `chrome-extension://` URLs, preventing them from being intercepted by the invite status tracker

## [1.18.2] - 2026-03-09

### Fixed
- **Reverted to working query structure**: Roles OR'd, market/industry/level as plain keywords (AND'd). LinkedIn rejects long all-OR queries with 19+ terms
- **Tag state version migration**: Stale saved popup state (from pre-1.18 with old tags like "remote"/"global") now resets to HTML defaults instead of activating all tags
- **Removed inner OR from Brazil tag**: `brazil OR brazilian` data-value broke LinkedIn parsing when mixed with other AND terms

## [1.18.1] - 2026-03-09

### Fixed
- **All tag groups use OR**: Roles, industry, market, and level tags are now joined with OR into a single flat query — LinkedIn doesn't support parenthetical grouping, and AND between groups was too restrictive, returning zero results

## [1.18.0] - 2026-03-09

### Changed
- **Search query targets offshore Brazilian hiring**: Market focus tags now OR'd together as a group instead of plain AND keywords, producing targeted queries like `recruiter software (latam OR brazil OR nearshore)` instead of diluted keyword soup
- **Revamped market focus tags**: Removed generic "Remote" and "Global" tags that matched every recruiter; added "Distributed Team" and "Hiring in Brazil" as high-signal phrases; defaults now LATAM + Brazil + Nearshore
- **Parenthetical grouping in queries**: Both role and market tag groups now wrapped in parentheses when multiple are selected, preventing OR bleeding between groups

## [1.17.5] - 2026-03-09

### Added
- **Persistent search page filter**: New `search-filter.js` content script runs automatically on all LinkedIn people search pages (not just during automation), dimming cards that show "Message" instead of "Connect" — covers Open Profile users and already-connected people

### Changed
- **Moved filtering to content script**: URL sanitization and card dimming logic moved from `content.js` (automation-only) to a persistent content script registered in `manifest.json`, so filtering works when browsing search results manually

## [1.17.4] - 2026-03-09

### Fixed
- **Auto-strip 1st-degree filter from search URL**: Content script now detects and removes `"F"` (1st degree) from the `network` URL parameter on page load, forcing a reload with only 2nd+3rd degree results even when LinkedIn's UI toggles all filters on

## [1.17.3] - 2026-03-09

### Fixed
- **Default network filter excludes connected profiles**: Search URL now always includes `network=["S","O"]` (2nd+3rd degree) even when no filter is explicitly set, preventing LinkedIn from returning 1st-degree connections in results
- **Visual dimming of already-connected cards**: Search result cards with "Message"/"Mensagem" buttons or 1st-degree badges are now dimmed (25% opacity) during automation, providing a clear visual distinction between connectable and already-connected profiles

## [1.17.2] - 2026-03-09

### Fixed
- **Brazil-targeted search now forces PT-BR notes**: Connect automation now receives `geoUrn` in content execution and switches invitation note language to Portuguese whenever the search is scoped to Brazil (geo id `106057199`), even if profile cards expose English headlines or missing location fields
- **Connected-profile filtering in Connect mode**: Search cards marked as already connected (`1st` / `1º grau`) are now skipped before action selection, reducing noisy results where LinkedIn returns existing 1st-degree connections

## [1.17.1] - 2026-03-09

### Fixed
- **PT-BR connect note context in More-menu flow**: Connect actions discovered via `More` now preserve the original profile metadata (location/headline/summary), so Brazilian-profile detection no longer falls back to English notes

## [1.17.0] - 2026-03-09

### Added
- **Thread-style AI comment context**: Feed comment generation now summarizes existing comments (dominant sentiment, energy, brevity, common openers) and uses that style profile to produce comments that match the post conversation without copying phrases
- **Visual + engagement tone context**: AI prompt now includes image signals, reaction intensity/dominant reaction, and author-role tone hints for more human-like, context-matched comments
- **Brazilian connect-note localization**: Connect flow now detects Brazilian profiles from location/headline/summary cues and automatically sends the default invitation note in PT-BR

### Changed
- **Humanization prompt tuning**: Reduced overly rigid AI constraints (formal grammar, forced one-word congrats, blanket no-emoji/no-question behavior) and replaced with thread-driven style rules based on emoji/question/exclamation rates to generate more natural, native-sounding comments
- **Existing-comments-first grounding**: AI comments now prioritize thread keywords/phrase anchors extracted from existing comments and reject outputs that do not overlap with post/thread context
- **Connect fallback behavior**: When a result only exposes `Follow` (no `Connect` in direct action or More menu), Connect mode now follows the profile instead of skipping it

### Fixed
- **CI flake in human behavior timing tests**: `humanDelay()` now enforces the 500ms minimum after burst-delay calculations and clamps negative burst noise to zero, removing stochastic test failures in Node 18 matrix runs

## [1.16.0] - 2026-03-08

### Added
- **Comment rate limiting**: Max 8 comments per session to avoid LinkedIn detection — URN-based tracking persisted in chrome.storage across sessions
- **Minimum post length filter**: Posts under 80 chars skipped for commenting — prevents low-context nonsensical comments
- **Commented post URN tracking**: Dedicated `commentedPostUrns` storage (separate from `engagedPostUrns`) — triple-layer duplicate prevention: URN check + name match + storage persistence

### Changed
- **Slower engagement cadence**: Comment delay increased from 2-4s to 5-13s pre-comment + 3-8s post-comment cooldown — between-post delay raised from 2-5s to 3-8s
- **Empty template pool handling**: `buildCommentFromPost()` returns `null` (skip) instead of crashing when template pool is empty
- **Template cleanup**: Emptied generic, story, news, tips template pools (EN + PT) — categories that generated nonsensical comments now fall through to AI or skip

### Fixed
- **Duplicate comments on same post**: Added URN-based tracking via chrome.storage.local (`commentedPostUrns`) — persists across sessions, checked before name-based detection
- **LinkedIn rate limiting**: Reduced overall engagement speed with longer human-like delays and per-session comment cap

## [1.15.0] - 2026-03-08

### Fixed
- **Robotic comment tone**: Complete rewrite of all EN + PT-BR templates (CATEGORY_TEMPLATES and COMPOSED variants) for natural, casual human tone — achievement comments simplified to "congrats!" style, humor uses "hahaha too real" / "kkkkk", technical references real anecdotes
- **Humor misclassification**: Added structural humor detection (punchline patterns, contrast patterns, irony signals) — humor posts now correctly classified even without explicit humor keywords
- **Author misattribution**: `getPostAuthor()` now skips social proof links ("X liked/commented/reposted") that appeared before the actual post author in DOM
- **Critique misclassification**: Added critique boost for strong opinion signals ("hot take", "unpopular opinion", "overrated", "stop pretending") — opinion posts no longer classified as technical just because they mention tech terms
- **Hiring comment phrasing**: Fixed composed hiring templates producing awkward "React is this remote friendly?" — concepts no longer prefixed to questions

### Improved
- **AI prompt anti-robotic overhaul**: Category-aware tone guide (humor → play along, achievement → short congrats, critique → engage with argument), explicit banned phrases list ("Great post", "Love this", "Thanks for sharing", etc.), max 120 chars, casual tone instruction
- **Category field passed through full pipeline**: feed-engage → bridge → background for AI prompt context
- **Template variety**: Hiring and critique composed pools expanded from 3 to 5 templates each (EN + PT)

## [1.14.0] - 2026-03-08

### Added
- **AI-powered comment generation**: Groq API (llama-3.3-70b-versatile) integration for context-aware comments — runs in background service worker (bypasses LinkedIn CSP), with 15s timeout and template fallback
- **Submit button proximity detection**: Distinguishes comment submit (~12px from editor) from action bar "Comment" buttons (~979px) using `editorRect.bottom - btnRect.top < 200px`
- **TipTap/ProseMirror editor support**: Text input via `document.execCommand('insertText')` into `[role="textbox"][contenteditable="true"]`
- **Bridge relay for AI comments**: MAIN → ISOLATED → background → ISOLATED → MAIN pipeline with `requestId` matching

### Fixed
- **LinkedIn March 2026 DOM redesign**: `feed-shared-update-v2`, `role="listitem"`, `data-urn`, `data-id` ALL REMOVED — posts now discovered as direct children of `[data-testid="mainFeed"]` with hashed CSS classes
- **Language detection for PT-BR**: Fixed detection threshold for short Portuguese posts

## [1.13.0] - 2026-03-08

### Fixed
- **Feed engagement not reacting/commenting**: Post container scoping now walks up to include `feed-shared-social-action-bar` when `data-urn` element doesn't contain action buttons — fixes LinkedIn DOM split where buttons are siblings, not children
- **Like/Comment button discovery**: New `findActionButtons()` searches within `feed-shared-social-action-bar` first, with debug logging when buttons aren't found
- **Comment editor detection**: Added Quill editor selectors (`aria-label*='Text editor'`, `aria-label*='comment'`, `.ql-editor`, `[class*="editor"]`) — LinkedIn migrated from `role="textbox"` to Quill-based contenteditable
- **Comment text input**: Modernized `setEditorText()` — wraps `execCommand('insertText')` in try/catch (deprecated), DOM-safe fallback with `createElement('p')`, native `innerText` setter for React/Quill state sync
- **Submit button detection**: Added `data-control-name='submit_comment'` selector
- **Post URN detection**: Added `data-entity-urn` attribute to `getPostUrn()` (both feed-engage.js and lib/feed-utils.js)
- **Stale branding**: Updated 5 notification titles in `background.js` from "LinkedIn Auto-Connect" to "LinkedIn Engage", fixed popup title, header text, and dashboard title
- **Script injection order**: Added `lib/templates.js` to injection arrays in `background.js` for company-follow, feed-engage, and nurture modes — templates load before feed-utils in MAIN world
- **Privacy policy wording**: Clarified nurture auto-cleanup as "after 10 days of inactivity"

### Refactored
- **Template data extraction**: Split `feed-utils.js` (1702→442 lines) into pure-logic functions and a new `templates.js` (1293 lines) containing all template data constants (POST_CATEGORIES, CATEGORY_TEMPLATES, COMPOSED_EN/PT, TOPIC_MAP, etc.)
- **Dual-environment compatibility**: `var` destructuring with `typeof` guard enables Node.js `require()` in tests while Chrome MAIN world uses global scope from prior script injection
- **Post discovery**: `findPosts()` now deduplicates and adjusts containers via `ensureActionBar()` — walks up DOM to find parent with action bar when primary selector returns narrow elements

### Added
- **2 new tests**: `data-entity-urn` extraction from post element and child elements (402 total)

## [1.12.0] - 2026-03-08

### Added
- **Behavioral fingerprint randomization**: Gaussian delay distributions, per-session profiles with unique timing patterns (avgDelay 2-5s, burstChance 5-15%, pauseChance 3-10%, scrollMultiplier 0.7-1.3). Simulated reading pauses, mouse jitter, typing delays
- **Granular rate limiting**: Hourly limits (connect 12, companyFollow 10, feedEngage 15), daily limits (connect 40, companyFollow 30, feedEngage 50), weekly 150. Auto-cleanup of expired keys
- **Analytics & ROI tracking**: Event pipeline (content script → bridge → chrome.storage), engagement stats by mode/category/reaction/hour/day, template acceptance rates, hour-of-day heatmap, 5000-entry rolling log
- **Connection nurture system**: 7-day nurture window, 3 engagements per profile, 12h cooldown. Auto-saves new connections, scheduled alarm visits recent activity feeds, engagement recording via bridge pipeline
- **Smart scheduling**: Analytics-driven optimal time windows, day-of-week weighting, acceptance rate integration. `smartMode` flag skips runs outside optimal windows. `getScheduleInsight` API for dashboard recommendations
- **Chrome Web Store prep**: Privacy policy page, store listing metadata, permissions documentation
- **Profile enrichment**: Extract location, summary, profile photo URL, and mutual connection count from LinkedIn search cards
- **79 new tests**: human-behavior, rate-limiter, analytics, nurture, smart-schedule — total 400 across 11 suites

### Fixed
- **Rate limit blocks invisible to popup**: Background now returns `{status:'blocked', reason}` and popup resets to ready state with clear error message
- **Stuck progress UI on launch failure**: Added `resetProgressUI()` to restore start button on `chrome.runtime.lastError` or rate limit rejection

### Improved
- Rate limit handlers return structured responses instead of fire-and-forget notifications
- Background service worker loads analytics, nurture, and smart-schedule modules via `importScripts`
- Expired nurture entries auto-cleaned on extension install/startup

## [1.11.0] - 2026-03-08

### Added
- **Project rebrand**: "LinkedIn Auto-Connect" → "LinkedIn Engage" across manifest, package.json, README, release workflow
- **Concept-based comment generation**: `extractConcepts()` pulls specific technologies, patterns, and tools from post text — comments reference actual content instead of generic topics
- **Composed template system**: `COMPOSED_EN` and `COMPOSED_PT` template functions generate context-aware comments using extracted concepts for 10 post categories (hiring, achievement, technical, question, opinion, motivation, project, jobseeking, newjob, generic)
- **Expanded PT-BR keywords**: Achievement, technical, hiring, newjob categories now include Portuguese keywords for better bilingual classification
- **Expanded reaction keywords**: Tech-specific terms (shipped, launched, certified, burnout, laid off, clean code, ci/cd, friday deploy) and PT-BR equivalents for smarter reaction selection
- **API security hardening**: Helmet security headers, express-rate-limit (30 req/min), Zod schema validation on `/connect`, `/schedule`, `/webhook` endpoints. JSON body limit 16KB. Configurable CORS origins via `CORS_ORIGINS` env var
- **40 new tests**: `extractConcepts` (14), composed template integration (7), Zod schema validation (18), total 321 across 8 suites

### Improved
- **Post text extraction**: Individual selector iteration with length validation replaces combined selector string — catches more LinkedIn DOM variants including `span[dir="ltr"]` nested in commentary divs
- **Comment submit reliability**: 8 retry attempts (up from 6), keyboard event simulation (keydown/keyup) to trigger React state updates, `focus()` before input dispatch, post-submit verification
- **React button detection**: `reactToPost()` now iterates all buttons checking aria-label and text content instead of relying on a single combined selector
- **Comment flow**: Concepts → composed templates → string templates fallback chain. Removed follow-up appending for cleaner output

### Fixed
- **extractTopic default**: Returns "tech" instead of "this topic" for unrecognized content — more natural in generated comments

## [1.10.2] - 2026-03-08

### Added
- **"See more" text expansion**: `expandSeeMore()` clicks LinkedIn's truncation button ("...more" / "...mais") before extracting post text — full content available for classification and comment generation
- **Session management**: `ensureLoggedIn()` pre-flight check validates session, restores saved cookies, falls back to manual login with timeout. Cookies saved to `linkedin_cookies.json` after successful login
- **Session API endpoint**: `GET /api/linkedin/session` returns session health (cookie age, session dir existence, login timeout)
- **Login wall detection**: Feed engagement detects login/authwall/challenge pages at start, sends `LINKEDIN_BOT_LOGIN_REQUIRED` notification via bridge relay

### Fixed
- **Technical keyword precision**: Removed overly broad keywords (`backend`, `aws`, `cloud`) that caused false positives in job-seeking posts. Kept specific terms (`.net`, `dependency injection`, `singleton`, `terraform`)

## [1.10.1] - 2026-03-08

### Fixed
- **Content-aware comments**: `getPostText()` now captures article titles (`.feed-shared-article__title`, `.update-components-article__title`) in addition to body text — shared articles are now correctly classified instead of falling back to generic templates
- **Comment submit button**: `setEditorText()` now uses `document.execCommand('insertText')` for React/draft-js compatibility — LinkedIn's React state updates properly, enabling the submit button. Added retry loop (6 attempts) waiting for button to become enabled
- **Submit button selectors**: Broadened selectors to match current LinkedIn markup including `comments-comment-box__submit-button`, PT-BR labels (`Publicar`, `Enviar`), and artdeco button variants
- **Technical classification**: Added `.net`, `dependency`, `injection`, `singleton`, `design pattern`, `infrastructure`, `backend`, `frontend`, `devops`, `cloud`, `aws`, `azure` keywords to technical category

### Added
- **Debug logging**: Post classification logs showing extracted text, detected language, and category for each post processed
- **2 new tests**: Article title extraction tests in feed-engage.test.js (total: 234 tests)

## [1.10.0] - 2026-03-08

### Added
- **Scheduled company follow**: Chrome Alarms-based recurring company follow with batch rotation — configurable interval and batch size, rotates through company list across runs
- **Scheduled feed engagement**: Chrome Alarms-based recurring feed engagement with current react/comment settings
- **Feed analytics dashboard**: Comment success rate, reaction breakdown bar chart, top reaction type, feed skip count — new metrics grid in options page
- **38 new tests**: `tests/company-follow.test.js` covering URL building, button detection, CAPTCHA detection, batch rotation scheduling, and integration flows (total: 196 tests across 4 suites)
- **Extracted company-follow functions**: `detectChallenge`, `buildCompanySearchUrl`, `findCompanyCards`, `findFollowBtnInCard`, `buildBatchFromRotation` moved to `company-utils.js` for testability
- **dotenv support**: `.env` configuration for PORT, HEADLESS, CLICK_LIMIT, LOGIN_TIMEOUT, USER_DATA_DIR, CACHED_SELECTORS_FILE
- `.env.example` template included

### Fixed
- **detectChallenge jsdom compatibility**: `innerText || textContent` fallback for test environments
- **Dashboard schedule display**: Shows Connect, Company, and Feed schedule status when active

## [1.9.0] - 2026-03-08

### Added
- **6 new post categories**: humor, critique, motivation, project, jobseeking, newjob — with EN + PT-BR conversational templates
- **Curated company list**: DEFAULT_LATAM_COMPANIES now 60 mid-size (150-500 employee) companies that actively hire from Brazil/LATAM (Hotjar, Doist, Toggl, QuintoAndar, CloudWalk, Creditas, etc.)
- **Per-company search**: Company follow now searches each target company name individually instead of one broad query — much higher hit rate
- **Category-aware follow-ups**: Follow-up questions match post category (e.g., "what stack?" for technical, "is it open source?" for projects)
- **Smart template selection**: Skips `{keyPhrase}` templates when no phrase extracted; prefers short templates for short posts

### Fixed
- **Bottom-up post discovery**: `findPosts()` now finds Like/Comment buttons first and walks UP DOM tree to container — more resilient than class-based selectors
- **Comment editor polling**: Replaced fixed 2s delay with polling loop (500ms × 10 attempts) for editor to appear
- **Submit button scoping**: Search within post element first, document fallback only if needed
- **Comment text input**: Uses `innerText` + dispatch input event instead of DOM manipulation (createElement)
- Added `submit-button--cr` class variant for LinkedIn's current comment submit button

## [1.8.1] - 2026-03-07

### Added
- **PT-BR comment templates**: Language-aware comment generation — detects Portuguese posts and uses conversational PT-BR templates automatically
- `detectLanguage()` function with 50+ Portuguese marker words (3+ threshold)
- `CATEGORY_TEMPLATES_PT` with templates for all 8 categories, plus PT-BR openers/follow-ups
- **Duplicate post guard**: Engaged post URNs persisted via `chrome.storage.local` across sessions (keeps last 2000)
- Bridge.js `SAVE_ENGAGED`/`LOAD_ENGAGED` message handlers for feed engagement persistence
- **Dashboard: company follow + feed engagement stats**: Companies Followed and Feed Engaged cards
- History persistence for company follow and feed engagement modes (`companyFollowHistory`, `feedEngageHistory`)
- Log table merges all three modes sorted by time with color-coded badges
- Activity chart counts company follows and feed engagements alongside connection sends
- CSV export includes all modes
- **company-utils.js**: Extracted testable functions (`extractCompanyInfo`, `matchesTargetCompanies`, `isFollowingText`, `isNextPageButton`)
- 32 new tests: 22 company-utils + 10 feed-utils PT-BR (152 total across 3 suites)

### Fixed
- Feed engagement `findPosts()` returning 0 posts due to LinkedIn DOM changes — added broader selectors and button-detection fallback
- Updated `getPostText`, `getPostAuthor`, `getPostUrn`, `reactToPost` selectors for current LinkedIn DOM

## [1.8.0] - 2026-03-07

### Added
- **Company follow mode**: Search and auto-follow companies on LinkedIn (e.g., big tech, startups)
- Optional target company filter (only follow matching names from a user-provided list)
- **Feed engagement mode**: Auto-react and comment on LinkedIn feed posts
- Content-based smart reactions: keyword matching maps posts to Celebrate, Support, Insightful, Funny, or Love
- Comment templates with `{topic}` auto-detection (AI, leadership, hiring, etc.) and `{excerpt}` placeholders
- Skip keywords to avoid engaging with sponsored/promoted content
- Multi-mode popup UI: Connect / Companies / Feed selector with per-mode settings
- Shared utility library (`lib/feed-utils.js`) with pure functions for feed engagement logic
- Generic script injection (`injectAndStart`, `injectScriptsSequentially`) in background.js
- Generic `runCustom` bridge relay for arbitrary content script message types
- 30 new tests for feed-utils.js (getReactionType, buildCommentFromPost, extractTopic, isReactablePost, shouldSkipPost, isCompanyFollowText)

### Improved
- State persistence now covers all new mode fields (companyQuery, targetCompanies, feedReact, feedComment, commentTemplates, skipKeywords, currentMode)
- Progress indicator adapts verb per mode: Sent / Followed / Engaged

## [1.7.0] - 2026-03-07

### Added
- **Engagement mode**: Profile visit + follow automation as alternative to connect invites
- Popup toggle: "Engagement only" checkbox skips connect attempts, visits profiles and clicks Follow
- Auto-fallback: when weekly invite quota is hit mid-run, automatically switches to engagement mode for remaining profiles
- `runEngagement()` function with hidden iframe profile visits and Follow button detection
- PT-BR Follow button support (`Seguir`)
- Dashboard cards: Engaged count and Followed count with purple theme
- `badge-engaged` status in dashboard log (light/dark mode)
- Engagement statuses in CSV export: `visited`, `followed`, `visited-followed`

### Fixed
- `fuseLimitHit` now persisted via `chrome.storage.local` — survives page navigation (content.js re-injection)
- Bridge.js handles `SET_FUSE_LIMIT` / `CHECK_FUSE_LIMIT` messages for cross-world persistence
- `fuseLimitRetry` alarm clears persisted fuse flag before retry probe

### Improved
- Exponential backoff for unverified invite retries: 30s, 60s, 120s... up to 5min cap (was fixed 30-60s)
- Backoff multiplier resets on successful verified send
- Shared functions in `lib/invite-utils.js` are now the single source of truth (100 lines removed from content.js)

### CI
- GitHub Actions workflow for Jest test suite on push/PR to main

## [1.6.0] - 2026-03-07

### Fixed
- False positive invites: Connect button showed "Pending" in logs but invites were silently rejected by LinkedIn (HTTP 429 FUSE_LIMIT_EXCEEDED)

### Added
- 4-layer invite verification: button state filtering, InMails modal handling, DOM pending state polling, network API interception
- `verifyPendingState()` — polls DOM 6x (3s) to confirm button changed to "Pending" before counting as sent
- Fetch/XHR interceptors for LinkedIn's `verifyQuotaAndCreateV2` API — detects 429 rate limits in real-time
- `fuseLimitHit` flag stops automation immediately when weekly quota is exhausted
- Chrome notification on FUSE_LIMIT_EXCEEDED: "Weekly invitation limit reached"
- `skipped-unverified` status for invites that failed DOM verification
- `stopped-quota` status when API rate limit is detected
- `isButtonClickable()` filter skips `:disabled` and `.artdeco-button--muted` buttons
- Button disabling after click prevents re-scanning same button
- `dismissInMailsModal()` handles Send InMail overlay that blocks automation flow
- Precise send button selector (`div.send-invite button.artdeco-button--primary`) before text-based fallback
- PT-BR support for `Conectar` button text and `Pendente` status

## [1.5.0] - 2026-03-07

### Added
- PT-BR note templates with language-aware background (scheduled runs use correct language)
- Dark mode via `prefers-color-scheme` for popup and dashboard
- 14-day activity bar chart on dashboard showing daily send volume

## [1.4.0] - 2026-03-07

### Added
- Error resilience: lastError checks, 60s tab load timeout, tab close detection, notification on all error paths
- Recent profiles card UI in popup showing last 5 connections with avatar initials, linked name, headline, and status badge
- i18n support (EN/PT-BR) — auto-detects browser language, translates all popup and dashboard UI text

## [1.3.0] - 2026-03-07

### Added
- Duplicate profile detection across runs via persistent URL tracking
- Desktop notifications on automation completion or stop
- Connection acceptance tracker (cross-references connections page)
- Dashboard page with weekly/total/accepted stats and connection history
- Multi-query rotation for scheduled runs (one query per line, cycles each trigger)

### Fixed
- connectionLog accumulating across runs (now cleared at start)
- CAPTCHA detection sending duplicate DONE messages
- Alarm handler using stale customQuery when useCustomQuery was false
- XSS risk in dashboard — replaced innerHTML with safe DOM methods
- Error resilience: lastError checks on script injection, tab load timeout, tab close handling

## [1.2.0] - 2026-03-07

### Added
- Weekly invitation limit guard (150/week with ISO week tracking)
- CAPTCHA and security challenge detection (auto-stop)
- Connection log export as CSV
- Scheduled runs via Chrome Alarms API (configurable interval)

## [1.1.0] - 2026-03-07

### Added
- Stop button with live progress counter
- 429 rate limit backoff (30-60s pause after 3 consecutive failures)
- Connection degree filter (2nd/3rd+ via LinkedIn `network` param)

### Changed
- Simplified standalone connector to accept query from request body

### Removed
- test-search.js (broken complex boolean queries)

## [1.0.0] - 2026-03-07

### Added
- Chrome Extension with tag-based search builder (Role, Industry, Market Focus, Level)
- 6 note templates (Senior, Mid, Junior, Lead, General, Custom)
- 300-character note validation
- Smart profile prioritization (mutual connections first, then by degree)
- Follow-to-Connect via "More actions" dropdown
- Email-required modal detection and auto-skip
- LATAM recruiter targeting with configurable region selector
- "Actively Hiring" filter
- Cross-iframe DOM querying (LinkedIn renders modals in iframes)
- Dual-world injection (MAIN for DOM, ISOLATED for chrome.runtime)
- Auto-pagination through search results
- Personalized notes with `{name}` template variable
- Standalone Playwright connector with Express API
- n8n workflow integration
- GitHub Actions release workflow
