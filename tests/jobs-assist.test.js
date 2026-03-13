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
            makeRuntimeOptions()
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
