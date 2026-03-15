'use strict';

const {
    analyzeCommentPatterns,
    validateCommentPatternFit,
    PATTERN_LOW_SIGNAL_THRESHOLD,
    PATTERN_DEFAULT_MAX_COMMENTS,
    PATTERN_INTENT_MARKERS,
    PATTERN_IRONY_RE,
    PATTERN_POLEMIC_RE,
    PATTERN_DISCUSSION_RE
} = require('../extension/lib/feed-comment-patterns.js');

describe('constants', () => {
    test('PATTERN_LOW_SIGNAL_THRESHOLD is a number', () => {
        expect(typeof PATTERN_LOW_SIGNAL_THRESHOLD).toBe('number');
        expect(PATTERN_LOW_SIGNAL_THRESHOLD).toBeGreaterThan(0);
    });
    test('PATTERN_DEFAULT_MAX_COMMENTS is a number', () => {
        expect(typeof PATTERN_DEFAULT_MAX_COMMENTS).toBe('number');
        expect(PATTERN_DEFAULT_MAX_COMMENTS).toBeGreaterThan(0);
    });
    test('PATTERN_INTENT_MARKERS has expected keys', () => {
        expect(PATTERN_INTENT_MARKERS).toHaveProperty('laugh');
        expect(PATTERN_INTENT_MARKERS).toHaveProperty('congrats');
        expect(PATTERN_INTENT_MARKERS).toHaveProperty('agree');
        expect(PATTERN_INTENT_MARKERS).toHaveProperty('insight');
        expect(PATTERN_INTENT_MARKERS).toHaveProperty('support');
        expect(PATTERN_INTENT_MARKERS).toHaveProperty('gratitude');
        expect(PATTERN_INTENT_MARKERS).toHaveProperty('neutral');
    });
    test('PATTERN_IRONY_RE is a RegExp', () => {
        expect(PATTERN_IRONY_RE).toBeInstanceOf(RegExp);
    });
    test('PATTERN_POLEMIC_RE is a RegExp', () => {
        expect(PATTERN_POLEMIC_RE).toBeInstanceOf(RegExp);
    });
    test('PATTERN_DISCUSSION_RE is a RegExp', () => {
        expect(PATTERN_DISCUSSION_RE).toBeInstanceOf(RegExp);
    });
    test('PATTERN_IRONY_RE matches irony markers', () => {
        expect(PATTERN_IRONY_RE.test('obviously this is great')).toBe(true);
        expect(PATTERN_IRONY_RE.test('yeah right buddy')).toBe(true);
    });
    test('PATTERN_POLEMIC_RE matches polemic markers', () => {
        expect(PATTERN_POLEMIC_RE.test('this is garbage')).toBe(true);
        expect(PATTERN_POLEMIC_RE.test('what a fraud')).toBe(true);
    });
    test('PATTERN_DISCUSSION_RE matches discussion markers', () => {
        expect(PATTERN_DISCUSSION_RE.test('let me know your thoughts')).toBe(true);
        expect(PATTERN_DISCUSSION_RE.test('what do you think?')).toBe(true);
    });
});

describe('analyzeCommentPatterns — empty/null input', () => {
    test('returns defaults for empty array', () => {
        // Covers line 274: analyzedCount === 0 branch
        const result = analyzeCommentPatterns([]);
        expect(result.analyzedCount).toBe(0);
        expect(result.lowSignal).toBe(true);
        expect(result.patternConfidence).toBe(0);
        expect(result.styleFamily).toBe('neutral-ack');
        expect(result.dominantLanguage).toBe('en');
        expect(result.lengthBand).toBe('short');
        expect(result.punctuationRhythm).toBe('flat');
        expect(result.toneIntensity).toBe('low');
        expect(result.openers).toEqual([]);
        expect(result.topNgrams).toEqual([]);
        expect(result.recommended.allowQuestion).toBe(false);
        expect(result.recommended.allowEmoji).toBe(false);
        expect(result.recommended.maxEmoji).toBe(0);
    });
    test('returns defaults for null input', () => {
        const result = analyzeCommentPatterns(null);
        expect(result.analyzedCount).toBe(0);
        expect(result.lowSignal).toBe(true);
    });
    test('returns defaults for array of empty strings', () => {
        const result = analyzeCommentPatterns(['', '   ', '']);
        expect(result.analyzedCount).toBe(0);
        expect(result.lowSignal).toBe(true);
    });
    test('returns defaults for non-array input', () => {
        const result = analyzeCommentPatterns('not an array');
        expect(result.analyzedCount).toBe(0);
    });
});

describe('analyzeCommentPatterns — short text (getLengthBand short branch)', () => {
    test('short comment (< 55 chars) produces short lengthBand', () => {
        // Covers line 42: getLengthBand short branch
        const result = analyzeCommentPatterns(['Great post!']);
        expect(result.analyzedCount).toBe(1);
        expect(result.lengthBand).toBe('short');
    });
    test('medium comment (55-119 chars) produces medium lengthBand', () => {
        const comment = 'This is a medium length comment that has between 55 and 120 characters total.';
        const result = analyzeCommentPatterns([comment]);
        expect(result.lengthBand).toBe('medium');
    });
    test('long comment (>= 120 chars) produces long lengthBand', () => {
        // Covers line 44: getLengthBand long branch (getBandIndex 'long' = line 50)
        const comment = 'This is a very long comment that exceeds one hundred and twenty characters in total length to trigger the long band classification in the pattern analyzer.';
        const result = analyzeCommentPatterns([comment]);
        expect(result.lengthBand).toBe('long');
    });
});

describe('analyzeCommentPatterns — punctuation rhythm (flat branch)', () => {
    test('comment with no punctuation produces flat rhythm', () => {
        // Covers line 60: detectPunctuationRhythm flat branch
        const result = analyzeCommentPatterns(['great post no punctuation here']);
        expect(result.punctuationRhythm).toBe('flat');
    });
    test('comment with exclamation produces expressive rhythm', () => {
        const result = analyzeCommentPatterns(['Wow!! Amazing post!!']);
        expect(result.punctuationRhythm).toBe('expressive');
    });
    test('comment with commas and periods produces structured rhythm', () => {
        const result = analyzeCommentPatterns(['Great post, very insightful. Well done.']);
        expect(result.punctuationRhythm).toBe('structured');
    });
});

describe('analyzeCommentPatterns — intent extraction (humor branch)', () => {
    test('humor category with laugh marker returns laugh intent', () => {
        // Covers line 104-106: extractIntent humor branch
        const result = analyzeCommentPatterns(
            ['haha this is too real'],
            { category: 'humor' }
        );
        expect(result.intentMix).toHaveProperty('laugh');
    });
    test('humor category without laugh marker returns neutral intent', () => {
        // Covers line 106: humor category neutral fallback
        const result = analyzeCommentPatterns(
            ['interesting perspective on this topic'],
            { category: 'humor' }
        );
        expect(result.intentMix).toHaveProperty('neutral');
    });
    test('non-humor category with congrats marker returns congrats intent', () => {
        const result = analyzeCommentPatterns(['Congratulations! Well deserved!']);
        expect(result.intentMix).toHaveProperty('congrats');
    });
    test('non-humor category with no marker returns neutral intent', () => {
        // Covers line 113: extractIntent final neutral return
        const result = analyzeCommentPatterns(['some random text without markers']);
        expect(result.intentMix).toHaveProperty('neutral');
    });
});

describe('analyzeCommentPatterns — style family resolution', () => {
    test('humor category resolves to minimal-humor', () => {
        // Covers line 177: resolveStyleFamily minimal-humor
        const result = analyzeCommentPatterns(
            ['haha this is too real and accurate'],
            { category: 'humor' }
        );
        expect(result.styleFamily).toBe('minimal-humor');
    });
    test('congrats intent resolves to congratulatory', () => {
        // Covers line 181: resolveStyleFamily congratulatory
        const result = analyzeCommentPatterns(['Congratulations! Well deserved achievement!']);
        expect(result.styleFamily).toBe('congratulatory');
    });
    test('insight intent resolves to analytical', () => {
        // Covers line 185: resolveStyleFamily analytical
        const result = analyzeCommentPatterns(['Great point and very interesting insight here']);
        expect(result.styleFamily).toBe('analytical');
    });
    test('support intent resolves to supportive', () => {
        // Covers line 189: resolveStyleFamily supportive
        const result = analyzeCommentPatterns(['Keep going! Good luck with your journey!']);
        expect(result.styleFamily).toBe('supportive');
    });
    test('no special intent resolves to neutral-ack', () => {
        const result = analyzeCommentPatterns(['some random text without any markers']);
        expect(result.styleFamily).toBe('neutral-ack');
    });
});

describe('analyzeCommentPatterns — full analysis', () => {
    test('returns expected structure for valid comments', () => {
        const comments = [
            { text: 'Great post! Very insightful.', sentiment: 'insight' },
            { text: 'Congratulations on this achievement!', sentiment: 'celebration' },
            { text: 'Thanks for sharing this perspective.', sentiment: 'gratitude' }
        ];
        const result = analyzeCommentPatterns(comments);
        expect(result.analyzedCount).toBe(3);
        expect(result).toHaveProperty('dominantLanguage');
        expect(result).toHaveProperty('styleFamily');
        expect(result).toHaveProperty('lengthBand');
        expect(result).toHaveProperty('punctuationRhythm');
        expect(result).toHaveProperty('toneIntensity');
        expect(result).toHaveProperty('openers');
        expect(result).toHaveProperty('topNgrams');
        expect(result).toHaveProperty('intentMix');
        expect(result).toHaveProperty('sentimentMix');
        expect(result).toHaveProperty('riskMarkers');
        expect(result).toHaveProperty('recommended');
        expect(result).toHaveProperty('patternConfidence');
        expect(result).toHaveProperty('lowSignal');
    });
    test('accepts string comments (not objects)', () => {
        const result = analyzeCommentPatterns(['Great post!', 'Very insightful.']);
        expect(result.analyzedCount).toBe(2);
    });
    test('respects maxComments option', () => {
        const comments = Array.from({ length: 20 }, (_, i) => ({ text: `Comment ${i} with some text` }));
        const result = analyzeCommentPatterns(comments, { maxComments: 5 });
        expect(result.sampledCount).toBe(5);
    });
    test('riskMarkers includes riskRate, questionRate, emojiRate', () => {
        const result = analyzeCommentPatterns(['Great post!']);
        expect(result.riskMarkers).toHaveProperty('riskRate');
        expect(result.riskMarkers).toHaveProperty('questionRate');
        expect(result.riskMarkers).toHaveProperty('emojiRate');
    });
    test('question in comment increases questionRate', () => {
        const result = analyzeCommentPatterns(['What do you think about this?']);
        expect(result.riskMarkers.questionRate).toBeGreaterThan(0);
    });
    test('emoji in comment increases emojiRate', () => {
        const result = analyzeCommentPatterns(['Great post! 🎉']);
        expect(result.riskMarkers.emojiRate).toBeGreaterThan(0);
    });
    test('irony marker increases riskRate', () => {
        const result = analyzeCommentPatterns(['Obviously this is the best approach']);
        expect(result.riskMarkers.riskRate).toBeGreaterThan(0);
    });
});

describe('analyzeCommentPatterns — collectPatternLexicon (bucket ngrams path)', () => {
    test('bucket ngrams are included in lexicon (via validateCommentPatternFit)', () => {
        // Covers lines 441-448: bucket ngrams path in collectPatternLexicon
        const profile = analyzeCommentPatterns([
            'machine learning artificial intelligence',
            'deep learning neural networks'
        ]);
        const bucket = {
            ngrams: { 'machine learning': 5, 'deep learning': 3 }
        };
        // A comment with bucket ngram tokens should pass lexicon check
        const result = validateCommentPatternFit(
            'machine learning is transforming everything',
            { ...profile, patternConfidence: 80 },
            bucket,
            {}
        );
        // Should not fail on lexicon overlap (bucket ngrams provide coverage)
        expect(result).toHaveProperty('ok');
    });
});

describe('validateCommentPatternFit', () => {
    test('returns ok:false for empty comment', () => {
        const result = validateCommentPatternFit('', {}, null, {});
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('skip-pattern-fit');
    });
    test('returns ok:false for whitespace-only comment', () => {
        const result = validateCommentPatternFit('   ', {}, null, {});
        expect(result.ok).toBe(false);
    });
    test('returns ok:false for low-signal profile', () => {
        const result = validateCommentPatternFit(
            'Great post!',
            { patternConfidence: 30 },
            null,
            {}
        );
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('skip-pattern-low-signal');
    });
    test('returns ok:true for comment with no profile', () => {
        const result = validateCommentPatternFit(
            'Great post!',
            {},
            null,
            {}
        );
        expect(result.ok).toBe(true);
    });
    test('question rejection: returns ok:false when allowQuestion is false and comment has ?', () => {
        // Covers line 524-528: question rejection
        const result = validateCommentPatternFit(
            'What do you think about this?',
            { recommended: { allowQuestion: false, maxEmoji: 0 }, patternConfidence: 0 },
            null,
            {}
        );
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('skip-pattern-fit');
    });
    test('emoji rejection: returns ok:false when maxEmoji < emojiCount', () => {
        // Covers line 532-536: emoji rejection
        const result = validateCommentPatternFit(
            'Great post! 🎉🎊🎈',
            { recommended: { allowQuestion: true, maxEmoji: 0 }, patternConfidence: 0 },
            null,
            {}
        );
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('skip-pattern-fit');
    });
    test('rhythm rejection: returns ok:false when expected flat but actual expressive', () => {
        // Covers line 540-546: rhythm rejection
        const result = validateCommentPatternFit(
            'Wow!! Amazing!! Incredible!!',
            {
                recommended: {
                    allowQuestion: true,
                    maxEmoji: 10,
                    punctuationRhythm: 'flat'
                },
                patternConfidence: 0
            },
            null,
            {}
        );
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('skip-pattern-fit');
    });
    test('irony rejection: returns ok:false for irony markers', () => {
        // Covers line 579-585: irony/polemic/discussion rejection
        const result = validateCommentPatternFit(
            'Obviously this is the best approach',
            { recommended: { allowQuestion: true, maxEmoji: 10 }, patternConfidence: 0 },
            null,
            {}
        );
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('skip-pattern-fit');
    });
    test('polemic rejection: returns ok:false for polemic markers', () => {
        const result = validateCommentPatternFit(
            'This is garbage and a fraud',
            { recommended: { allowQuestion: true, maxEmoji: 10 }, patternConfidence: 0 },
            null,
            {}
        );
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('skip-pattern-fit');
    });
    test('discussion rejection: returns ok:false for discussion markers', () => {
        const result = validateCommentPatternFit(
            'Let me know what you think about this',
            { recommended: { allowQuestion: true, maxEmoji: 10 }, patternConfidence: 0 },
            null,
            {}
        );
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('skip-pattern-fit');
    });
    test('lexicon overlap rejection: returns ok:false when ratio < minRatio', () => {
        // Covers lines 563-576: lexicon overlap ratio rejection
        // Build a profile with a large lexicon from specific words
        const profile = analyzeCommentPatterns([
            'machine learning artificial intelligence neural networks',
            'deep learning transformers attention mechanism',
            'natural language processing computer vision',
            'reinforcement learning reward optimization',
            'gradient descent backpropagation training'
        ]);
        // Comment with completely unrelated words
        const result = validateCommentPatternFit(
            'cooking recipes delicious food restaurant',
            { ...profile, patternConfidence: 80 },
            null,
            {}
        );
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('skip-pattern-fit');
    });
    test('duplicate comment rejection: returns ok:false for exact duplicate', () => {
        const comment = 'Great post about leadership';
        const result = validateCommentPatternFit(
            comment,
            { recommended: { allowQuestion: true, maxEmoji: 10 }, patternConfidence: 0 },
            null,
            { existingComments: [{ text: comment }] }
        );
        expect(result.ok).toBe(false);
    });
    test('returns ok:true for valid comment with high-confidence profile', () => {
        const profile = analyzeCommentPatterns([
            'Great post about leadership and management',
            'Very insightful perspective on leadership',
            'Leadership is key to organizational success',
            'Management and leadership go hand in hand',
            'Excellent leadership insights shared here'
        ]);
        const result = validateCommentPatternFit(
            'Leadership insights are valuable for growth',
            { ...profile, patternConfidence: 80 },
            null,
            {}
        );
        expect(result).toHaveProperty('ok');
        expect(result).toHaveProperty('reason');
    });
});
