(function(root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.LinkedInProfileVisitor = api;
    Object.keys(api).forEach(function(key) {
        if (typeof root[key] === 'undefined') {
            root[key] = api[key];
        }
    });
})(
    typeof globalThis !== 'undefined' ? globalThis : this,
    function() {
        const DEFAULTS = Object.freeze({
            dailyTarget: 25,
            dailyTargetMax: 50,
            dwellMsMin: 6000,
            dwellMsMax: 10000,
            jitterMsMin: 1500,
            jitterMsMax: 4000,
            perMinuteMax: 8
        });

        function clampInt(value, min, max, fallback) {
            const n = Number(value);
            if (!Number.isFinite(n)) return fallback;
            return Math.max(min, Math.min(max, Math.floor(n)));
        }

        function normalizeConfig(config) {
            const source = (config && typeof config === 'object')
                ? config : {};
            return {
                dailyTarget: clampInt(
                    source.dailyTarget, 0,
                    DEFAULTS.dailyTargetMax,
                    DEFAULTS.dailyTarget
                ),
                dwellMsMin: clampInt(
                    source.dwellMsMin, 2000, 20000,
                    DEFAULTS.dwellMsMin
                ),
                dwellMsMax: clampInt(
                    source.dwellMsMax, 2000, 30000,
                    DEFAULTS.dwellMsMax
                ),
                jitterMsMin: clampInt(
                    source.jitterMsMin, 0, 20000,
                    DEFAULTS.jitterMsMin
                ),
                jitterMsMax: clampInt(
                    source.jitterMsMax, 0, 30000,
                    DEFAULTS.jitterMsMax
                ),
                perMinuteMax: clampInt(
                    source.perMinuteMax, 1, 20,
                    DEFAULTS.perMinuteMax
                )
            };
        }

        function isLinkedInProfileUrl(url) {
            if (!url || typeof url !== 'string') return false;
            return /^https?:\/\/(www\.)?linkedin\.com\/in\//i
                .test(url);
        }

        function dedupeProfileUrls(urls) {
            const seen = new Set();
            const out = [];
            for (const raw of (urls || [])) {
                if (!isLinkedInProfileUrl(raw)) continue;
                const norm = String(raw).split('?')[0]
                    .replace(/\/$/, '');
                if (seen.has(norm)) continue;
                seen.add(norm);
                out.push(norm);
            }
            return out;
        }

        function pickInRange(min, max, rng) {
            const r = typeof rng === 'function' ? rng() : Math.random();
            return Math.floor(min + r * Math.max(0, max - min));
        }

        async function runProfileWalk(input) {
            const deps = input && typeof input === 'object'
                ? input : {};
            const config = normalizeConfig(deps.config);
            const urls = dedupeProfileUrls(deps.urls);

            const openTab = typeof deps.openTab === 'function'
                ? deps.openTab : null;
            const closeTab = typeof deps.closeTab === 'function'
                ? deps.closeTab : null;
            const sleep = typeof deps.sleep === 'function'
                ? deps.sleep
                : (ms) => new Promise(r => setTimeout(r, ms));
            const isDailyCapReached = typeof deps.isDailyCapReached
                === 'function'
                ? deps.isDailyCapReached : (() => false);
            const recordVisit = typeof deps.recordVisit
                === 'function'
                ? deps.recordVisit : (() => {});
            const isChallengeDetected =
                typeof deps.isChallengeDetected === 'function'
                    ? deps.isChallengeDetected : (() => false);
            const shouldStop = typeof deps.shouldStop
                === 'function'
                ? deps.shouldStop : (() => false);
            const rng = typeof deps.rng === 'function'
                ? deps.rng : Math.random;

            const result = {
                visited: 0,
                skippedAlreadyVisited: 0,
                skippedCap: 0,
                skippedChallenge: 0,
                errors: 0,
                visitedUrls: []
            };

            if (!openTab || !closeTab) {
                result.errors = 1;
                result.reason = 'missing-tab-deps';
                return result;
            }

            const perMinuteWindow = [];
            for (const url of urls) {
                if (shouldStop()) {
                    result.reason = 'stopped';
                    break;
                }
                if (result.visited >= config.dailyTarget) {
                    result.reason = 'target-reached';
                    break;
                }
                if (await isDailyCapReached()) {
                    result.skippedCap++;
                    result.reason = 'daily-cap';
                    break;
                }
                if (await isChallengeDetected()) {
                    result.skippedChallenge++;
                    result.reason = 'challenge';
                    break;
                }

                const now = Date.now();
                while (perMinuteWindow.length &&
                    now - perMinuteWindow[0] > 60000) {
                    perMinuteWindow.shift();
                }
                if (perMinuteWindow.length >=
                    config.perMinuteMax) {
                    const waitMs = 60000 -
                        (now - perMinuteWindow[0]);
                    if (waitMs > 0) await sleep(waitMs);
                }

                let tabId = null;
                try {
                    tabId = await openTab(url);
                } catch (err) {
                    result.errors++;
                    continue;
                }
                const dwell = pickInRange(
                    config.dwellMsMin,
                    config.dwellMsMax,
                    rng
                );
                await sleep(dwell);
                try {
                    await closeTab(tabId);
                } catch (err) {
                    result.errors++;
                }
                result.visited++;
                result.visitedUrls.push(url);
                perMinuteWindow.push(Date.now());
                try {
                    await recordVisit(url);
                } catch (err) { /* swallow */ }

                const jitter = pickInRange(
                    config.jitterMsMin,
                    config.jitterMsMax,
                    rng
                );
                if (jitter > 0) await sleep(jitter);
            }

            if (!result.reason &&
                result.visited >= config.dailyTarget) {
                result.reason = 'target-reached';
            } else if (!result.reason) {
                result.reason = 'exhausted-queue';
            }
            return result;
        }

        return {
            DEFAULTS,
            normalizeConfig,
            isLinkedInProfileUrl,
            dedupeProfileUrls,
            runProfileWalk
        };
    }
);
