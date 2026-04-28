'use strict';

const {
    formatReactionContext,
    inferAuthorRoleTone,
    formatThreadStyleContext,
    formatThreadTopicContext,
    formatImageContext,
    formatEngagementContext,
    formatPatternProfileContext,
    formatLearnedPatternContext
} = require('../extension/lib/ai-context-formatters');

describe('AI context formatters contract', () => {
    it('exports all expected functions', () => {
        expect(typeof formatReactionContext).toBe('function');
        expect(typeof inferAuthorRoleTone).toBe('function');
        expect(typeof formatThreadStyleContext).toBe('function');
        expect(typeof formatThreadTopicContext).toBe('function');
        expect(typeof formatImageContext).toBe('function');
        expect(typeof formatEngagementContext).toBe('function');
        expect(typeof formatPatternProfileContext).toBe('function');
        expect(typeof formatLearnedPatternContext).toBe('function');
    });

    it('freezes the public API', () => {
        const lib = require('../extension/lib/ai-context-formatters');
        expect(Object.isFrozen(lib)).toBe(true);
    });
});

describe('formatReactionContext', () => {
    test('happy path: formats all reaction types', () => {
        const reactions = {
            ENTERTAINMENT: 5,
            PRAISE: 10,
            EMPATHY: 3,
            INTEREST: 8,
            APPRECIATION: 2,
            LIKE: 15
        };
        const result = formatReactionContext(reactions);
        expect(result).toContain('Reactions:');
        expect(result).toContain('5 Funny');
        expect(result).toContain('10 Celebrate');
        expect(result).toContain('3 Support');
        expect(result).toContain('8 Insightful');
        expect(result).toContain('2 Love');
        expect(result).toContain('15 Like');
    });

    test('formats partial reactions', () => {
        const reactions = {
            LIKE: 5,
            PRAISE: 3
        };
        const result = formatReactionContext(reactions);
        expect(result).toContain('Reactions:');
        expect(result).toContain('5 Like');
        expect(result).toContain('3 Celebrate');
    });

    test('returns empty string for null', () => {
        expect(formatReactionContext(null)).toBe('');
    });

    test('returns empty string for undefined', () => {
        expect(formatReactionContext(undefined)).toBe('');
    });

    test('returns empty string for non-object', () => {
        expect(formatReactionContext('not an object')).toBe('');
        expect(formatReactionContext(123)).toBe('');
    });

    test('returns empty string for empty object', () => {
        expect(formatReactionContext({})).toBe('');
    });

    test('returns empty string for object with zero values', () => {
        const reactions = {
            LIKE: 0,
            PRAISE: 0
        };
        expect(formatReactionContext(reactions)).toBe('');
    });
});

describe('inferAuthorRoleTone', () => {
    test('identifies recruitment/HR roles', () => {
        expect(inferAuthorRoleTone('Recruiter')).toBe('career and people-focused');
        expect(inferAuthorRoleTone('Talent Acquisition Manager')).toBe('career and people-focused');
        expect(inferAuthorRoleTone('HR Manager')).toBe('career and people-focused');
        expect(inferAuthorRoleTone('People Ops Coordinator')).toBe('career and people-focused');
    });

    test('identifies leadership roles', () => {
        expect(inferAuthorRoleTone('CEO')).toBe('strategic and leadership-focused');
        expect(inferAuthorRoleTone('Founder')).toBe('strategic and leadership-focused');
        expect(inferAuthorRoleTone('VP of Engineering')).toBe('strategic and leadership-focused');
        expect(inferAuthorRoleTone('Head of Product')).toBe('strategic and leadership-focused');
        expect(inferAuthorRoleTone('Director of Sales')).toBe('strategic and leadership-focused');
    });

    test('identifies technical roles', () => {
        expect(inferAuthorRoleTone('Software Engineer')).toBe('technical peer-to-peer');
        expect(inferAuthorRoleTone('Data Engineer')).toBe('technical peer-to-peer');
        expect(inferAuthorRoleTone('DevOps Architect')).toBe('technical peer-to-peer');
        expect(inferAuthorRoleTone('CTO')).toBe('technical peer-to-peer');
    });

    test('identifies product/design roles', () => {
        expect(inferAuthorRoleTone('Product Manager')).toBe('product and execution-focused');
        expect(inferAuthorRoleTone('UX Designer')).toBe('product and execution-focused');
        expect(inferAuthorRoleTone('UI/UX Lead')).toBe('product and execution-focused');
    });

    test('returns default for unknown roles', () => {
        expect(inferAuthorRoleTone('Sales Representative')).toBe('professional and practical');
        expect(inferAuthorRoleTone('Consultant')).toBe('professional and practical');
    });

    test('returns empty string for null', () => {
        expect(inferAuthorRoleTone(null)).toBe('');
    });

    test('returns empty string for undefined', () => {
        expect(inferAuthorRoleTone(undefined)).toBe('');
    });

    test('returns empty string for empty string', () => {
        expect(inferAuthorRoleTone('')).toBe('');
    });

    test('is case-insensitive', () => {
        expect(inferAuthorRoleTone('ENGINEER')).toBe('technical peer-to-peer');
        expect(inferAuthorRoleTone('engineer')).toBe('technical peer-to-peer');
        expect(inferAuthorRoleTone('Engineer')).toBe('technical peer-to-peer');
    });
});

describe('formatThreadStyleContext', () => {
    test('happy path: formats thread style', () => {
        const summary = {
            count: 5,
            styleHint: 'professional',
            dominantSentiment: 'positive',
            brevity: 'short',
            energy: 'high',
            commonOpeners: ['Great point', 'Thanks for sharing']
        };
        const result = formatThreadStyleContext(summary);
        expect(result).toContain('Comment thread style:');
        expect(result).toContain('dominant tone: professional');
        expect(result).toContain('dominant sentiment: positive');
        expect(result).toContain('length style: short');
        expect(result).toContain('energy: high');
        expect(result).toContain('Great point | Thanks for sharing');
    });

    test('formats without commonOpeners', () => {
        const summary = {
            count: 3,
            styleHint: 'technical',
            dominantSentiment: 'neutral',
            brevity: 'medium',
            energy: 'low'
        };
        const result = formatThreadStyleContext(summary);
        expect(result).toContain('Comment thread style:');
        expect(result).not.toContain('Common openings');
    });

    test('returns empty string for null', () => {
        expect(formatThreadStyleContext(null)).toBe('');
    });

    test('returns empty string for undefined', () => {
        expect(formatThreadStyleContext(undefined)).toBe('');
    });

    test('returns empty string for missing count', () => {
        const summary = {
            styleHint: 'professional'
        };
        expect(formatThreadStyleContext(summary)).toBe('');
    });

    test('returns empty string for count = 0', () => {
        const summary = {
            count: 0,
            styleHint: 'professional'
        };
        expect(formatThreadStyleContext(summary)).toBe('');
    });

    test('limits commonOpeners to 2', () => {
        const summary = {
            count: 5,
            styleHint: 'technical',
            dominantSentiment: 'positive',
            brevity: 'medium',
            energy: 'high',
            commonOpeners: ['One', 'Two', 'Three', 'Four']
        };
        const result = formatThreadStyleContext(summary);
        expect(result).toContain('One | Two');
        expect(result).not.toContain('Three');
    });
});

describe('formatThreadTopicContext', () => {
    test('happy path: formats thread topic', () => {
        const summary = {
            count: 3,
            keywords: ['javascript', 'performance', 'optimization'],
            samplePhrases: ['code review best practices', 'performance tuning']
        };
        const result = formatThreadTopicContext(summary);
        expect(result).toContain('Thread keywords:');
        expect(result).toContain('javascript');
        expect(result).toContain('Thread phrase samples:');
        expect(result).toContain('code review best practices | performance tuning');
    });

    test('formats without keywords', () => {
        const summary = {
            count: 2
        };
        const result = formatThreadTopicContext(summary);
        expect(result).toBe('');
    });

    test('limits keywords to 6', () => {
        const summary = {
            count: 3,
            keywords: ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'],
            samplePhrases: []
        };
        const result = formatThreadTopicContext(summary);
        expect(result).toContain('one, two, three, four, five, six');
        expect(result).not.toContain('seven');
    });

    test('limits samplePhrases to 2', () => {
        const summary = {
            count: 3,
            keywords: [],
            samplePhrases: ['phrase1', 'phrase2', 'phrase3']
        };
        const result = formatThreadTopicContext(summary);
        expect(result).toContain('phrase1 | phrase2');
        expect(result).not.toContain('phrase3');
    });

    test('returns empty string for null', () => {
        expect(formatThreadTopicContext(null)).toBe('');
    });

    test('returns empty string for missing count', () => {
        expect(formatThreadTopicContext({})).toBe('');
    });

    test('handles non-array keywords gracefully', () => {
        const summary = {
            count: 3,
            keywords: 'not an array',
            samplePhrases: []
        };
        const result = formatThreadTopicContext(summary);
        expect(result).toBe('');
    });
});

describe('formatImageContext', () => {
    test('happy path: formats image context', () => {
        const signals = {
            hasImage: true,
            cues: ['product photo', 'diagram'],
            samples: ['Apple Watch', 'dashboard']
        };
        const result = formatImageContext(signals);
        expect(result).toContain('Visual context: post has image(s).');
        expect(result).toContain('Image cues:');
        expect(result).toContain('product photo');
        expect(result).toContain('Image text hints:');
        expect(result).toContain('Apple Watch | dashboard');
    });

    test('returns empty string for hasImage = false', () => {
        const signals = {
            hasImage: false,
            cues: ['photo'],
            samples: ['text']
        };
        expect(formatImageContext(signals)).toBe('');
    });

    test('returns empty string for null', () => {
        expect(formatImageContext(null)).toBe('');
    });

    test('returns empty string for undefined', () => {
        expect(formatImageContext(undefined)).toBe('');
    });

    test('handles missing cues and samples', () => {
        const signals = {
            hasImage: true
        };
        const result = formatImageContext(signals);
        expect(result).toContain('Visual context: post has image(s).');
    });

    test('limits image text hints to 2 samples', () => {
        const signals = {
            hasImage: true,
            cues: [],
            samples: ['one', 'two', 'three', 'four']
        };
        const result = formatImageContext(signals);
        expect(result).toContain('one | two');
        expect(result).not.toContain('three');
    });
});

describe('formatEngagementContext', () => {
    test('happy path: formats engagement context', () => {
        const summary = {
            total: 150,
            dominant: 'INTEREST',
            intensity: 'high'
        };
        const result = formatEngagementContext(summary);
        expect(result).toContain('Engagement context:');
        expect(result).toContain('total reactions: 150');
        expect(result).toContain('dominant reaction: INTEREST');
        expect(result).toContain('intensity: high');
    });

    test('uses default dominant reaction', () => {
        const summary = {
            total: 50
        };
        const result = formatEngagementContext(summary);
        expect(result).toContain('dominant reaction: LIKE');
    });

    test('uses default intensity', () => {
        const summary = {
            total: 50,
            dominant: 'PRAISE'
        };
        const result = formatEngagementContext(summary);
        expect(result).toContain('intensity: low');
    });

    test('returns empty string for null', () => {
        expect(formatEngagementContext(null)).toBe('');
    });

    test('returns empty string for missing total', () => {
        expect(formatEngagementContext({})).toBe('');
    });

    test('returns empty string for total = 0', () => {
        expect(formatEngagementContext({ total: 0 })).toBe('');
    });
});

describe('formatPatternProfileContext', () => {
    test('happy path: formats pattern profile', () => {
        const profile = {
            patternConfidence: 78.5
        };
        const guidance = {
            styleFamily: 'analytical',
            lengthBand: 'medium',
            toneIntensity: 'medium',
            punctuationRhythm: 'formal',
            preferredOpeners: ['Excellent point', 'I agree', 'Well said'],
            topNgrams: ['technical insight', 'well articulated', 'key point']
        };
        const result = formatPatternProfileContext(profile, guidance);
        expect(result).toContain('THREAD PATTERN PROFILE (primary):');
        expect(result).toContain('confidence: 78.5');
        expect(result).toContain('style family: analytical');
        expect(result).toContain('length band: medium');
        expect(result).toContain('tone intensity: medium');
        expect(result).toContain('punctuation rhythm: formal');
        expect(result).toContain('Excellent point | I agree | Well said');
    });

    test('limits preferred openers to 3', () => {
        const profile = { patternConfidence: 50 };
        const guidance = {
            preferredOpeners: ['A', 'B', 'C', 'D', 'E'],
            topNgrams: []
        };
        const result = formatPatternProfileContext(profile, guidance);
        expect(result).toContain('A | B | C');
        expect(result).not.toContain('D |');
    });

    test('limits topNgrams to 8', () => {
        const profile = { patternConfidence: 60 };
        const guidance = {
            preferredOpeners: [],
            topNgrams: Array.from({ length: 10 }, (_, i) => `gram${i}`)
        };
        const result = formatPatternProfileContext(profile, guidance);
        const ngramLine = result.split('\n').find(line => line.includes('phrase atoms'));
        const ngramCount = (ngramLine || '').split(',').length;
        expect(ngramCount).toBeLessThanOrEqual(8);
    });

    test('returns empty string for null profile', () => {
        expect(formatPatternProfileContext(null, {})).toBe('');
    });

    test('uses defaults for missing guidance properties', () => {
        const profile = { patternConfidence: 70 };
        const result = formatPatternProfileContext(profile, {});
        expect(result).toContain('style family: neutral-ack');
        expect(result).toContain('length band: short');
        expect(result).toContain('tone intensity: low');
        expect(result).toContain('punctuation rhythm: balanced');
    });
});

describe('formatLearnedPatternContext', () => {
    test('happy path: formats learned pattern', () => {
        const bucket = {
            confidenceEma: 0.82
        };
        const guidance = {
            styleFamily: 'conversational',
            lengthBand: 'long',
            preferredOpeners: ['Thanks', 'Appreciate'],
            topNgrams: ['great insight', 'helpful']
        };
        const result = formatLearnedPatternContext(bucket, guidance);
        expect(result).toContain('LEARNED MEMORY GUIDANCE (secondary):');
        expect(result).toContain('bucket confidence: 0.82');
        expect(result).toContain('preferred style family: conversational');
        expect(result).toContain('preferred length: long');
        expect(result).toContain('Thanks | Appreciate');
    });

    test('limits preferred openers to 2', () => {
        const bucket = { confidenceEma: 0.75 };
        const guidance = {
            preferredOpeners: ['A', 'B', 'C'],
            topNgrams: []
        };
        const result = formatLearnedPatternContext(bucket, guidance);
        expect(result).toContain('A | B');
        expect(result).not.toContain(' C |');
    });

    test('limits topNgrams to 6', () => {
        const bucket = { confidenceEma: 0.6 };
        const guidance = {
            preferredOpeners: [],
            topNgrams: Array.from({ length: 10 }, (_, i) => `ngram${i}`)
        };
        const result = formatLearnedPatternContext(bucket, guidance);
        const ngramLine = result.split('\n').find(line => line.includes('learned n-grams'));
        const ngramCount = (ngramLine || '').split(',').length;
        expect(ngramCount).toBeLessThanOrEqual(6);
    });

    test('returns empty string for null bucket', () => {
        expect(formatLearnedPatternContext(null, {})).toBe('');
    });

    test('uses defaults for missing guidance', () => {
        const bucket = { confidenceEma: 0.5 };
        const result = formatLearnedPatternContext(bucket, {});
        expect(result).toContain('preferred style family: neutral-ack');
        expect(result).toContain('preferred length: short');
    });
});
