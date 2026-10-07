(function(root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.LinkedInPopupRunResult = api;
    Object.keys(api).forEach(function(key) {
        if (typeof root[key] === 'undefined') {
            root[key] = api[key];
        }
    });
})(
    typeof globalThis !== 'undefined' ? globalThis : this,
    function() {
        function deriveDoneRunStatus(response) {
            const source = response && typeof response === 'object'
                ? response
                : {};
            const direct = String(source.runStatus || '').toLowerCase();
            if (direct === 'success' || direct === 'failed' ||
                direct === 'canceled') {
                return direct;
            }
            const text = String(
                source.error || source.message || source.reason || ''
            ).toLowerCase();
            const reason = String(source.reason || '').toLowerCase();
            const stepCode = String(source.stepCode || '').toLowerCase();
            const isCompanyNoResults = source.mode === 'companies' && (
                reason === 'no-results' ||
                stepCode === 'no-results' ||
                Array.isArray(source.log) &&
                    source.log.some((entry) => String(entry?.status || '')
                        .toLowerCase() === 'skipped-no-results')
            );
            if (isCompanyNoResults) {
                return 'success';
            }
            if (source.stoppedByUser === true ||
                /stopped by user|canceled by user|cancelled by user/.test(text)) {
                return 'canceled';
            }
            const processed = Number(
                source.processedCount ?? source.processedPosts
            ) || 0;
            if (String(source.error || '').trim()) {
                return 'failed';
            }
            if (processed <= 0) {
                return 'failed';
            }
            return source.success === false ? 'failed' : 'success';
        }

        function buildDoneFailureMessage(response, tr, resultText) {
            const reason = String(response?.reason || '').trim().toLowerCase();
            const stepCode = String(response?.stepCode || '').trim().toLowerCase();
            const isCompaniesMode = response?.mode === 'companies';
            const reasonMessages = isCompaniesMode
                ? {
                    'follow-not-confirmed': tr(
                        'popup.company.followNotConfirmed',
                        null,
                        'Follow click attempted but could not be confirmed on LinkedIn UI.'
                    ),
                    'no-target-matches': tr(
                        'popup.company.noTargetMatches',
                        null,
                        'No company matched the target filter for this run.'
                    ),
                    'already-following-only': tr(
                        'popup.company.alreadyFollowingOnly',
                        null,
                        'All matched companies were already followed.'
                    ),
                    'cards-timeout': tr(
                        'popup.company.cardsTimeout',
                        null,
                        'LinkedIn did not load company results in time. Try again.'
                    )
                }
                : {
                    'follow-not-confirmed':
                        'Follow click attempted but could not be confirmed on LinkedIn UI.',
                    'no-target-matches':
                        'No company matched the target filter for this run.',
                    'already-following-only':
                        'All matched companies were already followed.'
                };
            if (reasonMessages[reason]) {
                return reasonMessages[reason];
            }
            if (isCompaniesMode && stepCode === 'cards-timeout') {
                return reasonMessages['cards-timeout'];
            }
            const rawText = response?.error || response?.message;
            if (rawText) return resultText(response, rawText);
            return tr(
                'popup.runNoItemsProcessed',
                null,
                'No items processed.'
            );
        }

        return Object.freeze({
            deriveDoneRunStatus,
            buildDoneFailureMessage
        });
    }
);
