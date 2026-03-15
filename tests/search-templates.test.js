const {
    EXPECTED_RESULTS_BUCKETS,
    MODE_USAGE_GOALS,
    SEARCH_TEMPLATES,
    normalizeAreaFamily,
    normalizeExpectedResultsBucket,
    normalizeUsageGoal,
    selectSearchTemplate,
    compileBooleanQuery,
    buildSearchTemplatePlan
} = require('../extension/lib/search-templates');
const {
    normalizeSearchLanguageMode,
    resolveSearchLocale
} = require('../extension/lib/search-language');

describe('search-templates', () => {
    describe('search locale resolution', () => {
        it('uses portuguese for strong brazil local-market signals', () => {
            const locale = resolveSearchLocale({
                mode: 'jobs',
                requestedMode: 'auto',
                selectedLocations: ['Brazil'],
                jobsBrazilOffshoreFriendly: false
            });

            expect(locale).toBe('pt_BR');
        });

        it('uses english for global offshore searches', () => {
            const locale = resolveSearchLocale({
                mode: 'jobs',
                requestedMode: 'auto',
                selectedLocations: ['Global'],
                jobsBrazilOffshoreFriendly: true
            });

            expect(locale).toBe('en');
        });

        it('uses bilingual for broad exploratory searches', () => {
            const locale = resolveSearchLocale({
                mode: 'jobs',
                requestedMode: 'auto',
                selectedLocations: ['LATAM', 'Global'],
                expectedResultsBucket: 'broad',
                usageGoal: 'market_scan'
            });

            expect(locale).toBe('bilingual');
        });

        it('keeps explicit search-language overrides', () => {
            expect(normalizeSearchLanguageMode('pt_BR')).toBe('pt_BR');
            expect(resolveSearchLocale({
                mode: 'connect',
                requestedMode: 'en',
                selectedLocations: ['Brazil']
            })).toBe('en');
        });
    });

    it('exports supported expected-result buckets', () => {
        expect(EXPECTED_RESULTS_BUCKETS)
            .toEqual(['precise', 'balanced', 'broad']);
    });

    it('exports usage-goal catalogs by mode', () => {
        expect(MODE_USAGE_GOALS.connect).toContain(
            'recruiter_outreach'
        );
        expect(MODE_USAGE_GOALS.companies).toContain(
            'brand_watchlist'
        );
        expect(MODE_USAGE_GOALS.jobs).toContain(
            'high_fit_easy_apply'
        );
    });

    it('maps area presets to deterministic families', () => {
        expect(normalizeAreaFamily('tech')).toBe('tech');
        expect(normalizeAreaFamily('finance')).toBe('business');
        expect(normalizeAreaFamily('healthcare')).toBe('regulated');
        expect(normalizeAreaFamily('branding')).toBe('creative');
        expect(normalizeAreaFamily('headhunting')).toBe('talent');
        expect(normalizeAreaFamily('unknown')).toBe('custom');
    });

    it('normalizes unknown bucket and usage goal to defaults', () => {
        expect(normalizeExpectedResultsBucket('x'))
            .toBe('balanced');
        expect(
            normalizeUsageGoal('connect', 'x')
        ).toBe('recruiter_outreach');
    });

    it('resolves exact template match when auto mode is on', () => {
        const template = selectSearchTemplate({
            mode: 'connect',
            areaPreset: 'tech',
            usageGoal: 'recruiter_outreach',
            expectedResultsBucket: 'precise',
            auto: true
        });
        expect(template.id).toBe(
            'connect.tech.recruiter_outreach.precise'
        );
    });

    it('resolves area-family fallback when exact area has no template', () => {
        const template = selectSearchTemplate({
            mode: 'connect',
            areaPreset: 'marketing',
            usageGoal: 'decision_makers',
            expectedResultsBucket: 'balanced',
            auto: true
        });
        expect(template.id).toBe(
            'connect.business.decision_makers.balanced'
        );
    });

    it('uses manual template when auto mode is off', () => {
        const template = selectSearchTemplate({
            mode: 'jobs',
            areaPreset: 'tech',
            usageGoal: 'market_scan',
            expectedResultsBucket: 'broad',
            auto: false,
            templateId: 'jobs.any.market_scan.broad'
        });
        expect(template.id).toBe('jobs.any.market_scan.broad');
    });

    it('caps boolean operators by budget', () => {
        const compiled = compileBooleanQuery({
            should: [
                'recruiter',
                'talent acquisition',
                'hiring manager',
                'sourcer',
                'head of talent'
            ],
            must: ['software', 'brazil'],
            budget: 4,
            explicitAnd: true,
            wrapShould: true
        });
        expect(compiled.operatorCount).toBeLessThanOrEqual(4);
    });

    it('builds connect template plan with deterministic diagnostics', () => {
        const plan = buildSearchTemplatePlan({
            mode: 'connect',
            areaPreset: 'tech',
            usageGoal: 'recruiter_outreach',
            expectedResultsBucket: 'precise',
            auto: true,
            searchLanguageMode: 'en',
            selectedTags: {
                role: ['recruiter'],
                industry: ['software'],
                market: ['brazil'],
                level: []
            },
            roleTermsLimit: 10
        });
        expect(plan.template.id).toBe(
            'connect.tech.recruiter_outreach.precise'
        );
        expect(plan.query.length).toBeGreaterThan(10);
        expect(plan.meta.operatorCount).toBeGreaterThan(0);
        expect(plan.meta.compiledQueryLength).toBe(plan.query.length);
    });

    it('builds connect template plan with portuguese query terms', () => {
        const plan = buildSearchTemplatePlan({
            mode: 'connect',
            areaPreset: 'tech',
            usageGoal: 'recruiter_outreach',
            expectedResultsBucket: 'precise',
            auto: true,
            searchLanguageMode: 'pt_BR',
            selectedTags: {
                role: [],
                industry: [],
                market: ['Brazil'],
                level: []
            }
        });

        expect(plan.query.toLowerCase()).toContain('recrutador');
        expect(plan.query.toLowerCase()).toContain('brasil');
    });

    it('builds jobs template plan preferring explicit role title terms', () => {
        const plan = buildSearchTemplatePlan({
            mode: 'jobs',
            areaPreset: 'tech',
            usageGoal: 'high_fit_easy_apply',
            expectedResultsBucket: 'precise',
            auto: true,
            searchLanguageMode: 'en',
            manualQuery: ''
        });
        expect(plan.template.id).toBe(
            'jobs.tech.high_fit_easy_apply.precise'
        );
        expect(plan.query.toLowerCase()).toContain('software engineer');
    });

    it('builds jobs template plan with portuguese role and location terms', () => {
        const plan = buildSearchTemplatePlan({
            mode: 'jobs',
            areaPreset: 'tech',
            usageGoal: 'high_fit_easy_apply',
            expectedResultsBucket: 'precise',
            auto: true,
            searchLanguageMode: 'pt_BR',
            manualQuery: ''
        });

        expect(plan.query.toLowerCase()).toContain('engenheiro de software');
        expect(plan.query.toLowerCase()).toContain('remoto');
        expect(plan.query.toLowerCase()).toContain('brasil');
    });

    it('keeps jobs auto locale in portuguese for brazil-local runs when offshore is off', () => {
        const plan = buildSearchTemplatePlan({
            mode: 'jobs',
            areaPreset: 'tech',
            usageGoal: 'high_fit_easy_apply',
            expectedResultsBucket: 'precise',
            auto: true,
            searchLanguageMode: 'auto',
            locationTerms: ['Brazil'],
            jobsBrazilOffshoreFriendly: false
        });

        expect(plan.meta.resolvedSearchLocale).toBe('pt_BR');
        expect(plan.query.toLowerCase()).toContain('brasil');
    });

    it('builds companies template plan with bilingual market terms within budget', () => {
        const plan = buildSearchTemplatePlan({
            mode: 'companies',
            areaPreset: 'tech',
            usageGoal: 'talent_watchlist',
            expectedResultsBucket: 'balanced',
            auto: true,
            searchLanguageMode: 'bilingual'
        });

        expect(plan.query.toLowerCase()).toContain('developer tools');
        expect(plan.query.toLowerCase()).toContain('ferramentas para desenvolvedores');
        expect(plan.meta.operatorCount).toBeLessThanOrEqual(12);
    });

    it('contains starter catalog templates', () => {
        const ids = SEARCH_TEMPLATES.map(t => t.id);
        expect(ids).toContain(
            'connect.tech.peer_networking.balanced'
        );
        expect(ids).toContain(
            'companies.creative.brand_watchlist.balanced'
        );
        expect(ids).toContain(
            'jobs.creative.target_company_roles.balanced'
        );
    });

    describe('tech sub-preset templates', () => {
        const TECH_SUB_PRESETS = [
            'tech-frontend', 'tech-backend', 'tech-fullstack',
            'tech-devops', 'tech-data', 'tech-cloud',
            'tech-security', 'tech-mobile', 'tech-ml-ai'
        ];

        it('all tech sub-presets map to tech family', () => {
            TECH_SUB_PRESETS.forEach(preset => {
                expect(normalizeAreaFamily(preset)).toBe('tech');
            });
        });

        it('each tech sub-preset has a Connect peer_networking template', () => {
            const ids = SEARCH_TEMPLATES.map(t => t.id);
            TECH_SUB_PRESETS.forEach(preset => {
                expect(ids).toContain(
                    `connect.${preset}.peer_networking.balanced`
                );
            });
        });

        it('each tech sub-preset has a Jobs high_fit_easy_apply template', () => {
            const ids = SEARCH_TEMPLATES.map(t => t.id);
            TECH_SUB_PRESETS.forEach(preset => {
                expect(ids).toContain(
                    `jobs.${preset}.high_fit_easy_apply.precise`
                );
            });
        });

        it('each tech sub-preset has a Companies talent_watchlist template', () => {
            const ids = SEARCH_TEMPLATES.map(t => t.id);
            TECH_SUB_PRESETS.forEach(preset => {
                expect(ids).toContain(
                    `companies.${preset}.talent_watchlist.balanced`
                );
            });
        });

        it('selectSearchTemplate resolves exact tech sub-preset match', () => {
            const template = selectSearchTemplate({
                mode: 'connect',
                areaPreset: 'tech-frontend',
                usageGoal: 'peer_networking',
                expectedResultsBucket: 'balanced'
            });
            expect(template).not.toBeNull();
            expect(template.areaPreset).toBe('tech-frontend');
        });

        it('selectSearchTemplate falls back to tech family template for unmatched goal/bucket', () => {
            const template = selectSearchTemplate({
                mode: 'connect',
                areaPreset: 'tech-frontend',
                usageGoal: 'recruiter_outreach',
                expectedResultsBucket: 'broad'
            });
            expect(template).not.toBeNull();
            expect(['tech', 'tech-frontend', 'custom'].some(
                p => template.areaPreset === p
            )).toBe(true);
        });

        it('buildSearchTemplatePlan — tech-backend Connect generates role query', () => {
            const plan = buildSearchTemplatePlan({
                mode: 'connect',
                areaPreset: 'tech-backend',
                usageGoal: 'peer_networking',
                expectedResultsBucket: 'balanced',
                searchLanguageMode: 'en'
            });
            expect(plan.query).toBeTruthy();
            expect(plan.meta.mode).toBe('connect');
            expect(plan.query.toLowerCase()).toMatch(
                /backend|platform|api|software/
            );
        });

        it('buildSearchTemplatePlan — tech-data Jobs generates data role query', () => {
            const plan = buildSearchTemplatePlan({
                mode: 'jobs',
                areaPreset: 'tech-data',
                usageGoal: 'high_fit_easy_apply',
                expectedResultsBucket: 'precise',
                searchLanguageMode: 'en'
            });
            expect(plan.query).toBeTruthy();
            expect(plan.meta.mode).toBe('jobs');
            expect(plan.query.toLowerCase()).toMatch(
                /data|analytics|machine learning/
            );
        });

        it('buildSearchTemplatePlan — tech-ml-ai Connect generates AI role query', () => {
            const plan = buildSearchTemplatePlan({
                mode: 'connect',
                areaPreset: 'tech-ml-ai',
                usageGoal: 'peer_networking',
                expectedResultsBucket: 'balanced',
                searchLanguageMode: 'en'
            });
            expect(plan.query.toLowerCase()).toMatch(
                /machine learning|ai engineer|nlp|data scientist/
            );
        });

        it('buildSearchTemplatePlan — tech-devops Companies generates DevOps query', () => {
            const plan = buildSearchTemplatePlan({
                mode: 'companies',
                areaPreset: 'tech-devops',
                usageGoal: 'talent_watchlist',
                expectedResultsBucket: 'balanced',
                searchLanguageMode: 'en'
            });
            expect(plan.query.toLowerCase()).toMatch(
                /devops|site reliability|platform|infrastructure/
            );
        });

        it('buildSearchTemplatePlan — tech-backend pt_BR generates Portuguese terms', () => {
            const plan = buildSearchTemplatePlan({
                mode: 'connect',
                areaPreset: 'tech-backend',
                usageGoal: 'peer_networking',
                expectedResultsBucket: 'balanced',
                searchLanguageMode: 'pt_BR'
            });
            expect(plan.meta.resolvedSearchLocale).toBe('pt_BR');
            expect(plan.query.toLowerCase()).toMatch(
                /engenheiro|desenvolvedor|backend/
            );
        });

        it('buildSearchTemplatePlan — tech-security Jobs targets security roles', () => {
            const plan = buildSearchTemplatePlan({
                mode: 'jobs',
                areaPreset: 'tech-security',
                usageGoal: 'high_fit_easy_apply',
                expectedResultsBucket: 'precise',
                searchLanguageMode: 'en'
            });
            expect(plan.query.toLowerCase()).toMatch(
                /security|cybersecurity/
            );
        });

        it('buildSearchTemplatePlan — tech-mobile Jobs targets mobile roles', () => {
            const plan = buildSearchTemplatePlan({
                mode: 'jobs',
                areaPreset: 'tech-mobile',
                usageGoal: 'high_fit_easy_apply',
                expectedResultsBucket: 'precise',
                searchLanguageMode: 'en'
            });
            expect(plan.query.toLowerCase()).toMatch(
                /mobile|ios|android|react native/
            );
        });

        it('buildSearchTemplatePlan — tech-cloud Jobs targets cloud roles', () => {
            const plan = buildSearchTemplatePlan({
                mode: 'jobs',
                areaPreset: 'tech-cloud',
                usageGoal: 'high_fit_easy_apply',
                expectedResultsBucket: 'precise',
                searchLanguageMode: 'en'
            });
            expect(plan.query.toLowerCase()).toMatch(
                /cloud|architect|infrastructure/
            );
        });

        it('buildSearchTemplatePlan — tech-fullstack includes full stack role terms', () => {
            const plan = buildSearchTemplatePlan({
                mode: 'connect',
                areaPreset: 'tech-fullstack',
                usageGoal: 'peer_networking',
                expectedResultsBucket: 'balanced',
                searchLanguageMode: 'en'
            });
            expect(plan.query.toLowerCase()).toMatch(
                /full stack|fullstack|software engineer|product engineer/
            );
        });

        it('all tech sub-preset Connect templates have filterSpec.degree2nd', () => {
            TECH_SUB_PRESETS.forEach(preset => {
                const template = SEARCH_TEMPLATES.find(
                    t => t.id === `connect.${preset}.peer_networking.balanced`
                );
                expect(template.filterSpec).toBeDefined();
                expect(typeof template.filterSpec.degree2nd).toBe('boolean');
            });
        });

        it('all tech sub-preset Jobs templates have easyApplyOnly: true', () => {
            TECH_SUB_PRESETS.forEach(preset => {
                const template = SEARCH_TEMPLATES.find(
                    t => t.id === `jobs.${preset}.high_fit_easy_apply.precise`
                );
                expect(template.filterSpec.easyApplyOnly).toBe(true);
            });
        });

        it('all tech sub-preset Jobs templates seed preferredCompanies', () => {
            TECH_SUB_PRESETS.forEach(preset => {
                const template = SEARCH_TEMPLATES.find(
                    t => t.id === `jobs.${preset}.high_fit_easy_apply.precise`
                );
                expect(Array.isArray(template.defaults.preferredCompanies)).toBe(true);
                expect(template.defaults.preferredCompanies.length).toBeGreaterThan(0);
            });
        });
    });
});
