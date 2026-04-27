---
name: extract-umd-lib
description: Extract a cluster of pure functions from popup.js, background.js, or a content script into a new UMD module under extension/lib/. Use when a function group is testable in isolation but currently inlined in a large file. Pattern recurred 3× in v1.36.23–24 (popup-state, connect-query, company-query).
metadata:
  owner: linkedin-engage
  tier: project
---

# Extract UMD lib

Move a cohesive, pure-function cluster out of a monolithic file (`popup.js`, `background.js`, content scripts) into a new `extension/lib/<name>.js` module that follows the repo's UMD pattern. Lock the public API with contract tests.

## When to use

- A monolith file has grown past comfortable read length (popup.js 5290 LOC, background.js 4479 post-#91).
- A cluster of pure functions in that monolith share a clear domain (state shape, query manipulation, URL building, fixture helpers, …) and have no chrome-API dependencies.
- You want to lock the cluster's public API so future renames or signature drift trip a contract test rather than silently no-op.
- Backlog item B-4 (popup-state) or E-11 (background.js) is the umbrella; this skill is the per-extract recipe.

## Don't use this for

- DOM-mutating helpers (they belong in popup.js / content scripts; the lib must run in Node tests too).
- Functions that touch `chrome.*` directly (factor those out first, then extract the pure core).
- One-off helper functions used in a single call site (no leverage).

## Steps

1. **Identify the cluster.** Run `grep -n "^function <name>" <source>.js` across the candidate names. Confirm:
   - Each function is pure (no `chrome.*`, no `document.*`, no closure-mutable module state).
   - They share a domain (e.g. all "connect query manipulation" or all "company URL construction").
   - Total LOC is ≥80 (otherwise the lib is too thin to justify its own module).

2. **Mirror the existing UMD wrapper.** Copy the structure from `extension/lib/connect-query.js` or `extension/lib/popup-state.js`:
   ```js
   (function(root, factory) {
       const api = factory();
       if (typeof module !== 'undefined' && module.exports) {
           module.exports = api;
       }
       root.LinkedIn<Domain> = api;
       Object.keys(api).forEach(function(key) {
           if (typeof root[key] === 'undefined') {
               root[key] = api[key];
           }
       });
   })(
       typeof globalThis !== 'undefined' ? globalThis : this,
       function() {
           // … extracted functions here …
           return Object.freeze({ /* public API */ });
       }
   );
   ```

3. **Inject any non-pure dependencies as parameters.** If the cluster calls `normalizeTemplateMeta` or similar from the host file, pass it as an argument rather than referencing it via the global. See `buildRelaxedConnectConfig(config, normalizeTemplateMeta)` in `extension/lib/connect-query.js` for the pattern.

4. **Wire the lib into the right loading context:**

   | Context | How |
   |---|---|
   | Background service worker | `importScripts('lib/<name>.js')` near the top of `extension/background.js` |
   | Popup | `<script src="../lib/<name>.js"></script>` in `extension/popup/popup.html`, before the script that uses it |
   | Content script | Add `lib/<name>.js` to the `files: [...]` arrays of every `chrome.scripting.executeScript` call in `background.js` that injects the consuming script |

5. **Delete the original function definitions** from the source file. They live only in the lib now; the host consumes them via the imported globals (the UMD wrapper attaches each export to `globalThis`).

6. **Add `tests/<name>.test.js`** mirroring `tests/connect-query.test.js` or `tests/intent-presets.test.js`:
   ```js
   const lib = require('../extension/lib/<name>');
   describe('<name> contract', () => {
       it('exports the expected functions', () => {
           expect(typeof lib.someFn).toBe('function');
       });
       it('freezes the public API', () => {
           expect(Object.isFrozen(lib)).toBe(true);
       });
       // … one happy-path + 2-3 edge-case tests per function
   });
   ```
   Branch coverage is the tightest threshold (85.7%) — write at least one test per branch.

7. **Update any test that requires the host file** (e.g. `tests/popup-connect-refine-runtime.test.js` for popup.js, `tests/jobs-orchestration.test.js` / `tests/company-orchestration.test.js` / `tests/background-connect-runtime.test.js` for background.js). Add to the `beforeEach`:
   ```js
   const libModule = require('../extension/lib/<name>');
   Object.assign(global, libModule);
   ```
   This loads the UMD exports onto Jest's globals so the host's references resolve.

## Validation gates (in order)

```bash
npm test                                  # all suites green, no skipped
npm run lint                              # 0 warnings
npm run typecheck                         # clean
npm test -- --coverage --coverageReporters=text-summary
```

Coverage thresholds (per `jest.config.cjs`): statements 96 / branches 85.7 / functions 99 / lines 97.5. The new lib's tests should easily push these higher; if they pull branch coverage down, add more branch cases.

## Commit shape

Single commit per extract:

```
refactor(<scope>): extract <cluster> helpers to lib/<name>.js

- <function> — extracted from <source>.js:<line range>
- <function> — extracted from <source>.js:<line range>
- …
- contract tests in tests/<name>.test.js (<N> cases)
- <source>.js shrinks from <X> to <Y> LOC
```

Scope choices: `popup` for popup.js extracts, `background` for background.js extracts, `content` for content-script extracts.

## PR shape

Title: `refactor(<scope>): extract <cluster> helpers to lib/<name>.js`

Body sections:
- **Summary** — what moved + why (cite the umbrella backlog item).
- **Functions extracted** — list with original line numbers.
- **Tests added** — count + key contract assertions.
- **Source file delta** — before/after LOC.
- **Coverage delta** — cite the four metrics.

## Reference history

- PR #74 (#74 was the first extract — `INTENT_PRESETS` to `lib/intent-presets.js`, 6 contract assertions).
- PR #85 + #86 (popup-state — phase 1 introduced the lib + tests; phase 2 swapped call sites in popup.js).
- PR #91 (connect-query — single PR did both lib + call-site swap, since background.js's `importScripts` makes the swap atomic).

## Common pitfalls

1. **Forgetting to delete the original.** If you only add the lib without removing the inline copy, you ship dead code and the `(extract)` framing is dishonest. Either delete the original in the same PR, or rename the PR to `feat(lib): introduce <name> module (phase 1 of B-X / E-X extract)` and queue the swap as phase 2.

2. **Closure variables.** A function that references a module-level `let` outside its definition can't be moved cleanly. Either lift the variable to a parameter, or split the extraction into "stateless tail of function" vs "stateful head."

3. **Test runners that don't auto-load globals.** Jest only loads what's `require()`d. If the extracted functions are referenced in jsdom-style tests via globals, you must `Object.assign(global, require(lib))` in `beforeEach` — see step 7.

4. **Branch coverage regression.** New libs with thin tests can pull the branch coverage threshold down. Always run `--coverage` and cover the early-return + error-fallback branches explicitly.
