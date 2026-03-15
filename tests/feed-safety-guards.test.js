/**
 * @jest-environment node
 */
'use strict';

const {
    isLowQualityComment,
    validateGeneratedCommentSafety,
    assessStrangerDistanceRisk,
    isCareerDistanceCategory,
} = require('../extension/lib/feed-safety-guards');

// ─── isCareerDistanceCategory ────────────────────────────────────────────────

describe('isCareerDistanceCategory', () => {
    it('returns true for newjob', () => {
        expect(isCareerDistanceCategory('newjob')).toBe(true);
    });
    it('returns true for career', () => {
        expect(isCareerDistanceCategory('career')).toBe(true);
    });
    it('returns true for achievement', () => {
        expect(isCareerDistanceCategory('achievement')).toBe(true);
    });
    it('is case-insensitive', () => {
        expect(isCareerDistanceCategory('NEWJOB')).toBe(true);
        expect(isCareerDistanceCategory('Career')).toBe(true);
    });
    it('returns false for technical', () => {
        expect(isCareerDistanceCategory('technical')).toBe(false);
    });
    it('returns false for generic', () => {
        expect(isCareerDistanceCategory('generic')).toBe(false);
    });
    it('returns false for null/undefined', () => {
        expect(isCareerDistanceCategory(null)).toBe(false);
        expect(isCareerDistanceCategory(undefined)).toBe(false);
    });
    it('returns false for empty string', () => {
        expect(isCareerDistanceCategory('')).toBe(false);
    });
});

// ─── isLowQualityComment ─────────────────────────────────────────────────────

describe('isLowQualityComment', () => {
    it('returns true for null', () => {
        expect(isLowQualityComment(null)).toBe(true);
    });
    it('returns true for empty string', () => {
        expect(isLowQualityComment('')).toBe(true);
    });
    it('returns true for comment shorter than 4 chars', () => {
        expect(isLowQualityComment('ok')).toBe(true);
        expect(isLowQualityComment('yes')).toBe(true);
    });
    it('returns true for pure filler — nice', () => {
        expect(isLowQualityComment('nice')).toBe(true);
    });
    it('returns true for pure filler — cool', () => {
        expect(isLowQualityComment('cool')).toBe(true);
    });
    it('returns true for pure filler — interesting', () => {
        expect(isLowQualityComment('interesting')).toBe(true);
    });
    it('returns true for pure filler — great', () => {
        expect(isLowQualityComment('great')).toBe(true);
    });
    it('returns true for pure filler — ok', () => {
        expect(isLowQualityComment('ok')).toBe(true);
    });
    it('returns true for faz sentido', () => {
        expect(isLowQualityComment('faz sentido')).toBe(true);
    });
    it('returns true for makes sense', () => {
        expect(isLowQualityComment('makes sense')).toBe(true);
    });
    it('returns true for sarcastic phrase "obviously"', () => {
        expect(isLowQualityComment('obviously correct')).toBe(true);
    });
    it('returns true for sarcastic phrase "yeah right"', () => {
        expect(isLowQualityComment('yeah right mate')).toBe(true);
    });
    it('returns true for sarcastic phrase "clearly"', () => {
        expect(isLowQualityComment('clearly you dont understand')).toBe(true);
    });
    it('returns true when comment ends with question mark', () => {
        expect(isLowQualityComment('what do you think?')).toBe(true);
    });
    it('returns true when comment is substring of post text (high overlap)', () => {
        const post = 'we use kubernetes for container orchestration';
        const comment = 'kubernetes container orchestration is key';
        expect(isLowQualityComment(comment, post)).toBe(true);
    });
    it('returns true when comment has >50% word overlap with post', () => {
        const post = 'the system uses redis for caching and postgres for storage';
        const comment = 'redis caching and postgres storage';
        expect(isLowQualityComment(comment, post)).toBe(true);
    });
    it('returns true when comment with filler suffix stripped is found in post', () => {
        const post = 'distributed systems require careful design';
        const comment = 'distributed systems require careful design, makes sense';
        expect(isLowQualityComment(comment, post)).toBe(true);
    });
    it('returns false for meaningful comment with low overlap', () => {
        const post = 'we launched a new product last quarter';
        const comment = 'congrats on shipping, the market timing looks great';
        expect(isLowQualityComment(comment, post)).toBe(false);
    });
    it('returns false for decent technical comment', () => {
        expect(isLowQualityComment(
            'solid approach, especially the caching layer',
            'how we scaled our api'
        )).toBe(false);
    });
    it('handles missing postText gracefully', () => {
        expect(isLowQualityComment('this is a decent comment')).toBe(false);
    });
});

// ─── assessStrangerDistanceRisk ───────────────────────────────────────────────

describe('assessStrangerDistanceRisk', () => {
    it('returns not-risky for non-career category', () => {
        const result = assessStrangerDistanceRisk(
            'happy for you on this milestone', 'technical'
        );
        expect(result.risky).toBe(false);
    });

    it('returns not-risky for empty comment on career category', () => {
        const result = assessStrangerDistanceRisk('', 'newjob');
        expect(result.risky).toBe(false);
    });

    it('detects direct intimacy phrase — happy for you', () => {
        const result = assessStrangerDistanceRisk(
            'so happy for you on this new role!', 'newjob'
        );
        expect(result.risky).toBe(true);
        expect(result.ruleHit).toBe('direct-intimacy-phrase');
    });

    it('detects direct intimacy phrase — so proud of you', () => {
        const result = assessStrangerDistanceRisk(
            'so proud of you for achieving this', 'achievement'
        );
        expect(result.risky).toBe(true);
        expect(result.ruleHit).toBe('direct-intimacy-phrase');
    });

    it('detects direct intimacy phrase — proud of you (short form)', () => {
        const result = assessStrangerDistanceRisk(
            'proud of you friend', 'newjob'
        );
        expect(result.risky).toBe(true);
    });

    it('detects direct intimacy phrase — você merece in PT', () => {
        const result = assessStrangerDistanceRisk(
            'orgulho de voce nessa conquista', 'achievement'
        );
        expect(result.risky).toBe(true);
    });

    it('detects pronoun + emotional closeness — you + proud', () => {
        const result = assessStrangerDistanceRisk(
            'you should be proud of this achievement', 'career'
        );
        expect(result.risky).toBe(true);
        expect(result.ruleHit).toBe('pronoun-emotional-closeness');
    });

    it('detects pronoun + emotional closeness — your + admire', () => {
        const result = assessStrangerDistanceRisk(
            'i admire your dedication to this field', 'newjob'
        );
        expect(result.risky).toBe(true);
    });

    it('returns not-risky for second-person without closeness cue', () => {
        const result = assessStrangerDistanceRisk(
            'congrats on your new role at the company', 'newjob'
        );
        expect(result.risky).toBe(false);
    });

    it('returns not-risky for professional congrats without intimacy', () => {
        const result = assessStrangerDistanceRisk(
            'great milestone, well done on this achievement', 'achievement'
        );
        expect(result.risky).toBe(false);
    });

    it('returns diagnostics object with riskType distance', () => {
        const result = assessStrangerDistanceRisk(
            'thrilled for you', 'newjob'
        );
        expect(result.riskType).toBe('distance');
    });

    it('returns matchedSnippet when direct phrase matched', () => {
        const result = assessStrangerDistanceRisk(
            'thrilled for you on this journey', 'newjob'
        );
        expect(result.matchedSnippet).toBeTruthy();
    });

    it('detects PT "feliz por voce"', () => {
        const result = assessStrangerDistanceRisk(
            'feliz por voce nessa conquista', 'newjob'
        );
        expect(result.risky).toBe(true);
    });

    it('detects PT "te admiro"', () => {
        const result = assessStrangerDistanceRisk(
            'te admiro muito pelo esforco', 'achievement'
        );
        expect(result.risky).toBe(true);
    });
});

// ─── validateGeneratedCommentSafety ──────────────────────────────────────────

describe('validateGeneratedCommentSafety', () => {
    const ctx = { category: 'technical', postText: 'how we improved our ci/cd pipeline' };

    it('returns false for empty comment', () => {
        expect(validateGeneratedCommentSafety('', ctx)).toBe(false);
    });
    it('returns false for null comment', () => {
        expect(validateGeneratedCommentSafety(null, ctx)).toBe(false);
    });
    it('returns false for comment shorter than 5 chars', () => {
        expect(validateGeneratedCommentSafety('ok', ctx)).toBe(false);
    });
    it('returns false for comment longer than 300 chars', () => {
        const long = 'a'.repeat(301);
        expect(validateGeneratedCommentSafety(long, ctx)).toBe(false);
    });
    it('returns false when comment contains question mark', () => {
        expect(validateGeneratedCommentSafety(
            'what do you think about this approach?', ctx
        )).toBe(false);
    });
    it('returns false for irony — obviously', () => {
        expect(validateGeneratedCommentSafety(
            'obviously this is the wrong approach', ctx
        )).toBe(false);
    });
    it('returns false for irony — yeah right', () => {
        expect(validateGeneratedCommentSafety(
            'yeah right this will scale', ctx
        )).toBe(false);
    });
    it('returns false for irony — clearly', () => {
        expect(validateGeneratedCommentSafety(
            'clearly nobody tested this', ctx
        )).toBe(false);
    });
    it('returns false for polemic — garbage', () => {
        expect(validateGeneratedCommentSafety(
            'this is garbage engineering', ctx
        )).toBe(false);
    });
    it('returns false for polemic — trash', () => {
        expect(validateGeneratedCommentSafety(
            'this is trash architecture', ctx
        )).toBe(false);
    });
    it('returns false for polemic — fraud', () => {
        expect(validateGeneratedCommentSafety(
            'this whole thing looks like a fraud', ctx
        )).toBe(false);
    });
    it('returns false for polemic — ridiculous', () => {
        expect(validateGeneratedCommentSafety(
            'ridiculous to ship without tests', ctx
        )).toBe(false);
    });
    it('returns false for discussion invite — let me know', () => {
        expect(validateGeneratedCommentSafety(
            'solid approach, let me know if you need help', ctx
        )).toBe(false);
    });
    it('returns false for discussion invite — thoughts', () => {
        expect(validateGeneratedCommentSafety(
            'really interesting move, thoughts on scaling it', ctx
        )).toBe(false);
    });
    it('returns false for discussion invite — dm me', () => {
        expect(validateGeneratedCommentSafety(
            'great work on the pipeline, dm me', ctx
        )).toBe(false);
    });
    it('returns true for clean technical comment', () => {
        expect(validateGeneratedCommentSafety(
            'solid approach on the caching layer, especially at scale',
            ctx
        )).toBe(true);
    });
    it('returns true for clean achievement comment', () => {
        expect(validateGeneratedCommentSafety(
            'congrats on this milestone, well deserved',
            { category: 'achievement', postText: 'excited to announce my promotion' }
        )).toBe(true);
    });
    it('returns false for congrats on departure-only career transition', () => {
        expect(validateGeneratedCommentSafety(
            'congrats on leaving the company',
            {
                category: 'career',
                postText: 'after 5 years I am leaving my role to explore new opportunities'
            }
        )).toBe(false);
    });
    it('returns false for distance risk on newjob category', () => {
        expect(validateGeneratedCommentSafety(
            'so happy for you on this new role',
            { category: 'newjob', postText: 'excited to announce my new job' }
        )).toBe(false);
    });
    it('returns false for humor with congrats', () => {
        expect(validateGeneratedCommentSafety(
            'congrats on this, well deserved',
            { category: 'humor', postText: 'funny story from the office' }
        )).toBe(false);
    });
    it('returns false for humor without laugh marker and no congrats', () => {
        expect(validateGeneratedCommentSafety(
            'this is a very interesting approach to software',
            { category: 'humor', postText: 'funny post' }
        )).toBe(false);
    });
    it('returns true for humor with laugh marker', () => {
        expect(validateGeneratedCommentSafety(
            'lol too real on this one',
            { category: 'humor', postText: 'funny post about meetings' }
        )).toBe(true);
    });
    it('returns false for humor comment longer than 85 chars', () => {
        const longHumor = 'lol this is way too real and I cannot stop laughing at how accurate this actually is today';
        expect(longHumor.length).toBeGreaterThan(85);
        expect(validateGeneratedCommentSafety(
            longHumor,
            { category: 'humor', postText: 'funny post' }
        )).toBe(false);
    });
    it('returns false when non-humor comment contains laugh marker', () => {
        expect(validateGeneratedCommentSafety(
            'lol interesting technical post',
            ctx
        )).toBe(false);
    });
    it('returns false for bookmark intent in non-technical context', () => {
        expect(validateGeneratedCommentSafety(
            'bookmarking this for later use',
            { category: 'motivation', postText: 'inspiring post' }
        )).toBe(false);
    });
    it('returns false for saved for later intent', () => {
        expect(validateGeneratedCommentSafety(
            'saved for later, very useful content',
            { category: 'tips', postText: 'top productivity tips' }
        )).toBe(false);
    });
    it('uses generic category when no context provided', () => {
        expect(validateGeneratedCommentSafety(
            'solid approach on scaling the system',
            null
        )).toBe(true);
    });
    it('uses generic category when context has no category', () => {
        expect(validateGeneratedCommentSafety(
            'solid approach on scaling the system',
            {}
        )).toBe(true);
    });
});
