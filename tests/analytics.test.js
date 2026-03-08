const {
    recordEngagement,
    computeStats,
    computeAcceptanceByTemplate,
    computeAcceptanceByHour,
    topKey
} = require('../extension/lib/analytics');

describe('topKey', () => {
    test('returns key with highest value', () => {
        expect(topKey({ a: 5, b: 10, c: 3 })).toBe('b');
    });

    test('returns null for empty object', () => {
        expect(topKey({})).toBe(null);
    });

    test('returns null for null', () => {
        expect(topKey(null)).toBe(null);
    });
});

describe('recordEngagement', () => {
    test('appends entry to storage', (done) => {
        const mockStorage = {
            get: (key, cb) => cb({ analyticsLog: [
                { mode: 'feed' }
            ]}),
            set: (data) => {
                expect(data.analyticsLog.length).toBe(2);
                expect(data.analyticsLog[1].mode)
                    .toBe('connect');
                expect(data.analyticsLog[1].timestamp)
                    .toBeDefined();
                done();
            }
        };
        recordEngagement(
            { mode: 'connect' }, mockStorage
        );
    });

    test('creates new log if none exists', (done) => {
        const mockStorage = {
            get: (key, cb) => cb({}),
            set: (data) => {
                expect(data.analyticsLog.length).toBe(1);
                done();
            }
        };
        recordEngagement(
            { mode: 'feed' }, mockStorage
        );
    });

    test('caps at 5000 entries', (done) => {
        const big = Array.from(
            { length: 5000 },
            () => ({ mode: 'feed' })
        );
        const mockStorage = {
            get: (key, cb) => cb({
                analyticsLog: big
            }),
            set: (data) => {
                expect(data.analyticsLog.length)
                    .toBe(5000);
                done();
            }
        };
        recordEngagement(
            { mode: 'connect' }, mockStorage
        );
    });

    test('does nothing with null storage', () => {
        expect(
            () => recordEngagement({ mode: 'x' }, null)
        ).not.toThrow();
    });
});

describe('computeStats', () => {
    const log = [
        {
            mode: 'feed', category: 'technical',
            reaction: 'insightful', commented: true,
            timestamp: '2026-03-08T10:00:00Z'
        },
        {
            mode: 'feed', category: 'technical',
            reaction: 'like',
            timestamp: '2026-03-08T14:00:00Z'
        },
        {
            mode: 'feed', category: 'achievement',
            reaction: 'celebrate',
            timestamp: '2026-03-09T10:00:00Z'
        },
        {
            mode: 'connect', templateId: 'senior',
            timestamp: '2026-03-08T10:00:00Z'
        },
        {
            mode: 'connect', templateId: 'senior',
            timestamp: '2026-03-08T11:00:00Z'
        },
        {
            mode: 'connect', templateId: 'mid',
            timestamp: '2026-03-09T15:00:00Z'
        }
    ];

    test('counts total correctly', () => {
        const s = computeStats(log);
        expect(s.total).toBe(6);
    });

    test('groups by mode', () => {
        const s = computeStats(log);
        expect(s.byMode.feed).toBe(3);
        expect(s.byMode.connect).toBe(3);
    });

    test('groups by category', () => {
        const s = computeStats(log);
        expect(s.byCategory.technical).toBe(2);
        expect(s.byCategory.achievement).toBe(1);
    });

    test('groups by reaction', () => {
        const s = computeStats(log);
        expect(s.byReaction.insightful).toBe(1);
        expect(s.byReaction.like).toBe(1);
    });

    test('groups by template', () => {
        const s = computeStats(log);
        expect(s.byTemplate.senior).toBe(2);
        expect(s.byTemplate.mid).toBe(1);
    });

    test('groups by hour', () => {
        const s = computeStats(log);
        expect(s.byHour[10]).toBe(3);
    });

    test('groups by day of week', () => {
        const s = computeStats(log);
        expect(s.byDayOfWeek).toBeDefined();
    });

    test('calculates comment rate', () => {
        const s = computeStats(log);
        expect(s.commentRate).toBeGreaterThan(0);
    });

    test('calculates active days', () => {
        const s = computeStats(log);
        expect(s.activeDays).toBe(2);
    });

    test('calculates avg per day', () => {
        const s = computeStats(log);
        expect(s.avgPerDay).toBe(3);
    });

    test('finds top category', () => {
        const s = computeStats(log);
        expect(s.topCategory).toBe('technical');
    });

    test('finds best hour', () => {
        const s = computeStats(log);
        expect(s.bestHour).toBe(10);
    });

    test('handles empty log', () => {
        const s = computeStats([]);
        expect(s.total).toBe(0);
        expect(s.topCategory).toBe(null);
    });

    test('handles null log', () => {
        const s = computeStats(null);
        expect(s.total).toBe(0);
    });
});

describe('computeAcceptanceByTemplate', () => {
    test('calculates per-template acceptance', () => {
        const history = [
            {
                templateId: 'senior',
                profileUrl: 'https://linkedin.com/in/a'
            },
            {
                templateId: 'senior',
                profileUrl: 'https://linkedin.com/in/b'
            },
            {
                templateId: 'mid',
                profileUrl: 'https://linkedin.com/in/c'
            },
            {
                templateId: 'mid',
                profileUrl: 'https://linkedin.com/in/d'
            }
        ];
        const accepted = [
            'https://linkedin.com/in/a',
            'https://linkedin.com/in/d'
        ];
        const result = computeAcceptanceByTemplate(
            history, accepted
        );
        expect(result.senior.sent).toBe(2);
        expect(result.senior.accepted).toBe(1);
        expect(result.senior.rate).toBe(50);
        expect(result.mid.sent).toBe(2);
        expect(result.mid.accepted).toBe(1);
        expect(result.mid.rate).toBe(50);
    });

    test('handles no history', () => {
        const result = computeAcceptanceByTemplate([], []);
        expect(result).toEqual({});
    });

    test('handles null', () => {
        const result = computeAcceptanceByTemplate(
            null, null
        );
        expect(result).toEqual({});
    });

    test('handles zero accepted', () => {
        const history = [
            { templateId: 'senior', profileUrl: 'x' }
        ];
        const result = computeAcceptanceByTemplate(
            history, []
        );
        expect(result.senior.rate).toBe(0);
    });
});

describe('computeAcceptanceByHour', () => {
    test('groups acceptance by hour', () => {
        const history = [
            {
                profileUrl: 'https://linkedin.com/in/a',
                time: '2026-03-08T09:30:00Z'
            },
            {
                profileUrl: 'https://linkedin.com/in/b',
                time: '2026-03-08T09:45:00Z'
            },
            {
                profileUrl: 'https://linkedin.com/in/c',
                time: '2026-03-08T14:00:00Z'
            }
        ];
        const accepted = [
            'https://linkedin.com/in/a'
        ];
        const result = computeAcceptanceByHour(
            history, accepted
        );
        expect(result[9].sent).toBe(2);
        expect(result[9].accepted).toBe(1);
        expect(result[9].rate).toBe(50);
        expect(result[14].sent).toBe(1);
        expect(result[14].accepted).toBe(0);
    });

    test('handles empty history', () => {
        expect(computeAcceptanceByHour([], []))
            .toEqual({});
    });

    test('handles entries with no time', () => {
        const history = [{ profileUrl: 'x' }];
        const result = computeAcceptanceByHour(
            history, []
        );
        expect(result).toEqual({});
    });
});
