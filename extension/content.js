if (typeof window.linkedInAutoConnectInjected === 'undefined') {
    window.linkedInAutoConnectInjected = true;

    const delay = ms => new Promise(r => setTimeout(r, ms));
    let stopRequested = false;
    const connectionLog = [];
    let lastInviteStatus = null;
    let fuseLimitHit = false;

    const origFetch = window.fetch;
    window.fetch = async function(...args) {
        const reqUrl = typeof args[0] === 'string'
            ? args[0]
            : args[0]?.url || '';
        if (reqUrl.startsWith('chrome-extension://')) {
            return origFetch.apply(this, args);
        }
        const res = await origFetch.apply(this, args);
        try {
            const url = reqUrl;
            if (isInviteUrl(url)) {
                lastInviteStatus = res.status;
                if (res.status === 429) {
                    fuseLimitHit = true;
                    window.postMessage({
                        type: 'LINKEDIN_BOT_SET_FUSE_LIMIT'
                    }, '*');
                }
            }
        } catch (e) {}
        return res;
    };

    const origXhrOpen = XMLHttpRequest.prototype.open;
    const origXhrSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(method, url) {
        this._linkedInUrl = url;
        return origXhrOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function() {
        if (this._linkedInUrl &&
            isInviteUrl(this._linkedInUrl)) {
            this.addEventListener('load', function() {
                lastInviteStatus = this.status;
                if (this.status === 429) {
                    fuseLimitHit = true;
                    window.postMessage({
                        type: 'LINKEDIN_BOT_SET_FUSE_LIMIT'
                    }, '*');
                }
            });
        }
        return origXhrSend.apply(this, arguments);
    };

    async function verifyPendingState(button) {
        if (lastInviteStatus === 429) return false;

        for (let i = 0; i < 6; i++) {
            await delay(500);
            if (lastInviteStatus === 429) return false;

            if (isPendingState(button)) return true;
            const card = button.closest(
                '.entity-result, li, ' +
                '[data-chameleon-result-urn]'
            );
            if (isPendingInCard(card)) return true;
        }
        return false;
    }

    async function verifyFollowState(button) {
        for (let i = 0; i < 6; i++) {
            await delay(400);
            const text = (button.innerText || '').trim();
            const aria = button.getAttribute('aria-label') || '';
            if (isFollowingButtonText(text) ||
                isFollowingButtonText(aria)) {
                return true;
            }
        }
        return false;
    }

    function extractProfileInfo(btn) {
        const card = btn.closest(
            '.entity-result, li, ' +
            '[data-chameleon-result-urn]'
        );
        if (!card) return { name: 'Unknown', headline: '' };
        const nameEl = card.querySelector(
            '.entity-result__title-text a span[dir], ' +
            '.entity-result__title-text a, ' +
            'span.entity-result__title-text'
        );
        const name = nameEl
            ? nameEl.innerText.trim().split('\n')[0]
            : 'Unknown';
        const headlineEl = card.querySelector(
            '.entity-result__primary-subtitle'
        );
        const headline = headlineEl
            ? headlineEl.innerText.trim() : '';
        const linkEl = card.querySelector(
            'a[href*="/in/"]'
        );
        const profileUrl = linkEl
            ? linkEl.href.split('?')[0] : '';
        const locEl = card.querySelector(
            '.entity-result__secondary-subtitle'
        );
        const location = locEl
            ? locEl.innerText.trim() : '';
        const summaryEl = card.querySelector(
            '.entity-result__summary'
        );
        const summary = summaryEl
            ? summaryEl.innerText.trim() : '';
        const imgEl = card.querySelector(
            'img.presence-entity__image, ' +
            'img.EntityPhoto-circle-5, ' +
            'img[data-delayed-url]'
        );
        const photoUrl = imgEl
            ? (imgEl.src || imgEl.dataset.delayedUrl
                || '') : '';
        const mutualEl = card.querySelector(
            '.entity-result__simple-insight, ' +
            '.member-insights__reason'
        );
        const mutualText = mutualEl
            ? mutualEl.innerText.trim() : '';
        const mutualMatch =
            mutualText.match(/(\d+)\s*mutual/i);
        const mutualConnections = mutualMatch
            ? parseInt(mutualMatch[1]) : 0;
        return {
            name, headline, profileUrl, location,
            summary, photoUrl, mutualConnections
        };
    }

    function notifyNurture(info) {
        if (info?.profileUrl) {
            window.postMessage({
                type: 'LINKEDIN_BOT_NURTURE_ADD',
                profileUrl: info.profileUrl,
                name: info.name
            }, '*');
        }
    }

    window.addEventListener('message', (event) => {
        if (event.source !== window) return;
        if (event.data?.type === 'LINKEDIN_BOT_STOP') {
            stopRequested = true;
        }
    });

    function detectChallenge() {
        if (detectChallengeFromUrl(
            window.location.href)) {
            return true;
        }
        const captcha = document.querySelector(
            '[class*="captcha"], ' +
            'iframe[src*="captcha"], ' +
            'iframe[src*="challenge"], ' +
            '#captcha-internal'
        );
        if (captcha) return true;
        const text = (document.body?.innerText || '')
            .substring(0, 2000);
        return detectChallengeFromText(text);
    }

    function reportProgress(sent, limit, page, skipped) {
        window.postMessage({
            type: 'LINKEDIN_BOT_PROGRESS',
            sent, limit, page, skipped
        }, '*');
    }

    function isAlreadyConnectedElement(el) {
        const card = el?.closest(
            '.entity-result, li, ' +
            '[data-chameleon-result-urn]'
        );
        if (!card ||
            typeof isAlreadyConnectedCardText !==
            'function') {
            return false;
        }
        return isAlreadyConnectedCardText(
            card.innerText || ''
        );
    }

    function getAllDocuments() {
        const docs = [document];
        try {
            const iframes = document.querySelectorAll('iframe');
            for (const iframe of iframes) {
                try {
                    const doc = iframe.contentDocument
                        || iframe.contentWindow?.document;
                    if (doc) docs.push(doc);
                } catch (e) {}
            }
        } catch (e) {}
        return docs;
    }

    function queryAll(selector) {
        for (const doc of getAllDocuments()) {
            const el = doc.querySelector(selector);
            if (el) return el;
        }
        return null;
    }

    function queryAllMulti(selector) {
        const results = [];
        for (const doc of getAllDocuments()) {
            results.push(
                ...doc.querySelectorAll(selector)
            );
        }
        return results;
    }

    function findInviteButtons() {
        const addNote =
            queryAll('button[aria-label="Add a note"]') ||
            queryAll('button[aria-label="Adicionar nota"]');
        const sendWithout =
            queryAll(
                'button[aria-label="Send without a note"]'
            ) ||
            queryAll(
                'button[aria-label="Enviar sem nota"]'
            );
        return { addNote, sendWithout };
    }

    function isEmailRequiredModal() {
        const modal = queryAll(
            '.artdeco-modal'
        ) || queryAll('[role="dialog"]');
        return isEmailRequiredContent(modal);
    }

    function dismissInMailsModal() {
        const closeIcon = queryAll(
            '.msg-overlay-bubble-header__control ' +
            '.artdeco-button__icon' +
            '[data-test-icon="close-small"]'
        );
        if (closeIcon?.parentElement) {
            closeIcon.parentElement.click();
            return true;
        }
        const inMailDismiss = queryAll(
            '#artdeco-modal-outlet ' +
            '.artdeco-modal__dismiss'
        );
        if (inMailDismiss) {
            inMailDismiss.click();
            return true;
        }
        return false;
    }

    function dismissModal() {
        dismissInMailsModal();

        const dismissBtn =
            queryAll('button[aria-label="Dismiss"]') ||
            queryAll('button[aria-label="Close"]') ||
            queryAll('button[aria-label="Fechar"]') ||
            queryAll('.artdeco-modal__dismiss');

        if (dismissBtn) {
            dismissBtn.click();
            return true;
        }

        document.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Escape', code: 'Escape',
            keyCode: 27, bubbles: true
        }));
        return false;
    }

    function extractPersonName(contextBtn) {
        const modal = queryAll(
            '.artdeco-modal.send-invite'
        ) || queryAll('[role="dialog"]');
        if (modal) {
            const strong = modal.querySelector('strong');
            if (strong) {
                const first = extractFirstName(
                    strong.textContent
                );
                if (first !== 'there') return first;
            }
        }

        if (contextBtn) {
            const aria =
                contextBtn.getAttribute('aria-label') || '';
            const fromAria = extractNameFromAria(aria);
            if (fromAria) return fromAria;
        }

        return 'there';
    }

    function findTextarea() {
        return queryAll(
            'textarea[name="message"]'
        ) || queryAll(
            'textarea[id="custom-message"]'
        ) || queryAll('textarea');
    }

    function findSendButton() {
        const precise = queryAll(
            'div.send-invite ' +
            'button.artdeco-button--primary'
        );
        if (precise) return precise;

        const modal = queryAll(
            '.artdeco-modal'
        ) || queryAll('[role="dialog"]');
        if (modal) {
            const btns = modal.querySelectorAll('button');
            for (const btn of btns) {
                const text = (btn.innerText || '')
                    .trim().toLowerCase();
                const aria = (
                    btn.getAttribute('aria-label') || ''
                ).toLowerCase();
                if (text === 'send' ||
                    text === 'send now' ||
                    text === 'enviar' ||
                    aria === 'send now' ||
                    aria === 'send') {
                    return btn;
                }
            }
        }

        const allBtns = queryAllMulti('button');
        for (const btn of allBtns) {
            const text = (btn.innerText || '')
                .trim().toLowerCase();
            if (text === 'send now' || text === 'send' ||
                text === 'enviar') {
                const rect = btn.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    return btn;
                }
            }
        }
        return null;
    }

    function findNextPageButton() {
        const selectors = [
            'button[aria-label="Next"]',
            'a[aria-label="Next"]',
            'button[aria-label="Avançar"]',
            'a[aria-label="Avançar"]',
            'button[aria-label="Forward"]',
            'a[aria-label="Forward"]'
        ];
        for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el && !el.hasAttribute('disabled') &&
                !el.classList.contains('disabled')) {
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    return el;
                }
            }
        }

        const paginationEls = Array.from(
            document.querySelectorAll(
                '.artdeco-pagination button, ' +
                '.artdeco-pagination a, ' +
                'nav[aria-label*="pagination"] button, ' +
                'nav[aria-label*="pagination"] a, ' +
                'div[class*="pagination"] button, ' +
                'div[class*="pagination"] a'
            )
        );
        for (const el of paginationEls) {
            const label = (
                el.getAttribute('aria-label') || ''
            ).toLowerCase();
            const text = (el.innerText || '')
                .toLowerCase().trim();
            if ((label.includes('next') ||
                 label.includes('avan') ||
                 text.includes('next') ||
                 text === '>') &&
                !el.hasAttribute('disabled')) {
                return el;
            }
        }

        const allClickable = Array.from(
            document.querySelectorAll('button, a')
        );
        for (const el of allClickable) {
            const text = (el.innerText || '')
                .trim().toLowerCase();
            if (text === 'next' || text === 'next >' ||
                text === 'avançar') {
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0 &&
                    !el.hasAttribute('disabled')) {
                    return el;
                }
            }
        }

        return null;
    }

    async function tryConnectViaMore(card) {
        const moreBtn = card.querySelector(
            'button[aria-label*="more action"],' +
            'button[aria-label*="More action"],' +
            'button[aria-label*="mais ações"],' +
            'button[class*="artdeco-dropdown__trigger"]'
        );
        if (!moreBtn) return null;

        moreBtn.click();
        await delay(600);

        const menuItems = document.querySelectorAll(
            '[role="menuitem"], ' +
            '.artdeco-dropdown__content button, ' +
            '.artdeco-dropdown__content a'
        );
        for (const item of menuItems) {
            const text = (item.innerText || '')
                .trim().toLowerCase();
            if (text === 'connect' || text === 'conectar') {
                return item;
            }
        }

        document.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Escape', code: 'Escape',
            keyCode: 27, bubbles: true
        }));
        return null;
    }

    function checkPersistedFuseLimit() {
        return new Promise((resolve) => {
            const handler = (event) => {
                if (event.source !== window) return;
                if (event.data?.type ===
                    'LINKEDIN_BOT_FUSE_LIMIT_STATUS') {
                    window.removeEventListener(
                        'message', handler
                    );
                    resolve(event.data.hit);
                }
            };
            window.addEventListener('message', handler);
            window.postMessage({
                type: 'LINKEDIN_BOT_CHECK_FUSE_LIMIT'
            }, '*');
            setTimeout(() => {
                window.removeEventListener('message', handler);
                resolve(false);
            }, 3000);
        });
    }

    async function visitProfile(url) {
        try {
            const w = window.open(url, '_blank',
                'width=100,height=100,left=-9999,top=-9999'
            );
            if (!w) return false;
            await delay(3000 + Math.random() * 2000);
            try { w.close(); } catch (e) {}
            return true;
        } catch (e) {
            return false;
        }
    }

    function findFollowButtons() {
        const btns = document.querySelectorAll('button');
        const follows = [];
        for (const btn of btns) {
            if (isFollowButtonText(btn.innerText || '') &&
                !btn.disabled) {
                follows.push(btn);
            }
        }
        return follows;
    }

    async function runEngagement(config) {
        console.log('[LinkedIn Bot] Engagement mode started');
        const limit = config?.limit || 50;
        let totalEngaged = 0;
        let currentPage = 1;
        stopRequested = false;
        connectionLog.length = 0;
        const sentUrls = new Set(config?.sentUrls || []);

        try {
            while (totalEngaged < limit) {
                if (stopRequested) break;
                if (detectChallenge()) {
                    return {
                        success: false,
                        error: 'CAPTCHA detected',
                        log: connectionLog
                    };
                }

                await delay(2000);

                const cards = document.querySelectorAll(
                    '.entity-result, ' +
                    '[data-chameleon-result-urn]'
                );

                for (const card of cards) {
                    if (totalEngaged >= limit ||
                        stopRequested) break;

                    const linkEl = card.querySelector(
                        'a[href*="/in/"]'
                    );
                    const profileUrl = linkEl
                        ? linkEl.href.split('?')[0] : '';

                    if (!profileUrl ||
                        sentUrls.has(profileUrl)) continue;

                    const nameEl = card.querySelector(
                        '.entity-result__title-text ' +
                        'a span[dir], ' +
                        '.entity-result__title-text a'
                    );
                    const name = nameEl
                        ? nameEl.innerText.trim()
                            .split('\n')[0]
                        : 'Unknown';
                    const headlineEl = card.querySelector(
                        '.entity-result__primary-subtitle'
                    );
                    const headline = headlineEl
                        ? headlineEl.innerText.trim() : '';

                    let actions = [];

                    await visitProfile(profileUrl);
                    actions.push('visited');

                    const followBtn = card.querySelector(
                        'button'
                    );
                    const allBtns = card.querySelectorAll(
                        'button'
                    );
                    let clicked = false;
                    for (const btn of allBtns) {
                        if (isFollowButtonText(
                            btn.innerText || '') &&
                            !btn.disabled) {
                            btn.scrollIntoView({
                                behavior: 'smooth',
                                block: 'center'
                            });
                            await delay(500);
                            btn.click();
                            actions.push('followed');
                            clicked = true;
                            break;
                        }
                    }

                    const status = actions.length > 1
                        ? 'visited-followed'
                        : actions[0] || 'visited';

                    totalEngaged++;
                    sentUrls.add(profileUrl);
                    connectionLog.push({
                        name, headline, profileUrl,
                        status,
                        time: new Date().toISOString()
                    });

                    window.postMessage({
                        type: 'LINKEDIN_BOT_PROGRESS',
                        sent: totalEngaged,
                        limit,
                        page: currentPage,
                        skipped: 0
                    }, '*');

                    await delay(
                        2000 + Math.random() * 3000
                    );
                }

                if (totalEngaged >= limit) break;

                const nextBtn = findNextPageButton();
                if (nextBtn) {
                    currentPage++;
                    nextBtn.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                    await delay(1000);
                    nextBtn.click();
                    await delay(8000);
                } else {
                    break;
                }
            }

            return {
                success: true,
                message: `Engagement done! Visited/followed ` +
                    `${totalEngaged} profiles.`,
                log: connectionLog
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                log: connectionLog
            };
        }
    }

    async function runAutomation(config) {
        console.log('[LinkedIn Bot] Started', config);

        if (config?.engagementOnly) {
            return runEngagement(config);
        }

        const persistedFuse = await checkPersistedFuseLimit();
        if (persistedFuse) {
            console.log(
                '[LinkedIn Bot] Fuse limit active — ' +
                'switching to engagement mode'
            );
            fuseLimitHit = true;
            return runEngagement(config);
        }
        fuseLimitHit = false;

        const limit = config?.limit || 50;
        const sendNote = config?.sendNote !== undefined
            ? config.sendNote : true;
        const defaultTemplate =
            "Hi {name}, I came across your profile " +
            "and thought it would be great to connect. " +
            "I'm always looking to expand my professional " +
            "network. Looking forward to staying in touch!";
        const defaultTemplatePt =
            "Olá {name}, vi seu perfil e achei " +
            "que seria ótimo nos conectarmos. " +
            "Estou sempre buscando expandir minha " +
            "rede profissional. Vamos manter contato!";
        const noteTemplate = config?.noteTemplate
            || defaultTemplate;
        const brazilGeoTarget =
            typeof isBrazilGeoTarget === 'function' &&
            isBrazilGeoTarget(config?.geoUrn);
        const skipOpenToWorkRecruiters =
            config?.skipOpenToWorkRecruiters !== false;
        const skipJobSeekingSignals =
            config?.skipJobSeekingSignals === true;
        let totalSent = 0;
        let totalSkipped = 0;
        let currentPage = 1;
        let consecutiveFails = 0;
        let backoffMultiplier = 1;
        const MAX_CONSECUTIVE_FAILS = 3;
        const MAX_BACKOFF_MS = 300000;
        stopRequested = false;
        connectionLog.length = 0;
        const sentUrls = new Set(config?.sentUrls || []);

        try {
            while (totalSent < limit) {
                if (stopRequested) {
                    break;
                }
                if (detectChallenge()) {
                    return {
                        success: false,
                        error: 'CAPTCHA or security ' +
                            'challenge detected. ' +
                            `Sent ${totalSent} before stop.`,
                        log: connectionLog
                    };
                }
                await delay(3000);

                for (let i = 0; i < 4; i++) {
                    window.scrollBy(0, 600);
                    await delay(1000);
                }
                window.scrollTo(0, 0);
                await delay(1000);

                const actionTargets = [];
                const seen = new Set();

                const allElements = Array.from(
                    document.querySelectorAll(
                        'button:enabled, a'
                    )
                );
                for (const el of allElements) {
                    if (seen.has(el)) continue;
                    if (!isButtonClickable(el)) continue;
                    const text = (el.innerText || '').trim();
                    if (shouldExcludeButton(text)) continue;

                    const ariaLabel = (
                        el.getAttribute('aria-label') || ''
                    );
                    const isConnect =
                        isConnectButtonText(text) ||
                        (ariaLabel.toLowerCase()
                             .includes('invite') &&
                         ariaLabel.toLowerCase()
                             .includes('connect'));

                    if (isConnect) {
                        if (isAlreadyConnectedElement(el)) {
                            continue;
                        }
                        seen.add(el);
                        const profile = extractProfileInfo(el);
                        actionTargets.push({
                            button: el,
                            action: 'connect',
                            profile
                        });
                    }
                }

                const spans = Array.from(
                    document.querySelectorAll('span')
                );
                for (const span of spans) {
                    const spanText = span.innerText.trim();
                    if (isConnectButtonText(spanText)) {
                        const parent =
                            span.closest('button, a');
                        if (parent && !seen.has(parent) &&
                            isButtonClickable(parent) &&
                            !shouldExcludeButton(
                                (parent.innerText || '')
                                    .trim()
                            )) {
                            if (isAlreadyConnectedElement(
                                parent
                            )) {
                                continue;
                            }
                            seen.add(parent);
                            const profile =
                                extractProfileInfo(parent);
                            actionTargets.push({
                                button: parent,
                                action: 'connect',
                                profile
                            });
                        }
                    }
                }

                const followCards = document.querySelectorAll(
                    '.entity-result, ' +
                    '.reusable-search__result-container, ' +
                    'li.reusable-search__result-container'
                );
                for (const card of followCards) {
                    const primaryBtn = card.querySelector(
                        'button'
                    );
                    if (!primaryBtn) continue;
                    const btnText = (primaryBtn.innerText || '')
                        .trim().toLowerCase();
                    if (btnText !== 'follow' &&
                        btnText !== 'seguir') continue;
                    if (isAlreadyConnectedElement(primaryBtn)) {
                        continue;
                    }

                    const connectItem =
                        await tryConnectViaMore(card);
                    if (connectItem && !seen.has(connectItem)) {
                        seen.add(connectItem);
                        const profile = extractProfileInfo(
                            primaryBtn
                        );
                        actionTargets.push({
                            button: connectItem,
                            action: 'connect',
                            profile
                        });
                    } else if (!connectItem &&
                        !seen.has(primaryBtn) &&
                        isButtonClickable(primaryBtn)) {
                        seen.add(primaryBtn);
                        const profile = extractProfileInfo(
                            primaryBtn
                        );
                        actionTargets.push({
                            button: primaryBtn,
                            action: 'follow',
                            profile
                        });
                    }
                }

                function getCardInfo(btn) {
                    const card = btn.closest(
                        '.entity-result, ' +
                        'li, [data-chameleon-result-urn]'
                    );
                    if (!card) return {
                        mutual: false, degree: 99
                    };
                    const text = (card.innerText || '')
                        .toLowerCase();
                    const mutual = text.includes('mutual')
                        || text.includes('em comum');
                    const degreeMatch = text.match(
                        /(\d)(?:st|nd|rd|º)/
                    );
                    const degree = degreeMatch
                        ? parseInt(degreeMatch[1]) : 99;
                    return { mutual, degree };
                }

                function getProfileScore(profile) {
                    let score = 0;
                    if (typeof isRecruiterProfile ===
                        'function' &&
                        isRecruiterProfile(profile)) {
                        score += 35;
                    }
                    const domain = (
                        `${profile?.headline || ''} ` +
                        `${profile?.summary || ''}`
                    ).toLowerCase();
                    if (/software|engineering|tech|it|data|product|startup|fintech/
                        .test(domain)) {
                        score += 8;
                    }
                    const location = (
                        profile?.location || ''
                    ).toLowerCase();
                    if (brazilGeoTarget &&
                        /brazil|brasil|sao paulo|rio de janeiro|curitiba|porto alegre/
                            .test(location)) {
                        score += 8;
                    }
                    return score;
                }

                const ranked = actionTargets.map(target => {
                    const info = getCardInfo(target.button);
                    let score = getProfileScore(
                        target.profile
                    );
                    if (target.action === 'connect') score += 3;
                    if (info.mutual) score += 40;
                    if (info.degree === 2) score += 20;
                    else if (info.degree === 3) score += 10;
                    else if (info.degree < 99) score += 4;
                    return { target, info, score };
                }).sort((a, b) => {
                    if (b.score !== a.score) {
                        return b.score - a.score;
                    }
                    if (a.info.mutual && !b.info.mutual) {
                        return -1;
                    }
                    if (!a.info.mutual && b.info.mutual) {
                        return 1;
                    }
                    return a.info.degree - b.info.degree;
                });

                const networkedCount = ranked.filter(
                    x => x.info.mutual ||
                        x.info.degree <= 2
                ).length;
                const unnetworkedCount =
                    ranked.length - networkedCount;
                const sorted = ranked.map(x => x.target);

                const totalFound = actionTargets.length;
                actionTargets.length = 0;
                actionTargets.push(...sorted);

                console.log(
                    `[LinkedIn Bot] ${totalFound} found` +
                    ` (${networkedCount} networked,` +
                    ` ${unnetworkedCount} unnetworked)`
                );

                for (const target of actionTargets) {
                    if (totalSent >= limit || stopRequested) break;
                    const button = target.button;
                    const actionType = target.action;
                    const targetProfile =
                        target.profile || {};

                    if (fuseLimitHit) {
                        connectionLog.push({
                            status: 'stopped-quota',
                            time: new Date().toISOString()
                        });
                        window.postMessage({
                            type: 'LINKEDIN_BOT_PROGRESS',
                            sent: totalSent, limit,
                            page: currentPage,
                            skipped: totalSkipped,
                            error: 'FUSE_LIMIT_EXCEEDED'
                        }, '*');
                        console.log(
                            '[LinkedIn Bot] Quota hit — ' +
                            'falling back to engagement'
                        );
                        const engResult =
                            await runEngagement({
                                limit: limit - totalSent,
                                sentUrls:
                                    Array.from(sentUrls)
                            });
                        connectionLog.push(
                            ...engResult.log
                        );
                        return {
                            success: true,
                            message:
                                `Sent ${totalSent}, then ` +
                                `engaged ${engResult.log.length}` +
                                ` profiles (quota fallback).`,
                            log: connectionLog
                        };
                    }

                    try {
                        const profile = targetProfile.name
                            ? targetProfile
                            : extractProfileInfo(button);
                        const card = button.closest(
                            '.entity-result, li, ' +
                            '[data-chameleon-result-urn]'
                        );
                        const recruiterLike =
                            typeof isRecruiterProfile ===
                            'function' &&
                            isRecruiterProfile(profile);
                        if (skipOpenToWorkRecruiters &&
                            recruiterLike &&
                            typeof isOpenToWorkCard ===
                            'function' &&
                            isOpenToWorkCard(card, profile)) {
                            totalSkipped++;
                            connectionLog.push({
                                ...profile,
                                status:
                                    'skipped-open-to-work',
                                time: new Date().toISOString()
                            });
                            reportProgress(
                                totalSent, limit,
                                currentPage, totalSkipped
                            );
                            continue;
                        }
                        if (skipJobSeekingSignals &&
                            typeof isJobSeekingProfile ===
                            'function' &&
                            isJobSeekingProfile(
                                profile, card
                            )) {
                            totalSkipped++;
                            connectionLog.push({
                                ...profile,
                                status:
                                    'skipped-job-seeking',
                                time: new Date().toISOString()
                            });
                            reportProgress(
                                totalSent, limit,
                                currentPage, totalSkipped
                            );
                            continue;
                        }
                        const excludedMatch = typeof
                            matchExcludedCompany ===
                            'function'
                            ? matchExcludedCompany(
                                profile.headline,
                                config?.excludedCompanies || []
                            )
                            : '';
                        if (excludedMatch) {
                            totalSkipped++;
                            connectionLog.push({
                                ...profile,
                                status: 'skipped-company-excluded',
                                company: excludedMatch,
                                time: new Date().toISOString()
                            });
                            reportProgress(
                                totalSent, limit,
                                currentPage, totalSkipped
                            );
                            continue;
                        }
                        if (profile.profileUrl &&
                            sentUrls.has(profile.profileUrl)) {
                            totalSkipped++;
                            connectionLog.push({
                                ...profile,
                                status: 'skipped-duplicate',
                                time: new Date().toISOString()
                            });
                            reportProgress(
                                totalSent, limit,
                                currentPage, totalSkipped
                            );
                            continue;
                        }

                        lastInviteStatus = null;
                        button.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center'
                        });
                        await delay(
                            1000 + Math.random() * 1500
                        );
                        button.focus();
                        button.click();
                        button.setAttribute(
                            'disabled', 'disabled'
                        );

                        if (actionType === 'follow') {
                            const followVerified =
                                await verifyFollowState(button);
                            if (followVerified) {
                                totalSent++;
                                const followedInfo =
                                    extractProfileInfo(button);
                                if (followedInfo.profileUrl) {
                                    sentUrls.add(
                                        followedInfo.profileUrl
                                    );
                                }
                                connectionLog.push({
                                    ...followedInfo,
                                    status: 'followed',
                                    time: new Date()
                                        .toISOString()
                                });
                            } else {
                                totalSkipped++;
                                connectionLog.push({
                                    ...extractProfileInfo(
                                        button
                                    ),
                                    status: 'skipped-unverified',
                                    reason:
                                        'follow-not-confirmed',
                                    time: new Date()
                                        .toISOString()
                                });
                            }
                            reportProgress(
                                totalSent, limit,
                                currentPage, totalSkipped
                            );
                            await delay(
                                1500 + Math.random() * 2500
                            );
                            continue;
                        }

                        let inviteBtns = {
                            addNote: null,
                            sendWithout: null
                        };
                        for (let i = 0; i < 20; i++) {
                            await delay(400);
                            inviteBtns = findInviteButtons();
                            if (inviteBtns.addNote ||
                                inviteBtns.sendWithout) {
                                break;
                            }
                        }

                        const hasModal = inviteBtns.addNote ||
                            inviteBtns.sendWithout;

                        if (!hasModal) {
                            if (isEmailRequiredModal()) {
                                totalSkipped++;
                                connectionLog.push({
                                    ...extractProfileInfo(
                                        button),
                                    status: 'skipped-email',
                                    time: new Date()
                                        .toISOString()
                                });
                                reportProgress(
                                    totalSent, limit,
                                    currentPage, totalSkipped
                                );
                                dismissModal();
                                await delay(1500);
                                continue;
                            }
                            const noModalVerified =
                                await verifyPendingState(
                                    button);
                            if (noModalVerified) {
                                totalSent++;
                                const sentInfo =
                                    extractProfileInfo(button);
                                if (sentInfo.profileUrl) {
                                    sentUrls.add(
                                        sentInfo.profileUrl
                                    );
                                }
                                connectionLog.push({
                                    ...sentInfo,
                                    status: 'sent',
                                    time: new Date()
                                        .toISOString()
                                });
                                notifyNurture(sentInfo);
                            } else {
                                totalSkipped++;
                                connectionLog.push({
                                    ...extractProfileInfo(
                                        button),
                                    status: 'skipped-unverified',
                                    time: new Date()
                                        .toISOString()
                                });
                            }
                            reportProgress(
                                totalSent, limit,
                                currentPage, totalSkipped
                            );
                            await delay(
                                2000 + Math.random() * 3000
                            );
                            continue;
                        }

                        if (sendNote && inviteBtns.addNote) {
                            inviteBtns.addNote.click();
                            await delay(1500);

                            const personName =
                                extractPersonName(button);
                            const usePortugueseNote =
                                brazilGeoTarget ||
                                (typeof isBrazilianProfile ===
                                'function' &&
                                isBrazilianProfile(profile));
                            const templateIsPt =
                                /ol[áa]|conectar|rede|contato|perfil|profissional/i
                                    .test(noteTemplate);
                            const activeTemplate =
                                usePortugueseNote &&
                                !templateIsPt
                                    ? defaultTemplatePt
                                    : noteTemplate;
                            if (usePortugueseNote) {
                                console.log(
                                    '[LinkedIn Bot] Using ' +
                                    'PT-BR note for: ' +
                                    profile.name
                                );
                            }
                            const noteText =
                                activeTemplate.replace(
                                    /{name}/gi, personName
                                );

                            let textArea = null;
                            for (let i = 0; i < 8; i++) {
                                await delay(400);
                                textArea = findTextarea();
                                if (textArea) break;
                            }

                            if (textArea) {
                                const nativeSetter =
                                    Object
                                        .getOwnPropertyDescriptor(
                                            HTMLTextAreaElement
                                                .prototype,
                                            'value'
                                        ).set;
                                nativeSetter.call(
                                    textArea, noteText
                                );
                                textArea.dispatchEvent(
                                    new Event('input', {
                                        bubbles: true
                                    })
                                );
                                textArea.dispatchEvent(
                                    new Event('change', {
                                        bubbles: true
                                    })
                                );
                                await delay(1500);

                                let sendBtn = null;
                                for (let i = 0; i < 8; i++) {
                                    await delay(600);
                                    sendBtn =
                                        findSendButton();
                                    if (sendBtn) break;
                                }

                                if (sendBtn) {
                                    sendBtn.click();
                                    await delay(2000);

                                    const stillOpen =
                                        findInviteButtons();
                                    if (stillOpen.addNote ||
                                        stillOpen.sendWithout) {
                                        consecutiveFails++;
                                        dismissModal();
                                        await delay(1000);
                                        if (consecutiveFails >=
                                            MAX_CONSECUTIVE_FAILS) {
                                            const backoff = Math.min(
                                                30000 * backoffMultiplier +
                                                Math.random() * 30000,
                                                MAX_BACKOFF_MS
                                            );
                                            backoffMultiplier *= 2;
                                            reportProgress(
                                                totalSent, limit,
                                                currentPage,
                                                totalSkipped
                                            );
                                            await delay(backoff);
                                            consecutiveFails = 0;
                                        }
                                        continue;
                                    }

                                    consecutiveFails = 0;
                                    backoffMultiplier = 1;
                                    const noteVerified =
                                        await verifyPendingState(
                                            button);
                                    const sentInfo =
                                        extractProfileInfo(
                                            button);
                                    if (noteVerified) {
                                        totalSent++;
                                        if (sentInfo.profileUrl) {
                                            sentUrls.add(
                                                sentInfo
                                                    .profileUrl
                                            );
                                        }
                                        connectionLog.push({
                                            ...sentInfo,
                                            status: 'sent',
                                            time: new Date()
                                                .toISOString()
                                        });
                                        notifyNurture(sentInfo);
                                    } else {
                                        totalSkipped++;
                                        connectionLog.push({
                                            ...sentInfo,
                                            status:
                                                'skipped-unverified',
                                            time: new Date()
                                                .toISOString()
                                        });
                                    }
                                    reportProgress(
                                        totalSent, limit,
                                        currentPage, totalSkipped
                                    );
                                } else {
                                    dismissModal();
                                }
                            } else {
                                dismissModal();
                            }
                        } else if (inviteBtns.sendWithout) {
                            inviteBtns.sendWithout.click();
                            await delay(2000);

                            const stillOpen =
                                findInviteButtons();
                            if (stillOpen.addNote ||
                                stillOpen.sendWithout) {
                                consecutiveFails++;
                                dismissModal();
                                await delay(1000);
                                if (consecutiveFails >=
                                    MAX_CONSECUTIVE_FAILS) {
                                    const backoff = Math.min(
                                        30000 * backoffMultiplier +
                                        Math.random() * 30000,
                                        MAX_BACKOFF_MS
                                    );
                                    backoffMultiplier *= 2;
                                    reportProgress(
                                        totalSent, limit,
                                        currentPage, totalSkipped
                                    );
                                    await delay(backoff);
                                    consecutiveFails = 0;
                                }
                                continue;
                            }

                            consecutiveFails = 0;
                            backoffMultiplier = 1;
                            const noNoteVerified =
                                await verifyPendingState(
                                    button);
                            const sentInfo2 =
                                extractProfileInfo(button);
                            if (noNoteVerified) {
                                totalSent++;
                                if (sentInfo2.profileUrl) {
                                    sentUrls.add(
                                        sentInfo2.profileUrl
                                    );
                                }
                                connectionLog.push({
                                    ...sentInfo2,
                                    status: 'sent',
                                    time: new Date()
                                        .toISOString()
                                });
                                notifyNurture(sentInfo2);
                            } else {
                                totalSkipped++;
                                connectionLog.push({
                                    ...sentInfo2,
                                    status:
                                        'skipped-unverified',
                                    time: new Date()
                                        .toISOString()
                                });
                            }
                            reportProgress(
                                totalSent, limit,
                                currentPage, totalSkipped
                            );
                        } else {
                            dismissModal();
                        }

                        await delay(1000);
                        const leftover = findInviteButtons();
                        if (leftover.addNote ||
                            leftover.sendWithout) {
                            dismissModal();
                            await delay(1000);
                        }

                        await delay(
                            3000 + Math.random() * 4000
                        );

                    } catch (err) {
                        dismissModal();
                        await delay(2000);
                    }
                }

                if (totalSent >= limit) break;

                const nextBtn = findNextPageButton();
                if (nextBtn) {
                    currentPage++;
                    nextBtn.scrollIntoView({
                        behavior: 'smooth', block: 'center'
                    });
                    await delay(1000);
                    nextBtn.click();
                    await delay(8000);
                    if (detectChallenge()) {
                        return {
                            success: false,
                            error: 'CAPTCHA detected ' +
                                'after page navigation. ' +
                                `Sent ${totalSent}.`,
                            log: connectionLog
                        };
                    }
                } else {
                    break;
                }
            }

            console.log(
                `[LinkedIn Bot] Done. ${totalSent} sent.`
            );
            return {
                success: true,
                message: `Finished! Sent ` +
                    `${totalSent} connection requests.`,
                log: connectionLog
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                log: connectionLog
            };
        }
    }

    window.addEventListener('message', (event) => {
        if (event.source !== window) return;
        if (event.data?.type === 'LINKEDIN_BOT_START') {
            runAutomation(event.data.config).then(result => {
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
                    runtimeResult.templateMeta = templateMeta;
                }
                window.postMessage({
                    type: 'LINKEDIN_BOT_DONE',
                    result: runtimeResult
                }, '*');
            });
        }
    });
}
