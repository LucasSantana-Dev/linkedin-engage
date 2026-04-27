(function(root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.LinkedInCopyGuard = api;
    Object.keys(api).forEach(function(key) {
        if (typeof root[key] === 'undefined') {
            root[key] = api[key];
        }
    });
})(
    typeof globalThis !== 'undefined' ? globalThis : this,
    function() {
        /**
         * Normalize text for comparison by lowercasing, removing punctuation, collapsing whitespace.
         * @param {string} text - The text to normalize
         * @returns {string} The normalized text
         */
        function normalizeCompareText(text) {
            return (text || '')
                .toLowerCase()
                .replace(/[^\p{L}\p{N}\s]/gu, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        }

        /**
         * Stop words used in copy guard analysis.
         * @type {Set<string>}
         */
        var COPY_GUARD_STOP_WORDS = new Set([
            'the', 'and', 'for', 'with', 'that', 'this',
            'from', 'are', 'was', 'were', 'have', 'has',
            'had', 'you', 'your', 'our', 'their', 'just',
            'very', 'more', 'about', 'como', 'para', 'com',
            'uma', 'que', 'isso', 'esse', 'essa', 'muito',
            'mais', 'dos', 'das', 'nos', 'nas', 'de', 'em'
        ]);

        /**
         * Normalize text for copy guard by lowercasing, NFD-normalizing (removing diacritics),
         * removing punctuation, and collapsing whitespace.
         * @param {string} text - The text to normalize
         * @returns {string} The normalized text
         */
        function normalizeCopyGuardText(text) {
            return (text || '')
                .toLowerCase()
                .normalize('NFD')
                .replace(/[̀-ͯ]/g, '')
                .replace(/[^\p{L}\p{N}\s]/gu, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        }

        /**
         * Tokenize text for copy guard by normalizing, splitting, and filtering
         * for tokens with length >= 3 and not in stop words.
         * @param {string} text - The text to tokenize
         * @returns {string[]} The tokens
         */
        function tokenizeCopyGuard(text) {
            return normalizeCopyGuardText(text)
                .split(' ')
                .map(function(token) {
                    return token.trim();
                })
                .filter(function(token) {
                    return token.length >= 3 &&
                        !COPY_GUARD_STOP_WORDS.has(token);
                });
        }

        /**
         * Extract 4-word contiguous snippets from a token array.
         * For N tokens, returns N-3 snippets (sliding window of size 4).
         * @param {string[]} tokens - The tokens
         * @returns {Set<string>} The 4-word snippets
         */
        function extractFourWordSnippets(tokens) {
            var snippets = new Set();
            if (!Array.isArray(tokens) || tokens.length < 4) {
                return snippets;
            }
            for (var i = 0; i <= tokens.length - 4; i++) {
                snippets.add(tokens.slice(i, i + 4).join(' '));
            }
            return snippets;
        }

        /**
         * Build a set of 3-character trigrams from text.
         * For text with length < 3, returns a set containing the text itself.
         * @param {string} text - The text
         * @returns {Set<string>} The trigrams
         */
        function buildCharTrigramSet(text) {
            var normalized = normalizeCopyGuardText(text);
            var compact = normalized.replace(/\s+/g, ' ').trim();
            var grams = new Set();
            if (!compact) return grams;
            if (compact.length < 3) {
                grams.add(compact);
                return grams;
            }
            for (var i = 0; i <= compact.length - 3; i++) {
                grams.add(compact.slice(i, i + 3));
            }
            return grams;
        }

        /**
         * Round a numeric value to 3 decimal places.
         * @param {number} value - The value to round
         * @returns {number} The rounded value
         */
        function roundCopyMetric(value) {
            return Math.round((Number(value) || 0) * 1000) / 1000;
        }

        /**
         * Compute the containment ratio of baseTokens within referenceTokens.
         * Returns 0 if baseTokens is empty, otherwise the ratio of found tokens to total.
         * @param {string[]} baseTokens - The base tokens
         * @param {string[]} referenceTokens - The reference tokens
         * @returns {number} The containment ratio [0, 1]
         */
        function computeTokenContainment(baseTokens, referenceTokens) {
            if (!Array.isArray(baseTokens) || baseTokens.length === 0) {
                return 0;
            }
            var referenceSet = new Set(referenceTokens || []);
            var overlap = 0;
            for (var token of baseTokens) {
                if (referenceSet.has(token)) overlap++;
            }
            return overlap / baseTokens.length;
        }

        /**
         * Compute Jaccard similarity between two sets.
         * Returns 0 if both sets are empty, otherwise intersection / union.
         * @param {Set} setA - The first set
         * @param {Set} setB - The second set
         * @returns {number} The Jaccard similarity [0, 1]
         */
        function computeJaccardSimilarity(setA, setB) {
            var a = setA instanceof Set ? setA : new Set();
            var b = setB instanceof Set ? setB : new Set();
            if (a.size === 0 && b.size === 0) return 0;
            var intersection = 0;
            for (var value of a) {
                if (b.has(value)) intersection++;
            }
            var unionSize = a.size + b.size - intersection;
            if (unionSize <= 0) return 0;
            return intersection / unionSize;
        }

        /**
         * Assess the copy risk of a comment against a list of existing comments.
         * Returns diagnostics including risk level and the rule that triggered it.
         * @param {string} comment - The comment to assess
         * @param {Object[]} existingComments - List of existing comment objects with text property
         * @returns {Object} Diagnostics with risky, tokenOverlap, charSimilarity, matchedSnippet, ruleHit
         */
        function assessCommentCopyRisk(comment, existingComments) {
            var normalized = normalizeCopyGuardText(comment);
            var commentTokens = tokenizeCopyGuard(comment);
            var commentSnippets = extractFourWordSnippets(commentTokens);
            var commentTrigrams = buildCharTrigramSet(comment);
            var diagnostics = {
                risky: false,
                tokenOverlap: 0,
                charSimilarity: 0,
                matchedSnippet: '',
                ruleHit: null
            };
            var list = Array.isArray(existingComments)
                ? existingComments : [];
            var bestRank = 99;
            for (var item of list) {
                var priorText = String(item?.text || '').trim();
                if (!priorText) continue;
                var priorNormalized = normalizeCopyGuardText(priorText);
                var priorTokens = tokenizeCopyGuard(priorText);
                var tokenOverlap = computeTokenContainment(
                    commentTokens, priorTokens
                );
                var charSimilarity = computeJaccardSimilarity(
                    commentTrigrams,
                    buildCharTrigramSet(priorText)
                );
                var priorSnippets = extractFourWordSnippets(priorTokens);
                var matchedSnippet = '';
                for (var snippet of commentSnippets) {
                    if (priorSnippets.has(snippet)) {
                        matchedSnippet = snippet;
                        break;
                    }
                }
                var rank = 0;
                var ruleHit = null;
                if (normalized && priorNormalized &&
                    normalized === priorNormalized) {
                    rank = 1;
                    ruleHit = 'exact-normalized';
                } else if (matchedSnippet) {
                    rank = 2;
                    ruleHit = 'shared-4gram';
                } else if (tokenOverlap >= 0.72) {
                    rank = 3;
                    ruleHit = 'high-token-containment';
                } else if (tokenOverlap >= 0.62 &&
                    charSimilarity >= 0.82) {
                    rank = 4;
                    ruleHit = 'medium-token-high-char';
                } else if (commentTokens.length > 0 &&
                    commentTokens.length <= 4 &&
                    (tokenOverlap >= 0.9 ||
                        charSimilarity >= 0.9)) {
                    rank = 5;
                    ruleHit = 'short-near-clone';
                }
                if (!ruleHit) continue;
                if (rank < bestRank ||
                    (rank === bestRank && (
                        tokenOverlap > diagnostics.tokenOverlap ||
                        charSimilarity > diagnostics.charSimilarity
                    ))) {
                    bestRank = rank;
                    diagnostics = {
                        risky: true,
                        tokenOverlap: roundCopyMetric(tokenOverlap),
                        charSimilarity: roundCopyMetric(charSimilarity),
                        matchedSnippet: matchedSnippet || '',
                        ruleHit
                    };
                }
            }
            return diagnostics;
        }

        return Object.freeze({
            normalizeCompareText,
            COPY_GUARD_STOP_WORDS,
            normalizeCopyGuardText,
            tokenizeCopyGuard,
            extractFourWordSnippets,
            buildCharTrigramSet,
            roundCopyMetric,
            computeTokenContainment,
            computeJaccardSimilarity,
            assessCommentCopyRisk
        });
    }
);
