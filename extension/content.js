if (typeof window.linkedInAutoConnectInjected === 'undefined') {
    window.linkedInAutoConnectInjected = true;

    const delay = ms => new Promise(r => setTimeout(r, ms));
    let stopRequested = false;

    window.addEventListener('message', (event) => {
        if (event.source !== window) return;
        if (event.data?.type === 'LINKEDIN_BOT_STOP') {
            stopRequested = true;
        }
    });

    function detectChallenge() {
        const url = window.location.href.toLowerCase();
        if (url.includes('/checkpoint/') ||
            url.includes('/authwall') ||
            url.includes('/challenge/')) {
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
            .substring(0, 2000).toLowerCase();
        return text.includes('security verification') ||
            text.includes('verificação de segurança') ||
            text.includes("let's do a quick") ||
            text.includes('unusual activity');
    }

    function reportProgress(sent, limit, page, skipped) {
        window.postMessage({
            type: 'LINKEDIN_BOT_PROGRESS',
            sent, limit, page, skipped
        }, '*');
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
        if (!modal) return false;
        const inputs = modal.querySelectorAll(
            'input[type="text"], input[type="email"], input'
        );
        for (const input of inputs) {
            const label = (
                input.getAttribute('aria-label') ||
                input.getAttribute('placeholder') || ''
            ).toLowerCase();
            if (label.includes('email') ||
                label.includes('e-mail')) {
                return true;
            }
        }
        const text = (modal.innerText || '').toLowerCase();
        return text.includes('enter their email') ||
            text.includes('digite o e-mail');
    }

    function dismissModal() {
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
        let name = 'there';

        const modal = queryAll(
            '.artdeco-modal.send-invite'
        ) || queryAll('[role="dialog"]');
        if (modal) {
            const strong = modal.querySelector('strong');
            if (strong) {
                const fullName = (strong.textContent || '')
                    .trim();
                name = fullName.split(/\s+/)[0];
                if (name) return name;
            }
        }

        if (contextBtn) {
            const aria =
                contextBtn.getAttribute('aria-label') || '';
            const m = aria.match(/Invite\s+(\S+)/i);
            if (m) name = m[1];
        }

        return name;
    }

    function findTextarea() {
        return queryAll(
            'textarea[name="message"]'
        ) || queryAll(
            'textarea[id="custom-message"]'
        ) || queryAll('textarea');
    }

    function findSendButton() {
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

    async function runAutomation(config) {
        console.log('[LinkedIn Bot] Started', config);

        const limit = config?.limit || 50;
        const sendNote = config?.sendNote !== undefined
            ? config.sendNote : true;
        const defaultTemplate =
            "Hi {name}, I came across your profile " +
            "and thought it would be great to connect. " +
            "I'm always looking to expand my professional " +
            "network. Looking forward to staying in touch!";
        const noteTemplate = config?.noteTemplate
            || defaultTemplate;
        let totalSent = 0;
        let totalSkipped = 0;
        let currentPage = 1;
        let consecutiveFails = 0;
        const MAX_CONSECUTIVE_FAILS = 3;
        stopRequested = false;

        try {
            while (totalSent < limit) {
                if (stopRequested) {
                    break;
                }
                if (detectChallenge()) {
                    window.postMessage({
                        type: 'LINKEDIN_BOT_DONE',
                        result: {
                            success: false,
                            error: 'CAPTCHA or security ' +
                                'challenge detected. ' +
                                `Sent ${totalSent} before stop.`
                        }
                    }, '*');
                    return {
                        success: false,
                        error: 'CAPTCHA detected'
                    };
                }
                await delay(3000);

                for (let i = 0; i < 4; i++) {
                    window.scrollBy(0, 600);
                    await delay(1000);
                }
                window.scrollTo(0, 0);
                await delay(1000);

                const connectButtons = [];
                const seen = new Set();

                const allElements = Array.from(
                    document.querySelectorAll('button, a')
                );
                for (const el of allElements) {
                    if (seen.has(el)) continue;
                    const text = (el.innerText || '').trim();
                    const ariaLabel = (
                        el.getAttribute('aria-label') || ''
                    );
                    const lower = text.toLowerCase();

                    if (lower.includes('message') ||
                        lower.includes('following') ||
                        lower.includes('withdraw') ||
                        lower.includes('pending')) {
                        continue;
                    }

                    const isConnect =
                        text === 'Connect' ||
                        (ariaLabel.toLowerCase()
                             .includes('invite') &&
                         ariaLabel.toLowerCase()
                             .includes('connect'));

                    if (isConnect) {
                        seen.add(el);
                        connectButtons.push(el);
                    }
                }

                const spans = Array.from(
                    document.querySelectorAll('span')
                );
                for (const span of spans) {
                    if (span.innerText.trim() === 'Connect') {
                        const parent =
                            span.closest('button, a');
                        if (parent && !seen.has(parent)) {
                            const t = (parent.innerText || '')
                                .trim().toLowerCase();
                            if (!t.includes('message') &&
                                !t.includes('following') &&
                                !t.includes('withdraw') &&
                                !t.includes('pending')) {
                                seen.add(parent);
                                connectButtons.push(parent);
                            }
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

                    const connectItem =
                        await tryConnectViaMore(card);
                    if (connectItem && !seen.has(connectItem)) {
                        seen.add(connectItem);
                        connectButtons.push(connectItem);
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

                const networked = [];
                const unnetworked = [];
                for (const btn of connectButtons) {
                    const info = getCardInfo(btn);
                    if (info.mutual || info.degree <= 2) {
                        networked.push({ btn, ...info });
                    } else {
                        unnetworked.push({ btn, ...info });
                    }
                }

                networked.sort((a, b) => {
                    if (a.mutual && !b.mutual) return -1;
                    if (!a.mutual && b.mutual) return 1;
                    return a.degree - b.degree;
                });

                const sorted = [
                    ...networked.map(x => x.btn),
                    ...unnetworked.map(x => x.btn)
                ];

                const totalFound = connectButtons.length;
                connectButtons.length = 0;
                connectButtons.push(...sorted);

                console.log(
                    `[LinkedIn Bot] ${totalFound} found` +
                    ` (${networked.length} networked,` +
                    ` ${unnetworked.length} unnetworked)`
                );

                for (const button of connectButtons) {
                    if (totalSent >= limit || stopRequested) break;

                    try {
                        button.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center'
                        });
                        await delay(
                            1000 + Math.random() * 1500
                        );
                        button.click();

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
                                reportProgress(
                                    totalSent, limit,
                                    currentPage, totalSkipped
                                );
                                dismissModal();
                                await delay(1500);
                                continue;
                            }
                            totalSent++;
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
                            const noteText =
                                noteTemplate.replace(
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
                                            const backoff =
                                                30000 +
                                                Math.random() * 30000;
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
                                    totalSent++;
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
                                    const backoff =
                                        30000 +
                                        Math.random() * 30000;
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
                            totalSent++;
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
                        window.postMessage({
                            type: 'LINKEDIN_BOT_DONE',
                            result: {
                                success: false,
                                error: 'CAPTCHA detected ' +
                                    'after page navigation. ' +
                                    `Sent ${totalSent}.`
                            }
                        }, '*');
                        return {
                            success: false,
                            error: 'CAPTCHA detected'
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
                    `${totalSent} connection requests.`
            };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    window.addEventListener('message', (event) => {
        if (event.source !== window) return;
        if (event.data?.type === 'LINKEDIN_BOT_START') {
            runAutomation(event.data.config).then(result => {
                window.postMessage({
                    type: 'LINKEDIN_BOT_DONE',
                    result
                }, '*');
            });
        }
    });
}
