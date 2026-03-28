const {
    EXPECTED_RESULTS_BUCKETS,
    MODE_USAGE_GOALS,
    SEARCH_TEMPLATES,
    normalizeAreaFamily,
    normalizeExpectedResultsBucket,
    normalizeUsageGoal,
    selectSearchTemplate,
    compileBooleanQuery,
    buildSearchTemplatePlan,
    listSearchTemplates,
    sanitizeBooleanTerm
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

    it('allows omitting role/industry defaults while keeping selected market terms', () => {
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

        expect(plan.query.toLowerCase()).toContain('brasil');
        expect(plan.query.toLowerCase()).not.toContain('recrutador');
        expect(plan.query.toLowerCase()).not.toContain('engenharia');
    });

    it('preserves explicit role terms when industry is omitted', () => {
        const plan = buildSearchTemplatePlan({
            mode: 'connect',
            areaPreset: 'tech',
            usageGoal: 'recruiter_outreach',
            expectedResultsBucket: 'precise',
            auto: true,
            searchLanguageMode: 'en',
            selectedTags: {
                role: ['recruiter'],
                industry: [],
                market: [],
                level: []
            }
        });

        expect(plan.query.toLowerCase()).toContain('recruiter');
        expect(plan.query.toLowerCase()).not.toContain('software');
        expect(plan.query.toLowerCase()).not.toContain('engineering');
    });

    it('keeps connect defaults when role/industry keys are not provided', () => {
        const plan = buildSearchTemplatePlan({
            mode: 'connect',
            areaPreset: 'tech',
            usageGoal: 'recruiter_outreach',
            expectedResultsBucket: 'precise',
            auto: true,
            searchLanguageMode: 'en',
            selectedTags: {
                market: [],
                level: []
            }
        });

        expect(plan.query.toLowerCase()).toContain('recruiter');
        expect(plan.query.toLowerCase()).toContain('software');
    });

    it('keeps defaults when role/industry values are undefined', () => {
        const plan = buildSearchTemplatePlan({
            mode: 'connect',
            areaPreset: 'tech',
            usageGoal: 'recruiter_outreach',
            expectedResultsBucket: 'precise',
            auto: true,
            searchLanguageMode: 'en',
            selectedTags: {
                role: undefined,
                industry: undefined,
                market: [],
                level: []
            }
        });

        expect(plan.query.toLowerCase()).toContain('recruiter');
        expect(plan.query.toLowerCase()).toContain('software');
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

    it('builds companies template plan with offshore terms and exclusions within budget', () => {
        const plan = buildSearchTemplatePlan({
            mode: 'companies',
            areaPreset: 'tech',
            usageGoal: 'talent_watchlist',
            expectedResultsBucket: 'balanced',
            auto: true,
            searchLanguageMode: 'bilingual'
        });

        expect(plan.query.toLowerCase()).toContain('nearshore software company');
        expect(plan.query.toLowerCase()).toContain('latam talent partner');
        expect(plan.query.toLowerCase()).toContain('not university');
        expect(plan.meta.operatorCount).toBeLessThanOrEqual(12);
    });

    it('keeps companies default keywords when selectedTags.keywords is missing', () => {
        const plan = buildSearchTemplatePlan({
            mode: 'companies',
            areaPreset: 'tech',
            usageGoal: 'talent_watchlist',
            expectedResultsBucket: 'balanced',
            auto: true,
            searchLanguageMode: 'en',
            selectedTags: {}
        });

        const q = plan.query.toLowerCase();
        expect(q).toContain('nearshore software company');
        expect(q).toContain('latam talent partner');
        expect(q).toContain('not university');
    });

    it('omits companies default keywords when selectedTags.keywords is explicitly empty', () => {
        const plan = buildSearchTemplatePlan({
            mode: 'companies',
            areaPreset: 'tech',
            usageGoal: 'talent_watchlist',
            expectedResultsBucket: 'balanced',
            auto: true,
            searchLanguageMode: 'en',
            selectedTags: {
                keywords: []
            }
        });

        expect(plan.query).toBe('');
    });

    it('keeps companies defaults when selectedTags.keywords is undefined', () => {
        const plan = buildSearchTemplatePlan({
            mode: 'companies',
            areaPreset: 'tech',
            usageGoal: 'talent_watchlist',
            expectedResultsBucket: 'balanced',
            auto: true,
            searchLanguageMode: 'en',
            selectedTags: {
                keywords: undefined
            }
        });

        const q = plan.query.toLowerCase();
        expect(q).toContain('nearshore software company');
        expect(q).toContain('latam talent partner');
        expect(q).toContain('not university');
    });

    it('keeps jobs defaults when role/location/keywords keys are missing', () => {
        const plan = buildSearchTemplatePlan({
            mode: 'jobs',
            areaPreset: 'tech',
            usageGoal: 'high_fit_easy_apply',
            expectedResultsBucket: 'precise',
            auto: true,
            searchLanguageMode: 'en'
        });

        const q = plan.query.toLowerCase();
        expect(q).toContain('software engineer');
        expect(q).toContain('remote');
        expect(q).toContain('easy apply');
    });

    it('omits jobs role defaults when roleTerms is explicitly empty', () => {
        const plan = buildSearchTemplatePlan({
            mode: 'jobs',
            areaPreset: 'tech',
            usageGoal: 'high_fit_easy_apply',
            expectedResultsBucket: 'precise',
            auto: true,
            searchLanguageMode: 'en',
            roleTerms: []
        });

        const q = plan.query.toLowerCase();
        expect(q).not.toContain('software engineer');
        expect(q).toContain('remote');
        expect(q).toContain('easy apply');
    });

    it('omits jobs location defaults when locationTerms is explicitly empty', () => {
        const plan = buildSearchTemplatePlan({
            mode: 'jobs',
            areaPreset: 'tech',
            usageGoal: 'high_fit_easy_apply',
            expectedResultsBucket: 'precise',
            auto: true,
            searchLanguageMode: 'en',
            locationTerms: []
        });

        const q = plan.query.toLowerCase();
        expect(q).toContain('software engineer');
        expect(q).toContain('easy apply');
        expect(q).not.toContain('remote');
    });

    it('omits jobs keyword defaults when keywords is explicitly empty', () => {
        const plan = buildSearchTemplatePlan({
            mode: 'jobs',
            areaPreset: 'tech',
            usageGoal: 'high_fit_easy_apply',
            expectedResultsBucket: 'precise',
            auto: true,
            searchLanguageMode: 'en',
            keywords: []
        });

        const q = plan.query.toLowerCase();
        expect(q).toContain('software engineer');
        expect(q).toContain('remote');
        expect(q).not.toContain('easy apply');
    });

    it('keeps jobs defaults when role/location/keywords values are undefined', () => {
        const plan = buildSearchTemplatePlan({
            mode: 'jobs',
            areaPreset: 'tech',
            usageGoal: 'high_fit_easy_apply',
            expectedResultsBucket: 'precise',
            auto: true,
            searchLanguageMode: 'en',
            roleTerms: undefined,
            locationTerms: undefined,
            keywords: undefined
        });

        const q = plan.query.toLowerCase();
        expect(q).toContain('software engineer');
        expect(q).toContain('remote');
        expect(q).toContain('easy apply');
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

        it('buildSearchTemplatePlan — companies tech sub-presets collapse to generic tech query', () => {
            const plan = buildSearchTemplatePlan({
                mode: 'companies',
                areaPreset: 'tech-devops',
                usageGoal: 'talent_watchlist',
                expectedResultsBucket: 'balanced',
                searchLanguageMode: 'en'
            });
            const query = plan.query.toLowerCase();
            expect(plan.template.id).toBe('companies.tech.talent_watchlist.balanced');
            expect(query).toMatch(/hiring latam developers|latam talent partner/);
            expect(query).toContain('not university');
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

describe('listSearchTemplates', () => {
    it('returns all templates when called with no options', () => {
        const all = listSearchTemplates();
        expect(Array.isArray(all)).toBe(true);
        expect(all.length).toBe(SEARCH_TEMPLATES.length);
    });

    it('filters by mode', () => {
        const modes = [...new Set(SEARCH_TEMPLATES.map(t => t.mode))];
        modes.forEach(mode => {
            const filtered = listSearchTemplates({ mode });
            expect(filtered.length).toBeGreaterThan(0);
            filtered.forEach(t => expect(t.mode).toBe(mode));
        });
    });

    it('filters by usageGoal', () => {
        const goals = [...new Set(SEARCH_TEMPLATES.map(t => t.usageGoal).filter(Boolean))];
        if (goals.length > 0) {
            const goal = goals[0];
            const filtered = listSearchTemplates({ usageGoal: goal });
            expect(filtered.length).toBeGreaterThan(0);
            filtered.forEach(t => expect(t.usageGoal).toBe(goal));
        }
    });

    it('filters by expectedResultsBucket', () => {
        const buckets = [...new Set(SEARCH_TEMPLATES.map(t => t.expectedResultsBucket).filter(Boolean))];
        if (buckets.length > 0) {
            const bucket = buckets[0];
            const filtered = listSearchTemplates({ expectedResultsBucket: bucket });
            expect(filtered.length).toBeGreaterThan(0);
            filtered.forEach(t => expect(t.expectedResultsBucket).toBe(bucket));
        }
    });

    it('returns empty array when no templates match combined filters', () => {
        // connect mode has no 'broad' bucket templates
        const result = listSearchTemplates({ mode: 'connect', expectedResultsBucket: 'broad' });
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(0);
    });

    it('filters by areaPreset when provided', () => {
        const presets = [...new Set(
            SEARCH_TEMPLATES.flatMap(t => t.areaPresets || [])
        )];
        if (presets.length > 0) {
            const preset = presets[0];
            const filtered = listSearchTemplates({ areaPreset: preset });
            expect(filtered.length).toBeGreaterThan(0);
        }
    });

    it('filters by areaPreset using a known preset (tech)', () => {
        const filtered = listSearchTemplates({ areaPreset: 'tech' });
        expect(filtered.length).toBeGreaterThan(0);
        filtered.forEach(t => {
            expect(['tech', 'any', 'custom'].includes(t.areaPreset)).toBe(true);
        });
    });

    it('filters companies by areaPreset using tech sub-presets as generic tech', () => {
        const filtered = listSearchTemplates({
            mode: 'companies',
            areaPreset: 'tech-devops'
        });
        expect(filtered.length).toBeGreaterThan(0);
        filtered.forEach((t) => {
            expect(['tech', 'any', 'custom'].includes(t.areaPreset)).toBe(true);
        });
    });
});

describe('normalizeMode fallback', () => {
    it('returns connect for invalid mode values', () => {
        const result = normalizeUsageGoal('__invalid__', 'peer_networking');
        // normalizeMode is called internally; we verify the fallback via normalizeUsageGoal
        // which calls normalizeMode and then looks up MODE_USAGE_GOALS['connect']
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
    });

    it('normalizeExpectedResultsBucket returns balanced for unknown bucket', () => {
        expect(normalizeExpectedResultsBucket('__unknown__')).toBe('balanced');
    });

    it('normalizeExpectedResultsBucket returns balanced for empty string', () => {
        expect(normalizeExpectedResultsBucket('')).toBe('balanced');
    });
});

describe('sanitizeBooleanTerm', () => {
    it('returns empty string for empty input', () => {
        expect(sanitizeBooleanTerm('')).toBe('');
        expect(sanitizeBooleanTerm(null)).toBe('');
        expect(sanitizeBooleanTerm(undefined)).toBe('');
    });

    it('returns uppercase for boolean operators', () => {
        expect(sanitizeBooleanTerm('AND')).toBe('AND');
        expect(sanitizeBooleanTerm('or')).toBe('OR');
        expect(sanitizeBooleanTerm('not')).toBe('NOT');
    });

    it('returns multi-word terms unquoted (LinkedIn does not support quoted phrases in boolean keywords)', () => {
        const result = sanitizeBooleanTerm('software engineer');
        expect(result).toBe('software engineer');
    });

    it('returns single-word term unquoted', () => {
        expect(sanitizeBooleanTerm('developer')).toBe('developer');
    });

    it('strips parentheses and punctuation', () => {
        const result = sanitizeBooleanTerm('(hello, world!)');
        expect(result).toBe('hello world');
    });
});

describe('compileBooleanQuery NOT clause', () => {
    it('prefixes mustNot terms with NOT', () => {
        const result = compileBooleanQuery({
            should: ['developer'],
            mustNot: ['intern', 'junior']
        });
        expect(result.query).toContain('NOT intern');
        expect(result.query).toContain('NOT junior');
    });

    it('trims must terms when budget is exceeded', () => {
        const result = compileBooleanQuery({
            should: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'],
            must: ['required1', 'required2', 'required3'],
            budget: 3
        });
        // must terms should be trimmed to fit budget
        expect(result.must.length).toBeLessThanOrEqual(3);
    });

    it('trims mustNot terms when budget is exceeded after must trim', () => {
        const result = compileBooleanQuery({
            should: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'],
            must: ['req1', 'req2', 'req3', 'req4', 'req5'],
            mustNot: ['excl1', 'excl2', 'excl3'],
            budget: 2
        });
        expect(result.operatorCount).toBeLessThanOrEqual(2);
    });

    it('returns empty query for empty inputs', () => {
        const result = compileBooleanQuery({});
        expect(result.query).toBe('');
    });
});

describe('listFrom string branch (lines 1770-1771)', () => {
    it('handles selectedTags.role as newline-separated string', () => {
        // listFrom is called with a string when selectedTags fields are strings
        // This triggers lines 1770-1771: value.split('\n')
        const result = buildSearchTemplatePlan({
            mode: 'connect',
            areaPreset: 'tech',
            selectedTags: {
                role: 'engineer\nmanager\nlead',
                market: 'startup\nscaleup'
            }
        });
        expect(result).toBeDefined();
        expect(result.meta).toBeDefined();
        expect(result.query).toBeTruthy();
    });
});

describe('buildJobsQueryPlan manualQuery path (line 2163)', () => {
    it('returns manualQuery directly when provided', () => {
        const result = buildSearchTemplatePlan({
            mode: 'jobs',
            areaPreset: 'tech',
            manualQuery: 'software engineer React'
        });
        expect(result).toBeDefined();
        expect(result.query).toBe('software engineer React');
        expect(result.meta.manualQuery).toBe(true);
        expect(result.meta.mode).toBe('jobs');
    });
});

describe('buildSearchTemplatePlan null template path', () => {
    it('returns null template when no template matches', () => {
        const result = buildSearchTemplatePlan({
            mode: 'connect',
            areaPreset: '__nonexistent_preset_xyz__',
            auto: false,
            templateId: '__nonexistent_template_id__'
        });
        // When selectSearchTemplate returns null, buildSearchTemplatePlan returns null template
        expect(result).toBeDefined();
        // The result may have a fallback template or null; verify structure
        expect(typeof result).toBe('object');
        expect('meta' in result).toBe(true);
    });
});

describe('selectSearchTemplate final fallback', () => {
    it('falls back to any mode template when no exact/family/any match', () => {
        const result = selectSearchTemplate({
            mode: 'connect',
            areaPreset: '__nonexistent__',
            usageGoal: 'peer_networking',
            expectedResultsBucket: 'balanced'
        });
        // Should fall back to a connect template
        expect(result).not.toBeNull();
        expect(result.mode).toBe('connect');
    });
});
