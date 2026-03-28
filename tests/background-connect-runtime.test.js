describe('background connect runtime config', () => {
    let runtimeListener;
    let alarmListener;
    let tabUpdatedListeners;
    let storageData;
    let runtimeMessages;
    let sentToContent;

    function tick() {
        return new Promise(resolve => setTimeout(resolve, 0));
    }

    function getKeywordsFromUrl(url) {
        const parsed = new URL(url);
        return parsed.searchParams.get('keywords') || '';
    }

    function emitTabUpdated(tabId, tab) {
        for (const listener of tabUpdatedListeners) {
            listener(tabId, { status: 'complete' }, tab);
        }
    }

    function setupChrome() {
        tabUpdatedListeners = [];
        storageData = {};
        runtimeMessages = [];
        sentToContent = [];

        global.importScripts = jest.fn();
        global.getHourKey = jest.fn(mode => `hour_${mode}`);
        global.getDayKey = jest.fn(mode => `day_${mode}`);
        global.getWeekKey = jest.fn(() => 'week_2026_11');
        global.checkLimits = jest.fn(() => ({
            allowed: true,
            remaining: 999
        }));
        global.incrementCount = jest.fn();
        global.cleanupOldKeys = jest.fn();
        global.computeStats = jest.fn(() => ({}));
        global.computeAcceptanceByHour = jest.fn(() => ({}));
        global.computeScheduleRecommendation = jest.fn(() => ({
            shouldRunNow: true
        }));
        global.recordEngagement = jest.fn();
        global.resolveFeedWarmupConfig = jest.fn(async req => req);
        global.loadFeedWarmupState = jest.fn(async () => ({}));
        global.buildFeedWarmupProgress = jest.fn(() => ({}));
        global.getDefaultFeedWarmupState = jest.fn(() => ({}));
        global.resetFeedWarmupState = jest.fn(() => ({}));
        global.saveFeedWarmupState = jest.fn(async () => {});
        global.updatePatternMemory = jest.fn(async () => {});
        global.persistFeedWarmupAfterRun = jest.fn(async () => {});
        global.getNurtureList = jest.fn(async () => []);
        global.getActiveNurtureTargets = jest.fn(() => []);
        global.buildNurtureUrl = jest.fn(url => url);
        global.recordNurtureEngagement = jest.fn();
        global.cleanExpiredNurtures = jest.fn();

        const connectConfig = require('../extension/lib/connect-config');
        Object.assign(global, connectConfig);
        const runOutcome = require('../extension/lib/run-outcome');
        Object.assign(global, runOutcome);

        let tabIdCounter = 300;
        const tabMap = new Map();

        global.chrome = {
            tabs: {
                onUpdated: {
                    addListener: jest.fn(listener => {
                        tabUpdatedListeners.push(listener);
                    }),
                    removeListener: jest.fn(listener => {
                        tabUpdatedListeners = tabUpdatedListeners
                            .filter(fn => fn !== listener);
                    })
                },
                onRemoved: {
                    addListener: jest.fn(),
                    removeListener: jest.fn()
                },
                create: jest.fn((opts, cb) => {
                    tabIdCounter += 1;
                    const tab = {
                        id: tabIdCounter,
                        url: opts.url,
                        status: 'complete'
                    };
                    tabMap.set(tab.id, tab);
                    cb(tab);
                    setTimeout(() => emitTabUpdated(tab.id, tab), 0);
                }),
                get: jest.fn((tabId, cb) => {
                    cb(tabMap.get(tabId) || {
                        id: tabId,
                        status: 'complete'
                    });
                }),
                sendMessage: jest.fn((tabId, payload, cb) => {
                    sentToContent.push({ tabId, payload });
                    if (typeof cb === 'function') cb();
                }),
                remove: jest.fn(),
                update: jest.fn()
            },
            scripting: {
                executeScript: jest.fn((opts, cb) => {
                    if (typeof cb === 'function') cb();
                    return Promise.resolve([]);
                })
            },
            runtime: {
                lastError: null,
                onMessage: {
                    addListener: jest.fn(listener => {
                        runtimeListener = listener;
                    })
                },
                onInstalled: { addListener: jest.fn() },
                onStartup: { addListener: jest.fn() },
                sendMessage: jest.fn((payload, cb) => {
                    runtimeMessages.push(payload);
                    if (typeof cb === 'function') cb({});
                })
            },
            alarms: {
                create: jest.fn(),
                clear: jest.fn(),
                onAlarm: {
                    addListener: jest.fn(listener => {
                        alarmListener = listener;
                    })
                }
            },
            notifications: {
                create: jest.fn()
            },
            storage: {
                local: {
                    get: jest.fn((keys, cb) => {
                        if (Array.isArray(keys)) {
                            const out = {};
                            for (const key of keys) {
                                out[key] = storageData[key];
                            }
                            cb(out);
                            return;
                        }
                        if (typeof keys === 'string') {
                            cb({ [keys]: storageData[keys] });
                            return;
                        }
                        if (keys && typeof keys === 'object') {
                            const out = {};
                            for (const [k, v] of Object.entries(keys)) {
                                out[k] = storageData[k] ?? v;
                            }
                            cb(out);
                            return;
                        }
                        cb({ ...storageData });
                    }),
                    set: jest.fn((obj, cb) => {
                        Object.assign(storageData, obj);
                        if (typeof cb === 'function') cb();
                    }),
                    remove: jest.fn((keys, cb) => {
                        const arr = Array.isArray(keys)
                            ? keys : [keys];
                        for (const key of arr) {
                            delete storageData[key];
                        }
                        if (typeof cb === 'function') cb();
                    })
                }
            }
        };
    }

    async function sendRequest(request) {
        return new Promise(resolve => {
            let resolved = false;
            const done = (value) => {
                if (resolved) return;
                resolved = true;
                resolve(value);
            };
            const ret = runtimeListener(request, {}, done);
            if (ret !== true) {
                done(undefined);
                return;
            }
            setTimeout(() => done(undefined), 20);
        });
    }

    beforeEach(() => {
        jest.resetModules();
        setupChrome();
        require('../extension/background');
    });

    afterEach(() => {
        delete global.chrome;
        delete global.importScripts;
        delete global.getHourKey;
        delete global.getDayKey;
        delete global.getWeekKey;
        delete global.checkLimits;
        delete global.incrementCount;
        delete global.cleanupOldKeys;
        delete global.computeStats;
        delete global.computeAcceptanceByHour;
        delete global.computeScheduleRecommendation;
        delete global.recordEngagement;
        delete global.resolveFeedWarmupConfig;
        delete global.loadFeedWarmupState;
        delete global.buildFeedWarmupProgress;
        delete global.getDefaultFeedWarmupState;
        delete global.resetFeedWarmupState;
        delete global.saveFeedWarmupState;
        delete global.updatePatternMemory;
        delete global.persistFeedWarmupAfterRun;
        delete global.getNurtureList;
        delete global.getActiveNurtureTargets;
        delete global.buildNurtureUrl;
        delete global.recordNurtureEngagement;
        delete global.cleanExpiredNurtures;
        delete global.STATE_TAG_VERSION;
        delete global.AREA_PRESETS;
        delete global.AREA_PRESET_VALUES;
        delete global.isValidAreaPreset;
        delete global.normalizeAreaPreset;
        delete global.shouldResetAreaPresetOnManualTag;
        delete global.COMPANY_AREA_PRESET_VALUES;
        delete global.isValidCompanyAreaPreset;
        delete global.normalizeCompanyAreaPreset;
        delete global.getCompanyAreaPresetDefaultQuery;
        delete global.getCompanyAreaPresetDefaultTargetCompanies;
        delete global.parseExcludedCompanies;
        delete global.applyAreaPresetToTags;
        delete global.buildConnectQueryFromTags;
        delete global.getConnectTemplates;
        delete global.migrateConnectPopupState;
        delete global.CACHE_VERSION;
        delete global.PROFILE_FIELDS;
        delete global.normalizeStructuredProfile;
        delete global.encryptJobsProfileCache;
        delete global.decryptJobsProfileCache;
        delete global.getJobsProfileCacheStatus;
        delete global.matchesExcludedJobCompany;
        delete global.evaluateJobCandidate;
        delete global.rankJobsForApply;
        delete global.buildLinkedInJobsSearchUrl;
        delete global.RUN_STATUS_SUCCESS;
        delete global.RUN_STATUS_FAILED;
        delete global.RUN_STATUS_CANCELED;
        delete global.normalizeRunOutcome;
    });

    it('forwards areaPreset and excludedCompanies to content on start', async () => {
        const response = await sendRequest({
            action: 'start',
            query: 'recruiter finance',
            limit: 5,
            areaPreset: 'finance',
            excludedCompanies: ['Acme', 'Beta'],
            connectUsageGoal: 'decision_makers',
            connectExpectedResults: 'balanced',
            connectTemplateAuto: true,
            connectTemplateId:
                'connect.business.decision_makers.balanced',
            sendNote: false
        });

        expect(response).toEqual({ status: 'started' });
        await tick();

        expect(sentToContent.length).toBeGreaterThan(0);
        const payload = sentToContent[0].payload;
        expect(payload.areaPreset).toBe('finance');
        expect(payload.excludedCompanies).toEqual(['Acme', 'Beta']);
        expect(payload.templateMeta).toMatchObject({
            usageGoal: 'decision_makers',
            expectedResultsBucket: 'balanced'
        });
    });

    it('scheduled connect run reuses areaPreset and excludedCompanies', async () => {
        storageData.popupState = {
            tags: { role: ['recruiter'], industry: ['finance'] },
            tagVersion: 5,
            areaPreset: 'finance',
            excludedCompanies: 'Acme\nBeta',
            connectUsageGoal: 'decision_makers',
            connectExpectedResults: 'balanced',
            connectTemplateAuto: true,
            limit: '10',
            roleTermsLimit: 6,
            region: '103644278',
            sendNote: false
        };
        storageData.schedule = { enabled: true };

        alarmListener({ name: 'linkedinSchedule' });
        await tick();

        expect(sentToContent.length).toBeGreaterThan(0);
        const payload = sentToContent[0].payload;
        expect(payload.areaPreset).toBe('finance');
        expect(payload.excludedCompanies).toEqual(['Acme', 'Beta']);
        expect(payload.templateMeta).toMatchObject({
            usageGoal: 'decision_makers',
            expectedResultsBucket: 'balanced'
        });
    });

    it('migrates legacy myCompany into excludedCompanies for schedule', async () => {
        storageData.popupState = {
            tags: { role: ['recruiter'], industry: ['software'] },
            tagVersion: 4,
            myCompany: 'Legacy Corp',
            areaPreset: 'tech',
            limit: '10',
            roleTermsLimit: 6,
            region: '103644278',
            sendNote: false
        };
        storageData.schedule = { enabled: true };

        alarmListener({ name: 'linkedinSchedule' });
        await tick();

        expect(storageData.popupState.excludedCompanies)
            .toBe('Legacy Corp');
        expect(sentToContent.length).toBeGreaterThan(0);
        expect(sentToContent[0].payload.excludedCompanies)
            .toEqual(['Legacy Corp']);
    });

    it('scheduled connect run honors popup filter toggles over template filterSpec', async () => {
        global.buildSearchTemplatePlan = jest.fn(() => ({
            query: 'recruiter finance',
            filterSpec: {
                degree2nd: false,
                degree3rd: false,
                activelyHiring: true
            },
            meta: { mode: 'connect' }
        }));

        storageData.popupState = {
            tags: { role: ['recruiter'], industry: ['finance'] },
            tagVersion: 5,
            areaPreset: 'finance',
            limit: '10',
            roleTermsLimit: 6,
            region: '103644278',
            sendNote: false,
            degree2nd: true,
            degree3rd: true,
            activelyHiring: false,
            connectTemplateAuto: true,
            connectTemplateId:
                'connect.business.decision_makers.balanced'
        };
        storageData.schedule = { enabled: true };

        alarmListener({ name: 'linkedinSchedule' });
        await tick();

        const createdUrl = chrome.tabs.create.mock.calls[0][0].url;
        expect(createdUrl).toContain('&network=%5B%22S%22%2C%22O%22%5D');
        expect(createdUrl).not.toContain('activelyHiring=true');
    });

    it('quota retry connect run honors popup filter toggles over template filterSpec', async () => {
        global.buildSearchTemplatePlan = jest.fn(() => ({
            query: 'recruiter finance',
            filterSpec: {
                degree2nd: false,
                degree3rd: false,
                activelyHiring: true
            },
            meta: { mode: 'connect' }
        }));

        storageData.popupState = {
            tags: { role: ['recruiter'], industry: ['finance'] },
            tagVersion: 5,
            areaPreset: 'finance',
            savedQueries: 'recruiter finance',
            limit: '50',
            roleTermsLimit: 6,
            region: '103644278',
            sendNote: false,
            degree2nd: true,
            degree3rd: true,
            activelyHiring: false,
            connectTemplateAuto: true,
            connectTemplateId:
                'connect.business.decision_makers.balanced'
        };

        alarmListener({ name: 'fuseLimitRetry' });
        await tick();

        const createdUrl = chrome.tabs.create.mock.calls[0][0].url;
        expect(createdUrl).toContain('&network=%5B%22S%22%2C%22O%22%5D');
        expect(createdUrl).not.toContain('activelyHiring=true');
    });

    it('retries connect once with relaxed query when no items are processed', async () => {
        const response = await sendRequest({
            action: 'start',
            query: 'recruiter OR talent acquisition OR hiring manager OR tech',
            limit: 5,
            activelyHiring: true,
            networkFilter: encodeURIComponent('["S"]')
        });

        expect(response).toEqual({ status: 'started' });
        await tick();

        expect(chrome.tabs.create).toHaveBeenCalledTimes(1);
        const firstUrl = chrome.tabs.create.mock.calls[0][0].url;
        expect(firstUrl).toContain('activelyHiring=true');
        expect(firstUrl).toContain('&network=%5B%22S%22%5D');
        expect(getKeywordsFromUrl(firstUrl)).toBe(
            'recruiter talent acquisition hiring manager tech'
        );

        await sendRequest({
            action: 'done',
            result: {
                mode: 'connect',
                runStatus: 'failed',
                reason: 'no-items-processed',
                processedCount: 0,
                log: []
            }
        });
        await tick();

        expect(chrome.tabs.create).toHaveBeenCalledTimes(2);
        const secondUrl = chrome.tabs.create.mock.calls[1][0].url;
        expect(secondUrl).toContain('&network=%5B%22S%22%2C%22O%22%5D');
        expect(secondUrl).not.toContain('activelyHiring=true');
        expect(getKeywordsFromUrl(secondUrl)).toBe(
            'recruiter talent acquisition hiring manager tech'
        );
    });

    it('does not retry connect more than once after relaxed attempt', async () => {
        await sendRequest({
            action: 'start',
            query: 'recruiter OR talent acquisition OR hiring manager OR tech',
            limit: 5,
            activelyHiring: true,
            networkFilter: encodeURIComponent('["S"]')
        });
        await tick();

        await sendRequest({
            action: 'done',
            result: {
                mode: 'connect',
                runStatus: 'failed',
                reason: 'no-items-processed',
                processedCount: 0,
                log: []
            }
        });
        await tick();

        expect(chrome.tabs.create).toHaveBeenCalledTimes(2);

        await sendRequest({
            action: 'done',
            result: {
                mode: 'connect',
                runStatus: 'failed',
                reason: 'no-items-processed',
                processedCount: 0,
                log: []
            }
        });
        await tick();

        expect(chrome.tabs.create).toHaveBeenCalledTimes(2);
    });

    it('returns blocked unknown when connect rate-limit check fails', async () => {
        const originalGet = chrome.storage.local.get;
        chrome.storage.local.get = jest.fn(() => {
            throw new Error('storage failure');
        });

        const response = await sendRequest({
            action: 'start',
            query: 'recruiter',
            limit: 5
        });

        expect(response).toEqual({
            status: 'blocked',
            reason: 'unknown'
        });
        chrome.storage.local.get = originalGet;
    });

    it('returns deterministic error when checkAccepted tab creation fails', async () => {
        chrome.tabs.create.mockImplementation((opts, cb) => {
            chrome.runtime.lastError = {
                message: 'Tab creation failed'
            };
            cb(undefined);
            chrome.runtime.lastError = null;
        });

        const response = await sendRequest({
            action: 'checkAccepted'
        });

        expect(response).toEqual({
            error: 'Failed to check connections'
        });
    });
});
