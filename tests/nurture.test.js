const {
    NURTURE_WINDOW_DAYS,
    MAX_NURTURE_PROFILES,
    ENGAGEMENTS_PER_PROFILE,
    getNurtureList,
    addToNurture,
    recordNurtureEngagement,
    getActiveNurtureTargets,
    cleanExpiredNurtures,
    buildNurtureUrl,
    isNurtureTarget
} = require('../extension/lib/nurture');

describe('constants', () => {
    test('nurture window is 7 days', () => {
        expect(NURTURE_WINDOW_DAYS).toBe(7);
    });
    test('max profiles is 50', () => {
        expect(MAX_NURTURE_PROFILES).toBe(50);
    });
    test('engagements per profile is 3', () => {
        expect(ENGAGEMENTS_PER_PROFILE).toBe(3);
    });
});

describe('getNurtureList', () => {
    test('returns list from storage', async () => {
        const list = [{ profileUrl: 'a' }];
        const storage = {
            get: (key, cb) => cb({ nurtureList: list })
        };
        const result = await getNurtureList(storage);
        expect(result).toEqual(list);
    });

    test('returns empty for no storage', async () => {
        expect(await getNurtureList(null)).toEqual([]);
    });

    test('returns empty when not set', async () => {
        const storage = { get: (_, cb) => cb({}) };
        expect(await getNurtureList(storage)).toEqual([]);
    });
});

describe('addToNurture', () => {
    test('adds new profile', (done) => {
        const storage = {
            get: (_, cb) => cb({ nurtureList: [] }),
            set: (data) => {
                expect(data.nurtureList.length).toBe(1);
                expect(data.nurtureList[0].profileUrl)
                    .toBe('https://linkedin.com/in/test');
                expect(data.nurtureList[0].engagements)
                    .toBe(0);
                done();
            }
        };
        addToNurture(
            'https://linkedin.com/in/test',
            'Test User',
            storage
        );
    });

    test('does not add duplicate', (done) => {
        const existing = [{
            profileUrl: 'https://linkedin.com/in/test',
            name: 'Test', addedAt: new Date().toISOString(),
            engagements: 0, lastEngaged: null
        }];
        let setCalled = false;
        const storage = {
            get: (_, cb) => cb({
                nurtureList: existing
            }),
            set: () => { setCalled = true; }
        };
        addToNurture(
            'https://linkedin.com/in/test',
            'Test', storage
        );
        setTimeout(() => {
            expect(setCalled).toBe(false);
            done();
        }, 50);
    });

    test('does nothing with null storage', () => {
        expect(() => addToNurture('x', 'y', null))
            .not.toThrow();
    });

    test('does nothing with empty url', () => {
        let setCalled = false;
        const storage = {
            get: () => {}, set: () => { setCalled = true; }
        };
        addToNurture('', 'Name', storage);
        expect(setCalled).toBe(false);
    });
});

describe('recordNurtureEngagement', () => {
    test('increments engagements', (done) => {
        const list = [{
            profileUrl: 'https://linkedin.com/in/a',
            engagements: 1, lastEngaged: null
        }];
        const storage = {
            get: (_, cb) => cb({ nurtureList: list }),
            set: (data) => {
                expect(data.nurtureList[0].engagements)
                    .toBe(2);
                expect(data.nurtureList[0].lastEngaged)
                    .toBeDefined();
                done();
            }
        };
        recordNurtureEngagement(
            'https://linkedin.com/in/a', storage
        );
    });

    test('does nothing for unknown profile', (done) => {
        let setCalled = false;
        const storage = {
            get: (_, cb) => cb({ nurtureList: [] }),
            set: () => { setCalled = true; }
        };
        recordNurtureEngagement(
            'https://linkedin.com/in/unknown', storage
        );
        setTimeout(() => {
            expect(setCalled).toBe(false);
            done();
        }, 50);
    });
});

describe('getActiveNurtureTargets', () => {
    test('returns recent entries under limit', () => {
        const list = [{
            profileUrl: 'a',
            addedAt: new Date().toISOString(),
            engagements: 0,
            lastEngaged: null
        }];
        const active = getActiveNurtureTargets(list);
        expect(active.length).toBe(1);
    });

    test('excludes expired entries', () => {
        const old = new Date(
            Date.now() - 8 * 24 * 60 * 60 * 1000
        );
        const list = [{
            profileUrl: 'a',
            addedAt: old.toISOString(),
            engagements: 0,
            lastEngaged: null
        }];
        expect(getActiveNurtureTargets(list).length)
            .toBe(0);
    });

    test('excludes fully engaged', () => {
        const list = [{
            profileUrl: 'a',
            addedAt: new Date().toISOString(),
            engagements: 3,
            lastEngaged: null
        }];
        expect(getActiveNurtureTargets(list).length)
            .toBe(0);
    });

    test('excludes recently engaged (<12h)', () => {
        const list = [{
            profileUrl: 'a',
            addedAt: new Date().toISOString(),
            engagements: 1,
            lastEngaged: new Date().toISOString()
        }];
        expect(getActiveNurtureTargets(list).length)
            .toBe(0);
    });

    test('includes if engaged >12h ago', () => {
        const thirteenHoursAgo = new Date(
            Date.now() - 13 * 60 * 60 * 1000
        );
        const list = [{
            profileUrl: 'a',
            addedAt: new Date().toISOString(),
            engagements: 1,
            lastEngaged: thirteenHoursAgo.toISOString()
        }];
        expect(getActiveNurtureTargets(list).length)
            .toBe(1);
    });
});

describe('cleanExpiredNurtures', () => {
    test('removes old entries', (done) => {
        const old = new Date(
            Date.now() - 11 * 24 * 60 * 60 * 1000
        );
        const recent = new Date();
        const list = [
            {
                profileUrl: 'old',
                addedAt: old.toISOString()
            },
            {
                profileUrl: 'new',
                addedAt: recent.toISOString()
            }
        ];
        const storage = {
            get: (_, cb) => cb({ nurtureList: list }),
            set: (data) => {
                expect(data.nurtureList.length).toBe(1);
                expect(data.nurtureList[0].profileUrl)
                    .toBe('new');
                done();
            }
        };
        cleanExpiredNurtures(storage);
    });

    test('does nothing when all current', (done) => {
        const list = [{
            profileUrl: 'a',
            addedAt: new Date().toISOString()
        }];
        let setCalled = false;
        const storage = {
            get: (_, cb) => cb({ nurtureList: list }),
            set: () => { setCalled = true; }
        };
        cleanExpiredNurtures(storage);
        setTimeout(() => {
            expect(setCalled).toBe(false);
            done();
        }, 50);
    });
});

describe('buildNurtureUrl', () => {
    test('appends recent-activity path', () => {
        expect(buildNurtureUrl(
            'https://linkedin.com/in/test'
        )).toBe(
            'https://linkedin.com/in/test' +
            '/recent-activity/all/'
        );
    });

    test('strips query params', () => {
        expect(buildNurtureUrl(
            'https://linkedin.com/in/test?trk=abc'
        )).toBe(
            'https://linkedin.com/in/test' +
            '/recent-activity/all/'
        );
    });

    test('strips trailing slash', () => {
        expect(buildNurtureUrl(
            'https://linkedin.com/in/test/'
        )).toBe(
            'https://linkedin.com/in/test' +
            '/recent-activity/all/'
        );
    });
});

describe('isNurtureTarget', () => {
    const targets = [
        {
            profileUrl: 'https://linkedin.com/in/alice',
            name: 'Alice'
        },
        {
            profileUrl: 'https://linkedin.com/in/bob',
            name: 'Bob'
        }
    ];

    test('matches exact URL', () => {
        expect(isNurtureTarget(
            'https://linkedin.com/in/alice', targets
        )).toBe(true);
    });

    test('matches with query params', () => {
        expect(isNurtureTarget(
            'https://linkedin.com/in/alice?trk=x',
            targets
        )).toBe(true);
    });

    test('rejects non-target', () => {
        expect(isNurtureTarget(
            'https://linkedin.com/in/charlie', targets
        )).toBe(false);
    });

    test('rejects null url', () => {
        expect(isNurtureTarget(null, targets))
            .toBe(false);
    });

    test('rejects empty targets', () => {
        expect(isNurtureTarget(
            'https://linkedin.com/in/alice', []
        )).toBe(false);
    });
});
