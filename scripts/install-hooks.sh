#!/bin/sh
# Install git hooks for linkedin-engage.
# Run once after cloning: sh scripts/install-hooks.sh

HOOKS_DIR="$(git rev-parse --show-toplevel)/.git/hooks"

cat >"$HOOKS_DIR/pre-push" <<'HOOK'
#!/bin/sh
# pre-push hook — run quality gates before every push
# Skippable with: git push --no-verify

set -e

echo "▶ pre-push: lint..."
npm run lint --silent

echo "▶ pre-push: typecheck..."
npm run typecheck --silent

echo "▶ pre-push: test + coverage..."
npm run test:coverage --silent

echo "✓ All gates passed."
HOOK

chmod +x "$HOOKS_DIR/pre-push"
echo "✓ pre-push hook installed at $HOOKS_DIR/pre-push"
