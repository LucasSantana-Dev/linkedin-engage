const { INTENT_PRESETS } = require('../extension/lib/intent-presets');
const { AREA_PRESETS } = require('../extension/lib/connect-config');
const {
    EXPECTED_RESULTS_BUCKETS,
    MODE_USAGE_GOALS
} = require('../extension/lib/search-templates');
const {
    SEARCH_LANGUAGE_MODES
} = require('../extension/lib/search-language');

describe('INTENT_PRESETS contract', () => {
    it('every entry references an areaPreset that exists in AREA_PRESETS', () => {
        const missing = [];
        Object.entries(INTENT_PRESETS).forEach(([intentKey, spec]) => {
            if (!Object.prototype.hasOwnProperty.call(
                AREA_PRESETS,
                spec.areaPreset
            )) {
                missing.push(`${intentKey} → ${spec.areaPreset}`);
            }
        });
        expect(missing).toEqual([]);
    });

    it('every entry uses a recognized usageGoal for connect mode', () => {
        const validGoals = MODE_USAGE_GOALS.connect;
        Object.entries(INTENT_PRESETS).forEach(([intentKey, spec]) => {
            expect(validGoals).toContain(spec.usageGoal);
        });
    });

    it('every entry uses a recognized expectedResults bucket', () => {
        Object.entries(INTENT_PRESETS).forEach(([intentKey, spec]) => {
            expect(EXPECTED_RESULTS_BUCKETS)
                .toContain(spec.expectedResults);
        });
    });

    it('every entry uses a recognized language mode', () => {
        const validLanguages = SEARCH_LANGUAGE_MODES || [
            'auto',
            'en',
            'pt_BR',
            'bilingual'
        ];
        Object.entries(INTENT_PRESETS).forEach(([intentKey, spec]) => {
            expect(validLanguages).toContain(spec.language);
        });
    });

    it('every entry has goalMode of passive or active', () => {
        Object.entries(INTENT_PRESETS).forEach(([intentKey, spec]) => {
            expect(['passive', 'active']).toContain(spec.goalMode);
        });
    });

    it('object is frozen so entries cannot mutate at runtime', () => {
        expect(Object.isFrozen(INTENT_PRESETS)).toBe(true);
    });
});
