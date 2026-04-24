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
const DEFAULT_UI_LANGUAGE_MODE = 'auto';
const DEFAULT_SEARCH_LANGUAGE_MODE = 'auto';
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
            career: false,
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
    tagSearch: '',
    activeRoleArea: '',
    activeIndustryArea: ''
};
let useCustomQuery = false;
let popupUiState = DEFAULT_LOCAL_UI_STATE;
let jobsCacheLoadedThisSession = false;
let jobsCareerIntelLoadedThisSession = false;
let jobsCareerIntelStateThisSession = null;
let jobsManualResumePending = false;
let activeUiCatalog = {};
let fallbackUiCatalog = {};
let currentUiLocale = 'en';

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

const UI_LABEL_KEYS = Object.freeze({
    uiLanguageModeSelect: 'options.uiLanguage',
    companyAreaPresetSelect: 'popup.company.areaPreset',
    companyQueryInput: 'popup.company.query',
    companyUsageGoalSelect: 'common.usageGoal',
    companyExpectedResultsSelect: 'common.expectedResults',
    companySearchLanguageModeSelect: 'common.searchLanguage',
    companyTemplateAutoCheckbox: 'common.autoSelectTemplate',
    companyTemplateSelect: 'common.template',
    targetCompanies: 'popup.company.targetCompanies',
    companyLimitInput: 'popup.company.limit',
    companyScheduleCheckbox: 'popup.company.scheduleRecurring',
    companyScheduleInterval: 'common.runEveryHours',
    companyBatchSize: 'popup.company.batchSize',
    jobsAreaPresetSelect: 'popup.jobs.areaPreset',
    jobsQueryInput: 'popup.jobs.query',
    jobsUsageGoalSelect: 'common.usageGoal',
    jobsExpectedResultsSelect: 'common.expectedResults',
    jobsSearchLanguageModeSelect: 'common.searchLanguage',
    jobsTemplateAutoCheckbox: 'common.autoSelectTemplate',
    jobsTemplateSelect: 'common.template',
    jobsEasyApplyOnlyCheckbox: 'popup.jobs.easyApplyOnly',
    jobsUseCareerIntelligenceCheckbox: 'popup.jobs.useCareerIntelligence',
    jobsRoleTermsInput: 'popup.jobs.roleTerms',
    jobsLocationTermsInput: 'popup.jobs.locationTerms',
    jobsKeywordTermsInput: 'popup.jobs.keywordTerms',
    jobsPreferredCompaniesInput: 'popup.jobs.preferredCompanies',
    jobsExcludedCompaniesInput: 'popup.jobs.excludedCompanies',
    jobsExperienceLevelSelect: 'popup.jobs.experienceLevel',
    jobsWorkTypeSelect: 'popup.jobs.workType',
    jobsLocationInput: 'popup.jobs.linkedinLocation',
    jobsBrazilOffshoreFriendlyCheckbox: 'popup.jobs.brazilOffshore',
    jobsProfilePassphraseInput: 'popup.jobs.passphrase',
    jobsProfileFullNameInput: 'common.fullName',
    jobsProfileEmailInput: 'common.email',
    jobsProfilePhoneInput: 'common.phone',
    jobsProfileCityInput: 'common.city',
    jobsProfileHeadlineInput: 'popup.jobs.currentTitle',
    jobsProfilePortfolioInput: 'popup.jobs.portfolio',
    jobsProfileSummaryInput: 'popup.jobs.resumeSummary',
    feedReactCheckbox: 'popup.feed.react',
    feedCommentCheckbox: 'popup.feed.comment',
    feedWarmupEnabledCheckbox: 'popup.feed.enableWarmup',
    feedWarmupRunsRequiredInput: 'popup.feed.warmupRunsRequired',
    aiApiKeyInput: 'popup.feed.aiApiKey',
    commentTemplatesInput: 'popup.feed.fallbackTemplates',
    skipKeywordsInput: 'popup.feed.skipKeywords',
    skipKeywordsTemplateSelect: 'popup.feed.skipTemplateLabel',
    feedScheduleCheckbox: 'popup.feed.scheduleRecurring',
    feedScheduleInterval: 'common.runEveryHours',
    nurtureScheduleCheckbox: 'popup.feed.nurtureConnections',
    nurtureScheduleInterval: 'popup.feed.checkEveryHours',
    nurturePostLimit: 'popup.feed.postsPerVisit',
    goalMode: 'common.goal',
    roleTermsLimitInput: 'popup.connect.roleTermsLimit',
    areaPresetSelect: 'popup.connect.areaPreset',
    connectUsageGoalSelect: 'common.usageGoal',
    connectExpectedResultsSelect: 'common.expectedResults',
    connectSearchLanguageModeSelect: 'common.searchLanguage',
    connectTemplateAutoCheckbox: 'common.autoSelectTemplate',
    connectTemplateSelect: 'common.template',
    limitInput: 'common.limit',
    regionSelect: 'popup.connect.recruiterLocation',
    activelyHiringCheckbox: 'popup.connect.activelyHiring',
    engagementOnlyCheckbox: 'popup.connect.engagementOnly',
    excludedCompaniesInput: 'popup.connect.excludedCompanies',
    skipOpenToWorkRecruitersCheckbox: 'popup.connect.skipOpenToWork',
    skipJobSeekingSignalsCheckbox: 'popup.connect.skipJobSeeking',
    sendNoteCheckbox: 'popup.connect.sendNote',
    scheduleCheckbox: 'popup.connect.scheduleRecurring',
    scheduleInterval: 'common.runEveryHours',
    savedQueries: 'popup.connect.queryRotation',
    tagSearchInput: 'popup.connect.filterTags'
});

const POPUP_SELECT_OPTION_KEYS = Object.freeze({
    uiLanguageModeSelect: {
        auto: 'common.autoBrowser',
        en: 'common.english',
        pt_BR: 'common.portugueseBrazil'
    },
    connectSearchLanguageModeSelect: {
        auto: 'common.auto',
        en: 'common.english',
        pt_BR: 'common.portugueseBrazil',
        bilingual: 'common.bilingual'
    },
    companySearchLanguageModeSelect: {
        auto: 'common.auto',
        en: 'common.english',
        pt_BR: 'common.portugueseBrazil',
        bilingual: 'common.bilingual'
    },
    jobsSearchLanguageModeSelect: {
        auto: 'common.auto',
        en: 'common.english',
        pt_BR: 'common.portugueseBrazil',
        bilingual: 'common.bilingual'
    },
    goalMode: {
        passive: 'popup.connect.goalPassive',
        active: 'popup.connect.goalActive'
    },
    connectUsageGoalSelect: {
        recruiter_outreach: 'popup.connect.usageGoalRecruiter',
        peer_networking: 'popup.connect.usageGoalPeer',
        decision_makers: 'popup.connect.usageGoalDecision',
        brazil_focus: 'popup.connect.usageGoalBrazil'
    },
    companyUsageGoalSelect: {
        talent_watchlist: 'popup.company.usageGoalTalent',
        brand_watchlist: 'popup.company.usageGoalBrand',
        competitor_watch: 'popup.company.usageGoalCompetitor'
    },
    jobsUsageGoalSelect: {
        high_fit_easy_apply: 'popup.jobs.usageGoalHighFit',
        market_scan: 'popup.jobs.usageGoalMarketScan',
        target_company_roles: 'popup.jobs.usageGoalTargetCompanies'
    },
    connectExpectedResultsSelect: {
        precise: 'common.expectedPrecise',
        balanced: 'common.expectedBalanced',
        broad: 'common.expectedBroad'
    },
    companyExpectedResultsSelect: {
        precise: 'common.expectedPrecise',
        balanced: 'common.expectedBalanced',
        broad: 'common.expectedBroad'
    },
    jobsExpectedResultsSelect: {
        precise: 'common.expectedPrecise',
        balanced: 'common.expectedBalanced',
        broad: 'common.expectedBroad'
    },
    jobsExperienceLevelSelect: {
        '': 'common.any',
        '1': 'popup.jobs.experienceInternship',
        '2': 'popup.jobs.experienceEntry',
        '3': 'popup.jobs.experienceAssociate',
        '4': 'popup.jobs.experienceMidSenior',
        '5': 'popup.jobs.experienceDirector',
        '6': 'popup.jobs.experienceExecutive'
    },
    jobsWorkTypeSelect: {
        '': 'common.any',
        '1': 'popup.jobs.workTypeOnsite',
        '2': 'popup.jobs.workTypeRemote',
        '3': 'popup.jobs.workTypeHybrid'
    },
    skipKeywordsTemplateSelect: {
        '': 'popup.feed.skipTemplateChoose',
        sponsored: 'popup.feed.skipTemplateSponsored',
        engagement_bait: 'popup.feed.skipTemplateEngagementBait',
        politics: 'popup.feed.skipTemplatePolitics',
        controversy: 'popup.feed.skipTemplateControversy',
        crypto_hype: 'popup.feed.skipTemplateCryptoHype',
        job_spam: 'popup.feed.skipTemplateJobSpam'
    }
});

const SKIP_KEYWORD_TEMPLATES = Object.freeze({
    sponsored: [
        'sponsored',
        'ad',
        'promoted',
        'advertisement',
        'partnership'
    ],
    engagement_bait: [
        'comment interested',
        'type amen',
        'drop a fire emoji',
        'follow for part 2',
        'tag 3 people'
    ],
    politics: [
        'election',
        'left vs right',
        'government policy',
        'political debate',
        'partisan'
    ],
    controversy: [
        'hot take',
        'cancel culture',
        'outrage',
        'rage bait',
        'drama'
    ],
    crypto_hype: [
        'crypto',
        'web3',
        'nft',
        'token presale',
        'airdrop'
    ],
    job_spam: [
        'we are hiring',
        'urgent hiring',
        'walk-in interview',
        'apply now',
        'multiple openings'
    ]
});

const AREA_PRESET_OPTION_KEYS = Object.freeze({
    custom: 'popup.areaPreset.custom',
    tech: 'popup.areaPreset.tech',
    finance: 'popup.areaPreset.finance',
    'real-estate': 'popup.areaPreset.realEstate',
    headhunting: 'popup.areaPreset.headhunting',
    'legal-judicial-media': 'popup.areaPreset.legalJudicialMedia',
    'environmental-engineering': 'popup.areaPreset.environmentalEngineering',
    'sanitary-engineering': 'popup.areaPreset.sanitaryEngineering',
    healthcare: 'popup.areaPreset.healthcare',
    education: 'popup.areaPreset.education',
    marketing: 'popup.areaPreset.marketing',
    sales: 'popup.areaPreset.sales',
    'graphic-design': 'popup.areaPreset.graphicDesign',
    'art-direction': 'popup.areaPreset.artDirection',
    branding: 'popup.areaPreset.branding',
    'ui-ux': 'popup.areaPreset.uiUx',
    'motion-design': 'popup.areaPreset.motionDesign',
    'video-editing': 'popup.areaPreset.videoEditing',
    videomaker: 'popup.areaPreset.videomaker'
});

function normalizeCompanyPresetForUi(value) {
    const normalized = String(value || '').trim();
    if (normalized === 'tech' || normalized.startsWith('tech-')) {
        return 'tech';
    }
    return normalized;
}

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
        return normalizeCompanyPresetForUi(normalizeCompanyAreaPreset(value));
    }
    return normalizeCompanyPresetForUi(value || DEFAULT_COMPANY_AREA_PRESET);
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

function getSkipKeywordsTemplateId() {
    return getValueOrDefault('skipKeywordsTemplateSelect', '');
}

function getSkipKeywordsTemplateTerms(templateId) {
    const terms = SKIP_KEYWORD_TEMPLATES[templateId];
    return Array.isArray(terms) ? terms.slice() : [];
}

function mergeUniqueKeywordTerms(baseTerms, extraTerms) {
    const merged = [];
    const seen = new Set();

    [...baseTerms, ...extraTerms].forEach((term) => {
        const value = String(term || '').trim();
        if (!value) return;
        const normalized = value.toLowerCase();
        if (seen.has(normalized)) return;
        seen.add(normalized);
        merged.push(value);
    });

    return merged;
}

function applySkipKeywordsTemplate(mode) {
    const templateId = getSkipKeywordsTemplateId();
    if (!templateId) {
        setStatusMessageKey(
            'popup.feed.skipTemplateSelectFirst',
            'warning',
            'Choose a keyword template first.'
        );
        return;
    }

    const templateTerms = getSkipKeywordsTemplateTerms(templateId);
    if (!templateTerms.length) return;

    const textarea = document.getElementById('skipKeywordsInput');
    const currentTerms = parseMultilineList(textarea.value);
    const nextTerms = mode === 'append'
        ? mergeUniqueKeywordTerms(currentTerms, templateTerms)
        : templateTerms;

    textarea.value = nextTerms.join('\n');
    saveState();

    const messageKey = mode === 'append'
        ? 'popup.feed.skipTemplateAppended'
        : 'popup.feed.skipTemplateApplied';
    const fallback = mode === 'append'
        ? 'Keyword template appended.'
        : 'Keyword template applied.';
    setStatusMessageKey(messageKey, 'success', fallback);
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
    const collapsed = normalizeCompanyPresetForUi(
        normalized || DEFAULT_COMPANY_AREA_PRESET
    );
    const hasOption = Array.from(select.options).some((option) => {
        return option.value === collapsed;
    });
    select.value = hasOption ? collapsed : DEFAULT_COMPANY_AREA_PRESET;
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

function tr(key, substitutions, fallback) {
    if (typeof getMessage !== 'function') {
        return fallback || key;
    }
    const text = getMessage(
        activeUiCatalog,
        fallbackUiCatalog,
        key,
        substitutions
    );
    return text || fallback || key;
}

function formatUiDateTime(value) {
    if (!value) return '';
    try {
        return new Date(value).toLocaleString(
            currentUiLocale === 'pt_BR' ? 'pt-BR' : 'en-US'
        );
    } catch (_) {
        return String(value || '');
    }
}

function setStatusMessageKey(key, type, fallback, substitutions) {
    setStatusMessage(
        tr(key, substitutions, fallback),
        type
    );
}

function getProgressVerb(mode, isEngagementOnly) {
    if (mode === 'companies') {
        return tr('popup.progress.followed', null, 'Followed');
    }
    if (mode === 'jobs') {
        return tr('popup.progress.prepared', null, 'Prepared');
    }
    if (mode === 'feed') {
        return tr('popup.progress.engaged', null, 'Engaged');
    }
    return isEngagementOnly
        ? tr('popup.progress.engaged', null, 'Engaged')
        : tr('popup.progress.sent', null, 'Sent');
}

function getRecentProfileStatusLabel(status) {
    const value = String(status || '');
    const labelMap = {
        sent: ['status.sent', 'Sent'],
        accepted: ['status.accepted', 'Accepted'],
        visited: ['status.visited', 'Visited'],
        followed: ['status.followed', 'Followed'],
        'visited-followed': ['status.visitedFollowed', 'Visited + Followed']
    };
    if (labelMap[value]) {
        const [key, fallback] = labelMap[value];
        return tr(key, null, fallback);
    }
    if (value.startsWith('skipped-')) {
        const key = `status.${value.replace(/^skipped-/, '')}`;
        const fallback = value.replace(/^skipped-/, '');
        return tr(key, null, fallback);
    }
    return value.replace(/-/g, ' ');
}

function uiLocaleToSearchLocale(locale) {
    return locale === 'pt_BR' ? 'pt_BR' : 'en';
}

function formatDisplayTerm(term) {
    const raw = String(term || '').replace(/^"+|"+$/g, '').trim();
    if (!raw) return '';
    return raw.split(/\s+/).map(word => {
        if (/^[A-Z0-9&+-]{2,}$/.test(word)) return word;
        if (/^[a-z]{1,3}$/.test(word)) return word;
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
}

function localizeDisplayTerm(term) {
    if (typeof localizeSearchTerms !== 'function') {
        return formatDisplayTerm(term);
    }
    const terms = localizeSearchTerms(
        [term],
        uiLocaleToSearchLocale(currentUiLocale)
    );
    return formatDisplayTerm(terms[0] || term);
}

function setElementText(selector, key, fallback) {
    const node = document.querySelector(selector);
    if (!node) return;
    node.textContent = tr(key, null, fallback);
}

function setElementHtml(selector, value) {
    const node = document.querySelector(selector);
    if (!node) return;
    node.innerHTML = value;
}

function setLabelText(forId, key, fallback) {
    const label = document.querySelector(`label[for="${forId}"]`);
    if (!label) return;
    label.textContent = tr(key, null, fallback);
}

function setInputPlaceholder(id, key, fallback) {
    const input = document.getElementById(id);
    if (!input) return;
    input.setAttribute('placeholder', tr(key, null, fallback));
}

function translateSelectOptions(selectId, keyMap) {
    const select = document.getElementById(selectId);
    if (!select || !keyMap) return;
    Array.from(select.options).forEach(option => {
        const key = keyMap[option.value];
        if (!key) return;
        option.textContent = tr(key, null, option.textContent);
    });
}

function translateAreaPresetOptions(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    Array.from(select.options).forEach(option => {
        const key = AREA_PRESET_OPTION_KEYS[option.value];
        option.textContent = key
            ? tr(key, null, localizeDisplayTerm(option.value))
            : localizeDisplayTerm(option.value);
    });
}

function translateRegionOptions() {
    const select = document.getElementById('regionSelect');
    if (!select) return;
    const labels = {
        '103644278,101121807,101165590,101282230,102890719':
            tr('popup.connect.regionGlobal', null, 'Global (US/CA/UK/DE/NL)'),
        '103644278': tr('popup.connect.regionUs', null, 'United States'),
        '101121807': tr('popup.connect.regionCanada', null, 'Canada'),
        '101165590': tr('popup.connect.regionUk', null, 'United Kingdom'),
        '101282230': tr('popup.connect.regionGermany', null, 'Germany'),
        '102890719': tr('popup.connect.regionNetherlands', null, 'Netherlands'),
        '105646813': tr('popup.connect.regionIreland', null, 'Ireland'),
        '100364837': tr('popup.connect.regionPortugal', null, 'Portugal'),
        '105015875': tr('popup.connect.regionSpain', null, 'Spain'),
        '106057199': tr('popup.connect.regionBrazil', null, 'Brazil'),
        '103644278,106057199': tr('popup.connect.regionUsBrazil', null, 'US + Brazil'),
        '103644278,101121807,101165590,101282230,102890719,105646813,100364837,105015875':
            tr('popup.connect.regionUsEuExtended', null, 'US + EU Extended')
    };
    Array.from(select.options).forEach(option => {
        option.textContent = labels[option.value] || option.textContent;
    });
}

function renderConnectTagLabels() {
    const groupLabels = document.querySelectorAll(
        '#connectRefineAccordion .tag-group-label'
    );
    const labelKeys = [
        'popup.connect.groupRole',
        'popup.connect.groupIndustry',
        'popup.connect.groupMarket',
        'popup.connect.groupLevel'
    ];
    groupLabels.forEach((node, index) => {
        const key = labelKeys[index];
        if (!key) return;
        node.textContent = tr(key, null, node.textContent);
    });
    document.querySelectorAll('#connectRefineAccordion .tag[data-group]')
        .forEach(tag => {
            tag.textContent = localizeDisplayTerm(tag.dataset.value);
        });
}

function getAreaPresetDisplayLabel(areaPreset) {
    return localizeDisplayTerm(areaPreset || 'custom');
}

function getUsageGoalLabel(mode, usageGoal) {
    const maps = {
        connect: POPUP_SELECT_OPTION_KEYS.connectUsageGoalSelect,
        companies: POPUP_SELECT_OPTION_KEYS.companyUsageGoalSelect,
        jobs: POPUP_SELECT_OPTION_KEYS.jobsUsageGoalSelect
    };
    const key = maps[mode]?.[usageGoal];
    return key ? tr(key, null, usageGoal) : usageGoal;
}

function getExpectedResultsLabel(bucket) {
    const key = POPUP_SELECT_OPTION_KEYS.connectExpectedResultsSelect[bucket];
    return key ? tr(key, null, bucket) : bucket;
}

function getTemplateSelectLabel(template) {
    return [
        getAreaPresetDisplayLabel(template.areaPreset),
        getUsageGoalLabel(template.mode, template.usageGoal),
        getExpectedResultsLabel(template.expectedResultsBucket)
    ].filter(Boolean).join(' · ');
}

async function applyPopupLocalization() {
    if (typeof loadLocaleMessages !== 'function' ||
        typeof resolveUiLocale !== 'function') {
        return;
    }
    currentUiLocale = resolveUiLocale(
        getUiLanguageMode(),
        navigator.language
    );
    fallbackUiCatalog = await loadLocaleMessages('en');
    activeUiCatalog = currentUiLocale === 'en'
        ? fallbackUiCatalog
        : await loadLocaleMessages(currentUiLocale);

    setElementText('#popupHeaderTitle', 'extensionName', 'LinkedIn Engage');
    setElementText('.header p', 'popup.header.subtitle',
        'Targeted LinkedIn networking automation');
    setElementText('.section[style*="margin-bottom:12px;"] .section-label',
        'common.mode',
        'Mode');
    document.querySelectorAll('.mode-btn').forEach(btn => {
        const key = {
            connect: 'common.connect',
            companies: 'common.companies',
            jobs: 'common.jobs',
            feed: 'common.feed'
        }[btn.dataset.mode];
        if (key) {
            btn.textContent = tr(key, null, btn.textContent);
        }
    });
    setElementText('#companySection > .section .section-label',
        'popup.company.section',
        'Company Search');
    setElementText('#jobsSection > .section .section-label',
        'popup.jobs.section',
        'Jobs Assist');
    setElementText('#feedSection > .section .section-label',
        'popup.feed.section',
        'Feed Engagement');
    setElementText('#connectSection > .section .section-label',
        'popup.connect.section',
        'Search Builder');
    setElementText('#connectMessageAccordion .section-label',
        'common.template',
        'Template');
    setElementText('#recentProfiles .section-label',
        'popup.tools.recentConnections',
        'Recent Connections');

    Object.entries(UI_LABEL_KEYS).forEach(([id, key]) => {
        setLabelText(id, key);
    });

    setElementText('#companyAutomationAccordion .accordion-toggle span:first-child',
        'common.automation',
        'Automation');
    setElementText('#jobsRefineAccordion .accordion-toggle span:first-child',
        'common.refine',
        'Refine');
    setElementText('#jobsCareerAccordion .accordion-toggle span:first-child',
        'popup.jobs.careerIntel',
        'Career Intelligence');
    setElementText('#jobsProfileAccordion .accordion-toggle span:first-child',
        'popup.jobs.encryptedProfileCache',
        'Encrypted Profile Cache');
    setElementText('#commentSettingsAccordion .accordion-toggle span:first-child',
        'popup.feed.commentSettings',
        'Comment Settings');
    setElementText('#feedAutomationAccordion .accordion-toggle span:first-child',
        'common.automation',
        'Automation');
    setElementText('#connectRefineAccordion .accordion-toggle > span:first-child',
        'popup.connect.refineFilters',
        'Refine Filters');
    setElementText('#connectAudienceAccordion .accordion-toggle span:first-child',
        'popup.connect.audienceFilters',
        'Audience Filters');
    setElementText('#connectMessageAccordion .accordion-toggle span:first-child',
        'popup.connect.messageSection',
        'Message');
    setElementText('#connectAutomationAccordion .accordion-toggle span:first-child',
        'common.automation',
        'Automation');
    setElementText('#toolsAccordion .accordion-toggle span:first-child',
        'popup.tools.section',
        'Tools');

    setElementText('#loadDefaultCompanies', 'common.loadDefaults', 'Load defaults');
    setElementText('#importJobsLinkedInProfileBtn',
        'popup.jobs.importLinkedInProfile',
        'Import LinkedIn Profile');
    setElementText('#uploadJobsResumesBtn',
        'popup.jobs.uploadResumes',
        'Upload Resumes');
    setElementText('#analyzeJobsCareerBtn',
        'popup.jobs.analyzeGenerate',
        'Analyze & Generate');
    setElementText('#clearJobsCareerIntelBtn',
        'popup.jobs.clearCareerIntel',
        'Clear Career Intel');
    setElementText('#unlockJobsProfileCacheBtn',
        'popup.jobs.unlockCache',
        'Unlock Cache');
    setElementText('#saveJobsProfileCacheBtn',
        'popup.jobs.saveEncryptedCache',
        'Save Encrypted Cache');
    setElementText('#clearJobsProfileCacheBtn',
        'common.clearCache',
        'Clear Cache');
    setElementText('#resetFeedWarmupProgressBtn',
        'popup.feed.resetLearningProgress',
        'Reset Learning Progress');
    setElementText('#applySkipKeywordsTemplateBtn',
        'popup.feed.skipTemplateReplace',
        'Replace list');
    setElementText('#appendSkipKeywordsTemplateBtn',
        'popup.feed.skipTemplateAppend',
        'Append list');
    setElementText('#skipKeywordsTemplateHelp',
        'popup.feed.skipTemplateHelp',
        'Use a template as a starting point, then customize the list.');
    setElementText('#checkAcceptedBtn',
        'popup.tools.checkAccepted',
        'Check Accepted Connections');
    setElementText('#exportBtn',
        'popup.tools.exportConnections',
        'Export Connection Log (CSV)');
    setElementText('.footer',
        'popup.footer.safeRun',
        'Runs safely in your browser');

    setElementText('#toggleCustomQuery',
        useCustomQuery ? 'popup.connect.useTagBuilder'
            : 'popup.connect.editQueryManually',
        useCustomQuery ? 'Use tag builder' : 'Edit query manually');
    setInputPlaceholder(
        'tagSearchInput',
        'popup.connect.filterTagsPlaceholder',
        'e.g. design, recruiter, marketing'
    );
    setElementText(
        '.template-card[data-template=\"senior\"] .template-name',
        'popup.connect.templateSenior',
        'Senior Professional'
    );
    setElementText(
        '.template-card[data-template=\"senior\"] .template-preview',
        'popup.connect.templateSeniorPreview',
        'I work on strategic projects in this area and value practical exchanges...'
    );
    setElementText(
        '.template-card[data-template=\"mid\"] .template-name',
        'popup.connect.templateMid',
        'Mid-Level Professional'
    );
    setElementText(
        '.template-card[data-template=\"mid\"] .template-preview',
        'popup.connect.templateMidPreview',
        'I collaborate with teams in this area and enjoy sharing practical insights...'
    );
    setElementText(
        '.template-card[data-template=\"junior\"] .template-name',
        'popup.connect.templateJunior',
        'Junior / Associate'
    );
    setElementText(
        '.template-card[data-template=\"junior\"] .template-preview',
        'popup.connect.templateJuniorPreview',
        'I am growing my career and would like to connect with professionals...'
    );
    setElementText(
        '.template-card[data-template=\"lead\"] .template-name',
        'popup.connect.templateLead',
        'Team Lead / Manager'
    );
    setElementText(
        '.template-card[data-template=\"lead\"] .template-preview',
        'popup.connect.templateLeadPreview',
        'I lead initiatives and value focused conversations about outcomes...'
    );
    setElementText(
        '.template-card[data-template=\"networking\"] .template-name',
        'popup.connect.templateNetworking',
        'General Networking'
    );
    setElementText(
        '.template-card[data-template=\"networking\"] .template-preview',
        'popup.connect.templateNetworkingPreview',
        'I came across your profile and would like to connect to exchange insights...'
    );
    setElementText(
        '.template-card[data-template=\"custom\"] .template-name',
        'popup.connect.templateCustom',
        'Custom'
    );
    setElementText(
        '.template-card[data-template=\"custom\"] .template-preview',
        'popup.connect.templateCustomPreview',
        'Write your own personalized message...'
    );

    setElementText('#companySection > div[style*="font-size:10px; color:var(--text-muted);"]',
        'popup.company.defaultTargetsHelp',
        'Preset defaults include global + Brazil companies. Fill in to only follow matching companies.');
    setElementText('#jobsSection > div[style*="font-size:10px; color:var(--text-muted); margin-top:8px;"]',
        'popup.jobs.onDemandOnly',
        'Jobs mode is on-demand only in v1 (no recurring scheduler).');

    const companyHelpRow = document.querySelector(
        '#companySection div[style*="justify-content:space-between"] span'
    );
    if (companyHelpRow) {
        companyHelpRow.textContent = tr(
            'popup.company.leaveEmptyFollowAll',
            null,
            'Leave empty to follow all results.'
        );
    }

    const jobsCareerHelp = document.querySelector(
        '#jobsCareerAccordion .accordion-body > div:first-child'
    );
    if (jobsCareerHelp) {
        jobsCareerHelp.textContent = tr(
            'popup.jobs.careerIntelHelp',
            null,
            'Local-only analysis from uploaded resumes and your LinkedIn profile.'
        );
    }

    const jobsModeHelp = document.querySelector(
        '#jobsSection .section div[style*="font-size:10px; color:var(--text-muted);"]'
    );
    if (jobsModeHelp) {
        jobsModeHelp.textContent = tr(
            'popup.jobs.semiAutoHelp',
            null,
            'Semi-auto mode: prepares the application and stops before final submit.'
        );
    }

    translateSelectOptions(
        'uiLanguageModeSelect',
        POPUP_SELECT_OPTION_KEYS.uiLanguageModeSelect
    );
    translateSelectOptions(
        'connectSearchLanguageModeSelect',
        POPUP_SELECT_OPTION_KEYS.connectSearchLanguageModeSelect
    );
    translateSelectOptions(
        'companySearchLanguageModeSelect',
        POPUP_SELECT_OPTION_KEYS.companySearchLanguageModeSelect
    );
    translateSelectOptions(
        'jobsSearchLanguageModeSelect',
        POPUP_SELECT_OPTION_KEYS.jobsSearchLanguageModeSelect
    );
    translateSelectOptions(
        'goalMode',
        POPUP_SELECT_OPTION_KEYS.goalMode
    );
    translateSelectOptions(
        'connectUsageGoalSelect',
        POPUP_SELECT_OPTION_KEYS.connectUsageGoalSelect
    );
    translateSelectOptions(
        'companyUsageGoalSelect',
        POPUP_SELECT_OPTION_KEYS.companyUsageGoalSelect
    );
    translateSelectOptions(
        'jobsUsageGoalSelect',
        POPUP_SELECT_OPTION_KEYS.jobsUsageGoalSelect
    );
    translateSelectOptions(
        'connectExpectedResultsSelect',
        POPUP_SELECT_OPTION_KEYS.connectExpectedResultsSelect
    );
    translateSelectOptions(
        'companyExpectedResultsSelect',
        POPUP_SELECT_OPTION_KEYS.companyExpectedResultsSelect
    );
    translateSelectOptions(
        'jobsExpectedResultsSelect',
        POPUP_SELECT_OPTION_KEYS.jobsExpectedResultsSelect
    );
    translateSelectOptions(
        'jobsExperienceLevelSelect',
        POPUP_SELECT_OPTION_KEYS.jobsExperienceLevelSelect
    );
    translateSelectOptions(
        'jobsWorkTypeSelect',
        POPUP_SELECT_OPTION_KEYS.jobsWorkTypeSelect
    );
    translateSelectOptions(
        'skipKeywordsTemplateSelect',
        POPUP_SELECT_OPTION_KEYS.skipKeywordsTemplateSelect
    );
    translateAreaPresetOptions('areaPresetSelect');
    translateAreaPresetOptions('companyAreaPresetSelect');
    translateAreaPresetOptions('jobsAreaPresetSelect');
    translateRegionOptions();
    renderConnectTagLabels();
    refreshTemplateControls();
    setMode(currentMode);
    updateQueryPreview();
    updateCharCounter();
}

function getUiLanguageMode() {
    return getValueOrDefault(
        'uiLanguageModeSelect',
        DEFAULT_UI_LANGUAGE_MODE
    );
}

function getConnectSearchLanguageMode() {
    return getValueOrDefault(
        'connectSearchLanguageModeSelect',
        DEFAULT_SEARCH_LANGUAGE_MODE
    );
}

function getCompanySearchLanguageMode() {
    return getValueOrDefault(
        'companySearchLanguageModeSelect',
        DEFAULT_SEARCH_LANGUAGE_MODE
    );
}

function getJobsSearchLanguageMode() {
    return getValueOrDefault(
        'jobsSearchLanguageModeSelect',
        DEFAULT_SEARCH_LANGUAGE_MODE
    );
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
            areaPreset: getSelectedAreaPreset(),
            searchLanguageMode: getConnectSearchLanguageMode()
        };
    }
    if (mode === 'companies') {
        return {
            usageGoal: getCompanyUsageGoal(),
            expectedResultsBucket: getCompanyExpectedResults(),
            auto: isCompanyTemplateAuto(),
            templateId: getCompanyTemplateId(),
            areaPreset: getSelectedCompanyAreaPreset(),
            searchLanguageMode: getCompanySearchLanguageMode()
        };
    }
    return {
        usageGoal: getJobsUsageGoal(),
        expectedResultsBucket: getJobsExpectedResults(),
        auto: isJobsTemplateAuto(),
        templateId: getJobsTemplateId(),
        areaPreset: getSelectedJobsAreaPreset(),
        searchLanguageMode: getJobsSearchLanguageMode()
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
        option.textContent = getTemplateSelectLabel(template);
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
    counter.textContent = tr(
        'popup.connect.selectedCount',
        [count],
        `${count} selected`
    );
}

function applyTagSearchFilter() {
    const input = document.getElementById('tagSearchInput');
    if (!input) return;
    const query = input.value || '';
    popupUiState = normalizePopupUi(popupUiState);
    popupUiState.tagSearch = query;
    const activeRoleArea = popupUiState.activeRoleArea || '';
    const activeIndustryArea = popupUiState.activeIndustryArea || '';
    document.querySelectorAll(
        '#connectSection .tag[data-group]'
    ).forEach(tag => {
        const textMatch = typeof filterTagMatchesSearch ===
            'function'
            ? filterTagMatchesSearch(
                tag.textContent || '',
                tag.dataset.value || '',
                query
            )
            : String(tag.textContent || '')
                .toLowerCase()
                .includes(String(query).toLowerCase());
        const group = tag.dataset.group;
        const tagArea = tag.dataset.area || '';
        let areaMatch = true;
        if (group === 'role' && activeRoleArea) {
            areaMatch = tagArea === activeRoleArea;
        } else if (group === 'industry' && activeIndustryArea) {
            areaMatch = tagArea === activeIndustryArea;
        }
        tag.style.display = (textMatch && areaMatch) ? '' : 'none';
    });
}

function applyAreaFilter(filterEl, targetGroup) {
    if (!filterEl) return;
    const area = filterEl.dataset.area || '';
    const pillsContainer = filterEl.closest('.area-filter-pills');
    if (pillsContainer) {
        pillsContainer.querySelectorAll('.area-pill').forEach(p => {
            p.classList.toggle('active', p.dataset.area === area);
        });
    }
    popupUiState = normalizePopupUi(popupUiState);
    if (targetGroup === 'role') {
        popupUiState.activeRoleArea = area;
    } else if (targetGroup === 'industry') {
        popupUiState.activeIndustryArea = area;
    }
    applyTagSearchFilter();
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
        text.textContent = tr(
            'popup.feed.warmupDisabled',
            null,
            'Learning warmup disabled. Comments are unlocked.'
        );
        return;
    }
    text.textContent = tr(
        'popup.feed.warmupProgress',
        [completed, safeRequired, unlock],
        `Learning progress: ${completed} / ${safeRequired} runs · ` +
            `Comments unlock on run #${unlock}`
    );
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
            getRoleTermsLimit(),
            getConnectSearchLanguageMode()
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
            searchLanguageMode: templateState.searchLanguageMode,
            selectedTags: tags,
            roleTermsLimit: getRoleTermsLimit()
        });
        if (plan?.query) return plan;
    }

    if (typeof buildConnectQueryFromTags === 'function') {
        const query = buildConnectQueryFromTags(
            tags,
            getRoleTermsLimit(),
            getConnectSearchLanguageMode()
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
    const queryTerms = safeRoles
        .concat(tags.industry || [], tags.market || [], tags.level || [])
        .map(term => String(term || '').trim())
        .filter(Boolean);
    const query = queryTerms.join(' OR ');
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
            searchLanguageMode: templateState.searchLanguageMode,
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

function buildJobsSearchPlan() {
    const templateState = getTemplateState('jobs');
    const manualQuery = document.getElementById(
        'jobsQueryInput'
    )?.value.trim() || '';
    const roleTermsInput = document.getElementById(
        'jobsRoleTermsInput'
    )?.value;
    const locationTermsInput = document.getElementById(
        'jobsLocationTermsInput'
    )?.value;
    const keywordTermsInput = document.getElementById(
        'jobsKeywordTermsInput'
    )?.value;

    const parsedRoleTerms = parseMultilineList(roleTermsInput);
    const parsedLocationTerms = parseMultilineList(locationTermsInput);
    const parsedKeywordTerms = parseMultilineList(keywordTermsInput);

    const roleTerms = roleTermsInput && roleTermsInput.trim()
        ? parsedRoleTerms
        : undefined;
    const locationTerms = locationTermsInput && locationTermsInput.trim()
        ? parsedLocationTerms
        : undefined;
    const keywordTerms = keywordTermsInput && keywordTermsInput.trim()
        ? parsedKeywordTerms
        : undefined;
    if (typeof buildSearchTemplatePlan === 'function') {
        const plan = buildSearchTemplatePlan({
            mode: 'jobs',
            areaPreset: getSelectedJobsAreaPreset(),
            usageGoal: templateState.usageGoal,
            expectedResultsBucket:
                templateState.expectedResultsBucket,
            auto: templateState.auto,
            templateId: templateState.templateId,
            searchLanguageMode: templateState.searchLanguageMode,
            manualQuery,
            roleTerms,
            locationTerms,
            keywords: keywordTerms
        });
        if (plan?.query) return plan;
    }
    const parts = [];
    if (parsedRoleTerms.length === 1) {
        parts.push(parsedRoleTerms[0]);
    } else if (parsedRoleTerms.length > 1) {
        parts.push(parsedRoleTerms.join(' OR '));
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

function getJobsCareerPassphrase() {
    return document.getElementById(
        'jobsProfilePassphraseInput'
    )?.value.trim() || '';
}

function buildJobsKeywordTerms() {
    return parseMultilineList(
        document.getElementById('jobsKeywordTermsInput')?.value
    );
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

function fillJobsCareerPlan(plan) {
    if (!plan || typeof plan !== 'object') return;
    const queryInput = document.getElementById('jobsQueryInput');
    const roleTermsInput = document.getElementById(
        'jobsRoleTermsInput'
    );
    const keywordTermsInput = document.getElementById(
        'jobsKeywordTermsInput'
    );
    const locationTermsInput = document.getElementById(
        'jobsLocationTermsInput'
    );
    const experienceLevelSelect = document.getElementById(
        'jobsExperienceLevelSelect'
    );
    const workTypeSelect = document.getElementById(
        'jobsWorkTypeSelect'
    );

    if (queryInput) queryInput.value = plan.query || '';
    if (roleTermsInput) {
        roleTermsInput.value = (plan.roleTerms || []).join('\n');
    }
    if (keywordTermsInput) {
        keywordTermsInput.value = (plan.keywordTerms || []).join('\n');
    }
    if (locationTermsInput) {
        locationTermsInput.value = (plan.locationTerms || []).join('\n');
    }
    if (experienceLevelSelect && plan.experienceLevel) {
        experienceLevelSelect.value = plan.experienceLevel;
    }
    if (workTypeSelect && plan.workType) {
        workTypeSelect.value = plan.workType;
    }
}

function renderJobsCareerDocsList(state) {
    const container = document.getElementById('jobsCareerDocsList');
    if (!container) return;
    const docs = Array.isArray(state?.documents)
        ? state.documents
        : [];
    if (!docs.length) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }
    container.style.display = 'flex';
    container.innerHTML = docs.map(doc => `
        <div style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:8px;
            padding:8px;
            border:1px solid var(--border);
            border-radius:var(--radius-sm);
            background:var(--card-bg);
        ">
            <div style="min-width:0;">
                <div style="font-size:11px; font-weight:600;">
                    ${doc.fileName}
                </div>
                <div style="font-size:10px; color:var(--text-muted);">
                    ${(doc.extension || '').toUpperCase()} ·
                    ${Math.max(1, Math.round((doc.size || 0) / 1024))} KB
                </div>
            </div>
            <button type="button"
                data-remove-jobs-doc="${doc.id}"
                style="
                    padding:6px 8px;
                    border:1px solid var(--warning);
                    border-radius:var(--radius-sm);
                    background:transparent;
                    color:var(--warning);
                    font-size:10px;
                    font-weight:600;
                    cursor:pointer;
                ">
                Remove
            </button>
        </div>
    `).join('');
}

function setJobsCareerStateForSession(state, loaded) {
    jobsCareerIntelStateThisSession = state || null;
    jobsCareerIntelLoadedThisSession = loaded === true;
    renderJobsCareerDocsList(jobsCareerIntelStateThisSession);
}

function loadJobsCareerIntelState(passphrase) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
            action: 'loadJobsCareerIntel',
            profilePassphrase: passphrase
        }, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }
            if (response?.status === 'missing') {
                resolve(null);
                return;
            }
            if (response?.status !== 'loaded') {
                reject(new Error(
                    response?.reason || 'career-intel-locked'
                ));
                return;
            }
            resolve(response.state || null);
        });
    });
}

function saveJobsCareerIntelState(state, passphrase) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
            action: 'saveJobsCareerIntel',
            state,
            profilePassphrase: passphrase
        }, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }
            if (response?.status !== 'saved') {
                reject(new Error(
                    response?.error || 'Failed to save career intelligence.'
                ));
                return;
            }
            resolve(response);
        });
    });
}

async function rebuildAndPersistJobsCareerIntel(partialState, passphrase) {
    const currentState = await loadJobsCareerIntelState(passphrase)
        .catch(error => {
            if (error.message === 'career-intel-locked') throw error;
            return null;
        });
    const resumeDocuments =
        await loadJobsCareerVaultDocuments(passphrase);
    const nextState = {
        ...(currentState || {}),
        ...(partialState || {})
    };
    nextState.documents = resumeDocuments.map(doc => ({
        id: doc.id,
        fileName: doc.fileName,
        extension: doc.extension,
        size: doc.size,
        sha256: doc.sha256,
        updatedAt: doc.updatedAt
    }));
    nextState.analysisSnapshot = analyzeJobsCareerInputs({
        profile: buildJobsProfilePayload(),
        importedProfile: nextState.importedProfile,
        resumeDocuments
    });
    await saveJobsCareerIntelState(nextState, passphrase);
    setJobsCareerStateForSession(nextState, true);
    refreshJobsCareerIntelStatus();
    return nextState;
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
                statusEl.textContent = tr(
                    'popup.jobs.cacheStatusUnavailable',
                    null,
                    'Encrypted cache status unavailable.'
                );
                return;
            }
            if (!response.exists) {
                jobsCacheLoadedThisSession = false;
                statusEl.textContent = tr(
                    'popup.jobs.cacheNotConfigured',
                    null,
                    'Encrypted cache: not configured.'
                );
                return;
            }
            const updated = response.updatedAt
                ? formatUiDateTime(response.updatedAt)
                : tr('common.unknownDate', null, 'unknown date');
            if (jobsCacheLoadedThisSession) {
                statusEl.textContent = tr(
                    'popup.jobs.cacheLoaded',
                    [response.version || 1, updated],
                    `Encrypted cache: loaded in this session (v${response.version || 1}) · updated ${updated}`
                );
                return;
            }
            statusEl.textContent = tr(
                'popup.jobs.cacheLocked',
                [response.version || 1, updated],
                `Encrypted cache: locked (v${response.version || 1}) · updated ${updated}`
            );
        }
    );
}

function refreshJobsCareerIntelStatus() {
    const statusEl = document.getElementById(
        'jobsCareerIntelStatus'
    );
    if (!statusEl) return;
    chrome.runtime.sendMessage(
        { action: 'getJobsCareerIntelStatus' },
        (response) => {
            if (chrome.runtime.lastError || !response) {
                statusEl.textContent = tr(
                    'popup.jobs.careerStatusUnavailable',
                    null,
                    'Career intelligence status unavailable.'
                );
                return;
            }
            if (!response.exists) {
                jobsCareerIntelLoadedThisSession = false;
                if (!jobsCareerIntelStateThisSession) {
                    renderJobsCareerDocsList(null);
                }
                statusEl.textContent = tr(
                    'popup.jobs.careerNotConfigured',
                    null,
                    'Career intelligence: not configured.'
                );
                return;
            }
            const updated = response.updatedAt
                ? formatUiDateTime(response.updatedAt)
                : tr('common.unknownDate', null, 'unknown date');
            if (jobsCareerIntelLoadedThisSession) {
                statusEl.textContent = tr(
                    'popup.jobs.careerLoaded',
                    [response.version || 1, updated],
                    `Career intelligence: loaded in this session (v${response.version || 1}) · updated ${updated}`
                );
                return;
            }
            statusEl.textContent = tr(
                'popup.jobs.careerLocked',
                [response.version || 1, updated],
                `Career intelligence: locked (v${response.version || 1}) · updated ${updated}`
            );
        }
    );
}

function getJobsCareerIntelErrorMessage(error) {
    const message = String(error?.message || '').trim();
    if (message === 'career-intel-locked') {
        return tr(
            'popup.jobs.errorCareerLocked',
            null,
            'Career intelligence is locked. Check the session passphrase.'
        );
    }
    if (message === 'unsupported-file-type') {
        return tr(
            'popup.jobs.errorUnsupportedFileType',
            null,
            'Only PDF and DOCX resumes are supported.'
        );
    }
    if (message === 'file-too-large') {
        return tr(
            'popup.jobs.errorFileTooLarge',
            null,
            'Each resume must be 5 MB or smaller.'
        );
    }
    return tr(
        'popup.jobs.errorCareerUpdate',
        null,
        'Failed to update Career Intelligence.'
    );
}

function updateQueryPreview() {
    const preview = document.getElementById('queryPreview');
    const query = buildQuery();
    if (!query) {
        preview.textContent = tr(
            'popup.connect.previewEmpty',
            null,
            'Select at least one tag to build a query'
        );
        return;
    }
    preview.textContent = query;
}

function updateCharCounter() {
    const textarea = document.getElementById('noteTemplate');
    const counter = document.getElementById('charCounter');
    const len = textarea.value.length;
    counter.textContent = tr(
        'popup.connect.charCounter',
        [len, MAX_CHARS],
        `${len} / ${MAX_CHARS}`
    );
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
        connectSearchLanguageMode:
            getConnectSearchLanguageMode(),
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
        followFallback: document.getElementById(
            'followFallbackCheckbox'
        )?.checked !== false,
        followFirstMode: !!document.getElementById(
            'followFirstModeCheckbox'
        )?.checked,
        followMax: Number(
            document.getElementById('followMaxInput')?.value
        ) || 40,
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
        companySearchLanguageMode:
            getCompanySearchLanguageMode(),
        companyQuery: document.getElementById(
            'companyQueryInput').value,
        companyLimit: document.getElementById(
            'companyLimitInput').value,
        targetCompanies: document.getElementById(
            'targetCompanies').value,
        jobsAreaPreset: getSelectedJobsAreaPreset(),
        jobsUsageGoal: getJobsUsageGoal(),
        jobsExpectedResults: getJobsExpectedResults(),
        jobsTemplateAuto: isJobsTemplateAuto(),
        jobsTemplateId: getJobsTemplateId(),
        jobsSearchLanguageMode: getJobsSearchLanguageMode(),
        jobsQuery: document.getElementById(
            'jobsQueryInput').value,
        jobsRoleTerms: document.getElementById(
            'jobsRoleTermsInput').value,
        jobsKeywordTerms: document.getElementById(
            'jobsKeywordTermsInput').value,
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
        jobsUseCareerIntelligence: document.getElementById(
            'jobsUseCareerIntelligenceCheckbox'
        ).checked,
        jobsBrazilOffshoreFriendly: document.getElementById(
            'jobsBrazilOffshoreFriendlyCheckbox'
        ).checked,
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
        skipKeywordsTemplate: getSkipKeywordsTemplateId(),
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

    chrome.storage.local.set({
        popupState: state,
        uiLanguageMode: getUiLanguageMode()
    });
}

function loadState() {
    chrome.storage.local.get('groqApiKey', (data) => {
        if (data.groqApiKey) {
            document.getElementById('aiApiKeyInput')
                .value = data.groqApiKey;
        }
    });
    chrome.storage.local.get(
        ['popupState', 'uiLanguageMode'],
        ({ popupState, uiLanguageMode }) => {
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
                'uiLanguageModeSelect',
                uiLanguageMode || DEFAULT_UI_LANGUAGE_MODE,
                DEFAULT_UI_LANGUAGE_MODE
            );
            setSelectValue(
                'connectUsageGoalSelect',
                DEFAULT_CONNECT_USAGE_GOAL,
                DEFAULT_CONNECT_USAGE_GOAL
            );
            setSelectValue(
                'connectSearchLanguageModeSelect',
                DEFAULT_SEARCH_LANGUAGE_MODE,
                DEFAULT_SEARCH_LANGUAGE_MODE
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
                'companySearchLanguageModeSelect',
                DEFAULT_SEARCH_LANGUAGE_MODE,
                DEFAULT_SEARCH_LANGUAGE_MODE
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
                'jobsSearchLanguageModeSelect',
                DEFAULT_SEARCH_LANGUAGE_MODE,
                DEFAULT_SEARCH_LANGUAGE_MODE
            );
            setSelectValue(
                'jobsExpectedResultsSelect',
                DEFAULT_EXPECTED_RESULTS,
                DEFAULT_EXPECTED_RESULTS
            );
            setSelectValue(
                'skipKeywordsTemplateSelect',
                '',
                ''
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
            refreshJobsCareerIntelStatus();
            applyPopupLocalization().catch(() => {});
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
        setSelectValue(
            'uiLanguageModeSelect',
            uiLanguageMode || DEFAULT_UI_LANGUAGE_MODE,
            DEFAULT_UI_LANGUAGE_MODE
        );

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
            'connectSearchLanguageModeSelect',
            popupState.connectSearchLanguageMode ||
                DEFAULT_SEARCH_LANGUAGE_MODE,
            DEFAULT_SEARCH_LANGUAGE_MODE
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
        if (popupState.followFallback !== undefined) {
            const el = document.getElementById(
                'followFallbackCheckbox'
            );
            if (el) el.checked = popupState.followFallback !== false;
        }
        if (popupState.followFirstMode !== undefined) {
            const el = document.getElementById(
                'followFirstModeCheckbox'
            );
            if (el) el.checked = !!popupState.followFirstMode;
        }
        if (popupState.followMax !== undefined) {
            const el = document.getElementById('followMaxInput');
            if (el) el.value = popupState.followMax;
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
                tr(
                    'popup.connect.useTagBuilder',
                    null,
                    'Use tag builder'
                );
            document.querySelectorAll('.tag-group').forEach(
                g => g.style.opacity = '0.4'
            );
            document.getElementById('areaPresetSelect').disabled = true;
            document.getElementById('areaPresetSelect').style.opacity = '0.4';
        }

        document.getElementById('tagSearchInput').value =
            popupUiState.tagSearch || '';
        if (popupUiState.activeRoleArea) {
            const roleFilter = document.getElementById('roleAreaFilter');
            if (roleFilter) {
                roleFilter.querySelectorAll('.area-pill').forEach(p => {
                    p.classList.toggle('active', p.dataset.area === popupUiState.activeRoleArea);
                });
            }
        }
        if (popupUiState.activeIndustryArea) {
            const industryFilter = document.getElementById('industryAreaFilter');
            if (industryFilter) {
                industryFilter.querySelectorAll('.area-pill').forEach(p => {
                    p.classList.toggle('active', p.dataset.area === popupUiState.activeIndustryArea);
                });
            }
        }
        applyTagSearchFilter();
        renderAccordions();
        updateRefineSelectedCount();

        if (popupState.companyQuery) {
            document.getElementById('companyQueryInput').value =
                popupState.companyQuery;
        }
        if (popupState.companyLimit) {
            document.getElementById('companyLimitInput').value =
                popupState.companyLimit;
        } else if (popupState.limit) {
            document.getElementById('companyLimitInput').value =
                popupState.limit;
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
            'companySearchLanguageModeSelect',
            popupState.companySearchLanguageMode ||
                DEFAULT_SEARCH_LANGUAGE_MODE,
            DEFAULT_SEARCH_LANGUAGE_MODE
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
            'jobsSearchLanguageModeSelect',
            popupState.jobsSearchLanguageMode ||
                DEFAULT_SEARCH_LANGUAGE_MODE,
            DEFAULT_SEARCH_LANGUAGE_MODE
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
        if (popupState.jobsKeywordTerms) {
            document.getElementById('jobsKeywordTermsInput').value =
                popupState.jobsKeywordTerms;
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
        if (popupState.jobsUseCareerIntelligence !== undefined) {
            document.getElementById(
                'jobsUseCareerIntelligenceCheckbox'
            ).checked = popupState.jobsUseCareerIntelligence === true;
        }
        if (popupState.jobsBrazilOffshoreFriendly !== undefined) {
            document.getElementById(
                'jobsBrazilOffshoreFriendlyCheckbox'
            ).checked =
                popupState.jobsBrazilOffshoreFriendly === true;
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
        setSelectValue(
            'skipKeywordsTemplateSelect',
            popupState.skipKeywordsTemplate || '',
            ''
        );
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
        refreshJobsCareerIntelStatus();
        applyPopupLocalization().catch(() => {});
    });
}

// --- EVENT LISTENERS ---

const MAX_ACTIVE_TAGS_PER_GROUP = 8;

document.querySelectorAll('.tag').forEach(tag => {
    tag.addEventListener('click', () => {
        if (useCustomQuery) return;
        const isActive = tag.classList.contains('active');
        if (!isActive) {
            const group = tag.dataset.group;
            const activeInGroup = document.querySelectorAll(
                `.tag.active[data-group="${group}"]`
            ).length;
            if (activeInGroup >= MAX_ACTIVE_TAGS_PER_GROUP) {
                tag.classList.add('tag-limit-shake');
                setTimeout(() => tag.classList.remove('tag-limit-shake'), 400);
                return;
            }
        }
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
        toggle.textContent = tr(
            'popup.connect.useTagBuilder',
            null,
            'Use tag builder'
        );
        document.querySelectorAll('.tag-group').forEach(
            g => g.style.opacity = '0.4'
        );
        document.getElementById('areaPresetSelect').disabled = true;
        document.getElementById('areaPresetSelect').style.opacity = '0.4';
    } else {
        input.style.display = 'none';
        toggle.textContent = tr(
            'popup.connect.editQueryManually',
            null,
            'Edit query manually'
        );
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

document.querySelectorAll('.area-filter-pills').forEach(pillsContainer => {
    const targetGroup = pillsContainer.dataset.targetGroup;
    pillsContainer.querySelectorAll('.area-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            applyAreaFilter(pill, targetGroup);
            saveState();
        });
    });
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
document.getElementById('companyLimitInput').addEventListener('change', saveState);
document.getElementById('goalMode').addEventListener('change', saveState);
document.getElementById('connectUsageGoalSelect').addEventListener(
    'change',
    () => {
        refreshTemplateControls();
        updateQueryPreview();
        saveState();
    }
);
document.getElementById('connectSearchLanguageModeSelect').addEventListener(
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
        if (jobsManualResumePending) {
            return resumeJobsManualFlow();
        }
        return startJobsAssist();
    }
    if (currentMode === 'feed') {
        return startFeedEngage();
    }
    return startConnect();
});

function resumeJobsManualFlow() {
    chrome.tabs.query({
        url: [
            'https://www.linkedin.com/jobs/*',
            'https://www.linkedin.com/jobs'
        ]
    }, (tabs) => {
        if (chrome.runtime.lastError) {
            setStatusMessageKey(
                'popup.jobs.manualResumeTabMissing',
                'warning',
                'Could not find the Jobs tab. Open LinkedIn Jobs and continue manually.'
            );
            return;
        }
        if (!Array.isArray(tabs) || tabs.length === 0) {
            setStatusMessageKey(
                'popup.jobs.manualResumeTabNotFound',
                'warning',
                'No open LinkedIn Jobs tab found. Open Jobs and continue manually.'
            );
            return;
        }
        const target = tabs[0];
        chrome.windows.update(target.windowId, { focused: true }, () => {
            if (chrome.runtime.lastError) {
                setStatusMessageKey(
                    'popup.jobs.manualResumeWindowFocusFailed',
                    'warning',
                    'Could not focus the Jobs window. Open LinkedIn Jobs and continue manually.'
                );
                return;
            }
            chrome.tabs.update(target.id, { active: true }, () => {
                if (chrome.runtime.lastError) {
                    setStatusMessageKey(
                        'popup.jobs.manualResumeTabFocusFailed',
                        'warning',
                        'Could not focus the Jobs tab. Open LinkedIn Jobs and continue manually.'
                    );
                    return;
                }
                jobsManualResumePending = false;
                setStatusMessageKey(
                    'popup.jobs.manualResumeFocused',
                    'info',
                    'Switched to LinkedIn Jobs. Continue the Easy Apply flow manually.'
                );
            });
        });
    });
}

async function startConnect() {
    const plan = buildConnectSearchPlan();
    const query = plan.query;
    if (!query) {
        setStatusMessageKey(
            'popup.connect.errorNoQuery',
            'warning',
            'No query built. Select tags or write a custom query.'
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
        setStatusMessageKey(
            'popup.connect.errorNoteTooLong',
            'warning',
            `Note is ${noteText.length} chars (max ${MAX_CHARS}). Shorten it.`,
            [noteText.length, MAX_CHARS]
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
        setStatusMessageKey(
            'popup.connect.errorWeeklyLimitReached',
            'error',
            `Weekly limit reached (${weeklyCount}/${WEEKLY_LIMIT}). Wait until next week or use Engagement mode.`,
            [weeklyCount, WEEKLY_LIMIT]
        );
        return;
    }
    if (!engagementOnly && weeklyCount + limit > WEEKLY_LIMIT) {
        const remaining = WEEKLY_LIMIT - weeklyCount;
        setStatusMessageKey(
            'popup.connect.warningWeeklyLimitAdjusted',
            'warning',
            `Only ${remaining} invites left this week (${weeklyCount}/${WEEKLY_LIMIT}). Limit auto-adjusted to ${remaining}.`,
            [remaining, weeklyCount, WEEKLY_LIMIT]
        );
        document.getElementById('limitInput').value = remaining;
    }
    const geoUrn = getSelectedRegionGeoUrn();
    const activelyHiring = document.getElementById(
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
    const degree2nd = document.getElementById('degree2nd').checked;
    const degree3rd = document.getElementById('degree3rd').checked;
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

    showProgressUI(getProgressVerb('connect', engagementOnly), limit,
        engagementOnly
            ? tr(
                'popup.connect.openingSearchEngagement',
                null,
                'Navigating to search (engagement mode)...'
            )
            : tr(
                'popup.connect.openingSearch',
                null,
                'Navigating to search... Do not close this popup or the tab.'
            )
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
        connectSearchLanguageMode:
            getConnectSearchLanguageMode(),
        activelyHiring,
        networkFilter,
        templateMeta,
        sentUrls,
        engagementOnly,
        followFallback: document.getElementById(
            'followFallbackCheckbox'
        )?.checked !== false,
        followFirstMode: !!document.getElementById(
            'followFirstModeCheckbox'
        )?.checked,
        followMax: Number(
            document.getElementById('followMaxInput')?.value
        ) || 40
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
        setStatusMessageKey(
            'popup.company.errorMissingQuery',
            'warning',
            'Enter a search query, select a company preset, or add target companies.'
        );
        return;
    }

    const companyLimitValue = parseInt(
        document.getElementById('companyLimitInput')?.value,
        10
    );
    const fallbackLimitValue = parseInt(
        document.getElementById('limitInput').value,
        10
    );
    const limit = companyLimitValue || fallbackLimitValue || 50;

    lastReportedSent = 0;
    showProgressUI(
        getProgressVerb('companies'),
        limit,
        tr(
            'popup.company.openingSearch',
            null,
            'Searching companies by name...'
        )
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
        companySearchLanguageMode:
            getCompanySearchLanguageMode(),
        templateMeta: normalizeTemplateMeta(
            plan.meta,
            'companies'
        )
    }, handleLaunchResponse);
}

function startJobsAssist() {
    jobsManualResumePending = false;
    const plan = buildJobsSearchPlan();
    const query = plan.query;
    if (!query) {
        setStatusMessageKey(
            'popup.jobs.errorMissingQuery',
            'warning',
            'Enter a jobs query or select a preset with role terms.'
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
    const roleTerms = parseMultilineList(
        document.getElementById('jobsRoleTermsInput').value
    );

    const locationTerms = parseMultilineList(
        document.getElementById('jobsLocationTermsInput').value
    );
    const keywordTerms = buildJobsKeywordTerms();
    const effectiveRoleTerms = Array.isArray(
        plan?.diagnostics?.roleTerms
    )
        ? plan.diagnostics.roleTerms
        : roleTerms;
    const effectiveLocationTerms = Array.isArray(
        plan?.diagnostics?.locationTerms
    )
        ? plan.diagnostics.locationTerms
        : locationTerms;
    const effectiveKeywordTerms = Array.isArray(
        plan?.diagnostics?.keywords
    )
        ? plan.diagnostics.keywords
        : keywordTerms;
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
    const jobsUseCareerIntelligence = document.getElementById(
        'jobsUseCareerIntelligenceCheckbox'
    ).checked;
    const jobsBrazilOffshoreFriendly = document.getElementById(
        'jobsBrazilOffshoreFriendlyCheckbox'
    ).checked;

    lastReportedSent = 0;
    showProgressUI(
        tr('popup.progress.prepared', null, 'Prepared'),
        limit,
        tr('popup.jobs.openingJobs', null, 'Opening LinkedIn Jobs...')
    );
    chrome.runtime.sendMessage({
        action: 'startJobsAssist',
        query,
        limit,
        areaPreset: jobsAreaPreset,
        roleTerms: effectiveRoleTerms,
        keywordTerms: effectiveKeywordTerms,
        locationTerms: effectiveLocationTerms,
        preferredCompanies,
        excludedCompanies,
        desiredLevels,
        experienceLevel,
        location,
        workType,
        easyApplyOnly,
        jobsUseCareerIntelligence,
        jobsBrazilOffshoreFriendly,
        profileDraft: buildJobsProfilePayload(),
        profilePassphrase,
        jobsUsageGoal: getJobsUsageGoal(),
        jobsExpectedResults: getJobsExpectedResults(),
        jobsTemplateAuto: isJobsTemplateAuto(),
        jobsTemplateId: getJobsTemplateId(),
        jobsSearchLanguageMode: getJobsSearchLanguageMode(),
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
            setStatusMessageKey(
                'popup.feed.errorEnableReactOrComment',
                'warning',
                'Enable at least one: react or comment.'
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
        showProgressUI(
            tr('popup.progress.engaged', null, 'Engaged'),
            limit,
            warmupActive
                ? tr(
                    'popup.feed.warmupRunning',
                    null,
                    'Warmup mode: reacting + learning...'
                )
                : tr(
                    'popup.feed.openingFeed',
                    null,
                    'Navigating to feed...'
                )
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
    stopBtn.textContent = tr('common.stop', null, 'Stop');
    document.getElementById('progressBox')
        .style.display = 'block';
    document.getElementById('progressText').textContent =
        `${verb} 0 / ${limit}`;
    document.getElementById('progressMeta').textContent =
        tr('popup.progress.page', [1], 'Page 1');
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
        setStatusMessageKey(
            'popup.start.errorFailed',
            'error',
            'Failed to start: ' + chrome.runtime.lastError.message,
            [chrome.runtime.lastError.message]
        );
        return;
    }
    if (response?.status === 'blocked') {
        resetProgressUI();
        const reasons = {
            hourly: tr(
                'popup.start.blockedHourly',
                null,
                'Hourly rate limit reached. Try again in ~1 hour.'
            ),
            daily: tr(
                'popup.start.blockedDaily',
                null,
                'Daily rate limit reached. Try again tomorrow.'
            ),
            weekly: tr(
                'popup.start.blockedWeekly',
                null,
                'Weekly limit reached (150). Try next week.'
            ),
            'profile-cache-locked':
                tr(
                    'popup.start.blockedProfileCacheLocked',
                    null,
                    'Encrypted profile cache is locked. Enter the passphrase for this session.'
                ),
            'career-intel-locked':
                tr(
                    'popup.start.blockedCareerIntelLocked',
                    null,
                    'Career intelligence is locked. Enter the session passphrase to unlock it.'
                )
        };
        setStatusMessage(
            reasons[response.reason] ||
            tr(
                'popup.start.blockedDefault',
                null,
                'Rate limit reached. Try again later.'
            ),
            'error'
        );
        return;
    }
    if (response?.status === 'started' &&
        response.warmupActive) {
        setStatusMessageKey(
            'popup.feed.warmupStarted',
            'info',
            `Warmup run ${response.currentRunNumber}/${response.requiredRuns}: reactions + learning, no comments.`,
            [response.currentRunNumber, response.requiredRuns]
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
    stopBtn.textContent = tr('common.stopping', null, 'Stopping...');
    setStatusMessageKey(
        'popup.statusStopping',
        'warning',
        'Stopping automation...'
    );
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
    const reason = String(source.reason || '').toLowerCase();
    const stepCode = String(source.stepCode || '').toLowerCase();
    const isCompanyNoResults = source.mode === 'companies' && (
        reason === 'no-results' ||
        stepCode === 'no-results' ||
        Array.isArray(source.log) &&
            source.log.some((entry) => String(entry?.status || '')
                .toLowerCase() === 'skipped-no-results')
    );
    if (isCompanyNoResults) {
        return 'success';
    }
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

function getDoneFailureMessage(response) {
    const reason = String(response?.reason || '').trim().toLowerCase();
    const stepCode = String(response?.stepCode || '').trim().toLowerCase();
    const isCompaniesMode = response?.mode === 'companies';
    const reasonMessages = isCompaniesMode
        ? {
            'follow-not-confirmed': tr(
                'popup.company.followNotConfirmed',
                null,
                'Follow click attempted but could not be confirmed on LinkedIn UI.'
            ),
            'no-target-matches': tr(
                'popup.company.noTargetMatches',
                null,
                'No company matched the target filter for this run.'
            ),
            'already-following-only': tr(
                'popup.company.alreadyFollowingOnly',
                null,
                'All matched companies were already followed.'
            ),
            'cards-timeout': tr(
                'popup.company.cardsTimeout',
                null,
                'LinkedIn did not load company results in time. Try again.'
            )
        }
        : {
            'follow-not-confirmed':
                'Follow click attempted but could not be confirmed on LinkedIn UI.',
            'no-target-matches':
                'No company matched the target filter for this run.',
            'already-following-only':
                'All matched companies were already followed.'
        };
    if (reasonMessages[reason]) {
        return reasonMessages[reason];
    }
    if (isCompaniesMode && stepCode === 'cards-timeout') {
        return reasonMessages['cards-timeout'];
    }
    return response?.error || response?.message || tr(
        'popup.runNoItemsProcessed',
        null,
        'No items processed.'
    );
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
            connect: getProgressVerb('connect', engMode),
            companies: getProgressVerb('companies'),
            jobs: getProgressVerb('jobs'),
            feed: getProgressVerb('feed')
        };
        const verb = verbMap[currentMode] ||
            tr('common.done', null, 'Done');
        document.getElementById('progressText').textContent =
            `${verb} ${request.sent} / ${request.limit}`;
        const meta = [
            tr('popup.progress.page', [request.page], `Page ${request.page}`)
        ];
        if (request.skipped > 0) {
            meta.push(
                tr(
                    'popup.progress.skipped',
                    [request.skipped],
                    `${request.skipped} skipped`
                )
            );
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
        const isJobsManualRequired = response?.mode === 'jobs' &&
            response?.reason === 'manual-input-required';
        if (isJobsManualRequired) {
            jobsManualResumePending = true;
            setStatusMessage(
                response?.message ||
                    tr(
                        'popup.jobs.manualInputRequired',
                        null,
                        'Manual input required. Complete the application manually.'
                    ),
                'warning'
            );
            startBtn.disabled = false;
            startBtn.textContent = tr(
                'common.continueManually',
                null,
                'Continue Manually'
            );
        } else if (runStatus === 'success') {
            if (response?.mode === 'jobs') {
                jobsManualResumePending = false;
            }
            setStatusMessage(
                tr('common.successPrefix', null, 'Success! ') +
                    (response.message || ''),
                'success'
            );
            startBtn.textContent = tr('common.doneBang', null, 'Done!');
        } else if (runStatus === 'canceled') {
            if (response?.mode === 'jobs') {
                jobsManualResumePending = false;
            }
            setStatusMessage(
                response?.message ||
                    tr(
                        'popup.runCanceled',
                        null,
                        'Run canceled by user.'
                    ),
                'warning'
            );
            startBtn.disabled = false;
            startBtn.textContent = tr(
                'common.startAgain',
                null,
                'Start Again'
            );
        } else {
            if (response?.mode === 'jobs') {
                jobsManualResumePending = false;
            }
            setStatusMessage(
                tr('common.errorPrefix', null, 'Error: ') +
                    getDoneFailureMessage(response),
                'error'
            );
            startBtn.disabled = false;
            startBtn.textContent = tr('common.tryAgain', null, 'Try Again');
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
        btn.textContent = tr('common.checking', null, 'Checking...');
        chrome.runtime.sendMessage(
            { action: 'checkAccepted' },
            (response) => {
                btn.disabled = false;
                btn.textContent = tr(
                    'popup.tools.checkAccepted',
                    null,
                    'Check Accepted Connections'
                );
                if (response?.accepted?.length) {
                    setStatusMessageKey(
                        'popup.tools.acceptedFound',
                        'success',
                        `Found ${response.accepted.length} accepted connections!`,
                        [response.accepted.length]
                    );
                } else {
                    setStatusMessage(
                        response?.error ||
                            tr(
                                'popup.tools.acceptedNone',
                                null,
                                'No new accepted connections found.'
                            ),
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
            link.textContent = r.name ||
                tr('common.unknown', null, 'Unknown');
            nameEl.appendChild(link);
        } else {
            nameEl.textContent = r.name ||
                tr('common.unknown', null, 'Unknown');
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
            badge.textContent = tr('status.sent', null, 'Sent');
        } else if (r.status === 'visited' ||
            r.status === 'followed' ||
            r.status === 'visited-followed') {
            badge.className += 'sent';
            badge.textContent = getRecentProfileStatusLabel(r.status);
        } else {
            badge.className += 'skipped';
            badge.textContent = getRecentProfileStatusLabel(r.status);
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
        connect: tr('popup.start.connect', null, 'Launch Automation'),
        companies: tr('popup.start.companies', null, 'Follow Companies'),
        jobs: tr('popup.start.jobs', null, 'Assist Job Apply'),
        feed: tr('popup.start.feed', null, 'Engage Feed')
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

document.getElementById('uiLanguageModeSelect')
    .addEventListener('change', async () => {
        await applyPopupLocalization();
        saveState();
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
                setStatusMessageKey(
                    'popup.feed.resetWarmupFailed',
                    'error',
                    'Failed to reset warmup progress.'
                );
                return;
            }
            renderFeedWarmupProgress(response);
            setStatusMessageKey(
                'popup.feed.resetWarmupSuccess',
                'success',
                'Warmup learning progress reset.'
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
document.getElementById('companySearchLanguageModeSelect')
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
document.getElementById('jobsSearchLanguageModeSelect')
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
document.getElementById('jobsKeywordTermsInput')
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
document.getElementById('jobsUseCareerIntelligenceCheckbox')
    .addEventListener('change', saveState);
document.getElementById('jobsBrazilOffshoreFriendlyCheckbox')
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
document.getElementById('unlockJobsProfileCacheBtn')
    .addEventListener('click', () => {
        const passphrase = document.getElementById(
            'jobsProfilePassphraseInput'
        ).value;
        if (!passphrase || passphrase.trim().length < 4) {
            setStatusMessageKey(
                'popup.jobs.unlockCachePassphraseRequired',
                'warning',
                'Enter the cache passphrase to unlock profile data.'
            );
            return;
        }
        chrome.runtime.sendMessage({
            action: 'loadJobsProfileCache',
            profilePassphrase: passphrase
        }, (response) => {
            if (chrome.runtime.lastError || !response) {
                setStatusMessageKey(
                    'popup.jobs.unlockCacheFailed',
                    'error',
                    'Failed to unlock encrypted jobs cache.'
                );
                return;
            }
            if (response.status === 'missing') {
                jobsCacheLoadedThisSession = false;
                setStatusMessageKey(
                    'popup.jobs.cacheMissing',
                    'warning',
                    'No encrypted jobs profile cache found.'
                );
                refreshJobsCacheStatus();
                return;
            }
            if (response.status !== 'loaded') {
                jobsCacheLoadedThisSession = false;
                setStatusMessageKey(
                    'popup.jobs.unlockCacheBadPassphrase',
                    'error',
                    'Could not unlock cache. Check your passphrase.'
                );
                refreshJobsCacheStatus();
                return;
            }
            fillJobsProfileFields(response.profile || {});
            jobsCacheLoadedThisSession = true;
            setStatusMessageKey(
                'popup.jobs.cacheUnlocked',
                'success',
                'Encrypted jobs profile cache unlocked.'
            );
            refreshJobsCacheStatus();
        });
    });
document.getElementById('saveJobsProfileCacheBtn')
    .addEventListener('click', () => {
        const passphrase = document.getElementById(
            'jobsProfilePassphraseInput'
        ).value;
        if (!passphrase || passphrase.trim().length < 4) {
            setStatusMessageKey(
                'popup.jobs.sessionPassphraseRequired',
                'warning',
                'Enter a session passphrase with at least 4 characters.'
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
                        tr(
                            'popup.jobs.cacheSaveFailed',
                            null,
                            'Failed to save encrypted jobs cache.'
                        ),
                    'error'
                );
                return;
            }
            setStatusMessageKey(
                'popup.jobs.cacheSaved',
                'success',
                'Encrypted jobs profile cache saved.'
            );
            jobsCacheLoadedThisSession = false;
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
                setStatusMessageKey(
                    'popup.jobs.cacheClearFailed',
                    'error',
                    'Failed to clear jobs profile cache.'
                );
                return;
            }
            setStatusMessageKey(
                'popup.jobs.cacheCleared',
                'success',
                'Encrypted jobs profile cache cleared.'
            );
            jobsCacheLoadedThisSession = false;
            refreshJobsCacheStatus();
        });
    });
document.getElementById('uploadJobsResumesBtn')
    .addEventListener('click', () => {
        document.getElementById('jobsResumeUploadInput')?.click();
    });
document.getElementById('jobsResumeUploadInput')
    .addEventListener('change', async (event) => {
        const files = Array.from(event.target.files || []);
        event.target.value = '';
        if (!files.length) return;
        const passphrase = getJobsCareerPassphrase();
        if (passphrase.length < 4) {
            setStatusMessageKey(
                'popup.jobs.resumeUploadPassphraseRequired',
                'warning',
                'Enter the session passphrase before uploading resumes.'
            );
            return;
        }
        try {
            const currentState = await loadJobsCareerIntelState(passphrase);
            const currentDocs = currentState?.documents || [];
            if (currentDocs.length + files.length >
                MAX_RESUME_FILES) {
                setStatusMessageKey(
                    'popup.jobs.resumeVaultLimit',
                    'warning',
                    `Resume vault limit is ${MAX_RESUME_FILES} files.`,
                    [MAX_RESUME_FILES]
                );
                return;
            }

            for (const file of files) {
                const parsed = await parseResumeFile(file);
                await upsertJobsCareerVaultDocument(
                    parsed,
                    passphrase
                );
            }
            const nextState = await rebuildAndPersistJobsCareerIntel(
                {},
                passphrase
            );
            setStatusMessageKey(
                'popup.jobs.careerUpdated',
                'success',
                `Career intelligence updated from ${nextState.documents.length} resume(s).`,
                [nextState.documents.length]
            );
            saveState();
        } catch (error) {
            setStatusMessage(
                getJobsCareerIntelErrorMessage(error),
                'error'
            );
        }
    });
document.getElementById('importJobsLinkedInProfileBtn')
    .addEventListener('click', () => {
        const passphrase = getJobsCareerPassphrase();
        if (passphrase.length < 4) {
            setStatusMessageKey(
                'popup.jobs.importProfilePassphraseRequired',
                'warning',
                'Enter the session passphrase before importing your profile.'
            );
            return;
        }
        chrome.runtime.sendMessage({
            action: 'importJobsLinkedInProfile'
        }, async (response) => {
            if (chrome.runtime.lastError ||
                response?.status !== 'loaded') {
                setStatusMessage(
                    response?.error ||
                        tr(
                            'popup.jobs.importProfileOpenLinkedIn',
                            null,
                            'Open your LinkedIn profile page before importing.'
                        ),
                    'warning'
                );
                return;
            }
            try {
                await rebuildAndPersistJobsCareerIntel({
                    importedProfile: response.profile
                }, passphrase);
                setStatusMessageKey(
                    'popup.jobs.profileImported',
                    'success',
                    'LinkedIn profile imported into Career Intelligence.'
                );
                saveState();
            } catch (error) {
                setStatusMessage(
                    getJobsCareerIntelErrorMessage(error),
                    'error'
                );
            }
        });
    });
document.getElementById('analyzeJobsCareerBtn')
    .addEventListener('click', () => {
        const passphrase = getJobsCareerPassphrase();
        if (passphrase.length < 4) {
            setStatusMessageKey(
                'popup.jobs.analyzePassphraseRequired',
                'warning',
                'Enter the session passphrase to analyze Career Intelligence.'
            );
            return;
        }
        chrome.runtime.sendMessage({
            action: 'generateJobsCareerPlan',
            profilePassphrase: passphrase,
            expectedResultsBucket: getJobsExpectedResults(),
            searchLanguageMode: getJobsSearchLanguageMode(),
            jobsBrazilOffshoreFriendly: document.getElementById(
                'jobsBrazilOffshoreFriendlyCheckbox'
            ).checked
        }, (response) => {
            if (chrome.runtime.lastError ||
                response?.status !== 'generated') {
                setStatusMessageKey(
                    'popup.jobs.careerUnavailableOrLocked',
                    'warning',
                    'Career intelligence is unavailable or locked.'
                );
                return;
            }
            setJobsCareerStateForSession(response.state, true);
            fillJobsCareerPlan(response.plan);
            refreshJobsCareerIntelStatus();
            updateQueryPreview();
            saveState();
            setStatusMessageKey(
                'popup.jobs.planGenerated',
                'success',
                'Jobs search terms generated from Career Intelligence.'
            );
        });
    });
document.getElementById('clearJobsCareerIntelBtn')
    .addEventListener('click', async () => {
        try {
            await clearJobsCareerVault();
            chrome.runtime.sendMessage({
                action: 'clearJobsCareerIntel'
            }, (response) => {
                if (chrome.runtime.lastError ||
                    response?.status !== 'cleared') {
                    setStatusMessageKey(
                        'popup.jobs.careerClearFailed',
                        'error',
                        'Failed to clear Career Intelligence.'
                    );
                    return;
                }
                setJobsCareerStateForSession(null, false);
                refreshJobsCareerIntelStatus();
                setStatusMessageKey(
                    'popup.jobs.careerCleared',
                    'success',
                    'Career Intelligence cleared.'
                );
            });
        } catch (error) {
            setStatusMessageKey(
                'popup.jobs.careerClearFailed',
                'error',
                'Failed to clear Career Intelligence.'
            );
        }
    });
document.getElementById('jobsCareerDocsList')
    .addEventListener('click', async (event) => {
        const button = event.target.closest(
            '[data-remove-jobs-doc]'
        );
        if (!button) return;
        const passphrase = getJobsCareerPassphrase();
        if (passphrase.length < 4) {
            setStatusMessageKey(
                'popup.jobs.resumeRemovePassphraseRequired',
                'warning',
                'Enter the session passphrase to remove a resume.'
            );
            return;
        }
        try {
            await removeJobsCareerVaultDocument(
                button.dataset.removeJobsDoc
            );
            const nextState = await rebuildAndPersistJobsCareerIntel(
                {},
                passphrase
            );
            setStatusMessageKey(
                'popup.jobs.careerUpdated',
                'success',
                `Career intelligence updated from ${nextState.documents.length} resume(s).`,
                [nextState.documents.length]
            );
        } catch (error) {
            setStatusMessage(
                getJobsCareerIntelErrorMessage(error),
                'error'
            );
        }
    });
document.getElementById('companyQueryInput')
    .addEventListener('input', saveState);
document.getElementById('targetCompanies')
    .addEventListener('input', saveState);
document.getElementById('commentTemplatesInput')
    .addEventListener('input', saveState);
document.getElementById('skipKeywordsInput')
    .addEventListener('input', saveState);
document.getElementById('skipKeywordsTemplateSelect')
    .addEventListener('change', saveState);
document.getElementById('applySkipKeywordsTemplateBtn')
    .addEventListener('click', () => applySkipKeywordsTemplate('replace'));
document.getElementById('appendSkipKeywordsTemplateBtn')
    .addEventListener('click', () => applySkipKeywordsTemplate('append'));
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
    .addEventListener('change', () => {
        const enabled = document.getElementById(
            'companyScheduleCheckbox'
        ).checked;
        if (enabled) {
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
        }
        saveState();
    });

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
            text.textContent = tr(
                'popup.nurture.empty',
                null,
                'No nurture targets yet. Connect with people to start nurturing.'
            );
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

        text.textContent = tr(
            'popup.nurture.summary',
            [list.length, active.length],
            `${list.length} total, ${active.length} active targets ready.`
        );
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

        text.textContent = tr(
            'popup.rateLimits.summary',
            [hourLeft, lim.hourly, dayLeft, lim.daily],
            `Rate limits: ${hourLeft}/${lim.hourly} this hour · ${dayLeft}/${lim.daily} today`
        );

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
