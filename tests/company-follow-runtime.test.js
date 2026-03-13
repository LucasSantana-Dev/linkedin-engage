/**
 * @jest-environment jsdom
 */

describe('company-follow runtime classification', () => {
    beforeEach(() => {
        jest.resetModules();
        document.body.innerHTML = '';
        delete window.linkedInCompanyFollowInjected;
    });

    afterEach(() => {
        document.body.innerHTML = '';
        delete window.linkedInCompanyFollowInjected;
        delete global.extractCompanyInfo;
        delete global.matchesTargetCompanies;
        delete global.isCompanyFollowText;
        delete global.isFollowingText;
        delete global.isCompanyFollowConfirmed;
        delete global.getCompanySearchPageState;
    });

    function waitForCompanyDone() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                window.removeEventListener('message', handler);
                reject(new Error('Timed out waiting company step done'));
            }, 2000);
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
});
