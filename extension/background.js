let activeTabId = null;

importScripts('lib/rate-limiter.js');
importScripts('lib/nurture.js');
importScripts('lib/analytics.js');
importScripts('lib/smart-schedule.js');

async function checkRateLimit(mode) {
    return new Promise(resolve => {
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
    });
}

function notifyError(msg) {
    activeTabId = null;
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'LinkedIn Auto-Connect',
        message: msg
    });
}

function launchAutomation(config) {
    const geoUrn = config.geoUrn
        || '%5B%22103644278%22%2C%22101121807%22' +
           '%2C%22101165590%22%2C%22101282230%22' +
           '%2C%22102890719%22%5D';

    let searchUrl =
        'https://www.linkedin.com/search/results/' +
        'people/' +
        `?geoUrn=${geoUrn}` +
        `&keywords=${encodeURIComponent(config.query)}` +
        '&origin=FACETED_SEARCH';

    if (config.activelyHiring) {
        searchUrl += '&activelyHiring=true';
    }

    if (config.networkFilter) {
        searchUrl += `&network=${config.networkFilter}`;
    }

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
            activeTabId = tab.id;

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
                            'lib/invite-utils.js',
                            'lib/human-behavior.js'
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
                                limit: config.limit,
                                sendNote: config.sendNote,
                                noteTemplate:
                                    config.noteTemplate,
                                sentUrls:
                                    config.sentUrls || [],
                                engagementOnly:
                                    config.engagementOnly
                                    || false
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
    const companies = config.targetCompanies || [];
    const query = config.query || '';
    const searches = companies.length > 0
        ? companies.map(c => c.trim()).filter(Boolean)
        : [query];

    const firstQuery = searches[0] || query;
    let searchUrl =
        'https://www.linkedin.com/search/results/' +
        'companies/' +
        `?keywords=${encodeURIComponent(firstQuery)}` +
        '&origin=FACETED_SEARCH';

    chrome.tabs.create(
        { url: searchUrl, active: true },
        (tab) => {
            if (chrome.runtime.lastError || !tab) {
                notifyError(
                    'Failed to open company search: ' +
                    (chrome.runtime.lastError?.message
                        || 'unknown error')
                );
                return;
            }
            activeTabId = tab.id;
            injectAndStart(tab.id,
                ['lib/feed-utils.js',
                    'lib/company-utils.js',
                    'lib/human-behavior.js',
                    'company-follow.js'],
                'LINKEDIN_COMPANY_FOLLOW_START',
                {
                    ...config,
                    companySearchQueue: searches.slice(1)
                }
            );
        }
    );
}

function launchFeedEngage(config) {
    const feedUrl = 'https://www.linkedin.com/feed/';

    chrome.tabs.create(
        { url: feedUrl, active: true },
        (tab) => {
            if (chrome.runtime.lastError || !tab) {
                notifyError(
                    'Failed to open feed: ' +
                    (chrome.runtime.lastError?.message
                        || 'unknown error')
                );
                return;
            }
            activeTabId = tab.id;
            injectAndStart(tab.id,
                ['lib/feed-utils.js',
                    'lib/human-behavior.js',
                    'feed-engage.js'],
                'LINKEDIN_FEED_ENGAGE_START',
                config
            );
        }
    );
}

function launchNurture(target, config) {
    const url = buildNurtureUrl(target.profileUrl);
    chrome.tabs.create(
        { url, active: true },
        (tab) => {
            if (chrome.runtime.lastError || !tab) {
                notifyError(
                    'Failed to open nurture tab: ' +
                    (chrome.runtime.lastError?.message
                        || 'unknown error')
                );
                return;
            }
            activeTabId = tab.id;
            injectAndStart(tab.id,
                ['lib/feed-utils.js',
                    'lib/human-behavior.js',
                    'feed-engage.js'],
                'LINKEDIN_FEED_ENGAGE_START',
                {
                    ...config,
                    nurtureTarget: target,
                    limit: config.limit || 3
                }
            );
        }
    );
}

function injectAndStart(tabId, scripts, msgType, config) {
    const timeout = setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener);
        notifyError('Tab took too long to load.');
    }, 60000);

    function listener(updatedId, info) {
        if (updatedId !== tabId ||
            info.status !== 'complete') return;
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

    chrome.tabs.onUpdated.addListener(listener);
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

chrome.runtime.onMessage.addListener(
    (request, sender, sendResponse) => {
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
                launchAutomation(request);
                sendResponse({ status: 'started' });
            });
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
                launchCompanyFollow(request);
                sendResponse({ status: 'started' });
            });
            return true;
        }

        if (request.action === 'startFeedEngage') {
            checkRateLimit('feedEngage').then(status => {
                if (!status.allowed) {
                    sendResponse({
                        status: 'blocked',
                        reason: status.reason
                    });
                    return;
                }
                request.rateRemaining = status.remaining;
                launchFeedEngage(request);
                sendResponse({ status: 'started' });
            });
            return true;
        }

        if (request.action === 'stop') {
            if (activeTabId) {
                chrome.tabs.sendMessage(
                    activeTabId,
                    { action: 'stop' },
                    () => {
                        if (chrome.runtime.lastError) {
                            activeTabId = null;
                        }
                    }
                );
            }
            sendResponse({ status: 'stopping' });
            return true;
        }

        if (request.action === 'progress' &&
            request.error === 'FUSE_LIMIT_EXCEEDED') {
            activeTabId = null;
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
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon128.png',
                title: 'LinkedIn Auto-Connect',
                message:
                    'Weekly invitation limit reached. ' +
                    `Auto-retry scheduled in ${retryHours}h.`
            });
        }

        if (request.action === 'loginRequired') {
            activeTabId = null;
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon128.png',
                title: 'LinkedIn Auto-Connect',
                message:
                    'LinkedIn login required. Please ' +
                    'log in and restart the automation.'
            });
            sendResponse({ status: 'login_required' });
            return true;
        }

        if (request.action === 'nurtureEngaged') {
            if (request.profileUrl) {
                recordNurtureEngagement(
                    request.profileUrl,
                    chrome.storage.local
                );
            }
            sendResponse({ status: 'ok' });
            return true;
        }

        if (request.action === 'done') {
            activeTabId = null;
            const r = request.result;
            const logCount = (r?.log || []).filter(
                e => !e.status?.startsWith('skipped')
            ).length;
            if (logCount > 0 && r?.mode) {
                const rateMode = r.mode === 'company'
                    ? 'companyFollow'
                    : r.mode === 'feed'
                        ? 'feedEngage' : 'connect';
                for (let i = 0; i < logCount; i++) {
                    incrementCount(
                        rateMode, chrome.storage.local
                    );
                }
            }
            cleanupOldKeys(chrome.storage.local);
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon128.png',
                title: 'LinkedIn Engage',
                message: r?.success
                    ? r.message || 'Automation complete.'
                    : 'Stopped: ' + (r?.error || 'Unknown')
            });
            if (r?.log?.length && r?.mode) {
                const key = r.mode === 'company'
                    ? 'companyFollowHistory'
                    : r.mode === 'feed'
                        ? 'feedEngageHistory'
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
        }

        if (request.action === 'checkAccepted') {
            chrome.tabs.create(
                {
                    url: 'https://www.linkedin.com/' +
                        'mynetwork/invite-connect/' +
                        'connections/',
                    active: false
                },
                (tab) => {
                    chrome.tabs.onUpdated.addListener(
                        function listener(tabId, info) {
                            if (tabId !== tab.id ||
                                info.status !== 'complete') {
                                return;
                            }
                            chrome.tabs.onUpdated
                                .removeListener(listener);

                            setTimeout(() => {
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
                                            for (const l
                                                of links) {
                                                const url =
                                                    l.href
                                                        .split(
                                                            '?'
                                                        )[0];
                                                if (!urls
                                                    .includes(
                                                        url
                                                    )) {
                                                    urls.push(
                                                        url
                                                    );
                                                }
                                            }
                                            return urls;
                                        }
                                    })
                                    .then((results) => {
                                        const connUrls =
                                            results?.[0]
                                                ?.result || [];
                                        chrome.tabs.remove(
                                            tab.id
                                        );
                                        chrome.storage.local
                                            .get(
                                                'sentProfileUrls',
                                                (data) => {
                                                    const sent =
                                                        new Set(
                                                            data
                                                                .sentProfileUrls ||
                                                                []
                                                        );
                                                    const accepted =
                                                        connUrls
                                                            .filter(
                                                                (u) =>
                                                                    sent
                                                                        .has(
                                                                            u
                                                                        )
                                                            );
                                                    if (accepted
                                                        .length) {
                                                        chrome
                                                            .storage
                                                            .local
                                                            .set({
                                                                acceptedUrls:
                                                                    accepted
                                                            });
                                                    }
                                                    sendResponse({
                                                        accepted
                                                    });
                                                }
                                            );
                                    })
                                    .catch(() => {
                                        chrome.tabs.remove(
                                            tab.id
                                        );
                                        sendResponse({
                                            error:
                                                'Failed to ' +
                                                'check connections'
                                        });
                                    });
                            }, 3000);
                        }
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

        if (request.action === 'setFeedSchedule') {
            chrome.alarms.clear('feedSchedule');
            if (request.enabled && request.intervalHours > 0) {
                chrome.alarms.create('feedSchedule', {
                    delayInMinutes: request.intervalHours * 60,
                    periodInMinutes: request.intervalHours * 60
                });
            }
            chrome.storage.local.set({
                feedSchedule: {
                    enabled: request.enabled,
                    intervalHours: request.intervalHours
                }
            });
            sendResponse({ status: 'scheduled' });
            return true;
        }

        if (request.action === 'setNurtureSchedule') {
            chrome.alarms.clear('nurtureSchedule');
            if (request.enabled &&
                request.intervalHours > 0) {
                chrome.alarms.create('nurtureSchedule', {
                    delayInMinutes:
                        request.intervalHours * 60,
                    periodInMinutes:
                        request.intervalHours * 60
                });
            }
            chrome.storage.local.set({
                nurtureSchedule: {
                    enabled: request.enabled,
                    intervalHours: request.intervalHours,
                    limit: request.limit || 3
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
                const state = data.popupState;
                if (!state) return;

                const savedQueries =
                    (state.savedQueries || '')
                        .split('\n')
                        .map(q => q.trim())
                        .filter(Boolean);
                const query = savedQueries.length > 0
                    ? savedQueries[0]
                    : buildQueryFromTags(state);
                if (!query) return;

                const networkTypes = [];
                if (state.degree2nd !== false) {
                    networkTypes.push('"S"');
                }
                if (state.degree3rd !== false) {
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
                    sendNote: state.sendNote !== false,
                    noteTemplate:
                        state.activeTemplate === 'custom'
                            ? state.customNote
                            : getTemplate(
                                state.activeTemplate,
                                state.lang || 'en'
                            ),
                    geoUrn,
                    activelyHiring:
                        state.activelyHiring || false,
                    networkFilter,
                    sentUrls:
                        data.sentProfileUrls || []
                });

                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icons/icon128.png',
                    title: 'LinkedIn Auto-Connect',
                    message:
                        'Quota retry: testing with 10 ' +
                        'invites to check if limit reset.'
                });
            }
        );
        return;
    }

    if (alarm.name === 'feedSchedule') {
        chrome.storage.local.get(
            ['popupState', 'feedSchedule'],
            (data) => {
                const state = data.popupState;
                const schedule = data.feedSchedule;
                if (!schedule?.enabled || !state) return;

                const limit = parseInt(
                    state.limit
                ) || 20;
                const react = state.feedReact !== false;
                const comment = state.feedComment || false;

                const rawTemplates =
                    (state.commentTemplates || '').trim();
                const commentTemplates = rawTemplates
                    ? rawTemplates.split('\n')
                        .map(s => s.trim())
                        .filter(Boolean)
                    : [];
                const rawSkip =
                    (state.skipKeywords || '').trim();
                const skipKeywords = rawSkip
                    ? rawSkip.split('\n')
                        .map(s => s.trim())
                        .filter(Boolean)
                    : [];

                launchFeedEngage({
                    limit,
                    react,
                    comment,
                    commentTemplates,
                    skipKeywords
                });

                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icons/icon128.png',
                    title: 'LinkedIn Auto-Connect',
                    message:
                        `Scheduled feed engagement: ` +
                        `${limit} posts` +
                        (comment ? ' (react+comment)'
                            : ' (react only)')
                });
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

                const raw = state.targetCompanies || '';
                const allCompanies = raw
                    .split('\n')
                    .map(s => s.trim())
                    .filter(Boolean);
                if (!allCompanies.length) return;

                const batchSize =
                    schedule.batchSize || 10;
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

                const limit = parseInt(
                    state.limit
                ) || 50;

                launchCompanyFollow({
                    query: state.companyQuery
                        || 'software technology',
                    limit,
                    targetCompanies: batch
                });

                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icons/icon128.png',
                    title: 'LinkedIn Auto-Connect',
                    message:
                        `Scheduled company follow: ` +
                        `batch of ${batch.length} ` +
                        `(${batch[0]}...)`
                });
            }
        );
        return;
    }

    if (alarm.name === 'nurtureSchedule') {
        chrome.storage.local.get(
            ['nurtureSchedule', 'nurtureList'],
            (data) => {
                const schedule = data.nurtureSchedule;
                if (!schedule?.enabled) return;

                const list = data.nurtureList || [];
                const targets =
                    getActiveNurtureTargets(list);
                if (!targets.length) return;

                const target = targets[
                    Math.floor(
                        Math.random() * targets.length
                    )
                ];

                launchNurture(target, {
                    limit: schedule.limit || 3,
                    react: true,
                    comment: false,
                    commentTemplates: [],
                    skipKeywords: []
                });

                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icons/icon128.png',
                    title: 'LinkedIn Engage',
                    message:
                        `Nurturing ${target.name}: ` +
                        `engaging with recent posts`
                });
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
            const state = data.popupState;
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

            let query;
            if (savedQueries.length > 1) {
                const idx = (data.queryRotationIndex || 0)
                    % savedQueries.length;
                query = savedQueries[idx];
                chrome.storage.local.set({
                    queryRotationIndex: idx + 1
                });
            } else {
                query = buildQueryFromTags(state);
            }
            if (!query) return;

            const networkTypes = [];
            if (state.degree2nd !== false) {
                networkTypes.push('"S"');
            }
            if (state.degree3rd !== false) {
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
                sendNote: state.sendNote !== false,
                noteTemplate: state.activeTemplate === 'custom'
                    ? state.customNote
                    : getTemplate(
                        state.activeTemplate,
                        state.lang || 'en'
                    ),
                geoUrn,
                activelyHiring: state.activelyHiring || false,
                networkFilter,
                sentUrls: data.sentProfileUrls || []
            });
        }
    );
});

function buildQueryFromTags(state) {
    if (state.useCustomQuery && state.customQuery) {
        return state.customQuery;
    }
    const tags = state.tags || {};
    const parts = [];
    const roles = tags.role || [];
    if (roles.length === 1) {
        parts.push(roles[0]);
    } else if (roles.length > 1) {
        parts.push(roles.join(' OR '));
    }
    for (const g of ['industry', 'market', 'level']) {
        for (const term of (tags[g] || [])) {
            parts.push(term);
        }
    }
    return parts.join(' ');
}

function getTemplate(key, lang) {
    const en = {
        senior: "Hi {name}, I'm a senior software engineer " +
            "with experience in scalable full-stack systems " +
            "and cloud infrastructure. Always looking to " +
            "connect with great people in the industry. " +
            "Let's stay in touch!",
        mid: "Hi {name}, I'm a software engineer with a " +
            "few years of experience building web " +
            "applications and APIs. I'm always open to " +
            "learning about new opportunities. " +
            "Would love to connect!",
        junior: "Hi {name}, I'm a software developer early " +
            "in my career, eager to grow and learn from " +
            "experienced professionals. I'd love to " +
            "connect and stay in touch!",
        lead: "Hi {name}, I'm an engineering lead with " +
            "experience driving technical strategy and " +
            "mentoring teams. I enjoy connecting with " +
            "people shaping the tech hiring landscape. " +
            "Happy to connect!",
        networking: "Hi {name}, I came across your profile " +
            "and thought it'd be great to connect. " +
            "I'm always looking to expand my professional " +
            "network. Looking forward to staying in touch!"
    };
    const pt = {
        senior: "Olá {name}, sou engenheiro de software " +
            "sênior com experiência em sistemas " +
            "full-stack escaláveis e infraestrutura " +
            "cloud. Sempre bom conectar com " +
            "profissionais da área. Vamos manter contato!",
        mid: "Olá {name}, sou engenheiro de software com " +
            "alguns anos de experiência em aplicações " +
            "web e APIs. Estou sempre aberto a novas " +
            "oportunidades. Vamos conectar!",
        junior: "Olá {name}, sou desenvolvedor no início " +
            "de carreira, com muita vontade de crescer " +
            "e aprender com profissionais experientes. " +
            "Adoraria conectar e manter contato!",
        lead: "Olá {name}, sou tech lead com experiência " +
            "em estratégia técnica e mentoria de times. " +
            "Gosto de conectar com pessoas que fazem a " +
            "diferença no mercado de tecnologia. " +
            "Vamos conectar!",
        networking: "Olá {name}, vi seu perfil e achei que " +
            "seria ótimo conectar. Estou sempre buscando " +
            "expandir minha rede profissional. " +
            "Vamos manter contato!"
    };
    const templates = lang === 'pt' ? pt : en;
    return templates[key] || templates.networking;
}

chrome.runtime.onInstalled.addListener(() => {
    cleanExpiredNurtures(chrome.storage.local);
});

chrome.runtime.onStartup.addListener(() => {
    cleanExpiredNurtures(chrome.storage.local);
});
