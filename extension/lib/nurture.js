const NURTURE_WINDOW_DAYS = 7;
const MAX_NURTURE_PROFILES = 50;
const ENGAGEMENTS_PER_PROFILE = 3;

function getNurtureList(storage) {
    return new Promise(resolve => {
        if (!storage?.get) {
            resolve([]);
            return;
        }
        storage.get('nurtureList', (data) => {
            resolve(data.nurtureList || []);
        });
    });
}

function addToNurture(profileUrl, name, storage) {
    if (!storage?.get || !profileUrl) return;
    storage.get('nurtureList', (data) => {
        const list = data.nurtureList || [];
        const exists = list.some(
            p => p.profileUrl === profileUrl
        );
        if (exists) return;

        list.push({
            profileUrl,
            name: name || 'Unknown',
            addedAt: new Date().toISOString(),
            engagements: 0,
            lastEngaged: null
        });

        const trimmed = list.slice(-MAX_NURTURE_PROFILES);
        storage.set({ nurtureList: trimmed });
    });
}

function recordNurtureEngagement(
    profileUrl, storage
) {
    if (!storage?.get || !profileUrl) return;
    storage.get('nurtureList', (data) => {
        const list = data.nurtureList || [];
        const entry = list.find(
            p => p.profileUrl === profileUrl
        );
        if (entry) {
            entry.engagements++;
            entry.lastEngaged = new Date().toISOString();
            storage.set({ nurtureList: list });
        }
    });
}

function getActiveNurtureTargets(list) {
    const now = new Date();
    const cutoff = new Date(
        now.getTime() -
        NURTURE_WINDOW_DAYS * 24 * 60 * 60 * 1000
    );

    return list.filter(entry => {
        const added = new Date(entry.addedAt);
        if (added < cutoff) return false;
        if (entry.engagements >= ENGAGEMENTS_PER_PROFILE) {
            return false;
        }
        if (entry.lastEngaged) {
            const last = new Date(entry.lastEngaged);
            const hoursSince =
                (now - last) / (1000 * 60 * 60);
            if (hoursSince < 12) return false;
        }
        return true;
    });
}

function cleanExpiredNurtures(storage) {
    if (!storage?.get) return;
    storage.get('nurtureList', (data) => {
        const list = data.nurtureList || [];
        const cutoff = new Date(
            Date.now() -
            (NURTURE_WINDOW_DAYS + 3) *
            24 * 60 * 60 * 1000
        );
        const active = list.filter(
            e => new Date(e.addedAt) >= cutoff
        );
        if (active.length !== list.length) {
            storage.set({ nurtureList: active });
        }
    });
}

function buildNurtureUrl(profileUrl) {
    const clean = profileUrl.split('?')[0]
        .replace(/\/$/, '');
    return clean + '/recent-activity/all/';
}

function isNurtureTarget(authorUrl, targets) {
    if (!authorUrl || !targets?.length) return false;
    const clean = authorUrl.split('?')[0]
        .replace(/\/$/, '');
    return targets.some(t => {
        const tClean = t.profileUrl.split('?')[0]
            .replace(/\/$/, '');
        return clean === tClean ||
            clean.includes(tClean) ||
            tClean.includes(clean);
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
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
    };
}
