const WEEKLY_LIMIT = 150;
const DEFAULT_DASHBOARD_STATE = {
    activeTab: 'overview'
};
let dashboardState = { ...DEFAULT_DASHBOARD_STATE };

function normalizeDashboardUiState(state) {
    if (typeof normalizeDashboardState === 'function') {
        return normalizeDashboardState(state);
    }
    const allowed = ['overview', 'activity', 'feed', 'nurture', 'logs'];
    const activeTab = String(state?.activeTab || 'overview');
    return {
        activeTab: allowed.includes(activeTab)
            ? activeTab
            : 'overview'
    };
}

function getDashboardVisibility(activeTab) {
    if (typeof getDashboardSectionVisibility === 'function') {
        return getDashboardSectionVisibility(activeTab);
    }
    const normalized = normalizeDashboardUiState({
        activeTab
    }).activeTab;
    return {
        overview: normalized === 'overview',
        activity: normalized === 'activity',
        feed: normalized === 'feed',
        nurture: normalized === 'nurture',
        logs: normalized === 'logs'
    };
}

function saveDashboardState() {
    chrome.storage.local.set({
        dashboardState
    });
}

function renderDashboardTabs() {
    const visibility = getDashboardVisibility(
        dashboardState.activeTab
    );
    document.querySelectorAll('[data-dashboard-tab]')
        .forEach(btn => {
            const tab = btn.dataset.dashboardTab;
            const isActive = tab === dashboardState.activeTab;
            btn.classList.toggle('active', isActive);
            btn.setAttribute(
                'aria-selected',
                isActive ? 'true' : 'false'
            );
        });

    document.querySelectorAll('[data-tab-section]')
        .forEach(section => {
            const key = section.dataset.tabSection;
            const isVisible = visibility[key] === true;
            if (isVisible) {
                section.removeAttribute('data-tab-hidden');
            } else {
                section.setAttribute('data-tab-hidden', 'true');
            }
        });
}

function setDashboardTab(tab, shouldSave) {
    dashboardState = normalizeDashboardUiState({
        activeTab: tab
    });
    renderDashboardTabs();
    if (shouldSave) saveDashboardState();
}

function initializeDashboardTabs() {
    document.querySelectorAll('[data-dashboard-tab]')
        .forEach(btn => {
            btn.addEventListener('click', () => {
                setDashboardTab(
                    btn.dataset.dashboardTab,
                    true
                );
            });
        });

    dashboardState = normalizeDashboardUiState(
        dashboardState
    );
    renderDashboardTabs();

    chrome.storage.local.get(
        'dashboardState',
        ({ dashboardState: stored }) => {
            dashboardState = normalizeDashboardUiState(
                stored
            );
            renderDashboardTabs();
        }
    );
}

function getWeekKey() {
    const now = new Date();
    const jan1 = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil(
        ((now - jan1) / 86400000 + jan1.getDay() + 1) / 7
    );
    return `week_${now.getFullYear()}_${week}`;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.textContent;
}

function loadDashboard() {
    const weekKey = getWeekKey();
    chrome.storage.local.get(
        [
            weekKey, 'sentProfileUrls',
            'acceptedUrls', 'schedule',
            'companySchedule', 'feedSchedule',
            'connectionHistory', 'fuseLimitRetry',
            'companyFollowHistory', 'feedEngageHistory'
        ],
        (data) => {
            const weekCount = data[weekKey] || 0;
            const sentUrls = data.sentProfileUrls || [];
            const accepted = data.acceptedUrls || [];

            document.getElementById('weekSent')
                .textContent = weekCount;
            document.getElementById('weekLimit')
                .textContent = WEEKLY_LIMIT;
            document.getElementById('totalSent')
                .textContent = sentUrls.length;
            document.getElementById('totalAccepted')
                .textContent = accepted.length;

            const acceptedSet = new Set(accepted);
            const history = data.connectionHistory || [];

            let skippedCount = 0;
            let quotaCount = 0;
            let engagedCount = 0;
            let followedCount = 0;
            const skipReasons = {};
            for (const r of history) {
                if (r.status?.startsWith('skipped')) {
                    skippedCount++;
                    const reason = r.status
                        .replace('skipped-', '') ||
                        'unknown';
                    skipReasons[reason] =
                        (skipReasons[reason] || 0) + 1;
                }
                if (r.status === 'stopped-quota') {
                    quotaCount++;
                }
                if (r.status === 'visited' ||
                    r.status === 'visited-followed' ||
                    r.status === 'followed') {
                    engagedCount++;
                }
                if (r.status === 'followed' ||
                    r.status === 'visited-followed') {
                    followedCount++;
                }
                if (r.profileUrl &&
                    acceptedSet.has(r.profileUrl) &&
                    r.status === 'sent') {
                    r.status = 'accepted';
                }
            }

            const companyHistory =
                data.companyFollowHistory || [];
            const companyCount = companyHistory
                .filter(r => r.status === 'followed')
                .length;
            const feedHistory =
                data.feedEngageHistory || [];
            const feedCount = feedHistory
                .filter(r =>
                    !r.status?.startsWith('skipped'))
                .length;

            document.getElementById('totalSkipped')
                .textContent = skippedCount;
            const topSkipReasons = Object.entries(
                skipReasons
            ).sort((a, b) => b[1] - a[1]).slice(0, 3);
            document.getElementById('skipBreakdown')
                .textContent = topSkipReasons.length > 0
                ? topSkipReasons.map(([reason, count]) =>
                    `${reason}: ${count}`
                ).join(' · ')
                : 'duplicate, email, unverified';
            document.getElementById('totalQuota')
                .textContent = quotaCount;
            document.getElementById('totalEngaged')
                .textContent = engagedCount;
            document.getElementById('totalFollowed')
                .textContent = followedCount;
            document.getElementById('totalCompanies')
                .textContent = companyCount;
            document.getElementById('totalFeed')
                .textContent = feedCount;

            if (sentUrls.length > 0) {
                const pct = Math.round(
                    (accepted.length / sentUrls.length) *
                    100
                );
                document.getElementById('acceptPct')
                    .textContent = pct + '%';
            }

            const schedule = data.schedule;
            const sEl = document.getElementById(
                'scheduleStatus'
            );
            if (data.fuseLimitRetry?.retryAt) {
                const retryDate = new Date(
                    data.fuseLimitRetry.retryAt
                );
                sEl.textContent =
                    'Quota limit hit — auto-retry at ' +
                    retryDate.toLocaleString();
                sEl.style.color = 'var(--warning)';
            } else {
                const parts = [];
                if (schedule?.enabled) {
                    parts.push(
                        `Connect: every ` +
                        `${schedule.intervalHours}h`
                    );
                }
                if (data.companySchedule?.enabled) {
                    parts.push(
                        `Companies: every ` +
                        `${data.companySchedule.intervalHours}h` +
                        ` (batch ${data.companySchedule.batchSize || 10})`
                    );
                }
                if (data.feedSchedule?.enabled) {
                    parts.push(
                        `Feed: every ` +
                        `${data.feedSchedule.intervalHours}h`
                    );
                }
                if (parts.length) {
                    sEl.textContent = parts.join(' · ');
                    sEl.style.color = '#057642';
                } else {
                    sEl.textContent = 'Not scheduled';
                }
            }

            renderFeedMetrics(feedHistory);

            const companyEntries = companyHistory.map(r => ({
                name: r.name || 'Unknown',
                headline: r.subtitle || '',
                profileUrl: r.companyUrl || '',
                status: r.status === 'followed'
                    ? 'company-followed' : r.status,
                time: r.time
            }));
            const feedEntries = feedHistory.map(r => ({
                name: r.author || 'Unknown',
                headline: (r.postText || '')
                    .substring(0, 80),
                profileUrl: '',
                status: 'feed-' + (r.status || ''),
                time: r.time
            }));
            const allHistory = history
                .concat(companyEntries)
                .concat(feedEntries);

            renderChart(allHistory);
            if (!allHistory.length) return;

            document.getElementById('emptyMsg')
                .style.display = 'none';
            document.getElementById('logTable')
                .style.display = 'table';

            const tbody = document.getElementById('logBody');
            const sorted = allHistory
                .filter(r => r.time)
                .sort((a, b) =>
                    new Date(b.time) - new Date(a.time)
                );
            const recent = sorted.slice(0, 100);

            for (const r of recent) {
                const tr = document.createElement('tr');

                const tdName = document.createElement('td');
                if (r.profileUrl) {
                    const a = document.createElement('a');
                    a.href = r.profileUrl;
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                    a.textContent = escapeHtml(r.name);
                    tdName.appendChild(a);
                } else {
                    tdName.textContent =
                        escapeHtml(r.name);
                }

                const tdHeadline =
                    document.createElement('td');
                tdHeadline.textContent =
                    escapeHtml(r.headline);

                const tdStatus =
                    document.createElement('td');
                const badge =
                    document.createElement('span');
                badge.className = 'badge ';
                if (r.status === 'accepted') {
                    badge.className += 'badge-accepted';
                } else if (r.status === 'sent') {
                    badge.className += 'badge-sent';
                } else if (r.status === 'visited' ||
                    r.status === 'followed' ||
                    r.status === 'visited-followed') {
                    badge.className += 'badge-engaged';
                } else if (r.status?.startsWith(
                    'company-')) {
                    badge.className += 'badge-company';
                } else if (r.status?.startsWith(
                    'feed-')) {
                    badge.className += 'badge-feed';
                } else {
                    badge.className += 'badge-skipped';
                }
                let label = r.status || '';
                label = label.replace('skipped-', '');
                label = label.replace('stopped-', '');
                badge.textContent = label;
                tdStatus.appendChild(badge);

                const tdTime =
                    document.createElement('td');
                tdTime.textContent = r.time
                    ? new Date(r.time).toLocaleString()
                    : '';

                tr.appendChild(tdName);
                tr.appendChild(tdHeadline);
                tr.appendChild(tdStatus);
                tr.appendChild(tdTime);
                tbody.appendChild(tr);
            }
        }
    );
}

function renderFeedMetrics(feedHistory) {
    if (!feedHistory || !feedHistory.length) return;

    document.getElementById('feedMetricsGrid')
        .style.display = 'grid';

    let commentCount = 0;
    let engagedCount = 0;
    let skippedCount = 0;
    const reactions = {};

    for (const r of feedHistory) {
        const s = r.status || '';
        if (s.startsWith('skipped')) {
            skippedCount++;
            continue;
        }
        engagedCount++;
        if (s.includes('commented')) {
            commentCount++;
        }
        const parts = s.split('+');
        for (const p of parts) {
            if (p === 'commented') continue;
            const name = p.trim();
            if (name) {
                reactions[name] =
                    (reactions[name] || 0) + 1;
            }
        }
    }

    document.getElementById('totalComments')
        .textContent = commentCount;
    document.getElementById('feedSkipped')
        .textContent = skippedCount;

    if (engagedCount > 0) {
        const pct = Math.round(
            (commentCount / engagedCount) * 100
        );
        document.getElementById('commentPct')
            .textContent = pct + '%';
        document.getElementById('commentRate')
            .textContent =
            `${commentCount} of ${engagedCount} posts`;
    }

    const sorted = Object.entries(reactions)
        .sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
        document.getElementById('topReaction')
            .textContent = sorted[0][0];
        document.getElementById('topReactionCount')
            .textContent = sorted[0][1] + ' times';
    }

    if (sorted.length > 1) {
        document.getElementById('reactionBreakdown')
            .style.display = 'block';
        const container = document.getElementById(
            'reactionBars'
        );
        container.textContent = '';
        const max = sorted[0][1];

        for (const [name, count] of sorted) {
            const col = document.createElement('div');
            col.className = 'reaction-bar-col';

            const countEl = document.createElement('span');
            countEl.className = 'reaction-bar-count';
            countEl.textContent = count;

            const bar = document.createElement('div');
            bar.className = 'reaction-bar-fill';
            const pct = (count / max) * 100;
            bar.style.height = Math.max(pct, 5) + '%';

            const label = document.createElement('span');
            label.className = 'reaction-bar-label';
            label.textContent = name;

            col.appendChild(countEl);
            col.appendChild(bar);
            col.appendChild(label);
            container.appendChild(col);
        }
    }
}

function renderChart(history) {
    const chart = document.getElementById('chart');
    const empty = document.getElementById('chartEmpty');

    if (!history || !history.length) {
        chart.style.display = 'none';
        empty.style.display = 'block';
        return;
    }

    const dayCounts = {};
    for (const r of history) {
        if (!r.time) continue;
        const s = r.status || '';
        if (s === 'sent' ||
            s === 'company-followed' ||
            s.startsWith('feed-') &&
            !s.includes('skipped')) {
            const day = r.time.substring(0, 10);
            dayCounts[day] = (dayCounts[day] || 0) + 1;
        }
    }

    const today = new Date();
    const days = [];
    for (let i = 13; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().substring(0, 10);
        days.push({
            key,
            count: dayCounts[key] || 0,
            label: `${d.getMonth() + 1}/${d.getDate()}`
        });
    }

    const max = Math.max(...days.map(d => d.count), 1);
    chart.textContent = '';

    for (const day of days) {
        const pct = (day.count / max) * 100;
        const bar = document.createElement('div');
        bar.className = 'chart-bar';
        bar.style.height = day.count > 0
            ? `${Math.max(pct, 5)}%` : '2px';
        if (day.count === 0) bar.style.opacity = '0.2';
        bar.title = `${day.label}: ${day.count} sent`;

        const count = document.createElement('span');
        count.className = 'chart-bar-count';
        count.textContent = day.count;

        const label = document.createElement('span');
        label.className = 'chart-bar-label';
        label.textContent = day.label;

        bar.appendChild(count);
        bar.appendChild(label);
        chart.appendChild(bar);
    }
}

function exportCsv() {
    chrome.storage.local.get(
        ['connectionHistory', 'acceptedUrls',
            'companyFollowHistory', 'feedEngageHistory'],
        (data) => {
            const history = data.connectionHistory || [];
            const acceptedSet = new Set(
                data.acceptedUrls || []
            );
            const companyH =
                (data.companyFollowHistory || []).map(r => ({
                    name: r.name || '',
                    headline: r.subtitle || '',
                    profileUrl: r.companyUrl || '',
                    status: 'company-' + (r.status || ''),
                    time: r.time || ''
                }));
            const feedH =
                (data.feedEngageHistory || []).map(r => ({
                    name: r.author || '',
                    headline: (r.postText || '')
                        .substring(0, 80),
                    profileUrl: '',
                    status: 'feed-' + (r.status || ''),
                    time: r.time || ''
                }));
            history.push(...companyH, ...feedH);
            const rows = [
                ['Name', 'Headline', 'Profile URL',
                 'Status', 'Time'].join(',')
            ];
            for (const r of history) {
                let status = r.status || '';
                if (r.profileUrl &&
                    acceptedSet.has(r.profileUrl) &&
                    status === 'sent') {
                    status = 'accepted';
                }
                const name = (r.name || '')
                    .replace(/"/g, '""');
                const headline = (r.headline || '')
                    .replace(/"/g, '""');
                rows.push([
                    `"${name}"`,
                    `"${headline}"`,
                    r.profileUrl || '',
                    status,
                    r.time || ''
                ].join(','));
            }
            const blob = new Blob(
                [rows.join('\n')],
                { type: 'text/csv' }
            );
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'linkedin-connections-' +
                new Date().toISOString().slice(0, 10) +
                '.csv';
            a.click();
            URL.revokeObjectURL(url);
        }
    );
}

function renderAnalytics() {
    chrome.storage.local.get(
        ['analyticsLog', 'connectionHistory',
            'acceptedUrls'],
        (data) => {
            const log = data.analyticsLog || [];
            if (!log.length) return;

            document.getElementById('analyticsSection')
                .style.display = 'block';

            const stats = computeAnalyticsStats(log);

            document.getElementById('analyticsAvgDay')
                .textContent = stats.avgPerDay;
            document.getElementById('analyticsActiveDays')
                .textContent =
                stats.activeDays + ' active days';
            document.getElementById('analyticsBestHour')
                .textContent = stats.bestHour !== null
                ? stats.bestHour + ':00' : '—';
            document.getElementById('analyticsBestDay')
                .textContent = stats.bestDay || '—';
            document.getElementById('analyticsTopCategory')
                .textContent = stats.topCategory || '—';

            const history = data.connectionHistory || [];
            const accepted = data.acceptedUrls || [];
            if (history.length > 0 && accepted.length > 0) {
                renderTemplateAcceptance(
                    history, accepted
                );
                renderHourAcceptance(history, accepted);
            }
        }
    );
}

function computeAnalyticsStats(log) {
    const byHour = {};
    const byDayOfWeek = {};
    const byCategory = {};
    const dayNames = [
        'Sun', 'Mon', 'Tue', 'Wed',
        'Thu', 'Fri', 'Sat'
    ];
    const days = new Set();
    let commentCount = 0;
    let engagedCount = 0;

    for (const e of log) {
        if (e.category) {
            byCategory[e.category] =
                (byCategory[e.category] || 0) + 1;
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
        if (!e.status?.startsWith('skipped')) {
            engagedCount++;
        }
    }

    const topKey = (obj) => {
        let best = null, bestVal = -1;
        for (const [k, v] of Object.entries(obj)) {
            if (v > bestVal) { bestVal = v; best = k; }
        }
        return best;
    };

    const activeDays = days.size;
    return {
        total: log.length,
        avgPerDay: activeDays > 0
            ? Math.round(
                log.length / activeDays * 10
            ) / 10 : 0,
        activeDays,
        bestHour: topKey(byHour) !== null
            ? parseInt(topKey(byHour)) : null,
        bestDay: topKey(byDayOfWeek),
        topCategory: topKey(byCategory),
        commentRate: engagedCount > 0
            ? Math.round(
                (commentCount / engagedCount) * 100
            ) : 0
    };
}

function renderTemplateAcceptance(history, accepted) {
    const acceptedSet = new Set(accepted);
    const templates = {};

    for (const r of history) {
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

    const entries = Object.entries(templates)
        .filter(([, v]) => v.sent >= 3);
    if (!entries.length) return;

    document.getElementById('templateAcceptance')
        .style.display = 'block';
    const container =
        document.getElementById('templateBars');
    container.textContent = '';

    for (const [name, data] of entries) {
        const rate = Math.round(
            (data.accepted / data.sent) * 100
        );
        const card = document.createElement('div');
        card.style.cssText =
            'background:var(--primary-light);' +
            'border-radius:8px; padding:12px 16px;' +
            'min-width:120px;';

        const title = document.createElement('div');
        title.textContent = name;
        title.style.cssText =
            'font-weight:600; font-size:13px;' +
            'margin-bottom:4px;';

        const rateLine = document.createElement('div');
        rateLine.textContent = rate + '% accepted';
        rateLine.style.cssText =
            'font-size:18px; font-weight:700;' +
            'color:var(--primary);';

        const detail = document.createElement('div');
        detail.textContent =
            `${data.accepted}/${data.sent} sent`;
        detail.style.cssText =
            'font-size:11px; color:var(--muted);' +
            'margin-top:2px;';

        card.appendChild(title);
        card.appendChild(rateLine);
        card.appendChild(detail);
        container.appendChild(card);
    }
}

function renderHourAcceptance(history, accepted) {
    const acceptedSet = new Set(accepted);
    const hours = {};

    for (const r of history) {
        if (!r.time) continue;
        const h = new Date(r.time).getUTCHours();
        if (!hours[h]) {
            hours[h] = { sent: 0, accepted: 0 };
        }
        hours[h].sent++;
        if (r.profileUrl && acceptedSet.has(r.profileUrl)) {
            hours[h].accepted++;
        }
    }

    const hasData = Object.values(hours)
        .some(v => v.accepted > 0);
    if (!hasData) return;

    document.getElementById('hourAcceptance')
        .style.display = 'block';
    const container =
        document.getElementById('hourBars');
    container.textContent = '';

    const maxSent = Math.max(
        ...Object.values(hours).map(v => v.sent), 1
    );

    for (let h = 0; h < 24; h++) {
        const data = hours[h] || { sent: 0, accepted: 0 };
        const rate = data.sent > 0
            ? Math.round(
                (data.accepted / data.sent) * 100
            ) : 0;
        const pct = (data.sent / maxSent) * 100;

        const col = document.createElement('div');
        col.style.cssText =
            'flex:1; display:flex; flex-direction:column;' +
            'align-items:center; gap:2px;';

        const bar = document.createElement('div');
        bar.style.cssText =
            `width:100%; border-radius:2px 2px 0 0;` +
            `height:${Math.max(pct, 3)}%;` +
            `background:${rate > 30
                ? 'var(--success)'
                : rate > 0
                    ? 'var(--primary)'
                    : 'var(--border)'};` +
            `opacity:${data.sent > 0 ? 0.8 : 0.3};`;
        bar.title = `${h}:00 — ${data.sent} sent, ` +
            `${data.accepted} accepted (${rate}%)`;

        const label = document.createElement('span');
        label.textContent = h % 3 === 0 ? h : '';
        label.style.cssText =
            'font-size:8px; color:var(--muted);';

        col.appendChild(bar);
        col.appendChild(label);
        container.appendChild(col);
    }
}

document.getElementById('exportBtn')
    .addEventListener('click', exportCsv);

function renderNurtureList() {
    chrome.storage.local.get('nurtureList', (data) => {
        const list = data.nurtureList || [];
        const container = document.getElementById(
            'nurtureList');
        const empty = document.getElementById(
            'nurtureEmpty');
        if (!container) return;

        if (!list.length) {
            empty.style.display = 'block';
            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }
            return;
        }

        empty.style.display = 'none';
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        const now = new Date();
        for (const entry of list) {
            const row = document.createElement('div');
            row.style.cssText =
                'display:flex; align-items:center; ' +
                'justify-content:space-between; ' +
                'padding:8px 12px; ' +
                'border-bottom:1px solid var(--border); ' +
                'font-size:13px;';

            const info = document.createElement('div');
            const nameEl = document.createElement('strong');
            nameEl.textContent = entry.name || 'Unknown';
            info.appendChild(nameEl);

            const meta = document.createElement('div');
            meta.style.cssText =
                'font-size:11px; color:var(--muted);';
            const added = new Date(entry.addedAt);
            const daysAgo = Math.floor(
                (now - added) / 86400000);
            meta.textContent =
                `${entry.engagements || 0}/3 engagements` +
                ` · added ${daysAgo}d ago`;
            info.appendChild(meta);

            const removeBtn = document.createElement(
                'button');
            removeBtn.textContent = 'Remove';
            removeBtn.style.cssText =
                'background:none; border:1px solid ' +
                'var(--border); border-radius:6px; ' +
                'padding:4px 10px; font-size:11px; ' +
                'color:var(--muted); cursor:pointer;';
            removeBtn.addEventListener('click', () => {
                removeNurtureEntry(entry.profileUrl);
            });

            row.appendChild(info);
            row.appendChild(removeBtn);
            container.appendChild(row);
        }
    });
}

function removeNurtureEntry(profileUrl) {
    chrome.storage.local.get('nurtureList', (data) => {
        const list = (data.nurtureList || []).filter(
            e => e.profileUrl !== profileUrl
        );
        chrome.storage.local.set(
            { nurtureList: list },
            () => renderNurtureList()
        );
    });
}

initializeDashboardTabs();
loadDashboard();
renderAnalytics();
renderNurtureList();
