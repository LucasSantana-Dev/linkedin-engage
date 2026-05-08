// Mock chrome.storage.local before importing the module
const storageMock = (() => {
    let store = {};
    return {
        get: jest.fn((key, cb) => cb({ [key]: store[key] })),
        set: jest.fn((obj, cb) => { Object.assign(store, obj); if (cb) cb(); }),
        _reset: () => { store = {}; }
    };
})();

global.chrome = { storage: { local: storageMock } };

// Import using require since tests use CommonJS
const { FEATURE_KEYS, DEFAULTS, getFeatureToggles, setFeatureToggle } = require('../extension/lib/feature-toggles.js');

describe('FEATURE_KEYS', () => {
    test('contains expected keys', () => {
        expect(FEATURE_KEYS.CONNECT).toBe('connectEnabled');
        expect(FEATURE_KEYS.JOBS).toBe('jobsEnabled');
        expect(FEATURE_KEYS.COMPANIES).toBe('companiesEnabled');
    });
    test('is frozen', () => {
        expect(Object.isFrozen(FEATURE_KEYS)).toBe(true);
    });
});

describe('DEFAULTS', () => {
    test('all features enabled by default', () => {
        expect(DEFAULTS.connectEnabled).toBe(true);
        expect(DEFAULTS.jobsEnabled).toBe(true);
        expect(DEFAULTS.companiesEnabled).toBe(true);
    });
    test('is frozen', () => {
        expect(Object.isFrozen(DEFAULTS)).toBe(true);
    });
});

describe('getFeatureToggles', () => {
    beforeEach(() => { storageMock._reset(); });

    test('returns defaults when storage is empty', (done) => {
        storageMock.get.mockClear();
        storageMock.get.mockImplementation((key, cb) => cb({}));
        getFeatureToggles((toggles) => {
            expect(toggles.connectEnabled).toBe(true);
            expect(toggles.jobsEnabled).toBe(true);
            expect(toggles.companiesEnabled).toBe(true);
            done();
        });
    });
    test('merges stored state over defaults', (done) => {
        storageMock.get.mockClear();
        storageMock.get.mockImplementation((key, cb) => cb({ featureToggles: { connectEnabled: false } }));
        getFeatureToggles((toggles) => {
            expect(toggles.connectEnabled).toBe(false);
            expect(toggles.jobsEnabled).toBe(true);
            done();
        });
    });
    test('returns defaults when no chrome available', (done) => {
        const savedChrome = global.chrome;
        delete global.chrome;
        getFeatureToggles((toggles) => {
            expect(toggles.connectEnabled).toBe(true);
            global.chrome = savedChrome;
            done();
        });
    });
});

describe('setFeatureToggle', () => {
    beforeEach(() => { storageMock._reset(); storageMock.set.mockClear(); });

    test('writes single toggle to storage', (done) => {
        setFeatureToggle('connectEnabled', false, (err) => {
            expect(err).toBeNull();
            expect(storageMock.set).toHaveBeenCalled();
            done();
        });
    });
    test('coerces value to boolean', (done) => {
        setFeatureToggle('jobsEnabled', 0, () => {
            const setCall = storageMock.set.mock.calls[0][0];
            expect(setCall.featureToggles.jobsEnabled).toBe(false);
            done();
        });
    });
    test('returns error for unknown key', (done) => {
        setFeatureToggle('unknownKey', true, (err) => {
            expect(err).toBeInstanceOf(Error);
            done();
        });
    });
    test('works without callback for unknown key', () => {
        expect(() => setFeatureToggle('unknownKey', true)).not.toThrow();
    });
    test('calls callback with null when chrome is not available', (done) => {
        const savedChrome = global.chrome;
        delete global.chrome;
        setFeatureToggle('connectEnabled', false, (err) => {
            expect(err).toBeNull();
            global.chrome = savedChrome;
            done();
        });
    });
});
