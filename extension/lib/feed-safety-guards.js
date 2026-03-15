if (typeof require === 'function' &&
    typeof module !== 'undefined' &&
    typeof detectCareerTransitionSignals === 'undefined') {
    var { detectCareerTransitionSignals, isMetricsOrSocialImpactPostContext } = require('./feed-post-classification.js');
    var { normalizeCopyGuardText } = require('./feed-copy-guard.js');
}

function isLowQualityComment(comment, postText) {
    if (!comment) return true;
    var c = comment.toLowerCase().trim();
    var p = (postText || '').toLowerCase();
    if (c.length < 4) return true;
    var cNoFiller = c
        .replace(/[,.]?\s*(faz sentido|makes sense|interesting|legal|nice|cool)\.?$/i, '')
        .trim();
    if (cNoFiller.length > 10 &&
        p.includes(cNoFiller)) return true;
    var cWords = c.split(/\s+/)
        .filter(w => w.length > 2);
    var pWords = new Set(
        p.split(/\s+/).filter(w => w.length > 2)
    );
    var overlap = cWords.filter(
        w => pWords.has(w)
    ).length;
    if (cWords.length > 0 &&
        overlap / cWords.length > 0.5) return true;
    var fillerRe =
        /^(nice|cool|interesting|good|great|ok|faz sentido|legal|bacana|top|show|makes sense)\s*[.!]?$/i;
    if (fillerRe.test(c)) return true;
    var sarcasticRe =
        /\b(obviously|clearly|duh|sure buddy|yeah right|good luck with that|ironic|imagine thinking)\b/i;
    if (sarcasticRe.test(c)) return true;
    if (/\?\s*$/.test(c)) return true;
    return false;
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

function validateGeneratedCommentSafety(comment, context) {
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
        (category !== 'technical' || isMetricsOrSocialImpactPostContext(
            category, context?.postText, context?.imageSignals
        ))) {
        return false;
    }

    return true;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isLowQualityComment,
        validateGeneratedCommentSafety,
        assessStrangerDistanceRisk,
        isCareerDistanceCategory
    };
}
