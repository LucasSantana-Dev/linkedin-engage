(function(root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.LinkedInUiLayout = api;
    Object.keys(api).forEach(function(key) {
        if (typeof root[key] === 'undefined') {
            root[key] = api[key];
        }
    });
})(
    typeof globalThis !== 'undefined' ? globalThis : this,
    function() {
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
                    profile: false
                },
                feed: {
                    commentSettings: false,
                    automation: false
                },
                tools: {
                    extras: false
                }
            },
            lastOpenSubpanel: {
                connect: null,
                companies: null,
                jobs: null,
                feed: null
            },
            tagSearch: ''
        });

        const DASHBOARD_TABS = Object.freeze([
            'overview',
            'activity',
            'feed',
            'nurture',
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
                        profile: !!state?.accordions
                            ?.jobs?.profile
                    },
                    feed: {
                        commentSettings: !!state?.accordions
                            ?.feed?.commentSettings,
                        automation: !!state?.accordions
                            ?.feed?.automation
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
                        ?.jobs || null,
                    feed: state?.lastOpenSubpanel
                        ?.feed || null
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
            return String(value || '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .trim();
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

        function isCommentSettingsVisible(feedCommentEnabled) {
            return feedCommentEnabled === true;
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
                feed: tab === 'feed',
                nurture: tab === 'nurture',
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
