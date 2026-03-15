if (typeof require === 'function' &&
    typeof module !== 'undefined' &&
    typeof classifyCommentSentiment === 'undefined') {
    var { classifyCommentSentiment, THREAD_STOP_WORDS } = require('./feed-comment-analysis.js');
    var { detectLanguage, tokenizeGroundingText } = require('./feed-nlp-utils.js');
}

var PATTERN_LOW_SIGNAL_THRESHOLD = 60;
var PATTERN_DEFAULT_MAX_COMMENTS = 15;

var PATTERN_INTENT_MARKERS = {
    laugh: /\b(lol|lmao|haha+|hahaha|kkkk+|rsrs+|too real|real demais|accurate|certeiro)\b/i,
    congrats: /\b(congrats|congratulations|parab[eé]ns|well deserved|merecido)\b/i,
    agree: /\b(agree|exactly|true|right|concordo|exatamente|verdade)\b/i,
    insight: /\b(great point|good point|insight|interesting|interessante|bom ponto)\b/i,
    support: /\b(keep going|well done|good luck|boa sorte|for[çc]a|sucesso)\b/i,
    gratitude: /\b(thanks|thank you|obrigad[oa]|grateful|grato)\b/i,
    neutral: /\b(nice|solid|strong|clean|practical|bom|boa|legal)\b/i
};

var PATTERN_IRONY_RE = /\b(obviously|clearly|duh|yeah right|sure buddy|as if|sarcasm|sarcastic|imagina|claro que n[aã]o)\b/i;
var PATTERN_POLEMIC_RE = /\b(garbage|trash|fraud|scam|ridiculous|nonsense|idiota|rid[ií]culo|absurdo|boicot|boycott|cancel culture|shut up|cala a boca)\b/i;
var PATTERN_DISCUSSION_RE = /\b(let me know|what do you think|thoughts|debate|discuss|dm me|reach out)\b/i;

function clampNumber(value, min, max) {
    if (!Number.isFinite(value)) return min;
    return Math.min(max, Math.max(min, value));
}

function roundMetric(value, decimals) {
    var factor = Math.pow(10, decimals || 2);
    return Math.round(value * factor) / factor;
}

function getCommentWeight(idx, total) {
    var t = Math.max(1, total);
    var weight = 1 - (idx / (t * 1.4));
    return clampNumber(weight, 0.35, 1);
}

function getLengthBand(length) {
    if (length < 55) return 'short';
    if (length < 120) return 'medium';
    return 'long';
}

function getBandIndex(band) {
    if (band === 'short') return 0;
    if (band === 'medium') return 1;
    if (band === 'long') return 2;
    return 1;
}

function detectPunctuationRhythm(text) {
    var exclam = (text.match(/!/g) || []).length;
    var commas = (text.match(/,/g) || []).length;
    var periods = (text.match(/\./g) || []).length;
    var ellipsis = (text.match(/\.\.\.|…/g) || []).length;
    var punctuation = exclam + commas + periods + ellipsis;
    if (punctuation === 0) return 'flat';
    if (ellipsis > 0 || exclam >= 2) return 'expressive';
    if (commas + periods >= 2) return 'structured';
    return 'balanced';
}

function getToneIntensity(text) {
    var exclam = (text.match(/!/g) || []).length;
    var emojiCount = (text.match(/[\u{1F300}-\u{1FAFF}]/gu) || [])
        .length;
    var upperWords = (text.match(/\b[A-Z]{3,}\b/g) || []).length;
    var signal = exclam + emojiCount + upperWords;
    if (signal >= 3) return 'high';
    if (signal === 0) return 'low';
    return 'balanced';
}

function normalizePatternToken(token) {
    return (token || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
}

function extractOpenerPattern(text) {
    var tokens = tokenizeGroundingText(text || '')
        .slice(0, 3)
        .map(normalizePatternToken)
        .filter(function(token) {
            return token.length > 1 &&
                !THREAD_STOP_WORDS.has(token);
        });
    if (tokens.length === 0) return '';
    return tokens.slice(0, 2).join(' ');
}

function pushWeighted(map, key, amount) {
    if (!key) return;
    map[key] = (map[key] || 0) + amount;
}

function extractIntent(text, category) {
    var lower = (text || '').toLowerCase();
    if (category === 'humor') {
        return PATTERN_INTENT_MARKERS.laugh.test(lower)
            ? 'laugh' : 'neutral';
    }
    for (var [intent, pattern] of Object.entries(
        PATTERN_INTENT_MARKERS
    )) {
        if (pattern.test(lower)) return intent;
    }
    return 'neutral';
}

function extractNgrams(text, limit) {
    var tokens = tokenizeGroundingText(text || '')
        .map(normalizePatternToken)
        .filter(function(token) {
            return token.length >= 4 &&
                !THREAD_STOP_WORDS.has(token);
        });
    var grams = [];
    for (var i = 0; i < tokens.length - 1; i++) {
        grams.push(tokens[i] + ' ' + tokens[i + 1]);
        if (i < tokens.length - 2) {
            grams.push(
                tokens[i] + ' ' + tokens[i + 1] +
                ' ' + tokens[i + 2]
            );
        }
        if (grams.length >= limit) break;
    }
    return grams.slice(0, limit);
}

function sortedEntries(map, limit) {
    return Object.entries(map || {})
        .sort(function(a, b) {
            if (b[1] !== a[1]) return b[1] - a[1];
            return a[0].localeCompare(b[0]);
        })
        .slice(0, limit || 10);
}

function mapToRankedArray(map, limit) {
    return sortedEntries(map, limit).map(function(item) {
        return {
            text: item[0],
            weight: roundMetric(item[1], 3)
        };
    });
}

function mapToRatioObject(map) {
    var entries = sortedEntries(map, 20);
    var total = entries.reduce(function(sum, item) {
        return sum + item[1];
    }, 0);
    if (total <= 0) return {};
    var out = {};
    for (var [key, value] of entries) {
        out[key] = roundMetric(value / total, 3);
    }
    return out;
}

function topKeyFromArray(list, fallback) {
    if (!Array.isArray(list) || list.length === 0) {
        return fallback;
    }
    return list[0].text || fallback;
}

function resolveStyleFamily(category, dominantIntent, dominantSentiment) {
    if (category === 'humor' || dominantIntent === 'laugh') {
        return 'minimal-humor';
    }
    if (dominantIntent === 'congrats' ||
        dominantSentiment === 'celebration') {
        return 'congratulatory';
    }
    if (dominantIntent === 'insight' ||
        dominantSentiment === 'insight') {
        return 'analytical';
    }
    if (dominantIntent === 'support' ||
        dominantSentiment === 'support') {
        return 'supportive';
    }
    return 'neutral-ack';
}

function analyzeCommentPatterns(existingComments, opts) {
    var list = Array.isArray(existingComments)
        ? existingComments : [];
    var maxComments = Math.min(
        PATTERN_DEFAULT_MAX_COMMENTS,
        Math.max(1, Number(opts?.maxComments) || 15)
    );
    var category = opts?.category || 'generic';
    var sampled = list.slice(0, maxComments)
        .map(function(item) {
            return typeof item === 'string'
                ? { text: item, sentiment: 'generic' }
                : item;
        });

    var openerMap = {};
    var lengthMap = {};
    var rhythmMap = {};
    var toneMap = {};
    var intentMap = {};
    var sentimentMap = {};
    var ngramMap = {};
    var langMap = {};
    var totalWeight = 0;
    var riskWeight = 0;
    var emojiWeighted = 0;
    var questionWeighted = 0;
    var exclamWeighted = 0;
    var analyzedCount = 0;

    for (var idx = 0; idx < sampled.length; idx++) {
        var rawText = (sampled[idx]?.text || '').trim();
        if (!rawText) continue;
        var text = rawText.substring(0, 280);
        var weight = getCommentWeight(idx, sampled.length);
        var lower = text.toLowerCase();
        analyzedCount++;
        totalWeight += weight;

        var opener = extractOpenerPattern(text);
        pushWeighted(openerMap, opener, weight);

        var lengthBand = getLengthBand(text.length);
        pushWeighted(lengthMap, lengthBand, weight);

        var rhythm = detectPunctuationRhythm(text);
        pushWeighted(rhythmMap, rhythm, weight);

        var tone = getToneIntensity(text);
        pushWeighted(toneMap, tone, weight);

        var sentiment = sampled[idx]?.sentiment ||
            classifyCommentSentiment(text);
        pushWeighted(sentimentMap, sentiment, weight);

        var intent = extractIntent(text, category);
        pushWeighted(intentMap, intent, weight);

        var lang = detectLanguage(text);
        pushWeighted(langMap, lang, weight);

        var ngrams = extractNgrams(text, 6);
        for (var gram of ngrams) {
            pushWeighted(ngramMap, gram, weight);
        }

        var emojis = (text.match(/[\u{1F300}-\u{1FAFF}]/gu) || [])
            .length;
        if (emojis > 0) emojiWeighted += weight;
        if (text.includes('?')) questionWeighted += weight;
        if (text.includes('!')) exclamWeighted += weight;

        if (PATTERN_IRONY_RE.test(lower) ||
            PATTERN_POLEMIC_RE.test(lower) ||
            PATTERN_DISCUSSION_RE.test(lower) ||
            text.includes('?')) {
            riskWeight += weight;
        }
    }

    if (analyzedCount === 0 || totalWeight === 0) {
        return {
            analyzedCount: 0,
            sampledCount: sampled.length,
            maxComments,
            dominantLanguage: 'en',
            styleFamily: 'neutral-ack',
            lengthBand: 'short',
            punctuationRhythm: 'flat',
            toneIntensity: 'low',
            openers: [],
            topNgrams: [],
            intentMix: {},
            sentimentMix: {},
            riskMarkers: {
                riskRate: 1,
                questionRate: 1,
                emojiRate: 0
            },
            recommended: {
                lengthBand: 'short',
                toneIntensity: 'low',
                punctuationRhythm: 'flat',
                styleFamily: 'neutral-ack',
                allowQuestion: false,
                allowEmoji: false,
                maxEmoji: 0
            },
            patternConfidence: 0,
            lowSignal: true
        };
    }

    var rankedLength = mapToRankedArray(lengthMap, 3);
    var rankedIntent = mapToRankedArray(intentMap, 6);
    var rankedOpeners = mapToRankedArray(openerMap, 8);
    var rankedSentiments = mapToRankedArray(sentimentMap, 6);
    var rankedNgrams = mapToRankedArray(ngramMap, 14);
    var rankedRhythm = mapToRankedArray(rhythmMap, 4);
    var rankedTone = mapToRankedArray(toneMap, 4);
    var dominantLanguage = topKeyFromArray(
        mapToRankedArray(langMap, 2), 'en'
    );
    var dominantLength = topKeyFromArray(
        rankedLength, 'short'
    );
    var dominantIntent = topKeyFromArray(
        rankedIntent, 'neutral'
    );
    var dominantSentiment = topKeyFromArray(
        rankedSentiments, 'generic'
    );
    var dominantRhythm = topKeyFromArray(
        rankedRhythm, 'balanced'
    );
    var dominantTone = topKeyFromArray(
        rankedTone, 'balanced'
    );
    var styleFamily = resolveStyleFamily(
        category, dominantIntent, dominantSentiment
    );

    var lengthCoherence = (rankedLength[0]?.weight || 0) /
        totalWeight;
    var intentCoherence = (rankedIntent[0]?.weight || 0) /
        totalWeight;
    var openerCoherence = rankedOpeners.length > 0
        ? (rankedOpeners[0].weight / totalWeight) : 0.5;
    var sentimentCoherence = (rankedSentiments[0]?.weight || 0) /
        totalWeight;
    var coherence = (
        lengthCoherence +
        intentCoherence +
        openerCoherence +
        sentimentCoherence
    ) / 4;
    var riskRate = clampNumber(riskWeight / totalWeight, 0, 1);
    var riskCleanliness = 1 - riskRate;
    var countScore = clampNumber(analyzedCount / 8, 0, 1);
    var confidence = Math.round(
        (
            countScore * 0.45 +
            coherence * 0.35 +
            riskCleanliness * 0.2
        ) * 100
    );
    if (analyzedCount < 3) {
        confidence = Math.min(confidence, 55);
    }

    var questionRate = roundMetric(
        questionWeighted / totalWeight, 3
    );
    var emojiRate = roundMetric(
        emojiWeighted / totalWeight, 3
    );
    var exclamationRate = roundMetric(
        exclamWeighted / totalWeight, 3
    );
    var allowEmoji = emojiRate >= 0.12;
    var maxEmoji = allowEmoji
        ? (emojiRate >= 0.35 ? 2 : 1)
        : 0;

    return {
        analyzedCount,
        sampledCount: sampled.length,
        maxComments,
        dominantLanguage,
        styleFamily,
        lengthBand: dominantLength,
        punctuationRhythm: dominantRhythm,
        toneIntensity: dominantTone,
        openers: rankedOpeners,
        topNgrams: rankedNgrams,
        intentMix: mapToRatioObject(intentMap),
        sentimentMix: mapToRatioObject(sentimentMap),
        riskMarkers: {
            riskRate: roundMetric(riskRate, 3),
            questionRate,
            emojiRate,
            exclamationRate
        },
        recommended: {
            lengthBand: dominantLength,
            toneIntensity: dominantTone,
            punctuationRhythm: dominantRhythm,
            styleFamily,
            allowQuestion: false,
            allowEmoji,
            maxEmoji
        },
        patternConfidence: confidence,
        lowSignal: confidence < PATTERN_LOW_SIGNAL_THRESHOLD
    };
}

function topKeysFromWeightedObject(obj, limit) {
    return Object.entries(obj || {})
        .sort(function(a, b) {
            if (b[1] !== a[1]) return b[1] - a[1];
            return a[0].localeCompare(b[0]);
        })
        .slice(0, limit || 6)
        .map(function(item) { return item[0]; });
}

function collectPatternLexicon(patternProfile, bucket) {
    var out = new Set();
    var openers = Array.isArray(patternProfile?.openers)
        ? patternProfile.openers : [];
    for (var item of openers.slice(0, 6)) {
        var txt = typeof item === 'string'
            ? item : item?.text || '';
        for (var token of tokenizeGroundingText(txt)) {
            out.add(token);
        }
    }
    var ngrams = Array.isArray(patternProfile?.topNgrams)
        ? patternProfile.topNgrams : [];
    for (var gram of ngrams.slice(0, 12)) {
        var g = typeof gram === 'string'
            ? gram : gram?.text || '';
        for (var part of tokenizeGroundingText(g)) {
            out.add(part);
        }
    }
    var bucketNgrams = topKeysFromWeightedObject(
        bucket?.ngrams, 16
    );
    for (var bg of bucketNgrams) {
        for (var bt of tokenizeGroundingText(bg)) {
            out.add(bt);
        }
    }
    return out;
}

function isLengthBandCompatible(actual, expected) {
    if (!expected) return true;
    var distance = Math.abs(
        getBandIndex(actual) - getBandIndex(expected)
    );
    return distance <= 1;
}

function toneMismatch(actual, expected) {
    if (!expected || expected === 'balanced') return false;
    if (expected === 'low' && actual === 'high') return true;
    if (expected === 'high' && actual === 'low') return true;
    return false;
}

function normalizeCompareText(text) {
    return (text || '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
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
    var profile = patternProfile || {};
    if (Number(profile.patternConfidence || 0) > 0 &&
        Number(profile.patternConfidence || 0) <
            PATTERN_LOW_SIGNAL_THRESHOLD) {
        return {
            ok: false,
            reason: 'skip-pattern-low-signal'
        };
    }
    var rec = profile.recommended || {};
    var expectedLength = rec.lengthBand ||
        profile.lengthBand ||
        topKeysFromWeightedObject(
            bucket?.lengthMix, 1
        )[0] || null;
    var expectedTone = rec.toneIntensity ||
        profile.toneIntensity ||
        topKeysFromWeightedObject(
            bucket?.toneMix, 1
        )[0] || null;
    var expectedRhythm = rec.punctuationRhythm ||
        profile.punctuationRhythm ||
        topKeysFromWeightedObject(
            bucket?.rhythmMix, 1
        )[0] || null;
    var actualLength = getLengthBand(text.length);
    if (!isLengthBandCompatible(actualLength, expectedLength)) {
        return {
            ok: false,
            reason: 'skip-pattern-fit'
        };
    }
    var actualTone = getToneIntensity(text);
    if (toneMismatch(actualTone, expectedTone)) {
        return {
            ok: false,
            reason: 'skip-pattern-fit'
        };
    }
    if (!rec.allowQuestion && text.includes('?')) {
        return {
            ok: false,
            reason: 'skip-pattern-fit'
        };
    }
    var emojiCount = (text.match(/[\u{1F300}-\u{1FAFF}]/gu) || [])
        .length;
    if (Number(rec.maxEmoji || 0) < emojiCount) {
        return {
            ok: false,
            reason: 'skip-pattern-fit'
        };
    }
    if (expectedRhythm) {
        var actualRhythm = detectPunctuationRhythm(text);
        if (expectedRhythm === 'flat' &&
            actualRhythm === 'expressive') {
            return {
                ok: false,
                reason: 'skip-pattern-fit'
            };
        }
    }
    var normalized = normalizeCompareText(text);
    var existingComments = Array.isArray(
        safetyCtx?.existingComments
    ) ? safetyCtx.existingComments : [];
    for (var existing of existingComments) {
        var eText = normalizeCompareText(existing?.text || '');
        if (eText && eText.length >= 10 && eText === normalized) {
            return {
                ok: false,
                reason: 'skip-pattern-fit'
            };
        }
    }
    var lexicon = collectPatternLexicon(profile, bucket);
    var commentTokens = tokenizeGroundingText(text);
    if (lexicon.size >= 6 && commentTokens.length > 0) {
        var overlap = 0;
        for (var token of commentTokens) {
            if (lexicon.has(token)) overlap++;
        }
        var ratio = overlap / commentTokens.length;
        var minRatio = Number(profile.patternConfidence || 0) >= 75
            ? 0.1 : 0.06;
        if (ratio < minRatio) {
            return {
                ok: false,
                reason: 'skip-pattern-fit'
            };
        }
    }
    var lower = text.toLowerCase();
    if (PATTERN_IRONY_RE.test(lower) ||
        PATTERN_POLEMIC_RE.test(lower) ||
        PATTERN_DISCUSSION_RE.test(lower)) {
        return {
            ok: false,
            reason: 'skip-pattern-fit'
        };
    }
    return { ok: true, reason: null };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        analyzeCommentPatterns,
        validateCommentPatternFit,
        PATTERN_LOW_SIGNAL_THRESHOLD,
        PATTERN_DEFAULT_MAX_COMMENTS,
        PATTERN_INTENT_MARKERS,
        PATTERN_IRONY_RE,
        PATTERN_POLEMIC_RE,
        PATTERN_DISCUSSION_RE
    };
}
