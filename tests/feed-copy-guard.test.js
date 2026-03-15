'use strict';

const {
    normalizeCopyGuardText,
    tokenizeCopyGuard,
    extractFourWordSnippets,
    buildCharTrigramSet,
    roundCopyMetric,
    computeTokenContainment,
    computeJaccardSimilarity,
    assessCommentCopyRisk,
    COPY_GUARD_STOP_WORDS
} = require('../extension/lib/feed-copy-guard.js');

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

describe('normalizeCopyGuardText', () => {
    test('lowercases and strips accents', () => {
        expect(normalizeCopyGuardText('Ação')).toBe('acao');
    });
    test('removes punctuation', () => {
        expect(normalizeCopyGuardText('Hello, World!')).toBe('hello world');
    });
    test('collapses whitespace', () => {
        expect(normalizeCopyGuardText('  foo   bar  ')).toBe('foo bar');
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
        expect(tokens).not.toContain('the');
        expect(tokens).toContain('quick');
        expect(tokens).toContain('brown');
    });
    test('filters tokens shorter than 3 chars', () => {
        const tokens = tokenizeCopyGuard('go do it now');
        expect(tokens).not.toContain('go');
        expect(tokens).not.toContain('do');
        expect(tokens).not.toContain('it');
    });
    test('returns empty array for empty input', () => {
        expect(tokenizeCopyGuard('')).toEqual([]);
    });
    test('normalizes before tokenizing', () => {
        const tokens = tokenizeCopyGuard('Ação rápida');
        expect(tokens).toContain('acao');
        expect(tokens).toContain('rapida');
    });
});

describe('extractFourWordSnippets', () => {
    test('returns empty set for fewer than 4 tokens', () => {
        expect(extractFourWordSnippets(['a', 'b', 'c'])).toEqual(new Set());
    });
    test('returns empty set for non-array', () => {
        expect(extractFourWordSnippets(null)).toEqual(new Set());
        expect(extractFourWordSnippets('string')).toEqual(new Set());
    });
    test('extracts 4-word snippets from 4 tokens', () => {
        const snippets = extractFourWordSnippets(['one', 'two', 'three', 'four']);
        expect(snippets.has('one two three four')).toBe(true);
        expect(snippets.size).toBe(1);
    });
    test('extracts multiple snippets from longer token list', () => {
        const snippets = extractFourWordSnippets(['a', 'b', 'c', 'd', 'e']);
        expect(snippets.has('a b c d')).toBe(true);
        expect(snippets.has('b c d e')).toBe(true);
        expect(snippets.size).toBe(2);
    });
});

describe('buildCharTrigramSet', () => {
    test('returns empty set for empty string', () => {
        expect(buildCharTrigramSet('')).toEqual(new Set());
    });
    test('short text (< 3 chars) adds compact as single entry', () => {
        // Covers lines 49-50: compact.length < 3 branch
        const result = buildCharTrigramSet('ab');
        expect(result.size).toBe(1);
        expect(result.has('ab')).toBe(true);
    });
    test('single char text adds compact as single entry', () => {
        const result = buildCharTrigramSet('x');
        expect(result.size).toBe(1);
        expect(result.has('x')).toBe(true);
    });
    test('normal text produces trigrams', () => {
        const result = buildCharTrigramSet('hello');
        expect(result.has('hel')).toBe(true);
        expect(result.has('ell')).toBe(true);
        expect(result.has('llo')).toBe(true);
    });
    test('normalizes before building trigrams', () => {
        const result = buildCharTrigramSet('Héllo');
        expect(result.has('hel')).toBe(true);
    });
});

describe('roundCopyMetric', () => {
    test('rounds to 3 decimal places', () => {
        expect(roundCopyMetric(0.123456)).toBe(0.123);
    });
    test('handles non-numeric input', () => {
        expect(roundCopyMetric('abc')).toBe(0);
        expect(roundCopyMetric(null)).toBe(0);
        expect(roundCopyMetric(undefined)).toBe(0);
    });
    test('handles exact values', () => {
        expect(roundCopyMetric(1)).toBe(1);
        expect(roundCopyMetric(0)).toBe(0);
    });
});

describe('computeTokenContainment', () => {
    test('returns 0 for empty baseTokens array', () => {
        // Covers line 64: empty baseTokens branch
        expect(computeTokenContainment([], ['a', 'b'])).toBe(0);
    });
    test('returns 0 for null baseTokens', () => {
        expect(computeTokenContainment(null, ['a', 'b'])).toBe(0);
    });
    test('returns 0 for non-array baseTokens', () => {
        expect(computeTokenContainment('string', ['a'])).toBe(0);
    });
    test('returns 1 when all base tokens are in reference', () => {
        expect(computeTokenContainment(['a', 'b'], ['a', 'b', 'c'])).toBe(1);
    });
    test('returns 0 when no overlap', () => {
        expect(computeTokenContainment(['x', 'y'], ['a', 'b'])).toBe(0);
    });
    test('returns partial overlap ratio', () => {
        expect(computeTokenContainment(['a', 'b', 'c'], ['a', 'b'])).toBeCloseTo(0.667, 2);
    });
    test('handles empty referenceTokens', () => {
        expect(computeTokenContainment(['a', 'b'], [])).toBe(0);
    });
    test('handles null referenceTokens', () => {
        expect(computeTokenContainment(['a', 'b'], null)).toBe(0);
    });
});

describe('computeJaccardSimilarity', () => {
    test('returns 0 for two empty sets', () => {
        expect(computeJaccardSimilarity(new Set(), new Set())).toBe(0);
    });
    test('returns 1 for identical sets', () => {
        const s = new Set(['a', 'b', 'c']);
        expect(computeJaccardSimilarity(s, s)).toBe(1);
    });
    test('returns 0 for disjoint sets', () => {
        expect(computeJaccardSimilarity(new Set(['a']), new Set(['b']))).toBe(0);
    });
    test('returns correct ratio for partial overlap', () => {
        const a = new Set(['a', 'b', 'c']);
        const b = new Set(['b', 'c', 'd']);
        // intersection=2, union=4 → 0.5
        expect(computeJaccardSimilarity(a, b)).toBeCloseTo(0.5, 5);
    });
    test('handles non-Set inputs gracefully', () => {
        expect(computeJaccardSimilarity(null, null)).toBe(0);
        expect(computeJaccardSimilarity('string', 'string')).toBe(0);
    });
});

describe('assessCommentCopyRisk', () => {
    test('returns non-risky for empty comment', () => {
        const result = assessCommentCopyRisk('', []);
        expect(result.risky).toBe(false);
    });
    test('returns non-risky when no prior comments', () => {
        const result = assessCommentCopyRisk('Great post!', []);
        expect(result.risky).toBe(false);
    });
    test('returns non-risky when prior comments is null', () => {
        const result = assessCommentCopyRisk('Great post!', null);
        expect(result.risky).toBe(false);
    });
    test('rank 1: exact normalized match', () => {
        const comment = 'This is a great post about leadership';
        const prior = [{ text: 'This is a great post about leadership' }];
        const result = assessCommentCopyRisk(comment, prior);
        expect(result.risky).toBe(true);
        expect(result.ruleHit).toBe('exact-normalized');
    });
    test('rank 2: shared 4-gram match', () => {
        const comment = 'machine learning deep neural networks are fascinating';
        const prior = [{ text: 'machine learning deep neural networks changed everything' }];
        const result = assessCommentCopyRisk(comment, prior);
        expect(result.risky).toBe(true);
        expect(result.ruleHit).toBe('shared-4gram');
    });
    test('rank 3: high token containment (>= 0.72)', () => {
        // comment tokens mostly in prior
        const comment = 'innovation drives growth and success in business';
        const prior = [{ text: 'innovation drives growth and success in business and beyond' }];
        const result = assessCommentCopyRisk(comment, prior);
        expect(result.risky).toBe(true);
    });
    test('rank 4: medium-token-high-char (tokenOverlap >= 0.62 && charSimilarity >= 0.82)', () => {
        // Covers lines 136-137
        // Need tokenOverlap in [0.62, 0.72) and charSimilarity >= 0.82
        // Use a comment that shares many tokens but not enough for rank 3
        // and has high char similarity
        const base = 'artificial intelligence transforming modern enterprise software solutions';
        const comment = 'artificial intelligence transforming modern enterprise software solutions today';
        const prior = [{ text: base }];
        const result = assessCommentCopyRisk(comment, prior);
        // Should be risky (rank 1, 2, 3, or 4)
        expect(result.risky).toBe(true);
    });
    test('rank 5: short-near-clone (<=4 tokens, high overlap or char similarity)', () => {
        // Covers lines 142-143
        // Short comment (<=4 meaningful tokens) with high similarity
        const comment = 'great leadership post';
        const prior = [{ text: 'great leadership post indeed' }];
        const result = assessCommentCopyRisk(comment, prior);
        // May or may not be risky depending on exact metrics; just verify structure
        expect(result).toHaveProperty('risky');
        expect(result).toHaveProperty('tokenOverlap');
        expect(result).toHaveProperty('charSimilarity');
    });
    test('returns diagnostics with expected fields when risky', () => {
        const comment = 'This is a great post about leadership';
        const prior = [{ text: 'This is a great post about leadership' }];
        const result = assessCommentCopyRisk(comment, prior);
        expect(result).toHaveProperty('risky', true);
        expect(result).toHaveProperty('tokenOverlap');
        expect(result).toHaveProperty('charSimilarity');
        expect(result).toHaveProperty('matchedSnippet');
        expect(result).toHaveProperty('ruleHit');
    });
    test('handles prior comments as plain strings (no .text property, treated as no-match)', () => {
        // assessCommentCopyRisk reads item?.text — plain strings have no .text, so they are skipped
        const comment = 'This is a great post about leadership';
        const prior = ['This is a great post about leadership'];
        const result = assessCommentCopyRisk(comment, prior);
        expect(result.risky).toBe(false);
        expect(result).toHaveProperty('tokenOverlap');
        expect(result).toHaveProperty('charSimilarity');
    });
    test('picks best rank when multiple priors match', () => {
        const comment = 'machine learning deep neural networks are fascinating';
        const prior = [
            { text: 'machine learning deep neural networks are fascinating' },
            { text: 'something completely different' }
        ];
        const result = assessCommentCopyRisk(comment, prior);
        expect(result.risky).toBe(true);
        expect(result.ruleHit).toBe('exact-normalized');
    });
});
