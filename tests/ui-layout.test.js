const {
    DEFAULT_POPUP_UI_STATE,
    normalizePopupUiState,
    setPopupAccordionOpen,
    filterTagMatchesSearch,
    isCommentSettingsVisible,
    DASHBOARD_TABS,
    normalizeDashboardTab,
    normalizeDashboardState,
    getDashboardSectionVisibility
} = require('../extension/lib/ui-layout');

describe('ui-layout', () => {
    describe('popup ui state', () => {
        it('defaults accordions to collapsed for all modes', () => {
            const ui = normalizePopupUiState();
            expect(ui.accordions.connect.refine).toBe(false);
            expect(ui.accordions.connect.message).toBe(false);
            expect(ui.accordions.connect.automation)
                .toBe(false);
            expect(ui.accordions.companies.automation)
                .toBe(false);
            expect(ui.accordions.feed.commentSettings)
                .toBe(false);
            expect(ui.accordions.feed.automation).toBe(false);
        });

        it('persists and restores accordion state with last-open panel', () => {
            const base = normalizePopupUiState({
                accordions: {
                    connect: {
                        refine: false,
                        message: false,
                        automation: false
                    }
                },
                lastOpenSubpanel: {
                    connect: null,
                    companies: null,
                    feed: null
                },
                tagSearch: 'ux'
            });
            const next = setPopupAccordionOpen(
                base,
                'connect',
                'refine',
                true
            );
            const restored = normalizePopupUiState(next);
            expect(restored.accordions.connect.refine)
                .toBe(true);
            expect(restored.lastOpenSubpanel.connect)
                .toBe('refine');
            expect(restored.tagSearch).toBe('ux');
        });

        it('filters connect tags by search without mutating selected state', () => {
            const query = 'design';
            expect(filterTagMatchesSearch(
                'Graphic Designer',
                '"graphic designer"',
                query
            )).toBe(true);
            expect(filterTagMatchesSearch(
                'Recruiter',
                'recruiter',
                query
            )).toBe(false);
        });

        it('shows comment settings only when feed comment is enabled', () => {
            expect(isCommentSettingsVisible(true)).toBe(true);
            expect(isCommentSettingsVisible(false)).toBe(false);
        });
    });

    describe('dashboard tabs', () => {
        it('supports expected tab names', () => {
            expect(DASHBOARD_TABS).toEqual([
                'overview',
                'activity',
                'feed',
                'nurture',
                'logs'
            ]);
        });

        it('normalizes active tab and restores dashboard state', () => {
            const state = normalizeDashboardState({
                activeTab: 'feed'
            });
            expect(state.activeTab).toBe('feed');
            expect(normalizeDashboardTab('unknown'))
                .toBe('overview');
        });

        it('returns visibility map that shows only selected section', () => {
            const visibility = getDashboardSectionVisibility(
                'logs'
            );
            expect(visibility.overview).toBe(false);
            expect(visibility.activity).toBe(false);
            expect(visibility.feed).toBe(false);
            expect(visibility.nurture).toBe(false);
            expect(visibility.logs).toBe(true);
        });
    });

    it('exports immutable default popup UI shape', () => {
        expect(DEFAULT_POPUP_UI_STATE.accordions.connect.refine)
            .toBe(false);
    });
});
