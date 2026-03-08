const TEMPLATES = {
    senior: `Hi {name}, I'm a senior software engineer with experience in scalable full-stack systems and cloud infrastructure. Always looking to connect with great people in the industry. Let's stay in touch!`,
    mid: `Hi {name}, I'm a software engineer with a few years of experience building web applications and APIs. I'm always open to learning about new opportunities. Would love to connect!`,
    junior: `Hi {name}, I'm a software developer early in my career, eager to grow and learn from experienced professionals. I'd love to connect and stay in touch!`,
    lead: `Hi {name}, I'm an engineering lead with experience driving technical strategy and mentoring teams. I enjoy connecting with people shaping the tech hiring landscape. Happy to connect!`,
    networking: `Hi {name}, I came across your profile and thought it'd be great to connect. I'm always looking to expand my professional network. Looking forward to staying in touch!`,
    custom: ''
};

const MAX_CHARS = 300;
const WEEKLY_LIMIT = 150;
let useCustomQuery = false;

const DEFAULT_LATAM_COMPANIES = [
    'Hotjar', 'Doist', 'Toggl', 'Pipefy', 'VTEX',
    'Rock Content', 'Loft', 'CloudWalk', 'Olist',
    'Vercel', 'Linear', 'Railway', 'Supabase',
    'Grafana Labs', 'Sentry', 'LaunchDarkly',
    'PostHog', 'Mux', 'Render', 'Fly.io',
    'QuintoAndar', 'Dock', 'Creditas', 'Gupy',
    'Flash', 'PicPay', 'Stone', 'Nuvemshop',
    'RD Station', 'Movidesk', 'Portabilis',
    'Jusbrasil', 'Pismo', 'Magrathea Labs',
    'Globant', 'Endava', 'CI&T', 'BairesDev',
    'Nearform', 'X-Team', 'Andela', 'Turing',
    'Toptal', 'Deel', 'Remote', 'Revelo',
    'Automattic', 'Zapier', 'Basecamp',
    'Canonical', 'DigitalOcean', 'Elastic',
    'HashiCorp', 'Docker', 'CircleCI',
    'Datadog', 'Cloudflare', 'Fastly',
    'GitLab', 'JetBrains', 'Notion',
    'Wise', 'Revolut', 'Coinbase', 'Binance',
    'Invillia', 'e-Core', 'Daitan', 'DB1',
    'Arctouch', 'FCamara', 'Raro Labs',
    'Codeminer42', 'Sambatech', 'SoftExpert'
].join('\n');

function getWeekKey() {
    const now = new Date();
    const jan1 = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil(
        ((now - jan1) / 86400000 + jan1.getDay() + 1) / 7
    );
    return `week_${now.getFullYear()}_${week}`;
}

function getWeeklyCount() {
    return new Promise(resolve => {
        const key = getWeekKey();
        chrome.storage.local.get(key, (data) => {
            resolve(data[key] || 0);
        });
    });
}

function addToWeeklyCount(count) {
    const key = getWeekKey();
    chrome.storage.local.get(key, (data) => {
        const current = data[key] || 0;
        chrome.storage.local.set({ [key]: current + count });
    });
}

function updateWeeklyDisplay() {
    getWeeklyCount().then(count => {
        document.getElementById('weeklyCount').textContent = count;
        document.getElementById('weeklyLimit').textContent =
            WEEKLY_LIMIT;
        const el = document.getElementById('weeklyCounter');
        if (count >= WEEKLY_LIMIT) {
            el.style.color = '#d32f2f';
        } else if (count >= WEEKLY_LIMIT - 30) {
            el.style.color = 'var(--warning)';
        } else {
            el.style.color = 'var(--text-muted)';
        }
    });
}

function getSelectedTags(group) {
    const tags = document.querySelectorAll(
        `.tag[data-group="${group}"].active`
    );
    return Array.from(tags).map(t => t.dataset.value);
}

function buildQuery() {
    if (useCustomQuery) {
        return document.getElementById('customQueryInput').value.trim();
    }

    const roles = getSelectedTags('role');
    const industry = getSelectedTags('industry');
    const market = getSelectedTags('market');
    const level = getSelectedTags('level');

    // LinkedIn basic search: keep it flat and simple.
    // One OR group max (roles), rest are plain keywords.
    const parts = [];

    if (roles.length === 1) {
        parts.push(roles[0]);
    } else if (roles.length > 1) {
        parts.push(roles.join(' OR '));
    }

    for (const term of industry) parts.push(term);
    for (const term of market) parts.push(term);
    for (const term of level) parts.push(term);

    return parts.join(' ');
}

function updateQueryPreview() {
    const preview = document.getElementById('queryPreview');
    const query = buildQuery();
    if (!query) {
        preview.textContent = 'Select at least one tag to build a query';
        return;
    }
    preview.textContent = query;
}

function updateCharCounter() {
    const textarea = document.getElementById('noteTemplate');
    const counter = document.getElementById('charCounter');
    const len = textarea.value.length;
    counter.textContent = `${len} / ${MAX_CHARS}`;
    counter.classList.remove('warn', 'over');
    if (len > MAX_CHARS) {
        counter.classList.add('over');
    } else if (len > MAX_CHARS - 30) {
        counter.classList.add('warn');
    }
}

function getSelectedRegionGeoUrn() {
    const sel = document.getElementById('regionSelect');
    const ids = sel.value.split(',').map(id => `"${id.trim()}"`);
    return encodeURIComponent(`[${ids.join(',')}]`);
}

function setActiveTemplate(templateKey) {
    document.querySelectorAll('.template-card').forEach(card => {
        card.classList.toggle(
            'active', card.dataset.template === templateKey
        );
    });

    const textarea = document.getElementById('noteTemplate');
    if (TEMPLATES[templateKey] !== undefined) {
        textarea.value = TEMPLATES[templateKey];
    }
    textarea.readOnly = templateKey !== 'custom';
    updateCharCounter();
}

function setStatusMessage(text, type) {
    const statusBox = document.getElementById('statusBox');
    statusBox.style.display = 'block';
    statusBox.textContent = text;
    const colors = {
        info: 'var(--primary)',
        success: '#2e7d32',
        error: '#d32f2f',
        warning: '#b24020'
    };
    statusBox.style.borderLeftColor = colors[type] || colors.info;
}

function saveState() {
    const state = {
        tags: {},
        currentMode,
        limit: document.getElementById('limitInput').value,
        region: document.getElementById('regionSelect').value,
        activelyHiring: document.getElementById('activelyHiringCheckbox').checked,
        engagementOnly: document.getElementById('engagementOnlyCheckbox').checked,
        degree2nd: document.getElementById('degree2nd').checked,
        degree3rd: document.getElementById('degree3rd').checked,
        sendNote: document.getElementById('sendNoteCheckbox').checked,
        activeTemplate: document.querySelector(
            '.template-card.active'
        )?.dataset.template || 'senior',
        customNote: TEMPLATES.custom,
        customQuery: document.getElementById('customQueryInput').value,
        useCustomQuery,
        scheduleEnabled: document.getElementById(
            'scheduleCheckbox').checked,
        scheduleInterval: document.getElementById(
            'scheduleInterval').value,
        savedQueries: document.getElementById(
            'savedQueries').value,
        companyQuery: document.getElementById(
            'companyQueryInput').value,
        targetCompanies: document.getElementById(
            'targetCompanies').value,
        feedReact: document.getElementById(
            'feedReactCheckbox').checked,
        feedComment: document.getElementById(
            'feedCommentCheckbox').checked,
        commentTemplates: document.getElementById(
            'commentTemplatesInput').value,
        skipKeywords: document.getElementById(
            'skipKeywordsInput').value,
        companyScheduleEnabled: document.getElementById(
            'companyScheduleCheckbox').checked,
        companyScheduleInterval: document.getElementById(
            'companyScheduleInterval').value,
        companyBatchSize: document.getElementById(
            'companyBatchSize').value
    };

    document.querySelectorAll('.tag').forEach(tag => {
        const group = tag.dataset.group;
        if (!state.tags[group]) state.tags[group] = [];
        if (tag.classList.contains('active')) {
            state.tags[group].push(tag.dataset.value);
        }
    });

    chrome.storage.local.set({ popupState: state });
}

function loadState() {
    chrome.storage.local.get('popupState', ({ popupState }) => {
        if (!popupState) {
            setActiveTemplate('senior');
            updateQueryPreview();
            updateCharCounter();
            return;
        }

        if (popupState.tags) {
            document.querySelectorAll('.tag').forEach(tag => {
                const group = tag.dataset.group;
                const vals = popupState.tags[group] || [];
                tag.classList.toggle(
                    'active', vals.includes(tag.dataset.value)
                );
            });
        }

        if (popupState.limit) {
            document.getElementById('limitInput').value = popupState.limit;
        }
        if (popupState.region) {
            document.getElementById('regionSelect').value = popupState.region;
        }
        if (popupState.activelyHiring !== undefined) {
            document.getElementById('activelyHiringCheckbox').checked =
                popupState.activelyHiring;
        }
        if (popupState.engagementOnly) {
            document.getElementById('engagementOnlyCheckbox')
                .checked = true;
        }
        if (popupState.degree2nd !== undefined) {
            document.getElementById('degree2nd').checked =
                popupState.degree2nd;
        }
        if (popupState.degree3rd !== undefined) {
            document.getElementById('degree3rd').checked =
                popupState.degree3rd;
        }
        if (popupState.sendNote !== undefined) {
            document.getElementById('sendNoteCheckbox').checked =
                popupState.sendNote;
            document.getElementById('noteSection').style.display =
                popupState.sendNote ? 'block' : 'none';
        }
        if (popupState.customNote) {
            TEMPLATES.custom = popupState.customNote;
        }
        if (popupState.customQuery) {
            document.getElementById('customQueryInput').value =
                popupState.customQuery;
        }
        if (popupState.scheduleEnabled) {
            document.getElementById('scheduleCheckbox').checked =
                true;
            document.getElementById('scheduleOptions')
                .style.display = 'block';
        }
        if (popupState.scheduleInterval) {
            document.getElementById('scheduleInterval').value =
                popupState.scheduleInterval;
        }
        if (popupState.savedQueries) {
            document.getElementById('savedQueries').value =
                popupState.savedQueries;
        }
        if (popupState.useCustomQuery) {
            useCustomQuery = true;
            document.getElementById('customQueryInput').style.display = 'block';
            document.getElementById('toggleCustomQuery').textContent =
                'Use tag builder';
            document.querySelectorAll('.tag-group').forEach(
                g => g.style.opacity = '0.4'
            );
        }

        if (popupState.companyQuery) {
            document.getElementById('companyQueryInput').value =
                popupState.companyQuery;
        }
        if (popupState.targetCompanies) {
            document.getElementById('targetCompanies').value =
                popupState.targetCompanies;
        }
        if (popupState.feedReact !== undefined) {
            document.getElementById('feedReactCheckbox').checked =
                popupState.feedReact;
        }
        if (popupState.feedComment) {
            document.getElementById('feedCommentCheckbox').checked =
                true;
            document.getElementById('commentSection')
                .style.display = 'block';
        }
        if (popupState.commentTemplates) {
            document.getElementById('commentTemplatesInput').value =
                popupState.commentTemplates;
        }
        if (popupState.skipKeywords) {
            document.getElementById('skipKeywordsInput').value =
                popupState.skipKeywords;
        }
        if (popupState.companyScheduleEnabled) {
            document.getElementById(
                'companyScheduleCheckbox'
            ).checked = true;
            document.getElementById(
                'companyScheduleOptions'
            ).style.display = 'block';
        }
        if (popupState.companyScheduleInterval) {
            document.getElementById(
                'companyScheduleInterval'
            ).value = popupState.companyScheduleInterval;
        }
        if (popupState.companyBatchSize) {
            document.getElementById(
                'companyBatchSize'
            ).value = popupState.companyBatchSize;
        }

        setActiveTemplate(popupState.activeTemplate || 'senior');
        updateQueryPreview();
        updateCharCounter();

        if (popupState.currentMode) {
            setMode(popupState.currentMode);
        }
    });
}

// --- EVENT LISTENERS ---

document.querySelectorAll('.tag').forEach(tag => {
    tag.addEventListener('click', () => {
        if (useCustomQuery) return;
        tag.classList.toggle('active');
        updateQueryPreview();
        saveState();
    });
});

document.getElementById('toggleCustomQuery').addEventListener('click', () => {
    useCustomQuery = !useCustomQuery;
    const input = document.getElementById('customQueryInput');
    const toggle = document.getElementById('toggleCustomQuery');

    if (useCustomQuery) {
        input.style.display = 'block';
        input.value = input.value || buildQuery();
        toggle.textContent = 'Use tag builder';
        document.querySelectorAll('.tag-group').forEach(
            g => g.style.opacity = '0.4'
        );
    } else {
        input.style.display = 'none';
        toggle.textContent = 'Edit query manually';
        document.querySelectorAll('.tag-group').forEach(
            g => g.style.opacity = '1'
        );
    }

    updateQueryPreview();
    saveState();
});

document.getElementById('customQueryInput').addEventListener('input', () => {
    updateQueryPreview();
    saveState();
});

document.querySelectorAll('.template-card').forEach(card => {
    card.addEventListener('click', () => {
        const key = card.dataset.template;
        setActiveTemplate(key);
        saveState();
    });
});

document.getElementById('noteTemplate').addEventListener('input', (e) => {
    const activeCard = document.querySelector('.template-card.active');
    if (activeCard?.dataset.template === 'custom') {
        TEMPLATES.custom = e.target.value;
    }
    updateCharCounter();
    saveState();
});

document.getElementById('sendNoteCheckbox').addEventListener('change', (e) => {
    document.getElementById('noteSection').style.display =
        e.target.checked ? 'block' : 'none';
    saveState();
});

document.getElementById('activelyHiringCheckbox').addEventListener(
    'change', saveState
);
document.getElementById('engagementOnlyCheckbox').addEventListener(
    'change', saveState
);
document.getElementById('degree2nd').addEventListener('change', saveState);
document.getElementById('degree3rd').addEventListener('change', saveState);
document.getElementById('regionSelect').addEventListener('change', saveState);
document.getElementById('limitInput').addEventListener('change', saveState);

document.getElementById('scheduleCheckbox').addEventListener(
    'change', (e) => {
        const opts = document.getElementById('scheduleOptions');
        opts.style.display = e.target.checked ? 'block' : 'none';
        const hours = parseInt(
            document.getElementById('scheduleInterval').value
        ) || 24;
        chrome.runtime.sendMessage({
            action: 'setSchedule',
            enabled: e.target.checked,
            intervalHours: hours
        });
        saveState();
    }
);

document.getElementById('savedQueries').addEventListener(
    'input', saveState
);

document.getElementById('scheduleInterval').addEventListener(
    'change', () => {
        const enabled = document.getElementById(
            'scheduleCheckbox'
        ).checked;
        if (!enabled) return;
        const hours = parseInt(
            document.getElementById('scheduleInterval').value
        ) || 24;
        chrome.runtime.sendMessage({
            action: 'setSchedule',
            enabled: true,
            intervalHours: hours
        });
        saveState();
    }
);

document.getElementById('startBtn').addEventListener('click', async () => {
    if (currentMode === 'companies') {
        return startCompanyFollow();
    }
    if (currentMode === 'feed') {
        return startFeedEngage();
    }
    return startConnect();
});

async function startConnect() {
    const query = buildQuery();
    if (!query) {
        setStatusMessage(
            'No query built. Select tags or write a custom query.',
            'warning'
        );
        return;
    }

    const noteText = document.getElementById('noteTemplate').value;
    const sendNote = document.getElementById('sendNoteCheckbox').checked;

    if (sendNote && noteText.length > MAX_CHARS) {
        setStatusMessage(
            `Note is ${noteText.length} chars (max ${MAX_CHARS}). Shorten it.`,
            'warning'
        );
        return;
    }

    const limit = parseInt(
        document.getElementById('limitInput').value
    ) || 50;
    const engagementOnly = document.getElementById(
        'engagementOnlyCheckbox'
    ).checked;

    const weeklyCount = await getWeeklyCount();
    if (!engagementOnly && weeklyCount >= WEEKLY_LIMIT) {
        setStatusMessage(
            `Weekly limit reached (${weeklyCount}/${WEEKLY_LIMIT}). Wait until next week or use Engagement mode.`,
            'error'
        );
        return;
    }
    if (!engagementOnly && weeklyCount + limit > WEEKLY_LIMIT) {
        const remaining = WEEKLY_LIMIT - weeklyCount;
        setStatusMessage(
            `Only ${remaining} invites left this week (${weeklyCount}/${WEEKLY_LIMIT}). Limit auto-adjusted to ${remaining}.`,
            'warning'
        );
        document.getElementById('limitInput').value = remaining;
    }
    const geoUrn = getSelectedRegionGeoUrn();
    const activelyHiring =
        document.getElementById('activelyHiringCheckbox').checked;

    const networkTypes = [];
    if (document.getElementById('degree2nd').checked) {
        networkTypes.push('"S"');
    }
    if (document.getElementById('degree3rd').checked) {
        networkTypes.push('"O"');
    }
    const networkFilter = networkTypes.length > 0
        ? encodeURIComponent(`[${networkTypes.join(',')}]`)
        : '';

    lastReportedSent = 0;

    const sentUrls = await new Promise(resolve => {
        chrome.storage.local.get('sentProfileUrls', (data) => {
            resolve(data.sentProfileUrls || []);
        });
    });

    showProgressUI(engagementOnly ? 'Engaged' : 'Sent', limit,
        engagementOnly
            ? 'Navigating to search (engagement mode)...'
            : 'Navigating to search... Do not close this popup or the tab.'
    );

    chrome.runtime.sendMessage({
        action: 'start',
        query,
        limit,
        sendNote,
        noteTemplate: noteText,
        geoUrn,
        activelyHiring,
        networkFilter,
        sentUrls,
        engagementOnly
    });
}

function startCompanyFollow() {
    const query = document.getElementById(
        'companyQueryInput'
    ).value.trim();
    const raw = document.getElementById(
        'targetCompanies'
    ).value.trim();
    const targetCompanies = raw
        ? raw.split('\n').map(s => s.trim()).filter(Boolean)
        : [];

    if (!query && targetCompanies.length === 0) {
        setStatusMessage(
            'Enter a search query or add target companies.',
            'warning'
        );
        return;
    }

    const limit = parseInt(
        document.getElementById('limitInput').value
    ) || 50;

    lastReportedSent = 0;
    showProgressUI('Followed', limit,
        'Searching companies by name...'
    );

    chrome.runtime.sendMessage({
        action: 'startCompanyFollow',
        query: query || 'software technology',
        limit,
        targetCompanies
    });
}

function startFeedEngage() {
    const limit = parseInt(
        document.getElementById('limitInput').value
    ) || 20;
    const react = document.getElementById(
        'feedReactCheckbox'
    ).checked;
    const comment = document.getElementById(
        'feedCommentCheckbox'
    ).checked;

    if (!react && !comment) {
        setStatusMessage(
            'Enable at least one: react or comment.',
            'warning'
        );
        return;
    }

    const rawTemplates = document.getElementById(
        'commentTemplatesInput'
    ).value.trim();
    const commentTemplates = rawTemplates
        ? rawTemplates.split('\n').map(s => s.trim())
            .filter(Boolean)
        : [];
    const rawSkip = document.getElementById(
        'skipKeywordsInput'
    ).value.trim();
    const skipKeywords = rawSkip
        ? rawSkip.split('\n').map(s => s.trim())
            .filter(Boolean)
        : [];

    lastReportedSent = 0;
    showProgressUI('Engaged', limit,
        'Navigating to feed...'
    );

    chrome.runtime.sendMessage({
        action: 'startFeedEngage',
        limit,
        react,
        comment,
        commentTemplates,
        skipKeywords
    });
}

function showProgressUI(verb, limit, statusMsg) {
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    startBtn.style.display = 'none';
    stopBtn.style.display = 'flex';
    stopBtn.disabled = false;
    stopBtn.textContent = 'Stop';
    document.getElementById('progressBox')
        .style.display = 'block';
    document.getElementById('progressText').textContent =
        `${verb} 0 / ${limit}`;
    document.getElementById('progressMeta').textContent =
        'Page 1';
    setStatusMessage(statusMsg, 'info');
}

document.getElementById('stopBtn').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'stop' });
    const stopBtn = document.getElementById('stopBtn');
    stopBtn.disabled = true;
    stopBtn.textContent = 'Stopping...';
    setStatusMessage('Stopping automation...', 'warning');
});

let lastReportedSent = 0;
let lastConnectionLog = [];

document.getElementById('exportBtn').addEventListener('click', () => {
    if (!lastConnectionLog.length) return;
    const escape = (s) =>
        `"${(s || '').replace(/"/g, '""')}"`;
    const header = 'Name,Headline,Profile URL,Status,Time';
    const rows = lastConnectionLog.map(r =>
        [r.name, r.headline, r.profileUrl, r.status, r.time]
            .map(escape).join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = `linkedin-connections-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
});

chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'progress') {
        const isConnect = currentMode === 'connect';
        const engMode = isConnect && document.getElementById(
            'engagementOnlyCheckbox'
        ).checked;
        const newSent = request.sent - lastReportedSent;
        if (newSent > 0 && isConnect && !engMode) {
            addToWeeklyCount(newSent);
            lastReportedSent = request.sent;
            updateWeeklyDisplay();
        } else if (newSent > 0) {
            lastReportedSent = request.sent;
        }
        const verbMap = {
            connect: engMode ? 'Engaged' : 'Sent',
            companies: 'Followed',
            feed: 'Engaged'
        };
        const verb = verbMap[currentMode] || 'Done';
        document.getElementById('progressText').textContent =
            `${verb} ${request.sent} / ${request.limit}`;
        const meta = [`Page ${request.page}`];
        if (request.skipped > 0) {
            meta.push(`${request.skipped} skipped`);
        }
        document.getElementById('progressMeta').textContent =
            meta.join(' · ');
    }

    if (request.action === 'done') {
        lastReportedSent = 0;
        const startBtn = document.getElementById('startBtn');
        const stopBtn = document.getElementById('stopBtn');
        const response = request.result;

        stopBtn.style.display = 'none';
        startBtn.style.display = 'flex';

        updateWeeklyDisplay();

        if (response?.log?.length) {
            lastConnectionLog = response.log;
            document.getElementById('exportBtn')
                .style.display = 'block';

            chrome.storage.local.get(
                'connectionHistory', (hData) => {
                    const existing =
                        hData.connectionHistory || [];
                    const merged =
                        [...existing, ...response.log];
                    const trimmed = merged.slice(-500);
                    chrome.storage.local.set({
                        connectionHistory: trimmed
                    }, () => {
                        renderRecentProfiles(trimmed);
                    });
                }
            );

            const newUrls = response.log
                .filter(r => r.status === 'sent' && r.profileUrl)
                .map(r => r.profileUrl);
            if (newUrls.length) {
                chrome.storage.local.get(
                    'sentProfileUrls', (data) => {
                        const existing =
                            data.sentProfileUrls || [];
                        const merged = [...new Set(
                            [...existing, ...newUrls]
                        )];
                        chrome.storage.local.set({
                            sentProfileUrls: merged
                        });
                    }
                );
            }
        }

        if (response?.success) {
            setStatusMessage(
                'Success! ' + (response.message || ''),
                'success'
            );
            startBtn.textContent = 'Done!';
        } else {
            setStatusMessage(
                'Error: ' + (response?.error || 'Unknown error.'),
                'error'
            );
            startBtn.disabled = false;
            startBtn.textContent = 'Try Again';
        }
    }
});

document.getElementById('checkAcceptedBtn').addEventListener(
    'click', () => {
        const btn = document.getElementById('checkAcceptedBtn');
        btn.disabled = true;
        btn.textContent = 'Checking...';
        chrome.runtime.sendMessage(
            { action: 'checkAccepted' },
            (response) => {
                btn.disabled = false;
                btn.textContent = 'Check Accepted Connections';
                if (response?.accepted?.length) {
                    setStatusMessage(
                        `Found ${response.accepted.length} accepted connections!`,
                        'success'
                    );
                } else {
                    setStatusMessage(
                        response?.error || 'No new accepted connections found.',
                        'info'
                    );
                }
            }
        );
    }
);

function renderRecentProfiles(entries) {
    const container = document.getElementById('recentProfiles');
    const list = document.getElementById('recentList');
    if (!entries || !entries.length) {
        container.style.display = 'none';
        return;
    }
    container.style.display = 'block';
    list.textContent = '';
    const recent = entries.slice(-5).reverse();
    for (const r of recent) {
        const card = document.createElement('div');
        card.className = 'profile-card';

        const avatar = document.createElement('div');
        avatar.className = 'profile-avatar';
        const initials = (r.name || '?')
            .split(/\s+/)
            .slice(0, 2)
            .map(w => w[0]?.toUpperCase() || '')
            .join('');
        avatar.textContent = initials || '?';

        const info = document.createElement('div');
        info.className = 'profile-info';

        const nameEl = document.createElement('div');
        nameEl.className = 'profile-name';
        if (r.profileUrl) {
            const link = document.createElement('a');
            link.href = r.profileUrl;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = r.name || 'Unknown';
            nameEl.appendChild(link);
        } else {
            nameEl.textContent = r.name || 'Unknown';
        }

        const headlineEl = document.createElement('div');
        headlineEl.className = 'profile-headline';
        headlineEl.textContent = r.headline || '';

        info.appendChild(nameEl);
        if (r.headline) info.appendChild(headlineEl);

        const badge = document.createElement('span');
        badge.className = 'profile-badge ';
        if (r.status === 'sent') {
            badge.className += 'sent';
            badge.textContent = 'Sent';
        } else if (r.status === 'visited' ||
            r.status === 'followed' ||
            r.status === 'visited-followed') {
            badge.className += 'sent';
            badge.textContent = r.status
                .replace('-', '+');
        } else {
            badge.className += 'skipped';
            badge.textContent =
                (r.status || '').replace('skipped-', '');
        }

        card.appendChild(avatar);
        card.appendChild(info);
        card.appendChild(badge);
        list.appendChild(card);
    }
}

function loadRecentProfiles() {
    chrome.storage.local.get('connectionHistory', (data) => {
        renderRecentProfiles(data.connectionHistory);
    });
}

let currentMode = 'connect';

function setMode(mode) {
    currentMode = mode;
    document.getElementById('connectSection')
        .style.display = mode === 'connect' ? 'block' : 'none';
    document.getElementById('companySection')
        .style.display = mode === 'companies' ? 'block' : 'none';
    document.getElementById('feedSection')
        .style.display = mode === 'feed' ? 'block' : 'none';
    document.getElementById('weeklyCounter')
        .style.display = mode === 'connect' ? 'block' : 'none';

    document.querySelectorAll('.mode-btn').forEach(btn => {
        const isActive = btn.dataset.mode === mode;
        btn.classList.toggle('active', isActive);
        btn.style.background = isActive
            ? 'var(--primary)' : 'var(--bg-color)';
        btn.style.color = isActive
            ? 'white' : 'var(--text-main)';
        btn.style.borderColor = isActive
            ? 'var(--primary)' : 'var(--border)';
    });

    const labels = {
        connect: 'Launch Automation',
        companies: 'Follow Companies',
        feed: 'Engage Feed'
    };
    const startBtn = document.getElementById('startBtn');
    startBtn.textContent = '';
    const svg = document.createElementNS(
        'http://www.w3.org/2000/svg', 'svg'
    );
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    const poly = document.createElementNS(
        'http://www.w3.org/2000/svg', 'polygon'
    );
    poly.setAttribute('points', '5 3 19 12 5 21 5 3');
    svg.appendChild(poly);
    startBtn.appendChild(svg);
    startBtn.appendChild(
        document.createTextNode(' ' + labels[mode])
    );
    startBtn.disabled = false;

    saveState();
}

document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        setMode(btn.dataset.mode);
    });
});

document.getElementById('feedCommentCheckbox')
    .addEventListener('change', (e) => {
        document.getElementById('commentSection')
            .style.display =
                e.target.checked ? 'block' : 'none';
        saveState();
    });

document.getElementById('feedReactCheckbox')
    .addEventListener('change', saveState);
document.getElementById('companyQueryInput')
    .addEventListener('input', saveState);
document.getElementById('targetCompanies')
    .addEventListener('input', saveState);
document.getElementById('commentTemplatesInput')
    .addEventListener('input', saveState);
document.getElementById('skipKeywordsInput')
    .addEventListener('input', saveState);
document.getElementById('loadDefaultCompanies')
    .addEventListener('click', () => {
        document.getElementById('targetCompanies')
            .value = DEFAULT_LATAM_COMPANIES;
        const queryInput = document.getElementById(
            'companyQueryInput');
        if (!queryInput.value.trim()) {
            queryInput.value = 'software technology';
        }
        saveState();
    });

document.getElementById('companyScheduleCheckbox')
    .addEventListener('change', (e) => {
        const opts = document.getElementById(
            'companyScheduleOptions'
        );
        opts.style.display = e.target.checked
            ? 'block' : 'none';
        const hours = parseInt(
            document.getElementById(
                'companyScheduleInterval'
            ).value
        ) || 24;
        const batchSize = parseInt(
            document.getElementById(
                'companyBatchSize'
            ).value
        ) || 10;
        chrome.runtime.sendMessage({
            action: 'setCompanySchedule',
            enabled: e.target.checked,
            intervalHours: hours,
            batchSize
        });
        saveState();
    });

document.getElementById('companyScheduleInterval')
    .addEventListener('change', () => {
        const enabled = document.getElementById(
            'companyScheduleCheckbox'
        ).checked;
        if (!enabled) return;
        const hours = parseInt(
            document.getElementById(
                'companyScheduleInterval'
            ).value
        ) || 24;
        const batchSize = parseInt(
            document.getElementById(
                'companyBatchSize'
            ).value
        ) || 10;
        chrome.runtime.sendMessage({
            action: 'setCompanySchedule',
            enabled: true,
            intervalHours: hours,
            batchSize
        });
        saveState();
    });

document.getElementById('companyBatchSize')
    .addEventListener('change', saveState);

loadState();
updateWeeklyDisplay();
loadRecentProfiles();
