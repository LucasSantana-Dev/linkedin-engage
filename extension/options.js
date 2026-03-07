const WEEKLY_LIMIT = 150;
const isPt = navigator.language?.startsWith('pt');

const optT = {
    title: isPt
        ? 'Painel Auto-Conectar' : 'Auto-Connect Dashboard',
    thisWeek: isPt ? 'Esta Semana' : 'This Week',
    ofInvites: isPt ? 'de {n} convites' : 'of {n} invites',
    totalSent: isPt ? 'Total Enviados' : 'Total Sent',
    allTime: isPt ? 'desde o início' : 'all time',
    accepted: isPt ? 'Aceitas' : 'Accepted',
    connMade: isPt ? 'conexões feitas' : 'connections made',
    schedule: isPt ? 'Agendamento' : 'Schedule',
    active: isPt ? 'Ativo — executa a cada' : 'Active — runs every',
    notScheduled: isPt ? 'Não agendado' : 'Not scheduled',
    recentLog: isPt
        ? 'Log de Conexões Recentes'
        : 'Recent Connection Log',
    name: isPt ? 'Nome' : 'Name',
    headline: isPt ? 'Título' : 'Headline',
    status: isPt ? 'Status' : 'Status',
    time: isPt ? 'Hora' : 'Time',
    empty: isPt
        ? 'Nenhum histórico ainda. Execute a automação.'
        : 'No connection history yet. Run the automation to start tracking.',
    activity: isPt
        ? 'Atividade (últimos 14 dias)'
        : 'Activity (last 14 days)',
    noActivity: isPt
        ? 'Nenhum dado de atividade ainda.'
        : 'No activity data yet.'
};

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
            'connectionHistory'
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

            const schedule = data.schedule;
            const sEl = document.getElementById(
                'scheduleStatus'
            );
            if (schedule?.enabled) {
                sEl.textContent =
                    `${optT.active} ` +
                    `${schedule.intervalHours}h`;
                sEl.style.color = '#057642';
            } else {
                sEl.textContent = optT.notScheduled;
            }

            const history = data.connectionHistory || [];
            renderChart(history);
            if (!history.length) return;

            document.getElementById('emptyMsg')
                .style.display = 'none';
            document.getElementById('logTable')
                .style.display = 'table';

            const tbody = document.getElementById('logBody');
            const recent = history.slice(-100).reverse();

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
                if (r.status === 'sent') {
                    badge.className += 'badge-sent';
                } else if (r.status?.includes('accepted')) {
                    badge.className += 'badge-accepted';
                } else {
                    badge.className += 'badge-skipped';
                }
                badge.textContent =
                    (r.status || '').replace('skipped-', '');
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
        if (!r.time || r.status !== 'sent') continue;
        const day = r.time.substring(0, 10);
        dayCounts[day] = (dayCounts[day] || 0) + 1;
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

function applyOptionsI18n() {
    const q = (sel) => document.querySelector(sel);
    q('h1').lastChild.textContent = ' ' + optT.title;

    const labels = document.querySelectorAll('.card-label');
    const subs = document.querySelectorAll('.card-sub');
    if (labels[0]) labels[0].textContent = optT.thisWeek;
    if (labels[1]) labels[1].textContent = optT.totalSent;
    if (labels[2]) labels[2].textContent = optT.accepted;
    if (subs[0]) subs[0].textContent =
        optT.ofInvites.replace('{n}', WEEKLY_LIMIT);
    if (subs[1]) subs[1].textContent = optT.allTime;
    if (subs[2]) subs[2].textContent = optT.connMade;

    const h2s = document.querySelectorAll('.section h2');
    if (h2s[0]) h2s[0].textContent = optT.schedule;
    if (h2s[1]) h2s[1].textContent = optT.recentLog;

    const ths = document.querySelectorAll('th');
    const thLabels = [optT.name, optT.headline,
        optT.status, optT.time];
    ths.forEach((th, i) => {
        if (thLabels[i]) th.textContent = thLabels[i];
    });

    document.getElementById('emptyMsg').textContent =
        optT.empty;

    const actTitle = document.getElementById('activityTitle');
    if (actTitle) actTitle.textContent = optT.activity;
    const chartEmpty = document.getElementById('chartEmpty');
    if (chartEmpty) chartEmpty.textContent = optT.noActivity;
}

loadDashboard();
applyOptionsI18n();
