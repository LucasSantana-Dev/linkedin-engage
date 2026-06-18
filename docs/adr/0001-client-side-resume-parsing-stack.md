# ADR-0001: Client-side resume parsing stack (PDF.js + mammoth.js)

- **Status:** Accepted
- **Date:** 2026-06-17
- **Deciders:** Lucas Santana
- **Tags:** jobs, bundle-size, vendor, privacy, performance

## Context

The Jobs "career intelligence" feature (added in PR #26, 2026-03-15) parses a
user-supplied résumé entirely client-side and extracts **raw text only**:

- **PDF** via PDF.js — `getTextContent()` (`extension/lib/jobs-career-parser.js:extractTextFromPdf`)
- **DOCX** via mammoth.js — `extractRawText()` (`extension/lib/jobs-career-parser.js:extractTextFromDocx`, L66/69)

These vendored libraries dominate the package: **2.2 MB of the 3.3 MB extension (67%)** —
`pdf.worker.min.mjs` 1.2 MB, `pdf.min.mjs` 435 KB, `mammoth.browser.min.js` 636 KB.

What forced the question: a knowledge-graph build showed the vendor bundles flooding
the graph (≈70% of nodes), prompting "is this the right parsing stack?"

Two facts shape the decision:

1. **Load mechanics differ.** PDF.js is **lazy-loaded** via dynamic
   `import(chrome.runtime.getURL('vendor/pdf.min.mjs'))` only when a PDF is parsed —
   it is *not* on any hot path. mammoth is loaded **eagerly** via a blocking classic
   `<script src="../vendor/mammoth.browser.min.js">` at `popup/popup.html:2133`, so its
   636 KB is parsed/evaluated on **every popup open**, even when no DOCX is ever parsed.
   (Extensions load from local disk, so this is JS parse/compile/eval cost, **not**
   network download — there is no gzip transfer.)
2. **Demand is unknown.** `analytics.js` exposes `recordEngagement()`/`analyticsLog`,
   but the résumé parser never calls it. There is **zero telemetry** on parse volume or
   the PDF-vs-DOCX split. The feature has been live ~3 months with no usage signal.

A governing standard forbids a demand-blind rebuild/migration of a user-facing feature
when usage is unknown — instrument and get data before investing.

## Decision

**Keep PDF.js. Lazy-load mammoth. Instrument usage first. Defer any DOCX-parser rewrite
until demand justifies it.** Specifically, in this order:

1. **Instrument the parser (ship first, independently).** Add a `recordEngagement()`
   call at the single call site (`popup/popup.js:4370`) recording `{ fileType: 'pdf'|'docx', outcome: 'ok'|'failed' }`.
   **PII guard:** record file type and outcome only — never the filename, never any
   extracted text. This is additive, low-risk, and is the gate for everything below.
2. **Lazy-load mammoth.** Replace the eager `<script>` with on-demand loading invoked
   only when a DOCX is selected. Because mammoth is a **UMD global** (`g.mammoth=f()`),
   *not* an ES module like `pdf.min.mjs`, load it by **dynamically injecting a classic
   `<script src=chrome.runtime.getURL('vendor/mammoth.browser.min.js')>`** (or import for
   its global side-effect) — do **not** copy the PDF.js `import().default` pattern.
   Guard with an "already loaded" check (`if (globalThis.mammoth) skip`), wrap in
   `try/catch` with graceful degradation, and record the demand counter on success/failure.
   **Measured (Brave, 5 samples, 2026-06-17):** mammoth parse+eval median **12.2 ms** (cold
   42.5 ms, warm 5–13 ms) vs popup DOMContentLoaded median **42.7 ms** — eager mammoth was
   ~22% of warm popup load, more when cold. Real but modest; the change removes dead
   hot-path work, not a headline UX win. Kept on that basis.

   **Implementation correction (during build):** the proposed `recordEngagement()` was NOT
   used — `computeStats` counts any non-`run` `analyticsLog` entry as an engagement, so a
   `resumeParse` event there would inflate the engagement dashboard. Instead a dedicated
   `resumeParseStats` storage key holds a `tallyResumeParse()` counter (type × outcome),
   keeping engagement analytics clean. PII rule unchanged: type + outcome only.
3. **Keep PDF.js as-is (lazy).** Client-side PDF *text* extraction has no materially
   lighter, equally reliable alternative (unpdf wraps PDF.js; mupdf-wasm ≈2 MB). The
   435 KB core is structural; the 1.2 MB worker already lazy-loads. Server-side parsing
   is rejected — résumés are sensitive PII and client-side-only parsing is a product
   privacy property.
4. **Defer the mammoth → fflate+XML DIY rewrite.** A `.docx` is a ZIP of XML; unzip with
   fflate (~8 KB) + concatenating `<w:t>` nodes could replace 636 KB with ~8 KB. But it
   carries real correctness risk (text runs split across `<w:r>` boundaries, tables,
   headers/footers in separate parts) and has no test corpus. Do **not** undertake it on
   assumed demand.

## Alternatives considered

| Option | Verdict | Why |
|---|---|---|
| Status quo (eager mammoth, no telemetry) | Rejected | Pays 636 KB hot-path eval on every popup open; demand stays unknown forever |
| Replace PDF.js with lighter client-side lib | Rejected | PDF.js is the floor for reliable text extraction; alternatives are bigger (mupdf-wasm ≈2 MB) or wrappers (unpdf) |
| Server-side parsing | Rejected | Résumé = sensitive PII; breaks the client-side-only privacy property |
| Replace mammoth with fflate+XML DIY now | **Deferred** | ~628 KB win but medium correctness risk; gated behind measured DOCX demand |
| Remove the whole career-intelligence feature | Deferred | Cannot decide without usage data; the instrumentation will inform it |

## Consequences

**Positive**
- Removes a blocking 636 KB script eval from the popup hot path (mammoth becomes pay-per-use, matching PDF.js).
- Closes the telemetry blind spot; future decisions about this 2.2 MB of vendor become data-driven.
- All steps are reversible (lazy-load is one-line revert; instrumentation is additive).

**Negative / risk**
- Lazy-loading a UMD global needs care (script-injection + idempotency guard + error
  handling); the naïve `await import()` would only work as an execute-for-side-effect and
  is the wrong mental model.
- First DOCX parse after popup open now incurs the mammoth load it previously paid up front
  (a deliberate latency shift from every-open to first-DOCX-use).

**Neutral**
- Extension install size is unchanged (still ships all three vendor files); this decision
  changes *when* mammoth is evaluated, not whether it is bundled.

## Revisit when

- **DOCX rewrite trigger:** after a telemetry window of **30 days or 50 résumé parses
  (whichever first)** — if DOCX is a **meaningful share (≥~20%)** of parses **and** total
  parse volume is non-trivial, reopen the fflate+XML rewrite (the ~628 KB win then earns
  its test investment). Owner: Lucas.
- **Feature-existence trigger:** if that same window shows résumé-parse volume ≈ zero,
  reopen whether the career-intelligence feature (and all 2.2 MB of vendors) earns its place.
- **PDF floor trigger:** if a materially lighter, reliable client-side PDF *text* extractor
  emerges, reopen the "PDF.js is the floor" assumption.
