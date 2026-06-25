(function(root, factory) {
    const api = factory();
    /* istanbul ignore next */
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.LinkedInUiLayout = api;
    Object.keys(api).forEach(function(key) {
        /* istanbul ignore next */
        if (typeof root[key] === 'undefined') {
            root[key] = api[key];
        }
    });
})(
    /* istanbul ignore next */
    typeof globalThis !== 'undefined' ? globalThis : this,
    function() {
        /* istanbul ignore next */
        const textUtils = typeof require === 'function'
            ? require('./text-utils.js')
            : (typeof globalThis !== 'undefined' && globalThis.LinkedInTextUtils ? globalThis.LinkedInTextUtils : null);

        const DEFAULT_POPUP_UI_STATE = Object.freeze({
            accordions: {
                connect: {
                    refine: false,
                    filters: false,
                    message: false,
                    automation: false
                },
                companies: {
                    automation: false
                },
                jobs: {
                    refine: false,
                    career: false,
                    profile: false
                },
                tools: {
                    extras: false
                }
            },
            lastOpenSubpanel: {
                connect: null,
                companies: null,
                jobs: null
            },
            tagSearch: ''
        });

        const DASHBOARD_TABS = Object.freeze([
            'overview',
            'activity',
            'logs'
        ]);

        function clonePopupUiState(state) {
            return {
                accordions: {
                    connect: {
                        refine: !!state?.accordions
                            ?.connect?.refine,
                        filters: !!state?.accordions
                            ?.connect?.filters,
                        message: !!state?.accordions
                            ?.connect?.message,
                        automation: !!state?.accordions
                            ?.connect?.automation
                    },
                    companies: {
                        automation: !!state?.accordions
                            ?.companies?.automation
                    },
                    jobs: {
                        refine: !!state?.accordions
                            ?.jobs?.refine,
                        career: !!state?.accordions
                            ?.jobs?.career,
                        profile: !!state?.accordions
                            ?.jobs?.profile
                    },
                    tools: {
                        extras: !!state?.accordions
                            ?.tools?.extras
                    }
                },
                lastOpenSubpanel: {
                    connect: state?.lastOpenSubpanel
                        ?.connect || null,
                    companies: state?.lastOpenSubpanel
                        ?.companies || null,
                    jobs: state?.lastOpenSubpanel
                        ?.jobs || null
                },
                tagSearch: String(
                    state?.tagSearch || ''
                )
            };
        }

        function normalizePopupUiState(ui) {
            if (!ui || typeof ui !== 'object') {
                return clonePopupUiState(
                    DEFAULT_POPUP_UI_STATE
                );
            }
            return clonePopupUiState({
                ...DEFAULT_POPUP_UI_STATE,
                ...ui
            });
        }

        function setPopupAccordionOpen(
            ui,
            mode,
            panel,
            isOpen
        ) {
            const next = normalizePopupUiState(ui);
            if (!next.accordions?.[mode] ||
                typeof next.accordions[mode][panel] !==
                    'boolean') {
                return next;
            }
            next.accordions[mode][panel] = !!isOpen;
            if (isOpen &&
                Object.prototype.hasOwnProperty.call(
                    next.lastOpenSubpanel,
                    mode
                )) {
                next.lastOpenSubpanel[mode] = panel;
            }
            return next;
        }

        function normalizeText(value) {
            return textUtils.normalizeToSearch(value);
        }

        function filterTagMatchesSearch(
            text,
            value,
            query
        ) {
            const q = normalizeText(query);
            if (!q) return true;
            const label = normalizeText(text);
            const raw = normalizeText(value)
                .replace(/"/g, '');
            return label.includes(q) || raw.includes(q);
        }

        function isCommentSettingsVisible(enabled) {
            return enabled === true;
        }

        function normalizeDashboardTab(tab) {
            return DASHBOARD_TABS.includes(tab)
                ? tab
                : 'overview';
        }

        function normalizeDashboardState(state) {
            return {
                activeTab: normalizeDashboardTab(
                    state?.activeTab
                )
            };
        }

        function getDashboardSectionVisibility(activeTab) {
            const tab = normalizeDashboardTab(activeTab);
            return {
                overview: tab === 'overview',
                activity: tab === 'activity',
                logs: tab === 'logs'
            };
        }

        return {
            DEFAULT_POPUP_UI_STATE,
            normalizePopupUiState,
            setPopupAccordionOpen,
            filterTagMatchesSearch,
            isCommentSettingsVisible,
            DASHBOARD_TABS,
            normalizeDashboardTab,
            normalizeDashboardState,
            getDashboardSectionVisibility
        };
    }
);
