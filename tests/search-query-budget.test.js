const CC = require('../extension/lib/connect-config');
const ST = require('../extension/lib/search-templates');
const CQ = require('../extension/lib/connect-query');
const CO = require('../extension/lib/company-query');

const {
    AREA_PRESET_VALUES,
    COMPANY_AREA_PRESET_VALUES,
    applyAreaPresetToTags,
    getJobsPresetTerms,
    buildConnectQueryFromTags
} = CC;
const {
    LINKEDIN_PEOPLE_SEARCH_OPERATOR_CAP,
    AREA_FAMILY_MAP,
    SEARCH_TEMPLATES,
    buildSearchTemplatePlan,
    selectSearchTemplate,
    countBooleanOperators
} = ST;

function connectQuery(preset, roleTermsLimit) {
    const plan = buildSearchTemplatePlan({
        mode: 'connect',
        areaPreset: preset,
        auto: true,
        usageGoal: 'recruiter_outreach',
        expectedResultsBucket: 'balanced',
        selectedTags: applyAreaPresetToTags({}, preset),
        roleTermsLimit
    });
    return { plan, query: CQ.buildConnectSearchKeywords(plan.query) };
}

function jobsQuery(preset) {
    return buildSearchTemplatePlan({
        mode: 'jobs',
        areaPreset: preset,
        auto: true,
        usageGoal: 'high_fit_easy_apply',
        expectedResultsBucket: 'balanced',
        roleTerms: getJobsPresetTerms(preset).role
    });
}

function companiesQuery(preset) {
    const plan = buildSearchTemplatePlan({
        mode: 'companies',
        areaPreset: preset,
        auto: true,
        usageGoal: 'talent_watchlist',
        expectedResultsBucket: 'balanced'
    });
    return { plan, queries: CO.splitCompanySearchQueries(plan.query) };
}

describe('LinkedIn operator cap (#265)', () => {
    it('exports the cap as 5', () => {
        expect(LINKEDIN_PEOPLE_SEARCH_OPERATOR_CAP).toBe(5);
    });

    it.each(AREA_PRESET_VALUES.map(p => [p]))(
        'connect preset %s stays within the cap',
        (preset) => {
            [undefined, 10].forEach((limit) => {
                const { query } = connectQuery(preset, limit);
                expect(query.length).toBeGreaterThan(0);
                expect(countBooleanOperators(query))
                    .toBeLessThanOrEqual(LINKEDIN_PEOPLE_SEARCH_OPERATOR_CAP);
            });
        }
    );

    it.each(COMPANY_AREA_PRESET_VALUES.map(p => [p]))(
        'companies preset %s stays within the cap and has no NOT tail',
        (preset) => {
            const { queries } = companiesQuery(preset);
            expect(queries.length).toBeGreaterThan(0);
            queries.forEach((query) => {
                expect(countBooleanOperators(query))
                    .toBeLessThanOrEqual(LINKEDIN_PEOPLE_SEARCH_OPERATOR_CAP);
                expect(query).not.toMatch(/\bNOT\b/);
            });
            const fallback = CC.getCompanyAreaPresetDefaultQuery(preset);
            expect(countBooleanOperators(fallback))
                .toBeLessThanOrEqual(LINKEDIN_PEOPLE_SEARCH_OPERATOR_CAP);
        }
    );

    it('counts explicit company exclusions in the budget', () => {
        const plan = buildSearchTemplatePlan({
            mode: 'companies',
            areaPreset: 'tech',
            usageGoal: 'talent_watchlist',
            expectedResultsBucket: 'balanced',
            selectedTags: {
                keywords: ['a', 'b', 'c', 'd'],
                excludeKeywords: ['x', 'y', 'z']
            }
        });
        expect(countBooleanOperators(plan.query))
            .toBeLessThanOrEqual(LINKEDIN_PEOPLE_SEARCH_OPERATOR_CAP);
    });

    it('trims workMode, level, market, industry, then roles (tail first)', () => {
        const compiled = ST.compileBooleanQuery({
            should: ['r1', 'r2', 'r3', 'i1', 'i2', 'm1', 'l1', 'w1'],
            budget: LINKEDIN_PEOPLE_SEARCH_OPERATOR_CAP,
            wrapShould: false
        });
        expect(compiled.query).toBe('r1 OR r2 OR r3 OR i1 OR i2 OR m1');
    });

    it('companies custom default query is a plain verified term', () => {
        const { queries } = companiesQuery('custom');
        expect(queries).toEqual(['software development']);
    });

    it('fallback buildConnectQueryFromTags caps role ORs', () => {
        const roles = Array.from({ length: 10 }, (_, i) => `role${i}`);
        const query = buildConnectQueryFromTags({ role: roles }, 10, 'en');
        expect(countBooleanOperators(query))
            .toBeLessThanOrEqual(LINKEDIN_PEOPLE_SEARCH_OPERATOR_CAP);
        expect(buildConnectQueryFromTags({ role: roles }, undefined, 'en')
            .split(' OR ')).toHaveLength(6);
    });

    it('relaxed query keeps OR and at most 3 terms for every connect preset', () => {
        AREA_PRESET_VALUES.forEach((preset) => {
            const { query } = connectQuery(preset);
            const relaxed = CQ.buildRelaxedConnectQuery(query);
            const terms = relaxed.split(' OR ');
            expect(terms.length).toBeLessThanOrEqual(3);
            if (query.includes(' OR ')) {
                expect(relaxed).toContain(' OR ');
            }
        });
    });
});

describe('template term leaks (#266)', () => {
    it('jobs: non-tech presets do not inherit software engineer', () => {
        AREA_PRESET_VALUES
            .filter(p => (AREA_FAMILY_MAP[p] || 'custom') !== 'tech')
            .filter(p => p !== 'custom')
            .forEach((preset) => {
                const own = getJobsPresetTerms(preset).role
                    .join(' ').toLowerCase();
                const query = jobsQuery(preset).query.toLowerCase();
                if (!own.includes('software engineer')) {
                    expect(query).not.toContain('software engineer');
                }
                expect(query.length).toBeGreaterThan(0);
            });
    });

    it('connect: no preset gains global unless its own tags include it', () => {
        AREA_PRESET_VALUES.filter(p => p !== 'custom').forEach((preset) => {
            const tags = applyAreaPresetToTags({}, preset);
            const own = Object.values(tags).flat().join(' ').toLowerCase();
            const { query } = connectQuery(preset);
            if (!/\bglobal\b/.test(own)) {
                expect(query.toLowerCase()).not.toMatch(/\bglobal\b/);
            }
        });
    });

    it('prefers a template of the same preset before custom', () => {
        const template = selectSearchTemplate({
            mode: 'connect',
            areaPreset: 'tech',
            auto: true,
            usageGoal: 'recruiter_outreach',
            expectedResultsBucket: 'balanced'
        });
        expect(template.areaPreset).toBe('tech');
        expect(template.usageGoal).toBe('recruiter_outreach');
    });

    it('prefers the same family before custom', () => {
        const template = selectSearchTemplate({
            mode: 'jobs',
            areaPreset: 'tech-frontend',
            auto: true,
            usageGoal: 'market_scan',
            expectedResultsBucket: 'balanced'
        });
        expect(template.areaPreset).not.toBe('custom');
    });

    it('explicit goal and bucket win when a matching template exists', () => {
        const target = SEARCH_TEMPLATES.find(t =>
            t.mode === 'connect' && t.areaPreset === 'tech' &&
            t.usageGoal === 'peer_networking' &&
            t.expectedResultsBucket === 'balanced'
        );
        const template = selectSearchTemplate({
            mode: 'connect',
            areaPreset: 'tech',
            auto: true,
            usageGoal: 'peer_networking',
            expectedResultsBucket: 'balanced'
        });
        expect(template.id).toBe(target.id);
    });

    it('custom fallback keeps template terms when nothing was selected', () => {
        const plan = buildSearchTemplatePlan({
            mode: 'jobs',
            areaPreset: 'finance',
            auto: true,
            usageGoal: 'high_fit_easy_apply',
            expectedResultsBucket: 'balanced'
        });
        expect(plan.query).toContain('software engineer');
    });

    it('custom preset still merges its own template terms', () => {
        const plan = buildSearchTemplatePlan({
            mode: 'jobs',
            areaPreset: 'custom',
            auto: true,
            usageGoal: 'high_fit_easy_apply',
            expectedResultsBucket: 'balanced',
            roleTerms: ['designer']
        });
        expect(plan.query).toContain('software engineer');
        expect(plan.query).toContain('designer');
    });
});
