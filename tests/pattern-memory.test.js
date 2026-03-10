const {
    COMMENT_PATTERN_MEMORY_KEY,
    getPatternBucketKey,
    loadPatternBucket,
    mergePatternBucket,
    buildPatternGuidance
} = require('../extension/lib/pattern-memory');

describe('pattern-memory', () => {
    it('builds deterministic lang|category keys', () => {
        expect(getPatternBucketKey('PT', 'Hiring'))
            .toBe('pt|hiring');
    });

    it('merges pattern buckets with bounded maps and decay', () => {
        let memory = {
            version: 1,
            buckets: {}
        };
        memory = mergePatternBucket(memory, 'en', 'technical', {
            analyzedCount: 10,
            patternConfidence: 80,
            openers: [
                { text: 'solid point', weight: 1.4 },
                { text: 'great take', weight: 0.8 }
            ],
            topNgrams: Array.from({ length: 40 }).map((_, i) => ({
                text: 'token ' + i,
                weight: 1
            })),
            intentMix: { insight: 0.8, neutral: 0.2 },
            styleFamily: 'analytical',
            lengthBand: 'short',
            punctuationRhythm: 'balanced',
            toneIntensity: 'low',
            riskMarkers: { riskRate: 0.1 }
        }, '2026-03-10T10:00:00.000Z');

        const bucket = loadPatternBucket(memory, 'en', 'technical');
        expect(bucket).toBeTruthy();
        expect(bucket.samples).toBe(10);
        expect(bucket.confidenceEma).toBe(80);
        expect(Object.keys(bucket.ngrams).length)
            .toBeLessThanOrEqual(24);
        expect(Object.keys(bucket.openers).length)
            .toBeLessThanOrEqual(12);

        const updated = mergePatternBucket(memory, 'en', 'technical', {
            analyzedCount: 4,
            patternConfidence: 50,
            openers: [
                { text: 'solid point', weight: 0.5 }
            ],
            topNgrams: [
                { text: 'latency tuning', weight: 2 }
            ],
            intentMix: { insight: 1 }
        }, '2026-03-10T11:00:00.000Z');

        const updatedBucket = loadPatternBucket(
            updated,
            'en',
            'technical'
        );
        expect(updatedBucket.samples).toBe(14);
        expect(updatedBucket.confidenceEma)
            .toBeGreaterThan(50);
        expect(updatedBucket.confidenceEma)
            .toBeLessThan(80);
    });

    it('isolates buckets by lang and category', () => {
        let memory = mergePatternBucket(null, 'pt', 'hiring', {
            analyzedCount: 5,
            patternConfidence: 70,
            openers: [{ text: 'boa vaga', weight: 1 }],
            topNgrams: [{ text: 'mercado tech', weight: 1 }]
        });
        memory = mergePatternBucket(memory, 'en', 'technical', {
            analyzedCount: 5,
            patternConfidence: 70,
            openers: [{ text: 'solid point', weight: 1 }],
            topNgrams: [{ text: 'clean architecture', weight: 1 }]
        });

        const ptHiring = loadPatternBucket(memory, 'pt', 'hiring');
        const enTech = loadPatternBucket(memory, 'en', 'technical');
        expect(Object.keys(ptHiring.openers)).toContain('boa vaga');
        expect(Object.keys(enTech.openers)).toContain('solid point');
    });

    it('builds prompt guidance from profile + learned bucket', () => {
        const bucket = {
            confidenceEma: 74,
            openers: { 'solid point': 1.2 },
            ngrams: { 'latency tuning': 1.1 },
            styleMix: { analytical: 0.9 },
            lengthMix: { short: 0.7 },
            rhythmMix: { balanced: 0.8 },
            toneMix: { low: 0.8 }
        };
        const guidance = buildPatternGuidance({
            patternConfidence: 82,
            openers: [{ text: 'great take', weight: 1 }],
            topNgrams: [{ text: 'production latency', weight: 1 }],
            recommended: {
                lengthBand: 'short',
                toneIntensity: 'low',
                punctuationRhythm: 'balanced',
                styleFamily: 'analytical',
                allowEmoji: false,
                maxEmoji: 0
            }
        }, bucket);

        expect(guidance.lengthBand).toBe('short');
        expect(guidance.styleFamily).toBe('analytical');
        expect(guidance.preferredOpeners.length)
            .toBeGreaterThan(0);
        expect(guidance.topNgrams.length)
            .toBeGreaterThan(0);
        expect(guidance.lowSignal).toBe(false);
    });

    it('exports stable storage key', () => {
        expect(COMMENT_PATTERN_MEMORY_KEY)
            .toBe('commentPatternMemoryV1');
    });
});
