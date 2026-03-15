if (typeof window.linkedInCompanyFollowInjected === 'undefined') {
    window.linkedInCompanyFollowInjected = true;

    const delay = ms => new Promise(r => setTimeout(r, ms));
    const CARD_POLL_MS = 500;
    const CARD_TIMEOUT_MS = 20000;
    const FOLLOW_CONFIRM_RETRIES = 2;
    const FOLLOW_CONFIRM_POLL_MS = 220;
    const FOLLOW_CONFIRM_TIMEOUT_MS = 1600;
    let stopRequested = false;
    const followLog = [];
    let consecutiveFails = 0;
    let backoffMultiplier = 1;
    const profile = typeof sessionProfile === 'function'
        ? sessionProfile() : {
            avgDelay: 3000, burstChance: 0.08,
            pauseChance: 0.05, scrollMultiplier: 1
        };

    function countFollowedEntries(log) {
        return (log || []).filter(
            entry => entry?.status === 'followed'
        ).length;
    }

    function detectChallenge() {
        const url = window.location.href;
        if (/checkpoint|authwall|challenge/i.test(url)) {
            return true;
        }
        const text = document.body?.innerText || '';
        return /security verification|unusual activity|verificação de segurança/i.test(text);
    }

    function getPageState() {
        if (typeof getCompanySearchPageState === 'function') {
            return getCompanySearchPageState(document);
        }
        const cards = findCompanyCards();
        return {
            cards,
            cardsFound: cards.length > 0,
            isExplicitNoResults: false,
            resultsCountHint: null,
            resultsCountText: '',
            selectorHits: {}
        };
    }

    async function waitForCompanyPageState() {
        const startedAt = Date.now();
        let state = getPageState();
        while (!state.cardsFound &&
            !state.isExplicitNoResults &&
            Date.now() - startedAt < CARD_TIMEOUT_MS) {
            await delay(CARD_POLL_MS);
            state = getPageState();
        }
        return {
            state,
            waitedMs: Date.now() - startedAt,
            timedOut: !state.cardsFound &&
                !state.isExplicitNoResults
        };
    }

    function buildDiagnostics(query, waitResult) {
        const state = waitResult.state || {};
        return {
            query: query || '',
            waitedMs: waitResult.waitedMs || 0,
            timedOut: waitResult.timedOut === true,
            resultsCountHint: state.resultsCountHint,
            resultsCountText: state.resultsCountText || '',
            selectorHits: state.selectorHits || {},
            cardsFound: state.cardsFound === true,
            url: window.location.href
        };
    }

    function findCompanyCards() {
        return document.querySelectorAll(
            '.entity-result, ' +
            '[data-chameleon-result-urn], ' +
            '.reusable-search__result-container'
        );
    }

    function findFollowBtnInCard(card) {
        const btns = card.querySelectorAll('button');
        for (const btn of btns) {
            if (isCompanyFollowText(
                btn.innerText || btn.textContent
            ) && !btn.disabled) {
                return btn;
            }
        }
        return null;
    }

    function getFollowConfirmation(card) {
        if (typeof isCompanyFollowConfirmed === 'function') {
            return isCompanyFollowConfirmed(card, document);
        }
        const btns = card?.querySelectorAll
            ? card.querySelectorAll('button')
            : [];
        for (const btn of btns) {
            const text = (
                btn.innerText || btn.textContent || ''
            ).trim();
            if (isFollowingText(text)) {
                return {
                    confirmed: true,
                    signals: ['button-state-fallback']
                };
            }
            const ariaPressed = String(
                btn.getAttribute('aria-pressed') || ''
            ).toLowerCase();
            const followSemantics = String(
                btn.getAttribute('aria-label') || ''
            ).toLowerCase() + ' ' + String(
                btn.className || ''
            ).toLowerCase();
            const hasFollowSemantic = /follow|following|seguir|seguindo|deixar de seguir|unfollow/
                .test(followSemantics);
            if (btn.disabled &&
                (ariaPressed === 'true' || hasFollowSemantic)) {
                return {
                    confirmed: true,
                    signals: ['disabled-follow-state-fallback']
                };
            }
        }
        return { confirmed: false, signals: [] };
    }

    function trackConfirmSignals(stats, signals) {
        if (!stats.confirmSignalsSeen) {
            stats.confirmSignalsSeen = {};
        }
        for (const signal of signals || []) {
            if (!signal) continue;
            stats.confirmSignalsSeen[signal] =
                (stats.confirmSignalsSeen[signal] || 0) + 1;
        }
    }

    async function waitForFollowConfirmation(card) {
        const startedAt = Date.now();
        let latestSignals = [];
        while (Date.now() - startedAt < FOLLOW_CONFIRM_TIMEOUT_MS) {
            const check = getFollowConfirmation(card);
            latestSignals = check.signals || [];
            if (check.confirmed) {
                return {
                    confirmed: true,
                    signals: latestSignals
                };
            }
            await delay(FOLLOW_CONFIRM_POLL_MS);
        }
        const finalCheck = getFollowConfirmation(card);
        return {
            confirmed: finalCheck.confirmed,
            signals: finalCheck.signals?.length
                ? finalCheck.signals
                : latestSignals
        };
    }

    async function attemptFollowWithConfirmation(
        card, profile, stats
    ) {
        let attempts = 0;
        let latestSignals = [];
        for (let retry = 0;
            retry <= FOLLOW_CONFIRM_RETRIES;
            retry++) {
            const followBtn = findFollowBtnInCard(card);
            if (!followBtn) {
                const check = getFollowConfirmation(card);
                trackConfirmSignals(stats, check.signals);
                if (check.confirmed) {
                    return {
                        confirmed: true,
                        attempts,
                        signals: check.signals || []
                    };
                }
                break;
            }

            followBtn.scrollIntoView({
                behavior: typeof scrollBehavior
                    === 'function'
                    ? scrollBehavior() : 'smooth',
                block: 'center'
            });
            await delay(
                typeof actionDelay === 'function'
                    ? actionDelay(profile)
                    : 800 + Math.random() * 1200
            );
            followBtn.click();
            attempts++;
            const confirmation = await waitForFollowConfirmation(
                card
            );
            latestSignals = confirmation.signals || [];
            trackConfirmSignals(stats, latestSignals);
            if (confirmation.confirmed) {
                return {
                    confirmed: true,
                    attempts,
                    signals: latestSignals
                };
            }
            if (retry < FOLLOW_CONFIRM_RETRIES) {
                await delay(280);
            }
        }

        return {
            confirmed: false,
            attempts,
            signals: latestSignals
        };
    }

    function findNextPageButton() {
        const btns = document.querySelectorAll(
            'button[aria-label="Next"], ' +
            'button[aria-label="Avançar"]'
        );
        for (const btn of btns) {
            if (!btn.disabled) return btn;
        }
        return null;
    }

    function reportProgress(followed, limit, page) {
        window.postMessage({
            type: 'LINKEDIN_BOT_PROGRESS',
            sent: followed, limit, page, skipped: 0
        }, '*');
    }

    async function processCurrentPage(
        cards, companies, limit, totalFollowed
    ) {
        const stats = {
            cardsScanned: 0,
            targetMatched: 0,
            followed: 0,
            alreadyFollowing: 0,
            followAttempts: 0,
            unconfirmedFollowCount: 0,
            confirmSignalsSeen: {},
            targetFilterActive: companies.length > 0
        };
        console.log(
            `[LinkedIn Bot] ${cards.length} company ` +
            `cards on page`
        );

        for (const card of cards) {
            if (totalFollowed >= limit ||
                stopRequested) break;

            stats.cardsScanned++;
            if (detectChallenge()) {
                console.log(
                    '[LinkedIn Bot] CAPTCHA detected'
                );
                if (typeof showTopNotification === 'function') {
                    showTopNotification(
                        'LinkedIn security challenge detected — company follow stopped. Please solve the CAPTCHA and retry.',
                        'error'
                    );
                }
                return {
                    totalFollowed,
                    challengeDetected: true,
                    stats
                };
            }

            try {
                const info = extractCompanyInfo(card);

                if (companies.length > 0 &&
                    !matchesTargetCompanies(
                        info.name, companies
                    )) {
                    followLog.push({
                        ...info,
                        status: 'skipped-target-filter',
                        time: new Date().toISOString()
                    });
                    continue;
                }
                stats.targetMatched++;

                const followBtn =
                    findFollowBtnInCard(card);
                if (!followBtn) {
                    const currentConfirm = getFollowConfirmation(
                        card
                    );
                    trackConfirmSignals(
                        stats,
                        currentConfirm.signals
                    );
                    if (currentConfirm.confirmed) {
                        stats.alreadyFollowing++;
                        followLog.push({
                            ...info,
                            status: 'skipped-already-following',
                            time: new Date().toISOString()
                        });
                    } else {
                        stats.unconfirmedFollowCount++;
                        followLog.push({
                            ...info,
                            status: 'skipped-follow-not-confirmed',
                            followAttempts: 0,
                            confirmSignals:
                                currentConfirm.signals || [],
                            time: new Date().toISOString()
                        });
                    }
                    continue;
                }

                const attemptResult =
                    await attemptFollowWithConfirmation(
                        card,
                        profile,
                        stats
                    );
                stats.followAttempts +=
                    attemptResult.attempts || 0;
                const success = attemptResult.confirmed;
                console.log(
                    '[LinkedIn Bot] Company follow confirmation:',
                    {
                        company: info.name,
                        confirmed: success,
                        attempts: attemptResult.attempts || 0,
                        signals: attemptResult.signals || []
                    }
                );

                if (success) {
                    totalFollowed++;
                    stats.followed++;
                    consecutiveFails = 0;
                    backoffMultiplier = 1;
                    followLog.push({
                        ...info,
                        status: 'followed',
                        followAttempts:
                            attemptResult.attempts || 1,
                        confirmSignals:
                            attemptResult.signals || [],
                        time: new Date().toISOString()
                    });
                } else {
                    stats.unconfirmedFollowCount++;
                    followLog.push({
                        ...info,
                        status: 'skipped-follow-not-confirmed',
                        followAttempts:
                            attemptResult.attempts || 0,
                        confirmSignals:
                            attemptResult.signals || [],
                        time: new Date().toISOString()
                    });
                }

                reportProgress(
                    totalFollowed, limit, 0
                );
                if (typeof shouldTakePause === 'function'
                    && shouldTakePause(
                        profile, totalFollowed
                    )) {
                    const p = typeof pauseDuration
                        === 'function'
                        ? pauseDuration() : 15000;
                    console.log(
                        '[LinkedIn Bot] Human pause: ' +
                        Math.round(p / 1000) + 's'
                    );
                    await delay(p);
                } else {
                    await delay(
                        typeof actionDelay === 'function'
                            ? actionDelay(profile)
                            : 1500 + Math.random() * 2500
                    );
                }

            } catch (cardErr) {
                console.log(
                    '[LinkedIn Bot] Error on card:',
                    cardErr.message
                );
                consecutiveFails++;
                if (consecutiveFails >= 3) {
                    const backoff = Math.min(
                        30000 * backoffMultiplier +
                        Math.random() * 5000,
                        300000
                    );
                    backoffMultiplier *= 2;
                    console.log(
                        '[LinkedIn Bot] ' +
                        consecutiveFails +
                        ' consecutive fails, ' +
                        'backing off ' +
                        Math.round(backoff / 1000) + 's'
                    );
                    await delay(backoff);
                    consecutiveFails = 0;
                }
            }
        }

        return {
            totalFollowed,
            challengeDetected: false,
            stats
        };
    }

    async function runCompanyFollow(config) {
        console.log(
            '[LinkedIn Bot] Company follow started',
            config
        );
        const limit = config?.globalLimit ||
            config?.limit || 50;
        const progressOffset = Math.max(
            0,
            Number(config?.progressOffset) || 0
        );
        const companies = config?.targetCompanies || [];
        const query = config?.query || '';
        let totalFollowed = progressOffset;
        stopRequested = false;
        followLog.length = 0;

        try {
            const waitResult = await waitForCompanyPageState();
            const diagnostics = buildDiagnostics(
                query,
                waitResult
            );

            if (waitResult.state?.isExplicitNoResults &&
                !waitResult.state?.cardsFound) {
                followLog.push({
                    name: query || 'Company search',
                    subtitle: '',
                    companyUrl: '',
                    query,
                    status: 'skipped-no-results',
                    time: new Date().toISOString()
                });
                return {
                    success: true,
                    mode: 'company',
                    stepCode: 'no-results',
                    message: 'No results for current query.',
                    runStatus: 'success',
                    reason: 'unknown',
                    followedThisStep: 0,
                    processedCount: 0,
                    actionCount: 0,
                    skippedCount: 0,
                    diagnostics,
                    log: followLog
                };
            }

            if (waitResult.timedOut ||
                !waitResult.state?.cardsFound) {
                followLog.push({
                    name: query || 'Company search',
                    subtitle: '',
                    companyUrl: '',
                    query,
                    status: 'error-no-cards-detected',
                    details: 'No company cards detected ' +
                        'within timeout.',
                    diagnostics,
                    time: new Date().toISOString()
                });
                return {
                    success: false,
                    mode: 'company',
                    stepCode: 'cards-timeout',
                    error: 'No company cards detected ' +
                        'within timeout.',
                    runStatus: 'failed',
                    reason: 'runtime-error',
                    followedThisStep: 0,
                    processedCount: 0,
                    actionCount: 0,
                    skippedCount: 0,
                    diagnostics,
                    log: followLog
                };
            }

            const pageResult = await processCurrentPage(
                waitResult.state.cards,
                companies,
                limit,
                totalFollowed
            );
            const stepStats = pageResult?.stats || {
                cardsScanned: 0,
                targetMatched: 0,
                followed: 0,
                alreadyFollowing: 0,
                targetFilterActive: companies.length > 0
            };
            diagnostics.cardsScanned = stepStats.cardsScanned;
            diagnostics.targetMatched = stepStats.targetMatched;
            diagnostics.followed = stepStats.followed;
            diagnostics.alreadyFollowing = stepStats.alreadyFollowing;
            diagnostics.followAttempts = stepStats.followAttempts;
            diagnostics.unconfirmedFollowCount =
                stepStats.unconfirmedFollowCount;
            diagnostics.confirmSignalsSeen =
                stepStats.confirmSignalsSeen;
            diagnostics.targetFilterActive = stepStats.targetFilterActive;

            totalFollowed = pageResult?.totalFollowed ||
                totalFollowed;
            if (pageResult?.challengeDetected) {
                return {
                    success: false,
                    mode: 'company',
                    stepCode: 'challenge',
                    error: 'CAPTCHA or security ' +
                        'challenge detected',
                    runStatus: 'failed',
                    reason: 'challenge',
                    followedThisStep: countFollowedEntries(
                        followLog
                    ),
                    processedCount: followLog.length,
                    actionCount: countFollowedEntries(
                        followLog
                    ),
                    skippedCount: Math.max(
                        0,
                        followLog.length -
                            countFollowedEntries(followLog)
                    ),
                    diagnostics,
                    log: followLog
                };
            }
            if (stopRequested) {
                return {
                    success: false,
                    mode: 'company',
                    stepCode: 'stopped',
                    runStatus: 'canceled',
                    reason: 'stopped-by-user',
                    stoppedByUser: true,
                    message: 'Run canceled by user.',
                    followedThisStep: countFollowedEntries(
                        followLog
                    ),
                    processedCount: followLog.length,
                    actionCount: countFollowedEntries(
                        followLog
                    ),
                    skippedCount: Math.max(
                        0,
                        followLog.length -
                            countFollowedEntries(followLog)
                    ),
                    diagnostics,
                    log: followLog
                };
            }
            const followedThisStep =
                countFollowedEntries(followLog);
            const eligibleCount = stepStats.targetFilterActive
                ? stepStats.targetMatched
                : stepStats.cardsScanned;
            if (followedThisStep <= 0) {
                let reason = 'no-companies-followed';
                let error =
                    'No companies were followed in this run.';
                if (stepStats.targetFilterActive &&
                    stepStats.targetMatched === 0) {
                    reason = 'no-target-matches';
                    error = 'No company matched the target filter.';
                } else if (eligibleCount > 0 &&
                    stepStats.alreadyFollowing >= eligibleCount) {
                    reason = 'already-following-only';
                    error = 'All matched companies are already followed.';
                } else if (stepStats.followAttempts > 0 &&
                    stepStats.unconfirmedFollowCount > 0) {
                    reason = 'follow-not-confirmed';
                    error = 'Follow click attempted but could ' +
                        'not be confirmed on LinkedIn UI.';
                }
                return {
                    success: false,
                    mode: 'company',
                    stepCode: 'zero-follow',
                    error,
                    runStatus: 'failed',
                    reason,
                    followedThisStep,
                    processedCount: followLog.length,
                    actionCount: 0,
                    skippedCount: Math.max(0, followLog.length),
                    diagnostics,
                    log: followLog
                };
            }

            return {
                success: true,
                mode: 'company',
                stepCode: 'ok',
                message: `Followed ${followedThisStep} ` +
                    `companies in this search.`,
                runStatus: 'success',
                reason: 'unknown',
                followedThisStep,
                processedCount: followLog.length,
                actionCount: followedThisStep,
                skippedCount: Math.max(
                    0,
                    followLog.length - followedThisStep
                ),
                diagnostics,
                log: followLog
            };
        } catch (error) {
            return {
                success: false,
                mode: 'company',
                stepCode: 'cards-timeout',
                error: error.message,
                runStatus: 'failed',
                reason: 'runtime-error',
                followedThisStep: countFollowedEntries(
                    followLog
                ),
                processedCount: followLog.length,
                actionCount: countFollowedEntries(
                    followLog
                ),
                skippedCount: Math.max(
                    0,
                    followLog.length -
                        countFollowedEntries(followLog)
                ),
                diagnostics: {
                    query,
                    waitedMs: 0,
                    timedOut: false,
                    resultsCountHint: null,
                    resultsCountText: '',
                    selectorHits: {},
                    cardsFound: false,
                    url: window.location.href
                },
                log: followLog
            };
        }
    }

    window.addEventListener('message', (event) => {
        if (event.source !== window) return;
        if (event.data?.type === 'LINKEDIN_BOT_STOP') {
            stopRequested = true;
        }
        if (event.data?.type ===
            'LINKEDIN_COMPANY_FOLLOW_START') {
            runCompanyFollow(event.data.config)
                .then(result => {
                    const runtimeResult = result &&
                        typeof result === 'object'
                        ? { ...result }
                        : result;
                    const templateMeta =
                        event.data.config?.templateMeta;
                    if (runtimeResult &&
                        typeof runtimeResult === 'object' &&
                        templateMeta &&
                        !runtimeResult.templateMeta) {
                        runtimeResult.templateMeta =
                            templateMeta;
                    }
                    window.postMessage({
                        type: 'LINKEDIN_BOT_COMPANY_STEP_DONE',
                        result: runtimeResult
                    }, '*');
                });
        }
    });
}
