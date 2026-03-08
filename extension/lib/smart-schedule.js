const DEFAULT_WINDOWS = [
    { start: 7, end: 9, weight: 1.2, label: 'morning' },
    { start: 11, end: 13, weight: 1.1, label: 'midday' },
    { start: 17, end: 19, weight: 1.0, label: 'evening' }
];

const DAY_WEIGHTS = {
    Mon: 1.2, Tue: 1.3, Wed: 1.2,
    Thu: 1.1, Fri: 0.9, Sat: 0.6, Sun: 0.5
};

function getOptimalWindows(analytics, acceptanceByHour) {
    if (!analytics && !acceptanceByHour) {
        return DEFAULT_WINDOWS;
    }

    const hourScores = {};
    for (let h = 0; h < 24; h++) {
        hourScores[h] = 0;
    }

    const byHour = analytics?.byHour || {};
    for (const [h, count] of Object.entries(byHour)) {
        hourScores[parseInt(h)] += count;
    }

    if (acceptanceByHour) {
        for (const [h, data] of
            Object.entries(acceptanceByHour)) {
            if (data.sent >= 5) {
                hourScores[parseInt(h)] +=
                    (data.rate || 0) * 2;
            }
        }
    }

    const ranked = Object.entries(hourScores)
        .map(([h, score]) => ({
            hour: parseInt(h), score
        }))
        .sort((a, b) => b.score - a.score);

    const windows = [];
    const used = new Set();

    for (const { hour, score } of ranked) {
        if (score <= 0) break;
        if (windows.length >= 3) break;
        if (used.has(hour)) continue;

        const start = Math.max(0, hour - 1);
        const end = Math.min(23, hour + 1);
        let overlap = false;
        for (let h = start; h <= end; h++) {
            if (used.has(h)) { overlap = true; break; }
        }
        if (overlap) continue;

        for (let h = start; h <= end; h++) {
            used.add(h);
        }
        windows.push({
            start,
            end: end + 1,
            weight: 1 + (score / 100),
            label: labelForHour(hour),
            score
        });
    }

    return windows.length > 0 ? windows : DEFAULT_WINDOWS;
}

function labelForHour(h) {
    if (h >= 5 && h < 12) return 'morning';
    if (h >= 12 && h < 17) return 'afternoon';
    if (h >= 17 && h < 21) return 'evening';
    return 'night';
}

function getBestDays(analytics) {
    const byDay = analytics?.byDayOfWeek || {};
    if (Object.keys(byDay).length === 0) {
        return Object.entries(DAY_WEIGHTS)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([day]) => day);
    }

    return Object.entries(byDay)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([day]) => day);
}

function shouldRunNow(analytics, acceptanceByHour) {
    const now = new Date();
    const hour = now.getUTCHours();
    const dayNames = [
        'Sun', 'Mon', 'Tue', 'Wed',
        'Thu', 'Fri', 'Sat'
    ];
    const day = dayNames[now.getDay()];

    const windows = getOptimalWindows(
        analytics, acceptanceByHour
    );
    const inWindow = windows.some(
        w => hour >= w.start && hour < w.end
    );

    const bestDays = getBestDays(analytics);
    const isGoodDay = bestDays.includes(day);

    const dayWeight = DAY_WEIGHTS[day] || 0.5;

    return {
        recommended: inWindow && isGoodDay,
        inWindow,
        isGoodDay,
        currentHour: hour,
        currentDay: day,
        dayWeight,
        windows,
        bestDays
    };
}

function getNextOptimalSlot(analytics, acceptanceByHour) {
    const now = new Date();
    const hour = now.getUTCHours();
    const windows = getOptimalWindows(
        analytics, acceptanceByHour
    );

    for (const w of windows) {
        if (w.start > hour) {
            return {
                hoursUntil: w.start - hour,
                window: w
            };
        }
    }

    const first = windows[0] || DEFAULT_WINDOWS[0];
    return {
        hoursUntil: (24 - hour) + first.start,
        window: first
    };
}

function computeScheduleRecommendation(
    analytics, acceptanceByHour
) {
    const status = shouldRunNow(
        analytics, acceptanceByHour
    );
    const next = getNextOptimalSlot(
        analytics, acceptanceByHour
    );

    return {
        ...status,
        nextSlot: next,
        suggestion: status.recommended
            ? 'Good time to run automation'
            : `Better to wait ~${next.hoursUntil}h ` +
              `(${next.window.label} window)`
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DEFAULT_WINDOWS,
        DAY_WEIGHTS,
        getOptimalWindows,
        labelForHour,
        getBestDays,
        shouldRunNow,
        getNextOptimalSlot,
        computeScheduleRecommendation
    };
}
