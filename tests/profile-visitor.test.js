const {
    DEFAULTS,
    normalizeConfig,
    isLinkedInProfileUrl,
    dedupeProfileUrls,
    runProfileWalk
} = require('../extension/lib/profile-visitor');

const SAMPLE_URLS = [
    'https://www.linkedin.com/in/alice',
    'https://linkedin.com/in/bob/',
    'https://www.linkedin.com/in/alice?utm=spam',
    'https://www.linkedin.com/in/charlie',
    'https://www.google.com',
    ''
];

function makeHarness(overrides = {}) {
    const opened = [];
    const closed = [];
    const visits = [];
    const sleeps = [];
    const deps = {
        urls: overrides.urls || SAMPLE_URLS,
        config: overrides.config || {
            dailyTarget: 3,
            dwellMsMin: 10,
            dwellMsMax: 12,
            jitterMsMin: 0,
            jitterMsMax: 0,
            perMinuteMax: 100
        },
        openTab: overrides.openTab || (async (url) => {
            opened.push(url);
            return `tab-${opened.length}`;
        }),
        closeTab: overrides.closeTab || (async (tabId) => {
            closed.push(tabId);
        }),
        sleep: overrides.sleep || (async (ms) => {
            sleeps.push(ms);
        }),
        isDailyCapReached: overrides.isDailyCapReached
            || (async () => false),
        recordVisit: overrides.recordVisit
            || (async (url) => { visits.push(url); }),
        isChallengeDetected: overrides.isChallengeDetected
            || (async () => false),
        shouldStop: overrides.shouldStop || (() => false),
        rng: overrides.rng || (() => 0.5)
    };
    return { deps, opened, closed, visits, sleeps };
}

describe('profile-visitor', () => {
    describe('normalizeConfig', () => {
        it('applies defaults when config is empty', () => {
            const cfg = normalizeConfig({});
            expect(cfg.dailyTarget).toBe(DEFAULTS.dailyTarget);
            expect(cfg.dwellMsMin).toBe(DEFAULTS.dwellMsMin);
            expect(cfg.perMinuteMax).toBe(DEFAULTS.perMinuteMax);
        });

        it('clamps dailyTarget between 0 and 50', () => {
            expect(normalizeConfig({ dailyTarget: -5 })
                .dailyTarget).toBe(0);
            expect(normalizeConfig({ dailyTarget: 100 })
                .dailyTarget).toBe(50);
            expect(normalizeConfig({ dailyTarget: 'nope' })
                .dailyTarget).toBe(DEFAULTS.dailyTarget);
        });

        it('clamps dwell range to safe bounds', () => {
            const cfg = normalizeConfig({
                dwellMsMin: 100,
                dwellMsMax: 999999
            });
            expect(cfg.dwellMsMin).toBe(2000);
            expect(cfg.dwellMsMax).toBe(30000);
        });
    });

    describe('isLinkedInProfileUrl', () => {
        it('accepts canonical profile URLs', () => {
            expect(isLinkedInProfileUrl(
                'https://www.linkedin.com/in/alice'
            )).toBe(true);
            expect(isLinkedInProfileUrl(
                'http://linkedin.com/in/bob/'
            )).toBe(true);
        });

        it('rejects non-profile URLs', () => {
            expect(isLinkedInProfileUrl(
                'https://www.linkedin.com/company/acme'
            )).toBe(false);
            expect(isLinkedInProfileUrl(
                'https://google.com'
            )).toBe(false);
            expect(isLinkedInProfileUrl('')).toBe(false);
            expect(isLinkedInProfileUrl(null)).toBe(false);
        });
    });

    describe('dedupeProfileUrls', () => {
        it('filters, normalizes, and dedupes', () => {
            const out = dedupeProfileUrls(SAMPLE_URLS);
            expect(out).toEqual([
                'https://www.linkedin.com/in/alice',
                'https://linkedin.com/in/bob',
                'https://www.linkedin.com/in/charlie'
            ]);
        });
    });

    describe('runProfileWalk', () => {
        it('visits up to dailyTarget and records each', async () => {
            const { deps, opened, closed, visits } = makeHarness();
            const out = await runProfileWalk(deps);
            expect(out.visited).toBe(3);
            expect(opened).toHaveLength(3);
            expect(closed).toHaveLength(3);
            expect(visits).toHaveLength(3);
            expect(out.reason).toBe('target-reached');
        });

        it('stops when daily cap is already reached', async () => {
            const { deps, opened } = makeHarness({
                isDailyCapReached: async () => true
            });
            const out = await runProfileWalk(deps);
            expect(out.visited).toBe(0);
            expect(opened).toHaveLength(0);
            expect(out.reason).toBe('daily-cap');
        });

        it('aborts cleanly when challenge is detected', async () => {
            let calls = 0;
            const { deps, opened } = makeHarness({
                isChallengeDetected: async () => {
                    calls++;
                    return calls > 1;
                }
            });
            const out = await runProfileWalk(deps);
            expect(out.visited).toBe(1);
            expect(opened).toHaveLength(1);
            expect(out.reason).toBe('challenge');
        });

        it('returns missing-tab-deps when deps are incomplete', async () => {
            const out = await runProfileWalk({
                urls: SAMPLE_URLS,
                config: { dailyTarget: 3 }
            });
            expect(out.errors).toBe(1);
            expect(out.reason).toBe('missing-tab-deps');
            expect(out.visited).toBe(0);
        });

        it('respects shouldStop between visits', async () => {
            let count = 0;
            const { deps, opened } = makeHarness({
                shouldStop: () => {
                    count++;
                    return count > 2;
                }
            });
            const out = await runProfileWalk(deps);
            expect(out.visited).toBe(2);
            expect(opened).toHaveLength(2);
            expect(out.reason).toBe('stopped');
        });

        it('uses default dep stubs when optionals are omitted', async () => {
            const opened = [];
            const closed = [];
            const out = await runProfileWalk({
                urls: ['https://www.linkedin.com/in/zed'],
                config: {
                    dailyTarget: 1,
                    dwellMsMin: 2000,
                    dwellMsMax: 2000,
                    jitterMsMin: 0,
                    jitterMsMax: 0,
                    perMinuteMax: 5
                },
                openTab: async (url) => {
                    opened.push(url);
                    return 'tab-z';
                },
                closeTab: async (id) => { closed.push(id); }
            });
            expect(out.visited).toBe(1);
            expect(opened).toHaveLength(1);
            expect(closed).toHaveLength(1);
        }, 10000);

        it('counts an error when openTab rejects and continues', async () => {
            const { deps, opened } = makeHarness({
                openTab: async (url) => {
                    if (url.endsWith('alice')) {
                        throw new Error('tab-create-failed');
                    }
                    opened.push(url);
                    return `tab-${opened.length}`;
                }
            });
            const out = await runProfileWalk(deps);
            expect(out.errors).toBeGreaterThanOrEqual(1);
            expect(out.visited).toBeGreaterThan(0);
        });

        it('counts an error when closeTab rejects but still records the visit', async () => {
            const { deps } = makeHarness({
                closeTab: async () => {
                    throw new Error('close-failed');
                }
            });
            const out = await runProfileWalk(deps);
            expect(out.visited).toBe(3);
            expect(out.errors).toBeGreaterThanOrEqual(3);
        });

        it('swallows recordVisit errors', async () => {
            const { deps } = makeHarness({
                recordVisit: async () => {
                    throw new Error('record-broken');
                }
            });
            const out = await runProfileWalk(deps);
            expect(out.visited).toBe(3);
            expect(out.errors).toBe(0);
        });

        it('breaks with target-reached when URL list exceeds dailyTarget', async () => {
            const { deps, opened } = makeHarness({
                urls: [
                    'https://www.linkedin.com/in/a',
                    'https://www.linkedin.com/in/b',
                    'https://www.linkedin.com/in/c',
                    'https://www.linkedin.com/in/d',
                    'https://www.linkedin.com/in/e'
                ],
                config: {
                    dailyTarget: 2,
                    dwellMsMin: 10,
                    dwellMsMax: 12,
                    jitterMsMin: 0,
                    jitterMsMax: 0,
                    perMinuteMax: 10
                }
            });
            const out = await runProfileWalk(deps);
            expect(out.visited).toBe(2);
            expect(opened).toHaveLength(2);
            expect(out.reason).toBe('target-reached');
        });

        it('returns exhausted-queue when the URL list is shorter than dailyTarget', async () => {
            const { deps } = makeHarness({
                urls: ['https://www.linkedin.com/in/only'],
                config: {
                    dailyTarget: 5,
                    dwellMsMin: 10,
                    dwellMsMax: 12,
                    jitterMsMin: 0,
                    jitterMsMax: 0,
                    perMinuteMax: 10
                }
            });
            const out = await runProfileWalk(deps);
            expect(out.visited).toBe(1);
            expect(out.reason).toBe('exhausted-queue');
        });

        it('evicts aged entries from the per-minute window', async () => {
            const realNow = Date.now;
            let fake = 1_000_000;
            Date.now = () => fake;
            try {
                const { deps, opened } = makeHarness({
                    config: {
                        dailyTarget: 3,
                        dwellMsMin: 10,
                        dwellMsMax: 12,
                        jitterMsMin: 0,
                        jitterMsMax: 0,
                        perMinuteMax: 1
                    },
                    sleep: async () => {
                        fake += 70_000;
                    }
                });
                const out = await runProfileWalk(deps);
                expect(out.visited).toBe(3);
                expect(opened).toHaveLength(3);
            } finally {
                Date.now = realNow;
            }
        });

        it('honors perMinuteMax by throttling when needed', async () => {
            const { deps, sleeps } = makeHarness({
                config: {
                    dailyTarget: 5,
                    dwellMsMin: 10,
                    dwellMsMax: 12,
                    jitterMsMin: 0,
                    jitterMsMax: 0,
                    perMinuteMax: 1
                },
                urls: [
                    'https://www.linkedin.com/in/a',
                    'https://www.linkedin.com/in/b',
                    'https://www.linkedin.com/in/c'
                ]
            });
            const out = await runProfileWalk(deps);
            expect(out.visited).toBe(3);
            const throttleSleeps = sleeps.filter(
                (ms) => ms > 50000
            );
            expect(throttleSleeps.length)
                .toBeGreaterThanOrEqual(2);
        });
    });
});
