const WEEKLY_LIMIT = 150;
const DAYS_IN_CHART = 14;
const MIN_BAR_HEIGHT_PCT = 5;
const HOUR_LABEL_STEP = 3;
const BYTES_PER_KB = 1024;
const DEFAULT_DASHBOARD_STATE = {
    activeTab: 'overview'
};
let dashboardState = { ...DEFAULT_DASHBOARD_STATE };
let dashboardUiLanguageMode = 'auto';
let dashboardCatalog = {};
let dashboardFallbackCatalog = {};
let dashboardUiLocale = 'en';
let _tabsInitialized = false;

function dt(key, substitutions, fallback) {
    if (typeof getMessage !== 'function') {
        return fallback || key;
    }
    return getMessage(
        dashboardCatalog,
        dashboardFallbackCatalog,
        key,
        substitutions
    ) || fallback || key;
}

function formatDashboardDateTime(value) {
    if (!value) return '';
    try {
        return new Date(value).toLocaleString(
            dashboardUiLocale === 'pt_BR' ? 'pt-BR' : 'en-US'
        );
    } catch (_) {
        return String(value || '');
    }
}

function translateDashboardStatus(status) {
    const value = String(status || '').trim();
    const map = {
        sent: ['status.sent', 'Sent'],
        accepted: ['status.accepted', 'Accepted'],
        visited: ['status.visited', 'Visited'],
        followed: ['status.followed', 'Followed'],
        'visited-followed': ['status.visitedFollowed', 'Visited + Followed'],
        'company-followed': ['status.companyFollowed', 'Company followed']
    };
    if (map[value]) {
        const [key, fallback] = map[value];
        return dt(key, null, fallback);
    }
    if (value.startsWith('company-')) {
        return dt(
            'status.companyAction',
            null,
            value.replace(/^company-/, 'company ')
        );
    }
    if (value.startsWith('skipped-')) {
        const key = `status.${value.replace(/^skipped-/, '')}`;
        return dt(key, null, value.replace(/^skipped-/, ''));
    }
    return value.replace(/-/g, ' ');
}

function translateTabName(tab) {
    const key = {
        overview: 'options.tab.overview',
        activity: 'options.tab.activity',
        logs: 'options.tab.logs'
    }[tab];
    return key ? dt(key, null, tab) : tab;
}

function applyDashboardLocalization() {
    document.title = dt(
        'options.title',
        null,
        'LinkedIn Engage Dashboard'
    );
    const title = document.getElementById('dashboardTitle');
    if (title) {
        title.textContent = dt(
            'options.title',
            null,
            'LinkedIn Engage Dashboard'
        );
    }
    const languageLabel = document.getElementById(
        'dashboardLanguageLabel'
    );
    if (languageLabel) {
        languageLabel.textContent = dt(
            'options.uiLanguage',
            null,
            'UI Language'
        );
    }
    const select = document.getElementById('uiLanguageModeSelect');
    if (select) {
        const options = {
            auto: dt('common.autoBrowser', null, 'Auto (Browser)'),
            en: dt('common.english', null, 'English'),
            pt_BR: dt('common.portugueseBrazil', null, 'Português (Brasil)')
        };
        Array.from(select.options).forEach(option => {
            if (options[option.value]) {
                option.textContent = options[option.value];
            }
        });
    }

    document.querySelectorAll('[data-dashboard-tab]')
        .forEach(btn => {
            btn.textContent = translateTabName(
                btn.dataset.dashboardTab
            );
        });

    const cardLabels = [
        'options.card.thisWeek',
        'options.card.verifiedSent',
        'options.card.accepted',
        'options.card.skipped',
        'options.card.quotaBlocked',
        'options.card.acceptRate',
        'options.card.engaged',
        'options.card.followed',
        'options.card.companies',
        'options.card.commentsSent',
        'options.card.commentRate',
        'options.card.topReaction',
        'options.card.skipped',
        'options.card.avgPerDay',
        'options.card.bestHour',
        'options.card.bestDay',
        'options.card.topCategory'
    ];
    document.querySelectorAll('.card-label').forEach((node, index) => {
        const key = cardLabels[index];
        if (!key) return;
        node.textContent = dt(key, null, node.textContent);
    });

    const cardSubs = [
        ['#acceptRate', 'options.card.connectionsMade', 'connections made'],
        ['#activityTitle', 'options.section.activity', 'Activity (last 14 days)'],
        ['#chartEmpty', 'options.empty.activity', 'No activity data yet.'],
        ['#scheduleStatus', 'common.loading', 'Loading...'],
        ['#emptyMsg', 'options.empty.logs', 'No connection history yet. Run the automation to start tracking.'],
        ['#exportBtn', 'options.exportCsv', 'Export CSV']
    ];
    cardSubs.forEach(([selector, key, fallback]) => {
        const node = document.querySelector(selector);
        if (node) node.textContent = dt(key, null, fallback);
    });

    const overviewSubs = [
        ['options.card.invites', 'of invites'],
        ['options.card.allTime', 'all time'],
        ['options.card.skippedSub', 'duplicate, email, unverified'],
        ['options.card.quotaRejected', 'rejected by LinkedIn (429)'],
        ['options.card.acceptRateSub', 'accepted / verified sent'],
        ['options.card.engagedSub', 'profile visits + follows'],
        ['options.card.followedSub', 'follow actions'],
        ['options.card.companiesSub', 'companies followed']
    ];
    document.querySelectorAll('.grid[data-tab-section="overview"] .card-sub')
        .forEach((node, index) => {
            if (node.id === 'acceptRate') {
                return;
            }
            const entry = overviewSubs.shift();
            if (entry) {
                node.textContent = dt(entry[0], null, entry[1]);
            }
        });

    const analyticsSubs = [
        ['options.analytics.utc', 'UTC'],
        ['options.analytics.dayOfWeek', 'day of week'],
        ['options.analytics.topCategorySub', 'most engaged post type']
    ];
    document.querySelectorAll('#analyticsSection .card-sub')
        .forEach((node, index) => {
            if (node.id === 'analyticsActiveDays') {
                return;
            }
            const entry = analyticsSubs.shift();
            if (entry) {
                node.textContent = dt(entry[0], null, entry[1]);
            }
        });

    const sectionTitles = [
        ['#reactionBreakdown h2', 'options.section.reactionBreakdown', 'Reaction Breakdown'],
        ['#analyticsSection h2', 'options.section.analytics', 'Analytics Insights'],
        ['#templateAcceptance h3', 'options.section.templateAcceptance', 'Acceptance by Note Template'],
        ['#hourAcceptance h3', 'options.section.hourAcceptance', 'Acceptance by Hour (UTC)'],
        ['div.section[data-tab-section="overview"] h2', 'options.section.schedule', 'Schedule'],
        ['div.section[data-tab-section="logs"] h2', 'options.section.logs', 'Recent Connection Log']
    ];
    sectionTitles.forEach(([selector, key, fallback]) => {
        const node = document.querySelector(selector);
        if (node) node.textContent = dt(key, null, fallback);
    });

    const tableHeaders = document.querySelectorAll('#logTable th');
    const headerKeys = [
        'options.table.name',
        'options.table.headline',
        'options.table.status',
        'options.table.time'
    ];
    tableHeaders.forEach((node, index) => {
        const key = headerKeys[index];
        if (key) node.textContent = dt(key, null, node.textContent);
    });
}

function initializeDashboardLocalization() {
    return new Promise(resolve => {
        if (typeof loadLocaleMessages !== 'function' ||
            typeof resolveUiLocale !== 'function') {
            resolve();
            return;
        }
        chrome.storage.local.get('uiLanguageMode', async (data) => {
            dashboardUiLanguageMode = data.uiLanguageMode || 'auto';
            dashboardUiLocale = resolveUiLocale(
                dashboardUiLanguageMode,
                navigator.language
            );
            dashboardFallbackCatalog = await loadLocaleMessages('en');
            dashboardCatalog = dashboardUiLocale === 'en'
                ? dashboardFallbackCatalog
                : await loadLocaleMessages(dashboardUiLocale);
            applyDashboardLocalization();
            resolve();
        });
    });
}

function normalizeDashboardUiState(state) {
    if (typeof normalizeDashboardState === 'function') {
        return normalizeDashboardState(state);
    }
    const allowed = ['overview', 'activity', 'logs'];
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
    if (_tabsInitialized) return;
    _tabsInitialized = true;

    document.querySelectorAll('[data-dashboard-tab]')
        .forEach(btn => {
            btn.addEventListener('click', () => {
                setDashboardTab(
                    btn.dataset.dashboardTab,
                    true
                );
            });
            btn.addEventListener('keydown', (e) => {
                const tabs = [...document.querySelectorAll('[data-dashboard-tab]')];
                const idx = tabs.indexOf(e.currentTarget);
                if (e.key === 'ArrowRight') tabs[(idx + 1) % tabs.length]?.click();
                if (e.key === 'ArrowLeft') tabs[(idx - 1 + tabs.length) % tabs.length]?.click();
            });
        });

    dashboardState = normalizeDashboardUiState(
        dashboardState
    );

    chrome.storage.local.get(
        'dashboardState',
        ({ dashboardState: stored }) => {
            if (chrome.runtime.lastError) {
                return;
            }
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
            'companySchedule',
            'connectionHistory', 'fuseLimitRetry',
            'companyFollowHistory'
        ],
        (data) => {
            if (chrome.runtime.lastError) {
                return;
            }
            const weekCount = data[weekKey] || 0;
            const sentUrls = data.sentProfileUrls || [];
            const accepted = data.acceptedUrls || [];
            const weekSentNode = document.getElementById('weekSent');
            const weekLimitNode = document.getElementById('weekLimit');
            const totalSentNode = document.getElementById('totalSent');
            const totalAcceptedNode = document.getElementById(
                'totalAccepted'
            );
            const totalSkippedNode = document.getElementById(
                'totalSkipped'
            );
            const skipBreakdownNode = document.getElementById(
                'skipBreakdown'
            );
            const totalQuotaNode = document.getElementById(
                'totalQuota'
            );
            const totalEngagedNode = document.getElementById(
                'totalEngaged'
            );
            const totalFollowedNode = document.getElementById(
                'totalFollowed'
            );
            const totalCompaniesNode = document.getElementById(
                'totalCompanies'
            );
            const acceptPctNode = document.getElementById(
                'acceptPct'
            );
            const scheduleStatusNode = document.getElementById(
                'scheduleStatus'
            );
            if (
                !weekSentNode ||
                !weekLimitNode ||
                !totalSentNode ||
                !totalAcceptedNode ||
                !totalSkippedNode ||
                !skipBreakdownNode ||
                !totalQuotaNode ||
                !totalEngagedNode ||
                !totalFollowedNode ||
                !totalCompaniesNode ||
                !acceptPctNode ||
                !scheduleStatusNode
            ) {
                return;
            }

            weekSentNode.textContent = weekCount;
            weekLimitNode.textContent = WEEKLY_LIMIT;
            totalSentNode.textContent = sentUrls.length;
            totalAcceptedNode.textContent = accepted.length;

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

            totalSkippedNode.textContent = skippedCount;
            const topSkipReasons = Object.entries(
                skipReasons
            ).sort((a, b) => b[1] - a[1]).slice(0, 3);
            skipBreakdownNode.textContent = topSkipReasons.length > 0
                ? topSkipReasons.map(([reason, count]) =>
                    `${reason}: ${count}`
                ).join(' · ')
                : dt(
                    'options.card.skipBreakdownFallback',
                    null,
                    'duplicate, email, unverified'
                );
            totalQuotaNode.textContent = quotaCount;
            totalEngagedNode.textContent = engagedCount;
            totalFollowedNode.textContent = followedCount;
            totalCompaniesNode.textContent = companyCount;

            if (sentUrls.length > 0) {
                const pct = Math.round(
                    (accepted.length / sentUrls.length) *
                    100
                );
                acceptPctNode.textContent = pct + '%';
            }

            const schedule = data.schedule;
            const sEl = scheduleStatusNode;
            if (data.fuseLimitRetry?.retryAt) {
                const retryDate = new Date(
                    data.fuseLimitRetry.retryAt
                );
                sEl.textContent = dt(
                    'options.schedule.quotaRetry',
                    [formatDashboardDateTime(retryDate)],
                    'Quota limit hit — auto-retry at ' +
                        formatDashboardDateTime(retryDate)
                );
                sEl.style.color = 'var(--warning)';
            } else {
                const parts = [];
                if (schedule?.enabled) {
                    parts.push(dt(
                        'options.schedule.connectEvery',
                        [schedule.intervalHours],
                        `Connect: every ${schedule.intervalHours}h`
                    ));
                }
                if (data.companySchedule?.enabled) {
                    parts.push(dt(
                        'options.schedule.companiesEvery',
                        [
                            data.companySchedule.intervalHours,
                            data.companySchedule.batchSize || 10
                        ],
                        `Companies: every ${data.companySchedule.intervalHours}h (batch ${data.companySchedule.batchSize || 10})`
                    ));
                }
                if (parts.length) {
                    sEl.textContent = parts.join(' · ');
                    sEl.style.color = '#057642';
                } else {
                    sEl.textContent = dt(
                        'options.schedule.notScheduled',
                        null,
                        'Not scheduled'
                    );
                }
            }

            const companyEntries = companyHistory.map(r => ({
                name: r.name || dt('common.unknown', null, 'Unknown'),
                headline: r.subtitle || '',
                profileUrl: r.companyUrl || '',
                status: r.status === 'followed'
                    ? 'company-followed' : r.status,
                time: r.time
            }));
            const allHistory = history
                .concat(companyEntries);

            renderChart(allHistory);
            if (!allHistory.length) return;

            const emptyMsgNode = document.getElementById('emptyMsg');
            const logTableNode = document.getElementById('logTable');
            const tbody = document.getElementById('logBody');
            if (!emptyMsgNode || !logTableNode || !tbody) {
                return;
            }
            emptyMsgNode.style.display = 'none';
            logTableNode.style.display = 'table';
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
                } else {
                    badge.className += 'badge-skipped';
                }
                let label = r.status || '';
                label = label.replace('skipped-', '');
                label = label.replace('stopped-', '');
                badge.textContent = translateDashboardStatus(
                    r.status || label
                );
                tdStatus.appendChild(badge);

                const tdTime =
                    document.createElement('td');
                tdTime.textContent = r.time
                    ? formatDashboardDateTime(r.time)
                    : '';

                tr.appendChild(tdName);
                tr.appendChild(tdHeadline);
                tr.appendChild(tdStatus);
                tr.appendChild(tdTime);
                tbody.appendChild(tr);
            }
            applyDashboardLocalization();
        }
    );
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
            s === 'company-followed') {
            const day = r.time.substring(0, 10);
            dayCounts[day] = (dayCounts[day] || 0) + 1;
        }
    }

    const today = new Date();
    const days = [];
    for (let i = DAYS_IN_CHART - 1; i >= 0; i--) {
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
            ? `${Math.max(pct, MIN_BAR_HEIGHT_PCT)}%` : '2px';
        if (day.count === 0) bar.style.opacity = '0.2';
        bar.title = dt(
            'options.activity.chartTooltip',
            [day.label, day.count],
            `${day.label}: ${day.count} sent`
        );

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
    applyDashboardLocalization();
}

function exportCsv() {
    chrome.storage.local.get(
        ['connectionHistory', 'acceptedUrls',
            'companyFollowHistory'],
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
            history.push(...companyH);
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

            const analyticsSectionNode = document.getElementById(
                'analyticsSection'
            );
            const analyticsAvgDayNode = document.getElementById(
                'analyticsAvgDay'
            );
            const analyticsActiveDaysNode = document.getElementById(
                'analyticsActiveDays'
            );
            const analyticsBestHourNode = document.getElementById(
                'analyticsBestHour'
            );
            const analyticsBestDayNode = document.getElementById(
                'analyticsBestDay'
            );
            const analyticsTopCategoryNode = document.getElementById(
                'analyticsTopCategory'
            );
            if (
                !analyticsSectionNode ||
                !analyticsAvgDayNode ||
                !analyticsActiveDaysNode ||
                !analyticsBestHourNode ||
                !analyticsBestDayNode ||
                !analyticsTopCategoryNode
            ) {
                return;
            }

            analyticsSectionNode.style.display = 'block';

            const stats = computeAnalyticsStats(log);

            analyticsAvgDayNode.textContent = stats.avgPerDay;
            analyticsActiveDaysNode.textContent = dt(
                    'options.analytics.activeDays',
                    [stats.activeDays],
                    stats.activeDays + ' active days'
                );
            analyticsBestHourNode.textContent = stats.bestHour !== null
                ? stats.bestHour + ':00' : '—';
            analyticsBestDayNode.textContent = stats.bestDay || '—';
            analyticsTopCategoryNode.textContent = stats.topCategory || '—';

            const history = data.connectionHistory || [];
            const accepted = data.acceptedUrls || [];
            if (history.length > 0 && accepted.length > 0) {
                renderTemplateAcceptance(
                    history, accepted
                );
                renderHourAcceptance(history, accepted);
            }
            applyDashboardLocalization();
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
        rateLine.textContent = dt(
            'options.analytics.acceptedRate',
            [rate],
            rate + '% accepted'
        );
        rateLine.style.cssText =
            'font-size:18px; font-weight:700;' +
            'color:var(--primary);';

        const detail = document.createElement('div');
        detail.textContent = dt(
            'options.analytics.sentDetail',
            [data.accepted, data.sent],
            `${data.accepted}/${data.sent} sent`
        );
        detail.style.cssText =
            'font-size:11px; color:var(--muted);' +
            'margin-top:2px;';

        card.appendChild(title);
        card.appendChild(rateLine);
        card.appendChild(detail);
        container.appendChild(card);
    }
    applyDashboardLocalization();
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
            `height:${Math.max(pct, MIN_BAR_HEIGHT_PCT)}%;` +
            `background:${rate > 30
                ? 'var(--success)'
                : rate > 0
                    ? 'var(--primary)'
                    : 'var(--border)'};` +
            `opacity:${data.sent > 0 ? 0.8 : 0.3};`;
        bar.title = dt(
            'options.analytics.hourTooltip',
            [h, data.sent, data.accepted, rate],
            `${h}:00 — ${data.sent} sent, ${data.accepted} accepted (${rate}%)`
        );

        const label = document.createElement('span');
        label.textContent = h % HOUR_LABEL_STEP === 0 ? h : '';
        label.style.cssText =
            'font-size:8px; color:var(--muted);';

        col.appendChild(bar);
        col.appendChild(label);
        container.appendChild(col);
    }
    applyDashboardLocalization();
}

document.getElementById('exportBtn')
    .addEventListener('click', exportCsv);

initializeDashboardLocalization().then(() => {
    const languageSelect = document.getElementById(
        'uiLanguageModeSelect'
    );
    if (languageSelect) {
        languageSelect.value = dashboardUiLanguageMode;
        languageSelect.addEventListener('change', () => {
            dashboardUiLanguageMode = languageSelect.value || 'auto';
            languageSelect.disabled = true;
            chrome.storage.local.set({
                uiLanguageMode: dashboardUiLanguageMode
            }, () => {
                initializeDashboardLocalization().then(() => {
                    loadDashboard();
                    renderAnalytics();
                }).finally(() => {
                    languageSelect.disabled = false;
                });
            });
        });
    }
    initializeDashboardTabs();
    loadDashboard();
    renderAnalytics();
});
