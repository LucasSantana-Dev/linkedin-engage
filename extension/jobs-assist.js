if (typeof window.linkedInJobsAssistInjected === 'undefined') {
    window.linkedInJobsAssistInjected = true;

    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    let stopRequested = false;
    let running = false;
    const jobsLog = [];

    function detectChallenge() {
        const url = window.location.href || '';
        if (/checkpoint|authwall|challenge/i.test(url)) {
            return true;
        }
        const text = String(document.body?.innerText || '')
            .substring(0, 3000);
        return /security verification|unusual activity|captcha|verificacao de seguranca/i
            .test(text);
    }

    function reportProgress(sent, limit, page, skipped) {
        window.postMessage({
            type: 'LINKEDIN_BOT_PROGRESS',
            sent,
            limit,
            page,
            skipped
        }, '*');
    }

    function normalized(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
    }

    function parsePostedHours(text) {
        const raw = normalized(text);
        if (!raw) return null;
        const minuteMatch = raw.match(/(\d+)\s*(minute|minuto)/);
        if (minuteMatch) return 1;
        const hourMatch = raw.match(/(\d+)\s*(hour|hora)/);
        if (hourMatch) return parseInt(hourMatch[1], 10);
        const dayMatch = raw.match(/(\d+)\s*(day|dia)/);
        if (dayMatch) return parseInt(dayMatch[1], 10) * 24;
        const weekMatch = raw.match(/(\d+)\s*(week|semana)/);
        if (weekMatch) return parseInt(weekMatch[1], 10) * 24 * 7;
        return null;
    }

    function inferWorkType(text) {
        const raw = normalized(text);
        if (!raw) return '';
        if (/remote|remoto/.test(raw)) return 'remote';
        if (/hybrid|hibrido|híbrido/.test(raw)) return 'hybrid';
        if (/on site|onsite|presencial/.test(raw)) return 'onsite';
        return '';
    }

    function extractJobFromCard(card, idx) {
        const titleEl = card.querySelector(
            '.job-card-list__title, ' +
            '.job-card-container__link, ' +
            'a[href*="/jobs/view/"]'
        );
        const companyEl = card.querySelector(
            '.job-card-container__company-name, ' +
            '.artdeco-entity-lockup__subtitle, ' +
            '.job-card-container__primary-description'
        );
        const locationEl = card.querySelector(
            '.job-card-container__metadata-item, ' +
            '.artdeco-entity-lockup__caption'
        );
        const timeEl = card.querySelector('time, .job-card-list__footer-wrapper');
        const linkEl = card.querySelector('a[href*="/jobs/view/"]');

        const title = String(titleEl?.innerText || '')
            .split('\n')[0].trim();
        const company = String(companyEl?.innerText || '')
            .split('\n')[0].trim();
        const location = String(locationEl?.innerText || '')
            .split('\n')[0].trim();
        const postedText = String(timeEl?.innerText || '').trim();
        const postedHoursAgo = parsePostedHours(postedText);
        const jobUrl = linkEl
            ? linkEl.href.split('?')[0]
            : '';
        const idMatch = jobUrl.match(/\/jobs\/view\/(\d+)/);
        const id = idMatch?.[1] || card.dataset.jobId || `job-${idx}`;
        const cardText = normalized(card.innerText || '');

        return {
            id,
            jobUrl,
            title,
            company,
            location,
            easyApply: /easy apply|candidatura simplificada/.test(cardText),
            alreadyApplied: /applied|candidatura enviada|ja se candidatou/.test(cardText),
            postedHoursAgo,
            seniority: title,
            workType: inferWorkType(`${location} ${cardText}`)
        };
    }

    function findJobCards() {
        return Array.from(document.querySelectorAll(
            '.jobs-search-results-list li, ' +
            '.scaffold-layout__list-item, ' +
            '.job-card-container'
        ));
    }

    async function collectVisibleJobs() {
        for (let i = 0; i < 4; i++) {
            window.scrollBy(0, 400);
            await delay(300);
        }
        return findJobCards();
    }

    function setInputValue(input, value) {
        const nextValue = String(value || '').trim();
        if (!nextValue) return false;
        if (input.value && String(input.value).trim()) return false;
        const prototype = Object.getPrototypeOf(input);
        const descriptor = Object.getOwnPropertyDescriptor(
            prototype,
            'value'
        );
        if (descriptor?.set) {
            descriptor.set.call(input, nextValue);
        } else {
            input.value = nextValue;
        }
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('blur', { bubbles: true }));
        return true;
    }

    function fillKnownFields(modal, profile) {
        const source = profile && typeof profile === 'object'
            ? profile
            : {};
        const fields = Array.from(modal.querySelectorAll(
            'input:not([type="hidden"]):not([disabled]), ' +
            'textarea:not([disabled])'
        ));
        let filled = 0;

        for (const field of fields) {
            const hint = normalized(
                `${field.getAttribute('aria-label') || ''} ` +
                `${field.getAttribute('name') || ''} ` +
                `${field.getAttribute('placeholder') || ''}`
            );
            if (!hint) continue;

            if ((/email/.test(hint) || field.type === 'email') &&
                setInputValue(field, source.email)) {
                filled++;
                continue;
            }
            if ((/phone|telefone|celular/.test(hint) ||
                field.type === 'tel') &&
                setInputValue(field, source.phone)) {
                filled++;
                continue;
            }
            if (/full name|nome completo|your name|name/.test(hint) &&
                setInputValue(field, source.fullName)) {
                filled++;
                continue;
            }
            if (/headline|current title|cargo atual|title/.test(hint) &&
                setInputValue(field, source.currentTitle || source.headline)) {
                filled++;
                continue;
            }
            if (/portfolio|website|site/.test(hint) &&
                setInputValue(field, source.portfolioUrl || source.website)) {
                filled++;
                continue;
            }
            if (/city|location|cidade|localizacao/.test(hint) &&
                setInputValue(field, source.city || source.location)) {
                filled++;
                continue;
            }
            if (/summary|about|resumo|cover letter/.test(hint) &&
                setInputValue(field, source.resumeSummary)) {
                filled++;
            }
        }

        return filled;
    }

    function findEasyApplyButton() {
        const buttons = Array.from(document.querySelectorAll(
            'button'
        ));
        for (const btn of buttons) {
            const text = normalized(
                btn.innerText || btn.textContent || ''
            );
            const aria = normalized(btn.getAttribute('aria-label') || '');
            if (btn.disabled) continue;
            if (/easy apply|candidatura simplificada/.test(text) ||
                /easy apply|candidatura simplificada/.test(aria)) {
                return btn;
            }
        }
        return null;
    }

    function findModalDialog() {
        const dialogs = Array.from(document.querySelectorAll(
            '.jobs-easy-apply-modal, ' +
            '.artdeco-modal[role="dialog"], ' +
            'div[role="dialog"]'
        ));
        return dialogs.find(dialog => {
            const text = normalized(dialog.innerText || '');
            return /apply|candidatura|application|review|enviar/.test(text);
        }) || null;
    }

    function findModalButton(modal, pattern) {
        const buttons = Array.from(modal.querySelectorAll('button'));
        for (const btn of buttons) {
            if (btn.disabled) continue;
            const text = normalized(btn.innerText || btn.textContent || '');
            const aria = normalized(btn.getAttribute('aria-label') || '');
            if (pattern.test(text) || pattern.test(aria)) {
                return btn;
            }
        }
        return null;
    }

    async function openCard(job) {
        const selectors = [
            `a[href*="/jobs/view/${job.id}"]`,
            `a[href="${job.jobUrl}"]`
        ];
        for (const selector of selectors) {
            if (!selector) continue;
            const link = document.querySelector(selector);
            if (!link) continue;
            link.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await delay(300);
            link.click();
            await delay(900);
            return true;
        }
        return false;
    }

    async function prepareJobForManualReview(job, profile) {
        if (!(await openCard(job))) {
            return { status: 'needs-manual-input', reason: 'open-card-failed' };
        }

        const applyBtn = findEasyApplyButton();
        if (!applyBtn) {
            return { status: 'skipped-no-easy-apply' };
        }

        applyBtn.click();
        await delay(800);

        const modal = findModalDialog();
        if (!modal) {
            return { status: 'needs-manual-input', reason: 'modal-not-found' };
        }

        const filledFields = fillKnownFields(modal, profile);
        const reviewBtn = findModalButton(modal, /review|revisar/);
        if (reviewBtn) {
            reviewBtn.click();
            await delay(600);
        }

        const submitBtn = findModalButton(
            modal,
            /submit|enviar candidatura|send application|apply now/
        );
        if (submitBtn) {
            return {
                status: 'ready-manual-review',
                filledFields
            };
        }

        const requiredEmpty = modal.querySelectorAll(
            'input[required]:not([value]), textarea[required]:empty'
        ).length;
        if (requiredEmpty > 0) {
            return {
                status: 'needs-manual-input',
                filledFields
            };
        }

        return {
            status: 'ready-manual-review',
            filledFields
        };
    }

    async function runJobsAssist(config) {
        jobsLog.length = 0;
        stopRequested = false;
        const limit = Math.max(1, parseInt(config?.limit, 10) || 10);
        const rankedLimit = Math.min(200, limit);

        if (detectChallenge()) {
            return {
                success: false,
                mode: 'jobs',
                error: 'Security challenge detected.',
                stepCode: 'challenge',
                log: []
            };
        }

        let cards = await collectVisibleJobs();
        if (!cards.length) {
            return {
                success: true,
                mode: 'jobs',
                message: 'No jobs found on current page.',
                log: [{
                    status: 'skipped-no-results',
                    time: new Date().toISOString()
                }]
            };
        }

        const jobs = cards.map(extractJobFromCard);
        const ranked = typeof rankJobsForApply === 'function'
            ? rankJobsForApply(jobs, config)
            : jobs;

        let processed = 0;
        let skipped = 0;
        for (const job of ranked.slice(0, rankedLimit)) {
            if (stopRequested) break;
            if (detectChallenge()) {
                return {
                    success: false,
                    mode: 'jobs',
                    error: 'Security challenge detected.',
                    stepCode: 'challenge',
                    log: jobsLog
                };
            }

            if (job.skipReason) {
                jobsLog.push({
                    id: job.id,
                    title: job.title,
                    company: job.company,
                    jobUrl: job.jobUrl,
                    status: job.skipReason,
                    matchedCompany: job.matchedExcludedCompany || '',
                    time: new Date().toISOString()
                });
                skipped++;
                processed++;
                reportProgress(processed, rankedLimit, 1, skipped);
                continue;
            }

            const prepared = await prepareJobForManualReview(
                job,
                config?.profile || {}
            );
            jobsLog.push({
                id: job.id,
                title: job.title,
                company: job.company,
                jobUrl: job.jobUrl,
                score: job.score,
                status: prepared.status,
                filledFields: prepared.filledFields || 0,
                time: new Date().toISOString()
            });
            processed++;
            if (prepared.status.startsWith('skipped') ||
                prepared.status === 'needs-manual-input') {
                skipped++;
            }
            reportProgress(processed, rankedLimit, 1, skipped);

            if (prepared.status === 'ready-manual-review') {
                return {
                    success: true,
                    mode: 'jobs',
                    message: 'Job application prepared. Review and submit manually.',
                    log: jobsLog
                };
            }
        }

        return {
            success: true,
            mode: 'jobs',
            message: stopRequested
                ? 'Stopped by user.'
                : 'No job reached manual-review stage.',
            log: jobsLog
        };
    }

    window.addEventListener('message', async (event) => {
        if (event.source !== window) return;
        if (event.data?.type === 'LINKEDIN_BOT_STOP') {
            stopRequested = true;
            return;
        }
        if (event.data?.type !== 'LINKEDIN_JOBS_ASSIST_START') return;
        if (running) return;
        running = true;

        try {
            const result = await runJobsAssist(
                event.data.config || {}
            );
            const runtimeResult = result &&
                typeof result === 'object'
                ? { ...result }
                : result;
            const templateMeta = event.data.config
                ?.templateMeta;
            if (runtimeResult &&
                typeof runtimeResult === 'object' &&
                templateMeta &&
                !runtimeResult.templateMeta) {
                runtimeResult.templateMeta = templateMeta;
            }
            window.postMessage({
                type: 'LINKEDIN_BOT_DONE',
                result: runtimeResult
            }, '*');
        } catch (err) {
            window.postMessage({
                type: 'LINKEDIN_BOT_DONE',
                result: {
                    success: false,
                    mode: 'jobs',
                    error: err?.message || 'Unknown jobs runtime error',
                    log: jobsLog,
                    templateMeta:
                        event.data.config?.templateMeta
                }
            }, '*');
        } finally {
            running = false;
        }
    });
}
