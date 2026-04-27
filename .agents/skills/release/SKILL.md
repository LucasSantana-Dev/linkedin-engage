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

`main` is branch-protected — releases go through a PR, not a direct push.

1. **Sync main**
   ```bash
   git checkout main && git pull --ff-only
   ```

2. **Determine version bump type**
   - `major` — breaking changes (rare)
   - `minor` — new features (`feat` commits)
   - `patch` — bug fixes, tests, chores, perf, docs

3. **Branch + bump versions**
   ```bash
   git checkout -b chore/release-X.Y.Z
   npm version <major|minor|patch> --no-git-tag-version
   sed -i '' 's/"version": "<old>"/"version": "<new>"/' extension/manifest.json
   ```

4. **Update CHANGELOG.md** — leave `## [Unreleased]` empty and insert a new `## [X.Y.Z] - YYYY-MM-DD` section below it. Cite PR numbers and group by `### Performance` / `### Internal` / `### Fixed` / `### Added`.

5. **Commit, push, open PR**
   ```bash
   git add package.json package-lock.json extension/manifest.json CHANGELOG.md
   git commit -m "chore(release): bump version to X.Y.Z"
   git push -u origin chore/release-X.Y.Z
   gh pr create --title "chore(release): bump version to X.Y.Z" --body "..."
   ```

6. **Wait for CI green, then squash-merge**
   ```bash
   gh pr merge <num> --squash --delete-branch
   ```

7. **Tag main and push the tag**
   ```bash
   git checkout main && git pull --ff-only
   git tag -a vX.Y.Z -m "vX.Y.Z: <short description>"
   git push origin vX.Y.Z
   ```

8. **Verify** — the `release.yml` workflow will automatically:
   - Create a GitHub Release with auto-generated notes
   - Build and upload `linkedin-engage-vX.Y.Z.zip` as a release asset

Confirm via `gh release list --limit 3` and `gh run list --workflow release.yml --limit 3`.

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
