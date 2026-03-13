const FALLBACK_TEMPLATES = {
    senior: `Hi {name}, I work on strategic projects in your field and value practical exchanges with professionals in this space. Happy to connect.`,
    mid: `Hi {name}, I collaborate with teams in your field and enjoy sharing practical market insights. I would like to connect.`,
    junior: `Hi {name}, I am growing my career and would love to connect with professionals in this space.`,
    lead: `Hi {name}, I lead initiatives and value focused conversations about execution and outcomes. Happy to connect.`,
    networking: `Hi {name}, I came across your profile and would like to connect. I value exchanging practical insights and staying in touch.`,
    custom: ''
};

const TEMPLATES = { ...FALLBACK_TEMPLATES };

const MAX_CHARS = 300;
const WEEKLY_LIMIT = 150;
const DEFAULT_ROLE_TERMS_LIMIT = 6;
const DEFAULT_FEED_WARMUP_RUNS = 2;
const DEFAULT_TEMPLATE_KEY = 'networking';
const DEFAULT_AREA_PRESET = 'custom';
const DEFAULT_COMPANY_AREA_PRESET = 'custom';
const DEFAULT_JOBS_AREA_PRESET = 'custom';
const DEFAULT_CONNECT_USAGE_GOAL = 'recruiter_outreach';
const DEFAULT_COMPANY_USAGE_GOAL = 'talent_watchlist';
const DEFAULT_JOBS_USAGE_GOAL = 'high_fit_easy_apply';
const DEFAULT_EXPECTED_RESULTS = 'balanced';
const DEFAULT_LOCAL_UI_STATE = {
    accordions: {
        connect: {
            refine: false,
            filters: false,
            message: false,
            automation: false
        },
        companies: { automation: false },
        jobs: {
            refine: false,
            profile: false
        },
        feed: {
            commentSettings: false,
            automation: false
        },
        tools: { extras: false }
    },
    lastOpenSubpanel: {
        connect: null,
        companies: null,
        jobs: null,
        feed: null
    },
    tagSearch: ''
};
let useCustomQuery = false;
let popupUiState = DEFAULT_LOCAL_UI_STATE;

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

function getSelectedAreaPreset() {
    const select = document.getElementById('areaPresetSelect');
    const value = select?.value || DEFAULT_AREA_PRESET;
    if (typeof normalizeAreaPreset === 'function') {
        return normalizeAreaPreset(value);
    }
    return value || DEFAULT_AREA_PRESET;
}

function setAreaPresetSelectValue(value) {
    const select = document.getElementById('areaPresetSelect');
    if (!select) return;
    const normalized = typeof normalizeAreaPreset === 'function'
        ? normalizeAreaPreset(value)
        : (value || DEFAULT_AREA_PRESET);
    select.value = normalized || DEFAULT_AREA_PRESET;
}

function getSelectedCompanyAreaPreset() {
    const select = document.getElementById(
        'companyAreaPresetSelect'
    );
    const value = select?.value || DEFAULT_COMPANY_AREA_PRESET;
    if (typeof normalizeCompanyAreaPreset === 'function') {
        return normalizeCompanyAreaPreset(value);
    }
    return value || DEFAULT_COMPANY_AREA_PRESET;
}

function getSelectedJobsAreaPreset() {
    const select = document.getElementById(
        'jobsAreaPresetSelect'
    );
    const value = select?.value || DEFAULT_JOBS_AREA_PRESET;
    if (typeof normalizeAreaPreset === 'function') {
        return normalizeAreaPreset(value);
    }
    return value || DEFAULT_JOBS_AREA_PRESET;
}

function setJobsAreaPresetSelectValue(value) {
    const select = document.getElementById(
        'jobsAreaPresetSelect'
    );
    if (!select) return;
    const normalized = typeof normalizeAreaPreset === 'function'
        ? normalizeAreaPreset(value)
        : (value || DEFAULT_JOBS_AREA_PRESET);
    select.value = normalized || DEFAULT_JOBS_AREA_PRESET;
}

function parseMultilineList(raw) {
    return String(raw || '')
        .split('\n')
        .map(item => item.trim())
        .filter(Boolean);
}

function getJobsPresetTerms(preset) {
    if (!preset || preset === 'custom') {
        return { role: [], industry: [] };
    }
    if (typeof AREA_PRESETS !== 'undefined' &&
        AREA_PRESETS[preset]) {
        return {
            role: (AREA_PRESETS[preset].role || []).slice(),
            industry: (AREA_PRESETS[preset].industry || []).slice()
        };
    }
    return { role: [], industry: [] };
}

function setCompanyAreaPresetSelectValue(value) {
    const select = document.getElementById(
        'companyAreaPresetSelect'
    );
    if (!select) return;
    const normalized = typeof normalizeCompanyAreaPreset
        === 'function'
        ? normalizeCompanyAreaPreset(value)
        : (value || DEFAULT_COMPANY_AREA_PRESET);
    select.value = normalized || DEFAULT_COMPANY_AREA_PRESET;
}

function getCompanyPresetDefaultQuery(companyAreaPreset) {
    if (typeof getCompanyAreaPresetDefaultQuery === 'function') {
        return getCompanyAreaPresetDefaultQuery(
            companyAreaPreset
        );
    }
    return '';
}

function getCompanyPresetDefaultTargets(companyAreaPreset) {
    if (typeof getCompanyAreaPresetDefaultTargetCompanies ===
        'function') {
        return getCompanyAreaPresetDefaultTargetCompanies(
            companyAreaPreset
        );
    }
    return [];
}

function getValueOrDefault(id, fallback) {
    const el = document.getElementById(id);
    if (!el) return fallback;
    return String(el.value || '').trim() || fallback;
}

function setSelectValue(id, value, fallback) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = String(value || fallback || '');
}

function getConnectUsageGoal() {
    return getValueOrDefault(
        'connectUsageGoalSelect',
        DEFAULT_CONNECT_USAGE_GOAL
    );
}

function getConnectExpectedResults() {
    return getValueOrDefault(
        'connectExpectedResultsSelect',
        DEFAULT_EXPECTED_RESULTS
    );
}

function isConnectTemplateAuto() {
    return document.getElementById(
        'connectTemplateAutoCheckbox'
    )?.checked !== false;
}

function getConnectTemplateId() {
    return getValueOrDefault('connectTemplateSelect', '');
}

function getCompanyUsageGoal() {
    return getValueOrDefault(
        'companyUsageGoalSelect',
        DEFAULT_COMPANY_USAGE_GOAL
    );
}

function getCompanyExpectedResults() {
    return getValueOrDefault(
        'companyExpectedResultsSelect',
        DEFAULT_EXPECTED_RESULTS
    );
}

function isCompanyTemplateAuto() {
    return document.getElementById(
        'companyTemplateAutoCheckbox'
    )?.checked !== false;
}

function getCompanyTemplateId() {
    return getValueOrDefault('companyTemplateSelect', '');
}

function getJobsUsageGoal() {
    return getValueOrDefault(
        'jobsUsageGoalSelect',
        DEFAULT_JOBS_USAGE_GOAL
    );
}

function getJobsExpectedResults() {
    return getValueOrDefault(
        'jobsExpectedResultsSelect',
        DEFAULT_EXPECTED_RESULTS
    );
}

function isJobsTemplateAuto() {
    return document.getElementById(
        'jobsTemplateAutoCheckbox'
    )?.checked !== false;
}

function getJobsTemplateId() {
    return getValueOrDefault('jobsTemplateSelect', '');
}

function getTemplateState(mode) {
    if (mode === 'connect') {
        return {
            usageGoal: getConnectUsageGoal(),
            expectedResultsBucket: getConnectExpectedResults(),
            auto: isConnectTemplateAuto(),
            templateId: getConnectTemplateId(),
            areaPreset: getSelectedAreaPreset()
        };
    }
    if (mode === 'companies') {
        return {
            usageGoal: getCompanyUsageGoal(),
            expectedResultsBucket: getCompanyExpectedResults(),
            auto: isCompanyTemplateAuto(),
            templateId: getCompanyTemplateId(),
            areaPreset: getSelectedCompanyAreaPreset()
        };
    }
    return {
        usageGoal: getJobsUsageGoal(),
        expectedResultsBucket: getJobsExpectedResults(),
        auto: isJobsTemplateAuto(),
        templateId: getJobsTemplateId(),
        areaPreset: getSelectedJobsAreaPreset()
    };
}

function populateTemplateSelect(mode) {
    if (typeof listSearchTemplates !== 'function') return;
    const state = getTemplateState(mode);
    const selectId = mode === 'connect'
        ? 'connectTemplateSelect'
        : mode === 'companies'
            ? 'companyTemplateSelect'
            : 'jobsTemplateSelect';
    const autoId = mode === 'connect'
        ? 'connectTemplateAutoCheckbox'
        : mode === 'companies'
            ? 'companyTemplateAutoCheckbox'
            : 'jobsTemplateAutoCheckbox';
    const select = document.getElementById(selectId);
    const autoBox = document.getElementById(autoId);
    if (!select) return;

    const options = listSearchTemplates({
        mode,
        areaPreset: state.areaPreset,
        usageGoal: state.usageGoal,
        expectedResultsBucket: state.expectedResultsBucket
    });
    const previous = select.value;
    select.textContent = '';
    options.forEach(template => {
        const option = document.createElement('option');
        option.value = template.id;
        option.textContent = template.id;
        select.appendChild(option);
    });
    if (previous &&
        Array.from(select.options).some(
            opt => opt.value === previous
        )) {
        select.value = previous;
    }
    if (!select.value && options[0]) {
        select.value = options[0].id;
    }
    if (autoBox) {
        select.disabled = autoBox.checked;
    }
}

function refreshTemplateControls() {
    populateTemplateSelect('connect');
    populateTemplateSelect('companies');
    populateTemplateSelect('jobs');
}

function normalizeTemplateMeta(meta, mode) {
    const source = meta && typeof meta === 'object'
        ? meta : {};
    return {
        templateId: String(source.templateId || ''),
        usageGoal: String(
            source.usageGoal ||
            (mode === 'connect'
                ? getConnectUsageGoal()
                : mode === 'companies'
                    ? getCompanyUsageGoal()
                    : getJobsUsageGoal())
        ),
        expectedResultsBucket: String(
            source.expectedResultsBucket ||
            (mode === 'connect'
                ? getConnectExpectedResults()
                : mode === 'companies'
                    ? getCompanyExpectedResults()
                    : getJobsExpectedResults())
        ),
        operatorCount: Math.max(
            0,
            Number(source.operatorCount) || 0
        ),
        compiledQueryLength: Math.max(
            0,
            Number(source.compiledQueryLength) || 0
        ),
        mode
    };
}

function normalizePopupUi(ui) {
    if (typeof normalizePopupUiState === 'function') {
        return normalizePopupUiState(ui);
    }
    return {
        ...DEFAULT_LOCAL_UI_STATE,
        ...(ui || {})
    };
}

function setPopupAccordionState(mode, panel, isOpen) {
    if (typeof setPopupAccordionOpen === 'function') {
        popupUiState = setPopupAccordionOpen(
            popupUiState,
            mode,
            panel,
            isOpen
        );
        return;
    }
    popupUiState = normalizePopupUi(popupUiState);
    if (!popupUiState.accordions?.[mode] ||
        typeof popupUiState.accordions[mode][panel] !==
            'boolean') {
        return;
    }
    popupUiState.accordions[mode][panel] = !!isOpen;
    if (isOpen && popupUiState.lastOpenSubpanel?.[mode] !==
        undefined) {
        popupUiState.lastOpenSubpanel[mode] = panel;
    }
}

function getPopupAccordionState(mode, panel) {
    popupUiState = normalizePopupUi(popupUiState);
    return !!popupUiState?.accordions?.[mode]?.[panel];
}

function renderAccordions() {
    popupUiState = normalizePopupUi(popupUiState);
    document.querySelectorAll('[data-accordion-toggle]')
        .forEach(btn => {
            const token = btn.dataset.accordionToggle || '';
            const [mode, panel] = token.split(':');
            if (!mode || !panel) return;
            const root = btn.closest('.accordion');
            if (!root) return;
            const isOpen = getPopupAccordionState(
                mode,
                panel
            );
            root.classList.toggle('open', isOpen);
            btn.setAttribute(
                'aria-expanded',
                isOpen ? 'true' : 'false'
            );
        });
}

function updateRefineSelectedCount() {
    const counter = document.getElementById(
        'refineSelectedCount'
    );
    if (!counter) return;
    const count = document.querySelectorAll(
        '#connectSection .tag.active'
    ).length;
    counter.textContent = `${count} selected`;
}

function applyTagSearchFilter() {
    const input = document.getElementById('tagSearchInput');
    if (!input) return;
    const query = input.value || '';
    popupUiState = normalizePopupUi(popupUiState);
    popupUiState.tagSearch = query;
    document.querySelectorAll(
        '#connectSection .tag[data-group]'
    ).forEach(tag => {
        const match = typeof filterTagMatchesSearch ===
            'function'
            ? filterTagMatchesSearch(
                tag.textContent || '',
                tag.dataset.value || '',
                query
            )
            : String(tag.textContent || '')
                .toLowerCase()
                .includes(String(query).toLowerCase());
        tag.style.display = match ? '' : 'none';
    });
}

function syncFeedCommentSettingsVisibility() {
    const enabled = document.getElementById(
        'feedCommentCheckbox'
    )?.checked === true;
    const accordion = document.getElementById(
        'commentSettingsAccordion'
    );
    const commentSection = document.getElementById(
        'commentSection'
    );
    if (!accordion || !commentSection) return;
    const visible = typeof isCommentSettingsVisible ===
        'function'
        ? isCommentSettingsVisible(enabled)
        : enabled;
    accordion.style.display = visible ? 'block' : 'none';
    commentSection.style.display = visible ? 'block' : 'none';
    if (!visible) {
        setPopupAccordionState(
            'feed',
            'commentSettings',
            false
        );
    }
}

function initializeAccordionInteractions() {
    document.querySelectorAll('[data-accordion-toggle]')
        .forEach(btn => {
            btn.addEventListener('click', () => {
                const token = btn.dataset
                    .accordionToggle || '';
                const [mode, panel] = token.split(':');
                if (!mode || !panel) return;
                const next = !getPopupAccordionState(
                    mode,
                    panel
                );
                setPopupAccordionState(
                    mode,
                    panel,
                    next
                );
                renderAccordions();
                saveState();
            });
        });
}

function refreshTemplatesForArea() {
    const areaPreset = getSelectedAreaPreset();
    const generated = typeof getConnectTemplates === 'function'
        ? getConnectTemplates(areaPreset, 'en')
        : {};
    ['senior', 'mid', 'junior', 'lead', 'networking']
        .forEach(key => {
            TEMPLATES[key] = generated[key] ||
                FALLBACK_TEMPLATES[key];
        });
}

function setTagsForGroup(group, values) {
    const set = new Set(Array.isArray(values) ? values : []);
    document.querySelectorAll(`.tag[data-group="${group}"]`)
        .forEach(tag => {
            tag.classList.toggle('active', set.has(tag.dataset.value));
        });
}

function hasActiveTags(group) {
    return document.querySelectorAll(
        `.tag[data-group="${group}"].active`
    ).length > 0;
}

function applyAreaPreset(preset, shouldSave) {
    const normalized = typeof normalizeAreaPreset === 'function'
        ? normalizeAreaPreset(preset)
        : (preset || DEFAULT_AREA_PRESET);
    setAreaPresetSelectValue(normalized);
    if (normalized !== 'custom' &&
        typeof applyAreaPresetToTags === 'function') {
        const currentTags = {
            role: getSelectedTags('role'),
            industry: getSelectedTags('industry'),
            market: getSelectedTags('market'),
            level: getSelectedTags('level')
        };
        const next = applyAreaPresetToTags(currentTags, normalized);
        setTagsForGroup('role', next.role);
        setTagsForGroup('industry', next.industry);
    }
    refreshTemplatesForArea();
    refreshTemplateControls();
    const activeTemplate = document.querySelector(
        '.template-card.active'
    )?.dataset.template || DEFAULT_TEMPLATE_KEY;
    if (activeTemplate !== 'custom') {
        setActiveTemplate(activeTemplate);
    }
    updateQueryPreview();
    updateRefineSelectedCount();
    if (shouldSave) saveState();
}

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

function getRoleTermsLimit() {
    const input = document.getElementById(
        'roleTermsLimitInput'
    );
    const parsed = parseInt(input?.value, 10);
    if (!Number.isFinite(parsed)) {
        return DEFAULT_ROLE_TERMS_LIMIT;
    }
    return Math.max(1, Math.min(10, parsed));
}

function getFeedWarmupRunsRequired() {
    const input = document.getElementById(
        'feedWarmupRunsRequiredInput'
    );
    const parsed = parseInt(input?.value, 10);
    if (!Number.isFinite(parsed)) {
        return DEFAULT_FEED_WARMUP_RUNS;
    }
    return Math.max(0, Math.min(10, parsed));
}

function renderFeedWarmupProgress(progress) {
    const text = document.getElementById(
        'feedWarmupProgressText'
    );
    if (!text) return;
    const enabled = progress?.enabled !== false;
    const completed = Number(progress?.completedRuns) || 0;
    const required = Number(progress?.requiredRuns);
    const safeRequired = Number.isFinite(required)
        ? required
        : getFeedWarmupRunsRequired();
    const unlock = Number(progress?.unlockRunNumber) ||
        (safeRequired + 1);
    if (!enabled) {
        text.textContent =
            'Learning warmup disabled. Comments are unlocked.';
        return;
    }
    text.textContent =
        `Learning progress: ${completed} / ${safeRequired} runs · ` +
        `Comments unlock on run #${unlock}`;
}

function refreshFeedWarmupProgress() {
    chrome.runtime.sendMessage({
        action: 'getFeedWarmupProgress',
        feedWarmupEnabled: document.getElementById(
            'feedWarmupEnabledCheckbox'
        ).checked,
        feedWarmupRunsRequired: getFeedWarmupRunsRequired()
    }, (response) => {
        if (chrome.runtime.lastError || !response) return;
        renderFeedWarmupProgress(response);
    });
}

function getSafeRoleTerms(roles) {
    if (typeof buildConnectQueryFromTags === 'function') {
        const query = buildConnectQueryFromTags(
            { role: Array.isArray(roles) ? roles : [] },
            getRoleTermsLimit()
        );
        if (!query) return [];
        if (!query.includes(' OR ')) return [query];
        return query.split(' OR ').map(s => s.trim()).filter(Boolean);
    }
    return Array.isArray(roles) ? roles : [];
}

function buildConnectSearchPlan(selectedTags) {
    const tags = selectedTags && typeof selectedTags === 'object'
        ? selectedTags
        : {
            role: getSelectedTags('role'),
            industry: getSelectedTags('industry'),
            market: getSelectedTags('market'),
            level: getSelectedTags('level')
        };

    const templateState = getTemplateState('connect');
    if (typeof buildSearchTemplatePlan === 'function') {
        const plan = buildSearchTemplatePlan({
            mode: 'connect',
            areaPreset: getSelectedAreaPreset(),
            usageGoal: templateState.usageGoal,
            expectedResultsBucket:
                templateState.expectedResultsBucket,
            auto: templateState.auto,
            templateId: templateState.templateId,
            selectedTags: tags,
            roleTermsLimit: getRoleTermsLimit()
        });
        if (plan?.query) return plan;
    }

    if (typeof buildConnectQueryFromTags === 'function') {
        const query = buildConnectQueryFromTags(
            tags,
            getRoleTermsLimit()
        );
        return {
            query,
            filterSpec: {},
            defaults: {},
            meta: normalizeTemplateMeta({}, 'connect'),
            diagnostics: {}
        };
    }
    const safeRoles = getSafeRoleTerms(tags.role);
    const parts = [];
    if (safeRoles.length === 1) parts.push(safeRoles[0]);
    if (safeRoles.length > 1) parts.push(safeRoles.join(' OR '));
    tags.industry.forEach(term => parts.push(term));
    tags.market.forEach(term => parts.push(term));
    tags.level.forEach(term => parts.push(term));
    const query = parts.join(' ');
    return {
        query,
        filterSpec: {},
        defaults: {},
        meta: normalizeTemplateMeta({}, 'connect'),
        diagnostics: {}
    };
}

function buildQuery() {
    if (useCustomQuery) {
        return document.getElementById('customQueryInput').value.trim();
    }
    return buildConnectSearchPlan().query;
}

function buildCompanySearchPlan() {
    const templateState = getTemplateState('companies');
    const manualQuery = document.getElementById(
        'companyQueryInput'
    )?.value.trim() || '';
    const targetCompanies = parseMultilineList(
        document.getElementById('targetCompanies')?.value || ''
    );
    if (typeof buildSearchTemplatePlan === 'function') {
        const plan = buildSearchTemplatePlan({
            mode: 'companies',
            areaPreset: getSelectedCompanyAreaPreset(),
            usageGoal: templateState.usageGoal,
            expectedResultsBucket:
                templateState.expectedResultsBucket,
            auto: templateState.auto,
            templateId: templateState.templateId,
            manualQuery
        });
        if (plan?.query || targetCompanies.length > 0) {
            return plan;
        }
    }
    return {
        query: manualQuery,
        filterSpec: {},
        defaults: {},
        meta: normalizeTemplateMeta({}, 'companies'),
        diagnostics: {}
    };
}

function getEffectiveJobsRoleTerms(directRoleTerms) {
    const roleTerms = Array.isArray(directRoleTerms)
        ? directRoleTerms
        : parseMultilineList(
            document.getElementById('jobsRoleTermsInput')?.value
        );
    if (roleTerms.length > 0) return roleTerms;
    return getJobsPresetTerms(
        getSelectedJobsAreaPreset()
    ).role.slice(0, 4);
}

function buildJobsSearchPlan() {
    const templateState = getTemplateState('jobs');
    const manualQuery = document.getElementById(
        'jobsQueryInput'
    )?.value.trim() || '';
    const roleTerms = getEffectiveJobsRoleTerms();
    const locationTerms = parseMultilineList(
        document.getElementById('jobsLocationTermsInput')?.value
    );
    if (typeof buildSearchTemplatePlan === 'function') {
        const plan = buildSearchTemplatePlan({
            mode: 'jobs',
            areaPreset: getSelectedJobsAreaPreset(),
            usageGoal: templateState.usageGoal,
            expectedResultsBucket:
                templateState.expectedResultsBucket,
            auto: templateState.auto,
            templateId: templateState.templateId,
            manualQuery,
            roleTerms,
            locationTerms
        });
        if (plan?.query) return plan;
    }
    const parts = [];
    if (roleTerms.length === 1) {
        parts.push(roleTerms[0]);
    } else if (roleTerms.length > 1) {
        parts.push(roleTerms.join(' OR '));
    }
    const location = document.getElementById(
        'jobsLocationInput'
    )?.value.trim();
    if (location) parts.push(location);
    return {
        query: parts.join(' ').trim(),
        filterSpec: {},
        defaults: {},
        meta: normalizeTemplateMeta({}, 'jobs'),
        diagnostics: {}
    };
}

function buildJobsQuery() {
    return buildJobsSearchPlan().query;
}

function buildJobsProfilePayload() {
    return {
        fullName: document.getElementById(
            'jobsProfileFullNameInput'
        )?.value.trim(),
        email: document.getElementById(
            'jobsProfileEmailInput'
        )?.value.trim(),
        phone: document.getElementById(
            'jobsProfilePhoneInput'
        )?.value.trim(),
        city: document.getElementById(
            'jobsProfileCityInput'
        )?.value.trim(),
        currentTitle: document.getElementById(
            'jobsProfileHeadlineInput'
        )?.value.trim(),
        portfolioUrl: document.getElementById(
            'jobsProfilePortfolioInput'
        )?.value.trim(),
        resumeSummary: document.getElementById(
            'jobsProfileSummaryInput'
        )?.value.trim()
    };
}

function fillJobsProfileFields(profile) {
    if (!profile || typeof profile !== 'object') return;
    const mapping = {
        jobsProfileFullNameInput: profile.fullName,
        jobsProfileEmailInput: profile.email,
        jobsProfilePhoneInput: profile.phone,
        jobsProfileCityInput: profile.city || profile.location,
        jobsProfileHeadlineInput:
            profile.currentTitle || profile.headline,
        jobsProfilePortfolioInput:
            profile.portfolioUrl || profile.website,
        jobsProfileSummaryInput: profile.resumeSummary
    };
    for (const [id, value] of Object.entries(mapping)) {
        const input = document.getElementById(id);
        if (!input || !value) continue;
        input.value = String(value);
    }
}

function refreshJobsCacheStatus() {
    const statusEl = document.getElementById(
        'jobsCacheStatus'
    );
    if (!statusEl) return;
    chrome.runtime.sendMessage(
        { action: 'getJobsProfileCacheStatus' },
        (response) => {
            if (chrome.runtime.lastError || !response) {
                statusEl.textContent =
                    'Encrypted cache status unavailable.';
                return;
            }
            if (!response.exists) {
                statusEl.textContent =
                    'Encrypted cache: not configured.';
                return;
            }
            const updated = response.updatedAt
                ? new Date(response.updatedAt).toLocaleString()
                : 'unknown date';
            statusEl.textContent =
                `Encrypted cache: locked (v${response.version || 1}) · ` +
                `updated ${updated}`;
        }
    );
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
        goalMode: document.getElementById('goalMode').value,
        areaPreset: getSelectedAreaPreset(),
        connectUsageGoal: getConnectUsageGoal(),
        connectExpectedResults: getConnectExpectedResults(),
        connectTemplateAuto: isConnectTemplateAuto(),
        connectTemplateId: getConnectTemplateId(),
        roleTermsLimit: getRoleTermsLimit(),
        excludedCompanies: document.getElementById(
            'excludedCompaniesInput'
        ).value.trim(),
        skipOpenToWorkRecruiters:
            document.getElementById(
                'skipOpenToWorkRecruitersCheckbox'
            ).checked,
        skipJobSeekingSignals:
            document.getElementById(
                'skipJobSeekingSignalsCheckbox'
            ).checked,
        limit: document.getElementById('limitInput').value,
        region: document.getElementById('regionSelect').value,
        activelyHiring: document.getElementById('activelyHiringCheckbox').checked,
        engagementOnly: document.getElementById('engagementOnlyCheckbox').checked,
        degree2nd: document.getElementById('degree2nd').checked,
        degree3rd: document.getElementById('degree3rd').checked,
        sendNote: document.getElementById('sendNoteCheckbox').checked,
        activeTemplate: document.querySelector(
            '.template-card.active'
        )?.dataset.template || DEFAULT_TEMPLATE_KEY,
        customNote: TEMPLATES.custom,
        customQuery: document.getElementById('customQueryInput').value,
        useCustomQuery,
        scheduleEnabled: document.getElementById(
            'scheduleCheckbox').checked,
        scheduleInterval: document.getElementById(
            'scheduleInterval').value,
        savedQueries: document.getElementById(
            'savedQueries').value,
        companyAreaPreset: getSelectedCompanyAreaPreset(),
        companyUsageGoal: getCompanyUsageGoal(),
        companyExpectedResults: getCompanyExpectedResults(),
        companyTemplateAuto: isCompanyTemplateAuto(),
        companyTemplateId: getCompanyTemplateId(),
        companyQuery: document.getElementById(
            'companyQueryInput').value,
        targetCompanies: document.getElementById(
            'targetCompanies').value,
        jobsAreaPreset: getSelectedJobsAreaPreset(),
        jobsUsageGoal: getJobsUsageGoal(),
        jobsExpectedResults: getJobsExpectedResults(),
        jobsTemplateAuto: isJobsTemplateAuto(),
        jobsTemplateId: getJobsTemplateId(),
        jobsQuery: document.getElementById(
            'jobsQueryInput').value,
        jobsRoleTerms: document.getElementById(
            'jobsRoleTermsInput').value,
        jobsLocationTerms: document.getElementById(
            'jobsLocationTermsInput').value,
        jobsPreferredCompanies: document.getElementById(
            'jobsPreferredCompaniesInput').value,
        jobsExcludedCompanies: document.getElementById(
            'jobsExcludedCompaniesInput').value,
        jobsExperienceLevel: document.getElementById(
            'jobsExperienceLevelSelect').value,
        jobsWorkType: document.getElementById(
            'jobsWorkTypeSelect').value,
        jobsLocation: document.getElementById(
            'jobsLocationInput').value,
        jobsEasyApplyOnly: document.getElementById(
            'jobsEasyApplyOnlyCheckbox').checked,
        feedReact: document.getElementById(
            'feedReactCheckbox').checked,
        feedComment: document.getElementById(
            'feedCommentCheckbox').checked,
        feedWarmupEnabled: document.getElementById(
            'feedWarmupEnabledCheckbox'
        ).checked,
        feedWarmupRunsRequired: getFeedWarmupRunsRequired(),
        aiApiKey: document.getElementById(
            'aiApiKeyInput').value,
        commentTemplates: document.getElementById(
            'commentTemplatesInput').value,
        skipKeywords: document.getElementById(
            'skipKeywordsInput').value,
        companyScheduleEnabled: document.getElementById(
            'companyScheduleCheckbox').checked,
        companyScheduleInterval: document.getElementById(
            'companyScheduleInterval').value,
        companyBatchSize: document.getElementById(
            'companyBatchSize').value,
        feedScheduleEnabled: document.getElementById(
            'feedScheduleCheckbox').checked,
        feedScheduleInterval: document.getElementById(
            'feedScheduleInterval').value,
        smartMode: document.getElementById(
            'smartModeCheckbox').checked,
        nurtureScheduleEnabled: document.getElementById(
            'nurtureScheduleCheckbox').checked,
        nurtureScheduleInterval: document.getElementById(
            'nurtureScheduleInterval').value,
        nurturePostLimit: document.getElementById(
            'nurturePostLimit').value
    };

    popupUiState = normalizePopupUi(popupUiState);
    popupUiState.tagSearch = document.getElementById(
        'tagSearchInput'
    )?.value || '';
    state.ui = popupUiState;

    state.tagVersion = typeof STATE_TAG_VERSION === 'number'
        ? STATE_TAG_VERSION
        : 5;
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
    chrome.storage.local.get('groqApiKey', (data) => {
        if (data.groqApiKey) {
            document.getElementById('aiApiKeyInput')
                .value = data.groqApiKey;
        }
    });
    chrome.storage.local.get('popupState', ({ popupState }) => {
        if (!popupState) {
            popupUiState = normalizePopupUi();
            setAreaPresetSelectValue(DEFAULT_AREA_PRESET);
            setCompanyAreaPresetSelectValue(
                DEFAULT_COMPANY_AREA_PRESET
            );
            setJobsAreaPresetSelectValue(
                DEFAULT_JOBS_AREA_PRESET
            );
            setSelectValue(
                'connectUsageGoalSelect',
                DEFAULT_CONNECT_USAGE_GOAL,
                DEFAULT_CONNECT_USAGE_GOAL
            );
            setSelectValue(
                'connectExpectedResultsSelect',
                DEFAULT_EXPECTED_RESULTS,
                DEFAULT_EXPECTED_RESULTS
            );
            setSelectValue(
                'companyUsageGoalSelect',
                DEFAULT_COMPANY_USAGE_GOAL,
                DEFAULT_COMPANY_USAGE_GOAL
            );
            setSelectValue(
                'companyExpectedResultsSelect',
                DEFAULT_EXPECTED_RESULTS,
                DEFAULT_EXPECTED_RESULTS
            );
            setSelectValue(
                'jobsUsageGoalSelect',
                DEFAULT_JOBS_USAGE_GOAL,
                DEFAULT_JOBS_USAGE_GOAL
            );
            setSelectValue(
                'jobsExpectedResultsSelect',
                DEFAULT_EXPECTED_RESULTS,
                DEFAULT_EXPECTED_RESULTS
            );
            refreshTemplatesForArea();
            refreshTemplateControls();
            setActiveTemplate(DEFAULT_TEMPLATE_KEY);
            updateQueryPreview();
            updateCharCounter();
            renderAccordions();
            applyTagSearchFilter();
            updateRefineSelectedCount();
            syncFeedCommentSettingsVisibility();
            refreshFeedWarmupProgress();
            refreshJobsCacheStatus();
            return;
        }

        let migratedState = popupState;
        if (typeof migrateConnectPopupState === 'function') {
            const migration = migrateConnectPopupState(popupState);
            migratedState = migration.state;
            if (migration.changed) {
                chrome.storage.local.set({ popupState: migratedState });
            }
        }
        popupState = migratedState;
        popupUiState = normalizePopupUi(popupState.ui);

        const TAG_VERSION = typeof STATE_TAG_VERSION === 'number'
            ? STATE_TAG_VERSION
            : 5;
        if (popupState.tags &&
            popupState.tagVersion === TAG_VERSION) {
            document.querySelectorAll('.tag').forEach(tag => {
                const group = tag.dataset.group;
                const vals = popupState.tags[group] || [];
                tag.classList.toggle(
                    'active', vals.includes(tag.dataset.value)
                );
            });
        }

        setAreaPresetSelectValue(popupState.areaPreset || 'custom');
        setSelectValue(
            'connectUsageGoalSelect',
            popupState.connectUsageGoal ||
                DEFAULT_CONNECT_USAGE_GOAL,
            DEFAULT_CONNECT_USAGE_GOAL
        );
        setSelectValue(
            'connectExpectedResultsSelect',
            popupState.connectExpectedResults ||
                DEFAULT_EXPECTED_RESULTS,
            DEFAULT_EXPECTED_RESULTS
        );
        document.getElementById('connectTemplateAutoCheckbox')
            .checked = popupState.connectTemplateAuto !== false;
        refreshTemplatesForArea();
        refreshTemplateControls();
        if (popupState.connectTemplateId) {
            setSelectValue(
                'connectTemplateSelect',
                popupState.connectTemplateId,
                ''
            );
        }
        if (getSelectedAreaPreset() !== 'custom' &&
            !hasActiveTags('role') &&
            !hasActiveTags('industry')) {
            applyAreaPreset(getSelectedAreaPreset(), false);
        }

        if (popupState.limit) {
            document.getElementById('limitInput').value = popupState.limit;
        }
        if (popupState.goalMode) {
            document.getElementById('goalMode').value =
                popupState.goalMode;
        }
        if (popupState.roleTermsLimit) {
            document.getElementById(
                'roleTermsLimitInput'
            ).value = popupState.roleTermsLimit;
        }
        if (popupState.excludedCompanies) {
            document.getElementById(
                'excludedCompaniesInput'
            ).value = popupState.excludedCompanies;
        }
        if (popupState.skipOpenToWorkRecruiters !==
            undefined) {
            document.getElementById(
                'skipOpenToWorkRecruitersCheckbox'
            ).checked = popupState.skipOpenToWorkRecruiters;
        }
        if (popupState.skipJobSeekingSignals !==
            undefined) {
            document.getElementById(
                'skipJobSeekingSignalsCheckbox'
            ).checked = popupState.skipJobSeekingSignals;
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
        if (popupState.smartMode) {
            document.getElementById(
                'smartModeCheckbox').checked = true;
        }
        if (popupState.useCustomQuery) {
            useCustomQuery = true;
            document.getElementById('customQueryInput').style.display = 'block';
            document.getElementById('toggleCustomQuery').textContent =
                'Use tag builder';
            document.querySelectorAll('.tag-group').forEach(
                g => g.style.opacity = '0.4'
            );
            document.getElementById('areaPresetSelect').disabled = true;
            document.getElementById('areaPresetSelect').style.opacity = '0.4';
        }

        document.getElementById('tagSearchInput').value =
            popupUiState.tagSearch || '';
        applyTagSearchFilter();
        renderAccordions();
        updateRefineSelectedCount();

        if (popupState.companyQuery) {
            document.getElementById('companyQueryInput').value =
                popupState.companyQuery;
        }
        setCompanyAreaPresetSelectValue(
            popupState.companyAreaPreset || 'custom'
        );
        setSelectValue(
            'companyUsageGoalSelect',
            popupState.companyUsageGoal ||
                DEFAULT_COMPANY_USAGE_GOAL,
            DEFAULT_COMPANY_USAGE_GOAL
        );
        setSelectValue(
            'companyExpectedResultsSelect',
            popupState.companyExpectedResults ||
                DEFAULT_EXPECTED_RESULTS,
            DEFAULT_EXPECTED_RESULTS
        );
        document.getElementById('companyTemplateAutoCheckbox')
            .checked = popupState.companyTemplateAuto !== false;
        refreshTemplateControls();
        if (popupState.companyTemplateId) {
            setSelectValue(
                'companyTemplateSelect',
                popupState.companyTemplateId,
                ''
            );
        }
        if (popupState.targetCompanies) {
            document.getElementById('targetCompanies').value =
                popupState.targetCompanies;
        }
        setJobsAreaPresetSelectValue(
            popupState.jobsAreaPreset || DEFAULT_JOBS_AREA_PRESET
        );
        setSelectValue(
            'jobsUsageGoalSelect',
            popupState.jobsUsageGoal ||
                DEFAULT_JOBS_USAGE_GOAL,
            DEFAULT_JOBS_USAGE_GOAL
        );
        setSelectValue(
            'jobsExpectedResultsSelect',
            popupState.jobsExpectedResults ||
                DEFAULT_EXPECTED_RESULTS,
            DEFAULT_EXPECTED_RESULTS
        );
        document.getElementById('jobsTemplateAutoCheckbox')
            .checked = popupState.jobsTemplateAuto !== false;
        refreshTemplateControls();
        if (popupState.jobsTemplateId) {
            setSelectValue(
                'jobsTemplateSelect',
                popupState.jobsTemplateId,
                ''
            );
        }
        if (popupState.jobsQuery) {
            document.getElementById('jobsQueryInput').value =
                popupState.jobsQuery;
        }
        if (popupState.jobsRoleTerms) {
            document.getElementById('jobsRoleTermsInput').value =
                popupState.jobsRoleTerms;
        }
        if (popupState.jobsLocationTerms) {
            document.getElementById('jobsLocationTermsInput').value =
                popupState.jobsLocationTerms;
        }
        if (popupState.jobsPreferredCompanies) {
            document.getElementById(
                'jobsPreferredCompaniesInput'
            ).value = popupState.jobsPreferredCompanies;
        }
        if (popupState.jobsExcludedCompanies) {
            document.getElementById(
                'jobsExcludedCompaniesInput'
            ).value = popupState.jobsExcludedCompanies;
        }
        if (popupState.jobsExperienceLevel) {
            document.getElementById(
                'jobsExperienceLevelSelect'
            ).value = popupState.jobsExperienceLevel;
        }
        if (popupState.jobsWorkType) {
            document.getElementById(
                'jobsWorkTypeSelect'
            ).value = popupState.jobsWorkType;
        }
        if (popupState.jobsLocation) {
            document.getElementById(
                'jobsLocationInput'
            ).value = popupState.jobsLocation;
        }
        if (popupState.jobsEasyApplyOnly !== undefined) {
            document.getElementById(
                'jobsEasyApplyOnlyCheckbox'
            ).checked = popupState.jobsEasyApplyOnly !== false;
        }
        if (popupState.feedReact !== undefined) {
            document.getElementById('feedReactCheckbox').checked =
                popupState.feedReact;
        }
        if (popupState.feedComment) {
            document.getElementById('feedCommentCheckbox').checked =
                true;
        }
        syncFeedCommentSettingsVisibility();
        if (popupState.feedWarmupEnabled !== undefined) {
            document.getElementById(
                'feedWarmupEnabledCheckbox'
            ).checked = popupState.feedWarmupEnabled;
        }
        if (popupState.feedWarmupRunsRequired !== undefined) {
            document.getElementById(
                'feedWarmupRunsRequiredInput'
            ).value = String(
                Math.max(
                    0,
                    Math.min(
                        10,
                        parseInt(
                            popupState.feedWarmupRunsRequired,
                            10
                        ) || 0
                    )
                )
            );
        }
        if (popupState.aiApiKey &&
            !document.getElementById('aiApiKeyInput')
                .value) {
            document.getElementById('aiApiKeyInput')
                .value = popupState.aiApiKey;
            chrome.storage.local.set({
                groqApiKey: popupState.aiApiKey
            });
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
        if (popupState.feedScheduleEnabled) {
            document.getElementById(
                'feedScheduleCheckbox'
            ).checked = true;
            document.getElementById(
                'feedScheduleOptions'
            ).style.display = 'block';
        }
        if (popupState.feedScheduleInterval) {
            document.getElementById(
                'feedScheduleInterval'
            ).value = popupState.feedScheduleInterval;
        }
        if (popupState.nurtureScheduleEnabled) {
            document.getElementById(
                'nurtureScheduleCheckbox'
            ).checked = true;
            document.getElementById(
                'nurtureScheduleOptions'
            ).style.display = 'block';
        }
        if (popupState.nurtureScheduleInterval) {
            document.getElementById(
                'nurtureScheduleInterval'
            ).value = popupState.nurtureScheduleInterval;
        }
        if (popupState.nurturePostLimit) {
            document.getElementById(
                'nurturePostLimit'
            ).value = popupState.nurturePostLimit;
        }

        setActiveTemplate(popupState.activeTemplate || DEFAULT_TEMPLATE_KEY);
        updateQueryPreview();
        updateCharCounter();

        if (popupState.currentMode) {
            setMode(popupState.currentMode);
        }
        refreshFeedWarmupProgress();
        refreshJobsCacheStatus();
    });
}

// --- EVENT LISTENERS ---

document.querySelectorAll('.tag').forEach(tag => {
    tag.addEventListener('click', () => {
        if (useCustomQuery) return;
        tag.classList.toggle('active');
        const group = tag.dataset.group;
        const shouldResetPreset = typeof
            shouldResetAreaPresetOnManualTag === 'function'
            ? shouldResetAreaPresetOnManualTag(group)
            : (group === 'role' || group === 'industry');
        if (shouldResetPreset &&
            getSelectedAreaPreset() !== 'custom') {
            setAreaPresetSelectValue('custom');
            refreshTemplatesForArea();
            const activeTemplate = document.querySelector(
                '.template-card.active'
            )?.dataset.template || DEFAULT_TEMPLATE_KEY;
            if (activeTemplate !== 'custom') {
                setActiveTemplate(activeTemplate);
            }
        }
        updateQueryPreview();
        updateRefineSelectedCount();
        saveState();
    });
});

document.getElementById('areaPresetSelect').addEventListener(
    'change',
    (e) => applyAreaPreset(e.target.value, true)
);

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
        document.getElementById('areaPresetSelect').disabled = true;
        document.getElementById('areaPresetSelect').style.opacity = '0.4';
    } else {
        input.style.display = 'none';
        toggle.textContent = 'Edit query manually';
        document.querySelectorAll('.tag-group').forEach(
            g => g.style.opacity = '1'
        );
        document.getElementById('areaPresetSelect').disabled = false;
        document.getElementById('areaPresetSelect').style.opacity = '1';
    }

    updateQueryPreview();
    saveState();
});

document.getElementById('customQueryInput').addEventListener('input', () => {
    updateQueryPreview();
    saveState();
});

document.getElementById('tagSearchInput').addEventListener(
    'input',
    () => {
        applyTagSearchFilter();
        saveState();
    }
);

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
document.getElementById('goalMode').addEventListener('change', saveState);
document.getElementById('connectUsageGoalSelect').addEventListener(
    'change',
    () => {
        refreshTemplateControls();
        updateQueryPreview();
        saveState();
    }
);
document.getElementById('connectExpectedResultsSelect').addEventListener(
    'change',
    () => {
        refreshTemplateControls();
        updateQueryPreview();
        saveState();
    }
);
document.getElementById('connectTemplateAutoCheckbox').addEventListener(
    'change',
    () => {
        refreshTemplateControls();
        updateQueryPreview();
        saveState();
    }
);
document.getElementById('connectTemplateSelect').addEventListener(
    'change',
    () => {
        updateQueryPreview();
        saveState();
    }
);
document.getElementById(
    'roleTermsLimitInput'
).addEventListener('change', () => {
    const input = document.getElementById('roleTermsLimitInput');
    input.value = String(getRoleTermsLimit());
    updateQueryPreview();
    saveState();
});
document.getElementById('excludedCompaniesInput').addEventListener(
    'input', saveState
);
document.getElementById(
    'skipOpenToWorkRecruitersCheckbox'
).addEventListener('change', saveState);
document.getElementById(
    'skipJobSeekingSignalsCheckbox'
).addEventListener('change', saveState);

document.getElementById('scheduleCheckbox').addEventListener(
    'change', (e) => {
        const opts = document.getElementById('scheduleOptions');
        opts.style.display = e.target.checked ? 'block' : 'none';
        const hours = parseInt(
            document.getElementById('scheduleInterval').value
        ) || 24;
        const smart = document.getElementById(
            'smartModeCheckbox').checked;
        chrome.runtime.sendMessage({
            action: 'setSchedule',
            enabled: e.target.checked,
            intervalHours: hours,
            smartMode: smart
        });
        saveState();
        if (e.target.checked) fetchScheduleInsight();
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
        const smart = document.getElementById(
            'smartModeCheckbox').checked;
        chrome.runtime.sendMessage({
            action: 'setSchedule',
            enabled: true,
            intervalHours: hours,
            smartMode: smart
        });
        saveState();
    }
);

document.getElementById('smartModeCheckbox').addEventListener(
    'change', () => {
        const enabled = document.getElementById(
            'scheduleCheckbox').checked;
        if (!enabled) return;
        const hours = parseInt(
            document.getElementById('scheduleInterval').value
        ) || 24;
        const smart = document.getElementById(
            'smartModeCheckbox').checked;
        chrome.runtime.sendMessage({
            action: 'setSchedule',
            enabled: true,
            intervalHours: hours,
            smartMode: smart
        });
        saveState();
        if (smart) fetchScheduleInsight();
    }
);

function fetchScheduleInsight() {
    chrome.runtime.sendMessage(
        { action: 'getScheduleInsight' },
        (rec) => {
            if (chrome.runtime.lastError || !rec) return;
            const box = document.getElementById(
                'scheduleInsight');
            const text = document.getElementById(
                'insightText');
            if (!box || !text) return;

            const windows = (rec.windows || [])
                .map(w => `${w.start}:00-${w.end}:00 ` +
                    `(${w.label})`)
                .join(', ');
            const days = (rec.bestDays || []).join(', ');

            let msg = rec.recommended
                ? 'Now is a good time to run.'
                : rec.suggestion || 'Waiting for optimal window.';
            msg += ` Best windows: ${windows || 'default'}.`;
            msg += ` Top days: ${days || 'weekdays'}.`;

            text.textContent = msg;
            box.style.display = 'block';
        }
    );
}

document.getElementById('startBtn').addEventListener('click', async () => {
    if (currentMode === 'companies') {
        return startCompanyFollow();
    }
    if (currentMode === 'jobs') {
        return startJobsAssist();
    }
    if (currentMode === 'feed') {
        return startFeedEngage();
    }
    return startConnect();
});

async function startConnect() {
    const plan = buildConnectSearchPlan();
    const query = plan.query;
    if (!query) {
        setStatusMessage(
            'No query built. Select tags or write a custom query.',
            'warning'
        );
        return;
    }
    const templateMeta = normalizeTemplateMeta(
        plan.meta,
        'connect'
    );

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
    const activelyHiring = plan.filterSpec &&
        typeof plan.filterSpec.activelyHiring === 'boolean'
        ? plan.filterSpec.activelyHiring
        : document.getElementById(
            'activelyHiringCheckbox'
        ).checked;
    const goalMode =
        document.getElementById('goalMode').value || 'passive';
    const areaPreset = getSelectedAreaPreset();
    const excludedCompaniesRaw = document.getElementById(
        'excludedCompaniesInput'
    ).value;
    const excludedCompanies =
        typeof parseExcludedCompanies === 'function'
            ? parseExcludedCompanies(excludedCompaniesRaw)
            : excludedCompaniesRaw.split('\n')
                .map(s => s.trim())
                .filter(Boolean);
    const skipOpenToWorkRecruiters =
        document.getElementById(
            'skipOpenToWorkRecruitersCheckbox'
        ).checked;
    const skipJobSeekingSignals =
        document.getElementById(
            'skipJobSeekingSignalsCheckbox'
        ).checked;

    const networkTypes = [];
    const degree2nd = plan.filterSpec &&
        typeof plan.filterSpec.degree2nd === 'boolean'
        ? plan.filterSpec.degree2nd
        : document.getElementById('degree2nd').checked;
    const degree3rd = plan.filterSpec &&
        typeof plan.filterSpec.degree3rd === 'boolean'
        ? plan.filterSpec.degree3rd
        : document.getElementById('degree3rd').checked;
    if (degree2nd) {
        networkTypes.push('"S"');
    }
    if (degree3rd) {
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
        goalMode,
        areaPreset,
        excludedCompanies,
        skipOpenToWorkRecruiters,
        skipJobSeekingSignals,
        activelyHiring,
        networkFilter,
        templateMeta,
        sentUrls,
        engagementOnly
    }, handleLaunchResponse);
}

function startCompanyFollow() {
    const queryInput = document.getElementById(
        'companyQueryInput'
    );
    const plan = buildCompanySearchPlan();
    const companyAreaPreset = getSelectedCompanyAreaPreset();
    const targetCompanies = parseMultilineList(
        document.getElementById('targetCompanies').value
    );
    const resolvedQuery = String(plan.query || '').trim() ||
        getCompanyPresetDefaultQuery(companyAreaPreset);
    if (!queryInput.value.trim() && resolvedQuery) {
        queryInput.value = resolvedQuery;
    }

    if (!resolvedQuery && targetCompanies.length === 0) {
        setStatusMessage(
            'Enter a search query, select a company preset, or add target companies.',
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
        query: resolvedQuery,
        limit,
        companyAreaPreset,
        targetCompanies,
        companyUsageGoal: getCompanyUsageGoal(),
        companyExpectedResults: getCompanyExpectedResults(),
        companyTemplateAuto: isCompanyTemplateAuto(),
        companyTemplateId: getCompanyTemplateId(),
        templateMeta: normalizeTemplateMeta(
            plan.meta,
            'companies'
        )
    }, handleLaunchResponse);
}

function startJobsAssist() {
    const plan = buildJobsSearchPlan();
    const query = plan.query;
    if (!query) {
        setStatusMessage(
            'Enter a jobs query or select a preset with role terms.',
            'warning'
        );
        return;
    }

    const limit = parseInt(
        document.getElementById('limitInput').value
    ) || 10;
    const profilePassphrase = document.getElementById(
        'jobsProfilePassphraseInput'
    ).value;
    const jobsAreaPreset = getSelectedJobsAreaPreset();
    let roleTerms = getEffectiveJobsRoleTerms(parseMultilineList(
        document.getElementById('jobsRoleTermsInput').value
    ));

    const locationTerms = parseMultilineList(
        document.getElementById('jobsLocationTermsInput').value
    );
    const preferredCompaniesInput = parseMultilineList(
        document.getElementById('jobsPreferredCompaniesInput').value
    );
    const excludedCompaniesInput = parseMultilineList(
        document.getElementById('jobsExcludedCompaniesInput').value
    );
    const preferredCompanies = preferredCompaniesInput.length > 0
        ? preferredCompaniesInput
        : Array.isArray(plan.defaults?.preferredCompanies)
            ? plan.defaults.preferredCompanies
            : [];
    const excludedCompanies = excludedCompaniesInput.length > 0
        ? excludedCompaniesInput
        : Array.isArray(plan.defaults?.excludedCompanies)
            ? plan.defaults.excludedCompanies
            : [];
    const experienceLevelInput = document.getElementById(
        'jobsExperienceLevelSelect'
    ).value;
    const experienceLevel = plan.filterSpec &&
        typeof plan.filterSpec.experienceLevel === 'string'
        ? plan.filterSpec.experienceLevel
        : experienceLevelInput;
    const desiredLevels = [];
    if (experienceLevel === '1') desiredLevels.push('intern');
    if (experienceLevel === '2') desiredLevels.push('junior');
    if (experienceLevel === '3') desiredLevels.push('mid');
    if (experienceLevel === '4') desiredLevels.push('senior');
    if (experienceLevel === '5' || experienceLevel === '6') {
        desiredLevels.push('lead');
    }

    const location = document.getElementById(
        'jobsLocationInput'
    ).value.trim();
    const workTypeInput = document.getElementById(
        'jobsWorkTypeSelect'
    ).value;
    const workType = plan.filterSpec &&
        typeof plan.filterSpec.workType === 'string'
        ? plan.filterSpec.workType
        : workTypeInput;
    const easyApplyOnlyInput = document.getElementById(
        'jobsEasyApplyOnlyCheckbox'
    ).checked;
    const easyApplyOnly = plan.filterSpec &&
        typeof plan.filterSpec.easyApplyOnly === 'boolean'
        ? plan.filterSpec.easyApplyOnly
        : easyApplyOnlyInput;

    lastReportedSent = 0;
    showProgressUI('Prepared', limit, 'Opening LinkedIn Jobs...');
    chrome.runtime.sendMessage({
        action: 'startJobsAssist',
        query,
        limit,
        areaPreset: jobsAreaPreset,
        roleTerms,
        locationTerms,
        preferredCompanies,
        excludedCompanies,
        desiredLevels,
        experienceLevel,
        location,
        workType,
        easyApplyOnly,
        profilePassphrase,
        jobsUsageGoal: getJobsUsageGoal(),
        jobsExpectedResults: getJobsExpectedResults(),
        jobsTemplateAuto: isJobsTemplateAuto(),
        jobsTemplateId: getJobsTemplateId(),
        templateMeta: normalizeTemplateMeta(
            plan.meta,
            'jobs'
        )
    }, handleLaunchResponse);
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
    const feedWarmupEnabled = document.getElementById(
        'feedWarmupEnabledCheckbox'
    ).checked;
    const feedWarmupRunsRequired =
        getFeedWarmupRunsRequired();
    const aiApiKey = document.getElementById(
        'aiApiKeyInput'
    ).value.trim();
    const goalMode =
        document.getElementById('goalMode').value || 'passive';

    chrome.runtime.sendMessage({
        action: 'getFeedWarmupProgress',
        feedWarmupEnabled,
        feedWarmupRunsRequired
    }, (warmupProgress) => {
        const warmupActive =
            warmupProgress?.warmupActive === true;
        if (!react && !comment && !warmupActive) {
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
            warmupActive
                ? 'Warmup mode: reacting + learning...'
                : 'Navigating to feed...'
        );

        chrome.runtime.sendMessage({
            action: 'startFeedEngage',
            limit,
            react,
            comment,
            goalMode,
            commentTemplates,
            skipKeywords,
            aiApiKey,
            feedWarmupEnabled,
            feedWarmupRunsRequired
        }, handleLaunchResponse);
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

function resetProgressUI() {
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    startBtn.style.display = 'flex';
    startBtn.disabled = false;
    stopBtn.style.display = 'none';
    document.getElementById('progressBox')
        .style.display = 'none';
}

function handleLaunchResponse(response) {
    if (chrome.runtime.lastError) {
        resetProgressUI();
        setStatusMessage(
            'Failed to start: ' +
            chrome.runtime.lastError.message,
            'error'
        );
        return;
    }
    if (response?.status === 'blocked') {
        resetProgressUI();
        const reasons = {
            hourly: 'Hourly rate limit reached. Try again in ~1 hour.',
            daily: 'Daily rate limit reached. Try again tomorrow.',
            weekly: 'Weekly limit reached (150). Try next week.',
            'profile-cache-locked':
                'Encrypted profile cache is locked. Enter the passphrase for this session.'
        };
        setStatusMessage(
            reasons[response.reason] ||
            'Rate limit reached. Try again later.',
            'error'
        );
        return;
    }
    if (response?.status === 'started' &&
        response.warmupActive) {
        setStatusMessage(
            `Warmup run ${response.currentRunNumber}/` +
            `${response.requiredRuns}: reactions + learning, no comments.`,
            'info'
        );
    }
    if (response?.status === 'started' &&
        currentMode === 'feed') {
        refreshFeedWarmupProgress();
    }
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

function deriveDoneRunStatus(response) {
    const source = response && typeof response === 'object'
        ? response
        : {};
    const direct = String(source.runStatus || '').toLowerCase();
    if (direct === 'success' || direct === 'failed' ||
        direct === 'canceled') {
        return direct;
    }
    const text = String(
        source.error || source.message || source.reason || ''
    ).toLowerCase();
    if (source.stoppedByUser === true ||
        /stopped by user|canceled by user|cancelled by user/.test(text)) {
        return 'canceled';
    }
    const processed = Number(
        source.processedCount ?? source.processedPosts
    ) || 0;
    if (String(source.error || '').trim()) {
        return 'failed';
    }
    if (processed <= 0) {
        return 'failed';
    }
    return source.success === false ? 'failed' : 'success';
}

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
            jobs: 'Prepared',
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

        if (response?.log?.length && response?.mode !== 'jobs') {
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

        const runStatus = deriveDoneRunStatus(response);
        if (runStatus === 'success') {
            setStatusMessage(
                'Success! ' + (response.message || ''),
                'success'
            );
            startBtn.textContent = 'Done!';
        } else if (runStatus === 'canceled') {
            setStatusMessage(
                response?.message || 'Run canceled by user.',
                'warning'
            );
            startBtn.disabled = false;
            startBtn.textContent = 'Start Again';
        } else {
            setStatusMessage(
                'Error: ' +
                (response?.error ||
                    response?.message ||
                    'No items processed.'),
                'error'
            );
            startBtn.disabled = false;
            startBtn.textContent = 'Try Again';
        }
        if (response?.mode === 'feed') {
            refreshFeedWarmupProgress();
        }
        if (response?.mode === 'jobs') {
            refreshJobsCacheStatus();
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
    document.getElementById('jobsSection')
        .style.display = mode === 'jobs' ? 'block' : 'none';
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
        jobs: 'Assist Job Apply',
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
    if (mode === 'feed') {
        refreshFeedWarmupProgress();
    }
    if (mode === 'jobs') {
        refreshJobsCacheStatus();
    }
    if (typeof loadRateLimitStatus === 'function') {
        loadRateLimitStatus();
    }
}

document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        setMode(btn.dataset.mode);
    });
});

document.getElementById('feedCommentCheckbox')
    .addEventListener('change', (e) => {
        syncFeedCommentSettingsVisibility();
        saveState();
    });

document.getElementById('feedReactCheckbox')
    .addEventListener('change', saveState);
document.getElementById('feedWarmupEnabledCheckbox')
    .addEventListener('change', () => {
        saveState();
        refreshFeedWarmupProgress();
    });
document.getElementById('feedWarmupRunsRequiredInput')
    .addEventListener('change', () => {
        const input = document.getElementById(
            'feedWarmupRunsRequiredInput'
        );
        input.value = String(getFeedWarmupRunsRequired());
        saveState();
        refreshFeedWarmupProgress();
    });
document.getElementById('resetFeedWarmupProgressBtn')
    .addEventListener('click', () => {
        chrome.runtime.sendMessage({
            action: 'resetFeedWarmupProgress',
            feedWarmupEnabled: document.getElementById(
                'feedWarmupEnabledCheckbox'
            ).checked,
            feedWarmupRunsRequired:
                getFeedWarmupRunsRequired()
        }, (response) => {
            if (chrome.runtime.lastError ||
                response?.status !== 'ok') {
                setStatusMessage(
                    'Failed to reset warmup progress.',
                    'error'
                );
                return;
            }
            renderFeedWarmupProgress(response);
            setStatusMessage(
                'Warmup learning progress reset.',
                'success'
            );
            saveState();
        });
    });
document.getElementById('aiApiKeyInput')
    .addEventListener('change', () => {
        const key = document.getElementById(
            'aiApiKeyInput').value.trim();
        chrome.storage.local.set({ groqApiKey: key });
        saveState();
    });
document.getElementById('companyAreaPresetSelect')
    .addEventListener('change', () => {
        const preset = getSelectedCompanyAreaPreset();
        const queryInput = document.getElementById(
            'companyQueryInput'
        );
        if (!queryInput.value.trim()) {
            const defaultQuery = getCompanyPresetDefaultQuery(
                preset
            );
            if (defaultQuery) {
                queryInput.value = defaultQuery;
            }
        }
        refreshTemplateControls();
        saveState();
    });
document.getElementById('companyUsageGoalSelect')
    .addEventListener('change', () => {
        refreshTemplateControls();
        saveState();
    });
document.getElementById('companyExpectedResultsSelect')
    .addEventListener('change', () => {
        refreshTemplateControls();
        saveState();
    });
document.getElementById('companyTemplateAutoCheckbox')
    .addEventListener('change', () => {
        refreshTemplateControls();
        saveState();
    });
document.getElementById('companyTemplateSelect')
    .addEventListener('change', saveState);
document.getElementById('jobsAreaPresetSelect')
    .addEventListener('change', () => {
        const preset = getSelectedJobsAreaPreset();
        const queryInput = document.getElementById(
            'jobsQueryInput'
        );
        const roleTermsInput = document.getElementById(
            'jobsRoleTermsInput'
        );
        if (!roleTermsInput.value.trim()) {
            const defaults = getJobsPresetTerms(preset).role;
            if (defaults.length > 0) {
                roleTermsInput.value = defaults.join('\n');
            }
        }
        if (!queryInput.value.trim()) {
            queryInput.value = buildJobsQuery();
        }
        refreshTemplateControls();
        saveState();
    });
document.getElementById('jobsUsageGoalSelect')
    .addEventListener('change', () => {
        refreshTemplateControls();
        saveState();
    });
document.getElementById('jobsExpectedResultsSelect')
    .addEventListener('change', () => {
        refreshTemplateControls();
        saveState();
    });
document.getElementById('jobsTemplateAutoCheckbox')
    .addEventListener('change', () => {
        refreshTemplateControls();
        saveState();
    });
document.getElementById('jobsTemplateSelect')
    .addEventListener('change', saveState);
document.getElementById('jobsQueryInput')
    .addEventListener('input', saveState);
document.getElementById('jobsRoleTermsInput')
    .addEventListener('input', saveState);
document.getElementById('jobsLocationTermsInput')
    .addEventListener('input', saveState);
document.getElementById('jobsPreferredCompaniesInput')
    .addEventListener('input', saveState);
document.getElementById('jobsExcludedCompaniesInput')
    .addEventListener('input', saveState);
document.getElementById('jobsExperienceLevelSelect')
    .addEventListener('change', saveState);
document.getElementById('jobsWorkTypeSelect')
    .addEventListener('change', saveState);
document.getElementById('jobsLocationInput')
    .addEventListener('input', saveState);
document.getElementById('jobsEasyApplyOnlyCheckbox')
    .addEventListener('change', saveState);
document.getElementById('jobsProfileFullNameInput')
    .addEventListener('input', saveState);
document.getElementById('jobsProfileEmailInput')
    .addEventListener('input', saveState);
document.getElementById('jobsProfilePhoneInput')
    .addEventListener('input', saveState);
document.getElementById('jobsProfileCityInput')
    .addEventListener('input', saveState);
document.getElementById('jobsProfileHeadlineInput')
    .addEventListener('input', saveState);
document.getElementById('jobsProfilePortfolioInput')
    .addEventListener('input', saveState);
document.getElementById('jobsProfileSummaryInput')
    .addEventListener('input', saveState);
document.getElementById('saveJobsProfileCacheBtn')
    .addEventListener('click', () => {
        const passphrase = document.getElementById(
            'jobsProfilePassphraseInput'
        ).value;
        if (!passphrase || passphrase.trim().length < 4) {
            setStatusMessage(
                'Enter a session passphrase with at least 4 characters.',
                'warning'
            );
            return;
        }
        const profile = buildJobsProfilePayload();
        chrome.runtime.sendMessage({
            action: 'saveJobsProfileCache',
            profile,
            profilePassphrase: passphrase
        }, (response) => {
            if (chrome.runtime.lastError ||
                response?.status !== 'saved') {
                setStatusMessage(
                    response?.error ||
                        'Failed to save encrypted jobs cache.',
                    'error'
                );
                return;
            }
            setStatusMessage(
                'Encrypted jobs profile cache saved.',
                'success'
            );
            refreshJobsCacheStatus();
            saveState();
        });
    });
document.getElementById('clearJobsProfileCacheBtn')
    .addEventListener('click', () => {
        chrome.runtime.sendMessage({
            action: 'clearJobsProfileCache'
        }, (response) => {
            if (chrome.runtime.lastError ||
                response?.status !== 'cleared') {
                setStatusMessage(
                    'Failed to clear jobs profile cache.',
                    'error'
                );
                return;
            }
            setStatusMessage(
                'Encrypted jobs profile cache cleared.',
                'success'
            );
            refreshJobsCacheStatus();
        });
    });
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
        const preset = getSelectedCompanyAreaPreset();
        const presetTargets =
            getCompanyPresetDefaultTargets(preset);
        const targetValue = preset !== 'custom' &&
            presetTargets.length > 0
            ? presetTargets.join('\n')
            : DEFAULT_LATAM_COMPANIES;
        document.getElementById('targetCompanies')
            .value = targetValue;
        const queryInput = document.getElementById(
            'companyQueryInput');
        if (!queryInput.value.trim()) {
            const defaultQuery = getCompanyPresetDefaultQuery(
                preset
            );
            queryInput.value = defaultQuery ||
                'software technology';
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

document.getElementById('feedScheduleCheckbox')
    .addEventListener('change', (e) => {
        const opts = document.getElementById(
            'feedScheduleOptions'
        );
        opts.style.display = e.target.checked
            ? 'block' : 'none';
        const hours = parseInt(
            document.getElementById(
                'feedScheduleInterval'
            ).value
        ) || 12;
        chrome.runtime.sendMessage({
            action: 'setFeedSchedule',
            enabled: e.target.checked,
            intervalHours: hours
        });
        saveState();
    });

document.getElementById('feedScheduleInterval')
    .addEventListener('change', () => {
        const enabled = document.getElementById(
            'feedScheduleCheckbox'
        ).checked;
        if (!enabled) return;
        const hours = parseInt(
            document.getElementById(
                'feedScheduleInterval'
            ).value
        ) || 12;
        chrome.runtime.sendMessage({
            action: 'setFeedSchedule',
            enabled: true,
            intervalHours: hours
        });
        saveState();
    });

document.getElementById('nurtureScheduleCheckbox')
    .addEventListener('change', (e) => {
        const opts = document.getElementById(
            'nurtureScheduleOptions'
        );
        opts.style.display = e.target.checked
            ? 'block' : 'none';
        const hours = parseInt(
            document.getElementById(
                'nurtureScheduleInterval'
            ).value
        ) || 8;
        const limit = parseInt(
            document.getElementById(
                'nurturePostLimit'
            ).value
        ) || 3;
        chrome.runtime.sendMessage({
            action: 'setNurtureSchedule',
            enabled: e.target.checked,
            intervalHours: hours,
            limit
        });
        saveState();
        if (e.target.checked) loadNurtureStatus();
    });

document.getElementById('nurtureScheduleInterval')
    .addEventListener('change', () => {
        const enabled = document.getElementById(
            'nurtureScheduleCheckbox'
        ).checked;
        if (!enabled) return;
        const hours = parseInt(
            document.getElementById(
                'nurtureScheduleInterval'
            ).value
        ) || 8;
        const limit = parseInt(
            document.getElementById(
                'nurturePostLimit'
            ).value
        ) || 3;
        chrome.runtime.sendMessage({
            action: 'setNurtureSchedule',
            enabled: true,
            intervalHours: hours,
            limit
        });
        saveState();
    });

document.getElementById('nurturePostLimit')
    .addEventListener('change', () => {
        const enabled = document.getElementById(
            'nurtureScheduleCheckbox'
        ).checked;
        if (!enabled) return;
        const hours = parseInt(
            document.getElementById(
                'nurtureScheduleInterval'
            ).value
        ) || 8;
        const limit = parseInt(
            document.getElementById(
                'nurturePostLimit'
            ).value
        ) || 3;
        chrome.runtime.sendMessage({
            action: 'setNurtureSchedule',
            enabled: true,
            intervalHours: hours,
            limit
        });
        saveState();
    });

function loadNurtureStatus() {
    chrome.storage.local.get('nurtureList', (data) => {
        const list = data.nurtureList || [];
        const box = document.getElementById(
            'nurtureStatus');
        const text = document.getElementById(
            'nurtureStatusText');
        if (!box || !text) return;

        if (!list.length) {
            text.textContent =
                'No nurture targets yet. ' +
                'Connect with people to start nurturing.';
            box.style.display = 'block';
            return;
        }

        const now = new Date();
        const cutoff = new Date(
            now.getTime() - 7 * 86400000
        );
        const active = list.filter(e => {
            const added = new Date(e.addedAt);
            if (added < cutoff) return false;
            if (e.engagements >= 3) return false;
            if (e.lastEngaged) {
                const last = new Date(e.lastEngaged);
                if ((now - last) < 12 * 3600000) {
                    return false;
                }
            }
            return true;
        });

        text.textContent =
            `${list.length} total, ` +
            `${active.length} active targets ready.`;
        box.style.display = 'block';
    });
}

function loadRateLimitStatus() {
    const now = new Date();
    const h = now.getUTCHours();
    const d = now.toISOString().substring(0, 10);
    const mode = currentMode === 'companies'
        ? 'companyFollow'
        : currentMode === 'feed'
            ? 'feedEngage' : 'connect';
    const normalizedMode = currentMode === 'jobs'
        ? 'jobsAssist'
        : mode;
    const hKey = `rate_${normalizedMode}_${d}_${h}`;
    const dKey = `rate_${normalizedMode}_${d}`;

    const limits = {
        connect: { hourly: 12, daily: 40 },
        companyFollow: { hourly: 10, daily: 30 },
        feedEngage: { hourly: 15, daily: 50 },
        jobsAssist: { hourly: 8, daily: 20 }
    };
    const lim = limits[normalizedMode] || { hourly: 12, daily: 40 };

    chrome.storage.local.get([hKey, dKey], (data) => {
        const hourCount = data[hKey] || 0;
        const dayCount = data[dKey] || 0;
        const bar = document.getElementById(
            'rateLimitBar');
        const text = document.getElementById(
            'rateLimitText');
        if (!bar || !text) return;

        const hourLeft = Math.max(
            0, lim.hourly - hourCount);
        const dayLeft = Math.max(
            0, lim.daily - dayCount);

        text.textContent =
            `Rate limits: ${hourLeft}/${lim.hourly} ` +
            `this hour · ${dayLeft}/${lim.daily} today`;

        if (hourLeft === 0 || dayLeft === 0) {
            text.style.color = 'var(--warning)';
        } else {
            text.style.color = 'var(--text-muted)';
        }
        bar.style.display = 'block';
    });
}

initializeAccordionInteractions();
refreshTemplateControls();
loadState();
updateWeeklyDisplay();
loadRecentProfiles();
loadRateLimitStatus();

if (document.getElementById('scheduleCheckbox').checked &&
    document.getElementById('smartModeCheckbox').checked) {
    fetchScheduleInsight();
}
if (document.getElementById('nurtureScheduleCheckbox')
    .checked) {
    loadNurtureStatus();
}
