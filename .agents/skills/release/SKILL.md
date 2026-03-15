---
name: release
description: Ship a release — bump version, update manifest + changelog, tag, push. Use when the user says /ship or wants to release after a PR merge.
metadata:
  owner: linkedin-engage
  tier: project
---

# Release

Automate the release flow after merging PRs to main.

## When to use

- After merging a PR to main
- When the user says `/ship` or "release"
- After a feature or fix lands and needs a version bump

## Steps

1. **Ensure on main and up to date**
   ```bash
   git checkout main && git pull origin main
   ```

2. **Determine version bump type**
   - `major` — breaking changes (rare)
   - `minor` — new features (feat commits)
   - `patch` — bug fixes, tests, chores

3. **Bump version** (updates package.json + package-lock.json)
   ```bash
   npm version <major|minor|patch> --no-git-tag-version
   ```

4. **Update manifest.json** to match the new version
   ```
   "version": "<new-version>"
   ```

5. **Update CHANGELOG.md** — move `[Unreleased]` content into a new versioned section:
   ```markdown
   ## [X.Y.Z] - YYYY-MM-DD

   ### Added / Changed / Fixed
   - Description from the merged PR(s)
   ```

6. **Commit the release**
   ```bash
   git add package.json package-lock.json extension/manifest.json CHANGELOG.md
   git commit -m "chore(release): bump version to X.Y.Z"
   ```

7. **Tag and push**
   ```bash
   git tag -a vX.Y.Z -m "vX.Y.Z: <short description>"
   git push origin main --tags
   ```

8. **Verify** — the `release.yml` workflow will automatically:
   - Create a GitHub Release with auto-generated notes
   - Build and upload `linkedin-engage-vX.Y.Z.zip` as a release asset

## Files modified per release

| File | Change |
|---|---|
| `package.json` | version field |
| `package-lock.json` | version field (auto-updated by npm version) |
| `extension/manifest.json` | version field |
| `CHANGELOG.md` | New versioned section |

## Version conventions

- `feat(...)` commits → minor bump
- `fix(...)` / `test(...)` / `chore(...)` commits → patch bump
- Breaking changes → major bump (announce in changelog)
