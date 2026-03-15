/**
 * Post classification, reaction typing, polemic detection,
 * and career transition detection.
 *
 * Dependencies: templates.js, feed-copy-guard.js
 */

if (typeof require === 'function' &&
    typeof module !== 'undefined' &&
    typeof POST_CATEGORIES === 'undefined') {
    var {
        POST_CATEGORIES, HIGH_SIGNAL_CATEGORIES, TOPIC_MAP
    } = require('./templates.js');
    var { normalizeCopyGuardText } = require('./feed-copy-guard.js');
}

function getReactionType(postText, keywords) {
    const lower = (postText || '').toLowerCase();
    if (keywords?.celebrate?.some(k => lower.includes(k))) {
        return 'PRAISE';
    }
    if (keywords?.support?.some(k => lower.includes(k))) {
        return 'EMPATHY';
    }
    if (keywords?.insightful?.some(k => lower.includes(k))) {
        return 'INTEREST';
    }
    if (keywords?.funny?.some(k => lower.includes(k))) {
        return 'ENTERTAINMENT';
    }
    if (keywords?.love?.some(k => lower.includes(k))) {
        return 'APPRECIATION';
    }
    return 'LIKE';
}

function classifyPost(postText, reactions) {
    if (!postText) return 'generic';
    const lower = postText.toLowerCase();
    const scores = {};

    for (const [category, keywords] of
        Object.entries(POST_CATEGORIES)) {
        let score = 0;
        for (const kw of keywords) {
            if (lower.includes(kw)) {
                score++;
                if (kw.length > 8) score += 0.5;
            }
        }
        if (HIGH_SIGNAL_CATEGORIES.has(category)) {
            score *= 1.5;
        }
        scores[category] = score;
    }

    if (reactions && typeof reactions === 'object') {
        var funny = reactions.ENTERTAINMENT || 0;
        var celebrate = reactions.PRAISE || 0;
        var support = reactions.EMPATHY || 0;
        var insightful = reactions.INTEREST || 0;
        var total = reactions._total || 0;
        if (funny >= 3 || (total > 10 &&
            funny / total > 0.3)) {
            scores.humor = (scores.humor || 0) + 3;
        }
        if (celebrate >= 3 || (total > 10 &&
            celebrate / total > 0.3)) {
            scores.achievement =
                (scores.achievement || 0) + 2;
            scores.newjob =
                (scores.newjob || 0) + 1.5;
        }
        if (insightful >= 3 || (total > 10 &&
            insightful / total > 0.3)) {
            scores.technical =
                (scores.technical || 0) + 2;
        }
        if (support >= 3 || (total > 10 &&
            support / total > 0.3)) {
            scores.jobseeking =
                (scores.jobseeking || 0) + 1.5;
        }
    }

    let bestCategory = 'generic';
    let bestScore = 0;
    for (const [cat, score] of Object.entries(scores)) {
        if (score > bestScore) {
            bestScore = score;
            bestCategory = cat;
        }
    }

    if (bestCategory !== 'humor' &&
        bestScore < 3 && lower.length < 500) {
        var humorBoost = 0;
        if (/\.\s+(?:unless|except|but|until|then)\s/i
            .test(lower)) humorBoost += 1.5;
        if (/:\s/.test(postText) &&
            lower.length < 300) humorBoost += 1;
        if (/(?:never|nobody|no one|ninguém).*(?:get|got|tell|told|avis)/i
            .test(lower)) humorBoost += 1;
        if (/(?:the real|truth is|turns out|apparently|plot twist)/i
            .test(lower)) humorBoost += 1.5;
        if (/(?:vs\.?\s*reality|expectation.*reality)/i
            .test(lower)) humorBoost += 2;
        if ((scores.humor || 0) + humorBoost >
            bestScore) {
            bestCategory = 'humor';
            bestScore = (scores.humor || 0) +
                humorBoost;
        }
    }

    if (bestCategory !== 'critique' &&
        bestScore < 4 && lower.length < 600) {
        var critiqueBoost = 0;
        if (/\bhot take\b/i.test(lower))
            critiqueBoost += 2.5;
        if (/\bunpopular opinion\b/i.test(lower))
            critiqueBoost += 2.5;
        if (/\boverrated\b/i.test(lower))
            critiqueBoost += 2;
        if (/\bstop\s+(doing|saying|pretending)\b/i
            .test(lower)) critiqueBoost += 2;
        if (/\bnobody\s+(?:needs|wants|asked)\b/i
            .test(lower)) critiqueBoost += 2;
        if ((scores.critique || 0) + critiqueBoost >
            bestScore) {
            bestCategory = 'critique';
            bestScore = (scores.critique || 0) +
                critiqueBoost;
        }
    }

    // Safety override for hiring posts: never route to
    // humor/critique/generic if hiring intent is strong.
    if ((scores.hiring || 0) >= 2 &&
        (bestCategory === 'humor' ||
            bestCategory === 'critique' ||
            bestCategory === 'generic')) {
        bestCategory = 'hiring';
    }

    if (bestScore < 1 && lower.length > 20) {
        for (const entry of TOPIC_MAP) {
            if (entry.pattern.test(lower)) {
                return 'technical';
            }
        }
    }
    return bestCategory;
}

function isPolemicPost(postText, existingComments) {
    var lower = (postText || '').toLowerCase();
    var hardBlock = [
        /\b(political|politic[ao]|governo|government|president)/i,
        /\b(religion|relig|church|igreja|deus)\b/i,
        /\b(gender|feminism|machis|aborto|abort)\b/i,
        /\b(racist|racism|racis)/i,
        /\b(wake up|sheep|brainwash)/i,
        /\b(cancel culture|boycott|boicot)/i,
    ];
    for (var hb of hardBlock) {
        if (hb.test(lower)) return true;
    }
    var polemicSignals = 0;
    var softPatterns = [
        /\b(who needs|is dead|is dying|is over)\b/i,
        /\b(for the win|ftw)\b/i,
        /\b(worst|garbage|trash|scam|fraud)\b/i,
        /\b(layoff|firing|demiti|mandaram embora)/i,
        /\b(cancel|boycott|boicot)/i,
        /\b(nobody cares|ninguém liga)\b/i,
        /\b(replace.*developers|replace.*devs)\b/i,
    ];
    for (var p of softPatterns) {
        if (p.test(lower)) polemicSignals++;
    }
    if (existingComments && existingComments.length > 0) {
        var heated = 0;
        var heatedPatterns = [
            /\b(disagree|wrong|nonsense|ridiculous)\b/i,
            /\b(absurd|idiota|ridículo|errado)\b/i,
            /\b(shut up|cala a boca|ignorant)\b/i,
        ];
        for (var c of existingComments) {
            var ct = (c.text || '').toLowerCase();
            for (var hp of heatedPatterns) {
                if (hp.test(ct)) { heated++; break; }
            }
        }
        if (heated >= 2) polemicSignals += 2;
        else if (heated >= 1) polemicSignals += 1;
    }
    return polemicSignals >= 2;
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

function isMetricsOrSocialImpactPostContext(
    category, postText, imageSignals
) {
    var cat = (category || '').toLowerCase();
    if (cat === 'news' || cat === 'motivation') return true;
    var text = (
        (postText || '') + ' ' +
        ((imageSignals?.samples || []).join(' '))
    ).toLowerCase();
    return /\b(women|female|mulheres|lideran[çc]a|leadership|diversity|diversidade|inclusion|inclus[aã]o|equity|metric|metrics|kpi|report|survey|dados|n[uú]meros|estat[ií]sticas|percent|%)\b/i
        .test(text);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getReactionType,
        classifyPost,
        isPolemicPost,
        detectCareerTransitionSignals,
        isMetricsOrSocialImpactPostContext,
        CAREER_DEPARTURE_SIGNAL_TERMS,
        CAREER_NEW_JOB_SIGNAL_TERMS
    };
}
