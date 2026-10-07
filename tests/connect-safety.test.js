const {
    LOW_ACCEPTANCE_RATE, LOW_ACCEPTANCE_MIN_SAMPLE, WARMUP_DAILY_LIMITS,
    computeAcceptance, getWarmupState, getEffectiveConnectDailyLimit,
    resolveConnectSafety
} = require('../extension/lib/connect-safety');

const DAY = 86400000;

describe('constants', () => {
    test('values', () => {
        expect(LOW_ACCEPTANCE_RATE).toBe(0.2);
        expect(LOW_ACCEPTANCE_MIN_SAMPLE).toBe(30);
        expect(WARMUP_DAILY_LIMITS).toEqual([10, 20, 30]);
    });
});

describe('computeAcceptance', () => {
    test('no args and zero sample give null rate', () => {
        expect(computeAcceptance()).toEqual({ rate: null, sample: 0, low: false });
        expect(computeAcceptance({ acceptedCount: 5, sentCount: 0 }).rate).toBeNull();
    });
    test('below min sample is never low', () => {
        expect(computeAcceptance({ acceptedCount: 0, sentCount: 29 }).low).toBe(false);
    });
    test('low at min sample under 20%', () => {
        const r = computeAcceptance({ acceptedCount: 5, sentCount: 30 });
        expect(r.low).toBe(true);
        expect(r.rate).toBeCloseTo(5 / 30);
    });
    test('exactly 20% is not low', () => {
        expect(computeAcceptance({ acceptedCount: 6, sentCount: 30 }).low).toBe(false);
    });
    test('bad numbers are clamped', () => {
        const r = computeAcceptance({ acceptedCount: -3, sentCount: 'x' });
        expect(r).toEqual({ rate: null, sample: 0, low: false });
        expect(computeAcceptance({ acceptedCount: 'y', sentCount: 40 }).low).toBe(true);
    });
});

describe('getWarmupState', () => {
    const t0 = 1700000000000;
    const inactive = { active: false, completed: false, week: 0, dailyLimit: null };
    test('absent or invalid enabledAt is inactive', () => {
        expect(getWarmupState()).toEqual(inactive);
        expect(getWarmupState({ enabledAt: 'x', now: t0 })).toEqual(inactive);
        expect(getWarmupState({ enabledAt: 0, now: t0 })).toEqual(inactive);
        expect(getWarmupState({ enabledAt: t0, now: 'x' })).toEqual(inactive);
    });
    test('weeks 1 to 3', () => {
        expect(getWarmupState({ enabledAt: t0, now: t0 })).toMatchObject({ active: true, week: 1, dailyLimit: 10 });
        expect(getWarmupState({ enabledAt: t0, now: t0 + 7 * DAY })).toMatchObject({ week: 2, dailyLimit: 20 });
        expect(getWarmupState({ enabledAt: t0, now: t0 + 20 * DAY })).toMatchObject({ week: 3, dailyLimit: 30 });
    });
    test('future enabledAt counts as week 1', () => {
        expect(getWarmupState({ enabledAt: t0, now: t0 - DAY }).week).toBe(1);
    });
    test('completed after 21 days', () => {
        expect(getWarmupState({ enabledAt: t0, now: t0 + 21 * DAY })).toEqual({
            active: false, completed: true, week: 0, dailyLimit: null
        });
    });
});

describe('getEffectiveConnectDailyLimit', () => {
    test('no inputs returns base', () => {
        expect(getEffectiveConnectDailyLimit({ baseDaily: 40 })).toEqual({ limit: 40, reasons: [] });
        expect(getEffectiveConnectDailyLimit({ baseDaily: 40, acceptance: {}, warmup: {} }).limit).toBe(40);
    });
    test('low acceptance halves (floor)', () => {
        expect(getEffectiveConnectDailyLimit({ baseDaily: 41, acceptance: { low: true } }))
            .toEqual({ limit: 20, reasons: ['lowAcceptance'] });
    });
    test('warmup caps when lower', () => {
        expect(getEffectiveConnectDailyLimit({ baseDaily: 40, warmup: { active: true, dailyLimit: 10 } }))
            .toEqual({ limit: 10, reasons: ['warmup'] });
    });
    test('warmup ignored when not lower', () => {
        expect(getEffectiveConnectDailyLimit({ baseDaily: 40, warmup: { active: true, dailyLimit: 30 } }).limit).toBe(30);
        expect(getEffectiveConnectDailyLimit({
            baseDaily: 40, acceptance: { low: true }, warmup: { active: true, dailyLimit: 30 }
        })).toEqual({ limit: 20, reasons: ['lowAcceptance'] });
    });
    test('both reasons', () => {
        expect(getEffectiveConnectDailyLimit({
            baseDaily: 40, acceptance: { low: true }, warmup: { active: true, dailyLimit: 10 }
        })).toEqual({ limit: 10, reasons: ['lowAcceptance', 'warmup'] });
    });
    test('no args', () => {
        expect(getEffectiveConnectDailyLimit().reasons).toEqual([]);
    });
});

describe('resolveConnectSafety', () => {
    test('combines everything', () => {
        const t0 = 1700000000000;
        const r = resolveConnectSafety({
            baseDaily: 40, acceptedCount: 2, sentCount: 40, warmupEnabledAt: t0, now: t0 + 8 * DAY
        });
        expect(r.limit).toBe(20);
        expect(r.reasons).toEqual(['lowAcceptance']);
        expect(r.warmup.week).toBe(2);
        expect(r.acceptance.low).toBe(true);
    });
    test('defaults', () => {
        expect(resolveConnectSafety().reasons).toEqual([]);
    });
});
