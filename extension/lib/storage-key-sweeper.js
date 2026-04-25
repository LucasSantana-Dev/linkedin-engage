(function(root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.LinkedInStorageKeySweeper = api;
    Object.keys(api).forEach(function(key) {
        if (typeof root[key] === 'undefined') {
            root[key] = api[key];
        }
    });
})(
    typeof globalThis !== 'undefined' ? globalThis : this,
    function() {
        const DEFAULT_TTL_DAYS = 90;

        // Matches keys ending in _YYYY_MM_DD (the per-day counter pattern
        // used by profileWalkCount and any future daily-stamped key).
        const DATE_SUFFIX_RE =
            /^([A-Za-z][A-Za-z0-9]*)_(\d{4})_(\d{2})_(\d{2})$/;

        function parseDateSuffix(key) {
            const m = DATE_SUFFIX_RE.exec(key);
            if (!m) return null;
            const year = Number(m[2]);
            const month = Number(m[3]);
            const day = Number(m[4]);
            if (month < 1 || month > 12) return null;
            if (day < 1 || day > 31) return null;
            const dt = new Date(Date.UTC(year, month - 1, day));
            if (Number.isNaN(dt.getTime())) return null;
            // Reject dates that round-tripped (e.g. Feb 30 → Mar 2).
            if (dt.getUTCFullYear() !== year) return null;
            if (dt.getUTCMonth() !== month - 1) return null;
            if (dt.getUTCDate() !== day) return null;
            return dt;
        }

        function findStaleDailyKeys(allKeys, options) {
            const opts = options || {};
            const ttlDays = Number.isFinite(opts.ttlDays)
                ? Math.max(1, opts.ttlDays)
                : DEFAULT_TTL_DAYS;
            const now = opts.now instanceof Date
                ? opts.now
                : new Date();
            const cutoff = new Date(now.getTime());
            cutoff.setUTCDate(cutoff.getUTCDate() - ttlDays);

            const stale = [];
            const list = Array.isArray(allKeys) ? allKeys : [];
            for (const key of list) {
                if (typeof key !== 'string') continue;
                const dt = parseDateSuffix(key);
                if (!dt) continue;
                if (dt.getTime() < cutoff.getTime()) {
                    stale.push(key);
                }
            }
            return stale;
        }

        function sweepStaleDailyKeys(storageArea, options) {
            return new Promise(function(resolve) {
                if (!storageArea ||
                    typeof storageArea.get !== 'function' ||
                    typeof storageArea.remove !== 'function') {
                    resolve({ removed: 0, keys: [] });
                    return;
                }
                storageArea.get(null, function(all) {
                    const allKeys = Object.keys(all || {});
                    const stale = findStaleDailyKeys(
                        allKeys,
                        options
                    );
                    if (stale.length === 0) {
                        resolve({ removed: 0, keys: [] });
                        return;
                    }
                    storageArea.remove(stale, function() {
                        resolve({
                            removed: stale.length,
                            keys: stale
                        });
                    });
                });
            });
        }

        return {
            DEFAULT_TTL_DAYS,
            findStaleDailyKeys,
            sweepStaleDailyKeys
        };
    }
);
