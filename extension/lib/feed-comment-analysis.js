// feed-comment-analysis.js
// Comment sentiment classification and thread summarization.
// Depends on feed-nlp-utils.js

if (typeof require === 'function' &&
    typeof module !== 'undefined' &&
    typeof detectLanguage === 'undefined') {
    var { detectLanguage, normalizeThreadToken } = require('./feed-nlp-utils.js');
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

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        classifyCommentSentiment,
        summarizeCommentThread,
        SENTIMENT_PATTERNS,
        THREAD_STOP_WORDS
    };
}
