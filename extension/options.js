const WEEKLY_LIMIT = 150;

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
            for (const r of history) {
                if (r.status?.startsWith('skipped')) {
                    skippedCount++;
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

document.getElementById('exportBtn')
    .addEventListener('click', exportCsv);

loadDashboard();
