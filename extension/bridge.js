chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'runAutomation') {
        window.postMessage({
            type: 'LINKEDIN_BOT_START',
            config: request
        }, '*');
        sendResponse({ status: 'started' });
        return true;
    }
    if (request.action === 'runCustom') {
        window.postMessage({
            type: request.msgType,
            config: request.config
        }, '*');
        sendResponse({ status: 'started' });
        return true;
    }
    if (request.action === 'stop') {
        window.postMessage({
            type: 'LINKEDIN_BOT_STOP'
        }, '*');
        sendResponse({ status: 'stopping' });
        return true;
    }
});

window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data?.type === 'LINKEDIN_BOT_DONE') {
        chrome.runtime.sendMessage({
            action: 'done',
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
        chrome.storage.local.get('engagedPostUrns', (data) => {
            const existing = data.engagedPostUrns || [];
            const merged = [...new Set([
                ...existing,
                ...(event.data.urns || [])
            ])];
            const trimmed = merged.slice(-2000);
            chrome.storage.local.set({
                engagedPostUrns: trimmed
            });
        });
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
        chrome.storage.local.get('commentedPostUrns', (data) => {
            const existing = data.commentedPostUrns || [];
            const merged = [...new Set([
                ...existing,
                ...(event.data.urns || [])
            ])];
            const trimmed = merged.slice(-1000);
            chrome.storage.local.set({
                commentedPostUrns: trimmed
            });
        });
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
        chrome.runtime.sendMessage({
            action: 'loginRequired'
        });
    }
    if (event.data?.type === 'LINKEDIN_BOT_NURTURE_ADD') {
        chrome.storage.local.get('nurtureList', (data) => {
            const list = data.nurtureList || [];
            const url = event.data.profileUrl;
            if (!url) return;
            const exists = list.some(
                p => p.profileUrl === url
            );
            if (exists) return;
            list.push({
                profileUrl: url,
                name: event.data.name || 'Unknown',
                addedAt: new Date().toISOString(),
                engagements: 0,
                lastEngaged: null
            });
            chrome.storage.local.set({
                nurtureList: list.slice(-50)
            });
        });
    }
    if (event.data?.type === 'LINKEDIN_BOT_NURTURE_ENGAGED') {
        chrome.runtime.sendMessage({
            action: 'nurtureEngaged',
            profileUrl: event.data.profileUrl
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
    if (event.data?.type === 'LINKEDIN_BOT_AI_COMMENT') {
        chrome.runtime.sendMessage({
            action: 'generateAIComment',
            postText: event.data.postText,
            existingComments: event.data.existingComments,
            author: event.data.author,
            authorTitle: event.data.authorTitle,
            lang: event.data.lang,
            category: event.data.category,
            reactions: event.data.reactions,
            reactionSummary: event.data.reactionSummary,
            commentThreadSummary:
                event.data.commentThreadSummary,
            imageSignals: event.data.imageSignals,
            patternProfile: event.data.patternProfile,
            apiKey: event.data.apiKey,
            goalMode: event.data.goalMode
        }, (response) => {
            window.postMessage({
                type: 'LINKEDIN_BOT_AI_COMMENT_RESULT',
                comment: response?.comment || null,
                reason: response?.reason || null,
                requestId: event.data.requestId
            }, '*');
        });
    }
    if (event.data?.type === 'LINKEDIN_BOT_PATTERN_LEARN') {
        chrome.runtime.sendMessage({
            action: 'ingestPatternProfile',
            lang: event.data.lang,
            category: event.data.category,
            patternProfile: event.data.patternProfile,
            runMeta: event.data.runMeta || null
        }, () => {});
    }
    if (event.data?.type === 'LINKEDIN_BOT_PROGRESS') {
        chrome.runtime.sendMessage({
            action: 'progress',
            sent: event.data.sent,
            limit: event.data.limit,
            page: event.data.page,
            skipped: event.data.skipped,
            error: event.data.error || null
        });
    }
});
