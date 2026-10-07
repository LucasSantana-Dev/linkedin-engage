const {
    DAILY_LIMITS,
    HOURLY_LIMITS,
    WEEKLY_LIMIT,
    getHourKey,
    getDayKey,
    getWeekKey,
    checkLimits,
    getLimitStatus,
    incrementCount,
    cleanupOldKeys
} = require('../extension/lib/rate-limiter');

describe('constants', () => {
    test('daily limits defined for all modes', () => {
        expect(DAILY_LIMITS.connect).toBe(40);
        expect(DAILY_LIMITS.companyFollow).toBe(30);
        expect(DAILY_LIMITS.jobsAssist).toBe(20);
    });

    test('hourly limits defined for all modes', () => {
        expect(HOURLY_LIMITS.connect).toBe(12);
        expect(HOURLY_LIMITS.companyFollow).toBe(10);
        expect(HOURLY_LIMITS.jobsAssist).toBe(8);
    });

    test('weekly limit is 150', () => {
        expect(WEEKLY_LIMIT).toBe(150);
    });
});

describe('key generation', () => {
    test('getHourKey includes mode and date', () => {
        const key = getHourKey('connect');
        expect(key).toMatch(
            /^rate_connect_\d{4}-\d{2}-\d{2}_\d+$/
        );
    });

    test('getDayKey includes mode and date', () => {
        const key = getDayKey('connect');
        expect(key).toMatch(
            /^rate_connect_\d{4}-\d{2}-\d{2}$/
        );
    });

    test('getWeekKey returns week format', () => {
        const key = getWeekKey();
        expect(key).toMatch(/^week_\d{4}_\d+$/);
    });

    test('different modes produce different keys', () => {
        const a = getHourKey('connect');
        const b = getHourKey('companyFollow');
        expect(a).not.toBe(b);
    });
});

describe('checkLimits', () => {
    test('allows when under all limits', () => {
        const result = checkLimits(0, 0, 0, 'connect');
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(12);
    });

    test('blocks on hourly limit', () => {
        const result = checkLimits(
            12, 5, 10, 'connect'
        );
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('hourly');
    });

    test('blocks on daily limit', () => {
        const result = checkLimits(
            5, 40, 50, 'connect'
        );
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('daily');
    });

    test('blocks on weekly limit for connect', () => {
        const result = checkLimits(
            5, 20, 150, 'connect'
        );
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('weekly');
    });

    test('weekly limit only applies to connect', () => {
        const result = checkLimits(
            5, 20, 150, 'companyFollow'
        );
        expect(result.allowed).toBe(true);
    });

    test('remaining is min of all limits', () => {
        const result = checkLimits(
            10, 35, 145, 'connect'
        );
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(2);
    });

    test('uses default limits for unknown mode', () => {
        const result = checkLimits(
            0, 0, 0, 'unknown'
        );
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(12);
    });

    test('companyFollow uses its own limits', () => {
        const result = checkLimits(
            10, 0, 0, 'companyFollow'
        );
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('hourly');
    });

    test('jobsAssist uses its own limits', () => {
        const ok = checkLimits(
            7, 19, 0, 'jobsAssist'
        );
        expect(ok.allowed).toBe(true);
        const blocked = checkLimits(
            8, 0, 0, 'jobsAssist'
        );
        expect(blocked.allowed).toBe(false);
        expect(blocked.reason).toBe('hourly');
    });
});

describe('getLimitStatus', () => {
    test('resolves with mock storage', async () => {
        const mockStorage = {
            get: (keys, cb) => cb({})
        };
        const result = await getLimitStatus(
            'connect', mockStorage
        );
        expect(result.allowed).toBe(true);
    });

    test('resolves with existing counts', async () => {
        const hKey = getHourKey('connect');
        const dKey = getDayKey('connect');
        const wKey = getWeekKey();
        const mockStorage = {
            get: (keys, cb) => cb({
                [hKey]: 11,
                [dKey]: 30,
                [wKey]: 100
            })
        };
        const result = await getLimitStatus(
            'connect', mockStorage
        );
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(1);
    });

    test('resolves with no storage', async () => {
        const result = await getLimitStatus(
            'connect', null
        );
        expect(result.allowed).toBe(true);
    });
});

describe('incrementCount', () => {
    test('increments all three keys', (done) => {
        const stored = {};
        const mockStorage = {
            get: (keys, cb) => cb({}),
            set: (data) => {
                Object.assign(stored, data);
                const keys = Object.keys(stored);
                expect(keys.length).toBe(3);
                const vals = Object.values(stored);
                expect(vals.every(v => v === 1)).toBe(true);
                done();
            }
        };
        incrementCount('connect', mockStorage);
    });

    test('does nothing with null storage', () => {
        expect(
            () => incrementCount('connect', null)
        ).not.toThrow();
    });
});

describe('cleanupOldKeys', () => {
    test('removes old rate keys', (done) => {
        const oldDate = '2020-01-01';
        const mockStorage = {
            get: (_, cb) => cb({
                [`rate_connect_${oldDate}_5`]: 3,
                [`rate_connect_${oldDate}`]: 10,
                'someOtherKey': 'keep',
                'rate_connect_2099-12-31': 5
            }),
            remove: (keys) => {
                expect(keys.length).toBe(2);
                expect(keys).toContain(
                    `rate_connect_${oldDate}_5`
                );
                expect(keys).toContain(
                    `rate_connect_${oldDate}`
                );
                done();
            }
        };
        cleanupOldKeys(mockStorage);
    });

    test('does nothing with null storage', () => {
        expect(
            () => cleanupOldKeys(null)
        ).not.toThrow();
    });
});

describe('rate-limiter UMD exposure', () => {
    const limiter = require('../extension/lib/rate-limiter');
    const names = [
        'DAILY_LIMITS', 'HOURLY_LIMITS', 'WEEKLY_LIMIT', 'getHourKey',
        'getDayKey', 'getWeekKey', 'checkLimits', 'getLimitStatus',
        'incrementCount', 'incrementPeriodCounts', 'cleanupOldKeys'
    ];

    test('exports a frozen api and mirrors every name onto the global', () => {
        expect(Object.isFrozen(limiter)).toBe(true);
        expect(Object.keys(limiter).sort()).toEqual([...names].sort());
        names.forEach(name => {
            expect(globalThis[name]).toBe(limiter[name]);
        });
        expect(globalThis.LinkedInRateLimiter).toBe(limiter);
    });
});

describe('withdrawInvites mode', () => {
    const { incrementPeriodCounts } = require('../extension/lib/rate-limiter');

    test('limits are 20 per hour and 40 per day', () => {
        expect(HOURLY_LIMITS.withdrawInvites).toBe(20);
        expect(DAILY_LIMITS.withdrawInvites).toBe(40);
        expect(checkLimits(0, 40, 0, 'withdrawInvites').reason).toBe('daily');
        expect(checkLimits(20, 0, 0, 'withdrawInvites').reason).toBe('hourly');
        expect(checkLimits(10, 25, 999, 'withdrawInvites')).toMatchObject({
            allowed: true,
            remaining: 10
        });
    });

    test('incrementPeriodCounts adds to hour and day only', () => {
        const set = jest.fn();
        incrementPeriodCounts('withdrawInvites', {
            get: (keys, cb) => cb({ [keys[1]]: 5 }),
            set
        }, 3);
        const written = set.mock.calls[0][0];
        expect(Object.keys(written)).toHaveLength(2);
        expect(Object.keys(written).some(k => k.startsWith('week_'))).toBe(false);
        expect(Object.values(written).sort()).toEqual([3, 8]);
    });

    test('incrementPeriodCounts ignores bad input', () => {
        const set = jest.fn();
        const storage = { get: (k, cb) => cb({}), set };
        incrementPeriodCounts('withdrawInvites', storage, 0);
        incrementPeriodCounts('withdrawInvites', storage, 'x');
        incrementPeriodCounts('withdrawInvites', null, 2);
        expect(set).not.toHaveBeenCalled();
    });
});
