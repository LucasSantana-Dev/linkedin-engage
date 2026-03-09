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

function buildCommentFromPost(
    postText, userTemplates, existingComments
) {
    const category = classifyPost(postText);
    const lang = detectLanguage(postText);

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
        return comment;
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
        return humanize(comment);
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
    const templatePool = templates[category] ||
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

    return humanize(comment);
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
        commonOpeners: []
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
        openers: {}
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
        commonOpeners: Object.entries(stats.openers)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2)
            .map(e => e[0])
    };
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

function getExistingComments(postEl) {
    if (!postEl || !postEl.querySelector) return [];
    var commentList = postEl.querySelector(
        '[data-testid*="commentList"]'
    );
    if (!commentList) {
        var parent = postEl.parentElement;
        for (var i = 0; i < 3 && parent; i++) {
            commentList = parent.querySelector(
                '[data-testid*="commentList"]'
            );
            if (commentList) break;
            parent = parent.parentElement;
        }
    }
    if (!commentList) return [];

    var comments = [];
    var children = commentList.children;
    for (var c = 0; c < children.length; c++) {
        var child = children[c];
        var textBox = child.querySelector(
            '[data-testid="expandable-text-box"]'
        );
        if (!textBox) continue;
        var text = (textBox.innerText ||
            textBox.textContent || '').trim();
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
        isLikeButton,
        isCommentButton,
        getExistingComments,
        classifyCommentSentiment,
        summarizeCommentThread,
        summarizeReactions,
        getPostImageSignals,
        isPolemicPost,
        BOILERPLATE_RE,
        SENTIMENT_PATTERNS,
        POST_CATEGORIES,
        CATEGORY_TEMPLATES,
        CATEGORY_TEMPLATES_PT,
        TOPIC_MAP
    };
}
