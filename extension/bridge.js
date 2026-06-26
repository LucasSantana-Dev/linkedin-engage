// Serializes concurrent get→set pairs for the same storage key to prevent
// a later get from reading stale data before an earlier set completes.
const _storageWriteQueue = {};
function serializedStorageUpdate(key, urns, maxSize) {
    const prev = _storageWriteQueue[key] || Promise.resolve();
    _storageWriteQueue[key] = prev.then(
        () => new Promise(resolve => {
            chrome.storage.local.get(key, (data) => {
                const existing = data[key] || [];
                const merged = [...new Set([...existing, ...urns])];
                chrome.storage.local.set(
                    { [key]: merged.slice(-maxSize) },
                    resolve
                );
            });
        })
    );
}

function safeSend(payload) {
    try {
        const ret = chrome.runtime.sendMessage(payload);
        if (ret && typeof ret.catch === 'function') {
            ret.catch(() => {
                // popup/background closed before response — expected
            });
        }
    } catch (err) {
        // chrome.runtime gone (extension reload) — swallow
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'runAutomation') {
        window.postMessage({
            type: 'LINKEDIN_BOT_START',
            config: request
        }, '*');
        sendResponse({ status: 'started' });
        return;
    }
    if (request.action === 'runCustom') {
        window.postMessage({
            type: request.msgType,
            config: request.config
        }, '*');
        sendResponse({ status: 'started' });
        return;
    }
    if (request.action === 'stop') {
        window.postMessage({
            type: 'LINKEDIN_BOT_STOP'
        }, '*');
        sendResponse({ status: 'stopping' });
        return;
    }
});

window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data?.type === 'LINKEDIN_BOT_DONE') {
        safeSend({
            action: 'done',
            result: event.data.result
        });
    }
    if (event.data?.type ===
        'LINKEDIN_BOT_COMPANY_STEP_DONE') {
        safeSend({
            action: 'companyStepDone',
            result: event.data.result
        });
    }
    if (event.data?.type === 'LINKEDIN_BOT_SET_FUSE_LIMIT') {
        chrome.storage.local.set({
            fuseLimitHit: {
                hit: true,
                at: new Date().toISOString()
            }
        });
    }
    if (event.data?.type === 'LINKEDIN_BOT_CHECK_FUSE_LIMIT') {
        chrome.storage.local.get('fuseLimitHit', (data) => {
            window.postMessage({
                type: 'LINKEDIN_BOT_FUSE_LIMIT_STATUS',
                hit: !!data.fuseLimitHit?.hit
            }, '*');
        });
    }
    if (event.data?.type === 'LINKEDIN_BOT_SAVE_ENGAGED') {
        serializedStorageUpdate(
            'engagedPostUrns',
            event.data.urns || [],
            2000
        );
    }
    if (event.data?.type === 'LINKEDIN_BOT_LOAD_ENGAGED') {
        chrome.storage.local.get('engagedPostUrns', (data) => {
            window.postMessage({
                type: 'LINKEDIN_BOT_ENGAGED_LOADED',
                urns: data.engagedPostUrns || []
            }, '*');
        });
    }
    if (event.data?.type === 'LINKEDIN_BOT_SAVE_COMMENTED') {
        serializedStorageUpdate(
            'commentedPostUrns',
            event.data.urns || [],
            1000
        );
    }
    if (event.data?.type === 'LINKEDIN_BOT_LOAD_COMMENTED') {
        chrome.storage.local.get('commentedPostUrns', (data) => {
            window.postMessage({
                type: 'LINKEDIN_BOT_COMMENTED_LOADED',
                urns: data.commentedPostUrns || []
            }, '*');
        });
    }
    if (event.data?.type === 'LINKEDIN_BOT_LOGIN_REQUIRED') {
        safeSend({
            action: 'loginRequired'
        });
    }
    if (event.data?.type === 'LINKEDIN_BOT_ANALYTICS') {
        chrome.storage.local.get('analyticsLog', (data) => {
            const log = data.analyticsLog || [];
            log.push({
                ...event.data.entry,
                timestamp: new Date().toISOString()
            });
            chrome.storage.local.set({
                analyticsLog: log.slice(-5000)
            });
        });
    }
    if (event.data?.type === 'LINKEDIN_BOT_PROGRESS') {
        safeSend({
            action: 'progress',
            sent: event.data.sent,
            limit: event.data.limit,
            page: event.data.page,
            skipped: event.data.skipped,
            error: event.data.error || null
        });
    }
});
