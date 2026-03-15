const {
    validateResumeVaultFileMeta,
    analyzeJobsCareerInputs,
    buildJobsCareerSearchPlan,
    getBrazilOffshoreSignals
} = require('../extension/lib/jobs-career-intelligence');

describe('jobs career intelligence', () => {
    it('accepts pdf/docx and rejects legacy doc uploads', () => {
        expect(validateResumeVaultFileMeta({
            name: 'resume.pdf',
            size: 1024
        })).toEqual(expect.objectContaining({
            ok: true,
            extension: 'pdf'
        }));

        expect(validateResumeVaultFileMeta({
            name: 'resume.docx',
            size: 1024
        })).toEqual(expect.objectContaining({
            ok: true,
            extension: 'docx'
        }));

        expect(validateResumeVaultFileMeta({
            name: 'resume.doc',
            size: 1024
        })).toEqual(expect.objectContaining({
            ok: false,
            reason: 'unsupported-file-type'
        }));
    });

    it('builds deterministic career intelligence from profile and resumes', () => {
        const intel = analyzeJobsCareerInputs({
            profile: {
                currentTitle: 'Senior Full Stack Engineer',
                city: 'Goiania, Brazil',
                resumeSummary:
                    'Senior engineer focused on React, Node.js, AWS and ' +
                    'distributed product teams.'
            },
            importedProfile: {
                headline: 'Senior Full Stack Engineer | React | Node.js | AWS',
                location: 'Brazil',
                skills: ['React', 'Node.js', 'AWS', 'TypeScript'],
                experiences: [
                    'Senior Full Stack Engineer at Hubla',
                    'Software Engineer at CI&T'
                ]
            },
            resumeDocuments: [
                {
                    fileName: 'cv-lucas.pdf',
                    extractedText:
                        'Senior Full Stack Engineer building React, TypeScript, ' +
                        'Node.js and AWS products for global remote teams. ' +
                        'Worked with PostgreSQL, Redis and Docker.'
                }
            ]
        });

        expect(intel.areaPreset).toBe('tech');
        expect(intel.seniority).toBe('senior');
        expect(intel.inferredRoles).toEqual(
            expect.arrayContaining([
                'full stack engineer',
                'software engineer'
            ])
        );
        expect(intel.keywordTerms).toEqual(
            expect.arrayContaining([
                'react',
                'node.js',
                'aws',
                'typescript'
            ])
        );
        expect(intel.keywordTerms).not.toContain('team');
        expect(intel.locationTerms).toEqual(
            expect.arrayContaining(['brazil', 'remote'])
        );
        expect(intel.workType).toBe('2');
        expect(intel.experienceLevel).toBe('4');
    });

    it('builds a bounded boolean jobs search plan with keyword terms', () => {
        const plan = buildJobsCareerSearchPlan({
            areaPreset: 'tech',
            seniority: 'senior',
            inferredRoles: [
                'full stack engineer',
                'software engineer',
                'backend engineer'
            ],
            keywordTerms: [
                'react',
                'node.js',
                'aws',
                'typescript',
                'postgresql'
            ],
            locationTerms: ['brazil', 'remote'],
            workType: '2',
            experienceLevel: '4'
        }, {
            searchLanguageMode: 'en',
            jobsBrazilOffshoreFriendly: false
        });

        expect(plan.roleTerms).toEqual([
            'full stack engineer',
            'software engineer',
            'backend engineer'
        ]);
        expect(plan.resolvedSearchLocale).toBe('en');
        expect(plan.keywordTerms).toEqual(
            expect.arrayContaining(['react', 'aws'])
        );
        expect(plan.query).toContain('"full stack engineer"');
        expect(plan.query).toContain('"software engineer"');
        expect(plan.operatorCount).toBeLessThanOrEqual(12);
        expect(plan.workType).toBe('2');
        expect(plan.experienceLevel).toBe('4');
    });

    it('prefers portuguese auto locale for brazil-local plans when offshore is off', () => {
        const plan = buildJobsCareerSearchPlan({
            areaPreset: 'tech',
            seniority: 'senior',
            inferredRoles: ['software engineer'],
            keywordTerms: ['react', 'typescript'],
            locationTerms: ['brazil', 'remote'],
            workType: '2',
            experienceLevel: '4'
        }, {
            searchLanguageMode: 'auto',
            jobsBrazilOffshoreFriendly: false
        });

        expect(plan.resolvedSearchLocale).toBe('pt_BR');
        expect(plan.query.toLowerCase()).toContain('engenheiro de software');
        expect(plan.query.toLowerCase()).toContain('brasil');
    });

    it('provides brazil offshore search signals', () => {
        expect(getBrazilOffshoreSignals()).toEqual(
            expect.arrayContaining([
                'brazil',
                'latam',
                'remote',
                'independent contractor',
                'employer of record',
                'timezone overlap'
            ])
        );
    });

    describe('analyzeJobsCareerInputs — seniority and area detection', () => {
        it('detects lead/staff/principal/head/director seniority', () => {
            ['staff engineer', 'principal engineer', 'head of engineering',
                'director of engineering', 'tech lead'].forEach(title => {
                const result = analyzeJobsCareerInputs({
                    importedProfile: { headline: title }
                });
                expect(result.seniority).toBe('lead');
            });
        });

        it('detects senior / sr seniority', () => {
            ['Senior Software Engineer', 'Sr Developer'].forEach(title => {
                const result = analyzeJobsCareerInputs({
                    importedProfile: { headline: title }
                });
                expect(result.seniority).toBe('senior');
            });
        });

        it('detects mid/pleno/associate seniority', () => {
            ['Mid-level Developer', 'Associate Engineer', 'Pleno Backend'].forEach(title => {
                const result = analyzeJobsCareerInputs({
                    importedProfile: { headline: title }
                });
                expect(result.seniority).toBe('mid');
            });
        });

        it('detects junior/jr/entry seniority', () => {
            ['Junior Developer', 'Jr Engineer', 'Entry Level Analyst'].forEach(title => {
                const result = analyzeJobsCareerInputs({
                    importedProfile: { headline: title }
                });
                expect(result.seniority).toBe('junior');
            });
        });

        it('detects intern/trainee/estagio seniority', () => {
            ['Intern Developer', 'Trainee Engineer', 'Estagio em TI'].forEach(title => {
                const result = analyzeJobsCareerInputs({
                    importedProfile: { headline: title }
                });
                expect(result.seniority).toBe('intern');
            });
        });

        it('defaults to mid when seniority is ambiguous', () => {
            const result = analyzeJobsCareerInputs({
                importedProfile: { headline: 'Software Developer' }
            });
            expect(result.seniority).toBe('mid');
        });

        it('maps experienceLevel correctly for all seniority levels', () => {
            const cases = [
                ['Staff Engineer', '5'],
                ['Senior Developer', '4'],
                ['Mid-Level Engineer', '3'],
                ['Junior Developer', '2'],
                ['Intern Developer', '1']
            ];
            cases.forEach(([title, expectedLevel]) => {
                const result = analyzeJobsCareerInputs({
                    importedProfile: { headline: title }
                });
                expect(result.experienceLevel).toBe(expectedLevel);
            });
        });

        it('infers creative area preset from designer/ux/ui keywords', () => {
            const result = analyzeJobsCareerInputs({
                importedProfile: { headline: 'Senior UX Designer' }
            });
            expect(result.areaPreset).toBe('creative');
        });

        it('infers tech area preset from engineer/developer/react keywords', () => {
            const result = analyzeJobsCareerInputs({
                importedProfile: { headline: 'React Developer' }
            });
            expect(result.areaPreset).toBe('tech');
        });

        it('infers tech area preset from aws/typescript/python in skills', () => {
            const result = analyzeJobsCareerInputs({
                profile: { headline: 'Engineer' },
                importedProfile: { skills: ['AWS', 'TypeScript', 'Node.js'] }
            });
            expect(result.areaPreset).toBe('tech');
        });

        it('falls back to custom when no recognizable tech/creative keywords', () => {
            const result = analyzeJobsCareerInputs({
                profile: { headline: 'Account Manager' }
            });
            expect(result.areaPreset).toBe('custom');
        });

        it('extracts keyword terms from skills and resume text', () => {
            const result = analyzeJobsCareerInputs({
                importedProfile: {
                    headline: 'Backend Engineer',
                    skills: ['Node.js', 'TypeScript', 'PostgreSQL', 'Redis']
                }
            });
            expect(result.keywordTerms.length).toBeGreaterThan(0);
        });

        it('deduplicates inferred roles', () => {
            const result = analyzeJobsCareerInputs({
                profile: { headline: 'Software Engineer' },
                importedProfile: {
                    headline: 'Software Engineer',
                    experiences: ['Software Engineer at Nubank', 'Software Engineer at Stripe']
                }
            });
            const dupes = result.inferredRoles.filter(
                r => r === result.inferredRoles[0]
            );
            expect(dupes.length).toBe(1);
        });

        it('handles completely empty input', () => {
            const result = analyzeJobsCareerInputs({});
            expect(result).toHaveProperty('inferredRoles');
            expect(result).toHaveProperty('keywordTerms');
            expect(result).toHaveProperty('seniority');
            expect(result).toHaveProperty('areaPreset');
        });
    });

    describe('buildJobsCareerSearchPlan — chooseTemplateId paths', () => {
        it('selects creative target_company_roles template for creative preset', () => {
            const plan = buildJobsCareerSearchPlan({
                areaPreset: 'creative',
                seniority: 'senior',
                inferredRoles: ['product designer'],
                keywordTerms: ['figma'],
                locationTerms: ['remote'],
                workType: '2',
                experienceLevel: '4'
            }, {});
            expect(plan.templateId).toContain('creative');
        });

        it('selects market_scan template for tech + broad bucket', () => {
            const plan = buildJobsCareerSearchPlan({
                areaPreset: 'tech',
                seniority: 'senior',
                inferredRoles: ['software engineer'],
                keywordTerms: ['react'],
                locationTerms: ['remote'],
                workType: '2',
                experienceLevel: '4'
            }, { expectedResultsBucket: 'broad' });
            expect(plan.templateId).toContain('market_scan');
        });

        it('selects high_fit_easy_apply template for tech + precise bucket', () => {
            const plan = buildJobsCareerSearchPlan({
                areaPreset: 'tech',
                seniority: 'senior',
                inferredRoles: ['software engineer'],
                keywordTerms: ['react'],
                locationTerms: ['remote'],
                workType: '2',
                experienceLevel: '4'
            }, { expectedResultsBucket: 'precise' });
            expect(plan.templateId).toContain('high_fit_easy_apply');
        });

        it('selects custom high_fit_easy_apply template for custom preset', () => {
            const plan = buildJobsCareerSearchPlan({
                areaPreset: 'custom',
                seniority: 'mid',
                inferredRoles: ['account manager'],
                keywordTerms: ['sales'],
                locationTerms: ['remote'],
                workType: '2',
                experienceLevel: '3'
            }, {});
            expect(plan.templateId).toContain('custom');
        });
    });
});
