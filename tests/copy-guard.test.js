'use strict';

const {
    normalizeCompareText,
    normalizeCopyGuardText,
    tokenizeCopyGuard,
    extractFourWordSnippets,
    buildCharTrigramSet,
    roundCopyMetric,
    computeTokenContainment,
    computeJaccardSimilarity,
    assessCommentCopyRisk,
    COPY_GUARD_STOP_WORDS
} = require('../extension/lib/copy-guard.js');

describe('COPY_GUARD_STOP_WORDS', () => {
    test('is a Set', () => {
        expect(COPY_GUARD_STOP_WORDS).toBeInstanceOf(Set);
    });
    test('contains common EN stop words', () => {
        expect(COPY_GUARD_STOP_WORDS.has('the')).toBe(true);
        expect(COPY_GUARD_STOP_WORDS.has('and')).toBe(true);
    });
    test('contains common PT stop words', () => {
        expect(COPY_GUARD_STOP_WORDS.has('que')).toBe(true);
        expect(COPY_GUARD_STOP_WORDS.has('para')).toBe(true);
    });
});

describe('normalizeCompareText', () => {
    test('lowercases text', () => {
        expect(normalizeCompareText('Hello')).toBe('hello');
    });
    test('removes punctuation', () => {
        expect(normalizeCompareText('Hello, World!')).toBe('hello world');
    });
    test('collapses whitespace', () => {
        expect(normalizeCompareText('  foo   bar  ')).toBe('foo bar');
    });
    test('handles null/undefined', () => {
        expect(normalizeCompareText(null)).toBe('');
        expect(normalizeCompareText(undefined)).toBe('');
    });
    test('handles empty string', () => {
        expect(normalizeCompareText('')).toBe('');
    });
});

describe('normalizeCopyGuardText', () => {
    test('lowercases and strips accents (PT-BR)', () => {
        expect(normalizeCopyGuardText('Ação')).toBe('acao');
    });
    test('removes punctuation', () => {
        expect(normalizeCopyGuardText('Hello, World!')).toBe('hello world');
    });
    test('collapses whitespace', () => {
        expect(normalizeCopyGuardText('  foo   bar  ')).toBe('foo bar');
    });
    test('applies NFD normalization', () => {
        expect(normalizeCopyGuardText('café')).toBe('cafe');
    });
    test('handles null/undefined', () => {
        expect(normalizeCopyGuardText(null)).toBe('');
        expect(normalizeCopyGuardText(undefined)).toBe('');
    });
    test('handles empty string', () => {
        expect(normalizeCopyGuardText('')).toBe('');
    });
});

describe('tokenizeCopyGuard', () => {
    test('filters stop words and short tokens', () => {
        const tokens = tokenizeCopyGuard('the quick brown fox');
        expect(tokens).toEqual(['quick', 'brown', 'fox']);
    });
    test('filters tokens shorter than 3 chars', () => {
        const tokens = tokenizeCopyGuard('go do it now');
        expect(tokens).toEqual(['now']);
    });
    test('handles empty input', () => {
        expect(tokenizeCopyGuard('')).toEqual([]);
    });
    test('handles PT-BR text and filters stop words', () => {
        // 'Ação rápida de' -> 'acao rapida de', acao is not a stop word, de is        const tokens = tokenizeCopyGuard('Ação rápida de');        expect(tokens).toEqual(['acao', 'rapida']);
        // 'Ação rápida de' -> 'acao rapida de', acao is not a stop word, de is        const tokens = tokenizeCopyGuard('Ação rápida de');        expect(tokens).toEqual(['acao', 'rapida']);
        // 'Ação rápida de' -> 'acao rapida de', acao is not a stop word, de is        const tokens = tokenizeCopyGuard('Ação rápida de');        expect(tokens).toEqual(['acao', 'rapida']);
    });
    test('returns array of strings', () => {
        const tokens = tokenizeCopyGuard('amazing opportunity here');
        expect(Array.isArray(tokens)).toBe(true);
        expect(tokens.every(t => typeof t === 'string')).toBe(true);
    });
});

describe('extractFourWordSnippets', () => {
    test('returns N-3 snippets for N tokens (4 tokens)', () => {
        const tokens = ['one', 'two', 'three', 'four'];
        const snippets = extractFourWordSnippets(tokens);
        expect(snippets.size).toBe(1);
        expect(snippets.has('one two three four')).toBe(true);
    });
    test('returns N-3 snippets for N tokens (5 tokens)', () => {
        const tokens = ['one', 'two', 'three', 'four', 'five'];
        const snippets = extractFourWordSnippets(tokens);
        expect(snippets.size).toBe(2);
        expect(snippets.has('one two three four')).toBe(true);
        expect(snippets.has('two three four five')).toBe(true);
    });
    test('returns empty set for fewer than 4 tokens', () => {
        expect(extractFourWordSnippets(['one', 'two', 'three'])).toEqual(new Set());
        expect(extractFourWordSnippets(['one'])).toEqual(new Set());
        expect(extractFourWordSnippets([])).toEqual(new Set());
    });
    test('returns Set instance', () => {
        const tokens = ['one', 'two', 'three', 'four'];
        const snippets = extractFourWordSnippets(tokens);
        expect(snippets).toBeInstanceOf(Set);
    });
});

describe('buildCharTrigramSet', () => {
    test('builds trigrams for text with length >= 3', () => {
        const trigrams = buildCharTrigramSet('abc');
        expect(trigrams).toBeInstanceOf(Set);
        expect(trigrams.has('abc')).toBe(true);
        expect(trigrams.size).toBe(1);
    });
    test('builds multiple trigrams for longer text', () => {
        const trigrams = buildCharTrigramSet('abcd');
        expect(trigrams.size).toBe(2);
        expect(trigrams.has('abc')).toBe(true);
        expect(trigrams.has('bcd')).toBe(true);
    });
    test('returns text itself for length < 3', () => {
        const trigrams = buildCharTrigramSet('ab');
        expect(trigrams.has('ab')).toBe(true);
    });
    test('handles empty text', () => {
        const trigrams = buildCharTrigramSet('');
        expect(trigrams.size).toBe(0);
    });
    test('builds trigrams including space characters', () => {        const trigrams = buildCharTrigramSet('foo bar');        expect(trigrams.has('foo')).toBe(true);        expect(trigrams.has('bar')).toBe(true);        expect(trigrams.size).toBeGreaterThan(2);    });
    test('builds trigrams including space characters', () => {        const trigrams = buildCharTrigramSet('foo bar');        expect(trigrams.has('foo')).toBe(true);        expect(trigrams.has('bar')).toBe(true);        expect(trigrams.size).toBeGreaterThan(2);    });
    test('builds trigrams including space characters', () => {        const trigrams = buildCharTrigramSet('foo bar');        expect(trigrams.has('foo')).toBe(true);        expect(trigrams.has('bar')).toBe(true);        expect(trigrams.size).toBeGreaterThan(2);    });
    test('builds trigrams including space characters', () => {        const trigrams = buildCharTrigramSet('foo bar');        expect(trigrams.has('foo')).toBe(true);        expect(trigrams.has('bar')).toBe(true);        expect(trigrams.size).toBeGreaterThan(2);    });
    test('builds trigrams including space characters', () => {        const trigrams = buildCharTrigramSet('foo bar');        expect(trigrams.has('foo')).toBe(true);        expect(trigrams.has('bar')).toBe(true);        expect(trigrams.size).toBeGreaterThan(2);    });
});

describe('roundCopyMetric', () => {
    test('rounds to 3 decimal places', () => {
        expect(roundCopyMetric(0.123456)).toBe(0.123);
    });
    test('handles rounding up', () => {
        expect(roundCopyMetric(0.1235)).toBe(0.124);
    });
    test('handles rounding down', () => {
        expect(roundCopyMetric(0.1234)).toBe(0.123);
    });
    test('handles zero', () => {
        expect(roundCopyMetric(0)).toBe(0);
    });
    test('handles one', () => {
        expect(roundCopyMetric(1)).toBe(1);
    });
    test('handles null/undefined', () => {
        expect(roundCopyMetric(null)).toBe(0);
        expect(roundCopyMetric(undefined)).toBe(0);
    });
});

describe('computeTokenContainment', () => {
    test('returns 0 for empty base tokens', () => {
        expect(computeTokenContainment([], ['foo', 'bar'])).toBe(0);
    });
    test('returns 0 for null base tokens', () => {
        expect(computeTokenContainment(null, ['foo', 'bar'])).toBe(0);
    });
    test('returns full ratio for complete containment', () => {
        const containment = computeTokenContainment(
            ['foo', 'bar'],
            ['foo', 'bar', 'baz']
        );
        expect(containment).toBe(1);
    });
    test('returns partial ratio for partial containment', () => {
        const containment = computeTokenContainment(
            ['foo', 'bar', 'baz'],
            ['foo', 'bar']
        );
        expect(containment).toBe(2 / 3);
    });
    test('returns 0 for no overlap', () => {
        expect(computeTokenContainment(['foo'], ['bar', 'baz'])).toBe(0);
    });
});

describe('computeJaccardSimilarity', () => {
    test('returns 0 for both-empty sets', () => {
        expect(computeJaccardSimilarity(new Set(), new Set())).toBe(0);
    });
    test('returns 1 for identical sets', () => {
        const setA = new Set(['foo', 'bar']);
        const setB = new Set(['foo', 'bar']);
        expect(computeJaccardSimilarity(setA, setB)).toBe(1);
    });
    test('returns intersection/union for partial overlap', () => {
        const setA = new Set(['a', 'b', 'c']);
        const setB = new Set(['b', 'c', 'd']);
        // intersection = {b, c} = 2
        // union = {a, b, c, d} = 4
        // Jaccard = 2/4 = 0.5
        expect(computeJaccardSimilarity(setA, setB)).toBe(0.5);
    });
    test('returns 0 for disjoint sets', () => {
        const setA = new Set(['a', 'b']);
        const setB = new Set(['c', 'd']);
        expect(computeJaccardSimilarity(setA, setB)).toBe(0);
    });
    test('handles non-Set inputs gracefully', () => {
        expect(computeJaccardSimilarity(null, null)).toBe(0);
        expect(computeJaccardSimilarity({}, {})).toBe(0);
    });
});

describe('assessCommentCopyRisk', () => {
    test('returns not risky for empty existing comments', () => {
        const result = assessCommentCopyRisk('Great post!', []);
        expect(result.risky).toBe(false);
        expect(result.ruleHit).toBe(null);
    });
    test('returns not risky for null existing comments', () => {
        const result = assessCommentCopyRisk('Great post!', null);
        expect(result.risky).toBe(false);
    });
    test('detects exact-normalized match (rule 1)', () => {
        const comment = 'Amazing opportunity!';
        const prior = [{ text: 'Amazing opportunity!!!' }];
        const result = assessCommentCopyRisk(comment, prior);
        expect(result.risky).toBe(true);
        expect(result.ruleHit).toBe('exact-normalized');
    });
    test('detects shared-4gram rule hit (rule 2)', () => {
        const comment = 'excellent amazing wonderful fantastic';
        const prior = [{ text: 'excellent amazing wonderful fantastic forever' }];
        const result = assessCommentCopyRisk(comment, prior);
        expect(result.risky).toBe(true);
        expect(result.ruleHit).toBe('shared-4gram');
    });
    test('detects high-token-containment rule hit (rule 3)', () => {
        const comment = 'congratulations on your new job today';
        const prior = [{ text: 'congratulations your new job' }];
        const result = assessCommentCopyRisk(comment, prior);
        expect(result.risky).toBe(true);
        expect(result.ruleHit).toBe('high-token-containment');
    });
    test('ranks exact-normalized (1) as highest priority risk', () => {
        const comment = 'Great post!';
        const priors = [
            { text: 'Great post!!!' },
            { text: 'Great post indeed here today' }
        ];
        const result = assessCommentCopyRisk(comment, priors);
        expect(result.ruleHit).toBe('exact-normalized');
    });
    test('ranks shared-4gram (2) above token-containment (3)', () => {
        const comment = 'amazing excellent wonderful fantastic';
        const priors = [
            { text: 'amazing excellent wonderful fantastic things' },
            { text: 'amazing excellent wonderful different' }
        ];
        const result = assessCommentCopyRisk(comment, priors);
        expect(result.ruleHit).toBe('shared-4gram');
    });
    test('detects short-near-clone rule hit (rule 5)', () => {
        const comment = 'excellent work';
        const prior = [{ text: 'excellent works' }];
        const result = assessCommentCopyRisk(comment, prior);
        expect(result.risky).toBe(true);
        expect(result.ruleHit).toBe('short-near-clone');
    });
    test('includes tokenOverlap and charSimilarity metrics', () => {
        const comment = 'excellent work amazing';
        const prior = [{ text: 'excellent work amazing' }];
        const result = assessCommentCopyRisk(comment, prior);
        expect(typeof result.tokenOverlap).toBe('number');
        expect(typeof result.charSimilarity).toBe('number');
    });
    test('includes matchedSnippet when shared-4gram rule hits', () => {
        const comment = 'excellent amazing wonderful fantastic';
        const prior = [{ text: 'excellent amazing wonderful fantastic forever' }];
        const result = assessCommentCopyRisk(comment, prior);
        expect(result.ruleHit).toBe('shared-4gram');
        expect(result.matchedSnippet).toBe('excellent amazing wonderful fantastic');
    });
    test('skips items without text property', () => {
        const comment = 'great post';
        const priors = ['string item', { noText: 'property' }, { text: '' }];
        const result = assessCommentCopyRisk(comment, priors);
        expect(result.risky).toBe(false);
    });
    test('returns diagnostics object with required fields', () => {
        const result = assessCommentCopyRisk('test', []);
        expect(result).toHaveProperty('risky');
        expect(result).toHaveProperty('tokenOverlap');
        expect(result).toHaveProperty('charSimilarity');
        expect(result).toHaveProperty('matchedSnippet');
        expect(result).toHaveProperty('ruleHit');
    });
});
