const {
    normalizeText,
    matchesExcludedJobCompany,
    evaluateJobCandidate,
    rankJobsForApply,
    buildLinkedInJobsSearchUrl
} = require('../extension/lib/jobs-utils');

describe('jobs-utils matching and ranking', () => {
    it('matches excluded company with case/accent-insensitive comparison', () => {
        expect(matchesExcludedJobCompany(
            'Nubank',
            ['google', 'núbank']
        )).toBe('núbank');
    });

    it('skips jobs without easy apply', () => {
        const decision = evaluateJobCandidate(
            {
                id: 'job-1',
                title: 'Product Designer',
                company: 'Acme',
                location: 'Sao Paulo',
                easyApply: false,
                alreadyApplied: false
            },
            {
                excludedCompanies: [],
                appliedJobIds: []
            }
        );
        expect(decision.skipReason).toBe('skipped-no-easy-apply');
    });

    it('allows non-easy-apply jobs when easyApplyOnly is false', () => {
        const decision = evaluateJobCandidate(
            {
                id: 'job-1b',
                title: 'Product Designer',
                company: 'Acme',
                location: 'Sao Paulo',
                easyApply: false,
                alreadyApplied: false
            },
            {
                easyApplyOnly: false,
                excludedCompanies: [],
                appliedJobIds: []
            }
        );
        expect(decision.skipReason).toBeNull();
    });

    it('skips offshore-incompatible jobs when brazil offshore filter is enabled', () => {
        const decision = evaluateJobCandidate(
            {
                id: 'job-offshore-skip',
                title: 'Senior React Engineer',
                company: 'Acme',
                location: 'Remote',
                easyApply: true,
                alreadyApplied: false,
                detailText:
                    'Remote role but US only. Must reside in the United States.'
            },
            {
                easyApplyOnly: false,
                jobsBrazilOffshoreFriendly: true,
                excludedCompanies: [],
                appliedJobIds: []
            }
        );

        expect(decision.skipReason).toBe('skipped-offshore-incompatible');
    });

    it('skips excluded company and returns matched company', () => {
        const decision = evaluateJobCandidate(
            {
                id: 'job-2',
                title: 'Product Designer',
                company: 'Nubank',
                location: 'Sao Paulo',
                easyApply: true,
                alreadyApplied: false
            },
            {
                excludedCompanies: ['Banco do Brasil', 'núbank'],
                appliedJobIds: []
            }
        );

        expect(decision.skipReason).toBe('skipped-excluded-company');
        expect(decision.matchedExcludedCompany).toBe('núbank');
    });

    it('skips already applied jobs', () => {
        const decision = evaluateJobCandidate(
            {
                id: 'job-3',
                title: 'UX Designer',
                company: 'Design Co',
                location: 'Remote',
                easyApply: true,
                alreadyApplied: false
            },
            {
                excludedCompanies: [],
                appliedJobIds: ['job-3']
            }
        );
        expect(decision.skipReason).toBe('skipped-already-applied');
    });

    it('ranks by best fit score with deterministic ordering', () => {
        const ranked = rankJobsForApply(
            [
                {
                    id: 'top',
                    title: 'Senior Product Designer',
                    company: 'Acme',
                    location: 'Remote Brazil',
                    easyApply: true,
                    postedHoursAgo: 3,
                    seniority: 'senior',
                    workType: 'remote',
                    detailText:
                        'Remote role for LATAM contractors. Brazil candidates welcome.',
                    alreadyApplied: false
                },
                {
                    id: 'mid',
                    title: 'Designer',
                    company: 'Beta',
                    location: 'Sao Paulo',
                    easyApply: true,
                    postedHoursAgo: 2,
                    seniority: 'mid',
                    workType: 'hybrid',
                    detailText: 'Hybrid role in Sao Paulo office.',
                    alreadyApplied: false
                },
                {
                    id: 'low',
                    title: 'Software Engineer',
                    company: 'Gamma',
                    location: 'Remote',
                    easyApply: true,
                    postedHoursAgo: 6,
                    seniority: 'senior',
                    workType: 'remote',
                    detailText:
                        'US only role. Must reside in the United States.',
                    alreadyApplied: false
                }
            ],
            {
                excludedCompanies: [],
                appliedJobIds: [],
                roleTerms: ['product designer', 'ux designer'],
                keywordTerms: ['react', 'typescript'],
                desiredLevels: ['senior'],
                locationTerms: ['brazil', 'remote'],
                preferredCompanies: ['acme'],
                jobsBrazilOffshoreFriendly: true
            }
        );

        expect(ranked).toHaveLength(3);
        expect(ranked[0].id).toBe('top');
        expect(ranked[1].id).toBe('mid');
        expect(ranked[2].id).toBe('low');
        expect(ranked[2].skipReason).toBe('skipped-offshore-incompatible');
        expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
    });

    describe('normalizeText', () => {
        it('strips accents and lowercases', () => {
            expect(normalizeText('Café São Paulo')).toBe('cafe sao paulo');
        });

        it('collapses whitespace', () => {
            expect(normalizeText('  hello   world  ')).toBe('hello world');
        });

        it('handles null/undefined/empty', () => {
            expect(normalizeText('')).toBe('');
            expect(normalizeText(null)).toBe('');
            expect(normalizeText(undefined)).toBe('');
        });

        it('removes special characters and collapses spaces', () => {
            const result = normalizeText('Node.js & Python!');
            expect(result).toContain('node');
            expect(result).toContain('js');
            expect(result).toContain('python');
        });
    });

    describe('matchesExcludedJobCompany', () => {
        it('returns null when company is empty', () => {
            expect(matchesExcludedJobCompany('', ['acme'])).toBeNull();
        });

        it('returns null when no match', () => {
            expect(matchesExcludedJobCompany('Nubank', ['Google', 'Meta'])).toBeNull();
        });

        it('handles excludedCompanies as newline-separated string', () => {
            const match = matchesExcludedJobCompany('Acme Corp', 'Acme Corp\nBeta Inc');
            expect(match).toBe('Acme Corp');
        });

        it('returns null for empty excluded list', () => {
            expect(matchesExcludedJobCompany('Google', [])).toBeNull();
        });
    });

    describe('buildLinkedInJobsSearchUrl', () => {
        it('builds a URL with keywords', () => {
            const url = buildLinkedInJobsSearchUrl('react developer');
            expect(url).toContain('linkedin.com/jobs/search/');
            expect(url).toContain('keywords=react+developer');
        });

        it('includes easyApply filter by default', () => {
            const url = buildLinkedInJobsSearchUrl('engineer');
            expect(url).toContain('f_AL=true');
        });

        it('omits easyApply when explicitly set to false', () => {
            const url = buildLinkedInJobsSearchUrl('engineer', { easyApplyOnly: false });
            expect(url).not.toContain('f_AL');
        });

        it('appends experienceLevel when provided', () => {
            const url = buildLinkedInJobsSearchUrl('engineer', { experienceLevel: '4' });
            expect(url).toContain('f_E=4');
        });

        it('appends workType when provided', () => {
            const url = buildLinkedInJobsSearchUrl('engineer', { workType: '2' });
            expect(url).toContain('f_WT=2');
        });

        it('appends location when provided', () => {
            const url = buildLinkedInJobsSearchUrl('engineer', { location: 'Brazil' });
            expect(url).toContain('location=Brazil');
        });

        it('omits empty optional params', () => {
            const url = buildLinkedInJobsSearchUrl('engineer', {
                experienceLevel: '',
                workType: '',
                location: ''
            });
            expect(url).not.toContain('f_E=');
            expect(url).not.toContain('f_WT=');
            expect(url).not.toContain('location=');
        });

        it('handles empty query gracefully', () => {
            const url = buildLinkedInJobsSearchUrl('');
            expect(url).toContain('linkedin.com/jobs/search/');
            expect(url).not.toContain('keywords=');
        });

        it('handles null/undefined options', () => {
            const url1 = buildLinkedInJobsSearchUrl('dev', null);
            const url2 = buildLinkedInJobsSearchUrl('dev', undefined);
            expect(url1).toContain('f_AL=true');
            expect(url2).toContain('f_AL=true');
        });
    });

    describe('evaluateJobCandidate — decision shape', () => {
        const baseJob = {
            id: 'j',
            title: 'Senior Backend Engineer',
            company: 'Stripe',
            location: 'Remote',
            easyApply: true,
            alreadyApplied: false
        };

        it('returns skipReason null for a valid easy-apply job', () => {
            const result = evaluateJobCandidate(baseJob, {
                excludedCompanies: [],
                appliedJobIds: []
            });
            expect(result.skipReason).toBeNull();
        });

        it('returns offshoreCompatibility score when allowed', () => {
            const result = evaluateJobCandidate(
                { ...baseJob, detailText: 'Remote role open to LATAM contractors' },
                { excludedCompanies: [], appliedJobIds: [], jobsBrazilOffshoreFriendly: true }
            );
            expect(result.skipReason).toBeNull();
            expect(typeof result.offshoreCompatibility).toBe('number');
        });

        it('includes skipReason field on every result', () => {
            const result = evaluateJobCandidate(baseJob, {
                excludedCompanies: [],
                appliedJobIds: []
            });
            expect('skipReason' in result).toBe(true);
        });
    });

    describe('rankJobsForApply — scoring signals', () => {
        const makeJob = (overrides) => ({
            id: 'j',
            title: 'Senior Backend Engineer',
            company: 'Stripe',
            location: 'Remote',
            easyApply: true,
            alreadyApplied: false,
            ...overrides
        });

        const rank = (jobs, config) => rankJobsForApply(jobs, {
            excludedCompanies: [],
            appliedJobIds: [],
            ...config
        });

        it('assigns higher score for matching seniority level', () => {
            const [senior, junior] = rank([
                makeJob({ id: 'senior', seniority: 'senior' }),
                makeJob({ id: 'junior', seniority: 'junior' })
            ], { desiredLevels: ['senior'] });
            expect(senior.score).toBeGreaterThan(junior.score);
        });

        it('assigns higher score for recently posted jobs', () => {
            const [fresh, stale] = rank([
                makeJob({ id: 'fresh', postedHoursAgo: 2 }),
                makeJob({ id: 'stale', postedHoursAgo: 200 })
            ], {});
            expect(fresh.score).toBeGreaterThan(stale.score);
        });

        it('boosts score for preferred company match', () => {
            const [preferred, notPreferred] = rank([
                makeJob({ id: 'preferred', company: 'Nubank' }),
                makeJob({ id: 'other', company: 'Unknown Corp' })
            ], { preferredCompanies: ['nubank'] });
            expect(preferred.score).toBeGreaterThan(notPreferred.score);
        });

        it('all ranked results have numeric score', () => {
            const results = rank([
                makeJob({ id: 'a' }),
                makeJob({ id: 'b', easyApply: false })
            ], {});
            results.forEach(r => expect(typeof r.score).toBe('number'));
        });
    });

    describe('rankJobsForApply — sorting and skip logic', () => {
        it('places skipped jobs after non-skipped jobs', () => {
            const ranked = rankJobsForApply([
                {
                    id: 'skip',
                    title: 'Engineer',
                    company: 'Excluded',
                    location: 'Remote',
                    easyApply: false,
                    alreadyApplied: false
                },
                {
                    id: 'keep',
                    title: 'Senior Engineer',
                    company: 'Stripe',
                    location: 'Remote',
                    easyApply: true,
                    alreadyApplied: false
                }
            ], { excludedCompanies: [], appliedJobIds: [] });

            expect(ranked[0].id).toBe('keep');
            expect(ranked[1].id).toBe('skip');
        });

        it('sorts equal-skip-status jobs by score descending', () => {
            const ranked = rankJobsForApply([
                {
                    id: 'low-score',
                    title: 'Junior Developer',
                    company: 'Corp A',
                    location: 'Hybrid',
                    easyApply: true,
                    alreadyApplied: false,
                    postedHoursAgo: 200
                },
                {
                    id: 'high-score',
                    title: 'Senior Software Engineer',
                    company: 'Stripe',
                    location: 'Remote Brazil',
                    easyApply: true,
                    alreadyApplied: false,
                    postedHoursAgo: 1,
                    seniority: 'senior',
                    detailText: 'Remote role open to LATAM contractors'
                }
            ], {
                excludedCompanies: [],
                appliedJobIds: [],
                desiredLevels: ['senior'],
                locationTerms: ['remote', 'brazil'],
                preferredCompanies: ['stripe'],
                jobsBrazilOffshoreFriendly: true
            });

            expect(ranked[0].id).toBe('high-score');
        });

        it('returns empty array for empty input', () => {
            expect(rankJobsForApply([], {})).toEqual([]);
        });

        it('handles missing optional fields gracefully', () => {
            const ranked = rankJobsForApply([
                { id: 'min', title: 'Dev', company: 'Co', easyApply: true }
            ], {});
            expect(ranked).toHaveLength(1);
            expect(typeof ranked[0].score).toBe('number');
        });

        it('scores same-level jobs by recency when all else is equal', () => {
            const ranked = rankJobsForApply([
                {
                    id: 'older', title: 'Engineer', company: 'Co',
                    location: 'Remote', easyApply: true, postedHoursAgo: 100
                },
                {
                    id: 'newer', title: 'Engineer', company: 'Co',
                    location: 'Remote', easyApply: true, postedHoursAgo: 1
                }
            ], { excludedCompanies: [], appliedJobIds: [] });

            expect(ranked[0].id).toBe('newer');
        });
    });

    afterAll(() => {
        delete global.matchesExcludedJobCompany;
        delete global.evaluateJobCandidate;
        delete global.rankJobsForApply;
        delete global.buildLinkedInJobsSearchUrl;
    });
});
