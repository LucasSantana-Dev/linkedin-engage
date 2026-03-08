const DAILY_LIMITS = {
    connect: 40,
    companyFollow: 30,
    feedEngage: 50
};

const HOURLY_LIMITS = {
    connect: 12,
    companyFollow: 10,
    feedEngage: 15
};

const WEEKLY_LIMIT = 150;

function getHourKey(mode) {
    const now = new Date();
    const h = now.getUTCHours();
    const d = now.toISOString().substring(0, 10);
    return `rate_${mode}_${d}_${h}`;
}

function getDayKey(mode) {
    const d = new Date().toISOString().substring(0, 10);
    return `rate_${mode}_${d}`;
}

function getWeekKey() {
    const now = new Date();
    const jan1 = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil(
        ((now - jan1) / 86400000 + jan1.getDay() + 1) / 7
    );
    return `week_${now.getFullYear()}_${week}`;
}

function checkLimits(hourCount, dayCount, weekCount, mode) {
    const hourLimit = HOURLY_LIMITS[mode] ||
        HOURLY_LIMITS.connect;
    const dayLimit = DAILY_LIMITS[mode] ||
        DAILY_LIMITS.connect;

    if (mode === 'connect' && weekCount >= WEEKLY_LIMIT) {
        return {
            allowed: false,
            reason: 'weekly',
            remaining: 0,
            limit: WEEKLY_LIMIT
        };
    }
    if (dayCount >= dayLimit) {
        return {
            allowed: false,
            reason: 'daily',
            remaining: 0,
            limit: dayLimit
        };
    }
    if (hourCount >= hourLimit) {
        return {
            allowed: false,
            reason: 'hourly',
            remaining: 0,
            limit: hourLimit
        };
    }

    const hourRemaining = hourLimit - hourCount;
    const dayRemaining = dayLimit - dayCount;
    const weekRemaining = mode === 'connect'
        ? WEEKLY_LIMIT - weekCount
        : Infinity;
    const remaining = Math.min(
        hourRemaining, dayRemaining, weekRemaining
    );

    return {
        allowed: true,
        reason: null,
        remaining,
        hourCount,
        dayCount,
        weekCount
    };
}

function getLimitStatus(mode, storage) {
    return new Promise(resolve => {
        const hKey = getHourKey(mode);
        const dKey = getDayKey(mode);
        const wKey = getWeekKey();
        const keys = [hKey, dKey, wKey];

        if (typeof storage?.get === 'function') {
            storage.get(keys, (data) => {
                resolve(checkLimits(
                    data[hKey] || 0,
                    data[dKey] || 0,
                    data[wKey] || 0,
                    mode
                ));
            });
        } else {
            resolve(checkLimits(0, 0, 0, mode));
        }
    });
}

function incrementCount(mode, storage) {
    if (typeof storage?.get !== 'function') return;

    const hKey = getHourKey(mode);
    const dKey = getDayKey(mode);
    const wKey = getWeekKey();

    storage.get([hKey, dKey, wKey], (data) => {
        storage.set({
            [hKey]: (data[hKey] || 0) + 1,
            [dKey]: (data[dKey] || 0) + 1,
            [wKey]: (data[wKey] || 0) + 1
        });
    });
}

function cleanupOldKeys(storage) {
    if (typeof storage?.get !== 'function') return;

    storage.get(null, (data) => {
        const now = new Date();
        const twoDaysAgo = new Date(
            now.getTime() - 2 * 86400000
        ).toISOString().substring(0, 10);
        const keysToRemove = [];
        for (const key of Object.keys(data)) {
            if (!key.startsWith('rate_')) continue;
            const parts = key.split('_');
            const dateStr = parts[2];
            if (dateStr && dateStr < twoDaysAgo) {
                keysToRemove.push(key);
            }
        }
        if (keysToRemove.length > 0) {
            storage.remove(keysToRemove);
        }
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
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
    };
}
