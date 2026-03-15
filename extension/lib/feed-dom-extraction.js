if (typeof require === 'function' &&
    typeof module !== 'undefined' &&
    typeof classifyCommentSentiment === 'undefined') {
    var { classifyCommentSentiment } = require('./feed-comment-analysis.js');
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
        isReactablePost,
        shouldSkipPost,
        isCompanyFollowText,
        getPostText,
        getPostAuthor,
        getPostAuthorTitle,
        getPostReactions,
        getPostUrn,
        isLikeButton,
        isCommentButton,
        summarizeReactions,
        getPostImageSignals,
        parseCompactCountToken,
        extractCommentCountFromText,
        getPostCommentSignal,
        getExistingComments,
        BOILERPLATE_RE
    };
}
