(function(root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.LinkedInTextUtils = api;
    Object.keys(api).forEach(function(key) {
        if (typeof root[key] === 'undefined') {
            root[key] = api[key];
        }
    });
})(
    typeof globalThis !== 'undefined' ? globalThis : this,
    function() {
        'use strict';

        // Canonical accent regex for Unicode combining diacritical marks (U+0300–U+036F)
        const ACCENT_REGEX = /[̀-ͯ]/g;

        /**
         * Remove diacritical marks (accents) from a string using NFD normalization.
         * @param {*} str - The input (will be coerced to string)
         * @returns {string} The accent-stripped string
         */
        function stripAccents(str) {
            const s = str == null ? '' : String(str);
            return s.normalize('NFD').replace(ACCENT_REGEX, '');
        }

        /**
         * Normalize text for searching: NFD + strip accents + lowercase + trim.
         * Useful for case-insensitive, accent-insensitive search.
         * @param {*} value - The input (will be coerced to string)
         * @returns {string} The normalized string
         */
        function normalizeToSearch(value) {
            return stripAccents(value).toLowerCase().trim();
        }

        return Object.freeze({ stripAccents, normalizeToSearch });
    }
);
