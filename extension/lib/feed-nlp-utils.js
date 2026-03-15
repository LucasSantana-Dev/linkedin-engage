if (typeof require === 'function' &&
    typeof module !== 'undefined' &&
    typeof TOPIC_MAP === 'undefined') {
    var {
        TOPIC_MAP, PT_MARKERS, CONCEPT_PATTERNS
    } = require('./templates.js');
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

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        extractTopic,
        detectLanguage,
        extractKeyPhrase,
        extractConcepts,
        tokenizeGroundingText,
        normalizeThreadToken
    };
}
