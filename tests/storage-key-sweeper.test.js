const {
    DEFAULT_TTL_DAYS,
    findStaleDailyKeys,
    sweepStaleDailyKeys
} = require('../extension/lib/storage-key-sweeper');

describe('findStaleDailyKeys', () => {
    const NOW = new Date(Date.UTC(2026, 3, 25)); // 2026-04-25

    it('flags keys older than the default TTL (90 days)', () => {
        const stale = findStaleDailyKeys([
            'profileWalkCount_2025_12_01',
            'profileWalkCount_2026_04_24'
        ], { now: NOW });
        expect(stale).toEqual(['profileWalkCount_2025_12_01']);
    });

    it('keeps today, recent keys, and the exact 90-day boundary (inclusive cutoff)', () => {
        const stale = findStaleDailyKeys([
            'profileWalkCount_2026_04_25',
            'profileWalkCount_2026_03_01',
            'profileWalkCount_2026_01_25',
            'profileWalkCount_2026_01_24'
        ], { now: NOW });
        // Cutoff = 2026-04-25 - 90d = 2026-01-25.
        // Keys with date >= cutoff are kept (strict-less-than rule),
        // so 2026-01-25 itself stays; only 2026-01-24 falls off.
        expect(stale).toEqual(['profileWalkCount_2026_01_24']);
    });

    it('respects a custom ttlDays option', () => {
        const stale = findStaleDailyKeys([
            'profileWalkCount_2026_04_18',
            'profileWalkCount_2026_04_24'
        ], { now: NOW, ttlDays: 3 });
        // ttlDays=3 → cutoff at 2026-04-22.
        expect(stale).toEqual(['profileWalkCount_2026_04_18']);
    });

    it('ignores keys without a YYYY_MM_DD suffix', () => {
        const stale = findStaleDailyKeys([
            'popupState',
            'nurtureList',
            'connectStateV2',
            'profileWalkConfig',
            'profileWalkCount_2024_01_01'
        ], { now: NOW });
        expect(stale).toEqual(['profileWalkCount_2024_01_01']);
    });

    it('rejects malformed date components (e.g. month 13, day 32, Feb 30)', () => {
        const stale = findStaleDailyKeys([
            'foo_2024_13_01',
            'foo_2024_05_32',
            'foo_2024_02_30',
            'foo_2024_00_15',
            'foo_abcd_ef_gh'
        ], { now: NOW });
        expect(stale).toEqual([]);
    });

    it('handles non-string entries and non-array input gracefully', () => {
        expect(findStaleDailyKeys([null, undefined, 42, {}, 'x'], { now: NOW }))
            .toEqual([]);
        expect(findStaleDailyKeys(null, { now: NOW })).toEqual([]);
        expect(findStaleDailyKeys(undefined, { now: NOW })).toEqual([]);
    });

    it('exports DEFAULT_TTL_DAYS = 90', () => {
        expect(DEFAULT_TTL_DAYS).toBe(90);
    });
});

describe('sweepStaleDailyKeys', () => {
    function fakeStorage(initialData) {
        const store = { ...initialData };
        return {
            store,
            removed: [],
            get(query, cb) {
                if (query === null) {
                    cb({ ...store });
                    return;
                }
                cb({ [query]: store[query] });
            },
            remove(keys, cb) {
                const list = Array.isArray(keys) ? keys : [keys];
                for (const k of list) {
                    delete store[k];
                    this.removed.push(k);
                }
                cb && cb();
            }
        };
    }

    it('removes stale keys and reports them', async () => {
        const storage = fakeStorage({
            popupState: { foo: 1 },
            profileWalkCount_2025_01_01: 5,
            profileWalkCount_2026_04_25: 12
        });
        const result = await sweepStaleDailyKeys(storage, {
            now: new Date(Date.UTC(2026, 3, 25))
        });
        expect(result.removed).toBe(1);
        expect(result.keys).toEqual(['profileWalkCount_2025_01_01']);
        expect(storage.store).toHaveProperty('profileWalkCount_2026_04_25');
        expect(storage.store).toHaveProperty('popupState');
        expect(storage.store).not.toHaveProperty(
            'profileWalkCount_2025_01_01'
        );
    });

    it('returns {removed: 0} when nothing is stale', async () => {
        const storage = fakeStorage({
            profileWalkCount_2026_04_25: 12
        });
        const result = await sweepStaleDailyKeys(storage, {
            now: new Date(Date.UTC(2026, 3, 25))
        });
        expect(result).toEqual({ removed: 0, keys: [] });
        expect(storage.removed).toEqual([]);
    });

    it('no-ops on missing storageArea', async () => {
        expect(await sweepStaleDailyKeys(null)).toEqual({
            removed: 0,
            keys: []
        });
        expect(await sweepStaleDailyKeys({})).toEqual({
            removed: 0,
            keys: []
        });
    });
});
