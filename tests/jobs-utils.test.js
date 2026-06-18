const {
    normalizeText,
    matchesExcludedJobCompany,
    evaluateJobCandidate,
    rankJobsForApply,
    buildLinkedInJobsSearchUrl,
    resolveJobsLocale,
    jobsNotificationText,
    findMatchingOptionValue
} = require('../extension/lib/jobs-utils');

describe('findMatchingOptionValue', () => {
    it('matches an option by exact value', () => {
        const opts = [{ value: '', text: 'Select…' }, { value: 'BR', text: 'Brazil' }];
        expect(findMatchingOptionValue(opts, 'BR')).toBe('BR');
    });
    it('matches an option whose text contains the value (accent/case-insensitive)', () => {
        const opts = [{ value: '1', text: 'São Paulo, Brazil' }, { value: '2', text: 'Rio' }];
        expect(findMatchingOptionValue(opts, 'sao paulo')).toBe('1');
    });
    it('returns null when nothing matches', () => {
        const opts = [{ value: 'a', text: 'Alpha' }];
        expect(findMatchingOptionValue(opts, 'zzz')).toBeNull();
    });
    it('returns null for empty value or no options', () => {
        expect(findMatchingOptionValue([{ value: 'a', text: 'A' }], '')).toBeNull();
        expect(findMatchingOptionValue([], 'x')).toBeNull();
        expect(findMatchingOptionValue(null, 'x')).toBeNull();
    });
    it('ignores placeholder options with empty value', () => {
        const opts = [{ value: '', text: 'Choose' }, { value: 'us', text: 'United States' }];
        expect(findMatchingOptionValue(opts, 'choose')).toBeNull();
    });
});

describe('resolveJobsLocale', () => {
    it('returns pt for pt-BR page or navigator language', () => {
        expect(resolveJobsLocale('pt-BR', 'en-US')).toBe('pt');
        expect(resolveJobsLocale('', 'pt-BR')).toBe('pt');
        expect(resolveJobsLocale('PT', '')).toBe('pt');
    });
    it('returns en for English or unknown', () => {
        expect(resolveJobsLocale('en-US', 'en')).toBe('en');
        expect(resolveJobsLocale('', '')).toBe('en');
        expect(resolveJobsLocale(null, undefined)).toBe('en');
        expect(resolveJobsLocale('fr-FR', 'fr')).toBe('en');
    });
});

describe('jobsNotificationText', () => {
    it('returns the EN string for a known key', () => {
        expect(jobsNotificationText('securityChallenge', 'en'))
            .toMatch(/security challenge/i);
    });
    it('returns a distinct PT string for the same key', () => {
        const en = jobsNotificationText('manualInput', 'en');
        const pt = jobsNotificationText('manualInput', 'pt');
        expect(pt).not.toBe(en);
        expect(pt).toMatch(/manual/i);
    });
    it('falls back to EN for an unknown locale', () => {
        expect(jobsNotificationText('manualInput', 'fr'))
            .toBe(jobsNotificationText('manualInput', 'en'));
    });
    it('returns empty string for an unknown key', () => {
        expect(jobsNotificationText('nope', 'en')).toBe('');
    });
    it('covers every notification key in both locales', () => {
        const keys = ['securityChallenge', 'securityChallengeMidRun',
            'manualInput', 'failedPrefix'];
        keys.forEach((k) => {
            expect(jobsNotificationText(k, 'en')).toBeTruthy();
            expect(jobsNotificationText(k, 'pt')).toBeTruthy();
        });
    });
});

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

        it('uses hours tiebreak when score and skip status are equal but postedHoursAgo differs', () => {
            // Both jobs have same score (same title/company/location/easyApply)
            // but different postedHoursAgo — newer should rank first
            const ranked = rankJobsForApply([
                {
                    id: 'job-late', title: 'Software Engineer', company: 'TechCo',
                    location: 'Remote', easyApply: true, postedHoursAgo: 48
                },
                {
                    id: 'job-early', title: 'Software Engineer', company: 'TechCo',
                    location: 'Remote', easyApply: true, postedHoursAgo: 12
                }
            ], {
                excludedCompanies: [],
                appliedJobIds: [],
                desiredSeniorityLevels: [],
                locationTerms: [],
                preferredCompanies: []
            });
            // job-early (12h) should rank before job-late (48h)
            expect(ranked[0].id).toBe('job-early');
        });
    });

    describe('inferSeniority via evaluateJobCandidate', () => {
        it('infers lead seniority from director title', () => {
            const decision = evaluateJobCandidate(
                {
                    id: 'job-dir', title: 'Director of Engineering', company: 'Co',
                    location: 'Remote', easyApply: true
                },
                { excludedCompanies: [], appliedJobIds: [], desiredSeniorityLevels: ['lead'] }
            );
            expect(decision.skipReason).toBeNull();
        });

        it('infers lead seniority from lead title', () => {
            const decision = evaluateJobCandidate(
                {
                    id: 'job-lead', title: 'Tech Lead Developer', company: 'Co',
                    location: 'Remote', easyApply: true
                },
                { excludedCompanies: [], appliedJobIds: [], desiredSeniorityLevels: ['lead'] }
            );
            expect(decision.skipReason).toBeNull();
        });

        it('infers intern seniority from intern title', () => {
            const decision = evaluateJobCandidate(
                {
                    id: 'job-intern', title: 'Software Engineering Intern', company: 'Co',
                    location: 'Remote', easyApply: true
                },
                { excludedCompanies: [], appliedJobIds: [], desiredSeniorityLevels: ['intern'] }
            );
            expect(decision.skipReason).toBeNull();
        });

        it('infers intern seniority from trainee title', () => {
            const decision = evaluateJobCandidate(
                {
                    id: 'job-trainee', title: 'Trainee Developer', company: 'Co',
                    location: 'Remote', easyApply: true
                },
                { excludedCompanies: [], appliedJobIds: [], desiredSeniorityLevels: ['intern'] }
            );
            expect(decision.skipReason).toBeNull();
        });
    });

    describe('inferSeniority branches via rankJobsForApply (lines 94, 105-108)', () => {
        const makeRankJob = (id, title, seniority) => ({
            id, title: title || 'Developer', company: 'Co',
            location: 'Remote', easyApply: true,
            postedHoursAgo: 10, seniority: seniority || undefined
        });
        const baseConfig = {
            roleTerms: [],
            keywordTerms: [],
            desiredSeniorityLevels: ['lead', 'senior', 'mid', 'junior', 'intern'],
            excludedCompanies: [],
            appliedJobIds: []
        };

        it('infers lead from director/principal title (line 94)', () => {
            const ranked = rankJobsForApply(
                [makeRankJob('dir', 'Principal Engineer')],
                baseConfig
            );
            expect(ranked[0].id).toBe('dir');
            expect(ranked[0].skipReason).toBeNull();
        });

        it('infers junior from jr title (line 106)', () => {
            const ranked = rankJobsForApply(
                [makeRankJob('jr', 'Jr Developer')],
                baseConfig
            );
            expect(ranked[0].id).toBe('jr');
        });

        it('infers intern from estagio title (line 108)', () => {
            const ranked = rankJobsForApply(
                [makeRankJob('est', 'Desenvolvedor Estagio Backend')],
                baseConfig
            );
            expect(ranked[0].id).toBe('est');
        });
    });

    describe('rankJobsForApply sort tie-break by postedHoursAgo (lines 339-346)', () => {
        const makeJob = (id, score_bias, hoursAgo) => ({
            id, title: 'Developer', company: 'Co', location: 'Remote',
            easyApply: true, postedHoursAgo: hoursAgo,
            seniority: 'mid'
        });

        it('sorts jobs with same score by postedHoursAgo ascending', () => {
            const ranked = rankJobsForApply(
                [
                    makeJob('older', 'unused', 48),
                    makeJob('newer', 'unused', 6)
                ],
                {
                    roleTerms: ['developer'],
                    keywordTerms: [],
                    desiredSeniorityLevels: ['mid'],
                    excludedCompanies: [],
                    appliedJobIds: []
                }
            );
            expect(ranked[0].id).toBe('newer');
            expect(ranked[1].id).toBe('older');
        });
    });

    describe('getOffshoreCompatibility empty text path', () => {
        it('returns allowed=true score=0.2 when job has no text fields and offshore is enabled', () => {
            // Job with no detailText, location, or workType → text is empty → returns {allowed:true, score:0.2}
            const decision = evaluateJobCandidate(
                {
                    id: 'job-empty', title: 'Developer', company: 'Co',
                    easyApply: true
                    // no detailText, no location, no workType
                },
                {
                    excludedCompanies: [],
                    appliedJobIds: [],
                    jobsBrazilOffshoreFriendly: true
                }
            );
            // Should not skip (offshore allowed=true)
            expect(decision.skipReason).toBeNull();
            expect(decision.offshoreCompatibility).toBe(0.2);
        });
    });

    afterAll(() => {
        delete global.matchesExcludedJobCompany;
        delete global.evaluateJobCandidate;
        delete global.rankJobsForApply;
        delete global.buildLinkedInJobsSearchUrl;
    });
});
