if (typeof window.linkedInCompanyFollowInjected === 'undefined') {
    window.linkedInCompanyFollowInjected = true;

    const delay = ms => new Promise(r => setTimeout(r, ms));
    let stopRequested = false;
    const followLog = [];

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
                behavior: 'smooth',
                block: 'center'
            });
            await delay(
                800 + Math.random() * 1200
            );
            followBtn.click();
            await delay(1000);

            const btnText =
                (followBtn.innerText ||
                    followBtn.textContent || '')
                    .trim();
            const success = isFollowingText(btnText) ||
                followBtn.disabled;

            if (success) {
                totalFollowed++;
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
            await delay(
                1500 + Math.random() * 2500
            );
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
