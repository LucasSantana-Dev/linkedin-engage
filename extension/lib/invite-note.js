(function(root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
    root.LinkedInInviteNote = api;
    Object.keys(api).forEach(k => { if (typeof root[k] === 'undefined') root[k] = api[k]; });
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
    // LinkedIn free accounts cap invite notes at 200 characters.
    const DEFAULT_INVITE_NOTE_MAX = 200;
    // Look back at most this many chars for a word boundary before hard cutting.
    const WORD_BOUNDARY_WINDOW = 40;

    function resolveMax(maxLength) {
        const n = Math.floor(Number(maxLength));
        return Number.isFinite(n) && n > 0 ? n : DEFAULT_INVITE_NOTE_MAX;
    }

    function fitInviteNote(text, maxLength) {
        const source = typeof text === 'string' ? text : '';
        const max = resolveMax(maxLength);
        if (source.length <= max) return source;

        let cut = source.slice(0, max);
        if (!/\s/.test(source.charAt(max))) {
            const idx = cut.search(/\s\S*$/);
            if (idx > 0 && idx >= max - WORD_BOUNDARY_WINDOW) {
                cut = cut.slice(0, idx);
            }
        }
        return cut.replace(/[\s,;:-]+$/, '');
    }

    return Object.freeze({ DEFAULT_INVITE_NOTE_MAX, fitInviteNote });
});
