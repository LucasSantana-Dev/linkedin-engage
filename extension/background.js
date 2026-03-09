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
        title: 'LinkedIn Engage',
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

    const netFilter = config.networkFilter
        || encodeURIComponent('["S","O"]');
    searchUrl += `&network=${netFilter}`;

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
                                geoUrn: config.geoUrn,
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
                ['lib/templates.js',
                    'lib/feed-utils.js',
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
                ['lib/templates.js',
                    'lib/feed-utils.js',
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
                ['lib/templates.js',
                    'lib/feed-utils.js',
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

function formatReactionContext(reactions) {
    if (!reactions || typeof reactions !== 'object') {
        return '';
    }
    var parts = [];
    if (reactions.ENTERTAINMENT)
        parts.push(reactions.ENTERTAINMENT + ' Funny');
    if (reactions.PRAISE)
        parts.push(reactions.PRAISE + ' Celebrate');
    if (reactions.EMPATHY)
        parts.push(reactions.EMPATHY + ' Support');
    if (reactions.INTEREST)
        parts.push(reactions.INTEREST + ' Insightful');
    if (reactions.APPRECIATION)
        parts.push(reactions.APPRECIATION + ' Love');
    if (reactions.LIKE)
        parts.push(reactions.LIKE + ' Like');
    if (parts.length === 0) return '';
    return '\nReactions: ' + parts.join(', ');
}

function inferAuthorRoleTone(authorTitle) {
    var title = (authorTitle || '').toLowerCase();
    if (!title) return '';
    if (/recruit|talent|hr|people ops/.test(title)) {
        return 'career and people-focused';
    }
    if (/founder|ceo|coo|cfo|director|head of|vp/.test(title)) {
        return 'strategic and leadership-focused';
    }
    if (/engineer|developer|architect|devops|data|cto/.test(title)) {
        return 'technical peer-to-peer';
    }
    if (/product|designer|ux|ui/.test(title)) {
        return 'product and execution-focused';
    }
    return 'professional and practical';
}

function formatThreadStyleContext(commentThreadSummary) {
    if (!commentThreadSummary ||
        !commentThreadSummary.count) {
        return '';
    }
    var openers = commentThreadSummary.commonOpeners;
    var openerText = Array.isArray(openers) &&
        openers.length
        ? '\nCommon openings: ' +
            openers.slice(0, 2).join(' | ')
        : '';
    return '\nComment thread style:' +
        '\n- dominant tone: ' +
            commentThreadSummary.styleHint +
        '\n- dominant sentiment: ' +
            commentThreadSummary.dominantSentiment +
        '\n- length style: ' +
            commentThreadSummary.brevity +
        '\n- energy: ' +
            commentThreadSummary.energy +
        openerText;
}

function formatThreadTopicContext(commentThreadSummary) {
    if (!commentThreadSummary ||
        !commentThreadSummary.count) {
        return '';
    }
    var keywords = Array.isArray(
        commentThreadSummary.keywords
    ) ? commentThreadSummary.keywords.slice(0, 6) : [];
    var phrases = Array.isArray(
        commentThreadSummary.samplePhrases
    ) ? commentThreadSummary.samplePhrases.slice(0, 2) : [];
    var keywordCtx = keywords.length
        ? '\nThread keywords: ' + keywords.join(', ')
        : '';
    var phraseCtx = phrases.length
        ? '\nThread phrase samples: ' +
            phrases.join(' | ')
        : '';
    return keywordCtx + phraseCtx;
}

function formatImageContext(imageSignals) {
    if (!imageSignals || !imageSignals.hasImage) {
        return '';
    }
    var cues = Array.isArray(imageSignals.cues)
        ? imageSignals.cues : [];
    var samples = Array.isArray(imageSignals.samples)
        ? imageSignals.samples : [];
    var cueText = cues.length
        ? '\nImage cues: ' + cues.join(', ')
        : '';
    var sampleText = samples.length
        ? '\nImage text hints: ' +
            samples.slice(0, 2).join(' | ')
        : '';
    return '\nVisual context: post has image(s).' +
        cueText + sampleText;
}

function formatEngagementContext(reactionSummary) {
    if (!reactionSummary ||
        !reactionSummary.total) {
        return '';
    }
    return '\nEngagement context:' +
        '\n- total reactions: ' + reactionSummary.total +
        '\n- dominant reaction: ' +
            (reactionSummary.dominant || 'LIKE') +
        '\n- intensity: ' +
            (reactionSummary.intensity || 'low');
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
        category !== 'achievement' &&
        category !== 'newjob' &&
        category !== 'critique';
    var questionRule = allowQuestion
        ? '\n- A short question is allowed if it' +
            ' mirrors the thread style.'
        : '\n- Prefer statements over questions.';
    var energyRule = commentThreadSummary.energy === 'high'
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

function isContextGroundedComment(
    comment, postText, existingComments, commentThreadSummary
) {
    var commentTokens = tokenizeGroundingText(comment);
    if (commentTokens.length === 0) return false;
    var contextTokens = buildContextTokenSet(
        postText, existingComments, commentThreadSummary
    );
    if (contextTokens.size === 0) return true;
    var overlap = 0;
    for (var token of commentTokens) {
        if (contextTokens.has(token)) overlap++;
    }
    var ratio = overlap / commentTokens.length;
    var minRatio = existingComments?.length >= 2
        ? 0.22 : 0.12;
    return ratio >= minRatio;
}

async function generateAIComment(data) {
    const { postText, existingComments, author,
        authorTitle, lang, category, reactions,
        reactionSummary, commentThreadSummary,
        imageSignals, apiKey } = data;
    if (!apiKey) return null;

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

    const commentsCtx = existingComments?.length
        ? '\n\nOther comments on this post:\n' +
            existingComments.slice(0, 5).map(
                c => '- ' + (c.author || '') + ': ' +
                    c.text
            ).join('\n')
        : '';

    const cat = category || 'generic';
    var toneGuide = '';
    if (cat === 'humor') {
        toneGuide =
            '\nTone: HUMOROUS post.' +
            ' Play along with the joke.' +
            ' Be witty or add a related joke.' +
            ' Keep it light and fun.' +
            ' Do NOT respond seriously to a joke.';
    } else if (cat === 'achievement' ||
        cat === 'career' || cat === 'newjob') {
        toneGuide =
            '\nTone: ACHIEVEMENT post.' +
            ' Start with a brief congrats and add' +
            ' one short human follow-up linked to' +
            ' the post theme.' +
            ' Keep it concise and specific.';
    } else if (cat === 'critique') {
        toneGuide =
            '\nTone: OPINION post.' +
            ' Acknowledge neutrally.' +
            ' Do NOT take sides or debate.';
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

    const prompt =
        'You are commenting on a LinkedIn post.' +
        ' Write a comment that shows you READ' +
        ' and UNDERSTOOD the post.' +
        toneGuide +
        '\n\nRules:' +
        langRule +
        humanVoiceRules +
        '\n- Max 120 chars, 1-2 sentences' +
        '\n- Show you understood what the post' +
        ' is about' +
        '\n- Look at the other comments below for' +
        ' tone and style reference — write' +
        ' something similar in length and vibe' +
        '\n- Mirror the dominant thread style' +
        ' (tone, energy, and length) but use' +
        ' original wording' +
        '\n- Use the thread keywords/phrases as the' +
        ' main base for your comment when present' +
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
        '\n- NEVER be ironic, sarcastic, offensive' +
        ', polemic, or dismissive' +
        '\n- NEVER create discussion or controversy' +
        '\n- Be SAFE: if unsure, output "SKIP"' +
        '\n- Don\'t repeat what others said' +
        '\n\n' + authorCtx +
        ':\n' + (postText || '').substring(0, 800) +
        reactionCtx +
        engagementCtx +
        imageCtx +
        threadStyleCtx +
        threadTopicCtx +
        commentsCtx +
        '\n\nYour comment (raw text, no quotes,' +
        ' or "SKIP" if no good comment):';

    var result = null;

    try {
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
                        content: prompt
                    }],
                    max_tokens: 110,
                    temperature: 0.85
                })
            }
        );
        if (!resp.ok) {
            console.log(
                '[LinkedIn Bot] AI API error: ' +
                resp.status
            );
            return null;
        }
        const json = await resp.json();
        let comment = json.choices?.[0]
            ?.message?.content?.trim();
        if (!comment) return null;
        comment = comment
            .replace(/^["']|["']$/g, '')
            .replace(/^Comment:\s*/i, '')
            .trim();
        if (/\?\s*$/.test(comment)) {
            console.log(
                '[LinkedIn Bot] AI generated a ' +
                'question, skipping: "' +
                comment.substring(0, 60) + '"'
            );
            return null;
        }
        if (/^skip$/i.test(comment)) {
            console.log(
                '[LinkedIn Bot] AI chose to SKIP'
            );
            return null;
        }
        if (comment.length < 5 ||
            comment.length > 300) {
            return null;
        }
        if (!isContextGroundedComment(
            comment,
            postText,
            existingComments,
            commentThreadSummary
        )) {
            console.log(
                '[LinkedIn Bot] AI comment not grounded' +
                ' in thread context'
            );
            return null;
        }
        return comment;
    } catch (e) {
        console.log(
            '[LinkedIn Bot] AI error: ' + e.message
        );
        return null;
    }
}

chrome.runtime.onMessage.addListener(
    (request, sender, sendResponse) => {
        if (request.action === 'generateAIComment') {
            generateAIComment(request).then(
                comment => sendResponse({ comment })
            ).catch(() => sendResponse({
                comment: null
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
                title: 'LinkedIn Engage',
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
                title: 'LinkedIn Engage',
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
                    title: 'LinkedIn Engage',
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
                    title: 'LinkedIn Engage',
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
                    title: 'LinkedIn Engage',
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
