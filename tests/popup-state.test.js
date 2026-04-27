const {
    DEFAULT_POPUP_STATE,
    loadPopupState,
    savePopupState
} = require('../extension/lib/popup-state');

describe('popup-state contract', () => {
    describe('DEFAULT_POPUP_STATE shape', () => {
        it('is frozen so entries cannot mutate at runtime', () => {
            expect(Object.isFrozen(DEFAULT_POPUP_STATE)).toBe(true);
        });

        it('has expected top-level keys for connect mode', () => {
            const connectKeys = [
                'areaPreset',
                'connectUsageGoal',
                'connectExpectedResults',
                'connectTemplateAuto',
                'connectTemplateId',
                'connectSearchLanguageMode'
            ];
            connectKeys.forEach(key => {
                expect(DEFAULT_POPUP_STATE).toHaveProperty(key);
            });
        });

        it('has expected top-level keys for company mode', () => {
            const companyKeys = [
                'companyAreaPreset',
                'companyUsageGoal',
                'companyExpectedResults',
                'companyTemplateAuto',
                'companyTemplateId',
                'companySearchLanguageMode'
            ];
            companyKeys.forEach(key => {
                expect(DEFAULT_POPUP_STATE).toHaveProperty(key);
            });
        });

        it('has expected top-level keys for jobs mode', () => {
            const jobsKeys = [
                'jobsAreaPreset',
                'jobsUsageGoal',
                'jobsExpectedResults',
                'jobsTemplateAuto',
                'jobsTemplateId',
                'jobsSearchLanguageMode'
            ];
            jobsKeys.forEach(key => {
                expect(DEFAULT_POPUP_STATE).toHaveProperty(key);
            });
        });

        it('has expected top-level keys for common settings', () => {
            const commonKeys = [
                'tags',
                'currentMode',
                'goalMode',
                'limit',
                'scheduleEnabled',
                'feedComment',
                'aiApiKey',
                'ui',
                'tagVersion'
            ];
            commonKeys.forEach(key => {
                expect(DEFAULT_POPUP_STATE).toHaveProperty(key);
            });
        });
    });

    describe('loadPopupState', () => {
        beforeEach(() => {
            // Mock chrome.storage.local.get
            global.chrome = {
                storage: {
                    local: {
                        get: jest.fn()
                    }
                }
            };
        });

        it('returns null state when no popupState is stored', async () => {
            chrome.storage.local.get.mockImplementation((keys, callback) => {
                callback({});
            });

            const result = await loadPopupState();
            expect(result.state).toBe(null);
            expect(result.uiLanguageMode).toBe('auto');
        });

        it('returns stored state when popupState exists', async () => {
            const storedState = {
                ...DEFAULT_POPUP_STATE,
                areaPreset: 'recruiter-tech-global',
                limit: 50
            };
            chrome.storage.local.get.mockImplementation((keys, callback) => {
                callback({
                    popupState: storedState,
                    uiLanguageMode: 'en'
                });
            });

            const result = await loadPopupState();
            expect(result.state).toEqual(storedState);
            expect(result.uiLanguageMode).toBe('en');
        });

        it('applies migration function if provided and state changed', async () => {
            const oldState = {
                areaPreset: 'recruiter-tech-global',
                myCompany: 'OldCorp'
            };
            const migratedState = {
                areaPreset: 'recruiter-tech-global',
                excludedCompanies: 'OldCorp'
            };

            chrome.storage.local.get.mockImplementation((keys, callback) => {
                callback({ popupState: oldState });
            });

            // Mock the persist call during migration
            chrome.storage.local.set = jest.fn((data, cb) => {
                if (cb) cb();
            });

            const mockMigrate = jest.fn(() => ({
                state: migratedState,
                changed: true
            }));

            const result = await loadPopupState(mockMigrate);
            expect(result.state).toEqual(migratedState);
            expect(mockMigrate).toHaveBeenCalledWith(oldState);
            expect(chrome.storage.local.set).toHaveBeenCalledWith(
                { popupState: migratedState },
                expect.any(Function)
            );
        });

        it('does not persist migration if state unchanged', async () => {
            const storedState = {
                areaPreset: 'recruiter-tech-global'
            };

            chrome.storage.local.get.mockImplementation((keys, callback) => {
                callback({ popupState: storedState });
            });

            chrome.storage.local.set = jest.fn();

            const mockMigrate = jest.fn(() => ({
                state: storedState,
                changed: false
            }));

            const result = await loadPopupState(mockMigrate);
            expect(result.state).toEqual(storedState);
            expect(chrome.storage.local.set).not.toHaveBeenCalled();
        });
    });

    describe('savePopupState', () => {
        beforeEach(() => {
            global.chrome = {
                storage: {
                    local: {
                        set: jest.fn()
                    }
                }
            };
        });

        it('saves state to chrome.storage.local', async () => {
            const stateToSave = {
                ...DEFAULT_POPUP_STATE,
                areaPreset: 'recruiter-tech-global',
                limit: 75
            };

            chrome.storage.local.set.mockImplementation((data, callback) => {
                callback();
            });

            await savePopupState(stateToSave, 'en');

            expect(chrome.storage.local.set).toHaveBeenCalledWith(
                {
                    popupState: stateToSave,
                    uiLanguageMode: 'en'
                },
                expect.any(Function)
            );
        });

        it('defaults uiLanguageMode to auto if not provided', async () => {
            const stateToSave = DEFAULT_POPUP_STATE;

            chrome.storage.local.set.mockImplementation((data, callback) => {
                callback();
            });

            await savePopupState(stateToSave);

            expect(chrome.storage.local.set).toHaveBeenCalledWith(
                expect.objectContaining({
                    uiLanguageMode: 'auto'
                }),
                expect.any(Function)
            );
        });
    });

    describe('round-trip save and load', () => {
        it('preserves state through save and load cycle', async () => {
            const originalState = {
                ...DEFAULT_POPUP_STATE,
                areaPreset: 'recruiter-tech-global',
                connectUsageGoal: 'peer_networking',
                limit: 75,
                scheduleInterval: 'weekly',
                tags: { role: ['developer', 'architect'] }
            };

            // Simulate chrome.storage as in-memory store
            let storedData = {};
            global.chrome = {
                storage: {
                    local: {
                        set: jest.fn((data, callback) => {
                            storedData = { ...storedData, ...data };
                            if (callback) callback();
                        }),
                        get: jest.fn((keys, callback) => {
                            const result = {};
                            if (Array.isArray(keys)) {
                                keys.forEach(key => {
                                    if (storedData[key]) result[key] = storedData[key];
                                });
                            } else if (typeof keys === 'string') {
                                if (storedData[keys]) result[keys] = storedData[keys];
                            }
                            callback(result);
                        })
                    }
                }
            };

            // Save
            await savePopupState(originalState, 'pt_BR');

            // Load
            const loaded = await loadPopupState();

            expect(loaded.state).toEqual(originalState);
            expect(loaded.uiLanguageMode).toBe('pt_BR');
        });
    });
});
