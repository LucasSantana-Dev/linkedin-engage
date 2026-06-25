// Shared no-results detector used by both Connect (invite-utils) and
// Companies (company-utils) automation paths. Single source of truth —
// previously the two paths had separate, drifting implementations.

function detectNoSearchResults(root, opts) {
    const o = opts || {};
    if (o.resultsCountHint === 0) return true;
    const el = root || (typeof document !== 'undefined' ? document : null);
    if (!el || !el.querySelectorAll) return false;
    // Anchored on "no results" rather than "no results found" so that
    // adjacent block-level siblings (h2 + p) whose textContent concatenates
    // without whitespace still match.
    const patterns =
        /\bno results\b|nenhum resultado(?: encontrado)?|\b0\s*results?\b|\b0\s*resultados?\b/i;
    const selectors = [
        '.search-no-results',
        '.search-reusables__no-results',
        '.search-results-container__no-results-message',
        '.artdeco-empty-state',
        'main'
    ];
    for (const selector of selectors) {
        const nodes = el.querySelectorAll(selector);
        for (const node of nodes) {
            const text = (node.innerText || node.textContent || '')
                .replace(/\s+/g, ' ')
                .trim();
            if (patterns.test(text)) return true;
        }
    }
    // Independent signal: a dedicated results-count header that parses to
    // exactly 0. Catches layouts where the count lives outside the
    // empty-state/main scope. Requires the word "results"/"resultados" so
    // unrelated "0 X" phrases (e.g. "0 endorsements") never trigger.
    const countSelectors = [
        '[data-test-search-results-count]',
        '.search-results__total',
        '.search-results-container__text',
        'h2 span',
        'h2'
    ];
    const countPattern = /([\d][\d.,]*)\s*(?:results?|resultados?)/i;
    for (const selector of countSelectors) {
        const nodes = el.querySelectorAll(selector);
        for (const node of nodes) {
            const text = (node.innerText || node.textContent || '')
                .replace(/\s+/g, ' ')
                .trim();
            const match = text.match(countPattern);
            if (!match) continue;
            const digits = match[1].replace(/[^\d]/g, '');
            if (digits && parseInt(digits, 10) === 0) return true;
        }
    }
    if (patterns.test(o.resultsCountText || '')) return true;
    const bodyText = (el.body?.innerText || el.body?.textContent || '')
        .replace(/\s+/g, ' ')
        .trim();
    return patterns.test(bodyText);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { detectNoSearchResults };
}
