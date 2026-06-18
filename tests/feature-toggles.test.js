/**
 * Tests for feature-toggles.js — the Connect/Jobs/Companies enable flags
 * and the pure isFeatureEnabled() gate used by background.js.
 */
const {
    FEATURE_KEYS,
    DEFAULTS,
    getFeatureToggles,
    setFeatureToggle,
    isFeatureEnabled
} = require('../extension/lib/feature-toggles.js');

afterEach(() => { delete global.chrome; });

describe('FEATURE_KEYS', () => {
    it('is frozen', () => {
        expect(Object.isFrozen(FEATURE_KEYS)).toBe(true);
    });
    it('maps CONNECT/JOBS/COMPANIES to storage keys', () => {
        expect(FEATURE_KEYS.CONNECT).toBe('connectEnabled');
        expect(FEATURE_KEYS.JOBS).toBe('jobsEnabled');
        expect(FEATURE_KEYS.COMPANIES).toBe('companiesEnabled');
    });
    it('has exactly 3 keys', () => {
        expect(Object.keys(FEATURE_KEYS)).toHaveLength(3);
    });
});

describe('DEFAULTS', () => {
    it('is frozen', () => {
        expect(Object.isFrozen(DEFAULTS)).toBe(true);
    });
    it('enables every feature by default', () => {
        expect(DEFAULTS.connectEnabled).toBe(true);
        expect(DEFAULTS.jobsEnabled).toBe(true);
        expect(DEFAULTS.companiesEnabled).toBe(true);
    });
});

describe('getFeatureToggles', () => {
    it('returns defaults when chrome.storage is unavailable', (done) => {
        getFeatureToggles((toggles) => {
            expect(toggles).toEqual(DEFAULTS);
            done();
        });
    });

    it('merges stored values over defaults', (done) => {
        global.chrome = {
            storage: {
                local: {
                    get: (key, cb) => cb({
                        featureToggles: { connectEnabled: false }
                    })
                }
            }
        };
        getFeatureToggles((toggles) => {
            expect(toggles.connectEnabled).toBe(false);
            expect(toggles.jobsEnabled).toBe(true);
            expect(toggles.companiesEnabled).toBe(true);
            done();
        });
    });
});

describe('setFeatureToggle', () => {
    it('errors on an unknown key', (done) => {
        setFeatureToggle('bogusEnabled', true, (err) => {
            expect(err).toBeInstanceOf(Error);
            expect(err.message).toMatch(/Unknown toggle key/);
            done();
        });
    });

    it('does not throw with no callback', () => {
        expect(() => setFeatureToggle('bogusEnabled', true)).not.toThrow();
    });

    it('calls back null when chrome is unavailable', (done) => {
        setFeatureToggle(FEATURE_KEYS.CONNECT, false, (err) => {
            expect(err).toBeNull();
            done();
        });
    });

    it('coerces the value to boolean and writes storage', (done) => {
        let written = null;
        global.chrome = {
            storage: {
                local: {
                    get: (key, cb) => cb({ featureToggles: {} }),
                    set: (obj, cb) => { written = obj; cb(); }
                }
            }
        };
        setFeatureToggle(FEATURE_KEYS.JOBS, 0, (err) => {
            expect(err).toBeNull();
            expect(written.featureToggles.jobsEnabled).toBe(false);
            done();
        });
    });
});

describe('isFeatureEnabled', () => {
    const allOn = { connectEnabled: true, jobsEnabled: true, companiesEnabled: true };

    it('maps connect mode to connectEnabled', () => {
        expect(isFeatureEnabled('connect', { ...allOn, connectEnabled: false }))
            .toBe(false);
        expect(isFeatureEnabled('connect', allOn)).toBe(true);
    });

    it('maps companies + companyFollow aliases to companiesEnabled', () => {
        const off = { ...allOn, companiesEnabled: false };
        expect(isFeatureEnabled('companies', off)).toBe(false);
        expect(isFeatureEnabled('companyFollow', off)).toBe(false);
    });

    it('maps jobs + jobsAssist aliases to jobsEnabled', () => {
        const off = { ...allOn, jobsEnabled: false };
        expect(isFeatureEnabled('jobs', off)).toBe(false);
        expect(isFeatureEnabled('jobsAssist', off)).toBe(false);
    });

    it('defaults to enabled when the toggle value is missing', () => {
        expect(isFeatureEnabled('connect', {})).toBe(true);
        expect(isFeatureEnabled('connect', null)).toBe(true);
    });

    it('treats an unknown mode as enabled (fail-open)', () => {
        expect(isFeatureEnabled('feed', { connectEnabled: false })).toBe(true);
    });
});
