const {
    encryptJobsProfileCache
} = require('../extension/lib/jobs-cache');
const {
    encryptJobsCareerIntelState
} = require('../extension/lib/jobs-career-cache');

describe('jobs orchestration in background', () => {
    let runtimeListener;
    let tabUpdatedListeners;
    let storageData;
    let runtimeMessages;
    let sentToContent;
    let createdTabs;

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
        storageData = {};
        runtimeMessages = [];
        sentToContent = [];
        createdTabs = [];

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

        const connectConfig = require(
            '../extension/lib/connect-config'
        );
        Object.assign(global, connectConfig);
        const jobsCache = require(
            '../extension/lib/jobs-cache'
        );
        Object.assign(global, jobsCache);
        const jobsCareerCache = require(
            '../extension/lib/jobs-career-cache'
        );
        Object.assign(global, jobsCareerCache);
        const jobsCareerIntelligence = require(
            '../extension/lib/jobs-career-intelligence'
        );
        Object.assign(global, jobsCareerIntelligence);
        const jobsUtils = require(
            '../extension/lib/jobs-utils'
        );
        Object.assign(global, jobsUtils);
        const runOutcome = require(
            '../extension/lib/run-outcome'
        );
        Object.assign(global, runOutcome);

        const connectQuery = require(
            '../extension/lib/connect-query'
        );
        Object.assign(global, connectQuery);

        let tabIdCounter = 600;
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
                    createdTabs.push(opts);
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
                    addListener: jest.fn()
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
            setTimeout(() => done(undefined), 250);
        });
    }

    beforeEach(() => {
        jest.resetModules();
        setupChrome();
        Object.assign(global, require('../extension/lib/company-query'));
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
        delete global.CAREER_INTEL_CACHE_VERSION;
        delete global.normalizeCareerIntelState;
        delete global.encryptJobsCareerIntelState;
        delete global.decryptJobsCareerIntelState;
        delete global.getJobsCareerIntelStatus;
        delete global.MAX_RESUME_BYTES;
        delete global.MAX_RESUME_FILES;
        delete global.validateResumeVaultFileMeta;
        delete global.analyzeJobsCareerInputs;
        delete global.buildJobsCareerSearchPlan;
        delete global.getBrazilOffshoreSignals;
        delete global.matchesExcludedJobCompany;
        delete global.evaluateJobCandidate;
        delete global.rankJobsForApply;
        delete global.buildLinkedInJobsSearchUrl;
        delete global.RUN_STATUS_SUCCESS;
        delete global.RUN_STATUS_FAILED;
        delete global.RUN_STATUS_CANCELED;
        delete global.normalizeRunOutcome;
        delete global.normalizeConnectQueryTerm;
        delete global.buildRelaxedConnectQuery;
        delete global.buildConnectSearchKeywords;
        delete global.shouldRetryConnectWithRelaxedQuery;
        delete global.buildRelaxedConnectConfig;
        delete global.countBooleanOperatorsSafe;
        delete global.buildCompanySearchUrl;
        delete global.sanitizeCompanySearchQuery;
        delete global.splitCompanySearchQueries;
        delete global.normalizeCompanyTargets;
        delete global.buildJobsSearchUrl;
    });

    it('starts jobs assist with decrypted profile and forwards config to page runtime', async () => {
        storageData.jobsProfileCache = await encryptJobsProfileCache(
            {
                fullName: 'Lucas Santana',
                email: 'lucas@example.com'
            },
            'passphrase'
        );

        const response = await sendRequest({
            action: 'startJobsAssist',
            query: 'product designer',
            limit: 5,
            excludedCompanies: ['Acme'],
            profilePassphrase: 'passphrase'
        });

        expect(response).toEqual({ status: 'started' });
        await tick();
        expect(createdTabs).toHaveLength(1);
        expect(createdTabs[0].url).toContain('/jobs/search');
        expect(sentToContent.length).toBeGreaterThan(0);
        const payload = sentToContent[0].payload;
        expect(payload.action).toBe('runCustom');
        expect(payload.msgType).toBe('LINKEDIN_JOBS_ASSIST_START');
        expect(payload.config.profile.fullName).toBe('Lucas Santana');
        expect(payload.config.profilePassphrase).toBeUndefined();
    });

    it('uses profileDraft when encrypted cache is not configured', async () => {
        const response = await sendRequest({
            action: 'startJobsAssist',
            query: 'product designer',
            limit: 5,
            profileDraft: {
                fullName: 'Draft User',
                email: 'draft@example.com'
            }
        });

        expect(response).toEqual({ status: 'started' });
        await tick();
        const payload = sentToContent[0].payload;
        expect(payload.config.profile).toMatchObject({
            fullName: 'Draft User',
            email: 'draft@example.com'
        });
    });

    it('merges decrypted cache profile with non-empty profileDraft overrides', async () => {
        storageData.jobsProfileCache = await encryptJobsProfileCache(
            {
                fullName: 'Lucas Santana',
                email: 'lucas@example.com',
                city: 'Sao Paulo'
            },
            'passphrase'
        );

        const response = await sendRequest({
            action: 'startJobsAssist',
            query: 'product designer',
            limit: 5,
            profilePassphrase: 'passphrase',
            profileDraft: {
                city: 'Campinas',
                resumeSummary: '10 years shipping products'
            }
        });

        expect(response).toEqual({ status: 'started' });
        await tick();
        const payload = sentToContent[0].payload;
        expect(payload.config.profile).toMatchObject({
            fullName: 'Lucas Santana',
            email: 'lucas@example.com',
            city: 'Campinas',
            resumeSummary: '10 years shipping products'
        });
    });

    it('loads encrypted jobs profile cache with valid passphrase', async () => {
        storageData.jobsProfileCache = await encryptJobsProfileCache(
            {
                fullName: 'Lucas Santana',
                email: 'lucas@example.com'
            },
            'passphrase'
        );

        const response = await sendRequest({
            action: 'loadJobsProfileCache',
            profilePassphrase: 'passphrase'
        });

        expect(response).toMatchObject({
            status: 'loaded',
            profile: {
                fullName: 'Lucas Santana',
                email: 'lucas@example.com'
            }
        });
    });

    it('returns missing when trying to load jobs profile cache with no envelope', async () => {
        const response = await sendRequest({
            action: 'loadJobsProfileCache',
            profilePassphrase: 'passphrase'
        });

        expect(response).toEqual({ status: 'missing' });
    });

    it('returns profile-cache-locked error when loading jobs cache with invalid passphrase', async () => {
        storageData.jobsProfileCache = await encryptJobsProfileCache(
            {
                fullName: 'Lucas Santana'
            },
            'passphrase'
        );

        const response = await sendRequest({
            action: 'loadJobsProfileCache',
            profilePassphrase: 'wrong-passphrase'
        });

        expect(response).toEqual({
            status: 'error',
            reason: 'profile-cache-locked'
        });
    });

    it('blocks jobs run when encrypted profile exists and passphrase is missing', async () => {
        storageData.jobsProfileCache = await encryptJobsProfileCache(
            {
                fullName: 'Lucas Santana'
            },
            'passphrase'
        );

        const response = await sendRequest({
            action: 'startJobsAssist',
            query: 'product designer',
            limit: 5
        });

        expect(response).toEqual({
            status: 'blocked',
            reason: 'profile-cache-locked'
        });
        expect(createdTabs).toHaveLength(0);
    });

    it('loads encrypted jobs career intelligence state with a valid passphrase', async () => {
        storageData.jobsCareerIntelStateV1 = await encryptJobsCareerIntelState(
            {
                importedProfile: {
                    headline: 'Senior Full Stack Engineer'
                },
                analysisSnapshot: {
                    inferredRoles: ['full stack engineer'],
                    keywordTerms: ['react', 'node.js', 'aws']
                },
                documents: [{
                    id: 'resume-1',
                    fileName: 'cv.pdf'
                }]
            },
            'career-passphrase'
        );

        const response = await sendRequest({
            action: 'loadJobsCareerIntel',
            profilePassphrase: 'career-passphrase'
        });

        expect(response).toEqual({
            status: 'loaded',
            state: expect.objectContaining({
                analysisSnapshot: expect.objectContaining({
                    inferredRoles: ['full stack engineer']
                })
            })
        });
    });

    it('blocks jobs run when career intelligence is enabled and locked', async () => {
        storageData.jobsCareerIntelStateV1 = await encryptJobsCareerIntelState(
            {
                analysisSnapshot: {
                    inferredRoles: ['full stack engineer'],
                    keywordTerms: ['react']
                }
            },
            'career-passphrase'
        );

        const response = await sendRequest({
            action: 'startJobsAssist',
            query: 'full stack engineer',
            limit: 5,
            jobsUseCareerIntelligence: true
        });

        expect(response).toEqual({
            status: 'blocked',
            reason: 'career-intel-locked'
        });
    });

    it('forwards decrypted career intelligence to jobs runtime when enabled', async () => {
        storageData.jobsCareerIntelStateV1 = await encryptJobsCareerIntelState(
            {
                analysisSnapshot: {
                    inferredRoles: ['full stack engineer'],
                    keywordTerms: ['react', 'node.js', 'aws']
                }
            },
            'career-passphrase'
        );

        const response = await sendRequest({
            action: 'startJobsAssist',
            query: 'full stack engineer',
            limit: 5,
            jobsUseCareerIntelligence: true,
            jobsBrazilOffshoreFriendly: true,
            profilePassphrase: 'career-passphrase'
        });

        expect(response).toEqual({ status: 'started' });
        await tick();
        expect(sentToContent[0].payload.config.keywordTerms).toEqual([
            'react',
            'node.js',
            'aws'
        ]);
        expect(
            sentToContent[0].payload.config.jobsBrazilOffshoreFriendly
        ).toBe(true);
        expect(
            sentToContent[0].payload.config.careerIntelVersion
        ).toBe(1);
    });

    it('stop request interrupts active jobs runtime', async () => {
        storageData.jobsProfileCache = await encryptJobsProfileCache(
            {
                fullName: 'Lucas Santana'
            },
            'passphrase'
        );

        await sendRequest({
            action: 'startJobsAssist',
            query: 'product designer',
            limit: 5,
            profilePassphrase: 'passphrase'
        });
        await new Promise(resolve => setTimeout(resolve, 60));

        const response = await sendRequest({ action: 'stop' });
        expect(response).toEqual({ status: 'stopping' });
        expect(createdTabs.length).toBeGreaterThan(0);
    });

    it('records jobs history on completion and preserves manual review status', async () => {
        runtimeListener({
            action: 'done',
            result: {
                mode: 'jobs',
                success: true,
                message: 'Processed jobs',
                log: [{
                    status: 'ready-manual-review',
                    title: 'Senior Product Designer',
                    company: 'Acme'
                }]
            }
        }, {}, () => {});
        await tick();

        expect(storageData.jobsAssistHistory).toHaveLength(1);
        expect(storageData.jobsAssistHistory[0].status).toBe(
            'ready-manual-review'
        );
    });

    it('records terminal manual-input-required jobs outcomes once', async () => {
        runtimeListener({
            action: 'done',
            result: {
                mode: 'jobs',
                success: false,
                runStatus: 'failed',
                reason: 'manual-input-required',
                message: 'Manual input required on current application.',
                log: [{
                    status: 'needs-manual-input',
                    title: 'Senior Frontend Developer',
                    company: 'CI&T'
                }]
            }
        }, {}, () => {});
        await tick();

        expect(storageData.jobsAssistHistory).toHaveLength(1);
        expect(storageData.jobsAssistHistory[0].status).toBe(
            'needs-manual-input'
        );
    });
});
