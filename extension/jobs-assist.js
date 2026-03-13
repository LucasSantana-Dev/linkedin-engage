if (typeof window.linkedInJobsAssistInjected === 'undefined') {
    window.linkedInJobsAssistInjected = true;

    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    let stopRequested = false;
    let running = false;
    const jobsLog = [];
    const DEFAULT_RUNTIME_OPTIONS = {
        openCardScrollMs: 300,
        openCardOpenMs: 900,
        afterApplyClickMs: 800,
        afterStepClickMs: 350,
        modalPollTimeoutMs: 6000,
        modalPollIntervalMs: 200,
        stepPollTimeoutMs: 4500,
        stepPollIntervalMs: 120,
        maxModalSteps: 8
    };

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
            const text = normalized(
                dialog.innerText ||
                dialog.textContent ||
                ''
            );
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

    function toNonNegativeInt(value, fallback) {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed < 0) {
            return fallback;
        }
        return Math.floor(parsed);
    }

    function resolveRuntimeOptions(options) {
        const source = options && typeof options === 'object'
            ? options
            : {};
        return {
            openCardScrollMs: toNonNegativeInt(
                source.openCardScrollMs,
                DEFAULT_RUNTIME_OPTIONS.openCardScrollMs
            ),
            openCardOpenMs: toNonNegativeInt(
                source.openCardOpenMs,
                DEFAULT_RUNTIME_OPTIONS.openCardOpenMs
            ),
            afterApplyClickMs: toNonNegativeInt(
                source.afterApplyClickMs,
                DEFAULT_RUNTIME_OPTIONS.afterApplyClickMs
            ),
            afterStepClickMs: toNonNegativeInt(
                source.afterStepClickMs,
                DEFAULT_RUNTIME_OPTIONS.afterStepClickMs
            ),
            modalPollTimeoutMs: toNonNegativeInt(
                source.modalPollTimeoutMs,
                DEFAULT_RUNTIME_OPTIONS.modalPollTimeoutMs
            ),
            modalPollIntervalMs: Math.max(1, toNonNegativeInt(
                source.modalPollIntervalMs,
                DEFAULT_RUNTIME_OPTIONS.modalPollIntervalMs
            )),
            stepPollTimeoutMs: toNonNegativeInt(
                source.stepPollTimeoutMs,
                DEFAULT_RUNTIME_OPTIONS.stepPollTimeoutMs
            ),
            stepPollIntervalMs: Math.max(1, toNonNegativeInt(
                source.stepPollIntervalMs,
                DEFAULT_RUNTIME_OPTIONS.stepPollIntervalMs
            )),
            maxModalSteps: Math.max(1, toNonNegativeInt(
                source.maxModalSteps,
                DEFAULT_RUNTIME_OPTIONS.maxModalSteps
            ))
        };
    }

    function isRequiredField(field) {
        return field.required ||
            normalized(field.getAttribute('aria-required')) === 'true';
    }

    function fieldHint(field, fallbackIndex) {
        const parts = [
            field.getAttribute('aria-label') || '',
            field.getAttribute('name') || '',
            field.getAttribute('id') || '',
            field.getAttribute('placeholder') || ''
        ].map(normalized).filter(Boolean);
        return parts[0] || `field-${fallbackIndex + 1}`;
    }

    function isFieldEmpty(field) {
        const tag = normalized(field.tagName || '');
        if (tag === 'input') {
            const type = normalized(field.type || 'text');
            if (type === 'checkbox' || type === 'radio') {
                return !field.checked;
            }
            return String(field.value || '').trim() === '';
        }
        if (tag === 'textarea' || tag === 'select') {
            return String(field.value || '').trim() === '';
        }
        return String(field.value || '').trim() === '';
    }

    function countRequiredMissingFields(modal) {
        const fields = Array.from(modal.querySelectorAll(
            'input:not([type="hidden"]):not([disabled]), ' +
            'textarea:not([disabled]), ' +
            'select:not([disabled])'
        ));
        let missingCount = 0;
        const missingHints = [];
        fields.forEach((field, idx) => {
            if (!isRequiredField(field)) return;
            const missingByValidity = field.validity?.valueMissing === true;
            if (!missingByValidity && !isFieldEmpty(field)) return;
            missingCount++;
            if (missingHints.length < 6) {
                missingHints.push(fieldHint(field, idx));
            }
        });
        return {
            count: missingCount,
            missingHints
        };
    }

    function getModalSignature(modal) {
        const enabledButtons = Array.from(modal.querySelectorAll(
            'button:not([disabled])'
        )).map(btn => normalized(
            btn.innerText ||
            btn.textContent ||
            btn.getAttribute('aria-label') ||
            ''
        )).filter(Boolean);
        const required = countRequiredMissingFields(modal).count;
        const headline = normalized(
            modal.querySelector('h1, h2, h3, .artdeco-modal__header')?.innerText ||
            modal.innerText
        ).slice(0, 120);
        return `${enabledButtons.join('|')}::${required}::${headline}`;
    }

    async function waitForModalDialog(options) {
        const startedAt = Date.now();
        while (Date.now() - startedAt <= options.modalPollTimeoutMs) {
            const modal = findModalDialog();
            if (modal) {
                return {
                    modal,
                    waitedMs: Date.now() - startedAt
                };
            }
            await delay(options.modalPollIntervalMs);
        }
        return {
            modal: null,
            waitedMs: Date.now() - startedAt
        };
    }

    async function waitForModalStepChange(previousModal, previousSignature, options) {
        const startedAt = Date.now();
        while (Date.now() - startedAt <= options.stepPollTimeoutMs) {
            const modal = findModalDialog();
            if (!modal) {
                return {
                    changed: true,
                    modal: null,
                    waitedMs: Date.now() - startedAt
                };
            }
            const signature = getModalSignature(modal);
            if (modal !== previousModal || signature !== previousSignature) {
                return {
                    changed: true,
                    modal,
                    waitedMs: Date.now() - startedAt
                };
            }
            await delay(options.stepPollIntervalMs);
        }
        return {
            changed: false,
            modal: findModalDialog() || previousModal,
            waitedMs: Date.now() - startedAt
        };
    }

    async function runModalStepFlow(initialModal, profile, options) {
        const submitPattern = /submit|enviar candidatura|send application|apply now/;
        const reviewPattern = /review|revisar/;
        const nextPattern = /next|continue|proximo|proxima|avancar|seguinte/;
        let modal = initialModal;
        let filledFields = 0;
        let stepCount = 0;

        while (stepCount < options.maxModalSteps) {
            modal = findModalDialog() || modal;
            if (!modal) {
                return {
                    status: 'needs-manual-input',
                    reason: 'modal-closed',
                    filledFields,
                    diagnostics: { stepCount }
                };
            }

            filledFields += fillKnownFields(modal, profile);
            const submitBtn = findModalButton(modal, submitPattern);
            if (submitBtn) {
                return {
                    status: 'ready-manual-review',
                    reason: 'ready-manual-review',
                    filledFields,
                    diagnostics: { stepCount }
                };
            }

            const required = countRequiredMissingFields(modal);
            const reviewBtn = findModalButton(modal, reviewPattern);
            if (reviewBtn) {
                const signature = getModalSignature(modal);
                reviewBtn.click();
                const moved = await waitForModalStepChange(
                    modal,
                    signature,
                    options
                );
                stepCount++;
                if (!moved.changed) {
                    return {
                        status: 'needs-manual-input',
                        reason: 'modal-step-timeout',
                        filledFields,
                        diagnostics: {
                            stepCount,
                            waitedMs: moved.waitedMs
                        }
                    };
                }
                await delay(options.afterStepClickMs);
                modal = moved.modal || modal;
                continue;
            }

            const nextBtn = findModalButton(modal, nextPattern);
            if (nextBtn) {
                if (required.count > 0) {
                    return {
                        status: 'needs-manual-input',
                        reason: 'required-fields-missing',
                        filledFields,
                        diagnostics: {
                            stepCount,
                            requiredCount: required.count,
                            missingHints: required.missingHints
                        }
                    };
                }
                const signature = getModalSignature(modal);
                nextBtn.click();
                const moved = await waitForModalStepChange(
                    modal,
                    signature,
                    options
                );
                stepCount++;
                if (!moved.changed) {
                    const missing = countRequiredMissingFields(moved.modal || modal);
                    return {
                        status: 'needs-manual-input',
                        reason: missing.count > 0
                            ? 'required-fields-missing'
                            : 'modal-step-timeout',
                        filledFields,
                        diagnostics: {
                            stepCount,
                            waitedMs: moved.waitedMs,
                            requiredCount: missing.count,
                            missingHints: missing.missingHints
                        }
                    };
                }
                await delay(options.afterStepClickMs);
                modal = moved.modal || modal;
                continue;
            }

            if (required.count > 0) {
                return {
                    status: 'needs-manual-input',
                    reason: 'required-fields-missing',
                    filledFields,
                    diagnostics: {
                        stepCount,
                        requiredCount: required.count,
                        missingHints: required.missingHints
                    }
                };
            }

            return {
                status: 'needs-manual-input',
                reason: 'unknown-step',
                filledFields,
                diagnostics: { stepCount }
            };
        }

        return {
            status: 'needs-manual-input',
            reason: 'max-steps-reached',
            filledFields,
            diagnostics: {
                stepCount,
                maxModalSteps: options.maxModalSteps
            }
        };
    }

    async function openCard(job, runtimeOptions) {
        const options = resolveRuntimeOptions(runtimeOptions);
        const selectors = [
            `a[href*="/jobs/view/${job.id}"]`,
            `a[href="${job.jobUrl}"]`
        ];
        for (const selector of selectors) {
            if (!selector) continue;
            const link = document.querySelector(selector);
            if (!link) continue;
            if (typeof link.scrollIntoView === 'function') {
                link.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }
            await delay(options.openCardScrollMs);
            link.click();
            await delay(options.openCardOpenMs);
            return true;
        }
        return false;
    }

    async function prepareJobForManualReview(job, profile, runtimeOptions) {
        const options = resolveRuntimeOptions(runtimeOptions);
        if (!(await openCard(job, options))) {
            return {
                status: 'needs-manual-input',
                reason: 'open-card-failed'
            };
        }

        const applyBtn = findEasyApplyButton();
        if (!applyBtn) {
            return { status: 'skipped-no-easy-apply' };
        }

        applyBtn.click();
        await delay(options.afterApplyClickMs);

        const ready = await waitForModalDialog(options);
        if (!ready.modal) {
            return {
                status: 'needs-manual-input',
                reason: 'modal-timeout',
                diagnostics: {
                    waitedMs: ready.waitedMs
                }
            };
        }

        const result = await runModalStepFlow(
            ready.modal,
            profile,
            options
        );
        if (result &&
            typeof result === 'object' &&
            (!result.diagnostics ||
                typeof result.diagnostics !== 'object')) {
            result.diagnostics = {};
        }
        if (result &&
            typeof result === 'object' &&
            result.diagnostics &&
            typeof result.diagnostics.waitedMs === 'undefined') {
            result.diagnostics.waitedMs = ready.waitedMs;
        }
        return result;
    }

    async function runJobsAssist(config, runtimeOptions) {
        jobsLog.length = 0;
        stopRequested = false;
        const limit = Math.max(1, parseInt(config?.limit, 10) || 10);
        const rankedLimit = Math.min(200, limit);
        const options = resolveRuntimeOptions(runtimeOptions);

        if (detectChallenge()) {
            return {
                success: false,
                mode: 'jobs',
                error: 'Security challenge detected.',
                stepCode: 'challenge',
                runStatus: 'failed',
                reason: 'challenge',
                processedCount: 0,
                actionCount: 0,
                skippedCount: 0,
                log: []
            };
        }

        let cards = await collectVisibleJobs();
        if (!cards.length) {
            return {
                success: true,
                mode: 'jobs',
                message: 'No jobs found on current page.',
                runStatus: 'failed',
                reason: 'no-items-processed',
                processedCount: 0,
                actionCount: 0,
                skippedCount: 0,
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
                    runStatus: 'failed',
                    reason: 'challenge',
                    processedCount: processed,
                    actionCount: Math.max(0, processed - skipped),
                    skippedCount: skipped,
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
                config?.profile || {},
                options
            );
            jobsLog.push({
                id: job.id,
                title: job.title,
                company: job.company,
                jobUrl: job.jobUrl,
                score: job.score,
                status: prepared.status,
                reason: prepared.reason || '',
                filledFields: prepared.filledFields || 0,
                diagnostics: prepared.diagnostics || null,
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
                    runStatus: 'success',
                    reason: 'unknown',
                    processedCount: processed,
                    actionCount: Math.max(0, processed - skipped),
                    skippedCount: skipped,
                    log: jobsLog
                };
            }

            if (prepared.status === 'needs-manual-input') {
                return {
                    success: false,
                    mode: 'jobs',
                    message:
                        'Manual input required on current application. ' +
                        'Complete it and restart Jobs Assist.',
                    runStatus: 'failed',
                    reason: 'manual-input-required',
                    processedCount: processed,
                    actionCount: Math.max(0, processed - skipped),
                    skippedCount: skipped,
                    log: jobsLog
                };
            }
        }

        if (stopRequested) {
            return {
                success: false,
                mode: 'jobs',
                runStatus: 'canceled',
                reason: 'stopped-by-user',
                stoppedByUser: true,
                message: 'Run canceled by user.',
                processedCount: processed,
                actionCount: Math.max(0, processed - skipped),
                skippedCount: skipped,
                log: jobsLog
            };
        }

        return {
            success: true,
            mode: 'jobs',
            message: 'No job reached manual-review stage.',
            runStatus: processed > 0 ? 'success' : 'failed',
            reason: processed > 0
                ? 'unknown'
                : 'no-items-processed',
            processedCount: processed,
            actionCount: Math.max(0, processed - skipped),
            skippedCount: skipped,
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
                    runStatus: 'failed',
                    reason: 'runtime-error',
                    processedCount: jobsLog.length,
                    actionCount: jobsLog.filter(entry =>
                        !/^skipped|^skip-/.test(
                            String(entry?.status || '')
                        )
                    ).length,
                    skippedCount: jobsLog.filter(entry =>
                        /^skipped|^skip-/.test(
                            String(entry?.status || '')
                        )
                    ).length,
                    log: jobsLog,
                    templateMeta:
                        event.data.config?.templateMeta
                }
            }, '*');
        } finally {
            running = false;
        }
    });

    const jobsAssistTestApi = {
        detectChallenge,
        extractJobFromCard,
        findJobCards,
        fillKnownFields,
        findEasyApplyButton,
        findModalDialog,
        findModalButton,
        resolveRuntimeOptions,
        countRequiredMissingFields,
        runModalStepFlow,
        prepareJobForManualReview,
        runJobsAssist
    };

    if (typeof window !== 'undefined') {
        window.__LINKEDIN_JOBS_ASSIST_TEST_API__ = jobsAssistTestApi;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = jobsAssistTestApi;
    }
}
