/**
 * @jest-environment jsdom
 */

describe('jobs-assist easy apply progression', () => {
    let jobsAssist;

    function addJobCard(id = '4383833496') {
        const card = document.createElement('div');
        card.className = 'job-card-container';
        const title = document.createElement('a');
        title.href = `https://www.linkedin.com/jobs/view/${id}`;
        title.textContent = 'Senior Frontend Developer';
        title.addEventListener('click', (event) => {
            event.preventDefault();
        });
        card.appendChild(title);
        document.body.appendChild(card);
        return {
            id,
            jobUrl: `https://www.linkedin.com/jobs/view/${id}`,
            title: 'Senior Frontend Developer',
            company: 'CI&T'
        };
    }

    function makeRuntimeOptions() {
        return {
            openCardScrollMs: 0,
            openCardOpenMs: 0,
            afterApplyClickMs: 0,
            afterStepClickMs: 0,
            modalPollTimeoutMs: 30,
            modalPollIntervalMs: 1,
            stepPollTimeoutMs: 30,
            stepPollIntervalMs: 1,
            maxModalSteps: 8
        };
    }

    beforeEach(() => {
        jest.resetModules();
        document.body.innerHTML = '';
        delete window.linkedInJobsAssistInjected;
        jobsAssist = require('../extension/jobs-assist');
    });

    afterEach(() => {
        document.body.innerHTML = '';
        delete window.linkedInJobsAssistInjected;
    });

    it('handles Next -> Review -> Submit visibility without clicking submit', async () => {
        const job = addJobCard();
        const applyBtn = document.createElement('button');
        applyBtn.textContent = 'Easy Apply';
        document.body.appendChild(applyBtn);

        const modal = document.createElement('div');
        modal.className = 'jobs-easy-apply-modal';
        document.body.appendChild(modal);

        let step = 0;
        let submitClicked = false;

        const renderStep = () => {
            modal.innerHTML = '';
            const title = document.createElement('div');
            title.textContent = 'Application';
            modal.appendChild(title);

            if (step === 1) {
                const input = document.createElement('input');
                input.required = true;
                input.setAttribute('aria-label', 'Full name');
                modal.appendChild(input);

                const next = document.createElement('button');
                next.textContent = 'Next';
                next.addEventListener('click', () => {
                    step = 2;
                    renderStep();
                });
                modal.appendChild(next);
                return;
            }

            if (step === 2) {
                const review = document.createElement('button');
                review.textContent = 'Review';
                review.addEventListener('click', () => {
                    step = 3;
                    renderStep();
                });
                modal.appendChild(review);
                return;
            }

            const submit = document.createElement('button');
            submit.textContent = 'Submit application';
            submit.addEventListener('click', () => {
                submitClicked = true;
            });
            modal.appendChild(submit);
        };

        applyBtn.addEventListener('click', () => {
            step = 1;
            renderStep();
        });

        const result = await jobsAssist.prepareJobForManualReview(
            job,
            { fullName: 'Lucas Santana' },
            makeRuntimeOptions()
        );

        expect(result.status).toBe('ready-manual-review');
        expect(submitClicked).toBe(false);
    });

    it('treats prefilled required input value as filled even when no value attribute exists', async () => {
        const job = addJobCard('4383833497');
        const applyBtn = document.createElement('button');
        applyBtn.textContent = 'Easy Apply';
        document.body.appendChild(applyBtn);

        const modal = document.createElement('div');
        modal.className = 'jobs-easy-apply-modal';
        document.body.appendChild(modal);

        let step = 0;
        const renderStep = () => {
            modal.innerHTML = '';
            const title = document.createElement('div');
            title.textContent = 'Apply';
            modal.appendChild(title);

            if (step === 1) {
                const phone = document.createElement('input');
                phone.required = true;
                phone.setAttribute('aria-label', 'Mobile phone number');
                phone.value = '62981635803';
                phone.removeAttribute('value');
                modal.appendChild(phone);

                const next = document.createElement('button');
                next.textContent = 'Next';
                next.addEventListener('click', () => {
                    step = 2;
                    renderStep();
                });
                modal.appendChild(next);
                return;
            }

            const submit = document.createElement('button');
            submit.textContent = 'Submit application';
            modal.appendChild(submit);
        };

        applyBtn.addEventListener('click', () => {
            step = 1;
            renderStep();
        });

        const result = await jobsAssist.prepareJobForManualReview(
            job,
            {},
            {
                ...makeRuntimeOptions(),
                stepPollTimeoutMs: 200
            }
        );

        expect(result.status).toBe('ready-manual-review');
    });

    it('returns needs-manual-input when required fields are missing before next step', async () => {
        const job = addJobCard('4383833498');
        const applyBtn = document.createElement('button');
        applyBtn.textContent = 'Easy Apply';
        document.body.appendChild(applyBtn);

        const modal = document.createElement('div');
        modal.className = 'jobs-easy-apply-modal';
        document.body.appendChild(modal);

        applyBtn.addEventListener('click', () => {
            modal.innerHTML = '';
            const title = document.createElement('div');
            title.textContent = 'Application';
            modal.appendChild(title);

            const input = document.createElement('input');
            input.required = true;
            input.setAttribute('aria-label', 'Mobile phone number');
            modal.appendChild(input);

            const next = document.createElement('button');
            next.textContent = 'Next';
            modal.appendChild(next);
        });

        const result = await jobsAssist.prepareJobForManualReview(
            job,
            {},
            makeRuntimeOptions()
        );

        expect(result.status).toBe('needs-manual-input');
        expect(result.reason).toBe('required-fields-missing');
    });

    it('does not autofill business name fields with fullName', async () => {
        const job = addJobCard('4383833502');
        const applyBtn = document.createElement('button');
        applyBtn.textContent = 'Easy Apply';
        document.body.appendChild(applyBtn);

        const modal = document.createElement('div');
        modal.className = 'jobs-easy-apply-modal';
        document.body.appendChild(modal);
        let companyField;

        applyBtn.addEventListener('click', () => {
            modal.innerHTML = '';
            const title = document.createElement('div');
            title.textContent = 'Application';
            modal.appendChild(title);

            companyField = document.createElement('input');
            companyField.required = true;
            companyField.setAttribute('aria-label', 'Company name');
            modal.appendChild(companyField);

            const next = document.createElement('button');
            next.textContent = 'Next';
            modal.appendChild(next);
        });

        const result = await jobsAssist.prepareJobForManualReview(
            job,
            { fullName: 'Lucas Santana' },
            makeRuntimeOptions()
        );

        expect(result.status).toBe('needs-manual-input');
        expect(result.reason).toBe('required-fields-missing');
        expect(companyField.value).toBe('');
    });

    it('returns modal-closed when dialog disappears between step iterations', async () => {
        const job = addJobCard('4383833503');
        const applyBtn = document.createElement('button');
        applyBtn.textContent = 'Easy Apply';
        document.body.appendChild(applyBtn);

        const modal = document.createElement('div');
        modal.className = 'jobs-easy-apply-modal';
        document.body.appendChild(modal);
        let step = 0;

        const renderStep = () => {
            modal.innerHTML = '';
            const title = document.createElement('div');
            title.textContent = 'Application';
            modal.appendChild(title);
            if (step === 1) {
                const review = document.createElement('button');
                review.textContent = 'Review';
                review.addEventListener('click', () => {
                    step = 2;
                    renderStep();
                    setTimeout(() => {
                        if (modal.isConnected) modal.remove();
                    }, 5);
                });
                modal.appendChild(review);
                return;
            }
            const submit = document.createElement('button');
            submit.textContent = 'Submit application';
            modal.appendChild(submit);
        };

        applyBtn.addEventListener('click', () => {
            step = 1;
            renderStep();
        });

        const result = await jobsAssist.prepareJobForManualReview(
            job,
            {},
            {
                ...makeRuntimeOptions(),
                afterStepClickMs: 20
            }
        );

        expect(result.status).toBe('needs-manual-input');
        expect(result.reason).toBe('modal-closed');
    });

    it('returns modal-closed when review transition closes modal', async () => {
        const job = addJobCard('4383833500');
        const applyBtn = document.createElement('button');
        applyBtn.textContent = 'Easy Apply';
        document.body.appendChild(applyBtn);

        const modal = document.createElement('div');
        modal.className = 'jobs-easy-apply-modal';
        document.body.appendChild(modal);

        applyBtn.addEventListener('click', () => {
            modal.innerHTML = '';
            const title = document.createElement('div');
            title.textContent = 'Review step';
            modal.appendChild(title);

            const review = document.createElement('button');
            review.textContent = 'Review';
            review.addEventListener('click', () => {
                modal.remove();
            });
            modal.appendChild(review);
        });

        const result = await jobsAssist.prepareJobForManualReview(
            job,
            {},
            makeRuntimeOptions()
        );

        expect(result.status).toBe('needs-manual-input');
        expect(result.reason).toBe('modal-closed');
        expect(result.diagnostics).toEqual(
            expect.objectContaining({
                stepCount: 1,
                waitedMs: expect.any(Number)
            })
        );
    });

    it('returns deterministic timeout diagnostics when easy-apply modal never appears', async () => {
        const job = addJobCard('4383833499');
        const applyBtn = document.createElement('button');
        applyBtn.textContent = 'Easy Apply';
        document.body.appendChild(applyBtn);

        const result = await jobsAssist.prepareJobForManualReview(
            job,
            {},
            makeRuntimeOptions()
        );

        expect(result.status).toBe('needs-manual-input');
        expect(result.reason).toBe('modal-timeout');
        expect(result.diagnostics).toEqual(
            expect.objectContaining({
                waitedMs: expect.any(Number)
            })
        );
    });
});

describe('getModalSignature step-change detection (#146)', () => {
    let api;
    beforeEach(() => {
        jest.resetModules();
        document.body.innerHTML = '';
        delete window.linkedInJobsAssistInjected;
        api = require('../extension/jobs-assist');
    });

    function modalWith(fieldLabel) {
        const modal = document.createElement('div');
        modal.className = 'jobs-easy-apply-modal';
        const h = document.createElement('h2');
        h.textContent = 'Application';
        modal.appendChild(h);
        const input = document.createElement('input');
        input.setAttribute('aria-label', fieldLabel);
        modal.appendChild(input);
        const review = document.createElement('button');
        review.textContent = 'Review';
        modal.appendChild(review);
        document.body.appendChild(modal);
        return modal;
    }

    it('distinguishes steps sharing buttons/headline but differing in fields', () => {
        const a = modalWith('Full name');
        const sigA = api.getModalSignature(a);
        document.body.innerHTML = '';
        const b = modalWith('Phone number');
        const sigB = api.getModalSignature(b);
        // Same enabled buttons ("Review"), same headline ("Application"), same
        // required count (0) — only the field differs. The signature must still
        // change so waitForModalStepChange detects the step advance (#146).
        expect(sigA).not.toBe(sigB);
    });

    it('is stable for the same modal content', () => {
        const a = modalWith('Full name');
        const sig1 = api.getModalSignature(a);
        const sig2 = api.getModalSignature(a);
        expect(sig1).toBe(sig2);
    });
});

describe('fillKnownFields — J1 years-of-experience and J2 name-split', () => {
    let fill;

    function makeSelect(ariaLabel, options) {
        const sel = document.createElement('select');
        sel.setAttribute('aria-label', ariaLabel);
        options.forEach(({ value, text }) => {
            const opt = document.createElement('option');
            opt.value = value;
            opt.textContent = text;
            sel.appendChild(opt);
        });
        return sel;
    }

    function makeInput(ariaLabel) {
        const inp = document.createElement('input');
        inp.setAttribute('aria-label', ariaLabel);
        return inp;
    }

    function makeModal(...elements) {
        const modal = document.createElement('div');
        elements.forEach(el => modal.appendChild(el));
        document.body.appendChild(modal);
        return modal;
    }

    // Values are string IDs (as LinkedIn uses), NOT year numbers,
    // so findMatchingOptionValue falls through to text fuzzy match.
    // Placeholder with empty value mimics LinkedIn's actual select markup;
    // without it jsdom auto-selects the first option and the "already filled"
    // guard in setSelectOption returns false prematurely.
    const YOE_OPTIONS = [
        { value: '', text: 'Select an option' },
        { value: 'ENTRY', text: '0-1 years' },
        { value: 'JUNIOR', text: '2-4 years' },
        { value: 'MID', text: '5-7 years' },
        { value: 'SENIOR', text: '8-10 years' },
        { value: 'LEAD', text: '11+ years' }
    ];

    beforeEach(() => {
        jest.resetModules();
        document.body.innerHTML = '';
        delete window.linkedInJobsAssistInjected;
        require('../extension/lib/text-utils');
        require('../extension/lib/jobs-utils');
        require('../extension/jobs-assist');
        fill = window.__LINKEDIN_JOBS_ASSIST_TEST_API__.fillKnownFields;
    });

    afterEach(() => {
        document.body.innerHTML = '';
        delete window.linkedInJobsAssistInjected;
    });

    // J1 — years-of-experience select filling

    it('J1: fills years-of-experience select for senior title', () => {
        const sel = makeSelect('Years of experience', YOE_OPTIONS);
        const modal = makeModal(sel);
        fill(modal, { currentTitle: 'Senior Software Engineer' });
        // senior → hint "5" → fuzzy: "5-7 years".includes("5") → 'MID'
        expect(sel.value).toBe('MID');
    });

    it('J1: fills years-of-experience select for junior title', () => {
        const sel = makeSelect('Years of experience', YOE_OPTIONS);
        const modal = makeModal(sel);
        fill(modal, { currentTitle: 'Junior Developer' });
        // junior → hint "1" → fuzzy: "0-1 years".includes("1") → 'ENTRY'
        expect(sel.value).toBe('ENTRY');
    });

    it('J1: fills years-of-experience select for lead/staff title', () => {
        const sel = makeSelect('Years of experience', YOE_OPTIONS);
        const modal = makeModal(sel);
        fill(modal, { currentTitle: 'Staff Engineer' });
        // staff → hint "8" → fuzzy: "8-10 years".includes("8") → 'SENIOR'
        expect(sel.value).toBe('SENIOR');
    });

    it('J1: fills years-of-experience with mid default when no seniority signal', () => {
        const sel = makeSelect('Years of experience', YOE_OPTIONS);
        const modal = makeModal(sel);
        fill(modal, { currentTitle: 'Software Engineer' });
        // no signal → hint "4" → fuzzy: "2-4 years".includes("4") → 'JUNIOR'
        expect(sel.value).toBe('JUNIOR');
    });

    it('J1: also matches PT-BR anos de experiencia label', () => {
        const sel = makeSelect('Anos de experiencia', YOE_OPTIONS);
        const modal = makeModal(sel);
        fill(modal, { currentTitle: 'Senior Engineer' });
        // anos.*experiencia pattern → senior → 'MID'
        expect(sel.value).toBe('MID');
    });

    it('J1: fills years-of-experience select for PT-BR intern title (estagiario)', () => {
        const sel = makeSelect('Years of experience', YOE_OPTIONS);
        const modal = makeModal(sel);
        fill(modal, { currentTitle: 'Estagiário de Software' });
        // estagiario → hint "0" → fuzzy: "0-1 years".includes("0") → 'ENTRY'
        expect(sel.value).toBe('ENTRY');
    });

    it('J1: does not fill years-of-experience text input (only selects)', () => {
        const inp = makeInput('Years of experience');
        const modal = makeModal(inp);
        fill(modal, { currentTitle: 'Senior Software Engineer' });
        expect(inp.value).toBe('');
    });

    // J2 — first / last name split

    it('J2: fills first-name input from fullName', () => {
        const inp = makeInput('First name');
        const modal = makeModal(inp);
        fill(modal, { fullName: 'Lucas Santana' });
        expect(inp.value).toBe('Lucas');
    });

    it('J2: fills last-name input from fullName', () => {
        const inp = makeInput('Last name');
        const modal = makeModal(inp);
        fill(modal, { fullName: 'Lucas Santana' });
        expect(inp.value).toBe('Santana');
    });

    it('J2: preserves multi-part last names', () => {
        const first = makeInput('First name');
        const last = makeInput('Last name');
        const modal = makeModal(first, last);
        fill(modal, { fullName: 'Lucas Santos Silva' });
        expect(first.value).toBe('Lucas');
        expect(last.value).toBe('Santos Silva');
    });

    it('J2: does not fill last-name when fullName has single word', () => {
        const inp = makeInput('Last name');
        const modal = makeModal(inp);
        fill(modal, { fullName: 'Lucas' });
        expect(inp.value).toBe('');
    });

    it('J2: fills PT-BR sobrenome field', () => {
        const inp = makeInput('Sobrenome');
        const modal = makeModal(inp);
        fill(modal, { fullName: 'Lucas Santana' });
        expect(inp.value).toBe('Santana');
    });

    it('J2: does not treat "first and last name" as a first-name-only field', () => {
        // This is handled by the existing full-name pattern — should remain filled with fullName
        const inp = makeInput('First and last name');
        const modal = makeModal(inp);
        fill(modal, { fullName: 'Lucas Santana' });
        // The existing full-name pattern fires first; value is the full name, not split
        expect(inp.value).toBe('Lucas Santana');
    });
});
