/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

function loadPopupHtml() {
    const htmlPath = path.join(
        __dirname,
        '../extension/popup/popup.html'
    );
    const html = fs.readFileSync(htmlPath, 'utf8');
    document.open();
    document.write(html);
    document.close();
}

function createChromeMock() {
    const localStore = {};
    return {
        runtime: {
            sendMessage: jest.fn((message, callback) => {
                if (callback) callback({ ok: true, message });
            }),
            onMessage: { addListener: jest.fn() },
            getURL: jest.fn((p) => p)
        },
        storage: {
            local: {
                get: jest.fn((keys, callback) => {
                    if (Array.isArray(keys)) {
                        const out = {};
                        keys.forEach((k) => {
                            out[k] = localStore[k];
                        });
                        callback(out);
                        return;
                    }
                    if (typeof keys === 'string') {
                        callback({ [keys]: localStore[keys] });
                        return;
                    }
                    callback({ ...localStore });
                }),
                set: jest.fn((data, callback) => {
                    Object.assign(localStore, data || {});
                    if (callback) callback();
                }),
                remove: jest.fn((key, callback) => {
                    if (Array.isArray(key)) {
                        key.forEach((k) => delete localStore[k]);
                    } else {
                        delete localStore[key];
                    }
                    if (callback) callback();
                })
            }
        },
        tabs: {
            query: jest.fn((queryInfo, callback) => {
                callback([
                    {
                        id: 1,
                        url: 'https://www.linkedin.com/feed/'
                    }
                ]);
            }),
            sendMessage: jest.fn((tabId, message, callback) => {
                if (callback) callback({ ok: true });
            }),
            create: jest.fn()
        },
        windows: {
            create: jest.fn()
        }
    };
}

function click(el) {
    el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
}

function selectedCountText() {
    const el = document.getElementById('refineSelectedCount');
    return (el && el.textContent) || '';
}

function switchToJobsMode() {
    const jobsModeBtn = document.querySelector(
        'button.mode-btn[data-mode="jobs"]'
    );
    click(jobsModeBtn);
}

function switchToFeedMode() {
    const feedModeBtn = document.querySelector(
        'button.mode-btn[data-mode="feed"]'
    );
    click(feedModeBtn);
}

function switchToCompaniesMode() {
    const companiesModeBtn = document.querySelector(
        'button.mode-btn[data-mode="companies"]'
    );
    click(companiesModeBtn);
}

describe('popup connect refine runtime', () => {
    let chromeMock;

    beforeEach(() => {
        jest.resetModules();
        jest.useFakeTimers();

        loadPopupHtml();

        chromeMock = createChromeMock();
        global.chrome = chromeMock;
        global.window.chrome = chromeMock;
        global.alert = jest.fn();
        global.confirm = jest.fn(() => true);
        global.prompt = jest.fn(() => '');
        global.navigator.clipboard = {
            writeText: jest.fn().mockResolvedValue(undefined)
        };

        jest.isolateModules(() => {
            require('../extension/popup/popup.js');
        });
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
        delete global.chrome;
        delete global.buildSearchTemplatePlan;
        delete global.alert;
        delete global.confirm;
        delete global.prompt;
    });

    test('applies area pills per target group without cross-group side effects', () => {
        const roleTechPill = document.querySelector(
            '#roleAreaFilter .area-pill[data-area="tech"]'
        );
        const industryFinancePill = document.querySelector(
            '#industryAreaFilter .area-pill[data-area="finance"]'
        );

        const roleTechTag = document.querySelector(
            '#connectSection .tag[data-group="role"][data-area="tech"]'
        );
        const roleRecruitingTag = document.querySelector(
            '#connectSection .tag[data-group="role"][data-area="recruiting"]'
        );

        const industryTechTag = document.querySelector(
            '#connectSection .tag[data-group="industry"][data-area="tech"]'
        );
        const industryFinanceTag = document.querySelector(
            '#connectSection .tag[data-group="industry"][data-area="finance"]'
        );

        expect(roleTechTag.style.display).not.toBe('none');
        expect(roleRecruitingTag.style.display).not.toBe('none');
        expect(industryTechTag.style.display).not.toBe('none');
        expect(industryFinanceTag.style.display).not.toBe('none');

        click(roleTechPill);

        expect(roleTechPill.classList.contains('active')).toBe(true);
        expect(roleTechTag.style.display).not.toBe('none');
        expect(roleRecruitingTag.style.display).toBe('none');

        expect(industryTechTag.style.display).not.toBe('none');
        expect(industryFinanceTag.style.display).not.toBe('none');

        click(industryFinancePill);

        expect(industryFinancePill.classList.contains('active')).toBe(true);
        expect(industryFinanceTag.style.display).not.toBe('none');
        expect(industryTechTag.style.display).toBe('none');

        expect(roleTechTag.style.display).not.toBe('none');
        expect(roleRecruitingTag.style.display).toBe('none');
    });

    test('selected tags remain recoverable and selected count stays correct under area filters', () => {
        const roleAllPill = document.querySelector(
            '#roleAreaFilter .area-pill[data-area=""]'
        );
        const roleTechPill = document.querySelector(
            '#roleAreaFilter .area-pill[data-area="tech"]'
        );
        const roleRecruitingTag = document.querySelector(
            '#connectSection .tag[data-group="role"][data-area="recruiting"]'
        );

        click(roleRecruitingTag);
        expect(roleRecruitingTag.classList.contains('active')).toBe(true);
        expect(selectedCountText()).toContain('1');

        click(roleTechPill);

        expect(roleRecruitingTag.style.display).toBe('none');
        expect(roleRecruitingTag.classList.contains('active')).toBe(true);
        expect(selectedCountText()).toContain('1');

        click(roleAllPill);

        expect(roleRecruitingTag.style.display).not.toBe('none');
        expect(roleRecruitingTag.classList.contains('active')).toBe(true);
        expect(selectedCountText()).toContain('1');
    });

    test('blocks 9th tag in same group and preserves state while shake feedback resets', () => {
        const roleTags = Array.from(
            document.querySelectorAll('#connectSection .tag[data-group="role"]')
        );
        expect(roleTags.length).toBeGreaterThan(8);

        roleTags.slice(0, 8).forEach((tag) => click(tag));
        expect(
            document.querySelectorAll('#connectSection .tag.active[data-group="role"]').length
        ).toBe(8);
        expect(selectedCountText()).toContain('8');

        const setCallsBefore = chromeMock.storage.local.set.mock.calls.length;

        const ninthTag = roleTags[8];
        click(ninthTag);

        expect(ninthTag.classList.contains('active')).toBe(false);
        expect(ninthTag.classList.contains('tag-limit-shake')).toBe(true);
        expect(
            document.querySelectorAll('#connectSection .tag.active[data-group="role"]').length
        ).toBe(8);
        expect(selectedCountText()).toContain('8');
        expect(chromeMock.storage.local.set.mock.calls.length).toBe(setCallsBefore);

        jest.advanceTimersByTime(450);
        expect(ninthTag.classList.contains('tag-limit-shake')).toBe(false);
    });

    test('connect launch payload honors checkbox filters over template filterSpec', async () => {
        global.buildSearchTemplatePlan = jest.fn(() => ({
            query: 'recruiter finance',
            filterSpec: {
                degree2nd: false,
                degree3rd: false,
                activelyHiring: true
            },
            defaults: {},
            meta: { mode: 'connect' },
            diagnostics: {}
        }));

        document.getElementById('degree2nd').checked = true;
        document.getElementById('degree3rd').checked = true;
        document.getElementById('activelyHiringCheckbox').checked = false;

        click(document.getElementById('startBtn'));
        await Promise.resolve();
        await Promise.resolve();

        const launchCall = chromeMock.runtime.sendMessage.mock.calls.find(
            ([message]) => message && message.action === 'start'
        );
        expect(launchCall).toBeTruthy();

        const payload = launchCall[0];
        expect(payload.activelyHiring).toBe(false);
        expect(payload.networkFilter).toBe('%5B%22S%22%2C%22O%22%5D');
    });

    test('skip-keyword template replace overwrites textarea with template terms', () => {
        switchToFeedMode();

        const textarea = document.getElementById('skipKeywordsInput');
        const select = document.getElementById('skipKeywordsTemplateSelect');
        const applyBtn = document.getElementById('applySkipKeywordsTemplateBtn');

        textarea.value = 'legacy\nold-term';
        select.value = 'sponsored';

        click(applyBtn);

        expect(textarea.value).toBe(
            'sponsored\nad\npromoted\nadvertisement\npartnership'
        );
    });

    test('skip-keyword template append preserves existing terms and deduplicates', () => {
        switchToFeedMode();

        const textarea = document.getElementById('skipKeywordsInput');
        const select = document.getElementById('skipKeywordsTemplateSelect');
        const appendBtn = document.getElementById('appendSkipKeywordsTemplateBtn');

        textarea.value = 'custom term\nad\nSponsored';
        select.value = 'sponsored';

        click(appendBtn);

        expect(textarea.value).toBe(
            'custom term\nad\nSponsored\npromoted\nadvertisement\npartnership'
        );
    });

    test('skip-keyword crypto template replace applies expected terms', () => {
        switchToFeedMode();

        const textarea = document.getElementById('skipKeywordsInput');
        const select = document.getElementById('skipKeywordsTemplateSelect');
        const applyBtn = document.getElementById('applySkipKeywordsTemplateBtn');

        textarea.value = 'old';
        select.value = 'crypto_hype';

        click(applyBtn);

        expect(textarea.value).toBe(
            'crypto\nweb3\nnft\ntoken presale\nairdrop'
        );
    });

    test('company batch size update syncs active schedule settings', () => {
        switchToCompaniesMode();

        const scheduleCheckbox = document.getElementById(
            'companyScheduleCheckbox'
        );
        const batchSizeInput = document.getElementById('companyBatchSize');
        const intervalInput = document.getElementById(
            'companyScheduleInterval'
        );

        scheduleCheckbox.checked = true;
        batchSizeInput.value = '7';
        intervalInput.value = '12';

        batchSizeInput.dispatchEvent(new window.Event('change', {
            bubbles: true
        }));

        const scheduleCalls = chromeMock.runtime.sendMessage.mock.calls
            .map((args) => args[0])
            .filter((message) => {
                return message && message.action === 'setCompanySchedule';
            });

        expect(scheduleCalls.length).toBeGreaterThan(0);
        expect(scheduleCalls[scheduleCalls.length - 1]).toEqual(
            expect.objectContaining({
                action: 'setCompanySchedule',
                enabled: true,
                intervalHours: 12,
                batchSize: 7
            })
        );
    });

    test('companies launch payload prefers company-specific limit input', () => {
        switchToCompaniesMode();

        const companyQueryInput = document.getElementById('companyQueryInput');
        const globalLimitInput = document.getElementById('limitInput');
        const companyLimitInput = document.getElementById('companyLimitInput');

        companyQueryInput.value = 'product design studios';
        globalLimitInput.value = '99';
        companyLimitInput.value = '13';

        click(document.getElementById('startBtn'));

        const launchCall = chromeMock.runtime.sendMessage.mock.calls.find(
            ([message]) => message && message.action === 'startCompanyFollow'
        );
        expect(launchCall).toBeTruthy();
        expect(launchCall[0].limit).toBe(13);
    });

    test('companies area preset select keeps only generic tech preset', () => {
        switchToCompaniesMode();

        const select = document.getElementById('companyAreaPresetSelect');
        const values = Array.from(select.options).map((option) => option.value);

        expect(values).toContain('tech');
        expect(values).not.toContain('tech-fullstack');
        expect(values).not.toContain('tech-frontend');
        expect(values).not.toContain('tech-backend');
    });

    test('companies done no-results with zero processed is treated as success in popup', () => {
        const listener = chromeMock.runtime.onMessage.addListener.mock.calls[0][0];
        const statusBox = document.getElementById('statusBox');
        const startBtn = document.getElementById('startBtn');

        listener({
            action: 'done',
            result: {
                mode: 'companies',
                reason: 'no-results',
                stepCode: 'no-results',
                processedCount: 0,
                actionCount: 0,
                success: true,
                message: 'No results found for this query.'
            }
        });

        expect(statusBox.textContent).toContain('Success!');
        expect(startBtn.textContent).toBe('Done!');
    });

    test('jobs planner treats blank refine fields as missing, not explicit empty arrays', () => {
        global.buildSearchTemplatePlan = jest.fn((opts) => ({
            query: 'software engineer remote easy apply',
            filterSpec: {},
            defaults: {},
            meta: { mode: 'jobs', source: 'template', optionsEcho: opts },
            diagnostics: {
                roleTerms: ['software engineer'],
                locationTerms: ['remote'],
                keywords: ['easy apply']
            }
        }));

        switchToJobsMode();

        document.getElementById('jobsQueryInput').value = '';
        document.getElementById('jobsRoleTermsInput').value = '';
        document.getElementById('jobsLocationTermsInput').value = '';
        document.getElementById('jobsKeywordTermsInput').value = '';

        click(document.getElementById('startBtn'));

        expect(global.buildSearchTemplatePlan).toHaveBeenCalled();
        const plannerArg = global.buildSearchTemplatePlan.mock.calls[0][0];
        expect(plannerArg.mode).toBe('jobs');
        expect(plannerArg.roleTerms).toBeUndefined();
        expect(plannerArg.locationTerms).toBeUndefined();
        expect(plannerArg.keywords).toBeUndefined();

        const launchCall = chromeMock.runtime.sendMessage.mock.calls.find(
            ([message]) => message && message.action === 'startJobsAssist'
        );
        expect(launchCall).toBeTruthy();

        const payload = launchCall[0];
        expect(typeof payload.query).toBe('string');
        expect(payload.query.trim().length).toBeGreaterThan(0);
        expect(payload.roleTerms).toEqual(['software engineer']);
        expect(payload.locationTerms).toEqual(['remote']);
        expect(payload.keywordTerms).toEqual(['easy apply']);
    });
});
