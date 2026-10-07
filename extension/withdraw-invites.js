// MAIN-world script: withdraws pending invitations older than N weeks from
// LinkedIn's Sent invitations page. Decision logic lives in
// lib/invite-withdraw.js; this file only wires it to the live DOM, timing and
// the bridge.js message protocol (see ADR-0004).
if (typeof window.linkedInWithdrawInvitesInjected === 'undefined') {
    window.linkedInWithdrawInvitesInjected = true;

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const LIB = window.LinkedInInviteWithdraw;
    const LOCALE = LIB.resolveWithdrawLocale(
        document.documentElement ? document.documentElement.lang : '',
        typeof navigator !== 'undefined' ? navigator.language : ''
    );
    const msg = (key, subs) => LIB.withdrawText(key, LOCALE, subs);

    let stopRequested = false;
    let running = false;
    let runningNotifyBar = null;

    const DEFAULT_TIMING = {
        listWaitMs: 20000,
        pollMs: 250,
        scrollWaitMs: 1500,
        maxScrollRounds: 30,
        stalledRounds: 2,
        confirmWaitMs: 5000,
        resultWaitMs: 5000,
        afterClickMs: 700,
        betweenActionsMs: 0,
        humanize: true
    };

    function showRunningNotification() {
        if (typeof showTopNotification !== 'function') return;
        runningNotifyBar = showTopNotification(msg('running'), 'info', {
            duration: 0,
            action: {
                label: msg('stop'),
                onClick: () =>
                    window.postMessage({ type: 'LINKEDIN_BOT_STOP' }, '*')
            }
        });
    }

    function dismissRunningNotification() {
        if (runningNotifyBar && typeof dismissTopNotification === 'function') {
            dismissTopNotification(runningNotifyBar);
        }
        runningNotifyBar = null;
    }

    function reportProgress(sent, limit, skipped) {
        window.postMessage({
            type: 'LINKEDIN_BOT_WITHDRAW_PROGRESS',
            sent,
            limit,
            skipped
        }, '*');
    }

    function detectChallenge() {
        return LIB.detectChallengeSignal(
            window.location.href,
            document.body ? document.body.innerText : ''
        );
    }

    async function waitFor(check, timeoutMs, pollMs) {
        const deadline = Date.now() + timeoutMs;
        for (;;) {
            const value = check();
            if (value) return value;
            if (stopRequested || Date.now() >= deadline) return null;
            await delay(pollMs);
        }
    }

    function humanPause(timing, baseMs) {
        if (!timing.humanize || typeof humanDelay !== 'function') {
            return delay(baseMs);
        }
        return delay(humanDelay(baseMs, baseMs * 0.3));
    }

    // Infinite scroll: keep scrolling to the bottom of the list until the card
    // count stops growing (or the round cap), since old invites sit at the end.
    async function loadAllCards(timing) {
        let count = LIB.findSentInviteCards(document).length;
        let stalled = 0;
        for (let round = 0;
            round < timing.maxScrollRounds && stalled < timing.stalledRounds;
            round++) {
            if (stopRequested || detectChallenge()) break;
            const cards = document.querySelectorAll('[role="listitem"]');
            const last = cards[cards.length - 1];
            if (last && typeof last.scrollIntoView === 'function') {
                last.scrollIntoView({ block: 'end' });
            }
            window.scrollTo(0, document.body ? document.body.scrollHeight : 0);
            await humanPause(timing, timing.scrollWaitMs);
            const next = LIB.findSentInviteCards(document).length;
            stalled = next > count ? 0 : stalled + 1;
            count = next;
        }
        return count;
    }

    function dismissOpenDialog() {
        const dismiss = LIB.findDialogDismiss(document);
        if (dismiss) dismiss.click();
    }

    // Click Withdraw, confirm in the dialog when one appears, then verify the
    // card's control is gone. Returns true only on a verified withdrawal.
    async function withdrawOne(invite, timing) {
        const { card, withdrawLink } = invite;
        if (typeof card.scrollIntoView === 'function') {
            card.scrollIntoView({ block: 'center' });
        }
        await humanPause(timing, timing.afterClickMs);
        withdrawLink.click();

        const outcome = await waitFor(() => {
            if (LIB.isWithdrawComplete(card, withdrawLink)) return 'done';
            const confirm = LIB.findWithdrawConfirm(document, withdrawLink);
            return confirm || null;
        }, timing.confirmWaitMs, timing.pollMs);

        if (outcome && outcome !== 'done') {
            await humanPause(timing, timing.afterClickMs);
            outcome.click();
        }
        if (outcome === null) {
            dismissOpenDialog();
            return false;
        }
        const ok = await waitFor(
            () => LIB.isWithdrawComplete(card, withdrawLink),
            timing.resultWaitMs,
            timing.pollMs
        );
        if (!ok) dismissOpenDialog();
        return !!ok;
    }

    function buildResult(state, extra) {
        const withdrawn = state.log.filter(e => e.status === 'withdrawn').length;
        return Object.assign({
            mode: 'withdraw',
            success: true,
            withdrawn,
            actionCount: withdrawn,
            processedCount: state.log.length,
            skippedCount: state.skipped,
            tooRecentCount: state.tooRecent,
            unknownAgeCount: state.unknownAge,
            log: state.log
        }, extra);
    }

    async function runWithdrawInvites(config) {
        const timing = Object.assign({}, DEFAULT_TIMING, config && config.timing);
        const minWeeks = LIB.normalizeMinWeeks(config && config.minWeeks);
        const budget = LIB.computeRunBudget(
            config && config.limit,
            config && config.rateRemaining
        );
        const state = { log: [], skipped: 0, tooRecent: 0, unknownAge: 0 };

        if (LIB.isLoginUrl(window.location.href)) {
            window.postMessage({ type: 'LINKEDIN_BOT_LOGIN_REQUIRED' }, '*');
            return buildResult(state, {
                success: false,
                runStatus: 'failed',
                reason: 'login-required',
                error: 'LinkedIn login required.'
            });
        }
        if (detectChallenge()) {
            return buildResult(state, {
                success: false,
                runStatus: 'failed',
                reason: 'challenge',
                error: msg('challenge'),
                stepCode: 'challenge'
            });
        }

        await waitFor(
            () => LIB.findSentInviteCards(document).length > 0,
            timing.listWaitMs,
            timing.pollMs
        );
        await loadAllCards(timing);

        const plan = LIB.selectWithdrawBatch(
            LIB.findSentInviteCards(document),
            { minWeeks, max: budget }
        );
        state.tooRecent = plan.skippedTooRecent;
        state.unknownAge = plan.skippedUnknownAge;
        state.skipped = plan.skippedTooRecent + plan.skippedUnknownAge;

        if (stopRequested) {
            return buildResult(state, {
                success: false,
                stoppedByUser: true,
                runStatus: 'canceled',
                reason: 'stopped-by-user',
                message: msg('canceled')
            });
        }
        if (detectChallenge()) {
            return buildResult(state, {
                success: false,
                runStatus: 'failed',
                reason: 'challenge',
                error: msg('challenge'),
                stepCode: 'challenge'
            });
        }
        if (plan.batch.length === 0) {
            return buildResult(state, {
                runStatus: 'success',
                reason: 'no-results',
                message: msg('none', [minWeeks]),
                messageKey: 'popup.withdraw.none',
                messageArgs: [minWeeks]
            });
        }

        let consecutiveFailures = 0;
        let withdrawn = 0;
        for (const target of plan.batch) {
            if (stopRequested) break;
            if (detectChallenge()) {
                return buildResult(state, {
                    success: false,
                    runStatus: 'failed',
                    reason: 'challenge',
                    error: msg('challenge'),
                    stepCode: 'challenge'
                });
            }
            // The list may have re-rendered: look the invite up again.
            const live = LIB.findInviteByKey(document, target.key) || target;
            const ok = await withdrawOne(live, timing);
            const entry = {
                name: target.name,
                headline: target.ageText,
                profileUrl: target.profileUrl,
                time: new Date().toISOString()
            };
            if (ok) {
                consecutiveFailures = 0;
                withdrawn++;
                state.log.push(Object.assign(entry, { status: 'withdrawn' }));
                reportProgress(withdrawn, plan.batch.length, state.skipped);
            } else {
                consecutiveFailures++;
                state.log.push(Object.assign(entry, {
                    status: 'error-withdraw-not-confirmed'
                }));
                if (LIB.shouldAbortOnFailures(consecutiveFailures)) {
                    return buildResult(state, {
                        success: false,
                        runStatus: 'failed',
                        reason: 'withdraw-not-confirmed',
                        error: msg('failures', [consecutiveFailures])
                    });
                }
            }
            if (withdrawn < plan.batch.length) {
                const profile = typeof sessionProfile === 'function'
                    ? (state.profile = state.profile || sessionProfile())
                    : null;
                await humanPause(
                    timing,
                    timing.betweenActionsMs ||
                        (profile && typeof actionDelay === 'function'
                            ? actionDelay(profile)
                            : 3000)
                );
                if (profile && typeof shouldTakePause === 'function' &&
                    typeof pauseDuration === 'function' &&
                    timing.humanize &&
                    shouldTakePause(profile, withdrawn)) {
                    await delay(pauseDuration());
                }
            }
        }

        if (stopRequested) {
            return buildResult(state, {
                success: false,
                stoppedByUser: true,
                runStatus: 'canceled',
                reason: 'stopped-by-user',
                message: msg('canceled')
            });
        }
        return buildResult(state, {
            success: withdrawn > 0,
            runStatus: withdrawn > 0 ? 'success' : 'failed',
            reason: withdrawn > 0 ? 'completed' : 'withdraw-not-confirmed',
            error: withdrawn > 0
                ? undefined
                : msg('failures', [consecutiveFailures]),
            message: msg('doneDetail', [
                withdrawn, state.tooRecent, state.unknownAge
            ]),
            messageKey: 'popup.withdraw.done',
            messageArgs: [withdrawn, state.tooRecent, state.unknownAge]
        });
    }

    window.addEventListener('message', async (event) => {
        if (event.source !== window) return;
        if (event.data?.type === 'LINKEDIN_BOT_STOP') {
            stopRequested = true;
            return;
        }
        if (event.data?.type !== 'LINKEDIN_WITHDRAW_INVITES_START') return;
        if (running) return;
        running = true;
        stopRequested = false;
        showRunningNotification();
        let result;
        try {
            result = await runWithdrawInvites(event.data.config || {});
        } catch (err) {
            result = {
                mode: 'withdraw',
                success: false,
                runStatus: 'failed',
                reason: 'runtime-error',
                error: err?.message || 'Unknown withdraw runtime error',
                processedCount: 0,
                actionCount: 0,
                skippedCount: 0,
                log: []
            };
            if (typeof showTopNotification === 'function') {
                showTopNotification(
                    msg('failedPrefix') + result.error, 'error'
                );
            }
        } finally {
            running = false;
            dismissRunningNotification();
        }
        window.postMessage({
            type: 'LINKEDIN_BOT_WITHDRAW_DONE',
            result
        }, '*');
    });

    window.__LINKEDIN_WITHDRAW_INVITES_TEST_API__ = {
        runWithdrawInvites,
        withdrawOne,
        loadAllCards,
        requestStop: () => { stopRequested = true; }
    };
}
