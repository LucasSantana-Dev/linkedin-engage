if (typeof require === 'function' &&
    typeof module !== 'undefined' &&
    typeof POST_CATEGORIES === 'undefined') {
    var {
        POST_CATEGORIES, CATEGORY_TEMPLATES,
        CATEGORY_TEMPLATES_PT,
        CATEGORY_FOLLOW_UPS,
        CATEGORY_FOLLOW_UPS_PT,
        OPENERS, OPENERS_PT,
        TOPIC_MAP, HIGH_SIGNAL_CATEGORIES,
        PT_MARKERS, CONCEPT_PATTERNS,
        COMPOSED_EN, COMPOSED_PT
    } = require('./templates.js');
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

function extractTopic(postText) {
    if (!postText) return 'this';
    for (const entry of TOPIC_MAP) {
        if (entry.pattern.test(postText)) {
            return entry.label;
        }
    }
    return 'tech';
}

function detectLanguage(text) {
    if (!text) return 'en';
    const lower = text.toLowerCase();
    let score = 0;
    for (const marker of PT_MARKERS) {
        if (lower.includes(marker)) score++;
    }
    var accentCount = (
        lower.match(/[àáâãéêíóôõúç]/g) || []
    ).length;
    if (accentCount >= 4) score += 2;
    else if (accentCount >= 2) score += 1;
    if (/\b(não|você|vocês|então|até|já|está)\b/
        .test(lower)) score += 1;
    if (/\b(kkk|haha.*demais|pra |pro )\b/
        .test(lower)) score += 1;
    var threshold = lower.length < 150 ? 2 : 3;
    return score >= threshold ? 'pt' : 'en';
}

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function extractKeyPhrase(postText) {
    if (!postText || postText.length < 10) return '';
    const sentences = postText
        .replace(/\n+/g, '. ')
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 15 && s.length < 120);
    if (!sentences.length) return '';

    const scored = sentences.map(s => {
        let score = 0;
        const lower = s.toLowerCase();
        const signals = [
            'important', 'key', 'the truth',
            'biggest', 'best', 'worst', 'never',
            'always', 'most people', 'nobody talks',
            'underrated', 'overrated', 'the problem',
            'the solution', 'what works', 'game changer',
            'don\'t', 'stop', 'start', 'here\'s why',
            'the real', 'actually', 'turns out'
        ];
        for (const sig of signals) {
            if (lower.includes(sig)) score += 2;
        }
        if (s.length > 30 && s.length < 80) score += 1;
        return { text: s, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];
    if (best.score === 0) {
        return scored[
            Math.floor(Math.random() * Math.min(3,
                scored.length))
        ].text;
    }
    return best.text;
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

function extractConcepts(postText) {
    if (!postText) return [];
    const found = new Map();

    for (const pattern of CONCEPT_PATTERNS) {
        const regex = new RegExp(
            pattern.source, pattern.flags
        );
        let match;
        while ((match = regex.exec(postText)) !== null) {
            const term = match[1].trim();
            if (term.length < 2 || term.length > 40) {
                continue;
            }
            const key = term.toLowerCase();
            if (!found.has(key) ||
                term.length > found.get(key).length) {
                found.set(key, term);
            }
        }
    }

    const stopWords = new Set([
        'the', 'and', 'for', 'with', 'that', 'this',
        'from', 'are', 'was', 'has', 'have', 'been',
        'will', 'can', 'not', 'but', 'all', 'our',
        'your', 'their', 'what', 'when', 'how',
        'just', 'more', 'some', 'also', 'than',
        'like', 'into', 'over', 'its', 'you',
        'que', 'com', 'uma', 'por', 'dos', 'das',
        'seu', 'sua', 'nos', 'são'
    ]);

    const articles = /^(o|a|os|as|um|uma|the|an?|el|la|los|las|do|da|dos|das|no|na|nos|nas|de|em|por|ao|à)\s+/i;

    return [...found.entries()]
        .filter(([key]) => !stopWords.has(key))
        .map(([key, val]) => {
            const cleaned = val.replace(articles, '');
            return [cleaned.toLowerCase(), cleaned];
        })
        .filter(([key, val]) =>
            val.length >= 3 && !stopWords.has(key))
        .sort((a, b) => b[1].length - a[1].length)
        .filter(([key], i, arr) =>
            !arr.some(([k], j) =>
                j < i && k.includes(key)))
        .map(([, val]) => val)
        .slice(0, 5);
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

function isReactablePost(postEl) {
    if (!postEl) return false;
    const text = (postEl.innerText ||
        postEl.textContent || '').trim();
    return text.length > 20;
}

function shouldSkipPost(postText, skipKeywords) {
    if (!skipKeywords || !skipKeywords.length) return false;
    const lower = (postText || '').toLowerCase();
    return skipKeywords.some(k => lower.includes(
        k.toLowerCase()
    ));
}

function isCompanyFollowText(text) {
    const t = (text || '').trim();
    return t === 'Follow' || t === 'Seguir' ||
        t === '+ Follow' || t === '+ Seguir';
}

var BOILERPLATE_RE = new RegExp(
    '^(' +
    'like|comment|repost|send|share|follow|' +
    'gostei|comentar|compartilhar|enviar|seguir|' +
    'reaction button|open reactions|' +
    'feed post|promoted|\\d+\\s*(comments?|' +
    'reactions?|reposts?|likes?|views?)' +
    ')$', 'i'
);

function getPostText(postEl) {
    if (!postEl) return '';
    var textBox = postEl.querySelector
        ? postEl.querySelector(
            '[data-testid="expandable-text-box"]'
        ) : null;
    if (textBox) {
        var tb = (textBox.innerText ||
            textBox.textContent || '').trim();
        if (tb.length > 10) return tb;
    }
    var parts = [];
    var bodySelectors = [
        '.feed-shared-text',
        '.update-components-text',
        '[data-test-id="main-feed-activity-content"]',
        'span.break-words'
    ];
    for (var sel of bodySelectors) {
        var el = postEl.querySelector(sel);
        if (el) {
            var t = (el.innerText ||
                el.textContent || '').trim();
            if (t && t.length > 10 &&
                !parts.includes(t)) {
                parts.push(t);
                break;
            }
        }
    }
    if (parts.length === 0) {
        var spans = postEl.querySelectorAll(
            'span[dir="ltr"]'
        );
        var longest = '';
        for (var s of spans) {
            var st = (s.innerText ||
                s.textContent || '').trim();
            if (st.length > longest.length) longest = st;
        }
        if (longest.length > 10) parts.push(longest);
    }
    var titleSel =
        '.feed-shared-article__title, ' +
        '.update-components-article__title, ' +
        '.article-card__title span';
    var titleEls = postEl.querySelectorAll(titleSel);
    for (var te of titleEls) {
        var tt = (te.innerText ||
            te.textContent || '').trim();
        if (tt && !parts.includes(tt)) parts.push(tt);
    }
    if (parts.length > 0) return parts.join(' ');

    var allText = (postEl.innerText ||
        postEl.textContent || '').trim();
    if (!allText) return '';
    var lines = allText.split('\n')
        .map(function(l) { return l.trim(); })
        .filter(function(l) {
            return l.length > 5 &&
                !BOILERPLATE_RE.test(l);
        });
    var content = lines.filter(
        function(l) { return l.length > 30; }
    );
    if (content.length > 0) {
        return content.slice(0, 10).join(' ');
    }
    return lines.slice(0, 5).join(' ')
        .substring(0, 500);
}

function getPostAuthor(postEl) {
    if (!postEl) return 'Unknown';
    var stripRe =
        /\s*(Premium Profile|Verified|Profile|\d+(st|nd|rd|th)\+?)\s*/gi;
    var socialRe =
        /liked|commented|reposted|curtiu|comentou|repostou|seguiu|followed/i;
    var links = postEl.querySelectorAll(
        'a[href*="/in/"]'
    );
    for (var a of links) {
        var ctx = (a.parentElement?.innerText ||
            '').substring(0, 120);
        if (socialRe.test(ctx)) continue;
        var raw = (a.innerText ||
            a.textContent || '').trim();
        if (raw.length < 3) continue;
        var name = raw.split('\n')[0].trim()
            .replace(stripRe, ' ').trim();
        if (name.length > 2 && name.length < 60) {
            return name;
        }
    }
    var companyLinks = postEl.querySelectorAll(
        'a[href*="/company/"]'
    );
    for (var c of companyLinks) {
        var ctx = (c.parentElement?.innerText ||
            '').substring(0, 120);
        if (socialRe.test(ctx)) continue;
        var cRaw = (c.innerText ||
            c.textContent || '').trim();
        if (cRaw.length < 3) continue;
        var cName = cRaw.split('\n')[0].trim();
        if (cName.length > 2 && cName.length < 60) {
            return cName;
        }
    }
    var oldSel =
        '.update-components-actor__name span, ' +
        '.feed-shared-actor__name span';
    var el = postEl.querySelector(oldSel);
    return el
        ? (el.innerText ||
            el.textContent || '').trim()
            .split('\n')[0]
        : 'Unknown';
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

function getPostAuthorTitle(postEl) {
    if (!postEl) return '';
    var descSels = [
        '.update-components-actor__description',
        '.feed-shared-actor__description',
        '.update-components-actor__sub-description',
        '.feed-shared-actor__sub-description',
    ];
    for (var sel of descSels) {
        var el = postEl.querySelector(sel);
        if (el) {
            var t = (el.innerText ||
                el.textContent || '').trim()
                .split('\n')[0].trim();
            if (t.length > 2 && t.length < 120) {
                return t;
            }
        }
    }
    var authorLink = postEl.querySelector(
        'a[href*="/in/"]'
    );
    if (authorLink) {
        var parent = authorLink.closest(
            '[class*="actor"], [class*="header"]'
        );
        if (parent) {
            var spans = parent.querySelectorAll('span');
            for (var s of spans) {
                var txt = (s.innerText ||
                    s.textContent || '').trim();
                if (txt.length > 10 &&
                    txt.length < 120 &&
                    !txt.includes('Follow') &&
                    !txt.includes('Seguir')) {
                    return txt;
                }
            }
        }
    }
    return '';
}

function getPostReactions(postEl) {
    if (!postEl || !postEl.querySelector) return {};
    var counts = {};
    var reactionImgs = postEl.querySelectorAll(
        'img[data-test-app-aware-reaction-type],' +
        'img[alt*="reaction"],' +
        'img[alt*="Reaction"],' +
        'img[alt*="reactions"]'
    );
    for (var img of reactionImgs) {
        var type = img.getAttribute(
            'data-test-app-aware-reaction-type'
        ) || '';
        if (!type) {
            var alt = (img.getAttribute('alt') || '')
                .toLowerCase();
            if (alt.includes('like')) type = 'LIKE';
            else if (alt.includes('celebrat') ||
                alt.includes('parabéns'))
                type = 'PRAISE';
            else if (alt.includes('support') ||
                alt.includes('apoio'))
                type = 'EMPATHY';
            else if (alt.includes('insightful') ||
                alt.includes('genial'))
                type = 'INTEREST';
            else if (alt.includes('funny') ||
                alt.includes('engraçado'))
                type = 'ENTERTAINMENT';
            else if (alt.includes('love') ||
                alt.includes('amei'))
                type = 'APPRECIATION';
        }
        if (type) counts[type] = (counts[type] || 0) + 1;
    }
    var totalEl = postEl.querySelector(
        '[data-testid*="social-counts"],' +
        'button[aria-label*="reaction"],' +
        'span[class*="social-detail"]'
    );
    if (totalEl) {
        var totalText = (totalEl.innerText ||
            totalEl.getAttribute('aria-label') || ''
        );
        var numMatch = totalText.match(/(\d[\d,]*)/);
        if (numMatch) {
            counts._total = parseInt(
                numMatch[1].replace(/,/g, ''), 10
            );
        }
    }
    return counts;
}

function getPostUrn(postEl) {
    if (!postEl) return '';
    const urn = postEl.getAttribute('data-urn') ||
        postEl.getAttribute('data-entity-urn') ||
        postEl.getAttribute('data-id') || '';
    if (urn) return urn;
    const child = postEl.querySelector(
        '[data-urn], [data-entity-urn], [data-id]'
    );
    if (child) {
        const cUrn = child.getAttribute('data-urn') ||
            child.getAttribute('data-entity-urn') ||
            child.getAttribute('data-id') || '';
        if (cUrn) return cUrn;
    }
    const tracked = postEl.querySelector(
        '[data-view-tracking-scope]'
    );
    if (tracked) {
        const scope = tracked.getAttribute(
            'data-view-tracking-scope'
        ) || '';
        const m = scope.match(
            /"contentTrackingId":"([^"]+)"/
        );
        if (m) return m[1];
    }
    return '';
}

function isLikeButton(btn) {
    if (!btn) return false;
    const label = btn.getAttribute('aria-label') || '';
    if (/Like|Gostei|React|Reagir|Reaction button/i
        .test(label)) {
        return true;
    }
    const text = (btn.innerText ||
        btn.textContent || '').trim();
    return /^(Like|Gostei)$/i.test(text);
}

function isCommentButton(btn) {
    if (!btn) return false;
    const label = btn.getAttribute('aria-label') || '';
    const text = (btn.innerText ||
        btn.textContent || '').trim();
    return label.includes('Comment') ||
        label.includes('Comentar') ||
        text === 'Comment' ||
        text === 'Comentar';
}

var SENTIMENT_PATTERNS = {
    celebration: /congrat|parab[eé]ns|amazing|awesome|🎉|👏|🙌|incredible|fantastic|incrível|fantástico/i,
    agreement: /agree|exactly|true|right|indeed|concordo|exatamente|verdade|isso mesmo|com certeza/i,
    gratitude: /thank|thanks|obrigad[oa]|grateful|grato|agradec/i,
    question: /\?|how|what|why|when|como|qual|por ?qu[eê]|quando/i,
    insight: /great point|good point|interesting|insightful|bom ponto|boa observação|interessante/i,
    support: /keep going|keep it up|well done|good luck|boa sorte|continue|força|sucesso/i,
    personal: /i also|me too|same here|i had|in my experience|também|eu também|na minha experiência/i
};

function classifyCommentSentiment(text) {
    if (!text) return 'generic';
    for (var [sentiment, pattern] of
        Object.entries(SENTIMENT_PATTERNS)) {
        if (pattern.test(text)) return sentiment;
    }
    return 'generic';
}

var THREAD_STOP_WORDS = new Set([
    'this', 'that', 'with', 'from', 'your', 'about',
    'have', 'just', 'really', 'very', 'more', 'great',
    'good', 'nice', 'true', 'love', 'like', 'team',
    'para', 'isso', 'essa', 'esse', 'muito', 'mais',
    'com', 'sem', 'sobre', 'uma', 'como', 'você',
    'voce', 'isso', 'aqui', 'esse', 'essa', 'pra',
    'the', 'and', 'for', 'you', 'are', 'was', 'were',
    'not', 'but', 'all', 'can', 'our', 'their'
]);

function tokenizeGroundingText(text) {
    return ((text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ' ')
        .match(/[a-z0-9]{3,}/g)) || [];
}

function normalizeThreadToken(token) {
    return (token || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
}

function addThreadKeywords(text, keywordCounts) {
    var parts = (text || '').split(/\s+/);
    for (var part of parts) {
        var token = normalizeThreadToken(part);
        if (token.length < 4) continue;
        if (THREAD_STOP_WORDS.has(token)) continue;
        keywordCounts[token] = (keywordCounts[token] || 0) + 1;
    }
}

function addThreadPhrase(text, phraseCounts) {
    var cleaned = (text || '')
        .replace(/\s+/g, ' ').trim();
    if (cleaned.length < 12) return;
    var phrase = cleaned.split(/[.!?]/)[0]
        .split(/\s+/).slice(0, 8).join(' ')
        .toLowerCase();
    if (phrase.length < 10) return;
    phraseCounts[phrase] = (phraseCounts[phrase] || 0) + 1;
}

function getTopMapKeys(map, limit) {
    return Object.entries(map || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(function(item) { return item[0]; });
}

function getCommentThreadDefaults() {
    return {
        count: 0,
        dominantSentiment: 'generic',
        dominantLanguage: 'en',
        avgLength: 0,
        brevity: 'short',
        energy: 'balanced',
        exclamationRate: 0,
        emojiRate: 0,
        questionRate: 0,
        styleHint: 'neutral',
        commonOpeners: [],
        keywords: [],
        samplePhrases: []
    };
}

function getDominantBucket(counts, fallback) {
    var entries = Object.entries(counts || {});
    if (entries.length === 0) return fallback;
    return entries.sort((a, b) => b[1] - a[1])[0][0];
}

function collectCommentThreadStats(list) {
    var stats = {
        count: 0,
        totalLen: 0,
        exclam: 0,
        emojis: 0,
        questions: 0,
        sentiments: {},
        langs: {},
        openers: {},
        keywordCounts: {},
        phraseCounts: {}
    };
    var emojiRe = /[\u{1F300}-\u{1FAFF}]/u;
    for (var item of list) {
        var text = (item?.text || '').trim();
        if (!text) continue;
        stats.count++;
        stats.totalLen += text.length;
        var sentiment = item.sentiment ||
            classifyCommentSentiment(text);
        stats.sentiments[sentiment] =
            (stats.sentiments[sentiment] || 0) + 1;
        var lang = detectLanguage(text);
        stats.langs[lang] = (stats.langs[lang] || 0) + 1;
        if (text.includes('!')) stats.exclam++;
        if (emojiRe.test(text)) stats.emojis++;
        if (text.includes('?')) stats.questions++;
        addThreadKeywords(text, stats.keywordCounts);
        addThreadPhrase(text, stats.phraseCounts);
        var opener = text.split(/\s+/)
            .slice(0, 3).join(' ').toLowerCase();
        if (opener.length > 2) {
            stats.openers[opener] =
                (stats.openers[opener] || 0) + 1;
        }
    }
    return stats;
}

function mapSentimentToStyle(sentiment) {
    var styleMap = {
        celebration: 'congratulatory',
        support: 'supportive',
        insight: 'analytical',
        personal: 'personal',
        agreement: 'affirming',
        gratitude: 'grateful',
        question: 'curious',
        generic: 'neutral'
    };
    return styleMap[sentiment] || 'neutral';
}

function summarizeCommentThread(existingComments) {
    var list = Array.isArray(existingComments)
        ? existingComments : [];
    var defaults = getCommentThreadDefaults();
    if (list.length === 0) return defaults;

    var stats = collectCommentThreadStats(list);
    if (stats.count === 0) return defaults;

    var avgLength = Math.round(
        stats.totalLen / stats.count
    );
    var exclamRate = stats.exclam / stats.count;
    var emojiRate = stats.emojis / stats.count;
    var questionRate = stats.questions / stats.count;
    return {
        count: stats.count,
        dominantSentiment: getDominantBucket(
            stats.sentiments, 'generic'
        ),
        dominantLanguage: getDominantBucket(
            stats.langs, 'en'
        ),
        avgLength,
        brevity: avgLength < 70
            ? 'short' : avgLength < 140
                ? 'medium' : 'long',
        energy: (exclamRate > 0.35 || emojiRate > 0.25)
            ? 'high'
            : (exclamRate < 0.1 && emojiRate < 0.05)
                ? 'low' : 'balanced',
        exclamationRate: exclamRate,
        emojiRate: emojiRate,
        questionRate: questionRate,
        styleHint: mapSentimentToStyle(
            getDominantBucket(
                stats.sentiments, 'generic'
            )
        ),
        commonOpeners: getTopMapKeys(stats.openers, 2),
        keywords: getTopMapKeys(stats.keywordCounts, 6),
        samplePhrases: getTopMapKeys(stats.phraseCounts, 3)
    };
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

var COPY_GUARD_STOP_WORDS = new Set([
    'the', 'and', 'for', 'with', 'that', 'this',
    'from', 'are', 'was', 'were', 'have', 'has',
    'had', 'you', 'your', 'our', 'their', 'just',
    'very', 'more', 'about', 'como', 'para', 'com',
    'uma', 'que', 'isso', 'esse', 'essa', 'muito',
    'mais', 'dos', 'das', 'nos', 'nas', 'de', 'em'
]);

function normalizeCopyGuardText(text) {
    return (text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function tokenizeCopyGuard(text) {
    return normalizeCopyGuardText(text)
        .split(' ')
        .map(function(token) {
            return token.trim();
        })
        .filter(function(token) {
            return token.length >= 3 &&
                !COPY_GUARD_STOP_WORDS.has(token);
        });
}

function extractFourWordSnippets(tokens) {
    var snippets = new Set();
    if (!Array.isArray(tokens) || tokens.length < 4) {
        return snippets;
    }
    for (var i = 0; i <= tokens.length - 4; i++) {
        snippets.add(tokens.slice(i, i + 4).join(' '));
    }
    return snippets;
}

function buildCharTrigramSet(text) {
    var normalized = normalizeCopyGuardText(text);
    var compact = normalized.replace(/\s+/g, ' ').trim();
    var grams = new Set();
    if (!compact) return grams;
    if (compact.length < 3) {
        grams.add(compact);
        return grams;
    }
    for (var i = 0; i <= compact.length - 3; i++) {
        grams.add(compact.slice(i, i + 3));
    }
    return grams;
}

function roundCopyMetric(value) {
    return Math.round((Number(value) || 0) * 1000) / 1000;
}

function computeTokenContainment(baseTokens, referenceTokens) {
    if (!Array.isArray(baseTokens) || baseTokens.length === 0) {
        return 0;
    }
    var referenceSet = new Set(referenceTokens || []);
    var overlap = 0;
    for (var token of baseTokens) {
        if (referenceSet.has(token)) overlap++;
    }
    return overlap / baseTokens.length;
}

function computeJaccardSimilarity(setA, setB) {
    var a = setA instanceof Set ? setA : new Set();
    var b = setB instanceof Set ? setB : new Set();
    if (a.size === 0 && b.size === 0) return 0;
    var intersection = 0;
    for (var value of a) {
        if (b.has(value)) intersection++;
    }
    var unionSize = a.size + b.size - intersection;
    if (unionSize <= 0) return 0;
    return intersection / unionSize;
}

function assessCommentCopyRisk(comment, existingComments) {
    var normalized = normalizeCopyGuardText(comment);
    var commentTokens = tokenizeCopyGuard(comment);
    var commentSnippets = extractFourWordSnippets(commentTokens);
    var commentTrigrams = buildCharTrigramSet(comment);
    var diagnostics = {
        risky: false,
        tokenOverlap: 0,
        charSimilarity: 0,
        matchedSnippet: '',
        ruleHit: null
    };
    var list = Array.isArray(existingComments)
        ? existingComments : [];
    var bestRank = 99;
    for (var item of list) {
        var priorText = String(item?.text || '').trim();
        if (!priorText) continue;
        var priorNormalized = normalizeCopyGuardText(priorText);
        var priorTokens = tokenizeCopyGuard(priorText);
        var tokenOverlap = computeTokenContainment(
            commentTokens, priorTokens
        );
        var charSimilarity = computeJaccardSimilarity(
            commentTrigrams,
            buildCharTrigramSet(priorText)
        );
        var priorSnippets = extractFourWordSnippets(priorTokens);
        var matchedSnippet = '';
        for (var snippet of commentSnippets) {
            if (priorSnippets.has(snippet)) {
                matchedSnippet = snippet;
                break;
            }
        }
        var rank = 0;
        var ruleHit = null;
        if (normalized && priorNormalized &&
            normalized === priorNormalized) {
            rank = 1;
            ruleHit = 'exact-normalized';
        } else if (matchedSnippet) {
            rank = 2;
            ruleHit = 'shared-4gram';
        } else if (tokenOverlap >= 0.72) {
            rank = 3;
            ruleHit = 'high-token-containment';
        } else if (tokenOverlap >= 0.62 &&
            charSimilarity >= 0.82) {
            rank = 4;
            ruleHit = 'medium-token-high-char';
        } else if (commentTokens.length > 0 &&
            commentTokens.length <= 4 &&
            (tokenOverlap >= 0.9 ||
                charSimilarity >= 0.9)) {
            rank = 5;
            ruleHit = 'short-near-clone';
        }
        if (!ruleHit) continue;
        if (rank < bestRank ||
            (rank === bestRank && (
                tokenOverlap > diagnostics.tokenOverlap ||
                charSimilarity > diagnostics.charSimilarity
            ))) {
            bestRank = rank;
            diagnostics = {
                risky: true,
                tokenOverlap: roundCopyMetric(tokenOverlap),
                charSimilarity: roundCopyMetric(charSimilarity),
                matchedSnippet: matchedSnippet || '',
                ruleHit
            };
        }
    }
    return diagnostics;
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

function summarizeReactions(reactions) {
    var data = reactions && typeof reactions === 'object'
        ? reactions : {};
    var keys = [
        'LIKE',
        'PRAISE',
        'EMPATHY',
        'INTEREST',
        'ENTERTAINMENT',
        'APPRECIATION'
    ];
    var totalFromTypes = 0;
    var dominant = 'LIKE';
    var maxCount = -1;

    for (var key of keys) {
        var count = Number(data[key] || 0);
        totalFromTypes += count;
        if (count > maxCount) {
            maxCount = count;
            dominant = key;
        }
    }
    var total = Number.isFinite(data._total)
        ? Number(data._total) : totalFromTypes;
    var intensity = total >= 300
        ? 'high' : total >= 80 ? 'medium' : 'low';

    return { total, dominant, intensity };
}

function getPostImageSignals(postEl) {
    if (!postEl || !postEl.querySelectorAll) {
        return { hasImage: false, cues: [], samples: [] };
    }
    var imgs = postEl.querySelectorAll('img');
    var cues = new Set();
    var samples = [];
    var ignoreRe =
        /profile|avatar|logo|reaction|like|celebrate|support|insightful|funny|love/i;

    for (var img of imgs) {
        var raw = (img.getAttribute('alt') ||
            img.getAttribute('aria-label') ||
            img.getAttribute('title') || '').trim();
        if (!raw || ignoreRe.test(raw)) continue;
        var text = raw.toLowerCase();
        if (/chart|graph|metric|analytics|kpi|growth/i
            .test(text)) cues.add('chart');
        if (/screenshot|screen|ui|app|product|dashboard|website/i
            .test(text)) cues.add('product');
        if (/code|terminal|github|commit|deploy|debug/i
            .test(text)) cues.add('code');
        if (/certificate|certification|badge|diploma/i
            .test(text)) cues.add('certificate');
        if (/event|conference|talk|speaker|summit|webinar|stage/i
            .test(text)) cues.add('event');
        if (/team|people|colleagues|group|office/i
            .test(text)) cues.add('people');
        if (/slide|presentation|deck|book|document/i
            .test(text)) cues.add('document');
        if (samples.length < 2) {
            samples.push(raw.substring(0, 120));
        }
    }

    return {
        hasImage: samples.length > 0,
        cues: Array.from(cues).slice(0, 4),
        samples
    };
}

function parseCompactCountToken(token, suffix) {
    var raw = String(token || '').trim();
    if (!raw) return 0;
    var unit = String(suffix || '')
        .toLowerCase()
        .replace(/\s+/g, '');
    if (unit === 'k' || unit === 'm') {
        var scaled = parseFloat(raw.replace(',', '.'));
        if (!Number.isFinite(scaled)) return 0;
        return Math.round(scaled * (unit === 'm' ? 1000000 : 1000));
    }
    if (/^\d{1,3}([.,]\d{3})+$/.test(raw)) {
        return parseInt(raw.replace(/[.,]/g, ''), 10) || 0;
    }
    if (/^\d+,\d+$/.test(raw) || /^\d+\.\d+$/.test(raw)) {
        var value = parseFloat(raw.replace(',', '.'));
        if (!Number.isFinite(value)) return 0;
        return Math.round(value);
    }
    return parseInt(raw.replace(/[^\d]/g, ''), 10) || 0;
}

function extractCommentCountFromText(text) {
    var input = (text || '').replace(/\s+/g, ' ').trim();
    if (!input) return 0;
    var max = 0;
    var numberRe = /(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)(\s*[km])?\+?\s*(?:comments?|coment[aá]rios?|comentarios)\b/gi;
    var keywordRe = /\b(?:comments?|coment[aá]rios?|comentarios)\b\s*[:\-]?\s*(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)(\s*[km])?/gi;
    var match;
    while ((match = numberRe.exec(input)) !== null) {
        var count = parseCompactCountToken(match[1], match[2]);
        if (count > max) max = count;
    }
    while ((match = keywordRe.exec(input)) !== null) {
        var swapped = parseCompactCountToken(match[1], match[2]);
        if (swapped > max) max = swapped;
    }
    return max;
}

function getPostCommentSignal(postEl) {
    if (!postEl || !postEl.querySelectorAll) {
        return { count: 0, source: 'none' };
    }
    var roots = [postEl];
    var parent = postEl.parentElement;
    for (var i = 0; i < 3 && parent; i++) {
        roots.push(parent);
        parent = parent.parentElement;
    }
    var probes = [
        {
            source: 'social-counts',
            selector:
                '[data-testid*="social-counts"], ' +
                'span[class*="social-details-social-counts"]'
        },
        {
            source: 'comment-action',
            selector:
                'button[aria-label*="comment" i], ' +
                'a[aria-label*="comment" i], ' +
                'button[aria-label*="coment" i], ' +
                'a[aria-label*="coment" i]'
        },
        {
            source: 'visible-label',
            selector:
                'span[aria-label*="comment" i], ' +
                'span[aria-label*="coment" i], ' +
                'span[class*="comment"]'
        }
    ];
    var bestCount = 0;
    var bestSource = 'none';
    for (var root of roots) {
        for (var probe of probes) {
            var nodes = root.querySelectorAll(probe.selector);
            for (var node of nodes) {
                var blob = [
                    node.innerText || '',
                    node.textContent || '',
                    node.getAttribute('aria-label') || '',
                    node.getAttribute('title') || ''
                ].join(' ');
                var parsed = extractCommentCountFromText(blob);
                if (parsed > bestCount) {
                    bestCount = parsed;
                    bestSource = probe.source;
                }
            }
        }
    }
    if (bestCount > 0) {
        return { count: bestCount, source: bestSource };
    }
    var visible = getExistingComments(postEl).length;
    if (visible > 0) {
        return { count: visible, source: 'visible-thread' };
    }
    return { count: 0, source: 'none' };
}

function getExistingComments(postEl) {
    if (!postEl || !postEl.querySelector) return [];
    var listSelectors = [
        '[data-testid*="commentList"]',
        'ul.comments-comments-list',
        'ul[class*="comments-comment-list"]',
        'div[class*="comments-comment-list"]',
        'div[class*="comments-comments-list"]',
        'div[class*="comments-container"]'
    ];
    var commentList = null;
    var searchRoot = postEl;
    for (var depth = 0; depth < 4 && searchRoot; depth++) {
        for (var sel of listSelectors) {
            commentList = searchRoot.querySelector(sel);
            if (commentList) break;
        }
        if (commentList) break;
        searchRoot = searchRoot.parentElement;
    }

    var comments = [];
    var itemSelectors =
        'article.comments-comment-item, ' +
        'li.comments-comment-item, ' +
        'div[class*="comments-comment-item"], ' +
        '[data-urn*="comment"], [data-id*="comment"]';
    var itemNodes = [];
    if (commentList) {
        itemNodes = Array.from(
            commentList.querySelectorAll(itemSelectors)
        );
        if (itemNodes.length === 0) {
            itemNodes = Array.from(commentList.children);
        }
    } else {
        var fallbackRoot = postEl;
        for (var tries = 0; tries < 4 && fallbackRoot; tries++) {
            var found = fallbackRoot.querySelectorAll(
                itemSelectors
            );
            if (found.length > 0) {
                itemNodes = Array.from(found);
                break;
            }
            fallbackRoot = fallbackRoot.parentElement;
        }
    }
    var controlRe =
        /^(like|reply|responder|curtir|editar|edit|follow|seguir)$/i;
    for (var child of itemNodes) {
        var text = '';
        var textSelectors = [
            '[data-testid="expandable-text-box"]',
            'div[class*="comments-comment-item-content-body"]',
            'div[class*="comments-comment-item__main-content"]',
            'p',
            'span[dir="ltr"]'
        ];
        for (var textSel of textSelectors) {
            var textBox = child.querySelector(textSel);
            var rawText = (textBox?.innerText ||
                textBox?.textContent || '').trim();
            if (!rawText) continue;
            var filtered = rawText.split('\n')
                .map(function(line) {
                    return line.trim();
                })
                .filter(function(line) {
                    return line.length > 1 &&
                        !controlRe.test(line);
                })
                .join(' ')
                .trim();
            if (filtered.length > 1) {
                text = filtered;
                break;
            }
        }
        if (text.length < 2) continue;

        var authorLinks = child.querySelectorAll(
            'a[href*="/in/"]'
        );
        var author = 'Unknown';
        var badgeRe =
            /\s*(Premium Profile|Verified|Pro|Profile|\d+(st|nd|rd|th)\+?)\s*/gi;
        for (var al = 0; al < authorLinks.length; al++) {
            var raw = (authorLinks[al].innerText ||
                authorLinks[al].textContent || ''
            ).trim();
            if (raw.length < 3) continue;
            author = raw.split('\n')[0].trim()
                .replace(badgeRe, ' ').trim();
            if (author.length > 2) break;
        }
        comments.push({
            text: text,
            author: author,
            sentiment: classifyCommentSentiment(text)
        });
    }
    return comments;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getReactionType,
        classifyPost,
        buildCommentFromPost,
        extractTopic,
        extractKeyPhrase,
        extractConcepts,
        humanize,
        detectLanguage,
        isReactablePost,
        shouldSkipPost,
        isCompanyFollowText,
        getPostText,
        getPostAuthor,
        getPostAuthorTitle,
        getPostReactions,
        getPostUrn,
        isLowQualityComment,
        validateGeneratedCommentSafety,
        detectCareerTransitionSignals,
        isLikeButton,
        isCommentButton,
        getExistingComments,
        classifyCommentSentiment,
        summarizeCommentThread,
        analyzeCommentPatterns,
        summarizeReactions,
        getPostImageSignals,
        getPostCommentSignal,
        assessCommentCopyRisk,
        assessStrangerDistanceRisk,
        validateCommentPatternFit,
        isPolemicPost,
        BOILERPLATE_RE,
        SENTIMENT_PATTERNS,
        POST_CATEGORIES,
        CATEGORY_TEMPLATES,
        CATEGORY_TEMPLATES_PT,
        TOPIC_MAP
    };
}
