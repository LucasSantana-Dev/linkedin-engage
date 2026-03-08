const {
    DEFAULT_WINDOWS,
    DAY_WEIGHTS,
    getOptimalWindows,
    labelForHour,
    getBestDays,
    shouldRunNow,
    getNextOptimalSlot,
    computeScheduleRecommendation
} = require('../extension/lib/smart-schedule');

describe('constants', () => {
    test('default windows has 3 entries', () => {
        expect(DEFAULT_WINDOWS.length).toBe(3);
    });

    test('day weights cover all 7 days', () => {
        expect(Object.keys(DAY_WEIGHTS).length).toBe(7);
    });

    test('weekdays weighted higher than weekends', () => {
        expect(DAY_WEIGHTS.Tue).toBeGreaterThan(
            DAY_WEIGHTS.Sat
        );
        expect(DAY_WEIGHTS.Wed).toBeGreaterThan(
            DAY_WEIGHTS.Sun
        );
    });
});

describe('labelForHour', () => {
    test('morning hours', () => {
        expect(labelForHour(7)).toBe('morning');
        expect(labelForHour(11)).toBe('morning');
    });

    test('afternoon hours', () => {
        expect(labelForHour(12)).toBe('afternoon');
        expect(labelForHour(14)).toBe('afternoon');
    });

    test('evening hours', () => {
        expect(labelForHour(17)).toBe('evening');
        expect(labelForHour(20)).toBe('evening');
    });

    test('night hours', () => {
        expect(labelForHour(22)).toBe('night');
        expect(labelForHour(3)).toBe('night');
    });
});

describe('getOptimalWindows', () => {
    test('returns defaults when no data', () => {
        expect(getOptimalWindows(null, null))
            .toEqual(DEFAULT_WINDOWS);
    });

    test('returns defaults for empty analytics', () => {
        expect(getOptimalWindows({}, null))
            .toEqual(DEFAULT_WINDOWS);
    });

    test('builds windows from analytics data', () => {
        const analytics = {
            byHour: { 10: 50, 14: 40, 20: 30 }
        };
        const windows = getOptimalWindows(analytics, null);
        expect(windows.length).toBeGreaterThan(0);
        expect(windows.length).toBeLessThanOrEqual(3);
        expect(windows[0].score).toBeGreaterThanOrEqual(
            windows[windows.length - 1].score
        );
    });

    test('incorporates acceptance rates', () => {
        const analytics = { byHour: { 10: 10 } };
        const acceptance = {
            15: { sent: 10, accepted: 8, rate: 80 }
        };
        const windows = getOptimalWindows(
            analytics, acceptance
        );
        const has15 = windows.some(
            w => w.start <= 15 && w.end > 15
        );
        expect(has15).toBe(true);
    });

    test('ignores acceptance with low sample size', () => {
        const acceptance = {
            3: { sent: 2, accepted: 2, rate: 100 }
        };
        const windows = getOptimalWindows(null, acceptance);
        expect(windows).toEqual(DEFAULT_WINDOWS);
    });

    test('max 3 windows', () => {
        const analytics = {
            byHour: {
                6: 100, 10: 90, 14: 80,
                18: 70, 22: 60
            }
        };
        const windows = getOptimalWindows(analytics, null);
        expect(windows.length).toBeLessThanOrEqual(3);
    });

    test('windows do not overlap', () => {
        const analytics = {
            byHour: { 10: 50, 11: 48, 12: 45 }
        };
        const windows = getOptimalWindows(analytics, null);
        for (let i = 0; i < windows.length; i++) {
            for (let j = i + 1; j < windows.length; j++) {
                const a = windows[i];
                const b = windows[j];
                expect(
                    a.end <= b.start || b.end <= a.start
                ).toBe(true);
            }
        }
    });
});

describe('getBestDays', () => {
    test('returns top 3 weekdays by default', () => {
        const days = getBestDays({});
        expect(days.length).toBe(3);
        expect(days).toContain('Tue');
    });

    test('uses analytics data when available', () => {
        const analytics = {
            byDayOfWeek: {
                Sat: 100, Sun: 90, Fri: 80
            }
        };
        const days = getBestDays(analytics);
        expect(days[0]).toBe('Sat');
        expect(days[1]).toBe('Sun');
        expect(days[2]).toBe('Fri');
    });

    test('returns max 3 days', () => {
        const analytics = {
            byDayOfWeek: {
                Mon: 10, Tue: 20, Wed: 30,
                Thu: 40, Fri: 50
            }
        };
        expect(getBestDays(analytics).length).toBe(3);
    });
});

describe('shouldRunNow', () => {
    test('returns structured result', () => {
        const result = shouldRunNow(null, null);
        expect(result).toHaveProperty('recommended');
        expect(result).toHaveProperty('inWindow');
        expect(result).toHaveProperty('isGoodDay');
        expect(result).toHaveProperty('currentHour');
        expect(result).toHaveProperty('currentDay');
        expect(result).toHaveProperty('dayWeight');
        expect(result).toHaveProperty('windows');
        expect(result).toHaveProperty('bestDays');
    });

    test('dayWeight is a number', () => {
        const result = shouldRunNow(null, null);
        expect(typeof result.dayWeight).toBe('number');
        expect(result.dayWeight).toBeGreaterThan(0);
    });
});

describe('getNextOptimalSlot', () => {
    test('returns slot info', () => {
        const result = getNextOptimalSlot(null, null);
        expect(result).toHaveProperty('hoursUntil');
        expect(result).toHaveProperty('window');
        expect(result.hoursUntil).toBeGreaterThanOrEqual(0);
    });

    test('hoursUntil is positive', () => {
        const result = getNextOptimalSlot(null, null);
        expect(result.hoursUntil).toBeGreaterThan(0);
    });
});

describe('computeScheduleRecommendation', () => {
    test('returns recommendation with suggestion', () => {
        const rec = computeScheduleRecommendation(
            null, null
        );
        expect(rec).toHaveProperty('suggestion');
        expect(typeof rec.suggestion).toBe('string');
        expect(rec).toHaveProperty('nextSlot');
    });

    test('includes all shouldRunNow fields', () => {
        const rec = computeScheduleRecommendation(
            null, null
        );
        expect(rec).toHaveProperty('recommended');
        expect(rec).toHaveProperty('inWindow');
        expect(rec).toHaveProperty('windows');
        expect(rec).toHaveProperty('bestDays');
    });

    test('with strong analytics data', () => {
        const analytics = {
            byHour: { 10: 100, 14: 80, 18: 60 },
            byDayOfWeek: { Tue: 50, Wed: 40, Thu: 30 }
        };
        const acceptance = {
            10: { sent: 20, accepted: 14, rate: 70 }
        };
        const rec = computeScheduleRecommendation(
            analytics, acceptance
        );
        expect(rec.windows.length).toBeGreaterThan(0);
    });
});
