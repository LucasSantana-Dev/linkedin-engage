#!/usr/bin/env bash
# Refresh extension/vendor/ from node_modules (pdfjs-dist + mammoth).
# Run after bumping pdfjs-dist or mammoth in package.json and `npm install`.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENDOR="$ROOT/extension/vendor"
NM="$ROOT/node_modules"

SOURCES=(
    "$NM/pdfjs-dist/build/pdf.min.mjs"
    "$NM/pdfjs-dist/build/pdf.worker.min.mjs"
    "$NM/mammoth/mammoth.browser.min.js"
)

for src in "${SOURCES[@]}"; do
    if [ ! -f "$src" ]; then
        echo "update-vendor: missing source: ${src#"$ROOT"/} (run npm install)" >&2
        exit 1
    fi
done

mkdir -p "$VENDOR"
for src in "${SOURCES[@]}"; do
    cp "$src" "$VENDOR/$(basename "$src")"
    echo "copied $(basename "$src")"
done

pkg_version() {
    sed -n 's/^[[:space:]]*"version":[[:space:]]*"\([^"]*\)".*/\1/p' "$NM/$1/package.json" | head -n 1
}
echo "pdfjs-dist $(pkg_version pdfjs-dist)"
echo "mammoth $(pkg_version mammoth)"
