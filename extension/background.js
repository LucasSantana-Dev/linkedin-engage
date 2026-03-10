let activeTabId = null;

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
importScripts('lib/nurture.js');
importScripts('lib/analytics.js');
importScripts('lib/smart-schedule.js');
importScripts('lib/pattern-memory.js');

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
                                goalMode:
                                    config.goalMode || 'passive',
                                myCompany:
                                    config.myCompany || '',
                                skipOpenToWorkRecruiters:
                                    config
                                        .skipOpenToWorkRecruiters
                                    !== false,
                                skipJobSeekingSignals:
                                    config
                                        .skipJobSeekingSignals
                                    === true,
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

function formatPatternProfileContext(patternProfile, guidance) {
    if (!patternProfile) return '';
    var openers = Array.isArray(guidance?.preferredOpeners)
        ? guidance.preferredOpeners.slice(0, 3) : [];
    var ngrams = Array.isArray(guidance?.topNgrams)
        ? guidance.topNgrams.slice(0, 8) : [];
    var openerCtx = openers.length
        ? '\n- preferred openers: ' + openers.join(' | ')
        : '';
    var ngramCtx = ngrams.length
        ? '\n- thread phrase atoms: ' + ngrams.join(', ')
        : '';
    return '\n\nTHREAD PATTERN PROFILE (primary):' +
        '\n- confidence: ' +
            Number(patternProfile.patternConfidence || 0) +
        '\n- style family: ' +
            (guidance?.styleFamily || 'neutral-ack') +
        '\n- length band: ' +
            (guidance?.lengthBand || 'short') +
        '\n- tone intensity: ' +
            (guidance?.toneIntensity || 'low') +
        '\n- punctuation rhythm: ' +
            (guidance?.punctuationRhythm || 'balanced') +
        openerCtx +
        ngramCtx;
}

function formatLearnedPatternContext(bucket, guidance) {
    if (!bucket) return '';
    var openers = Array.isArray(guidance?.preferredOpeners)
        ? guidance.preferredOpeners.slice(0, 2) : [];
    var ngrams = Array.isArray(guidance?.topNgrams)
        ? guidance.topNgrams.slice(0, 6) : [];
    var openerCtx = openers.length
        ? '\n- learned openers: ' + openers.join(' | ')
        : '';
    var ngramCtx = ngrams.length
        ? '\n- learned n-grams: ' + ngrams.join(', ')
        : '';
    return '\n\nLEARNED MEMORY GUIDANCE (secondary):' +
        '\n- bucket confidence: ' +
            Number(bucket.confidenceEma || 0) +
        '\n- preferred style family: ' +
            (guidance?.styleFamily || 'neutral-ack') +
        '\n- preferred length: ' +
            (guidance?.lengthBand || 'short') +
        openerCtx +
        ngramCtx;
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

function normalizeCompareText(text) {
    return (text || '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
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

    var ironyRe = /\b(obviously|clearly|duh|yeah right|sure buddy|good luck with that|as if|lol sure|ironic|sarcasm|sarcastic|imagina|claro que n[aã]o)\b/i;
    if (ironyRe.test(lower)) return false;

    var polemicRe = /\b(garbage|trash|fraud|scam|ridiculous|nonsense|idiota|rid[ií]culo|absurdo|boicot|boycott|cancel culture|shut up|cala a boca)\b/i;
    if (polemicRe.test(lower)) return false;

    var discussionRe = /\b(let me know|what do you think|thoughts|agree\?|discorda|debate|discuss|dm me|reach out)\b/i;
    if (discussionRe.test(lower)) return false;

    var celebrationRe =
        /\b(congrats|congratulations|parab[eé]ns|well deserved|muito merecido)\b/i;
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
        goalMode, patternProfile } = data;
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
    if (patternGuidance.lowSignal) {
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
    var toneGuide = '';
    if (cat === 'humor') {
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
                    max_tokens: 90,
                    temperature: 0.55
                })
            }
        );
        if (!resp.ok) {
            console.log(
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
            console.log(
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
            console.log(
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
            console.log(
                '[LinkedIn Bot] AI comment not grounded' +
                ' in thread context'
            );
            return {
                comment: null,
                reason: 'skip-context-mismatch'
            };
        }
        if (!validateCommentSafety(comment, {
            category: cat,
            postText,
            imageSignals
        })) {
            console.log(
                '[LinkedIn Bot] AI comment rejected by' +
                ' safety guard'
            );
            return {
                comment: null,
                reason: 'skip-safety-guard'
            };
        }
        var patternFit = validateCommentPatternFit(
            comment,
            patternProfile,
            bucket,
            { existingComments }
        );
        if (!patternFit.ok) {
            return {
                comment: null,
                reason: patternFit.reason || 'skip-pattern-fit'
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
            console.log(
                '[LinkedIn Bot] AI comment low confidence' +
                ` (${confidence.score}), skipping`
            );
            return {
                comment: null,
                reason: 'skip-low-confidence'
            };
        }
        return { comment, reason: null };
    } catch (e) {
        console.log(
            '[LinkedIn Bot] AI error: ' + e.message
        );
        return { comment: null, reason: null };
    }
}

chrome.runtime.onMessage.addListener(
    (request, sender, sendResponse) => {
        if (request.action === 'generateAIComment') {
            generateAIComment(request).then(
                result => sendResponse({
                    comment: result?.comment || null,
                    reason: result?.reason || null
                })
            ).catch(() => sendResponse({
                comment: null,
                reason: null
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
                    goalMode: state.goalMode || 'passive',
                    myCompany: state.myCompany || '',
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
                    goalMode: state.goalMode || 'passive',
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
                goalMode: state.goalMode || 'passive',
                myCompany: state.myCompany || '',
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
    const maxRoleTerms = Math.max(
        1,
        Math.min(
            10,
            parseInt(state.roleTermsLimit, 10) || 6
        )
    );
    let safeRoles = roles;
    if (roles.length > maxRoleTerms) {
        const priority = [
            'recruiter',
            '"talent acquisition"',
            '"hiring manager"',
            '"head of talent"',
            'developer',
            '"software engineer"',
            '"product manager"',
            'qa',
            '"tech lead"',
            '"engineering manager"',
            'sourcer',
            '"staffing agency"'
        ];
        const normalized = roles.map(r =>
            String(r).toLowerCase()
        );
        safeRoles = priority
            .filter(p => normalized.includes(p))
            .map(p => roles[normalized.indexOf(p)]);
        for (const role of roles) {
            if (!safeRoles.includes(role)) {
                safeRoles.push(role);
            }
        }
        safeRoles = safeRoles.slice(0, maxRoleTerms);
    }
    if (safeRoles.length === 1) {
        parts.push(safeRoles[0]);
    } else if (safeRoles.length > 1) {
        parts.push(safeRoles.join(' OR '));
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
