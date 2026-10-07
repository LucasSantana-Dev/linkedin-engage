# DESIGN.md: LinkedIn Engage popup

Locked 2026-10-07. Every extension surface (popup, options dashboard) reuses these tokens. Do not invent a competing palette.

## Register and anchor

- **Register:** `product-app`: a dense settings-and-run tool panel, used daily by one person.
- **Owner anchor (chosen by recognition, 2026-10-07):**
  - **Closest:** Linear (3) and the 1Password popup (2).
  - **Farthest:** native LinkedIn (4).
- **Contract:**
  - Linear supplies the skin: quiet dark neutrals, a single indigo accent, small precise type, hairline borders, no glow.
  - 1Password's popup supplies the structure: one task per view, grouped list rows, and a primary action always reachable at the bottom.
  - Never LinkedIn's blue (#0a66c2) or its card chrome.
- **Owner feedback driving this:** the old popup was "muito poluído, pouco intuitivo". It had 9 stacked accordions, the language picker in the hero, feature toggles overlapping the Jobs form, and a white query textarea on dark.

## Information architecture

1. **Header (48px):**
   - Left: the wordmark "LinkedIn Engage".
   - Right: a settings button (gear icon, `aria-label`).
   - Nothing else lives in the header.
2. **Mode tabs:** a segmented control with 4 tabs, `role="tablist"`, arrow-key navigation.
   - Tabs: Connect · Companies · Jobs · Withdraw.
   - Withdraw is a full mode now, not a buried section.
3. **Mode body (the only scrolling region):**
   - **Essentials card:** preset, query, plus at most 2 high-value fields.
   - **One "More filters" disclosure group** per mode. Its rows are grouped like 1Password list sections: a small title, then hairline-separated rows.
   - **Compiled query:** a read-only mono preview with an "Edit" text button.
4. **Sticky footer (always visible):**
   - A status line with an `aria-live="polite"` region.
   - A per-run limit stepper.
   - The primary button: "Start <mode>" becomes "Stop" while running.
5. **Settings view** (opened by the gear, Esc or a back button returns): UI language, feature toggles, weekly/daily quotas and warm-up, Recent connections, and an "Open dashboard" link.

## Tokens

Dark is primary. Light (`prefers-color-scheme: light`) mirrors the same roles.

| Role | Dark (OKLCH) | Light (OKLCH) |
|---|---|---|
| `--bg` | 0.17 0.008 275 | 0.985 0.003 275 |
| `--surface` (cards, rows) | 0.205 0.009 275 | 1 0 0 |
| `--surface-2` (inputs, hover) | 0.235 0.010 275 | 0.965 0.004 275 |
| `--border` (hairline) | 0.29 0.012 275 | 0.90 0.006 275 |
| `--fg` | 0.95 0.004 275 | 0.22 0.010 275 |
| `--muted` | 0.70 0.014 275 | 0.50 0.014 275 |
| `--accent` (buttons, selected tab) | 0.56 0.16 277 | 0.52 0.17 277 |
| `--accent-fg` (text on accent) | 0.985 0.004 277 | 0.99 0.003 277 |
| `--accent-text` (links on bg) | 0.76 0.11 277 | 0.48 0.17 277 |
| `--success` | 0.74 0.15 150 | 0.52 0.14 150 |
| `--warning` | 0.81 0.14 80 | 0.58 0.13 70 |
| `--danger` | 0.67 0.19 25 | 0.55 0.20 25 |

Contrast targets (WCAG 2.2): body text ≥4.5:1 on `--bg` and `--surface`; `--accent-fg` on `--accent` ≥4.5:1; focus ring ≥3:1.

**Type** (personal use on macOS, no network font):

| Role | Face | Size / weight |
|---|---|---|
| UI | `-apple-system, "SF Pro Text", system-ui` | Body 13px/400, labels 12px/500, group titles 11px/600 sentence case with `--muted`, header 14px/700 |
| Mono | `ui-monospace, "SF Mono", Menlo` | Compiled query, counters; `font-variant-numeric: tabular-nums` |

**Spacing:** 4px base. Steps are 4 · 8 · 12 · 16 · 24 · 32.
- 12px: card padding.
- 8px: row gap.
- 16px: section gap.

**Radius:**
- 6px: inputs and buttons.
- 10px: cards and the settings view groups.
- 999px: the segmented-control thumb and status pills.

**Elevation:** none on cards (hairline border only). The sticky footer gets a 1px top border plus a two-part shadow: `0 -1px 0 var(--border), 0 -8px 16px oklch(0 0 0 / 0.25)`.

**Motion:**
- 120ms for hover and press, 200ms for tab and disclosure transitions, ease `cubic-bezier(0.2, 0, 0, 1)`.
- No bounce.
- All motion is off under `prefers-reduced-motion`.

**Focus:** `:focus-visible` gets a 2px `--accent-text` ring with a 2px offset. Never remove an outline without this replacement.

**Popup frame:**
- Width 380px.
- Max height 600px (Chrome's popup limit).
- The body is a 3-row grid (header+tabs / scroll / footer), so the footer never scrolls away.

## Component states

Every control designs default, hover, focus-visible, active, disabled, loading, empty, error:
- **Start button:** "Starting…" with a spinner while the run boots, then becomes "Stop".
- **Errors:** inline under the field with `aria-describedby`.
- **Run results:** land in the footer status line.

## Rules

- No inline `style=""` in markup. Classes only. JS toggles classes or the `hidden` attribute.
- Every new string gets keys in `_locales/en` and `_locales/pt_BR` (`[A-Za-z0-9_]` only).
- No emoji as icons. Use inline SVG, 16px, `currentColor`, `aria-hidden="true"`.
- No em or en dashes in UI copy.
