const {
    AREA_PRESETS,
    applyAreaPresetToTags,
    buildConnectQueryFromTags,
    parseExcludedCompanies,
    migrateConnectPopupState,
    getConnectTemplates,
    shouldResetAreaPresetOnManualTag
} = require('../extension/lib/connect-config');

describe('connect-config', () => {
    describe('applyAreaPresetToTags', () => {
        it('applies role and industry terms for every preset', () => {
            Object.keys(AREA_PRESETS).forEach((preset) => {
                const out = applyAreaPresetToTags({}, preset);
                expect(out.role).toEqual(AREA_PRESETS[preset].role);
                expect(out.industry)
                    .toEqual(AREA_PRESETS[preset].industry);
            });
        });

        it('applies preset role and industry terms', () => {
            const out = applyAreaPresetToTags({
                role: ['old'],
                industry: ['old-industry'],
                market: ['latam'],
                level: ['senior']
            }, 'finance');

            expect(out.role).toEqual(AREA_PRESETS.finance.role);
            expect(out.industry).toEqual(AREA_PRESETS.finance.industry);
            expect(out.market).toEqual(['latam']);
            expect(out.level).toEqual(['senior']);
        });

        it('returns unchanged tags for custom preset', () => {
            const tags = {
                role: ['recruiter'],
                industry: ['software'],
                market: ['brazil'],
                level: ['lead']
            };
            expect(applyAreaPresetToTags(tags, 'custom')).toEqual(tags);
        });
    });

    describe('shouldResetAreaPresetOnManualTag', () => {
        it('resets preset for role and industry groups', () => {
            expect(shouldResetAreaPresetOnManualTag('role'))
                .toBe(true);
            expect(shouldResetAreaPresetOnManualTag('industry'))
                .toBe(true);
        });

        it('does not reset preset for other groups', () => {
            expect(shouldResetAreaPresetOnManualTag('market'))
                .toBe(false);
            expect(shouldResetAreaPresetOnManualTag('level'))
                .toBe(false);
        });
    });

    describe('buildConnectQueryFromTags', () => {
        it('builds one role OR group plus other terms', () => {
            const query = buildConnectQueryFromTags({
                role: [
                    'recruiter',
                    '"talent acquisition"',
                    '"hiring manager"',
                    'headhunter'
                ],
                industry: ['finance'],
                market: ['brazil'],
                level: ['senior']
            }, 3);

            expect(query).toContain('recruiter OR');
            expect(query).toContain('finance');
            expect(query).toContain('brazil');
            expect(query).toContain('senior');
            expect(query.includes('headhunter')).toBe(false);
        });

        it('returns empty query when all groups are empty', () => {
            expect(buildConnectQueryFromTags({}, 6)).toBe('');
        });
    });

    describe('parseExcludedCompanies', () => {
        it('trims and deduplicates excluded companies', () => {
            expect(parseExcludedCompanies(
                ' Acme  \n\nBeta\nacme\nBéta '
            )).toEqual(['Acme', 'Beta']);
        });

        it('accepts array input', () => {
            expect(parseExcludedCompanies([
                'Acme',
                '  Beta  ',
                'acme'
            ])).toEqual(['Acme', 'Beta']);
        });
    });

    describe('migrateConnectPopupState', () => {
        it('migrates legacy myCompany into excludedCompanies', () => {
            const result = migrateConnectPopupState({
                myCompany: 'Acme Corp',
                tags: { role: ['recruiter'] },
                tagVersion: 4
            });
            expect(result.changed).toBe(true);
            expect(result.state.excludedCompanies).toBe('Acme Corp');
            expect(result.state.tagVersion).toBe(5);
            expect(result.state.areaPreset).toBe('custom');
        });

        it('does not overwrite existing excludedCompanies', () => {
            const result = migrateConnectPopupState({
                myCompany: 'Acme Corp',
                excludedCompanies: 'Beta',
                tagVersion: 5,
                areaPreset: 'finance'
            });
            expect(result.state.excludedCompanies).toBe('Beta');
            expect(result.state.areaPreset).toBe('finance');
        });
    });

    describe('getConnectTemplates', () => {
        it('returns area-aware template copy for EN', () => {
            const templates = getConnectTemplates('finance', 'en');
            expect(templates.networking.toLowerCase())
                .toContain('finance');
        });

        it('returns area-aware template copy for PT', () => {
            const templates = getConnectTemplates(
                'real-estate',
                'pt'
            );
            expect(templates.networking.toLowerCase())
                .toContain('imobili');
        });
    });
});
