(function(root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.LinkedInPopupState = api;
    Object.keys(api).forEach(function(key) {
        if (typeof root[key] === 'undefined') {
            root[key] = api[key];
        }
    });
})(
    typeof globalThis !== 'undefined' ? globalThis : this,
    function() {
        // State shape defaults for each mode's settings
        const DEFAULT_POPUP_STATE = Object.freeze({
            tags: {},
            currentMode: 'connect',
            goalMode: 'passive',
            areaPreset: 'custom',
            connectUsageGoal: 'recruiter_outreach',
            connectExpectedResults: 'balanced',
            connectTemplateAuto: true,
            connectTemplateId: '',
            connectSearchLanguageMode: 'auto',
            roleTermsLimit: 6,
            excludedCompanies: '',
            excludeKeywords: '',
            yearsMin: '',
            yearsMax: '',
            skipOpenToWorkRecruiters: false,
            skipJobSeekingSignals: false,
            limit: 150,
            region: '',
            activelyHiring: false,
            engagementOnly: false,
            followFallback: true,
            followFirstMode: false,
            followMax: 40,
            intentPreset: 'custom',
            degree2nd: true,
            degree3rd: false,
            sendNote: true,
            activeTemplate: 'networking',
            customNote: '',
            customQuery: '',
            useCustomQuery: false,
            scheduleEnabled: false,
            scheduleInterval: 'daily',
            savedQueries: '',
            companyAreaPreset: 'custom',
            companyUsageGoal: 'talent_watchlist',
            companyExpectedResults: 'balanced',
            companyTemplateAuto: true,
            companyTemplateId: '',
            companySearchLanguageMode: 'auto',
            companyQuery: '',
            companyLimit: 50,
            targetCompanies: '',
            jobsAreaPreset: 'custom',
            jobsUsageGoal: 'high_fit_easy_apply',
            jobsExpectedResults: 'balanced',
            jobsTemplateAuto: true,
            jobsTemplateId: '',
            jobsSearchLanguageMode: 'auto',
            jobsQuery: '',
            jobsRoleTerms: '',
            jobsKeywordTerms: '',
            jobsLocationTerms: '',
            jobsPreferredCompanies: '',
            jobsExcludedCompanies: '',
            jobsExperienceLevel: '',
            jobsWorkType: '',
            jobsLocation: '',
            jobsEasyApplyOnly: false,
            jobsUseCareerIntelligence: false,
            jobsBrazilOffshoreFriendly: false,
            feedReact: false,
            feedComment: false,
            feedWarmupEnabled: false,
            feedWarmupRunsRequired: 2,
            aiApiKey: '',
            commentTemplates: '',
            skipKeywords: '',
            skipKeywordsTemplate: '',
            companyScheduleEnabled: false,
            companyScheduleInterval: 'daily',
            companyBatchSize: '10',
            feedScheduleEnabled: false,
            feedScheduleInterval: 'daily',
            smartMode: false,
            nurtureScheduleEnabled: false,
            nurtureScheduleInterval: 'daily',
            nurturePostLimit: '5',
            ui: {},
            tagVersion: 5
        });

        /**
         * Load popup state from chrome.storage.local with migration.
         * Calls migrateConnectPopupState if available (from connect-config.js).
         * @param {Function} migrateConnectPopupState - Optional migration function
         * @returns {Promise<Object>} - Resolved state object
         */
        function loadPopupState(migrateConnectPopupState) {
            return new Promise((resolve) => {
                chrome.storage.local.get(
                    ['popupState', 'uiLanguageMode'],
                    ({ popupState, uiLanguageMode }) => {
                        if (!popupState) {
                            resolve({
                                state: null,
                                uiLanguageMode: uiLanguageMode || 'auto'
                            });
                            return;
                        }

                        let migratedState = popupState;
                        if (typeof migrateConnectPopupState === 'function') {
                            const migration = migrateConnectPopupState(popupState);
                            migratedState = migration.state;
                            // Persist migration if state changed
                            if (migration.changed) {
                                chrome.storage.local.set({
                                    popupState: migratedState
                                }, () => {});
                            }
                        }

                        resolve({
                            state: migratedState,
                            uiLanguageMode: uiLanguageMode || 'auto'
                        });
                    }
                );
            });
        }

        /**
         * Save popup state to chrome.storage.local.
         * @param {Object} state - The state object to save
         * @param {string} uiLanguageMode - The UI language mode
         * @returns {Promise<void>}
         */
        function savePopupState(state, uiLanguageMode) {
            return new Promise((resolve) => {
                chrome.storage.local.set({
                    popupState: state,
                    uiLanguageMode: uiLanguageMode || 'auto'
                }, resolve);
            });
        }

        return {
            DEFAULT_POPUP_STATE,
            loadPopupState,
            savePopupState
        };
    }
);
