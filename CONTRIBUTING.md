# Contributing to linkedin-engage

This is a Chrome MV3 extension. No build step — `extension/` is shipped to Chrome verbatim.

## Quick setup

```bash
git clone https://github.com/LucasSantana-Dev/linkedin-engage
cd linkedin-engage
npm install
npm run install-hooks   # installs pre-commit + pre-push git hooks
```

Then load the unpacked `extension/` folder at `chrome://extensions` (Developer Mode → Load unpacked).

## Local git hooks

`scripts/install-hooks.sh` installs two `.git/hooks/` scripts:

| Hook | What it does | Bypass |
|---|---|---|
| `pre-commit` | Scans staged additions for credential prefixes (JWT `eyJ`, Google API `AIza`, OpenAI `sk-`, LinkedIn `li_at` cookies). | `git commit --no-verify` |
| `pre-push` | Runs `npm run lint`, `npm run typecheck`, `npm run test:coverage`. Fails the push if any gate fails. | `git push --no-verify` |

Re-run `npm run install-hooks` after pulling changes to the install script — hooks live per-clone in `.git/hooks/` and are not auto-updated.

## Quality gates (must pass on every PR)

| Command | What it checks |
|---|---|
| `npm run lint` | ESLint flat config (`eslint.config.js`). |
| `npm run typecheck` | `tsc -p tsconfig.typecheck.json --noEmit` (`allowJs`, `checkJs: false`). |
| `npm test` | Jest, jest-environment-jsdom for DOM-touching modules. |
| `npm run test:coverage` | Same, with `--coverage`. |

**Coverage thresholds** (enforced in `jest.config.cjs`): 96% statements / 85.7% branches / 99% functions / 97.5% lines for `extension/lib/**`.

## Branch protection on `main`

The required CI status checks are:

- `test (18)`, `test (20)`, `test (22)` — Jest on Node 18 / 20 / 22 matrix
- `portability` — `scripts/check-path-portability.sh`

`strict` is enabled — branches must be up-to-date with `main` before merge. Force-push and branch deletion are blocked. Squash merge is the convention.

## Commit conventions

Conventional Commits with these prefixes:

| Prefix | When |
|---|---|
| `feat(scope): …` | New user-visible feature |
| `fix(scope): …` | Bug fix |
| `refactor(scope): …` | Code restructure with no behavior change |
| `test(scope): …` | Test additions or corrections |
| `chore(scope): …` | CI, deps, config, release bumps |
| `docs(scope): …` | Documentation only |

Common scopes: `connect`, `companies`, `jobs`, `feed`, `filters`, `popup`, `bridge`, `runtime`, `release`, `deps`, `scripts`, `search`.

Co-author trailers go in the commit body, not the title.

## Pull request flow

1. Branch off `main`. Naming: `<type>/<short-slug>` (e.g. `fix/relax-retry-double-tab`).
2. Push and open via `gh pr create`. The PR template (`.github/pull_request_template.md`) drives the description.
3. CI runs immediately — wait for all 7 required checks to land green.
4. Squash-merge with `gh pr merge <num> --squash --delete-branch`.

The PR title becomes the squash-merge commit message — keep it tight and conventional.

## Releasing

The release flow is encoded in `.agents/skills/release/SKILL.md`. Short version:

```bash
git checkout main && git pull
npm version patch --no-git-tag-version    # also try minor / major as fits
# bump extension/manifest.json "version" to match
# add a [X.Y.Z] - YYYY-MM-DD section to CHANGELOG.md
git checkout -b chore/release-X.Y.Z
git add package.json package-lock.json extension/manifest.json CHANGELOG.md
git commit -m "chore(release): bump version to X.Y.Z"
git push -u origin chore/release-X.Y.Z
gh pr create --title "chore(release): bump version to X.Y.Z" --body …
# wait for CI, merge
git checkout main && git pull
git tag -a vX.Y.Z -m "vX.Y.Z: <short description>"
git push origin vX.Y.Z
```

The tag push triggers `.github/workflows/release.yml`, which packages `extension/` as `linkedin-engage-vX.Y.Z.zip` and attaches it to a new GitHub Release.

## Project layout

| Path | Contents |
|---|---|
| `extension/lib/` | 33+ pure-logic UMD modules — testable in Node, also imported via `<script>` in popup/options and `importScripts` in the service worker. |
| `extension/popup/` | Popup UI (`popup.html` + `popup.js`). |
| `extension/background.js` | MV3 service worker. |
| `extension/content.js`, `feed-engage.js`, `company-follow.js`, `jobs-assist.js` | Content scripts. |
| `extension/_locales/` | EN + PT-BR i18n catalogs (full parity required). |
| `tests/` | Jest test suites. |
| `.agents/skills/` | Project skills (`release`, `verify`, `area-preset-authoring`, `extension-i18n-search-l10n`). |
| `.claude/plans/` | Local backlog notes (gitignored). |

## Conventions worth knowing

- **No build step.** Extension code runs raw in Chrome.
- **UMD pattern** for `extension/lib/*.js`: `(function(root, factory) { … })` so the same file works in `require()` (Node tests) and `<script>` / `importScripts` (Chrome).
- **`STATE_TAG_VERSION`** in `extension/lib/connect-config.js` must be bumped when adding presets that change saved-state shape (triggers migration). Pure additive changes do not need a bump.
- **EN / PT-BR full parity.** Both `extension/_locales/*/messages.json` files share the same key set.
- **Dark-only UI.** No light-theme support.
- **Trunk-based.** PRs target `main`; squash merge.
- **Vendored `pdf.min.mjs` + `pdf.worker.min.mjs`** in `extension/vendor/` are copies of `pdfjs-dist@<package.json pinned version>` `build/` artifacts. To rebuild after a version bump: `cp node_modules/pdfjs-dist/build/pdf.min.mjs extension/vendor/pdf.min.mjs && cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs extension/vendor/pdf.worker.min.mjs`. Used at runtime by `extension/lib/jobs-career-parser.js` for resume PDF text extraction.
