if (typeof require === 'function' &&
    typeof module !== 'undefined' &&
    typeof CATEGORY_TEMPLATES === 'undefined') {
    var {
        CATEGORY_TEMPLATES,
        CATEGORY_TEMPLATES_PT,
        CATEGORY_FOLLOW_UPS,
        CATEGORY_FOLLOW_UPS_PT,
        OPENERS, OPENERS_PT,
        COMPOSED_EN, COMPOSED_PT
    } = require('./templates.js');
    var { classifyPost, detectCareerTransitionSignals } = require('./feed-post-classification.js');
    var { detectLanguage, extractTopic, extractKeyPhrase, extractConcepts } = require('./feed-nlp-utils.js');
    var { classifyCommentSentiment, SENTIMENT_PATTERNS } = require('./feed-comment-analysis.js');
    var { assessStrangerDistanceRisk, validateGeneratedCommentSafety } = require('./feed-safety-guards.js');
    var { assessCommentCopyRisk } = require('./feed-copy-guard.js');
    var { validateCommentPatternFit } = require('./feed-comment-patterns.js');
}

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function lowerFirst(s) {
    return s || '';
}

function humanize(comment) {
    let r = comment;

    if (Math.random() < 0.4) {
        r = r.replace(/\.$/, '');
    }

    if (/^[a-z]/.test(r)) {
        r = r[0].toUpperCase() + r.slice(1);
    }

    return r;
}

function finalizeGeneratedComment(
    comment, safetyContext, patternProfile, generationOptions
) {
    if (generationOptions &&
        typeof generationOptions === 'object') {
        generationOptions.lastRejectReason = null;
        generationOptions.lastRejectDiagnostics = null;
    }
    var distanceRisk = assessStrangerDistanceRisk(
        comment,
        safetyContext?.category
    );
    if (distanceRisk.risky) {
        if (generationOptions &&
            typeof generationOptions === 'object') {
            generationOptions.lastRejectReason = 'skip-distance-risk';
            generationOptions.lastRejectDiagnostics = distanceRisk;
        }
        return null;
    }
    if (!validateGeneratedCommentSafety(comment, safetyContext)) {
        if (generationOptions &&
            typeof generationOptions === 'object') {
            generationOptions.lastRejectReason = 'skip-safety-guard';
        }
        return null;
    }
    var copyRisk = assessCommentCopyRisk(
        comment,
        safetyContext?.existingComments
    );
    if (copyRisk.risky) {
        if (generationOptions &&
            typeof generationOptions === 'object') {
            generationOptions.lastRejectReason = 'skip-copy-risk';
            generationOptions.lastRejectDiagnostics = copyRisk;
        }
        return null;
    }
    if (!patternProfile ||
        generationOptions?.allowLowSignalRecovery === true) {
        return comment;
    }
    var fit = validateCommentPatternFit(
        comment, patternProfile, null, safetyContext
    );
    if (!fit.ok &&
        generationOptions &&
        typeof generationOptions === 'object') {
        generationOptions.lastRejectReason =
            fit.reason || 'skip-pattern-fit';
    }
    return fit.ok ? comment : null;
}

function buildCommentFromPost(
    postText, userTemplates, existingComments,
    goalMode, reactions, safetyContext,
    patternProfile, generationOptions
) {
    const category = classifyPost(postText, reactions);
    var transitionSignals = detectCareerTransitionSignals(
        postText
    );
    var isDepartureOnly = transitionSignals.isDepartureOnly;
    const lang = detectLanguage(postText);
    const mode = goalMode === 'active'
        ? 'active' : 'passive';

    var usedSentiments = new Set();
    if (existingComments && existingComments.length > 0) {
        for (var ec of existingComments) {
            usedSentiments.add(ec.sentiment);
        }
        var commentLangs = existingComments.map(
            function(c) { return detectLanguage(c.text); }
        );
        var ptCount = commentLangs.filter(
            function(l) { return l === 'pt'; }
        ).length;
        if (ptCount > commentLangs.length / 2) {
            var effectiveLang = 'pt';
        }
    }
    var finalLang = typeof effectiveLang !== 'undefined'
        ? effectiveLang : lang;

    if (userTemplates && userTemplates.length > 0) {
        const topic = extractTopic(postText);
        const excerpt = (postText || '')
            .substring(0, 50).trim();
        let comment = pickRandom(userTemplates);
        comment = comment
            .replace(/\{topic\}/g, topic)
            .replace(/\{excerpt\}/g, excerpt)
            .replace(/\{category\}/g, category);
        return finalizeGeneratedComment(comment, {
            ...(safetyContext || {}),
            category,
            postText
        }, patternProfile, generationOptions);
    }

    var avoidCelebration = usedSentiments.has(
        'celebration'
    );
    var avoidAgreement = usedSentiments.has(
        'agreement'
    );

    const concepts = extractConcepts(postText);

    if (concepts.length > 0) {
        const composed = finalLang === 'pt'
            ? COMPOSED_PT : COMPOSED_EN;
        var preferredCat = category;
        if (isDepartureOnly) {
            preferredCat = 'departure_transition';
        } else if (category === 'hiring' &&
            mode === 'active') {
            preferredCat = 'hiring_active';
        }
        if (avoidCelebration &&
            (category === 'career' ||
                category === 'generic')) {
            preferredCat = 'technical';
        }
        const pool = composed[preferredCat] ||
            composed[category] || composed.generic;
        if (!pool || pool.length === 0) return null;
        const fn = pickRandom(pool);
        let comment = fn(concepts);
        comment = humanize(comment);
        return finalizeGeneratedComment(comment, {
            ...(safetyContext || {}),
            category,
            postText
        }, patternProfile, generationOptions);
    }

    const topic = extractTopic(postText);
    const textLen = (postText || '').length;
    const rawPhrase = extractKeyPhrase(postText);
    const phraseIsTooSimilar = rawPhrase &&
        rawPhrase.length > textLen * 0.7;
    const hasKeyPhrase = rawPhrase &&
        rawPhrase.length > 0 && !phraseIsTooSimilar;
    const keyPhrase = hasKeyPhrase
        ? '"' + lowerFirst(rawPhrase) + '"'
        : '';

    const templates = finalLang === 'pt'
        ? CATEGORY_TEMPLATES_PT : CATEGORY_TEMPLATES;
    const templateCategory = isDepartureOnly
        ? 'departure_transition'
        : (category === 'hiring' && mode === 'active'
            ? 'hiring_active'
            : category);
    const templatePool =
        templates[templateCategory] ||
        templates[category] ||
        templates.generic;

    if (!templatePool || templatePool.length === 0)
        return null;

    let candidates = templatePool;
    if (!hasKeyPhrase) {
        const noPhrase = templatePool.filter(
            t => !t.includes('{keyPhrase}')
        );
        if (noPhrase.length > 0) candidates = noPhrase;
    }

    if (usedSentiments.size > 0 &&
        candidates.length > 3) {
        var filtered = candidates.filter(function(t) {
            var tLower = t.toLowerCase();
            if (avoidCelebration &&
                SENTIMENT_PATTERNS.celebration
                    .test(tLower)) {
                return false;
            }
            if (avoidAgreement &&
                SENTIMENT_PATTERNS.agreement
                    .test(tLower)) {
                return false;
            }
            return true;
        });
        if (filtered.length > 0) candidates = filtered;
    }

    let template = pickRandom(candidates);

    let comment = template
        .replace(/\{topic\}/g, topic)
        .replace(/\{keyPhrase\}/g, keyPhrase)
        .replace(/\{excerpt\}/g,
            (postText || '').substring(0, 50).trim())
        .replace(/\{category\}/g, category);

    comment = comment.replace(/\s{2,}/g, ' ').trim();
    if (comment.includes('""')) {
        comment = comment
            .replace(/\s*""\s*/g, ' ').trim();
    }

    var skipOpener = category === 'achievement' ||
        category === 'newjob' || category === 'career';
    const openers = finalLang === 'pt'
        ? OPENERS_PT : OPENERS;
    const opener = skipOpener
        ? '' : pickRandom(openers);
    if (opener && !comment.startsWith(opener.trim())) {
        comment = opener + comment;
    }

    comment = humanize(comment);
    return finalizeGeneratedComment(comment, {
        ...(safetyContext || {}),
        category,
        postText
    }, patternProfile, generationOptions);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        pickRandom,
        lowerFirst,
        humanize,
        finalizeGeneratedComment,
        buildCommentFromPost
    };
}
