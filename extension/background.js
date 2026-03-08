let activeTabId = null;

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
                                    config.sentUrls || []
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

chrome.runtime.onMessage.addListener(
    (request, sender, sendResponse) => {
        if (request.action === 'start') {
            launchAutomation(request);
            sendResponse({ status: 'started' });
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

        if (request.action === 'done') {
            activeTabId = null;
            const r = request.result;
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon128.png',
                title: 'LinkedIn Auto-Connect',
                message: r?.success
                    ? r.message || 'Automation complete.'
                    : 'Stopped: ' + (r?.error || 'Unknown')
            });
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
                    intervalHours: request.intervalHours
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

    if (alarm.name !== 'linkedinSchedule') return;

    chrome.storage.local.get(
        [
            'popupState', 'schedule',
            'sentProfileUrls', 'queryRotationIndex'
        ],
        (data) => {
            const state = data.popupState;
            const schedule = data.schedule;
            if (!schedule?.enabled || !state) return;

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
