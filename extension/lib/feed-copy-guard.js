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

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        normalizeCopyGuardText,
        tokenizeCopyGuard,
        extractFourWordSnippets,
        buildCharTrigramSet,
        roundCopyMetric,
        computeTokenContainment,
        computeJaccardSimilarity,
        assessCommentCopyRisk,
        COPY_GUARD_STOP_WORDS
    };
}
