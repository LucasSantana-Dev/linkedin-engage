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

cat >"$HOOKS_DIR/pre-commit" <<'HOOK'
#!/bin/sh
# pre-commit hook — scan staged additions for common credential patterns.
# Skippable with: git commit --no-verify
#
# Regexes match well-known secret prefixes only (low false-positive rate):
#   - JWTs:           eyJ<base64>.<base64>.<base64>
#   - Google API:     AIza[35 char id]
#   - OpenAI keys:    sk-[32+ char id]
#   - LinkedIn auth:  li_at=<token>  (this repo handles LinkedIn sessions)

set -e

PATTERNS='eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|AIza[0-9A-Za-z_-]{35}|sk-[A-Za-z0-9]{32,}|li_at[=:][[:space:]]*[A-Za-z0-9_-]{20,}'

# Only scan staged additions — modified hunks plus newly added files.
# -U0 keeps context out so we do not false-match on surrounding code.
HITS=$(git diff --cached --diff-filter=AM -U0 \
    | grep -nE "^\+" \
    | grep -vE "^\+\+\+" \
    | grep -E "$PATTERNS" || true)

if [ -n "$HITS" ]; then
    echo "✗ pre-commit: possible credential in staged content:" >&2
    echo "$HITS" >&2
    echo "" >&2
    echo "  Remove the secret, or use 'git commit --no-verify' if this is a false positive." >&2
    exit 1
fi
HOOK

chmod +x "$HOOKS_DIR/pre-commit"
echo "✓ pre-commit hook installed at $HOOKS_DIR/pre-commit"
