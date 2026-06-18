let activeTabId = null /* active automation tab; null when idle */;
let companyRunState = null;
let connectLaunchState = null;
const JOBS_PROFILE_CACHE_KEY = 'jobsProfileCache';
const JOBS_CAREER_INTEL_KEY = 'jobsCareerIntelStateV1';

const COMPANY_FOLLOW_SCRIPTS = [
    'lib/ui-notify.js',
    'lib/templates.js',
    'lib/company-utils.js',
    'lib/human-behavior.js',
    'company-follow.js'
];

const JOBS_ASSIST_SCRIPTS = [
    'lib/ui-notify.js',
    'lib/jobs-utils.js',
    'jobs-assist.js'
];

chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
    if (info.status !== 'complete') return;
    if (!tab.url ||
        !tab.url.includes(
            'linkedin.com/search/results/people'
        )) return;
    chrome.scripting.executeScript({
        target: { tabId },
        files: ['search-filter.js']
    }).catch(() => {});
});

importScripts('lib/rate-limiter.js');
importScripts('lib/analytics.js');
importScripts('lib/smart-schedule.js');
importScripts('lib/pattern-memory.js');
importScripts('lib/i18n.js');
importScripts('lib/search-language.js');
importScripts('lib/connect-config.js');
importScripts('lib/search-templates.js');
importScripts('lib/connect-query.js');
importScripts('lib/company-query.js');
importScripts('lib/copy-guard.js');
importScripts('lib/ai-context-formatters.js');
importScripts('lib/jobs-cache.js');
importScripts('lib/jobs-career-cache.js');
importScripts('lib/jobs-career-intelligence.js');
importScripts('lib/jobs-utils.js');
importScripts('lib/jobs-profile.js');
importScripts('lib/search-runtime-builders.js');
importScripts('lib/run-outcome.js');
importScripts('lib/profile-visitor.js');
importScripts('lib/storage-key-sweeper.js');
importScripts('lib/feature-toggles.js');

// Toolbar badge mirrors run state so the user can see at a glance that an
// automation is running (title hints they can open the popup to stop).
// Clicking the icon still opens the popup (which has Stop) — no setPopup
// toggle, so the popup can never be left unopenable.
function setRunningBadge(on) {
    try {
        if (!chrome.action) return;
        chrome.action.setBadgeText({ text: on ? '●' : '' });
        if (on) {
            chrome.action.setBadgeBackgroundColor({ color: '#2e7d32' });
        }
        chrome.action.setTitle({
            title: on
                ? 'LinkedIn Engage — running (open to stop)'
                : 'LinkedIn Engage'
        });
    } catch (_e) {
        // action API unavailable — badge is cosmetic, never block on it
    }
}

// Single place that assigns activeTabId so the badge always tracks it.
function setActiveTab(id) {
    activeTabId = id;
    setRunningBadge(id !== null && id !== undefined);
}

let lkdDebug = false;
try { chrome.storage.local.get('lkdDebug', d => { lkdDebug = !!d?.lkdDebug; }); } catch (_e) {}
// eslint-disable-next-line no-console
function log(...args) { if (lkdDebug) console.log(...args); }

let profileWalkStopRequested = false;

function getProfileWalkDateKey() {
    const now = new Date();
    return `profileWalkCount_${now.getFullYear()}_` +
        `${String(now.getMonth() + 1).padStart(2, '0')}_` +
        `${String(now.getDate()).padStart(2, '0')}`;
}

function readProfileWalkCount() {
    return new Promise(resolve => {
        const key = getProfileWalkDateKey();
        chrome.storage.local.get(key, (data) => {
            resolve(Number(data[key]) || 0);
        });
    });
}

function incrementProfileWalkCount() {
    return new Promise(resolve => {
        const key = getProfileWalkDateKey();
        chrome.storage.local.get(key, (data) => {
            const next = (Number(data[key]) || 0) + 1;
            chrome.storage.local.set({ [key]: next }, () => {
                resolve(next);
            });
        });
    });
}

async function harvestProfileWalkUrls(request) {
    const fromRequest = Array.isArray(request?.urls)
        ? request.urls : [];
    const visitor = typeof LinkedInProfileVisitor !==
        'undefined' ? LinkedInProfileVisitor : null;
    if (visitor && typeof visitor.dedupeProfileUrls
        === 'function') {
        return visitor.dedupeProfileUrls(fromRequest);
    }
    return fromRequest;
}

async function launchProfileWalk(request) {
    const visitor = typeof LinkedInProfileVisitor !==
        'undefined' ? LinkedInProfileVisitor : null;
    if (!visitor) {
        return {
            visited: 0,
            errors: 1,
            reason: 'profile-visitor-missing'
        };
    }
    const urls = await harvestProfileWalkUrls(request);
    const dailyTarget = Number(request?.dailyTarget) ||
        visitor.DEFAULTS.dailyTarget;
    const dailyCap = Math.min(
        dailyTarget,
        visitor.DEFAULTS.dailyTargetMax
    );
    const startCount = await readProfileWalkCount();
    if (startCount >= dailyCap) {
        return {
            visited: 0,
            errors: 0,
            reason: 'daily-cap-already',
            visitedUrls: [],
            dayCount: startCount
        };
    }

    const openTab = (url) => new Promise((resolve, reject) => {
        chrome.tabs.create({ url, active: false }, (tab) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
                return;
            }
            resolve(tab && tab.id);
        });
    });
    const closeTab = (tabId) => new Promise((resolve) => {
        if (!tabId) return resolve();
        chrome.tabs.remove(tabId, () => {
            if (chrome.runtime.lastError) {
                // tab likely closed by user — ignore
            }
            resolve();
        });
    });

    const result = await visitor.runProfileWalk({
        urls,
        config: {
            dailyTarget: dailyCap - startCount,
            dwellMsMin: request?.dwellMsMin,
            dwellMsMax: request?.dwellMsMax,
            jitterMsMin: request?.jitterMsMin,
            jitterMsMax: request?.jitterMsMax,
            perMinuteMax: request?.perMinuteMax
        },
        openTab,
        closeTab,
        isDailyCapReached: async () => {
            const c = await readProfileWalkCount();
            return c >= dailyCap;
        },
        recordVisit: async () => {
            await incrementProfileWalkCount();
        },
        shouldStop: () => profileWalkStopRequested
    });
    const finalCount = await readProfileWalkCount();
    return {
        ...result,
        dayCount: finalCount,
        dailyCap
    };
}

function migratePopupStateForConnect(state) {
    if (typeof migrateConnectPopupState !== 'function') {
        return { state: state || {}, changed: false };
    }
    return migrateConnectPopupState(state);
}







async function checkRateLimit(mode) {
    return new Promise(resolve => {
        const checkLimitsForMode = () => {
            const hKey = getHourKey(mode);
            const dKey = getDayKey(mode);
            const wKey = getWeekKey();
            chrome.storage.local.get(
                [hKey, dKey, wKey],
                (data) => {
                    resolve(checkLimits(
                        data[hKey] || 0,
                        data[dKey] || 0,
                        data[wKey] || 0,
                        mode
                    ));
                }
            );
        };
        // Feature gate first: a disabled mode is "blocked" before any rate
        // check. Every launch handler already maps !allowed -> blocked response.
        // Fail-open if the toggle lib is unavailable.
        if (typeof getFeatureToggles === 'function'
            && typeof isFeatureEnabled === 'function') {
            getFeatureToggles((toggles) => {
                if (!isFeatureEnabled(mode, toggles)) {
                    resolve({ allowed: false, reason: 'feature-disabled' });
                    return;
                }
                checkLimitsForMode();
            });
        } else {
            checkLimitsForMode();
        }
    });
}

function notifyError(msg) {
    setActiveTab(null);
    createLocalizedNotification(null, msg);
}

// Debug breadcrumb for triaging "search not working" reports.
// Off by default. Enable in popup devtools:
//   chrome.storage.local.set({ lkdDebug: true })
// Then retry the failing search and copy the [lkd-debug] line from the
// background service-worker devtools (chrome://extensions → Inspect SW).
function logLaunchBreadcrumb(context) {
    try {
        chrome.storage.local.get('lkdDebug', (data) => {
            if (!data || !data.lkdDebug) return;
            // eslint-disable-next-line no-console
            console.log('[lkd-debug] connect.launch', context);
        });
    } catch (_e) {
        // storage unavailable — drop the breadcrumb silently
    }
}

function getBackgroundUiLanguageMode() {
    return new Promise(resolve => {
        chrome.storage.local.get('uiLanguageMode', (data) => {
            resolve(data.uiLanguageMode || 'auto');
        });
    });
}

async function getBackgroundCatalogs() {
    const browserLocale = typeof chrome !== 'undefined' &&
        chrome.i18n &&
        typeof chrome.i18n.getUILanguage === 'function'
        ? chrome.i18n.getUILanguage()
        : 'en';
    const mode = await getBackgroundUiLanguageMode();
    const locale = typeof resolveUiLocale === 'function'
        ? resolveUiLocale(mode, browserLocale)
        : 'en';
    const fallbackCatalog = typeof loadLocaleMessages === 'function'
        ? await loadLocaleMessages('en')
        : {};
    const activeCatalog = locale === 'en'
        ? fallbackCatalog
        : await loadLocaleMessages(locale);
    return { activeCatalog, fallbackCatalog };
}

async function getLocalizedBackgroundMessage(key, substitutions, fallback) {
    if (!key || typeof getMessage !== 'function') {
        return fallback || '';
    }
    const { activeCatalog, fallbackCatalog } =
        await getBackgroundCatalogs();
    return getMessage(
        activeCatalog,
        fallbackCatalog,
        key,
        substitutions
    ) || fallback || '';
}

function createLocalizedNotification(key, fallbackMessage, substitutions) {
    Promise.all([
        getLocalizedBackgroundMessage(
            'extensionName',
            null,
            'LinkedIn Engage'
        ),
        getLocalizedBackgroundMessage(
            key,
            substitutions,
            fallbackMessage
        )
    ]).then(([title, message]) => {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title,
            message
        });
    }).catch(() => {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: 'LinkedIn Engage',
            message: fallbackMessage
        });
    });
}


function resolveCompanySearches(
    query,
    targetCompanies,
    companyAreaPreset
) {
    const companies = normalizeCompanyTargets(
        Array.isArray(targetCompanies)
            ? targetCompanies
            : []
    );
    if (companies.length > 0) return companies;
    let fallback = String(query || '').trim();
    if (!fallback &&
        typeof getCompanyAreaPresetDefaultQuery === 'function') {
        fallback = getCompanyAreaPresetDefaultQuery(
            companyAreaPreset
        );
    }
    const fallbackQueries = splitCompanySearchQueries(fallback);
    return fallbackQueries.length > 0
        ? fallbackQueries
        : [];
}

function countFollowedEntries(log) {
    return (log || []).filter(
        entry => entry?.status === 'followed'
    ).length;
}

function applyRunResult(result) {
    setActiveTab(null);
    const normalized = typeof normalizeRunOutcome === 'function'
        ? normalizeRunOutcome(result)
        : result;
    const r = normalized && typeof normalized === 'object'
        ? { ...normalized }
        : {};
    if (r?.templateMeta) {
        r.templateMeta = normalizeTemplateMeta(
            r.templateMeta,
            r.mode || r.templateMeta.mode
        );
        if (Array.isArray(r.log)) {
            r.log = mergeLogWithTemplateMeta(
                r.log,
                r.templateMeta
            );
        }
    }
    const entries = Array.isArray(r?.log) ? r.log : [];
    const actionCount = Math.max(
        0,
        Number(r?.actionCount) || 0
    );
    if (actionCount > 0 && r?.mode) {
        const rateMode = r.mode === 'company'
            ? 'companyFollow'
            : 'connect';
        const normalizedRateMode = r.mode === 'jobs'
            ? 'jobsAssist'
            : rateMode;
        for (let i = 0; i < actionCount; i++) {
            incrementCount(
                normalizedRateMode,
                chrome.storage.local
            );
        }
    }
    cleanupOldKeys(chrome.storage.local);
    const runStatus = r?.runStatus || (
        r?.success ? 'success' : 'failed'
    );
    const failureMessage = r?.error || r?.message || 'Unknown';
    const notificationMessage = runStatus === 'success'
        ? (r?.message || 'Automation complete.')
        : runStatus === 'canceled'
            ? (r?.message || 'Run canceled by user.')
            : `Failed: ${failureMessage}`;
    createLocalizedNotification(
        runStatus === 'success'
            ? 'notification.run.success'
            : runStatus === 'canceled'
                ? 'notification.run.canceled'
                : 'notification.run.failed',
        notificationMessage,
        runStatus === 'failed'
            ? [failureMessage]
            : null
    );
    if (r?.mode) {
        recordEngagement({
            entryType: 'run',
            mode: r.mode,
            status: `run-${runStatus}`,
            runStatus,
            runReason: r.reason || 'unknown',
            processedCount: Number(r.processedCount) || 0,
            actionCount: Number(r.actionCount) || 0,
            skippedCount: Number(r.skippedCount) || 0,
            stoppedByUser: r.stoppedByUser === true
        }, chrome.storage.local);
    }
    if (r?.log?.length && r?.mode) {
        const key = r.mode === 'company'
            ? 'companyFollowHistory'
            : r.mode === 'jobs'
                ? 'jobsAssistHistory'
                : null;
        if (key) {
            chrome.storage.local.get(key, (data) => {
                const existing = data[key] || [];
                const merged = existing
                    .concat(r.log).slice(-500);
                chrome.storage.local.set({
                    [key]: merged
                });
            });
        }
    }
    if (r?.templateMeta?.templateId) {
        const skippedCount = entries.filter(
            entry => entry?.status?.startsWith('skipped') ||
                entry?.status?.startsWith('skip-')
        ).length;
        const emptyOutcomes = entries.filter(entry =>
            /no-results|no-cards|thread-context-unavailable/i
                .test(String(entry?.status || ''))
        ).length;
        recordEngagement({
            mode: r.mode || r.templateMeta.mode || 'connect',
            status: runStatus === 'success'
                ? 'run-template'
                : 'run-template-error',
            templateId: r.templateMeta.templateId,
            usageGoal: r.templateMeta.usageGoal,
            expectedResultsBucket:
                r.templateMeta.expectedResultsBucket,
            operatorCount: r.templateMeta.operatorCount,
            compiledQueryLength:
                r.templateMeta.compiledQueryLength,
            skipped: skippedCount,
            emptyOutcomes
        }, chrome.storage.local);
    }
}

function finalizeCompanyRun(result, broadcastToPopup) {
    if (!companyRunState?.active) return;
    const state = companyRunState;
    state.active = false;
    companyRunState = null;
    const enrichedResult = result &&
        typeof result === 'object'
        ? { ...result }
        : {
            success: false,
            mode: 'company',
            error: 'Unknown company follow result.',
            log: []
        };
    if (!enrichedResult.templateMeta &&
        state?.config?.templateMeta) {
        enrichedResult.templateMeta = normalizeTemplateMeta(
            state.config.templateMeta,
            'companies'
        );
    }
    const normalized = typeof normalizeRunOutcome === 'function'
        ? normalizeRunOutcome(
            {
                ...enrichedResult,
                mode: 'company',
                processedCount: Math.max(
                    0,
                    Number(enrichedResult.processedCount) ||
                        Number(state.processedCount) || 0
                ),
                actionCount: Math.max(
                    0,
                    Number(enrichedResult.actionCount) ||
                        Number(state.actionCount) || 0
                ),
                skippedCount: Math.max(
                    0,
                    Number(enrichedResult.skippedCount) ||
                        Number(state.skippedCount) || 0
                ),
                stoppedByUser:
                    enrichedResult.stoppedByUser === true ||
                    state.stopRequested === true
            },
            'company'
        )
        : enrichedResult;
    applyRunResult(normalized);
    if (broadcastToPopup) {
        chrome.runtime.sendMessage({
            action: 'done',
            result: normalized
        });
    }
}

function handleCompanyStepDone(result) {
    if (!companyRunState?.active) return;
    const state = companyRunState;
    const stepResult = typeof normalizeRunOutcome === 'function'
        ? normalizeRunOutcome(result, 'company')
        : (result || {});
    const stepCode = stepResult.stepCode || (
        stepResult.runStatus === 'success' ? 'ok' : 'unknown'
    );
    const stepLog = Array.isArray(stepResult.log)
        ? stepResult.log : [];
    if (stepLog.length > 0) {
        state.log.push(...stepLog);
    }

    const explicit = Number(stepResult.followedThisStep);
    const followedThisStep = Number.isFinite(explicit)
        ? Math.max(0, explicit)
        : countFollowedEntries(stepLog);
    const explicitProcessed = Number(stepResult.processedCount);
    const processedThisStep = Number.isFinite(explicitProcessed)
        ? Math.max(0, Math.floor(explicitProcessed))
        : stepLog.length;
    const explicitAction = Number(stepResult.actionCount);
    const actionThisStep = Number.isFinite(explicitAction)
        ? Math.max(0, Math.floor(explicitAction))
        : followedThisStep;
    const explicitSkipped = Number(stepResult.skippedCount);
    const skippedThisStep = Number.isFinite(explicitSkipped)
        ? Math.max(0, Math.floor(explicitSkipped))
        : Math.max(0, processedThisStep - actionThisStep);
    state.totalFollowed = Math.min(
        state.limit,
        state.totalFollowed + followedThisStep
    );
    state.processedCount += processedThisStep;
    state.actionCount += actionThisStep;
    state.skippedCount += skippedThisStep;

    if (stepCode === 'cards-timeout' ||
        stepResult.runStatus === 'failed') {
        finalizeCompanyRun({
            success: false,
            mode: 'company',
            error: stepResult.error ||
                (stepCode === 'cards-timeout'
                    ? 'No company cards detected ' +
                        'within timeout.'
                    : 'Unknown error'),
            runStatus: 'failed',
            reason: stepResult.reason || (
                stepCode === 'cards-timeout'
                    ? 'runtime-error'
                    : 'unknown'
            ),
            log: state.log
        }, true);
        return;
    }

    if (stepResult.runStatus === 'canceled') {
        finalizeCompanyRun({
            success: false,
            mode: 'company',
            message: stepResult.message ||
                'Run canceled by user.',
            runStatus: 'canceled',
            reason: 'stopped-by-user',
            stoppedByUser: true,
            log: state.log,
            processedCount: state.processedCount,
            actionCount: state.actionCount,
            skippedCount: state.skippedCount
        }, true);
        return;
    }

    if (state.stopRequested) {
        finalizeCompanyRun({
            success: false,
            mode: 'company',
            error: 'Stopped by user.',
            log: state.log,
            stoppedByUser: true,
            runStatus: 'canceled',
            reason: 'stopped-by-user'
        }, true);
        return;
    }

    if (state.totalFollowed >= state.limit ||
        state.queryIndex >= state.searches.length - 1) {
        finalizeCompanyRun({
            success: true,
            mode: 'company',
            message: `Followed ${state.totalFollowed} companies.`,
            log: state.log,
            processedCount: state.processedCount,
            actionCount: state.actionCount,
            skippedCount: state.skippedCount
        }, true);
        return;
    }

    state.queryIndex += 1;
    const nextQuery = state.searches[state.queryIndex];
    const nextUrl = buildCompanySearchUrl(nextQuery);

    chrome.tabs.update(
        state.tabId,
        { url: nextUrl, active: true },
        (tab) => {
            if (chrome.runtime.lastError || !tab) {
                finalizeCompanyRun({
                    success: false,
                    mode: 'company',
                    error: 'Failed to open company search: ' +
                        (chrome.runtime.lastError?.message
                            || 'unknown error'),
                    log: state.log,
                    processedCount: state.processedCount,
                    actionCount: state.actionCount,
                    skippedCount: state.skippedCount
                }, true);
                return;
            }
            setActiveTab(tab.id);
            injectAndStart(
                tab.id,
                COMPANY_FOLLOW_SCRIPTS,
                'LINKEDIN_COMPANY_FOLLOW_START',
                {
                    ...state.config,
                    query: nextQuery,
                    progressOffset: state.totalFollowed,
                    globalLimit: state.limit,
                    queryIndex: state.queryIndex + 1,
                    queryTotal: state.searches.length
                }
            );
        }
    );
}

function launchAutomation(config) {
    const launchConfig = config && typeof config === 'object'
        ? config
        : {};
    connectLaunchState = {
        config: { ...launchConfig },
        attempt: Math.max(
            0,
            Number(launchConfig.connectRelaxAttempt) || 0
        )
    };

    const geoUrn = launchConfig.geoUrn
        || '%5B%22103644278%22%2C%22101121807%22' +
           '%2C%22101165590%22%2C%22101282230%22' +
           '%2C%22102890719%22%5D';
    const searchKeywords = buildConnectSearchKeywords(launchConfig.query);

    let searchUrl =
        'https://www.linkedin.com/search/results/' +
        'people/' +
        `?geoUrn=${geoUrn}` +
        `&keywords=${encodeURIComponent(searchKeywords)}` +
        '&origin=FACETED_SEARCH';

    if (launchConfig.activelyHiring) {
        searchUrl += '&activelyHiring=true';
    }

    const netFilter = launchConfig.networkFilter
        || encodeURIComponent('["S","O"]');
    searchUrl += `&network=${netFilter}`;

    logLaunchBreadcrumb({
        rawQuery: launchConfig.query,
        searchKeywords,
        searchUrl,
        geoUrn,
        networkFilter: netFilter,
        activelyHiring: !!launchConfig.activelyHiring,
        areaPreset: launchConfig.areaPreset,
        goalMode: launchConfig.goalMode,
        templateId:
            launchConfig.templateMeta?.templateId
            || launchConfig.connectTemplateId,
        usageGoal: launchConfig.templateMeta?.usageGoal,
        operatorCount: launchConfig.templateMeta?.operatorCount,
        compiledQueryLength:
            launchConfig.templateMeta?.compiledQueryLength,
        followFallback: launchConfig.followFallback,
        followFirstMode: launchConfig.followFirstMode,
        relaxAttempt: launchConfig.connectRelaxAttempt || 0,
        excludeKeywordsCount:
            Array.isArray(launchConfig.excludeKeywords)
                ? launchConfig.excludeKeywords.length
                : 0,
        timestamp: new Date().toISOString()
    });

    chrome.tabs.create(
        { url: searchUrl, active: true },
        (tab) => {
            if (chrome.runtime.lastError || !tab) {
                notifyError(
                    'Failed to open LinkedIn tab: ' +
                    (chrome.runtime.lastError?.message
                        || 'unknown error')
                );
                return;
            }
            setActiveTab(tab.id);

            const timeout = setTimeout(() => {
                chrome.tabs.onUpdated
                    .removeListener(listener);
                notifyError(
                    'Tab took too long to load. ' +
                    'Check your connection.'
                );
            }, 60000);

            function listener(tabId, info) {
                if (tabId !== tab.id ||
                    info.status !== 'complete') {
                    return;
                }
                clearTimeout(timeout);
                chrome.tabs.onUpdated
                    .removeListener(listener);

                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['bridge.js'],
                    world: 'ISOLATED'
                }, () => {
                    if (chrome.runtime.lastError) {
                        notifyError(
                            'Script injection failed: ' +
                            chrome.runtime.lastError.message
                        );
                        return;
                    }
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: [
                            'lib/ui-notify.js',
                            'lib/invite-utils.js',
                            'lib/human-behavior.js',
                            'lib/connect-action-utils.js'
                        ],
                        world: 'MAIN'
                    }, () => {
                        if (chrome.runtime.lastError) {
                            notifyError(
                                'Utils injection failed: ' +
                                chrome.runtime.lastError
                                    .message
                            );
                            return;
                        }
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['content.js'],
                        world: 'MAIN'
                    }, () => {
                        if (chrome.runtime.lastError) {
                            notifyError(
                                'Script injection failed: ' +
                                chrome.runtime.lastError
                                    .message
                            );
                            return;
                        }
                        chrome.tabs.sendMessage(
                            tab.id,
                            {
                                action: 'runAutomation',
                                limit: launchConfig.limit,
                                sendNote: launchConfig.sendNote,
                                noteTemplate:
                                    launchConfig.noteTemplate,
                                geoUrn: launchConfig.geoUrn,
                                goalMode:
                                    launchConfig.goalMode || 'passive',
                                areaPreset:
                                    normalizeRuntimeAreaPreset(
                                        launchConfig.areaPreset
                                    ),
                                excludedCompanies:
                                    parseExcludedCompanyList(
                                        launchConfig.excludedCompanies
                                    ),
                                skipOpenToWorkRecruiters:
                                    launchConfig
                                        .skipOpenToWorkRecruiters
                                    !== false,
                                skipJobSeekingSignals:
                                    launchConfig
                                        .skipJobSeekingSignals
                                    === true,
                                sentUrls:
                                    launchConfig.sentUrls || [],
                                templateMeta:
                                    normalizeTemplateMeta(
                                        launchConfig.templateMeta,
                                        'connect'
                                    ),
                                engagementOnly:
                                    launchConfig.engagementOnly
                                    || false,
                                followFallback:
                                    launchConfig.followFallback
                                    !== false,
                                followFirstMode:
                                    launchConfig.followFirstMode
                                    === true,
                                followMax: Number.isFinite(
                                    launchConfig.followMax
                                ) ? launchConfig.followMax : 40,
                                excludeKeywords: Array.isArray(
                                    launchConfig.excludeKeywords
                                ) ? launchConfig.excludeKeywords : [],
                                yearsMin: Number.isFinite(
                                    launchConfig.yearsMin
                                ) ? launchConfig.yearsMin : undefined,
                                yearsMax: Number.isFinite(
                                    launchConfig.yearsMax
                                ) ? launchConfig.yearsMax : undefined
                            },
                            () => {
                                if (chrome.runtime
                                    .lastError) {
                                    notifyError(
                                        'Failed to start' +
                                        ' automation: ' +
                                        chrome.runtime
                                            .lastError
                                            .message
                                    );
                                }
                            }
                        );
                    });
                    });
                });
            }

            chrome.tabs.onUpdated.addListener(listener);

            chrome.tabs.onRemoved.addListener(
                function onClose(closedId) {
                    if (closedId !== tab.id) return;
                    chrome.tabs.onRemoved
                        .removeListener(onClose);
                    clearTimeout(timeout);
                    chrome.tabs.onUpdated
                        .removeListener(listener);
                    if (activeTabId === tab.id) {
                        notifyError(
                            'LinkedIn tab was closed ' +
                            'before automation started.'
                        );
                    }
                }
            );
        }
    );
}

function launchCompanyFollow(config) {
    if (companyRunState?.active) {
        finalizeCompanyRun({
            success: false,
            mode: 'company',
            message: 'Previous run canceled by new company run.',
            runStatus: 'canceled',
            reason: 'stopped-by-user',
            stoppedByUser: true,
            log: companyRunState.log || []
        }, true);
    }

    const searches = resolveCompanySearches(
        config.query,
        config.targetCompanies,
        config.companyAreaPreset
    );
    if (!searches.length) {
        notifyError('No company search terms provided.');
        return;
    }

    const nextConfig = {
        ...config,
        templateMeta: normalizeTemplateMeta(
            config.templateMeta,
            'companies'
        ),
        companyAreaPreset:
            typeof normalizeCompanyAreaPreset === 'function'
                ? normalizeCompanyAreaPreset(
                    config.companyAreaPreset
                )
                : (config.companyAreaPreset || 'custom'),
        targetCompanies: Array.isArray(config.targetCompanies)
            ? config.targetCompanies : [],
        query: searches[0]
    };

    companyRunState = {
        active: true,
        stopRequested: false,
        tabId: null,
        searches,
        queryIndex: 0,
        limit: Math.max(1, parseInt(config.limit, 10) || 50),
        totalFollowed: 0,
        processedCount: 0,
        actionCount: 0,
        skippedCount: 0,
        log: [],
        config: nextConfig
    };

    const searchUrl = buildCompanySearchUrl(searches[0]);

    chrome.tabs.create(
        { url: searchUrl, active: true },
        (tab) => {
            if (chrome.runtime.lastError || !tab) {
                finalizeCompanyRun({
                    success: false,
                    mode: 'company',
                    error: 'Failed to open company search: ' +
                        (chrome.runtime.lastError?.message
                            || 'unknown error'),
                    log: []
                }, true);
                return;
            }
            companyRunState.tabId = tab.id;
            setActiveTab(tab.id);
            injectAndStart(
                tab.id,
                COMPANY_FOLLOW_SCRIPTS,
                'LINKEDIN_COMPANY_FOLLOW_START',
                {
                    ...companyRunState.config,
                    query: searches[0],
                    progressOffset: 0,
                    globalLimit: companyRunState.limit,
                    queryIndex: 1,
                    queryTotal: searches.length
                }
            );
        }
    );
}

function launchJobsAssist(config) {
    const query = String(config?.query || '').trim();
    if (!query) {
        notifyError('No jobs query provided.');
        return;
    }
    const searchUrl = buildJobsSearchUrl(query, config);

    chrome.tabs.create(
        { url: searchUrl, active: true },
        (tab) => {
            if (chrome.runtime.lastError || !tab) {
                notifyError(
                    'Failed to open jobs search: ' +
                    (chrome.runtime.lastError?.message
                        || 'unknown error')
                );
                return;
            }
            setActiveTab(tab.id);
            injectAndStart(
                tab.id,
                JOBS_ASSIST_SCRIPTS,
                'LINKEDIN_JOBS_ASSIST_START',
                config
            );
        }
    );
}


function injectAndStart(tabId, scripts, msgType, config) {
    let started = false;
    const timeout = setTimeout(() => {
        if (started) return;
        chrome.tabs.onUpdated.removeListener(listener);
        notifyError('Tab took too long to load.');
    }, 60000);

    function begin() {
        if (started) return;
        started = true;
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);

        chrome.scripting.executeScript({
            target: { tabId },
            files: ['bridge.js'],
            world: 'ISOLATED'
        }, () => {
            if (chrome.runtime.lastError) {
                notifyError(
                    'Bridge injection failed: ' +
                    chrome.runtime.lastError.message
                );
                return;
            }
            injectScriptsSequentially(
                tabId, scripts, 0, () => {
                    chrome.tabs.sendMessage(tabId, {
                        action: 'runCustom',
                        msgType,
                        config
                    });
                }
            );
        });
    }

    function listener(updatedId, info) {
        if (updatedId !== tabId ||
            info.status !== 'complete') return;
        begin();
    }

    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError || !tab) return;
        if (tab.status === 'complete') {
            begin();
        }
    });
}

function injectScriptsSequentially(
    tabId, scripts, idx, cb) {
    if (idx >= scripts.length) { cb(); return; }
    chrome.scripting.executeScript({
        target: { tabId },
        files: [scripts[idx]],
        world: 'MAIN'
    }, () => {
        if (chrome.runtime.lastError) {
            notifyError(
                `Script injection failed: ` +
                chrome.runtime.lastError.message
            );
            return;
        }
        injectScriptsSequentially(
            tabId, scripts, idx + 1, cb
        );
    });
}

var PATTERN_MIN_CONFIDENCE = 60;

function localStorageGet(keys) {
    return new Promise((resolve) => {
        chrome.storage.local.get(keys, (data) => {
            resolve(data || {});
        });
    });
}

function localStorageSet(payload) {
    return new Promise((resolve) => {
        chrome.storage.local.set(payload || {}, () => {
            resolve();
        });
    });
}

async function loadPatternMemoryState() {
    var data = await localStorageGet([
        COMMENT_PATTERN_MEMORY_KEY
    ]);
    return data[COMMENT_PATTERN_MEMORY_KEY] || {
        version: COMMENT_PATTERN_MEMORY_VERSION,
        buckets: {}
    };
}

async function updatePatternMemory(lang, category, patternProfile) {
    if (!patternProfile || !patternProfile.analyzedCount) {
        return null;
    }
    var memory = await loadPatternMemoryState();
    var merged = mergePatternBucket(
        memory, lang, category, patternProfile
    );
    await localStorageSet({
        [COMMENT_PATTERN_MEMORY_KEY]: merged
    });
    return loadPatternBucket(merged, lang, category);
}

function getLengthBandForComment(length) {
    if (length < 55) return 'short';
    if (length < 120) return 'medium';
    return 'long';
}

function getLengthBandIndex(band) {
    if (band === 'short') return 0;
    if (band === 'medium') return 1;
    if (band === 'long') return 2;
    return 1;
}

function getCommentToneIntensity(comment) {
    var text = comment || '';
    var exclam = (text.match(/!/g) || []).length;
    var emojiCount = (text.match(/[\u{1F300}-\u{1FAFF}]/gu) || [])
        .length;
    var upperWords = (text.match(/\b[A-Z]{3,}\b/g) || []).length;
    var signal = exclam + emojiCount + upperWords;
    if (signal >= 3) return 'high';
    if (signal === 0) return 'low';
    return 'balanced';
}


var DISTANCE_GUARD_CATEGORIES = new Set([
    'newjob', 'career', 'achievement'
]);
var DISTANCE_DIRECT_PHRASES = [
    'happy for you',
    'so proud of you',
    'proud of you',
    'thrilled for you',
    'you deserve this so much',
    'muito realizado',
    'muito realizada',
    'feliz por voce',
    'feliz por vc',
    'orgulho de voce',
    'orgulho de vc',
    'orgulhoso de voce',
    'orgulhosa de voce',
    'orgulhoso de vc',
    'orgulhosa de vc',
    'tenho orgulho de voce',
    'tenho orgulho de vc',
    'te admiro'
];
var DISTANCE_SECOND_PERSON_TOKENS = new Set([
    'you', 'your', 'voce', 'vc', 'te'
]);
var DISTANCE_CLOSENESS_TOKENS = [
    'proud', 'orgulho', 'happy', 'feliz',
    'realizado', 'realizada', 'admire',
    'admiro', 'deserve', 'merece'
];

function isCareerDistanceCategory(category) {
    return DISTANCE_GUARD_CATEGORIES.has(
        String(category || '').toLowerCase()
    );
}

function assessStrangerDistanceRisk(comment, category) {
    var diagnostics = {
        risky: false,
        riskType: 'distance',
        ruleHit: null,
        matchedSnippet: ''
    };
    if (!isCareerDistanceCategory(category)) {
        return diagnostics;
    }
    var normalized = normalizeCopyGuardText(comment);
    if (!normalized) return diagnostics;
    for (var phrase of DISTANCE_DIRECT_PHRASES) {
        if (normalized.includes(phrase)) {
            return {
                risky: true,
                riskType: 'distance',
                ruleHit: 'direct-intimacy-phrase',
                matchedSnippet: phrase
            };
        }
    }
    var tokens = normalized.split(' ').filter(Boolean);
    var hasSecondPerson = tokens.some(function(token) {
        return DISTANCE_SECOND_PERSON_TOKENS.has(token);
    });
    if (!hasSecondPerson) return diagnostics;
    for (var token of tokens) {
        for (var cue of DISTANCE_CLOSENESS_TOKENS) {
            if (token === cue || token.startsWith(cue)) {
                return {
                    risky: true,
                    riskType: 'distance',
                    ruleHit: 'pronoun-emotional-closeness',
                    matchedSnippet: cue
                };
            }
        }
    }
    return diagnostics;
}

function collectPatternTokens(guidance, bucket) {
    var set = new Set();
    var sources = []
        .concat(guidance?.preferredOpeners || [])
        .concat(guidance?.topNgrams || []);
    for (var phrase of sources) {
        for (var token of tokenizeGroundingText(phrase)) {
            set.add(token);
        }
    }
    var bucketNgrams = Object.keys(bucket?.ngrams || {})
        .slice(0, 16);
    for (var bg of bucketNgrams) {
        for (var bt of tokenizeGroundingText(bg)) {
            set.add(bt);
        }
    }
    return set;
}

function validateCommentPatternFit(
    comment, patternProfile, bucket, safetyCtx
) {
    var text = (comment || '').trim();
    if (!text) {
        return {
            ok: false,
            reason: 'skip-pattern-fit'
        };
    }
    var profileConfidence = Number(
        patternProfile?.patternConfidence || 0
    );
    if (profileConfidence > 0 &&
        profileConfidence < PATTERN_MIN_CONFIDENCE) {
        return {
            ok: false,
            reason: 'skip-pattern-low-signal'
        };
    }
    var guidance = buildPatternGuidance(
        patternProfile, bucket
    );
    var expectedLength = guidance.lengthBand;
    var actualLength = getLengthBandForComment(text.length);
    var distance = Math.abs(
        getLengthBandIndex(actualLength) -
        getLengthBandIndex(expectedLength)
    );
    if (distance > 1) {
        return {
            ok: false,
            reason: 'skip-pattern-fit'
        };
    }
    var actualTone = getCommentToneIntensity(text);
    if (guidance.toneIntensity === 'low' &&
        actualTone === 'high') {
        return {
            ok: false,
            reason: 'skip-pattern-fit'
        };
    }
    if (guidance.toneIntensity === 'high' &&
        actualTone === 'low') {
        return {
            ok: false,
            reason: 'skip-pattern-fit'
        };
    }
    if (!guidance.allowQuestion && text.includes('?')) {
        return {
            ok: false,
            reason: 'skip-pattern-fit'
        };
    }
    var emojiCount = (text.match(/[\u{1F300}-\u{1FAFF}]/gu) || [])
        .length;
    if (emojiCount > Number(guidance.maxEmoji || 0)) {
        return {
            ok: false,
            reason: 'skip-pattern-fit'
        };
    }
    var normalized = normalizeCompareText(text);
    var existingComments = Array.isArray(
        safetyCtx?.existingComments
    ) ? safetyCtx.existingComments : [];
    for (var existing of existingComments) {
        var prior = normalizeCompareText(existing?.text || '');
        if (prior && prior.length >= 10 &&
            prior === normalized) {
            return {
                ok: false,
                reason: 'skip-pattern-fit'
            };
        }
    }
    var lexicon = collectPatternTokens(guidance, bucket);
    var commentTokens = tokenizeGroundingText(text);
    if (lexicon.size >= 6 && commentTokens.length > 0) {
        var overlap = 0;
        for (var token of commentTokens) {
            if (lexicon.has(token)) overlap++;
        }
        var ratio = overlap / commentTokens.length;
        if (ratio < 0.06) {
            return {
                ok: false,
                reason: 'skip-pattern-fit'
            };
        }
    }
    return { ok: true, reason: null, guidance };
}

function buildHumanVoiceRules(commentThreadSummary, category) {
    if (!commentThreadSummary ||
        !commentThreadSummary.count) {
        return '\n- Keep it conversational, concise,' +
            ' and natural.';
    }
    var targetLen = commentThreadSummary.brevity === 'long'
        ? '80-140 chars'
        : commentThreadSummary.brevity === 'medium'
            ? '55-110 chars'
            : '35-90 chars';
    var emojiRule = commentThreadSummary.emojiRate > 0.25
        ? '\n- Emoji use is common here: you may use' +
            ' at most one emoji if it feels natural.'
        : '\n- Avoid emojis unless they feel necessary' +
            ' for this thread vibe.';
    var allowQuestion =
        commentThreadSummary.questionRate > 0.35 &&
        !isCareerDistanceCategory(category) &&
        category !== 'critique';
    var questionRule = allowQuestion
        ? '\n- A short question is allowed if it' +
            ' mirrors the thread style.'
        : '\n- Prefer statements over questions.';
    var energyRule = isCareerDistanceCategory(category)
        ? '\n- Keep a professional and emotionally' +
            ' neutral tone.'
        : commentThreadSummary.energy === 'high'
            ? '\n- Keep an energetic, expressive tone.'
            : commentThreadSummary.energy === 'low'
                ? '\n- Keep a calm, understated tone.'
                : '\n- Keep a balanced conversational tone.';
    return '\n- Target length: ' + targetLen + '.' +
        emojiRule + questionRule + energyRule;
}

function tokenizeGroundingText(text) {
    return ((text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ' ')
        .match(/[a-z0-9]{3,}/g)) || [];
}

function buildContextTokenSet(
    postText, existingComments, commentThreadSummary
) {
    var corpus = [postText || ''];
    if (Array.isArray(existingComments)) {
        for (var item of existingComments.slice(0, 12)) {
            corpus.push(item?.text || '');
        }
    }
    if (Array.isArray(commentThreadSummary?.keywords)) {
        corpus.push(commentThreadSummary.keywords.join(' '));
    }
    if (Array.isArray(commentThreadSummary?.samplePhrases)) {
        corpus.push(
            commentThreadSummary.samplePhrases.join(' ')
        );
    }
    return new Set(
        tokenizeGroundingText(corpus.join(' '))
    );
}

function getContextGroundingData(
    comment, postText, existingComments, commentThreadSummary
) {
    var commentTokens = tokenizeGroundingText(comment);
    if (commentTokens.length === 0) {
        return {
            grounded: false,
            ratio: 0,
            minRatio: existingComments?.length >= 2
                ? 0.22 : 0.12
        };
    }
    var contextTokens = buildContextTokenSet(
        postText, existingComments, commentThreadSummary
    );
    if (contextTokens.size === 0) {
        return { grounded: true, ratio: 1, minRatio: 0 };
    }
    var overlap = 0;
    for (var token of commentTokens) {
        if (contextTokens.has(token)) overlap++;
    }
    var ratio = overlap / commentTokens.length;
    var minRatio = existingComments?.length >= 2
        ? 0.22 : 0.12;
    return {
        grounded: ratio >= minRatio,
        ratio,
        minRatio
    };
}

function isContextGroundedComment(
    comment, postText, existingComments, commentThreadSummary
) {
    return getContextGroundingData(
        comment,
        postText, existingComments, commentThreadSummary
    ).grounded;
}

var CAREER_DEPARTURE_SIGNAL_TERMS = [
    'last day',
    'leaving',
    'moving on',
    'resigned',
    'farewell',
    'saindo',
    'deixando',
    'ultimo dia',
    'me despeco',
    'encerrando ciclo'
];

var CAREER_NEW_JOB_SIGNAL_TERMS = [
    'new role',
    'joining',
    'just started',
    'new position',
    'novo emprego',
    'fui contratado',
    'comecei na',
    'first day',
    'day one',
    'new team'
];

function detectCareerTransitionSignals(postText) {
    var normalized = normalizeCopyGuardText(postText);
    if (!normalized) {
        return {
            hasDepartureSignal: false,
            hasNewJobSignal: false,
            isDepartureOnly: false
        };
    }
    var hasDepartureSignal = CAREER_DEPARTURE_SIGNAL_TERMS
        .some(function(term) {
            return normalized.includes(term);
        });
    var hasNewJobSignal = CAREER_NEW_JOB_SIGNAL_TERMS
        .some(function(term) {
            return normalized.includes(term);
        });
    return {
        hasDepartureSignal,
        hasNewJobSignal,
        isDepartureOnly: hasDepartureSignal &&
            !hasNewJobSignal
    };
}

function isMetricsOrSocialImpactPost(category, postText, imageSignals) {
    var cat = (category || '').toLowerCase();
    if (cat === 'news' || cat === 'motivation') return true;
    var text = (
        (postText || '') + ' ' +
        ((imageSignals?.samples || []).join(' '))
    ).toLowerCase();
    return /\b(women|female|mulheres|lideran[çc]a|leadership|diversity|diversidade|inclusion|inclus[aã]o|equity|metric|metrics|kpi|report|survey|dados|n[uú]meros|estat[ií]sticas|percent|%)\b/i
        .test(text);
}

function isCategorySignalConsistent(
    category, reactionSummary, commentThreadSummary
) {
    var cat = category || 'generic';
    var reaction = reactionSummary?.dominant || '';
    var sentiment = commentThreadSummary?.dominantSentiment
        || '';
    var reactionMap = {
        ENTERTAINMENT: ['humor'],
        PRAISE: ['achievement', 'career', 'newjob'],
        INTEREST: ['technical', 'tips', 'news', 'project'],
        EMPATHY: ['jobseeking', 'story', 'motivation'],
        APPRECIATION: ['achievement', 'motivation', 'story'],
        LIKE: ['generic', 'news', 'story', 'project']
    };
    var sentimentMap = {
        celebration: ['achievement', 'career', 'newjob'],
        insight: ['technical', 'tips', 'news', 'project'],
        support: ['jobseeking', 'story', 'motivation'],
        question: ['question'],
        agreement: ['critique', 'technical', 'news'],
        gratitude: ['motivation', 'story', 'achievement'],
        personal: ['story', 'motivation', 'technical'],
        generic: ['generic', 'news', 'story', 'project']
    };
    var reactionAligned = Array.isArray(
        reactionMap[reaction]
    ) && reactionMap[reaction].includes(cat);
    var sentimentAligned = Array.isArray(
        sentimentMap[sentiment]
    ) && sentimentMap[sentiment].includes(cat);
    if (!reaction && !sentiment) return false;
    return reactionAligned || sentimentAligned;
}

function computeCommentConfidence(context) {
    var threadCount = Number(
        context?.commentThreadSummary?.count ||
        context?.existingComments?.length || 0
    );
    var threadEvidence = threadCount >= 3
        ? 35 : threadCount >= 1 ? 20 : 0;
    var reactionEvidence =
        Number(context?.reactionSummary?.total || 0) >= 20
            ? 15 : 0;
    var groundingRatio = Number(context?.groundingRatio || 0);
    var groundingEvidence = groundingRatio >= 0.22
        ? 30 : groundingRatio >= 0.15 ? 10 : 0;
    var categoryEvidence = isCategorySignalConsistent(
        context?.category,
        context?.reactionSummary,
        context?.commentThreadSummary
    ) ? 20 : 0;
    var score = threadEvidence + reactionEvidence +
        groundingEvidence + categoryEvidence;
    return {
        score: Math.min(100, score),
        threadEvidence,
        reactionEvidence,
        groundingEvidence,
        categoryEvidence
    };
}

function validateCommentSafety(comment, context) {
    var text = (comment || '').trim();
    if (!text) return false;
    if (text.length < 5 || text.length > 300) return false;
    var lower = text.toLowerCase();
    var category = context?.category || 'generic';
    if (lower.includes('?')) return false;
    var distanceRisk = assessStrangerDistanceRisk(text, category);
    if (distanceRisk.risky) return false;

    var ironyRe = /\b(obviously|clearly|duh|yeah right|sure buddy|good luck with that|as if|lol sure|ironic|sarcasm|sarcastic|imagina|claro que n[aã]o)\b/i;
    if (ironyRe.test(lower)) return false;

    var polemicRe = /\b(garbage|trash|fraud|scam|ridiculous|nonsense|idiota|rid[ií]culo|absurdo|boicot|boycott|cancel culture|shut up|cala a boca)\b/i;
    if (polemicRe.test(lower)) return false;

    var discussionRe = /\b(let me know|what do you think|thoughts|agree\?|discorda|debate|discuss|dm me|reach out)\b/i;
    if (discussionRe.test(lower)) return false;

    var celebrationRe =
        /\b(congrats|congratulations|parab[eé]ns|well deserved|muito merecido)\b/i;
    var transitionSignals = detectCareerTransitionSignals(
        context?.postText
    );
    if (transitionSignals.isDepartureOnly &&
        celebrationRe.test(lower)) {
        return false;
    }
    var laughRe =
        /\b(lol|lmao|haha+|hahaha|kkkk+|rsrs+|ri alto|too real|real demais|real one|got me|accurate|certeiro)\b/i;
    if (category === 'humor') {
        if (celebrationRe.test(lower)) return false;
        if (!laughRe.test(lower)) return false;
        if (text.length > 85) return false;
    }
    if (category !== 'humor' && laughRe.test(lower)) {
        return false;
    }

    var riskyIntentRe =
        /\b(bookmark(?:ed|ing)?|save(?:d| later)?|saved for later|use later|forward(?:ing)?|sent (this )?to (my )?team|salv(ei|ando|ar)|guardar|pra depois|usar depois|encaminh(ei|ando)|mandei pro (time|grupo))\b/i;
    if (riskyIntentRe.test(lower) &&
        (category !== 'technical' || isMetricsOrSocialImpactPost(
            category, context?.postText, context?.imageSignals
        ))) {
        return false;
    }

    return true;
}

async function generateAIComment(data) {
    const { postText, existingComments, author,
        authorTitle, lang, category, reactions,
        reactionSummary, commentThreadSummary,
        imageSignals, apiKey,
        goalMode, patternProfile,
        allowLowSignalRecovery } = data;
    if (!apiKey) return { comment: null, reason: null };

    var reactionCtx = formatReactionContext(reactions);
    var threadStyleCtx = formatThreadStyleContext(
        commentThreadSummary
    );
    var threadTopicCtx = formatThreadTopicContext(
        commentThreadSummary
    );
    var imageCtx = formatImageContext(imageSignals);
    var engagementCtx = formatEngagementContext(
        reactionSummary
    );
    var memoryLang = lang ||
        commentThreadSummary?.dominantLanguage || 'en';
    var memoryCategory = category || 'generic';
    var bucket = await updatePatternMemory(
        memoryLang, memoryCategory, patternProfile
    );
    var patternGuidance = buildPatternGuidance(
        patternProfile, bucket
    );
    if (patternGuidance.lowSignal &&
        allowLowSignalRecovery !== true) {
        return {
            comment: null,
            reason: 'skip-pattern-low-signal'
        };
    }
    var patternProfileCtx = formatPatternProfileContext(
        patternProfile, patternGuidance
    );
    var learnedPatternCtx = formatLearnedPatternContext(
        bucket, patternGuidance
    );

    const commentsCtx = existingComments?.length
        ? '\n\nOther comments on this post:\n' +
            existingComments.slice(0, 8).map(
                c => '- ' + (c.author || '') + ': ' +
                    c.text
            ).join('\n')
        : '';

    const cat = category || 'generic';
    var metricsOrSocial = isMetricsOrSocialImpactPost(
        cat, postText, imageSignals
    );
    var transitionSignals = detectCareerTransitionSignals(
        postText
    );
    var isDepartureOnly = transitionSignals.isDepartureOnly;
    var toneGuide = '';
    if (isDepartureOnly) {
        toneGuide =
            '\nTone: DEPARTURE-ONLY career transition.' +
            ' Neutral transition acknowledgment only.' +
            ' Do NOT congratulate leaving a company.' +
            ' Keep it respectful, brief, and forward-looking.';
    } else if (cat === 'humor') {
        toneGuide =
            '\nTone: HUMOROUS post.' +
            ' Keep it minimal and natural:' +
            ' short laugh or "too real".' +
            ' NEVER congratulate.' +
            ' NEVER be witty, ironic, sarcastic,' +
            ' opinionated, or edgy.';
    } else if (cat === 'achievement' ||
        cat === 'career' || cat === 'newjob') {
        toneGuide =
            '\nTone: CAREER MILESTONE post.' +
            ' Use professional-neutral wording:' +
            ' brief congrats plus a neutral wish.' +
            ' Keep emotional intensity low.' +
            ' Avoid close-friend wording or' +
            ' emotional assumptions.';
    } else if (cat === 'critique') {
        toneGuide =
            '\nTone: OPINION post.' +
            ' Acknowledge neutrally.' +
            ' Do NOT take sides or debate.';
    } else if (cat === 'hiring') {
        if (goalMode === 'active') {
            toneGuide =
                '\nTone: JOB/HIRING post (ACTIVE mode).' +
                ' Sound professional and positive about' +
                ' the team/stack/market.' +
                ' NEVER use humor, irony, or sarcasm.' +
                ' Keep it short, respectful, and safe.';
        } else {
            toneGuide =
                '\nTone: JOB/HIRING post (PASSIVE mode).' +
                ' Comment like an industry insider who' +
                ' knows the tech landscape well.' +
                ' Do NOT express interest in the role.' +
                ' NEVER say "I\'m interested",' +
                ' "I\'d love to apply",' +
                ' "looking for opportunities",' +
                ' or "open to work".' +
                ' NEVER use humor, irony, or sarcasm.' +
                ' Keep it 1 sentence, under 80 chars.';
        }
    } else if (
        cat === 'news' ||
        cat === 'motivation' ||
        metricsOrSocial
    ) {
        toneGuide =
            '\nTone: CONTEXT-SENSITIVE post.' +
            ' Keep a neutral acknowledgement.' +
            ' Do NOT over-celebrate.' +
            ' Do NOT use "saved", "bookmarked",' +
            ' "forwarded", or "sent to my team".';
    } else if (cat === 'technical') {
        toneGuide =
            '\nTone: TECHNICAL post.' +
            ' Show you understood the content.' +
            ' Share a brief related experience' +
            ' or acknowledge a specific point.';
    }
    var authorRoleTone = inferAuthorRoleTone(
        authorTitle
    );
    if (authorRoleTone) {
        toneGuide += '\nAuthor-role style:' +
            ' keep it ' + authorRoleTone + '.';
    }

    var authorCtx = 'Post by ' +
        (author || 'someone');
    if (authorTitle) {
        authorCtx += ' (' + authorTitle + ')';
    }

    var langRule = lang === 'pt'
        ? '\n- LANGUAGE: Write ONLY in Brazilian' +
            ' Portuguese. NEVER use English words.' +
            ' Match the tone of the other comments.'
        : '\n- LANGUAGE: Write ONLY in English.' +
            ' Match the tone of the other comments.';
    var humanVoiceRules = buildHumanVoiceRules(
        commentThreadSummary, cat
    );
    var distanceToneRule = isCareerDistanceCategory(cat)
        ? '\n- For career milestones: match thread' +
            ' formality and length, not emotional intensity.' +
            '\n- Keep the tone professional and neutral.' +
            '\n- NEVER say "happy for you", "so proud of you",' +
            ' "muito realizado", or "feliz por você".'
        : '';

    var commentPriorityCtx =
        '\nPRIMARY CONTEXT (thread comments first):' +
        commentsCtx +
        threadStyleCtx +
        threadTopicCtx +
        patternProfileCtx;
    var learnedPriorityCtx = learnedPatternCtx;
    var reactionPriorityCtx =
        '\n\nTERTIARY CONTEXT (engagement):' +
        engagementCtx +
        reactionCtx;
    var authorPriorityCtx =
        '\n\nTERTIARY CONTEXT (author role):\n' + authorCtx;
    var postPriorityCtx =
        '\n\nLAST RESORT CONTEXT (post text/image):\n' +
        (postText || '').substring(0, 800) +
        imageCtx;

    const prompt =
        'You are commenting on a LinkedIn post.' +
        ' Write one safe, natural, context-aware' +
        ' comment that fits the existing thread.' +
        toneGuide +
        '\n\nRules:' +
        langRule +
        humanVoiceRules +
        distanceToneRule +
        '\n- Max 120 chars, 1-2 sentences' +
        '\n- Existing comments are PRIMARY context.' +
        ' Match their tone, style, and length first.' +
        '\n- Reactions are SECONDARY context.' +
        ' Align with dominant reaction tone.' +
        '\n- Post text is tertiary context.' +
        '\n- Look at the other comments below for' +
        ' tone and style reference — write' +
        ' something similar in length and vibe' +
        '\n- Mirror the dominant thread style' +
        ' (tone, energy, and length) but use' +
        ' original wording' +
        '\n- Clone style, not text: do NOT copy exact' +
        ' phrases from existing comments' +
        '\n- Match sentence shape and tone intensity' +
        ' from the pattern profile' +
        '\n- Use thread keywords as themes only,' +
        ' never as reusable phrase blocks' +
        '\n- NEVER reuse 4+ contiguous words from any' +
        ' existing comment' +
        '\n- Do not introduce topics that are not in' +
        ' post text or existing comments' +
        '\n- Sound like a real person in this' +
        ' thread, not like an AI assistant' +
        '\n- Prefer natural contractions and plain' +
        ' spoken language over formal wording' +
        '\n- NEVER parrot or repeat the post text' +
        '\n- NEVER mention the author\'s name,' +
        ' degree, company, role, or any specific' +
        ' detail about them' +
        '\n- NEVER say "faz sentido", "nice",' +
        ' "cool", "interesting", "Great post",' +
        ' "Love this", "Thanks for sharing"' +
        '\n- NEVER use hashtags' +
        '\n- NEVER invite a reply or discussion' +
        '\n- NEVER ask questions' +
        '\n- NEVER start debate or ask for opinions' +
        '\n- NEVER use ambiguous phrasing' +
        '\n- NEVER be ironic, sarcastic, offensive' +
        ', polemic, or dismissive' +
        '\n- NEVER say "saved/bookmarked/use later"' +
        ' or "sent to my team" in social-impact or' +
        ' metrics contexts' +
        '\n- For hiring/job posts NEVER use humor,' +
        ' sarcasm, or ambiguous phrasing' +
        '\n- For humor posts use only a short laugh' +
        ' style; never congratulate' +
        '\n- NEVER create discussion or controversy' +
        '\n- Be SAFE: if unsure, output "SKIP"' +
        '\n- Don\'t repeat what others said' +
        commentPriorityCtx +
        learnedPriorityCtx +
        reactionPriorityCtx +
        authorPriorityCtx +
        postPriorityCtx +
        '\n\nYour comment (raw text, no quotes,' +
        ' or "SKIP" if no good comment):';

    try {
        var copyRiskDiagnostics = null;
        var distanceRiskDiagnostics = null;
        var copyRiskAttempts = 0;
        var retryGuardReason = null;
        for (var attempt = 1; attempt <= 2; attempt++) {
            copyRiskAttempts = attempt;
            var retryPrompt = prompt;
            if (attempt === 2) {
                retryPrompt +=
                    '\n\nRetry with stronger constraints:' +
                    '\n- Keep the same vibe but rewrite from scratch.' +
                    '\n- Do not reuse any 4-word span from existing comments.';
                if (retryGuardReason === 'distance') {
                    retryPrompt +=
                        '\n- Keep wording professional and emotionally neutral.' +
                        '\n- Do not assume personal closeness with the author.' +
                        '\n- Avoid phrases like "happy for you",' +
                        ' "proud of you", "muito realizado",' +
                        ' or "feliz por você".';
                }
                retryPrompt +=
                    '\n- If originality or tone safety is uncertain,' +
                    ' return SKIP.';
            }
            var temperature = attempt === 1 ? 0.55 : 0.7;
            const resp = await fetch(
                'https://api.groq.com/openai/v1/' +
                'chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + apiKey
                    },
                    body: JSON.stringify({
                        model: 'llama-3.3-70b-versatile',
                        messages: [{
                            role: 'user',
                            content: retryPrompt
                        }],
                        max_tokens: 90,
                        temperature
                    })
                }
            );
            if (!resp.ok) {
                log(
                    '[LinkedIn Bot] AI API error: ' +
                    resp.status
                );
                return { comment: null, reason: null };
            }
            const json = await resp.json();
            let comment = json.choices?.[0]
                ?.message?.content?.trim();
            if (!comment) {
                return {
                    comment: null,
                    reason: 'skip-low-confidence'
                };
            }
            comment = comment
                .replace(/^["']|["']$/g, '')
                .replace(/^Comment:\s*/i, '')
                .trim();
            if (/\?\s*$/.test(comment)) {
                log(
                    '[LinkedIn Bot] AI generated a ' +
                    'question, skipping: "' +
                    comment.substring(0, 60) + '"'
                );
                return {
                    comment: null,
                    reason: 'skip-safety-guard'
                };
            }
            if (/^skip$/i.test(comment)) {
                log(
                    '[LinkedIn Bot] AI chose to SKIP'
                );
                return {
                    comment: null,
                    reason: 'skip-low-confidence'
                };
            }
            if (comment.length < 5 ||
                comment.length > 300) {
                return {
                    comment: null,
                    reason: 'skip-safety-guard'
                };
            }
            var grounding = getContextGroundingData(
                comment,
                postText,
                existingComments,
                commentThreadSummary
            );
            if (!grounding.grounded) {
                log(
                    '[LinkedIn Bot] AI comment not grounded' +
                    ' in thread context'
                );
                return {
                    comment: null,
                    reason: 'skip-context-mismatch'
                };
            }
            var distanceRisk = assessStrangerDistanceRisk(
                comment, cat
            );
            if (distanceRisk.risky) {
                distanceRiskDiagnostics = distanceRisk;
                if (attempt < 2) {
                    retryGuardReason = 'distance';
                    continue;
                }
                return {
                    comment: null,
                    reason: 'skip-distance-risk',
                    diagnostics: distanceRiskDiagnostics,
                    attempts: copyRiskAttempts
                };
            }
            if (!validateCommentSafety(comment, {
                category: cat,
                postText,
                imageSignals
            })) {
                log(
                    '[LinkedIn Bot] AI comment rejected by' +
                    ' safety guard'
                );
                return {
                    comment: null,
                    reason: 'skip-safety-guard'
                };
            }
            if (allowLowSignalRecovery !== true) {
                var patternFit = validateCommentPatternFit(
                    comment,
                    patternProfile,
                    bucket,
                    { existingComments }
                );
                if (!patternFit.ok) {
                    return {
                        comment: null,
                        reason: patternFit.reason ||
                            'skip-pattern-fit'
                    };
                }
            }
            var copyRisk = assessCommentCopyRisk(
                comment,
                existingComments
            );
            if (copyRisk.risky) {
                copyRiskDiagnostics = copyRisk;
                if (attempt < 2) {
                    retryGuardReason = 'copy';
                    continue;
                }
                return {
                    comment: null,
                    reason: 'skip-copy-risk',
                    diagnostics: copyRiskDiagnostics,
                    attempts: copyRiskAttempts
                };
            }
            var confidence = computeCommentConfidence({
                category: cat,
                reactionSummary,
                commentThreadSummary,
                existingComments,
                groundingRatio: grounding.ratio
            });
            if (confidence.score < 60) {
                log(
                    '[LinkedIn Bot] AI comment low confidence' +
                    ` (${confidence.score}), skipping`
                );
                return {
                    comment: null,
                    reason: 'skip-low-confidence'
                };
            }
            return {
                comment,
                reason: null,
                diagnostics: null,
                attempts: copyRiskAttempts
            };
        }
        return {
            comment: null,
            reason: retryGuardReason === 'distance'
                ? 'skip-distance-risk'
                : 'skip-copy-risk',
            diagnostics: retryGuardReason === 'distance'
                ? distanceRiskDiagnostics
                : copyRiskDiagnostics,
            attempts: copyRiskAttempts
        };
    } catch (e) {
        log(
            '[LinkedIn Bot] AI error: ' + e.message
        );
        return { comment: null, reason: null };
    }
}

function respondOnce(sendResponse) {
    let sent = false;
    return (payload) => {
        if (sent) return;
        sent = true;
        sendResponse(payload);
    };
}

chrome.runtime.onMessage.addListener(
    (request, sender, sendResponse) => {
        sendResponse = respondOnce(sendResponse);
        if (request.action === 'generateAIComment') {
            generateAIComment(request).then(
                result => sendResponse({
                    comment: result?.comment || null,
                    reason: result?.reason || null,
                    diagnostics: result?.diagnostics || null,
                    attempts: Number(result?.attempts) || 0
                })
            ).catch(() => sendResponse({
                comment: null,
                reason: null,
                diagnostics: null,
                attempts: 0
            }));
            return true;
        }

        if (request.action === 'start') {
            checkRateLimit('connect').then(status => {
                if (!status.allowed) {
                    sendResponse({
                        status: 'blocked',
                        reason: status.reason
                    });
                    return;
                }
                request.rateRemaining = status.remaining;
                request.templateMeta = normalizeTemplateMeta(
                    request.templateMeta || {
                        usageGoal:
                            request.connectUsageGoal || '',
                        expectedResultsBucket:
                            request.connectExpectedResults || '',
                        operatorCount:
                            countBooleanOperatorsSafe(
                                request.query || ''
                            ),
                        compiledQueryLength:
                            String(request.query || '').length,
                        templateId:
                            request.connectTemplateId || '',
                        mode: 'connect'
                    },
                    'connect'
                );
                launchAutomation(request);
                sendResponse({ status: 'started' });
            }).catch(() => {
                sendResponse({
                    status: 'blocked',
                    reason: 'unknown'
                });
            });
            return true;
        }

        if (request.action === 'startProfileWalk') {
            profileWalkStopRequested = false;
            launchProfileWalk(request)
                .then(result => {
                    chrome.runtime.sendMessage({
                        action: 'profileWalkDone',
                        result
                    }, () => {
                        if (chrome.runtime.lastError) {
                            // popup closed — swallow
                        }
                    });
                })
                .catch(err => {
                    chrome.runtime.sendMessage({
                        action: 'profileWalkDone',
                        result: {
                            visited: 0,
                            errors: 1,
                            reason: 'exception',
                            error: String(err?.message || err)
                        }
                    }, () => {
                        if (chrome.runtime.lastError) {
                            // popup closed — swallow
                        }
                    });
                });
            sendResponse({ status: 'started' });
            return true;
        }

        if (request.action === 'stopProfileWalk') {
            profileWalkStopRequested = true;
            sendResponse({ status: 'stopping' });
            return;
        }

        if (request.action === 'saveJobsProfileCache') {
            if (typeof encryptJobsProfileCache !== 'function') {
                sendResponse({
                    status: 'error',
                    error: 'Jobs cache encryption unavailable.'
                });
                return true;
            }
            encryptJobsProfileCache(
                request.profile || {},
                request.profilePassphrase
            ).then((envelope) => {
                chrome.storage.local.set({
                    [JOBS_PROFILE_CACHE_KEY]: envelope
                }, () => {
                    sendResponse({
                        status: 'saved',
                        updatedAt: envelope.updatedAt,
                        version: envelope.version
                    });
                });
            }).catch((error) => {
                sendResponse({
                    status: 'error',
                    error: error?.message || 'Failed to save cache.'
                });
            });
            return true;
        }

        if (request.action === 'getJobsProfileCacheStatus') {
            chrome.storage.local.get(
                JOBS_PROFILE_CACHE_KEY,
                (data) => {
                    if (typeof getJobsProfileCacheStatus !== 'function') {
                        sendResponse({
                            exists: !!data[JOBS_PROFILE_CACHE_KEY],
                            locked: !!data[JOBS_PROFILE_CACHE_KEY],
                            version: data[JOBS_PROFILE_CACHE_KEY]
                                ?.version || null,
                            updatedAt: data[JOBS_PROFILE_CACHE_KEY]
                                ?.updatedAt || null
                        });
                        return;
                    }
                    sendResponse(
                        getJobsProfileCacheStatus(
                            data[JOBS_PROFILE_CACHE_KEY]
                        )
                    );
                }
            );
            return true;
        }

        if (request.action === 'loadJobsProfileCache') {
            chrome.storage.local.get(
                JOBS_PROFILE_CACHE_KEY,
                async (data) => {
                    if (chrome.runtime.lastError) {
                        sendResponse({
                            status: 'error',
                            reason: 'profile-cache-locked'
                        });
                        return;
                    }
                    const envelope = data[JOBS_PROFILE_CACHE_KEY];
                    if (!envelope) {
                        sendResponse({ status: 'missing' });
                        return;
                    }
                    if (!request.profilePassphrase ||
                        typeof decryptJobsProfileCache !==
                            'function') {
                        sendResponse({
                            status: 'error',
                            reason: 'profile-cache-locked'
                        });
                        return;
                    }
                    try {
                        const profile = await decryptJobsProfileCache(
                            envelope,
                            request.profilePassphrase
                        );
                        sendResponse({
                            status: 'loaded',
                            profile:
                                normalizeJobsRuntimeProfile(profile)
                        });
                    } catch (error) {
                        sendResponse({
                            status: 'error',
                            reason: 'profile-cache-locked'
                        });
                    }
                }
            );
            return true;
        }

        if (request.action === 'saveJobsCareerIntel') {
            if (typeof encryptJobsCareerIntelState !== 'function') {
                sendResponse({
                    status: 'error',
                    error: 'Career intelligence encryption unavailable.'
                });
                return true;
            }
            encryptJobsCareerIntelState(
                request.state || {},
                request.profilePassphrase
            ).then((envelope) => {
                chrome.storage.local.set({
                    [JOBS_CAREER_INTEL_KEY]: envelope
                }, () => {
                    sendResponse({
                        status: 'saved',
                        updatedAt: envelope.updatedAt,
                        version: envelope.version
                    });
                });
            }).catch((error) => {
                sendResponse({
                    status: 'error',
                    error: error?.message ||
                        'Failed to save career intelligence.'
                });
            });
            return true;
        }

        if (request.action === 'loadJobsCareerIntel') {
            chrome.storage.local.get(
                JOBS_CAREER_INTEL_KEY,
                async (data) => {
                    const envelope = data[JOBS_CAREER_INTEL_KEY];
                    if (!envelope) {
                        sendResponse({ status: 'missing' });
                        return;
                    }
                    if (!request.profilePassphrase ||
                        typeof decryptJobsCareerIntelState !== 'function') {
                        sendResponse({
                            status: 'error',
                            reason: 'career-intel-locked'
                        });
                        return;
                    }
                    try {
                        const state = await decryptJobsCareerIntelState(
                            envelope,
                            request.profilePassphrase
                        );
                        sendResponse({
                            status: 'loaded',
                            state
                        });
                    } catch (error) {
                        sendResponse({
                            status: 'error',
                            reason: 'career-intel-locked'
                        });
                    }
                }
            );
            return true;
        }

        if (request.action === 'getJobsCareerIntelStatus') {
            chrome.storage.local.get(
                JOBS_CAREER_INTEL_KEY,
                (data) => {
                    if (typeof getJobsCareerIntelStatus !== 'function') {
                        sendResponse({
                            exists: !!data[JOBS_CAREER_INTEL_KEY],
                            locked: !!data[JOBS_CAREER_INTEL_KEY],
                            version: data[JOBS_CAREER_INTEL_KEY]?.version || null,
                            updatedAt:
                                data[JOBS_CAREER_INTEL_KEY]?.updatedAt || null
                        });
                        return;
                    }
                    sendResponse(
                        getJobsCareerIntelStatus(
                            data[JOBS_CAREER_INTEL_KEY]
                        )
                    );
                }
            );
            return true;
        }

        if (request.action === 'clearJobsCareerIntel') {
            chrome.storage.local.remove(
                JOBS_CAREER_INTEL_KEY,
                () => {
                    sendResponse({ status: 'cleared' });
                }
            );
            return true;
        }

        if (request.action === 'generateJobsCareerPlan') {
            chrome.storage.local.get(
                JOBS_CAREER_INTEL_KEY,
                async (data) => {
                    const envelope = data[JOBS_CAREER_INTEL_KEY];
                    if (!envelope) {
                        sendResponse({ status: 'missing' });
                        return;
                    }
                    if (!request.profilePassphrase ||
                        typeof decryptJobsCareerIntelState !== 'function' ||
                        typeof buildJobsCareerSearchPlan !== 'function') {
                        sendResponse({
                            status: 'error',
                            reason: 'career-intel-locked'
                        });
                        return;
                    }
                    try {
                        const state = await decryptJobsCareerIntelState(
                            envelope,
                            request.profilePassphrase
                        );
                        const plan = buildJobsCareerSearchPlan(
                            state.analysisSnapshot || {},
                            {
                                expectedResultsBucket:
                                    request.expectedResultsBucket,
                                searchLanguageMode:
                                    request.searchLanguageMode,
                                jobsBrazilOffshoreFriendly:
                                    request.jobsBrazilOffshoreFriendly === true
                            }
                        );
                        sendResponse({
                            status: 'generated',
                            state,
                            plan
                        });
                    } catch (error) {
                        sendResponse({
                            status: 'error',
                            reason: 'career-intel-locked'
                        });
                    }
                }
            );
            return true;
        }

        if (request.action === 'importJobsLinkedInProfile') {
            chrome.tabs.query(
                { active: true, currentWindow: true },
                (tabs) => {
                    const tab = Array.isArray(tabs) ? tabs[0] : null;
                    if (!tab?.id ||
                        !/linkedin\.com\/(in|pub)\//i
                            .test(String(tab.url || ''))) {
                        sendResponse({
                            status: 'error',
                            error:
                                'Open your LinkedIn profile page before importing.'
                        });
                        return;
                    }
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['lib/jobs-profile-import.js']
                    }, () => {
                        if (chrome.runtime.lastError) {
                            sendResponse({
                                status: 'error',
                                error:
                                    'Failed to load LinkedIn profile importer.'
                            });
                            return;
                        }
                        chrome.scripting.executeScript({
                            target: { tabId: tab.id },
                            func: () => {
                                const api = globalThis
                                    .LinkedInJobsProfileImport;
                                if (!api ||
                                    typeof api
                                        .extractLinkedInProfileForJobs !==
                                            'function') {
                                    return null;
                                }
                                return api.extractLinkedInProfileForJobs(
                                    document
                                );
                            }
                        }, (results) => {
                            if (chrome.runtime.lastError ||
                                !Array.isArray(results) ||
                                !results[0]?.result) {
                                sendResponse({
                                    status: 'error',
                                    error:
                                        'Could not read your LinkedIn profile.'
                                });
                                return;
                            }
                            sendResponse({
                                status: 'loaded',
                                profile: results[0].result
                            });
                        });
                    });
                }
            );
            return true;
        }

        if (request.action === 'clearJobsProfileCache') {
            chrome.storage.local.remove(
                JOBS_PROFILE_CACHE_KEY,
                () => {
                    sendResponse({ status: 'cleared' });
                }
            );
            return true;
        }

        if (request.action === 'startCompanyFollow') {
            checkRateLimit('companyFollow').then(status => {
                if (!status.allowed) {
                    sendResponse({
                        status: 'blocked',
                        reason: status.reason
                    });
                    return;
                }
                request.rateRemaining = status.remaining;
                request.companyAreaPreset =
                    typeof normalizeCompanyAreaPreset ===
                        'function'
                        ? normalizeCompanyAreaPreset(
                            request.companyAreaPreset
                        )
                        : (request.companyAreaPreset ||
                            'custom');
                request.templateMeta = normalizeTemplateMeta(
                    request.templateMeta || {
                        usageGoal:
                            request.companyUsageGoal || '',
                        expectedResultsBucket:
                            request.companyExpectedResults || '',
                        templateId:
                            request.companyTemplateId || '',
                        operatorCount:
                            countBooleanOperatorsSafe(
                                request.query || ''
                            ),
                        compiledQueryLength:
                            String(request.query || '').length,
                        mode: 'companies'
                    },
                    'companies'
                );
                launchCompanyFollow(request);
                sendResponse({ status: 'started' });
            }).catch(() => {
                sendResponse({
                    status: 'blocked',
                    reason: 'unknown'
                });
            });
            return true;
        }

        if (request.action === 'startJobsAssist') {
            checkRateLimit('jobsAssist').then((status) => {
                if (!status.allowed) {
                    sendResponse({
                        status: 'blocked',
                        reason: status.reason
                    });
                    return;
                }
                chrome.storage.local.get(
                    [
                        JOBS_PROFILE_CACHE_KEY,
                        JOBS_CAREER_INTEL_KEY
                    ],
                    async (data) => {
                        if (chrome.runtime.lastError) {
                            sendResponse({
                                status: 'blocked',
                                reason: 'unknown'
                            });
                            return;
                        }
                        try {
                            const envelope = data[JOBS_PROFILE_CACHE_KEY];
                            const intelEnvelope =
                                data[JOBS_CAREER_INTEL_KEY];
                            const draftProfile =
                                normalizeJobsRuntimeProfile(
                                    request.profileDraft || {}
                                );
                            let profile = {};
                            let careerIntelState = null;
                            if (envelope) {
                                if (!request.profilePassphrase) {
                                    sendResponse({
                                        status: 'blocked',
                                        reason: 'profile-cache-locked'
                                    });
                                    return;
                                }
                                if (typeof decryptJobsProfileCache !==
                                    'function') {
                                    sendResponse({
                                        status: 'blocked',
                                        reason: 'profile-cache-locked'
                                    });
                                    return;
                                }
                                try {
                                    profile = await decryptJobsProfileCache(
                                        envelope,
                                        request.profilePassphrase
                                    );
                                } catch (err) {
                                    sendResponse({
                                        status: 'blocked',
                                        reason: 'profile-cache-locked'
                                    });
                                    return;
                                }
                            }
                            profile = envelope
                                ? mergeJobsRuntimeProfiles(
                                    profile,
                                    draftProfile
                                )
                                : draftProfile;
                            if (request.jobsUseCareerIntelligence === true &&
                                intelEnvelope) {
                                if (!request.profilePassphrase) {
                                    sendResponse({
                                        status: 'blocked',
                                        reason: 'career-intel-locked'
                                    });
                                    return;
                                }
                                if (typeof decryptJobsCareerIntelState !==
                                    'function') {
                                    sendResponse({
                                        status: 'blocked',
                                        reason: 'career-intel-locked'
                                    });
                                    return;
                                }
                                try {
                                    careerIntelState =
                                        await decryptJobsCareerIntelState(
                                            intelEnvelope,
                                            request.profilePassphrase
                                        );
                                } catch (error) {
                                    sendResponse({
                                        status: 'blocked',
                                        reason: 'career-intel-locked'
                                    });
                                    return;
                                }
                            }
                            const runtimeConfig = {
                                source: 'linkedin',
                                query: String(request.query || '').trim(),
                                limit: Math.max(
                                    1,
                                    parseInt(request.limit, 10) || 10
                                ),
                                easyApplyOnly:
                                    request.easyApplyOnly !== false,
                                roleTerms: parseTextList(
                                    request.roleTerms
                                ),
                                locationTerms: parseTextList(
                                    request.locationTerms
                                ),
                                desiredLevels: parseTextList(
                                    request.desiredLevels
                                ),
                                preferredCompanies: parseTextList(
                                    request.preferredCompanies
                                ),
                                excludedCompanies:
                                    parseExcludedCompanyList(
                                        request.excludedCompanies
                                    ),
                                appliedJobIds: parseTextList(
                                    request.appliedJobIds
                                ),
                                experienceLevel: String(
                                    request.experienceLevel || ''
                                ).trim(),
                                workType: String(
                                    request.workType || ''
                                ).trim(),
                                keywordTerms: parseTextList(
                                    request.keywordTerms
                                ),
                                location: String(
                                    request.location || ''
                                ).trim(),
                                areaPreset: normalizeRuntimeAreaPreset(
                                    request.areaPreset
                                ),
                                jobsUseCareerIntelligence:
                                    request.jobsUseCareerIntelligence === true,
                                jobsBrazilOffshoreFriendly:
                                    request.jobsBrazilOffshoreFriendly === true,
                                careerIntelVersion:
                                    careerIntelState?.analysisSnapshot
                                        ? (intelEnvelope?.version || 1)
                                        : null,
                                templateMeta: normalizeTemplateMeta(
                                    request.templateMeta,
                                    'jobs'
                                ),
                                profile,
                                careerIntel: careerIntelState?.analysisSnapshot ||
                                    null
                            };
                            if (runtimeConfig.jobsUseCareerIntelligence &&
                                runtimeConfig.keywordTerms.length === 0 &&
                                careerIntelState?.analysisSnapshot?.keywordTerms
                                    ?.length) {
                                runtimeConfig.keywordTerms =
                                    careerIntelState.analysisSnapshot.keywordTerms;
                            }
                            launchJobsAssist(runtimeConfig);
                            sendResponse({ status: 'started' });
                        } catch (error) {
                            sendResponse({
                                status: 'blocked',
                                reason: 'unknown'
                            });
                        }
                    }
                );
            }).catch(() => {
                sendResponse({
                    status: 'blocked',
                    reason: 'unknown'
                });
            });
            return true;
        }

        if (request.action === 'ingestPatternProfile') {
            updatePatternMemory(
                request.lang || 'en',
                request.category || 'generic',
                request.patternProfile
            ).then(() => {
                sendResponse({ status: 'ok' });
            }).catch(() => {
                sendResponse({ status: 'error' });
            });
            return true;
        }

        if (request.action === 'stop') {
            if (companyRunState?.active) {
                companyRunState.stopRequested = true;
                if (companyRunState.tabId) {
                    chrome.tabs.sendMessage(
                        companyRunState.tabId,
                        { action: 'stop' },
                        () => {}
                    );
                }
                finalizeCompanyRun({
                    success: false,
                    mode: 'company',
                    message: 'Run canceled by user.',
                    reason: 'stopped-by-user',
                    runStatus: 'canceled',
                    stoppedByUser: true,
                    log: companyRunState.log || [],
                    processedCount:
                        Number(companyRunState.processedCount) || 0,
                    actionCount:
                        Number(companyRunState.actionCount) || 0,
                    skippedCount:
                        Number(companyRunState.skippedCount) || 0
                }, true);
                sendResponse({ status: 'stopping' });
                return true;
            }
            if (activeTabId) {
                chrome.tabs.sendMessage(
                    activeTabId,
                    { action: 'stop' },
                    () => {
                        if (chrome.runtime.lastError) {
                            setActiveTab(null);
                        }
                    }
                );
            }
            sendResponse({ status: 'stopping' });
            return true;
        }

        if (request.action === 'companyStepDone') {
            handleCompanyStepDone(request.result);
            sendResponse({ status: 'received' });
            return true;
        }

        if (request.action === 'progress' &&
            request.error === 'FUSE_LIMIT_EXCEEDED') {
            setActiveTab(null);
            const retryHours = 24;
            chrome.alarms.create('fuseLimitRetry', {
                delayInMinutes: retryHours * 60
            });
            chrome.storage.local.set({
                fuseLimitRetry: {
                    triggeredAt: new Date().toISOString(),
                    retryAt: new Date(
                        Date.now() + retryHours * 3600000
                    ).toISOString()
                }
            });
            createLocalizedNotification(
                'notification.weeklyLimitReached',
                'Weekly invitation limit reached. ' +
                    `Auto-retry scheduled in ${retryHours}h.`,
                [retryHours]
            );
        }

        if (request.action === 'loginRequired') {
            setActiveTab(null);
            createLocalizedNotification(
                'notification.loginRequired',
                'LinkedIn login required. Please log in and restart the automation.'
            );
            sendResponse({ status: 'login_required' });
            return true;
        }

        if (request.action === 'done') {
            if (shouldRetryConnectWithRelaxedQuery(
                request.result,
                connectLaunchState
            )) {
                const relaxedConfig = buildRelaxedConnectConfig(
                    connectLaunchState?.config,
                    normalizeTemplateMeta
                );
                if (relaxedConfig) {
                    const staleTabId = activeTabId;
                    setActiveTab(null);
                    if (staleTabId) {
                        try {
                            chrome.tabs.remove(
                                staleTabId,
                                () => {
                                    if (chrome.runtime.lastError) {
                                        // tab already closed — fine
                                    }
                                }
                            );
                        } catch (err) {
                            // ignore — fire and forget
                        }
                    }
                    launchAutomation(relaxedConfig);
                    return;
                }
            }
            connectLaunchState = null;
            if (companyRunState?.active &&
                request.result?.mode === 'company') {
                handleCompanyStepDone(request.result);
            } else {
                applyRunResult(request.result);
            }
        }

        if (request.action === 'checkAccepted') {
            var checkAcceptedTabId = null;
            var checkAcceptedSettled = false;
            var checkAcceptedLoadTimeout = null;
            var checkAcceptedScriptDelay = null;
            var checkAcceptedListener = null;
            var settleCheckAccepted = (payload) => {
                if (checkAcceptedSettled) return;
                checkAcceptedSettled = true;
                if (checkAcceptedLoadTimeout) {
                    clearTimeout(checkAcceptedLoadTimeout);
                }
                if (checkAcceptedScriptDelay) {
                    clearTimeout(checkAcceptedScriptDelay);
                }
                if (checkAcceptedListener) {
                    chrome.tabs.onUpdated.removeListener(
                        checkAcceptedListener
                    );
                }
                if (checkAcceptedTabId) {
                    chrome.tabs.remove(
                        checkAcceptedTabId,
                        () => {}
                    );
                }
                sendResponse(payload);
            };
            checkAcceptedLoadTimeout = setTimeout(() => {
                settleCheckAccepted({
                    error: 'Failed to check connections'
                });
            }, 20000);
            chrome.tabs.create(
                {
                    url: 'https://www.linkedin.com/' +
                        'mynetwork/invite-connect/' +
                        'connections/',
                    active: false
                },
                (tab) => {
                    if (chrome.runtime.lastError || !tab?.id) {
                        settleCheckAccepted({
                            error: 'Failed to check connections'
                        });
                        return;
                    }
                    checkAcceptedTabId = tab.id;
                    checkAcceptedListener = function listener(
                        tabId,
                        info
                    ) {
                        if (tabId !== tab.id ||
                            info.status !== 'complete') {
                            return;
                        }
                        chrome.tabs.onUpdated
                            .removeListener(listener);

                        checkAcceptedScriptDelay = setTimeout(() => {
                            chrome.scripting
                                .executeScript({
                                    target: {
                                        tabId: tab.id
                                    },
                                    func: () => {
                                        const links =
                                            document
                                                .querySelectorAll(
                                                    'a[href*="/in/"]'
                                                );
                                        const urls = [];
                                        for (const l of links) {
                                            const url = l.href
                                                .split('?')[0];
                                            if (!urls.includes(url)) {
                                                urls.push(url);
                                            }
                                        }
                                        return urls;
                                    }
                                })
                                .then((results) => {
                                    const connUrls =
                                        results?.[0]?.result || [];
                                    chrome.storage.local.get(
                                        'sentProfileUrls',
                                        (data) => {
                                            if (chrome.runtime.lastError) {
                                                settleCheckAccepted({
                                                    error:
                                                        'Failed to ' +
                                                        'check connections'
                                                });
                                                return;
                                            }
                                            const sent = new Set(
                                                data.sentProfileUrls || []
                                            );
                                            const accepted = connUrls
                                                .filter((u) => sent.has(u));
                                            if (accepted.length) {
                                                chrome.storage.local.set({
                                                    acceptedUrls: accepted
                                                });
                                            }
                                            settleCheckAccepted({
                                                accepted
                                            });
                                        }
                                    );
                                })
                                .catch(() => {
                                    settleCheckAccepted({
                                        error:
                                            'Failed to check connections'
                                    });
                                });
                        }, 3000);
                    };
                    chrome.tabs.onUpdated.addListener(
                        checkAcceptedListener
                    );
                }
            );
            return true;
        }

        if (request.action === 'getScheduleInsight') {
            chrome.storage.local.get(
                ['analyticsLog', 'sentProfileUrls',
                    'acceptedUrls'],
                (data) => {
                    const log = data.analyticsLog || [];
                    const stats = typeof computeStats ===
                        'function'
                        ? computeStats(log) : null;
                    const acceptance =
                        typeof computeAcceptanceByHour ===
                            'function'
                            ? computeAcceptanceByHour(
                                log,
                                data.acceptedUrls || []
                            ) : null;
                    const rec =
                        computeScheduleRecommendation(
                            stats, acceptance
                        );
                    sendResponse(rec);
                }
            );
            return true;
        }

        if (request.action === 'setSchedule') {
            chrome.alarms.clear('linkedinSchedule');
            if (request.enabled && request.intervalHours > 0) {
                chrome.alarms.create('linkedinSchedule', {
                    delayInMinutes: request.intervalHours * 60,
                    periodInMinutes: request.intervalHours * 60
                });
            }
            chrome.storage.local.set({
                schedule: {
                    enabled: request.enabled,
                    intervalHours: request.intervalHours,
                    smartMode: request.smartMode || false
                }
            });
            sendResponse({ status: 'scheduled' });
            return true;
        }

        if (request.action === 'setCompanySchedule') {
            chrome.alarms.clear('companySchedule');
            if (request.enabled && request.intervalHours > 0) {
                chrome.alarms.create('companySchedule', {
                    delayInMinutes: request.intervalHours * 60,
                    periodInMinutes: request.intervalHours * 60
                });
            }
            chrome.storage.local.set({
                companySchedule: {
                    enabled: request.enabled,
                    intervalHours: request.intervalHours,
                    batchSize: request.batchSize || 10
                }
            });
            sendResponse({ status: 'scheduled' });
            return true;
        }
    }
);

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'fuseLimitRetry') {
        chrome.storage.local.remove('fuseLimitRetry');
        chrome.storage.local.remove('fuseLimitHit');
        chrome.storage.local.get(
            ['popupState', 'sentProfileUrls'],
            (data) => {
                const migration = migratePopupStateForConnect(
                    data.popupState
                );
                const state = migration.state;
                if (migration.changed) {
                    chrome.storage.local.set({
                        popupState: state
                    });
                }
                if (!state) return;

                const savedQueries =
                    (state.savedQueries || '')
                        .split('\n')
                        .map(q => q.trim())
                        .filter(Boolean);
                const forcedQuery = savedQueries.length > 0
                    ? savedQueries[0]
                    : '';
                const connectRuntime =
                    buildConnectSearchRuntimeFromState(
                        state,
                        forcedQuery
                    );
                const query = connectRuntime.query;
                if (!query) return;

                const networkTypes = [];
                const degree2nd = state.degree2nd !== false;
                const degree3rd = state.degree3rd !== false;
                if (degree2nd) {
                    networkTypes.push('"S"');
                }
                if (degree3rd) {
                    networkTypes.push('"O"');
                }
                const networkFilter =
                    networkTypes.length > 0
                        ? encodeURIComponent(
                            `[${networkTypes.join(',')}]`
                        ) : '';

                const ids = (state.region ||
                    '103644278,101121807,' +
                    '101165590,101282230,102890719')
                    .split(',')
                    .map(id => `"${id.trim()}"`);
                const geoUrn = encodeURIComponent(
                    `[${ids.join(',')}]`
                );

                launchAutomation({
                    query,
                    limit: Math.min(
                        parseInt(state.limit) || 50, 10
                    ),
                    goalMode: state.goalMode || 'passive',
                    areaPreset: connectRuntime.areaPreset,
                    excludedCompanies: parseExcludedCompanyList(
                        state.excludedCompanies
                    ),
                    skipOpenToWorkRecruiters:
                        state.skipOpenToWorkRecruiters
                        !== false,
                    skipJobSeekingSignals:
                        state.skipJobSeekingSignals === true,
                    sendNote: state.sendNote !== false,
                    noteTemplate:
                        state.activeTemplate === 'custom'
                            ? state.customNote
                            : getTemplate(
                                state.activeTemplate,
                                state.lang || 'en',
                                normalizeRuntimeAreaPreset(
                                    state.areaPreset
                                )
                            ),
                    geoUrn,
                    activelyHiring: !!state.activelyHiring,
                    networkFilter,
                    templateMeta:
                        connectRuntime.templateMeta,
                    sentUrls:
                        data.sentProfileUrls || []
                });

                createLocalizedNotification(
                    'notification.quotaRetry',
                    'Quota retry: testing with 10 invites to check if limit reset.'
                );
            }
        );
        return;
    }

    if (alarm.name === 'companySchedule') {
        chrome.storage.local.get(
            ['popupState', 'companySchedule',
                'companyRotationIndex'],
            (data) => {
                const state = data.popupState;
                const schedule = data.companySchedule;
                if (!schedule?.enabled || !state) return;
                checkRateLimit('companyFollow').then((rateStatus) => {
                    if (!rateStatus?.allowed) return;

                    const companyRuntime =
                        buildCompanySearchRuntimeFromState(
                            state
                        );
                    const allCompanies =
                        companyRuntime.targetCompanies;
                    const limit = parseInt(
                        state.limit
                    ) || 50;
                    const companyAreaPreset =
                        companyRuntime.companyAreaPreset;
                    const templateMeta =
                        companyRuntime.templateMeta;

                    if (allCompanies.length > 0) {
                        const templateBatchSize = Math.max(
                            1,
                            parseInt(
                                companyRuntime.filterSpec
                                    ?.batchSize,
                                10
                            ) || 0
                        );
                        const batchSize = Math.max(
                            1,
                            parseInt(schedule.batchSize, 10) ||
                                templateBatchSize ||
                                10
                        );
                        const startIdx =
                            (data.companyRotationIndex || 0)
                            % allCompanies.length;
                        const batch = allCompanies.slice(
                            startIdx, startIdx + batchSize
                        );
                        const nextIdx = startIdx + batch.length;
                        chrome.storage.local.set({
                            companyRotationIndex:
                                nextIdx >= allCompanies.length
                                    ? 0 : nextIdx
                        });

                        launchCompanyFollow({
                            query: companyRuntime.query ||
                                'software technology',
                            limit,
                            companyAreaPreset,
                            targetCompanies: batch,
                            templateMeta,
                            rateRemaining: rateStatus.remaining
                        });

                        createLocalizedNotification(
                            'notification.companyScheduledBatch',
                            `Scheduled company follow: batch of ${batch.length} (${batch[0]}...)`,
                            [batch.length, batch[0]]
                        );
                        return;
                    }

                    const fallbackQuery = String(
                        companyRuntime.query || ''
                    ).trim();
                    if (!fallbackQuery) return;

                    launchCompanyFollow({
                        query: fallbackQuery,
                        limit,
                        companyAreaPreset,
                        targetCompanies: [],
                        templateMeta,
                        rateRemaining: rateStatus.remaining
                    });

                    createLocalizedNotification(
                        'notification.companyScheduledQuery',
                        `Scheduled company follow: query "${fallbackQuery}"`,
                        [fallbackQuery]
                    );
                }).catch(() => {});
            }
        );
        return;
    }

    if (alarm.name !== 'linkedinSchedule') return;

    chrome.storage.local.get(
        [
            'popupState', 'schedule',
            'sentProfileUrls', 'queryRotationIndex',
            'analyticsLog', 'acceptedUrls'
        ],
        (data) => {
            const migration = migratePopupStateForConnect(
                data.popupState
            );
            const state = migration.state;
            if (migration.changed) {
                chrome.storage.local.set({
                    popupState: state
                });
            }
            const schedule = data.schedule;
            if (!schedule?.enabled || !state) return;

            if (schedule.smartMode) {
                const log = data.analyticsLog || [];
                const stats =
                    typeof computeStats === 'function'
                        ? computeStats(log) : null;
                const acceptance =
                    typeof computeAcceptanceByHour ===
                        'function'
                        ? computeAcceptanceByHour(
                            log,
                            data.acceptedUrls || []
                        ) : null;
                const rec = shouldRunNow(
                    stats, acceptance
                );
                if (!rec.recommended) return;
            }

            const savedQueries = (state.savedQueries || '')
                .split('\n')
                .map(q => q.trim())
                .filter(Boolean);

            let forcedQuery = '';
            if (savedQueries.length > 1) {
                const idx = (data.queryRotationIndex || 0)
                    % savedQueries.length;
                forcedQuery = savedQueries[idx];
                chrome.storage.local.set({
                    queryRotationIndex: idx + 1
                });
            } else {
                forcedQuery = savedQueries[0] || '';
            }
            const connectRuntime =
                buildConnectSearchRuntimeFromState(
                    state,
                    forcedQuery
                );
            const query = connectRuntime.query;
            if (!query) return;

            const networkTypes = [];
            const degree2nd = state.degree2nd !== false;
            const degree3rd = state.degree3rd !== false;
            if (degree2nd) {
                networkTypes.push('"S"');
            }
            if (degree3rd) {
                networkTypes.push('"O"');
            }
            const networkFilter = networkTypes.length > 0
                ? encodeURIComponent(
                    `[${networkTypes.join(',')}]`
                ) : '';

            const ids = (state.region ||
                '103644278,101121807,' +
                '101165590,101282230,102890719')
                .split(',').map(id => `"${id.trim()}"`);
            const geoUrn = encodeURIComponent(
                `[${ids.join(',')}]`
            );

            launchAutomation({
                query,
                limit: parseInt(state.limit) || 50,
                goalMode: state.goalMode || 'passive',
                areaPreset: connectRuntime.areaPreset,
                excludedCompanies: parseExcludedCompanyList(
                    state.excludedCompanies
                ),
                skipOpenToWorkRecruiters:
                    state.skipOpenToWorkRecruiters
                    !== false,
                skipJobSeekingSignals:
                    state.skipJobSeekingSignals === true,
                sendNote: state.sendNote !== false,
                noteTemplate: state.activeTemplate === 'custom'
                    ? state.customNote
                    : getTemplate(
                        state.activeTemplate,
                        state.lang || 'en',
                        connectRuntime.areaPreset
                    ),
                geoUrn,
                activelyHiring: !!state.activelyHiring,
                networkFilter,
                templateMeta: connectRuntime.templateMeta,
                sentUrls: data.sentProfileUrls || []
            });
        }
    );
});


function getTemplate(key, lang, areaPreset) {
    if (typeof getConnectTemplates === 'function') {
        const templates = getConnectTemplates(
            normalizeRuntimeAreaPreset(areaPreset),
            lang
        );
        return templates[key] || templates.networking;
    }
    const fallback = {
        networking: "Hi {name}, I came across your profile " +
            "and would like to connect. I value exchanging " +
            "practical insights and staying in touch."
    };
    return fallback[key] || fallback.networking;
}

chrome.runtime.onInstalled.addListener(() => {
    if (typeof sweepStaleDailyKeys === 'function') {
        sweepStaleDailyKeys(chrome.storage.local);
    }
});

chrome.runtime.onStartup.addListener(() => {
    if (typeof sweepStaleDailyKeys === 'function') {
        sweepStaleDailyKeys(chrome.storage.local);
    }
});
