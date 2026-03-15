describe('company orchestration in background', () => {
    let runtimeListener;
    let alarmListener;
    let tabUpdatedListeners;
    let tabRemovedListeners;
    let storageData;
    let createdTabs;
    let updatedTabs;
    let runtimeMessages;

    function tick() {
        return new Promise(resolve => setTimeout(resolve, 0));
    }

    function emitTabUpdated(tabId, tab) {
        for (const listener of tabUpdatedListeners) {
            listener(tabId, { status: 'complete' }, tab);
        }
    }

    function setupChrome() {
        tabUpdatedListeners = [];
        tabRemovedListeners = [];
        storageData = {};
        createdTabs = [];
        updatedTabs = [];
        runtimeMessages = [];

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
            shouldRunNow: false
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
        global.buildQueryFromTags = jest.fn(() => '');
        global.cleanExpiredNurtures = jest.fn();

        const connectConfig = require(
            '../extension/lib/connect-config'
        );
        Object.assign(global, connectConfig);
        const runOutcome = require(
            '../extension/lib/run-outcome'
        );
        Object.assign(global, runOutcome);
        const searchTemplates = require(
            '../extension/lib/search-templates'
        );
        Object.assign(global, searchTemplates);

        let tabIdCounter = 100;
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
                    addListener: jest.fn(listener => {
                        tabRemovedListeners.push(listener);
                    }),
                    removeListener: jest.fn(listener => {
                        tabRemovedListeners = tabRemovedListeners
                            .filter(fn => fn !== listener);
                    })
                },
                create: jest.fn((opts, cb) => {
                    tabIdCounter += 1;
                    const tab = {
                        id: tabIdCounter,
                        url: opts.url,
                        status: 'complete'
                    };
                    createdTabs.push(opts);
                    tabMap.set(tab.id, tab);
                    cb(tab);
                    setTimeout(() => emitTabUpdated(tab.id, tab), 0);
                }),
                update: jest.fn((tabId, opts, cb) => {
                    const tab = tabMap.get(tabId) || {
                        id: tabId,
                        status: 'complete'
                    };
                    const updated = {
                        ...tab,
                        ...opts,
                        status: 'complete',
                        id: tabId
                    };
                    updatedTabs.push({ tabId, opts });
                    tabMap.set(tabId, updated);
                    if (typeof cb === 'function') cb(updated);
                    setTimeout(() => emitTabUpdated(tabId, updated), 0);
                }),
                get: jest.fn((tabId, cb) => {
                    cb(tabMap.get(tabId) || {
                        id: tabId,
                        status: 'complete'
                    });
                }),
                sendMessage: jest.fn((tabId, msg, cb) => {
                    if (typeof cb === 'function') cb();
                }),
                remove: jest.fn()
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
                onInstalled: {
                    addListener: jest.fn()
                },
                onStartup: {
                    addListener: jest.fn()
                },
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

    function doneMessages() {
        return runtimeMessages.filter(m => m.action === 'done');
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
        delete global.buildQueryFromTags;
        delete global.cleanExpiredNurtures;
        delete global.STATE_TAG_VERSION;
        delete global.AREA_PRESETS;
        delete global.AREA_PRESET_VALUES;
        delete global.COMPANY_AREA_PRESET_VALUES;
        delete global.isValidAreaPreset;
        delete global.normalizeAreaPreset;
        delete global.isValidCompanyAreaPreset;
        delete global.normalizeCompanyAreaPreset;
        delete global.getCompanyAreaPresetDefaultQuery;
        delete global.getCompanyAreaPresetDefaultTargetCompanies;
        delete global.shouldResetAreaPresetOnManualTag;
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
        delete global.EXPECTED_RESULTS_BUCKETS;
        delete global.MODE_USAGE_GOALS;
        delete global.MODE_DEFAULT_USAGE_GOAL;
        delete global.CONNECT_ROLE_LIMITS;
        delete global.AREA_FAMILY_MAP;
        delete global.SEARCH_TEMPLATES;
        delete global.normalizeMode;
        delete global.normalizeExpectedResultsBucket;
        delete global.normalizeUsageGoal;
        delete global.normalizeAreaFamily;
        delete global.compileBooleanQuery;
        delete global.countBooleanOperators;
        delete global.selectSearchTemplate;
        delete global.buildSearchTemplatePlan;
        delete global.buildConnectTemplatePlan;
        delete global.buildCompaniesTemplatePlan;
        delete global.buildJobsTemplatePlan;
        delete global.normalizeTemplateMeta;
    });

    it('executes multi-company queue and emits one final done', async () => {
        const start = await sendRequest({
            action: 'startCompanyFollow',
            query: 'software technology',
            limit: 10,
            targetCompanies: ['Acme', 'Beta']
        });

        expect(start).toEqual({ status: 'started' });
        expect(createdTabs[0].url).toContain(
            'keywords=Acme'
        );

        runtimeListener({
            action: 'companyStepDone',
            result: {
                success: true,
                mode: 'company',
                followedThisStep: 1,
                log: [{ status: 'followed', name: 'Acme' }]
            }
        }, {}, () => {});
        await tick();

        expect(updatedTabs).toHaveLength(1);
        expect(updatedTabs[0].opts.url).toContain(
            'keywords=Beta'
        );

        runtimeListener({
            action: 'companyStepDone',
            result: {
                success: true,
                mode: 'company',
                followedThisStep: 1,
                log: [{ status: 'followed', name: 'Beta' }]
            }
        }, {}, () => {});
        await tick();

        const done = doneMessages();
        expect(done).toHaveLength(1);
        expect(done[0].result.success).toBe(true);
        expect(done[0].result.mode).toBe('company');
        expect(done[0].result.log).toHaveLength(2);
    });

    it('continues queue when stepCode is no-results', async () => {
        await sendRequest({
            action: 'startCompanyFollow',
            query: 'software technology',
            limit: 10,
            targetCompanies: ['Acme', 'Beta']
        });

        runtimeListener({
            action: 'companyStepDone',
            result: {
                success: true,
                mode: 'company',
                stepCode: 'no-results',
                followedThisStep: 0,
                diagnostics: {
                    resultsCountHint: 0
                },
                log: [{
                    status: 'skipped-no-results',
                    query: 'Acme'
                }]
            }
        }, {}, () => {});
        await tick();

        expect(updatedTabs).toHaveLength(1);
        expect(updatedTabs[0].opts.url).toContain(
            'keywords=Beta'
        );

        runtimeListener({
            action: 'companyStepDone',
            result: {
                success: true,
                mode: 'company',
                stepCode: 'ok',
                followedThisStep: 1,
                log: [{ status: 'followed', name: 'Beta' }]
            }
        }, {}, () => {});
        await tick();

        const done = doneMessages();
        expect(done).toHaveLength(1);
        expect(done[0].result.success).toBe(true);
        expect(done[0].result.log).toHaveLength(2);
    });

    it('stop finalizes run and ignores further step messages', async () => {
        await sendRequest({
            action: 'startCompanyFollow',
            query: 'software technology',
            limit: 10,
            targetCompanies: ['Acme', 'Beta']
        });

        const stop = await sendRequest({ action: 'stop' });
        expect(stop).toEqual({ status: 'stopping' });
        await tick();

        expect(doneMessages()).toHaveLength(1);
        expect(doneMessages()[0].result.success).toBe(false);

        const updatesBeforeLateStep = updatedTabs.length;

        runtimeListener({
            action: 'companyStepDone',
            result: {
                success: true,
                mode: 'company',
                followedThisStep: 1,
                log: [{ status: 'followed', name: 'Late' }]
            }
        }, {}, () => {});
        await tick();

        expect(updatedTabs.length).toBe(updatesBeforeLateStep);
        expect(doneMessages()).toHaveLength(1);
    });

    it('step error finalizes with preserved aggregate log', async () => {
        await sendRequest({
            action: 'startCompanyFollow',
            query: 'software technology',
            limit: 10,
            targetCompanies: ['Acme', 'Beta']
        });

        runtimeListener({
            action: 'companyStepDone',
            result: {
                success: false,
                mode: 'company',
                error: 'CAPTCHA challenge detected',
                followedThisStep: 1,
                log: [
                    { status: 'followed', name: 'Acme' },
                    {
                        status: 'skipped-failed',
                        name: 'Acme Labs'
                    }
                ]
            }
        }, {}, () => {});
        await tick();

        expect(updatedTabs).toHaveLength(0);
        expect(doneMessages()).toHaveLength(1);
        expect(doneMessages()[0].result.success).toBe(false);
        expect(doneMessages()[0].result.error).toContain(
            'CAPTCHA'
        );
        expect(doneMessages()[0].result.log).toHaveLength(2);
    });

    it('cards-timeout finalizes run once with failure', async () => {
        await sendRequest({
            action: 'startCompanyFollow',
            query: 'software technology',
            limit: 10,
            targetCompanies: ['Acme', 'Beta']
        });

        runtimeListener({
            action: 'companyStepDone',
            result: {
                success: false,
                mode: 'company',
                stepCode: 'cards-timeout',
                error: 'No company cards detected within timeout',
                followedThisStep: 0,
                diagnostics: {
                    waitedMs: 20000,
                    resultsCountHint: 120
                },
                log: [{
                    status: 'error-no-cards-detected',
                    query: 'Acme'
                }]
            }
        }, {}, () => {});
        await tick();

        expect(updatedTabs).toHaveLength(0);
        const done = doneMessages();
        expect(done).toHaveLength(1);
        expect(done[0].result.success).toBe(false);
        expect(done[0].result.error).toContain('timeout');
    });

    it('preserves explicit failed reason from company step result', async () => {
        await sendRequest({
            action: 'startCompanyFollow',
            query: 'software technology',
            limit: 10,
            targetCompanies: ['Acme']
        });

        runtimeListener({
            action: 'companyStepDone',
            result: {
                success: false,
                mode: 'company',
                runStatus: 'failed',
                reason: 'no-target-matches',
                error: 'No company matched the target filter.',
                followedThisStep: 0,
                log: [{
                    status: 'skipped-target-filter',
                    name: 'Other Co'
                }]
            }
        }, {}, () => {});
        await tick();

        const done = doneMessages();
        expect(done).toHaveLength(1);
        expect(done[0].result.success).toBe(false);
        expect(done[0].result.reason).toBe('no-target-matches');
    });

    it('preserves follow-not-confirmed reason from company step result', async () => {
        await sendRequest({
            action: 'startCompanyFollow',
            query: 'product companies',
            limit: 10,
            targetCompanies: []
        });

        runtimeListener({
            action: 'companyStepDone',
            result: {
                success: false,
                mode: 'company',
                runStatus: 'failed',
                reason: 'follow-not-confirmed',
                error: 'Follow click attempted but could not be confirmed on LinkedIn UI.',
                followedThisStep: 0,
                diagnostics: {
                    followAttempts: 2,
                    unconfirmedFollowCount: 1
                },
                log: [{
                    status: 'skipped-follow-not-confirmed',
                    name: 'Acme'
                }]
            }
        }, {}, () => {});
        await tick();

        const done = doneMessages();
        expect(done).toHaveLength(1);
        expect(done[0].result.success).toBe(false);
        expect(done[0].result.reason).toBe('follow-not-confirmed');
    });

    it('start uses company preset default query when query and targets are empty', async () => {
        const defaultQuery = getCompanyAreaPresetDefaultQuery('ui-ux');
        const response = await sendRequest({
            action: 'startCompanyFollow',
            query: '',
            limit: 10,
            companyAreaPreset: 'ui-ux',
            targetCompanies: []
        });

        expect(response).toEqual({ status: 'started' });
        expect(createdTabs).toHaveLength(1);
        expect(createdTabs[0].url).toContain(
            encodeURIComponent(defaultQuery)
        );
    });

    it('scheduled company run uses queue orchestration', async () => {
        storageData.popupState = {
            targetCompanies: 'Acme\nBeta',
            companyQuery: 'software technology',
            limit: '10'
        };
        storageData.companySchedule = {
            enabled: true,
            intervalHours: 24,
            batchSize: 2
        };
        storageData.companyRotationIndex = 0;

        alarmListener({ name: 'companySchedule' });
        await tick();

        expect(createdTabs).toHaveLength(1);
        expect(createdTabs[0].url).toContain(
            'keywords=Acme'
        );

        runtimeListener({
            action: 'companyStepDone',
            result: {
                success: true,
                mode: 'company',
                followedThisStep: 1,
                log: [{ status: 'followed', name: 'Acme' }]
            }
        }, {}, () => {});
        await tick();

        expect(updatedTabs).toHaveLength(1);
        expect(updatedTabs[0].opts.url).toContain(
            'keywords=Beta'
        );

        runtimeListener({
            action: 'companyStepDone',
            result: {
                success: true,
                mode: 'company',
                followedThisStep: 0,
                log: [{ status: 'skipped-already-following' }]
            }
        }, {}, () => {});
        await tick();

        expect(doneMessages()).toHaveLength(1);
        expect(doneMessages()[0].result.mode).toBe('company');
    });

    it('scheduled company run uses resolved query when no target companies are set', async () => {
        storageData.popupState = {
            targetCompanies: '',
            companyQuery: '',
            companyAreaPreset: 'graphic-design',
            limit: '10'
        };
        storageData.companySchedule = {
            enabled: true,
            intervalHours: 24,
            batchSize: 2
        };
        storageData.companyRotationIndex = 0;

        alarmListener({ name: 'companySchedule' });
        await tick();

        expect(createdTabs).toHaveLength(1);
        expect(createdTabs[0].url).toContain(
            encodeURIComponent(
                '("graphic design" OR "visual design" OR "creative studio" OR "comunicacao visual")'
            )
        );
        expect(updatedTabs).toHaveLength(0);
    });

    it('scheduled company run does not auto-apply template default targets', async () => {
        storageData.popupState = {
            targetCompanies: '',
            companyQuery: '',
            companyAreaPreset: 'ui-ux',
            companyUsageGoal: 'brand_watchlist',
            companyExpectedResults: 'balanced',
            companyTemplateAuto: true,
            companyTemplateId: '',
            limit: '10'
        };
        storageData.companySchedule = {
            enabled: true,
            intervalHours: 24,
            batchSize: 2
        };
        storageData.companyRotationIndex = 0;

        alarmListener({ name: 'companySchedule' });
        await tick();

        expect(createdTabs).toHaveLength(1);
        expect(createdTabs[0].url).toContain(
            encodeURIComponent(
                '(branding OR "brand strategy" OR "visual identity" OR "creative direction")'
            )
        );
        expect(createdTabs[0].url).not.toContain('keywords=Interbrand');
    });
});
