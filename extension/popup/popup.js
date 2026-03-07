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
        limit: document.getElementById('limitInput').value,
        region: document.getElementById('regionSelect').value,
        activelyHiring: document.getElementById('activelyHiringCheckbox').checked,
        degree2nd: document.getElementById('degree2nd').checked,
        degree3rd: document.getElementById('degree3rd').checked,
        sendNote: document.getElementById('sendNoteCheckbox').checked,
        activeTemplate: document.querySelector(
            '.template-card.active'
        )?.dataset.template || 'senior',
        customNote: TEMPLATES.custom,
        customQuery: document.getElementById('customQueryInput').value,
        useCustomQuery
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
        if (popupState.useCustomQuery) {
            useCustomQuery = true;
            document.getElementById('customQueryInput').style.display = 'block';
            document.getElementById('toggleCustomQuery').textContent =
                'Use tag builder';
            document.querySelectorAll('.tag-group').forEach(
                g => g.style.opacity = '0.4'
            );
        }

        setActiveTemplate(popupState.activeTemplate || 'senior');
        updateQueryPreview();
        updateCharCounter();
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
document.getElementById('degree2nd').addEventListener('change', saveState);
document.getElementById('degree3rd').addEventListener('change', saveState);
document.getElementById('regionSelect').addEventListener('change', saveState);
document.getElementById('limitInput').addEventListener('change', saveState);

document.getElementById('startBtn').addEventListener('click', async () => {
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

    const weeklyCount = await getWeeklyCount();
    if (weeklyCount >= WEEKLY_LIMIT) {
        setStatusMessage(
            `Weekly limit reached (${weeklyCount}/${WEEKLY_LIMIT}). ` +
            'Wait until next week to avoid account restrictions.',
            'error'
        );
        return;
    }
    if (weeklyCount + limit > WEEKLY_LIMIT) {
        const remaining = WEEKLY_LIMIT - weeklyCount;
        setStatusMessage(
            `Only ${remaining} invites left this week ` +
            `(${weeklyCount}/${WEEKLY_LIMIT}). ` +
            `Limit auto-adjusted to ${remaining}.`,
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
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    startBtn.style.display = 'none';
    stopBtn.style.display = 'flex';
    document.getElementById('progressBox').style.display = 'block';
    document.getElementById('progressText').textContent =
        `Sent 0 / ${limit}`;
    document.getElementById('progressMeta').textContent =
        'Page 1';
    setStatusMessage(
        'Navigating to search... Do not close this popup or the tab.',
        'info'
    );

    chrome.runtime.sendMessage({
        action: 'start',
        query,
        limit,
        sendNote,
        noteTemplate: noteText,
        geoUrn,
        activelyHiring,
        networkFilter
    });
});

document.getElementById('stopBtn').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'stop' });
    const stopBtn = document.getElementById('stopBtn');
    stopBtn.disabled = true;
    stopBtn.textContent = 'Stopping...';
    setStatusMessage('Stopping automation...', 'warning');
});

let lastReportedSent = 0;

chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'progress') {
        const newSent = request.sent - lastReportedSent;
        if (newSent > 0) {
            addToWeeklyCount(newSent);
            lastReportedSent = request.sent;
            updateWeeklyDisplay();
        }
        document.getElementById('progressText').textContent =
            `Sent ${request.sent} / ${request.limit}`;
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

loadState();
updateWeeklyDisplay();
