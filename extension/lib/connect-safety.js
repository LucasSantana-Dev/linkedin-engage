(function(root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
    root.LinkedInConnectSafety = api;
    Object.keys(api).forEach(k => { if (typeof root[k] === 'undefined') root[k] = api[k]; });
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
    const LOW_ACCEPTANCE_RATE = 0.2;
    const LOW_ACCEPTANCE_MIN_SAMPLE = 30;
    const WARMUP_DAILY_LIMITS = Object.freeze([10, 20, 30]);
    const WARMUP_WEEK_MS = 7 * 86400000;
    const WARMUP_TOTAL_MS = WARMUP_WEEK_MS * WARMUP_DAILY_LIMITS.length;

    function computeAcceptance({ acceptedCount, sentCount } = {}) {
        const sample = Math.max(0, Number(sentCount) || 0);
        const accepted = Math.max(0, Number(acceptedCount) || 0);
        if (sample === 0) {
            return { rate: null, sample, low: false };
        }
        const rate = accepted / sample;
        return {
            rate,
            sample,
            low: sample >= LOW_ACCEPTANCE_MIN_SAMPLE &&
                rate < LOW_ACCEPTANCE_RATE
        };
    }

    function getWarmupState({ enabledAt, now } = {}) {
        const start = Number(enabledAt);
        const current = Number(now);
        if (!Number.isFinite(start) || start <= 0 ||
            !Number.isFinite(current)) {
            return { active: false, completed: false, week: 0, dailyLimit: null };
        }
        const elapsed = Math.max(0, current - start);
        if (elapsed >= WARMUP_TOTAL_MS) {
            return { active: false, completed: true, week: 0, dailyLimit: null };
        }
        const week = Math.floor(elapsed / WARMUP_WEEK_MS) + 1;
        return {
            active: true,
            completed: false,
            week,
            dailyLimit: WARMUP_DAILY_LIMITS[week - 1]
        };
    }

    function getEffectiveConnectDailyLimit({ baseDaily, acceptance, warmup } = {}) {
        let limit = baseDaily;
        const reasons = [];
        if (acceptance?.low) {
            limit = Math.floor(limit / 2);
            reasons.push('lowAcceptance');
        }
        if (warmup?.active && warmup.dailyLimit < limit) {
            limit = warmup.dailyLimit;
            reasons.push('warmup');
        }
        return { limit, reasons };
    }

    function resolveConnectSafety({
        baseDaily, acceptedCount, sentCount, warmupEnabledAt, now
    } = {}) {
        const acceptance = computeAcceptance({ acceptedCount, sentCount });
        const warmup = getWarmupState({ enabledAt: warmupEnabledAt, now });
        const { limit, reasons } = getEffectiveConnectDailyLimit({
            baseDaily, acceptance, warmup
        });
        return { acceptance, warmup, limit, reasons };
    }

    // Launch limit = user value capped by every remaining budget. A cap of
    // null/undefined is ignored; a remaining budget of 0 blocks the run.
    function resolveLaunchLimit({ userLimit, weeklyLeft, dailyLeft } = {}) {
        const caps = [userLimit, weeklyLeft, dailyLeft]
            .filter(v => Number.isFinite(v));
        if (!caps.length) return 0;
        return Math.max(0, Math.min(...caps));
    }

    return Object.freeze({
        LOW_ACCEPTANCE_RATE,
        LOW_ACCEPTANCE_MIN_SAMPLE,
        WARMUP_DAILY_LIMITS,
        computeAcceptance,
        getWarmupState,
        getEffectiveConnectDailyLimit,
        resolveConnectSafety,
        resolveLaunchLimit
    });
});
