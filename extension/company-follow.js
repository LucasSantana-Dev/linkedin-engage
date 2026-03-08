if (typeof window.linkedInCompanyFollowInjected === 'undefined') {
    window.linkedInCompanyFollowInjected = true;

    const delay = ms => new Promise(r => setTimeout(r, ms));
    let stopRequested = false;
    const followLog = [];
    let consecutiveFails = 0;
    let backoffMultiplier = 1;
    const profile = typeof sessionProfile === 'function'
        ? sessionProfile() : {
            avgDelay: 3000, burstChance: 0.08,
            pauseChance: 0.05, scrollMultiplier: 1
        };

    function detectChallenge() {
        const url = window.location.href;
        if (/checkpoint|authwall|challenge/i.test(url)) {
            return true;
        }
        const text = document.body?.innerText || '';
        return /security verification|unusual activity|verificação de segurança/i.test(text);
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

    function navigateToCompanySearch(query) {
        const url =
            'https://www.linkedin.com/search/results/' +
            'companies/' +
            `?keywords=${encodeURIComponent(query)}` +
            '&origin=FACETED_SEARCH';
        window.location.href = url;
    }

    async function processCurrentPage(
        companies, limit, totalFollowed
    ) {
        await delay(2000);
        const cards = findCompanyCards();
        console.log(
            `[LinkedIn Bot] ${cards.length} company ` +
            `cards on page`
        );

        for (const card of cards) {
            if (totalFollowed >= limit ||
                stopRequested) break;

            if (detectChallenge()) {
                console.log(
                    '[LinkedIn Bot] CAPTCHA detected'
                );
                return -1;
            }

            try {
            const info = extractCompanyInfo(card);

            if (companies.length > 0 &&
                !matchesTargetCompanies(
                    info.name, companies
                )) {
                continue;
            }

            const followBtn =
                findFollowBtnInCard(card);
            if (!followBtn) {
                followLog.push({
                    ...info,
                    status: 'skipped-already-following',
                    time: new Date().toISOString()
                });
                continue;
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
            await delay(
                typeof humanDelay === 'function'
                    ? humanDelay(1000, 400)
                    : 1000
            );

            const btnText =
                (followBtn.innerText ||
                    followBtn.textContent || '')
                    .trim();
            const success = isFollowingText(btnText) ||
                followBtn.disabled;

            if (success) {
                totalFollowed++;
                consecutiveFails = 0;
                backoffMultiplier = 1;
                followLog.push({
                    ...info,
                    status: 'followed',
                    time: new Date().toISOString()
                });
            } else {
                followLog.push({
                    ...info,
                    status: 'skipped-failed',
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

        return totalFollowed;
    }

    async function runCompanyFollow(config) {
        console.log(
            '[LinkedIn Bot] Company follow started',
            config
        );
        const limit = config?.limit || 50;
        const companies = config?.targetCompanies || [];
        const searchQueue =
            config?.companySearchQueue || [];
        let totalFollowed = 0;
        stopRequested = false;
        followLog.length = 0;

        try {
            totalFollowed = await processCurrentPage(
                companies, limit, totalFollowed
            );
            if (totalFollowed === -1) {
                return {
                    success: false,
                    mode: 'company',
                    error: 'CAPTCHA or security ' +
                        'challenge detected',
                    log: followLog
                };
            }

            let queueIdx = 0;
            while (totalFollowed < limit &&
                !stopRequested &&
                queueIdx < searchQueue.length) {
                const nextCompany =
                    searchQueue[queueIdx++];
                console.log(
                    '[LinkedIn Bot] Searching: ' +
                    nextCompany
                );
                navigateToCompanySearch(nextCompany);
                await delay(5000);

                for (let i = 0; i < 10; i++) {
                    if (findCompanyCards().length > 0) {
                        break;
                    }
                    await delay(1000);
                }

                totalFollowed = await processCurrentPage(
                    companies, limit, totalFollowed
                );
                if (totalFollowed === -1) {
                    return {
                        success: false,
                        mode: 'company',
                        error: 'CAPTCHA or security ' +
                            'challenge detected',
                        log: followLog
                    };
                }
            }

            return {
                success: true,
                mode: 'company',
                message: `Followed ${totalFollowed} ` +
                    `companies.`,
                log: followLog
            };
        } catch (error) {
            return {
                success: false,
                mode: 'company',
                error: error.message,
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
                    window.postMessage({
                        type: 'LINKEDIN_BOT_DONE',
                        result
                    }, '*');
                });
        }
    });
}
