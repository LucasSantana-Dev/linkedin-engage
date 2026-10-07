(function(root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.LinkedInConnectQuery = api;
    Object.keys(api).forEach(function(key) {
        if (typeof root[key] === 'undefined') {
            root[key] = api[key];
        }
    });
})(
    typeof globalThis !== 'undefined' ? globalThis : this,
    function() {
        /**
         * Normalize a connect query term by removing special characters.
         * @param {string} term - The term to normalize
         * @returns {string} The normalized term
         */
        function normalizeConnectQueryTerm(term) {
            return String(term || '')
                .replace(/[()\[\]"]+/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        }

        /**
         * Build a relaxed connect query: at most 3 terms joined by OR (2 operators),
         * so the retry keeps the OR intent and stays under LinkedIn's operator cap.
         * @param {string} query - The original query string
         * @returns {string} The relaxed query
         */
        function buildRelaxedConnectQuery(query) {
            const source = String(query || '').trim();
            if (!source) return '';

            const segments = source
                .split(/\s+(?:OR|AND)\s+/i)
                .map(normalizeConnectQueryTerm)
                .filter(Boolean);

            const uniqueSegments = [];
            for (const term of segments) {
                if (!uniqueSegments.includes(term)) {
                    uniqueSegments.push(term);
                }
            }
            if (uniqueSegments.length > 0) {
                return uniqueSegments.slice(0, 3).join(' OR ');
            }

            const words = source
                .split(/\s+/)
                .map(part => part.replace(/[^\w-]/g, ''))
                .filter(part => part && !/^(AND|OR|NOT)$/i.test(part));

            if (words.length === 0) return source;
            return words.slice(0, 3).join(' OR ');
        }

        /**
         * Build connect search keywords, preserving boolean operators if present.
         * @param {string} query - The query string
         * @returns {string} The keywords string
         */
        function buildConnectSearchKeywords(query) {
            const source = String(query || '').trim();
            if (!source) return '';

            const hasBooleanOps = /\b(AND|OR|NOT)\b/.test(source) ||
                /["()]/.test(source);
            if (hasBooleanOps) {
                return source.replace(/\s+/g, ' ').trim();
            }

            const words = source
                .split(/\s+/)
                .map(part => part.replace(/[^\w-]/g, ''))
                .filter(Boolean);
            if (words.length === 0) return source;
            return words.slice(0, 8).join(' ');
        }

        /**
         * Determine if we should retry a connect search with a relaxed query.
         * @param {Object} result - The run result object
         * @param {Object} launchState - The launch state
         * @returns {boolean} Whether to retry with relaxed query
         */
        function shouldRetryConnectWithRelaxedQuery(result, launchState) {
            if (!launchState || launchState.attempt >= 1) {
                return false;
            }

            const normalized = typeof normalizeRunOutcome === 'function'
                ? normalizeRunOutcome(result, 'connect')
                : result;
            const run = normalized && typeof normalized === 'object'
                ? normalized
                : {};
            if (run.stoppedByUser === true) {
                return false;
            }

            const mode = String(run.mode || 'connect').trim();
            if (mode !== 'connect') {
                return false;
            }

            const runStatus = String(run.runStatus || '').trim().toLowerCase();
            if (runStatus !== 'failed') {
                return false;
            }

            const reason = String(run.reason || '').trim().toLowerCase();
            if (reason === 'challenge' || reason === 'stopped-by-user') {
                return false;
            }

            const processedCount = Math.max(0, Number(run.processedCount) || 0);
            if (reason === 'no-items-processed' || processedCount <= 0) {
                return true;
            }

            return false;
        }

        /**
         * Build a relaxed connect config for retry attempts.
         * Accepts normalizeTemplateMeta as an injected dependency.
         * @param {Object} config - The config object
         * @param {Function} normalizeTemplateMeta - Callback to normalize template metadata
         * @returns {Object|null} The relaxed config or null if query is empty
         */
        function buildRelaxedConnectConfig(config, normalizeTemplateMeta) {
            const source = config && typeof config === 'object'
                ? config
                : {};
            const relaxedQuery = buildRelaxedConnectQuery(source.query);
            if (!relaxedQuery) {
                return null;
            }

            let normalizedTemplateMeta = null;
            if (typeof normalizeTemplateMeta === 'function') {
                normalizedTemplateMeta = normalizeTemplateMeta(
                    {
                        ...(source.templateMeta || {}),
                        operatorCount: countBooleanOperatorsSafe(relaxedQuery),
                        compiledQueryLength: relaxedQuery.length,
                        mode: 'connect'
                    },
                    'connect'
                );
            } else {
                // Fallback: minimal normalization if function not provided
                normalizedTemplateMeta = {
                    templateId: String(source.templateMeta?.templateId || ''),
                    usageGoal: String(source.templateMeta?.usageGoal || ''),
                    expectedResultsBucket: String(
                        source.templateMeta?.expectedResultsBucket || ''
                    ),
                    operatorCount: countBooleanOperatorsSafe(relaxedQuery),
                    compiledQueryLength: relaxedQuery.length,
                    mode: 'connect'
                };
            }

            return {
                ...source,
                query: relaxedQuery,
                activelyHiring: false,
                networkFilter: encodeURIComponent('["S","O"]'),
                connectRelaxAttempt:
                    Math.max(0, Number(source.connectRelaxAttempt) || 0) + 1,
                templateMeta: normalizedTemplateMeta
            };
        }

        /**
         * Count boolean operators in a query string safely.
         * Delegates to global countBooleanOperators if available.
         * @param {string} query - The query string
         * @returns {number} The count of boolean operators
         */
        function countBooleanOperatorsSafe(query) {
            if (typeof countBooleanOperators === 'function') {
                return countBooleanOperators(query || '');
            }
            return String(query || '')
                .split(/\s+/)
                .filter(token => /^(AND|OR|NOT)$/i.test(token))
                .length;
        }

        /**
         * Normalize template metadata. Defaults for usageGoal and
         * expectedResultsBucket come from an injected lazy provider.
         * @param {Object} meta - Raw template metadata
         * @param {string} mode - Search mode (connect, companies, jobs)
         * @param {Function} getDefaults - Returns { usageGoal, expectedResultsBucket }
         * @returns {Object} Normalized metadata
         */
        function normalizeTemplateMetaWithDefaults(meta, mode, getDefaults) {
            const source = meta && typeof meta === 'object'
                ? meta : {};
            return {
                templateId: String(source.templateId || ''),
                usageGoal: String(
                    source.usageGoal || getDefaults().usageGoal
                ),
                expectedResultsBucket: String(
                    source.expectedResultsBucket ||
                    getDefaults().expectedResultsBucket
                ),
                operatorCount: Math.max(
                    0,
                    Number(source.operatorCount) || 0
                ),
                compiledQueryLength: Math.max(
                    0,
                    Number(source.compiledQueryLength) || 0
                ),
                mode
            };
        }

        /**
         * Resolve the connect search plan from already-read popup inputs.
         * DOM-derived values and host helpers are injected.
         * @param {Object} input - tags, templateState, areaPreset, roleTermsLimit,
         *   excludeKeywords, searchLanguageMode
         * @param {Function} normalizeMeta - normalizeTemplateMeta(meta, mode)
         * @param {Function} getSafeRoleTerms - role term sanitizer
         * @returns {Object} Search plan
         */
        function resolveConnectSearchPlan(input, normalizeMeta, getSafeRoleTerms) {
            const tags = input.tags;
            const templateState = input.templateState;
            if (typeof buildSearchTemplatePlan === 'function') {
                const plan = buildSearchTemplatePlan({
                    mode: 'connect',
                    areaPreset: input.areaPreset,
                    usageGoal: templateState.usageGoal,
                    expectedResultsBucket:
                        templateState.expectedResultsBucket,
                    auto: templateState.auto,
                    templateId: templateState.templateId,
                    searchLanguageMode: templateState.searchLanguageMode,
                    selectedTags: tags,
                    roleTermsLimit: input.roleTermsLimit,
                    excludeKeywords: input.excludeKeywords
                });
                if (plan?.query) return plan;
            }

            if (typeof buildConnectQueryFromTags === 'function') {
                const query = buildConnectQueryFromTags(
                    tags,
                    input.roleTermsLimit,
                    input.searchLanguageMode
                );
                return {
                    query,
                    filterSpec: {},
                    defaults: {},
                    meta: normalizeMeta({}, 'connect'),
                    diagnostics: {}
                };
            }
            const safeRoles = getSafeRoleTerms(tags.role);
            const queryTerms = safeRoles
                .concat(tags.industry || [], tags.market || [], tags.level || [])
                .map(term => String(term || '').trim())
                .filter(Boolean);
            return {
                query: queryTerms.join(' OR '),
                filterSpec: {},
                defaults: {},
                meta: normalizeMeta({}, 'connect'),
                diagnostics: {}
            };
        }

        return Object.freeze({
            normalizeConnectQueryTerm,
            buildRelaxedConnectQuery,
            buildConnectSearchKeywords,
            shouldRetryConnectWithRelaxedQuery,
            buildRelaxedConnectConfig,
            countBooleanOperatorsSafe,
            normalizeTemplateMetaWithDefaults,
            resolveConnectSearchPlan
        });
    }
);
