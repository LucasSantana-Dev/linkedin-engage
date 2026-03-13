const {
    matchesExcludedJobCompany,
    evaluateJobCandidate,
    rankJobsForApply
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
                    alreadyApplied: false
                },
                {
                    id: 'low',
                    title: 'Marketing Intern',
                    company: 'Gamma',
                    location: 'On-site',
                    easyApply: true,
                    postedHoursAgo: 72,
                    seniority: 'intern',
                    workType: 'onsite',
                    alreadyApplied: false
                }
            ],
            {
                excludedCompanies: [],
                appliedJobIds: [],
                roleTerms: ['product designer', 'ux designer'],
                desiredLevels: ['senior'],
                locationTerms: ['brazil', 'remote'],
                preferredCompanies: ['acme']
            }
        );

        expect(ranked).toHaveLength(3);
        expect(ranked[0].id).toBe('top');
        expect(ranked[1].id).toBe('mid');
        expect(ranked[2].id).toBe('low');
        expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
    });

    afterAll(() => {
        delete global.matchesExcludedJobCompany;
        delete global.evaluateJobCandidate;
        delete global.rankJobsForApply;
        delete global.buildLinkedInJobsSearchUrl;
    });
});
