/**
 * @jest-environment jsdom
 */

describe('company-follow runtime classification', () => {
    beforeEach(() => {
        jest.resetModules();
        document.body.innerHTML = '';
    });

    afterEach(() => {
        document.body.innerHTML = '';
        delete global.extractCompanyInfo;
        delete global.matchesTargetCompanies;
        delete global.isCompanyFollowText;
        delete global.isFollowingText;
        delete global.isCompanyFollowConfirmed;
        delete global.isLowFitCompanyEntity;
        delete global.getCompanySearchPageState;
        delete global.actionDelay;
        delete global.shouldTakePause;
        delete global.pauseDuration;
        delete global.scrollBehavior;
    });

    function waitForCompanyDone(timeoutMs = 4000) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                window.removeEventListener('message', handler);
                reject(new Error('Timed out waiting company step done'));
            }, timeoutMs);
            function handler(event) {
                if (event.data?.type !==
                    'LINKEDIN_BOT_COMPANY_STEP_DONE') {
                    return;
                }
                clearTimeout(timeout);
                window.removeEventListener('message', handler);
                resolve(event.data.result);
            }
            window.addEventListener('message', handler);
        });
    }

    it('does not classify cards without confirmation as already-following', async () => {
        const card = document.createElement('div');
        card.className = 'entity-result';
        document.body.appendChild(card);

        global.extractCompanyInfo = () => ({
            name: 'Hotjar',
            subtitle: 'Software',
            companyUrl: 'https://www.linkedin.com/company/hotjar/'
        });
        global.matchesTargetCompanies = () => true;
        global.isCompanyFollowText = () => false;
        global.isFollowingText = () => false;
        global.isCompanyFollowConfirmed = () => ({
            confirmed: false,
            signals: []
        });
        global.getCompanySearchPageState = () => ({
            cards: [card],
            cardsFound: true,
            isExplicitNoResults: false,
            resultsCountHint: 1,
            resultsCountText: '1 result',
            selectorHits: {}
        });

        require('../extension/company-follow');
        const donePromise = waitForCompanyDone();
        window.dispatchEvent(new MessageEvent('message', {
            data: {
                type: 'LINKEDIN_COMPANY_FOLLOW_START',
                config: {
                    query: 'hotjar',
                    limit: 1,
                    targetCompanies: []
                }
            },
            source: window
        }));

        const result = await donePromise;
        expect(result.reason).not.toBe('already-following-only');
        expect(result.reason).toBe('no-companies-followed');
        expect(result.diagnostics).toEqual(
            expect.objectContaining({
                alreadyFollowing: 0,
                unconfirmedFollowCount: 1
            })
        );
        expect(result.log[0]).toEqual(
            expect.objectContaining({
                status: 'skipped-follow-not-confirmed',
                followAttempts: 0
            })
        );
    });

    it('does not confirm generic disabled buttons as following state', async () => {
        const card = document.createElement('div');
        card.className = 'entity-result';
        const disabledBtn = document.createElement('button');
        disabledBtn.disabled = true;
        disabledBtn.textContent = 'Message';
        card.appendChild(disabledBtn);
        document.body.appendChild(card);

        global.extractCompanyInfo = () => ({
            name: 'Hotjar',
            subtitle: 'Software',
            companyUrl: 'https://www.linkedin.com/company/hotjar/'
        });
        global.matchesTargetCompanies = () => true;
        global.isCompanyFollowText = () => false;
        global.isFollowingText = () => false;
        global.isCompanyFollowConfirmed = undefined;
        global.getCompanySearchPageState = () => ({
            cards: [card],
            cardsFound: true,
            isExplicitNoResults: false,
            resultsCountHint: 1,
            resultsCountText: '1 result',
            selectorHits: {}
        });

        require('../extension/company-follow');
        const donePromise = waitForCompanyDone();
        window.dispatchEvent(new MessageEvent('message', {
            data: {
                type: 'LINKEDIN_COMPANY_FOLLOW_START',
                config: {
                    query: 'hotjar',
                    limit: 1,
                    targetCompanies: []
                }
            },
            source: window
        }));

        const result = await donePromise;
        expect(result.reason).not.toBe('already-following-only');
        expect(result.diagnostics).toEqual(
            expect.objectContaining({
                alreadyFollowing: 0,
                unconfirmedFollowCount: 1
            })
        );
        expect(result.log[0]).toEqual(
            expect.objectContaining({
                status: 'skipped-follow-not-confirmed',
                followAttempts: 0
            })
        );
    });

    it('paginates across company result pages until limit is reached', async () => {
        let currentPage = 0;
        const nextBtn = document.createElement('button');
        nextBtn.setAttribute('aria-label', 'Next');
        nextBtn.scrollIntoView = jest.fn();
        nextBtn.addEventListener('click', () => {
            currentPage += 1;
            nextBtn.disabled = true;
        });
        document.body.appendChild(nextBtn);

        function createCard(name) {
            const card = document.createElement('div');
            card.className = 'entity-result';
            const button = document.createElement('button');
            button.textContent = 'Follow';
            button.scrollIntoView = jest.fn();
            button.addEventListener('click', () => {
                button.textContent = 'Following';
            });
            card.appendChild(button);
            card.dataset.companyName = name;
            return card;
        }

        const pageCards = [
            createCard('Acme Labs'),
            createCard('Beta Labs')
        ];

        global.extractCompanyInfo = (card) => ({
            name: card.dataset.companyName,
            subtitle: 'Software',
            companyUrl: 'https://www.linkedin.com/company/' +
                card.dataset.companyName
                    .toLowerCase()
                    .replace(/\s+/g, '-')
        });
        global.matchesTargetCompanies = () => true;
        global.isCompanyFollowText = (text) =>
            String(text || '').trim().toLowerCase() === 'follow';
        global.isFollowingText = (text) =>
            String(text || '').trim().toLowerCase() === 'following';
        global.isCompanyFollowConfirmed = undefined;
        global.actionDelay = () => 0;
        global.shouldTakePause = () => false;
        global.getCompanySearchPageState = () => ({
            cards: [pageCards[currentPage]],
            cardsFound: true,
            isExplicitNoResults: false,
            resultsCountHint: 2,
            resultsCountText: '2 results',
            selectorHits: {
                entityResult: 1
            }
        });

        require('../extension/company-follow');
        const donePromise = waitForCompanyDone();
        window.dispatchEvent(new MessageEvent('message', {
            data: {
                type: 'LINKEDIN_COMPANY_FOLLOW_START',
                config: {
                    query: 'labs',
                    limit: 2,
                    targetCompanies: []
                }
            },
            source: window
        }));

        const result = await donePromise;
        expect(result.success).toBe(true);
        expect(result.actionCount).toBe(2);
        expect(result.diagnostics).toEqual(
            expect.objectContaining({
                pagesVisited: 2,
                followed: 2
            })
        );
        expect(result.log).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ status: 'followed' }),
                expect.objectContaining({ status: 'followed' })
            ])
        );
    });

    it('skips low-fit entities before attempting follow actions', async () => {
        const card = document.createElement('div');
        card.className = 'entity-result';
        const button = document.createElement('button');
        button.textContent = 'Follow';
        button.scrollIntoView = jest.fn();
        card.appendChild(button);
        card.dataset.companyName = 'Acme University';
        document.body.appendChild(card);

        global.extractCompanyInfo = () => ({
            name: 'Acme University',
            subtitle: 'Higher Education',
            companyUrl: 'https://www.linkedin.com/company/acme-university/'
        });
        global.matchesTargetCompanies = () => true;
        global.isCompanyFollowText = () => true;
        global.isFollowingText = () => false;
        global.isCompanyFollowConfirmed = () => ({
            confirmed: false,
            signals: []
        });
        global.isLowFitCompanyEntity = () => ({
            isLowFit: true,
            reason: 'education',
            match: 'university'
        });
        global.getCompanySearchPageState = () => ({
            cards: [card],
            cardsFound: true,
            isExplicitNoResults: false,
            resultsCountHint: 1,
            resultsCountText: '1 result',
            selectorHits: {}
        });

        require('../extension/company-follow');
        const donePromise = waitForCompanyDone();
        window.dispatchEvent(new MessageEvent('message', {
            data: {
                type: 'LINKEDIN_COMPANY_FOLLOW_START',
                config: {
                    query: 'acme',
                    limit: 1,
                    targetCompanies: []
                }
            },
            source: window
        }));

        const result = await donePromise;
        expect(result.success).toBe(false);
        expect(result.reason).toBe('no-companies-followed');
        expect(result.diagnostics).toEqual(
            expect.objectContaining({
                lowFitSkipped: 1,
                followAttempts: 0
            })
        );
        expect(result.log).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    status: 'skipped-low-fit-entity',
                    reason: 'education',
                    match: 'university'
                })
            ])
        );
    });

    it('collects additional cards after scroll and follows eligible company', async () => {
        const initialCard = document.createElement('div');
        initialCard.className = 'entity-result';
        initialCard.dataset.companyName = 'Engineering University';
        const initialBtn = document.createElement('button');
        initialBtn.textContent = 'Follow';
        initialBtn.scrollIntoView = jest.fn();
        initialCard.appendChild(initialBtn);
        document.body.appendChild(initialCard);

        const loadedCard = document.createElement('div');
        loadedCard.className = 'entity-result';
        loadedCard.dataset.companyName = 'Software Co';
        const loadedBtn = document.createElement('button');
        loadedBtn.textContent = '+ Follow';
        loadedBtn.scrollIntoView = jest.fn();
        loadedBtn.addEventListener('click', () => {
            loadedBtn.textContent = 'Following';
        });
        loadedCard.appendChild(loadedBtn);

        let loaded = false;
        window.scrollBy = jest.fn(() => {
            if (loaded) return;
            loaded = true;
            document.body.appendChild(loadedCard);
        });

        global.extractCompanyInfo = (card) => ({
            name: card.dataset.companyName,
            subtitle: card.dataset.companyName.includes('University')
                ? 'Higher Education'
                : 'Software Development',
            companyUrl: 'https://www.linkedin.com/company/' +
                card.dataset.companyName.toLowerCase().replace(/\s+/g, '-')
        });
        global.matchesTargetCompanies = () => true;
        global.isCompanyFollowText = (text) =>
            /^(\+\s*)?follow$/i.test(String(text || '').trim());
        global.isFollowingText = (text) =>
            /^following$/i.test(String(text || '').trim());
        global.isCompanyFollowConfirmed = undefined;
        global.isLowFitCompanyEntity = (info) => ({
            isLowFit: /university/i.test(info?.name || ''),
            reason: /university/i.test(info?.name || '')
                ? 'education'
                : '',
            match: /university/i.test(info?.name || '')
                ? 'university'
                : ''
        });
        global.actionDelay = () => 0;
        global.shouldTakePause = () => false;
        global.getCompanySearchPageState = () => ({
            cards: Array.from(document.querySelectorAll('.entity-result')),
            cardsFound: true,
            isExplicitNoResults: false,
            resultsCountHint: loaded ? 2 : 1,
            resultsCountText: loaded ? '2 results' : '1 result',
            selectorHits: {}
        });

        require('../extension/company-follow');
        const donePromise = waitForCompanyDone(6000);
        window.dispatchEvent(new MessageEvent('message', {
            data: {
                type: 'LINKEDIN_COMPANY_FOLLOW_START',
                config: {
                    query: 'software engineering',
                    limit: 1,
                    targetCompanies: []
                }
            },
            source: window
        }));

        const result = await donePromise;
        expect(window.scrollBy).toHaveBeenCalled();
        expect(result.success).toBe(true);
        expect(result.actionCount).toBe(1);
        expect(result.log).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: 'Software Co',
                    status: 'followed'
                })
            ])
        );
    });

    it('logs an error-card entry when a card throws and keeps going', async () => {
        const bad = document.createElement('div');
        bad.className = 'entity-result';
        bad.dataset.bad = '1';
        const good = document.createElement('div');
        good.className = 'entity-result';
        const btn = document.createElement('button');
        btn.textContent = '+ Follow';
        btn.scrollIntoView = jest.fn();
        btn.addEventListener('click', () => {
            btn.textContent = 'Following';
        });
        good.appendChild(btn);
        document.body.append(bad, good);

        global.extractCompanyInfo = (card) => {
            if (card.dataset.bad) throw new Error('boom normalizeToSearch');
            return {
                name: 'Good Co',
                subtitle: 'Software',
                companyUrl: 'https://www.linkedin.com/company/good-co/'
            };
        };
        global.matchesTargetCompanies = () => true;
        global.isCompanyFollowText = (text) =>
            /^(\+\s*)?follow$/i.test(String(text || '').trim());
        global.isFollowingText = (text) =>
            /^following$/i.test(String(text || '').trim());
        global.isCompanyFollowConfirmed = undefined;
        global.isLowFitCompanyEntity = () => ({ isLowFit: false });
        global.actionDelay = () => 0;
        global.shouldTakePause = () => false;
        global.getCompanySearchPageState = () => ({
            cards: [bad, good],
            cardsFound: true,
            isExplicitNoResults: false,
            resultsCountHint: 2,
            resultsCountText: '2 results',
            selectorHits: {}
        });

        require('../extension/company-follow');
        const donePromise = waitForCompanyDone(6000);
        window.dispatchEvent(new MessageEvent('message', {
            data: {
                type: 'LINKEDIN_COMPANY_FOLLOW_START',
                config: { query: 'x', limit: 1, targetCompanies: [] }
            },
            source: window
        }));

        const result = await donePromise;
        expect(result.log).toEqual(expect.arrayContaining([
            expect.objectContaining({
                status: 'error-card',
                details: 'boom normalizeToSearch',
                time: expect.any(String)
            }),
            expect.objectContaining({ name: 'Good Co', status: 'followed' })
        ]));
    });
});
