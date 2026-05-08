const {
    FEATURE_KEYS,
    DEFAULTS,
    getFeatureToggles,
    setFeatureToggle
} = require('../extension/lib/feature-toggles.js');

describe('feature-toggles', () => {
    describe('FEATURE_KEYS', () => {
        it('should be frozen', () => {
            expect(Object.isFrozen(FEATURE_KEYS)).toBe(true);
        });

        it('should have CONNECT, JOBS, COMPANIES keys', () => {
            expect(FEATURE_KEYS.CONNECT).toBe('connectEnabled');
            expect(FEATURE_KEYS.JOBS).toBe('jobsEnabled');
            expect(FEATURE_KEYS.COMPANIES).toBe('companiesEnabled');
        });

        it('should have correct number of keys', () => {
            const keys = Object.keys(FEATURE_KEYS);
            expect(keys.length).toBe(3);
        });
    });

    describe('DEFAULTS', () => {
        it('should be frozen', () => {
            expect(Object.isFrozen(DEFAULTS)).toBe(true);
        });

        it('should have all toggles enabled by default', () => {
            expect(DEFAULTS.connectEnabled).toBe(true);
            expect(DEFAULTS.jobsEnabled).toBe(true);
            expect(DEFAULTS.companiesEnabled).toBe(true);
        });

        it('should have correct number of defaults', () => {
            const keys = Object.keys(DEFAULTS);
            expect(keys.length).toBe(3);
        });
    });

    describe('getFeatureToggles', () => {
        it('should return defaults when chrome.storage is not available', (done) => {
            getFeatureToggles((toggles) => {
                expect(toggles).toEqual(DEFAULTS);
                done();
            });
        });

        it('should invoke callback with all three toggles', (done) => {
            getFeatureToggles((toggles) => {
                expect(toggles.connectEnabled).toBeDefined();
                expect(toggles.jobsEnabled).toBeDefined();
                expect(toggles.companiesEnabled).toBeDefined();
                done();
            });
        });

        it('should preserve default values in returned object', (done) => {
            getFeatureToggles((toggles) => {
                expect(typeof toggles.connectEnabled).toBe('boolean');
                expect(typeof toggles.jobsEnabled).toBe('boolean');
                expect(typeof toggles.companiesEnabled).toBe('boolean');
                done();
            });
        });

        it('should merge stored toggles with defaults', (done) => {
            // Setup global chrome object with mock storage
            const originalChrome = global.chrome;
            global.chrome = {
                storage: {
                    local: {
                        get: jest.fn((key, cb) => {
                            cb({ featureToggles: { connectEnabled: false } });
                        })
                    }
                }
            };

            getFeatureToggles((toggles) => {
                expect(toggles.connectEnabled).toBe(false);
                expect(toggles.jobsEnabled).toBe(true);
                expect(toggles.companiesEnabled).toBe(true);
                global.chrome = originalChrome;
                done();
            });
        });
    });

    describe('setFeatureToggle', () => {
        it('should return error for unknown toggle key', (done) => {
            setFeatureToggle('invalidKey', true, (err) => {
                expect(err).toBeDefined();
                expect(err.message).toMatch(/Unknown toggle key/);
                done();
            });
        });

        it('should coerce value to boolean true', (done) => {
            setFeatureToggle(FEATURE_KEYS.CONNECT, 'truthy', (err) => {
                expect(err).toBeFalsy();
                done();
            });
        });

        it('should coerce value to boolean false', (done) => {
            setFeatureToggle(FEATURE_KEYS.CONNECT, 0, (err) => {
                expect(err).toBeFalsy();
                done();
            });
        });

        it('should handle callback being undefined', () => {
            expect(() => {
                setFeatureToggle(FEATURE_KEYS.CONNECT, true);
            }).not.toThrow();
        });

        it('should handle error callback when chrome is unavailable', (done) => {
            setFeatureToggle('unknownKey', true, (err) => {
                expect(err).toBeDefined();
                done();
            });
        });

        it('should accept all valid toggle keys', (done) => {
            const validKeys = [
                FEATURE_KEYS.CONNECT,
                FEATURE_KEYS.JOBS,
                FEATURE_KEYS.COMPANIES
            ];

            let processed = 0;
            validKeys.forEach(key => {
                setFeatureToggle(key, true, (err) => {
                    expect(err).toBeFalsy();
                    processed++;
                    if (processed === validKeys.length) {
                        done();
                    }
                });
            });
        });

        it('should write to chrome.storage when available', (done) => {
            const originalChrome = global.chrome;
            global.chrome = {
                storage: {
                    local: {
                        get: jest.fn((key, cb) => {
                            cb({ featureToggles: { connectEnabled: true, jobsEnabled: true, companiesEnabled: true } });
                        }),
                        set: jest.fn((data, cb) => {
                            expect(data.featureToggles.connectEnabled).toBe(false);
                            cb();
                        })
                    }
                }
            };

            setFeatureToggle(FEATURE_KEYS.CONNECT, false, (err) => {
                expect(err).toBeFalsy();
                expect(global.chrome.storage.local.set).toHaveBeenCalled();
                global.chrome = originalChrome;
                done();
            });
        });

        it('should return frozen API object', () => {
            expect(Object.isFrozen(
                require('../extension/lib/feature-toggles.js')
            )).toBe(true);
        });
    });
});
