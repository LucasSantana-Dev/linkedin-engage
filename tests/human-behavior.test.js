const {
    gaussianRandom,
    humanDelay,
    scrollVariation,
    scrollBehavior,
    sessionProfile,
    shouldTakePause,
    pauseDuration,
    actionDelay,
    mouseJitter,
    typingDelay,
    shouldSimulateReading,
    readingDuration
} = require('../extension/lib/human-behavior');

describe('gaussianRandom', () => {
    test('returns values near the mean', () => {
        const samples = Array.from(
            { length: 1000 },
            () => gaussianRandom(100, 10)
        );
        const avg = samples.reduce(
            (a, b) => a + b, 0
        ) / samples.length;
        expect(avg).toBeGreaterThan(90);
        expect(avg).toBeLessThan(110);
    });

    test('respects stdDev spread', () => {
        // Expected fraction within ±3σ for a true normal is ~99.73%
        // (997/1000 in expectation). Using `>=985` keeps the test
        // meaningful for catching a broken gaussianRandom while
        // tolerating natural RNG variance — observed flake on Node
        // 20 with `>990` (got exactly 990 in CI run 25024496224).
        const samples = Array.from(
            { length: 1000 },
            () => gaussianRandom(0, 1)
        );
        const inRange = samples.filter(
            s => s > -3 && s < 3
        ).length;
        expect(inRange).toBeGreaterThanOrEqual(985);
    });
});

describe('humanDelay', () => {
    test('returns positive values', () => {
        for (let i = 0; i < 100; i++) {
            expect(humanDelay(2000, 500)).toBeGreaterThan(0);
        }
    });

    test('minimum floor of 500ms', () => {
        for (let i = 0; i < 100; i++) {
            expect(humanDelay(100, 10)).toBeGreaterThanOrEqual(500);
        }
    });

    test('varies across calls', () => {
        const vals = new Set();
        for (let i = 0; i < 20; i++) {
            vals.add(humanDelay(3000, 1000));
        }
        expect(vals.size).toBeGreaterThan(10);
    });

    test('uses default variance when not provided', () => {
        const val = humanDelay(2000);
        expect(val).toBeGreaterThanOrEqual(500);
    });

    test('keeps floor when burst branch gaussian is negative', () => {
        const randomSpy = jest.spyOn(Math, 'random');
        randomSpy
            .mockImplementationOnce(() => 0.5)
            .mockImplementationOnce(() => 0.5)
            .mockImplementationOnce(() => 0.01)
            .mockImplementationOnce(() => 1e-12)
            .mockImplementationOnce(() => 0.5);

        expect(humanDelay(100, 10)).toBeGreaterThanOrEqual(500);
        randomSpy.mockRestore();
    });
});

describe('scrollVariation', () => {
    beforeEach(() => {
        global.window = { innerHeight: 900 };
    });

    test('returns reasonable scroll distance', () => {
        const val = scrollVariation();
        expect(val).toBeGreaterThan(100);
        expect(val).toBeLessThan(2000);
    });
});

describe('scrollBehavior', () => {
    test('returns valid behavior string', () => {
        for (let i = 0; i < 20; i++) {
            const b = scrollBehavior();
            expect(['smooth', 'auto']).toContain(b);
        }
    });
});

describe('sessionProfile', () => {
    test('returns valid profile object', () => {
        const p = sessionProfile();
        expect(p.avgDelay).toBeGreaterThan(1000);
        expect(p.avgDelay).toBeLessThan(6000);
        expect(p.burstChance).toBeGreaterThan(0);
        expect(p.burstChance).toBeLessThan(0.2);
        expect(p.pauseChance).toBeGreaterThan(0);
        expect(p.pauseChance).toBeLessThan(0.15);
        expect(p.scrollMultiplier).toBeGreaterThan(0.5);
        expect(p.scrollMultiplier).toBeLessThan(1.5);
    });

    test('generates different profiles', () => {
        const a = sessionProfile();
        const b = sessionProfile();
        const same = a.avgDelay === b.avgDelay &&
            a.burstChance === b.burstChance;
        expect(same).toBe(false);
    });
});

describe('shouldTakePause', () => {
    test('triggers on multiples of 7', () => {
        let triggered = false;
        for (let i = 0; i < 100; i++) {
            if (shouldTakePause(
                { pauseChance: 0 }, 7
            )) {
                triggered = true;
                break;
            }
        }
        expect(triggered).toBe(true);
    });

    test('never triggers at action 0 with zero chance', () => {
        let triggered = false;
        for (let i = 0; i < 100; i++) {
            if (shouldTakePause(
                { pauseChance: 0 }, 0
            )) {
                triggered = true;
            }
        }
        expect(triggered).toBe(false);
    });

    test('uses default when no profile', () => {
        const result = shouldTakePause(null, 1);
        expect(typeof result).toBe('boolean');
    });
});

describe('pauseDuration', () => {
    test('returns reasonable pause on average', () => {
        const samples = Array.from(
            { length: 100 },
            () => pauseDuration()
        );
        const avg = samples.reduce(
            (a, b) => a + b, 0
        ) / samples.length;
        expect(avg).toBeGreaterThan(8000);
        expect(avg).toBeLessThan(25000);
    });
});

describe('actionDelay', () => {
    test('respects profile avgDelay', () => {
        const profile = { avgDelay: 5000, burstChance: 0 };
        const delays = Array.from(
            { length: 100 },
            () => actionDelay(profile)
        );
        const avg = delays.reduce(
            (a, b) => a + b, 0
        ) / delays.length;
        expect(avg).toBeGreaterThan(2000);
    });

    test('works without profile', () => {
        const d = actionDelay();
        expect(d).toBeGreaterThan(0);
    });
});

describe('mouseJitter', () => {
    test('returns small offsets', () => {
        for (let i = 0; i < 50; i++) {
            const j = mouseJitter();
            expect(typeof j.x).toBe('number');
            expect(typeof j.y).toBe('number');
            expect(Math.abs(j.x)).toBeLessThan(20);
            expect(Math.abs(j.y)).toBeLessThan(20);
        }
    });
});

describe('typingDelay', () => {
    test('longer text takes longer', () => {
        const shortSamples = Array.from(
            { length: 100 },
            () => typingDelay(10)
        );
        const longSamples = Array.from(
            { length: 100 },
            () => typingDelay(200)
        );
        const shortAvg = shortSamples.reduce(
            (a, b) => a + b,
            0
        ) / shortSamples.length;
        const longAvg = longSamples.reduce(
            (a, b) => a + b,
            0
        ) / longSamples.length;
        expect(longAvg).toBeGreaterThan(shortAvg);
    });

    test('minimum floor', () => {
        expect(typingDelay(1)).toBeGreaterThanOrEqual(300);
    });
});

describe('shouldSimulateReading', () => {
    test('false for very short text', () => {
        expect(shouldSimulateReading(20)).toBe(false);
    });

    test('sometimes true for long text', () => {
        let triggered = false;
        for (let i = 0; i < 50; i++) {
            if (shouldSimulateReading(500)) {
                triggered = true;
                break;
            }
        }
        expect(triggered).toBe(true);
    });
});

describe('readingDuration', () => {
    test('scales with text length', () => {
        const short = readingDuration(50);
        const long = readingDuration(500);
        expect(long).toBeGreaterThan(short);
    });

    test('capped at 8000ms', () => {
        for (let i = 0; i < 20; i++) {
            expect(readingDuration(10000))
                .toBeLessThanOrEqual(8000);
        }
    });

    test('minimum floor', () => {
        expect(readingDuration(5))
            .toBeGreaterThanOrEqual(800);
    });
});
