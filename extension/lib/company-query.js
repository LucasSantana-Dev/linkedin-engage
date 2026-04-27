(function(root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.LinkedInCompanyQuery = api;
    Object.keys(api).forEach(function(key) {
        if (typeof root[key] === 'undefined') {
            root[key] = api[key];
        }
    });
})(
    typeof globalThis !== 'undefined' ? globalThis : this,
    function() {
        /**
         * Builds a LinkedIn company search URL from a query string.
         * @param {string} query - The company search query
         * @returns {string} A LinkedIn company search URL
         */
        function buildCompanySearchUrl(query) {
            return 'https://www.linkedin.com/search/results/' +
                'companies/' +
                `?keywords=${encodeURIComponent(query)}` +
                '&origin=FACETED_SEARCH';
        }

        /**
         * Sanitizes a company search query by normalizing quotes, whitespace,
         * and boolean operators.
         * @param {string} value - The query to sanitize
         * @returns {string} The sanitized query
         */
        function sanitizeCompanySearchQuery(value) {
            const normalizedQuotes = String(value || '')
                .replace(/[""]/g, '"')
                .replace(/['']/g, "'");
            const normalizedWhitespace = normalizedQuotes
                .replace(/\s+/g, ' ')
                .trim();
            if (!normalizedWhitespace) return '';

            return normalizedWhitespace
                .replace(/\b(and|or|not)\b/gi, function(match) {
                    return match.toUpperCase();
                })
                .replace(/\b(OR|AND|NOT)\s+(?=\b(OR|AND|NOT)\b)/g, '')
                .replace(/^(OR|AND|NOT)\b\s*/i, '')
                .replace(/\s+\b(OR|AND)\s*$/i, '')
                .trim();
        }

        /**
         * Splits a multi-line company query string into individual sanitized queries.
         * @param {string} value - A potentially multi-line query string
         * @returns {string[]} Array of sanitized, non-empty queries
         */
        function splitCompanySearchQueries(value) {
            return String(value || '')
                .split(/\n+/)
                .map(function(part) {
                    return sanitizeCompanySearchQuery(part);
                })
                .filter(Boolean);
        }

        /**
         * Normalizes an array of company target strings by deduping (case-insensitive)
         * and trimming whitespace.
         * @param {string[]} values - Array of company target strings
         * @returns {string[]} Array of normalized, unique company targets
         */
        function normalizeCompanyTargets(values) {
            const seen = new Set();
            const normalized = [];
            for (const raw of values || []) {
                const clean = String(raw || '').replace(/\s+/g, ' ').trim();
                if (!clean) continue;
                const key = clean.toLowerCase();
                if (seen.has(key)) continue;
                seen.add(key);
                normalized.push(clean);
            }
            return normalized;
        }

        /**
         * Builds a LinkedIn jobs search URL from a query string and optional options.
         * If buildLinkedInJobsSearchUrl is available globally, delegates to it.
         * @param {string} query - The jobs search query
         * @param {object} options - Optional search parameters
         * @returns {string} A LinkedIn jobs search URL
         */
        function buildJobsSearchUrl(query, options) {
            if (typeof buildLinkedInJobsSearchUrl === 'function') {
                return buildLinkedInJobsSearchUrl(query, options);
            }
            return 'https://www.linkedin.com/jobs/search/' +
                `?keywords=${encodeURIComponent(query)}` +
                '&f_AL=true';
        }

        return Object.freeze({
            buildCompanySearchUrl,
            sanitizeCompanySearchQuery,
            splitCompanySearchQueries,
            normalizeCompanyTargets,
            buildJobsSearchUrl
        });
    }
);
