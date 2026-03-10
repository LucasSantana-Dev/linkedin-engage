function recordEngagement(entry, storage) {
    if (!storage?.get) return;
    storage.get('analyticsLog', (data) => {
        const log = data.analyticsLog || [];
        log.push({
            ...entry,
            timestamp: new Date().toISOString()
        });
        storage.set({
            analyticsLog: log.slice(-5000)
        });
    });
}

function computeStats(log) {
    if (!log || !log.length) {
        return {
            total: 0,
            byMode: {},
            byCategory: {},
            byReaction: {},
            byTemplate: {},
            bySkipReason: {},
            byHour: {},
            byDayOfWeek: {},
            commentRate: 0,
            avgPerDay: 0,
            activeDays: 0,
            topCategory: null,
            topReaction: null,
            bestHour: null,
            bestDay: null
        };
    }

    const byMode = {};
    const byCategory = {};
    const byReaction = {};
    const byTemplate = {};
    const bySkipReason = {};
    const byHour = {};
    const byDayOfWeek = {};
    const dayNames = [
        'Sun', 'Mon', 'Tue', 'Wed',
        'Thu', 'Fri', 'Sat'
    ];
    let commentCount = 0;
    let engagedCount = 0;
    const days = new Set();

    for (const e of log) {
        const mode = e.mode || 'unknown';
        byMode[mode] = (byMode[mode] || 0) + 1;

        if (e.category) {
            byCategory[e.category] =
                (byCategory[e.category] || 0) + 1;
        }

        if (e.reaction) {
            byReaction[e.reaction] =
                (byReaction[e.reaction] || 0) + 1;
        }

        if (e.templateId) {
            byTemplate[e.templateId] =
                (byTemplate[e.templateId] || 0) + 1;
        }
        if (e.status &&
            (e.status.startsWith('skipped') ||
                e.status.startsWith('skip-'))) {
            bySkipReason[e.status] =
                (bySkipReason[e.status] || 0) + 1;
        }

        if (e.timestamp) {
            const d = new Date(e.timestamp);
            const hour = d.getUTCHours();
            byHour[hour] = (byHour[hour] || 0) + 1;
            const day = dayNames[d.getDay()];
            byDayOfWeek[day] =
                (byDayOfWeek[day] || 0) + 1;
            days.add(e.timestamp.substring(0, 10));
        }

        if (e.commented) commentCount++;
        if (!e.status?.startsWith('skipped') &&
            !e.status?.startsWith('skip-')) {
            engagedCount++;
        }
    }

    const topCategory = topKey(byCategory);
    const topReaction = topKey(byReaction);
    const bestHour = topKey(byHour);
    const bestDay = topKey(byDayOfWeek);
    const activeDays = days.size;
    const avgPerDay = activeDays > 0
        ? Math.round(log.length / activeDays * 10) / 10
        : 0;

    return {
        total: log.length,
        byMode,
        byCategory,
        byReaction,
        byTemplate,
        bySkipReason,
        byHour,
        byDayOfWeek,
        commentRate: engagedCount > 0
            ? Math.round(
                (commentCount / engagedCount) * 100
            ) : 0,
        avgPerDay,
        activeDays,
        topCategory,
        topReaction,
        bestHour: bestHour !== null
            ? parseInt(bestHour) : null,
        bestDay
    };
}

function computeAcceptanceByTemplate(
    connectionHistory, acceptedUrls
) {
    if (!connectionHistory?.length) return {};
    const acceptedSet = new Set(acceptedUrls || []);
    const templates = {};

    for (const r of connectionHistory) {
        const tpl = r.templateId || r.template ||
            'unknown';
        if (!templates[tpl]) {
            templates[tpl] = { sent: 0, accepted: 0 };
        }
        templates[tpl].sent++;
        if (r.profileUrl && acceptedSet.has(r.profileUrl)) {
            templates[tpl].accepted++;
        }
    }

    for (const tpl of Object.keys(templates)) {
        const t = templates[tpl];
        t.rate = t.sent > 0
            ? Math.round(
                (t.accepted / t.sent) * 100
            ) : 0;
    }

    return templates;
}

function computeAcceptanceByHour(
    connectionHistory, acceptedUrls
) {
    if (!connectionHistory?.length) return {};
    const acceptedSet = new Set(acceptedUrls || []);
    const hours = {};

    for (const r of connectionHistory) {
        if (!r.time) continue;
        const hour = new Date(r.time).getUTCHours();
        if (!hours[hour]) {
            hours[hour] = { sent: 0, accepted: 0 };
        }
        hours[hour].sent++;
        if (r.profileUrl && acceptedSet.has(r.profileUrl)) {
            hours[hour].accepted++;
        }
    }

    for (const h of Object.keys(hours)) {
        const t = hours[h];
        t.rate = t.sent > 0
            ? Math.round(
                (t.accepted / t.sent) * 100
            ) : 0;
    }

    return hours;
}

function topKey(obj) {
    if (!obj || Object.keys(obj).length === 0) return null;
    let best = null;
    let bestVal = -1;
    for (const [k, v] of Object.entries(obj)) {
        if (v > bestVal) {
            bestVal = v;
            best = k;
        }
    }
    return best;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        recordEngagement,
        computeStats,
        computeAcceptanceByTemplate,
        computeAcceptanceByHour,
        topKey
    };
}
