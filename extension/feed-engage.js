if (typeof window.linkedInFeedEngageInjected === 'undefined') {
    window.linkedInFeedEngageInjected = true;

    const delay = ms => new Promise(r => setTimeout(r, ms));
    let stopRequested = false;
    const engageLog = [];
    let consecutiveFails = 0;
    let backoffMultiplier = 1;

    function detectChallenge() {
        const url = window.location.href;
        if (/checkpoint|authwall|challenge/i.test(url)) {
            return true;
        }
        const text = document.body?.innerText || '';
        return /security verification|unusual activity|verificação de segurança/i.test(text);
    }

    async function expandSeeMore(postEl) {
        const moreBtn = postEl.querySelector(
            'button.feed-shared-inline-show-more-text' +
            ', button[aria-expanded="false"]' +
            '.feed-shared-inline-show-more-text' +
            ', span.feed-shared-inline-show-more-text'
        );
        if (moreBtn) {
            moreBtn.click();
            await delay(300);
            return;
        }
        const links = postEl.querySelectorAll(
            'a, button, span'
        );
        for (const el of links) {
            const text = (el.innerText ||
                el.textContent || '').trim().toLowerCase();
            if (text === '…more' || text === '...more' ||
                text === 'more' || text === '…mais' ||
                text === '...mais' || text === 'mais' ||
                text === 'see more' ||
                text === 'ver mais') {
                el.click();
                await delay(300);
                return;
            }
        }
    }

    const REACTION_MAP = {
        'LIKE': 'Like',
        'PRAISE': 'Celebrate',
        'EMPATHY': 'Support',
        'INTEREST': 'Insightful',
        'ENTERTAINMENT': 'Funny',
        'APPRECIATION': 'Love'
    };

    const REACTION_MAP_PT = {
        'LIKE': 'Gostei',
        'PRAISE': 'Parabéns',
        'EMPATHY': 'Apoio',
        'INTEREST': 'Genial',
        'ENTERTAINMENT': 'Engraçado',
        'APPRECIATION': 'Amei'
    };

    function findPosts() {
        const sel =
            'div[data-urn*="activity"], ' +
            'div[data-urn*="ugcPost"], ' +
            'div[data-id*="activity"], ' +
            'div[data-id*="ugcPost"], ' +
            '.feed-shared-update-v2, ' +
            '.occludable-update, ' +
            'div.fie-impression-container';
        const posts = document.querySelectorAll(sel);
        if (posts.length > 0) {
            console.log(
                '[LinkedIn Bot] findPosts: matched ' +
                posts.length + ' via primary selectors'
            );
            return posts;
        }

        const likeBtns = document.querySelectorAll(
            'button[aria-label*="Like"], ' +
            'button[aria-label*="Gostei"], ' +
            'button[aria-label*="React"], ' +
            'button[aria-label*="Reagir"], ' +
            'button[aria-label*="Comment"], ' +
            'button[aria-label*="Comentar"]'
        );
        console.log(
            '[LinkedIn Bot] findPosts: primary=0, ' +
            'searching from ' + likeBtns.length +
            ' action buttons'
        );

        const seen = new Set();
        const real = [];
        for (const btn of likeBtns) {
            let el = btn.parentElement;
            let depth = 0;
            while (el && depth < 10) {
                const urn = el.getAttribute('data-urn') ||
                    el.getAttribute('data-id') || '';
                if (urn && (urn.includes('activity') ||
                    urn.includes('ugcPost'))) {
                    if (!seen.has(urn)) {
                        seen.add(urn);
                        real.push(el);
                    }
                    break;
                }
                if (el.classList &&
                    (el.classList.contains(
                        'feed-shared-update-v2') ||
                    el.classList.contains(
                        'occludable-update'))) {
                    const id = el.id || el.className;
                    if (!seen.has(id)) {
                        seen.add(id);
                        real.push(el);
                    }
                    break;
                }
                el = el.parentElement;
                depth++;
            }
            if (!el || depth >= 10) {
                let container = btn;
                for (let i = 0; i < 8; i++) {
                    if (!container.parentElement) break;
                    container = container.parentElement;
                    const rect =
                        container.getBoundingClientRect();
                    if (rect.height > 150 &&
                        rect.width > 400) {
                        const key = container.tagName +
                            rect.top + rect.left;
                        if (!seen.has(key)) {
                            seen.add(key);
                            real.push(container);
                        }
                        break;
                    }
                }
            }
        }

        console.log(
            '[LinkedIn Bot] findPosts: found ' +
            real.length + ' posts via button walk-up'
        );
        return real;
    }

    function getPostText(postEl) {
        const parts = [];

        const bodySel =
            '.feed-shared-text, ' +
            '.feed-shared-inline-show-more-text, ' +
            '.feed-shared-update-v2__description, ' +
            '.update-components-text, ' +
            '[data-test-id="main-feed-activity-content"], ' +
            'span.break-words';
        const bodyEl = postEl.querySelector(bodySel);
        if (bodyEl) {
            parts.push(bodyEl.innerText.trim());
        }

        const titleSel =
            '.feed-shared-article__title, ' +
            '.feed-shared-article__title-text, ' +
            '.update-components-article__title, ' +
            '.feed-shared-article-card__title, ' +
            '.article-card__title span, ' +
            '.update-components-article ' +
                '.update-components-article__title, ' +
            'a[data-tracking-control-name*="article"] ' +
                'span[dir="ltr"]';
        const titleEls = postEl.querySelectorAll(titleSel);
        for (const el of titleEls) {
            const t = (el.innerText || '').trim();
            if (t && !parts.includes(t)) parts.push(t);
        }

        if (parts.length > 0) return parts.join(' ');

        const spans = postEl.querySelectorAll(
            'span[dir="ltr"]'
        );
        let longest = '';
        for (const s of spans) {
            const t = s.innerText.trim();
            if (t.length > longest.length) longest = t;
        }
        return longest;
    }

    function getPostAuthor(postEl) {
        const sel =
            '.update-components-actor__name span, ' +
            '.feed-shared-actor__name span, ' +
            'a.update-components-actor__meta-link span, ' +
            '[data-test-id*="actor-name"] span, ' +
            'span.feed-shared-actor__title span';
        const authorEl = postEl.querySelector(sel);
        return authorEl
            ? authorEl.innerText.trim().split('\n')[0]
            : 'Unknown';
    }

    function getPostUrn(postEl) {
        const urn = postEl.getAttribute('data-urn') ||
            postEl.getAttribute('data-id') ||
            postEl.querySelector('[data-urn]')
                ?.getAttribute('data-urn') ||
            postEl.querySelector('[data-id]')
                ?.getAttribute('data-id') || '';
        return urn;
    }

    async function reactToPost(postEl, reactionType) {
        const likeBtn = postEl.querySelector(
            'button[aria-label*="Like"], ' +
            'button[aria-label*="Gostei"], ' +
            'button[aria-label*="React"], ' +
            'button[aria-label*="Reagir"], ' +
            'button.react-button, ' +
            'button.reactions-react-button, ' +
            'button.social-actions-button'
        );
        if (!likeBtn) return false;

        if (reactionType === 'LIKE') {
            const alreadyLiked =
                likeBtn.getAttribute('aria-pressed') ===
                'true';
            if (alreadyLiked) return false;
            likeBtn.click();
            await delay(500);
            return true;
        }

        likeBtn.dispatchEvent(new MouseEvent(
            'mouseenter', { bubbles: true }
        ));
        await delay(800);

        const popup = document.querySelector(
            '.reactions-menu, ' +
            '[class*="reactions-menu"], ' +
            '.react-button__popup'
        );

        if (popup) {
            const btns = popup.querySelectorAll(
                'button, [role="menuitem"]'
            );
            for (const btn of btns) {
                const label = (
                    btn.getAttribute('aria-label') ||
                    btn.innerText || ''
                ).trim();
                if (label.includes(
                    REACTION_MAP[reactionType]) ||
                    label.includes(
                        REACTION_MAP_PT[reactionType]
                    )) {
                    btn.click();
                    await delay(500);
                    return true;
                }
            }
        }

        likeBtn.click();
        await delay(500);
        return true;
    }

    function setEditorText(editor, text) {
        editor.focus();

        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(editor);
        sel.removeAllRanges();
        sel.addRange(range);

        if (document.execCommand('insertText', false, text)) {
            return;
        }

        editor.innerText = text;
        editor.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            inputType: 'insertText',
            data: text
        }));
        editor.dispatchEvent(
            new Event('change', { bubbles: true })
        );
    }

    async function commentOnPost(postEl, commentText) {
        const commentBtns = postEl.querySelectorAll(
            'button'
        );
        let commentBtn = null;
        for (const btn of commentBtns) {
            const label =
                btn.getAttribute('aria-label') || '';
            const text = (btn.innerText ||
                btn.textContent || '').trim();
            if (label.includes('Comment') ||
                label.includes('Comentar') ||
                text === 'Comment' ||
                text === 'Comentar') {
                commentBtn = btn;
                break;
            }
        }
        if (!commentBtn) {
            console.log(
                '[LinkedIn Bot] No comment button found'
            );
            return false;
        }

        commentBtn.click();

        let editor = null;
        for (let i = 0; i < 10; i++) {
            await delay(500);
            editor = postEl.querySelector(
                'div[role="textbox"]' +
                '[contenteditable="true"]'
            );
            if (!editor) {
                editor = document.querySelector(
                    'div[role="textbox"]' +
                    '[contenteditable="true"]'
                );
            }
            if (!editor) {
                editor = postEl.querySelector(
                    '.ql-editor' +
                    '[contenteditable="true"], ' +
                    '[contenteditable="true"]' +
                    '[data-placeholder]'
                );
            }
            if (editor) break;
        }
        if (!editor) {
            console.log(
                '[LinkedIn Bot] No comment editor found'
            );
            return false;
        }

        console.log(
            '[LinkedIn Bot] Found editor, typing: ' +
            commentText.substring(0, 50)
        );
        setEditorText(editor, commentText);

        let submitBtn = null;
        for (let attempt = 0; attempt < 6; attempt++) {
            await delay(800);

            const scopes = [postEl, document];
            for (const scope of scopes) {
                if (submitBtn) break;
                const btns = scope.querySelectorAll('button');
                for (const btn of btns) {
                    if (btn.disabled) continue;
                    const cls = btn.className || '';
                    const label =
                        btn.getAttribute('aria-label') || '';
                    const text = (btn.innerText ||
                        btn.textContent || '').trim();

                    if (cls.includes('submit-button--cr') ||
                        cls.includes('comments-comment-box' +
                            '__submit-button') ||
                        (cls.includes('comment') &&
                            (cls.includes('submit') ||
                            btn.type === 'submit')) ||
                        label.includes('Post comment') ||
                        label.includes('Publicar comentário') ||
                        label.includes('Post') ||
                        label.includes('Publicar') ||
                        label.includes('Submit') ||
                        label.includes('Enviar') ||
                        (text === 'Post' &&
                            cls.includes('comment')) ||
                        (text === 'Publicar' &&
                            cls.includes('comment')) ||
                        (text === 'Post' &&
                            cls.includes('artdeco')) ||
                        (text === 'Publicar' &&
                            cls.includes('artdeco'))) {
                        submitBtn = btn;
                        break;
                    }
                }
            }

            if (!submitBtn) {
                const fallbackSel =
                    'button.comments-comment-box' +
                    '__submit-button--cr, ' +
                    'button.comments-comment-box' +
                    '__submit-button, ' +
                    'button[type="submit"]' +
                    '.artdeco-button--primary, ' +
                    'form.comments-comment-box ' +
                    'button.artdeco-button--primary';
                const fallback =
                    document.querySelectorAll(fallbackSel);
                for (const btn of fallback) {
                    if (!btn.disabled) {
                        submitBtn = btn;
                        break;
                    }
                }
            }

            if (submitBtn) break;

            if (attempt < 5) {
                editor.dispatchEvent(new InputEvent(
                    'input', {
                        bubbles: true,
                        inputType: 'insertText',
                        data: commentText
                    }
                ));
            }
        }

        if (submitBtn) {
            console.log(
                '[LinkedIn Bot] Clicking submit: ' +
                (submitBtn.innerText || '').trim()
            );
            submitBtn.click();
            await delay(2000);
            return true;
        }
        console.log(
            '[LinkedIn Bot] No submit button found ' +
            'after 6 attempts'
        );
        return false;
    }

    function loadEngagedUrns() {
        return new Promise(resolve => {
            const handler = (event) => {
                if (event.source !== window) return;
                if (event.data?.type ===
                    'LINKEDIN_BOT_ENGAGED_LOADED') {
                    window.removeEventListener(
                        'message', handler
                    );
                    resolve(event.data.urns || []);
                }
            };
            window.addEventListener('message', handler);
            window.postMessage({
                type: 'LINKEDIN_BOT_LOAD_ENGAGED'
            }, '*');
            setTimeout(() => {
                window.removeEventListener(
                    'message', handler
                );
                resolve([]);
            }, 3000);
        });
    }

    function saveEngagedUrns(urns) {
        window.postMessage({
            type: 'LINKEDIN_BOT_SAVE_ENGAGED',
            urns
        }, '*');
    }

    async function runFeedEngage(config) {
        console.log(
            '[LinkedIn Bot] Feed engagement started',
            config
        );
        const limit = config?.limit || 20;
        const doReact = config?.react !== false;
        const doComment = config?.comment === true;
        const commentTemplates =
            config?.commentTemplates || [];
        const skipKeywords =
            config?.skipKeywords || [];
        const reactionKeywords = config?.reactionKeywords || {
            celebrate: ['congrat', 'parabén', 'promoted',
                'new role', 'achievement', 'milestone'],
            support: ['struggle', 'difficult', 'layoff',
                'mental health', 'challenge', 'tough'],
            insightful: ['research', 'data', 'study',
                'insight', 'analysis', 'trend', 'report'],
            funny: ['joke', 'humor', 'meme', 'funny',
                'lol', 'haha'],
            love: ['passion', 'love', 'inspire',
                'grateful', 'thankful', 'amazing']
        };
        let totalEngaged = 0;
        let scrollCount = 0;
        const MAX_SCROLLS = 20;
        const previousUrns = await loadEngagedUrns();
        const processedUrns = new Set(previousUrns);
        const newUrns = [];
        console.log(
            '[LinkedIn Bot] Loaded ' +
            previousUrns.length +
            ' previously engaged URNs'
        );
        stopRequested = false;
        engageLog.length = 0;

        try {
            await delay(3000);

            if (detectChallenge()) {
                console.log(
                    '[LinkedIn Bot] Login wall or ' +
                    'challenge detected at start'
                );
                window.postMessage({
                    type: 'LINKEDIN_BOT_LOGIN_REQUIRED'
                }, '*');
                return {
                    success: false,
                    mode: 'feed',
                    error: 'Login required. Please log ' +
                        'into LinkedIn and try again.',
                    log: engageLog
                };
            }

            if (findPosts().length === 0) {
                console.log(
                    '[LinkedIn Bot] No posts on first ' +
                    'try, dumping DOM debug info...'
                );
                const allBtns = document.querySelectorAll(
                    'button'
                );
                const labels = [];
                for (const b of allBtns) {
                    const l = b.getAttribute('aria-label');
                    if (l) labels.push(l);
                }
                console.log(
                    '[LinkedIn Bot] All button aria-labels:',
                    [...new Set(labels)].slice(0, 30)
                );
                const allUrns = document.querySelectorAll(
                    '[data-urn], [data-id]'
                );
                console.log(
                    '[LinkedIn Bot] Elements with data-urn' +
                    '/data-id:', allUrns.length
                );
                for (let i = 0; i < Math.min(5,
                    allUrns.length); i++) {
                    console.log(
                        '  ', allUrns[i].tagName,
                        allUrns[i].getAttribute('data-urn') ||
                        allUrns[i].getAttribute('data-id'),
                        allUrns[i].className.substring(0, 60)
                    );
                }
            }

            while (totalEngaged < limit &&
                scrollCount < MAX_SCROLLS) {
                if (stopRequested) break;

                await delay(2000);
                const posts = findPosts();
                console.log(
                    `[LinkedIn Bot] Found ${posts.length}` +
                    ` posts (scroll ${scrollCount + 1})`
                );

                for (const post of posts) {
                    if (totalEngaged >= limit ||
                        stopRequested) break;

                    if (detectChallenge()) {
                        console.log(
                            '[LinkedIn Bot] CAPTCHA detected'
                        );
                        if (newUrns.length > 0) {
                            saveEngagedUrns(newUrns);
                        }
                        return {
                            success: false,
                            mode: 'feed',
                            error: 'CAPTCHA or security ' +
                                'challenge detected',
                            log: engageLog
                        };
                    }

                    try {
                    const urn = getPostUrn(post);
                    if (urn && processedUrns.has(urn)) {
                        continue;
                    }
                    if (urn) {
                        processedUrns.add(urn);
                    }

                    await expandSeeMore(post);
                    const postText = getPostText(post);
                    const author = getPostAuthor(post);

                    console.log(
                        '[LinkedIn Bot] Post by ' + author +
                        ': "' + postText.substring(0, 80) +
                        '..." | lang=' +
                        detectLanguage(postText) +
                        ' cat=' + classifyPost(postText)
                    );

                    if (!isReactablePost(post)) continue;
                    if (shouldSkipPost(
                        postText, skipKeywords)) {
                        engageLog.push({
                            author, postText:
                                postText.substring(0, 100),
                            status: 'skipped-keyword',
                            time: new Date().toISOString()
                        });
                        continue;
                    }

                    post.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                    await delay(
                        1000 + Math.random() * 1500
                    );

                    let actions = [];

                    if (doReact) {
                        const reactionType =
                            getReactionType(
                                postText, reactionKeywords
                            );
                        const reacted = await reactToPost(
                            post, reactionType
                        );
                        if (reacted) {
                            actions.push(
                                REACTION_MAP[reactionType]
                                    .toLowerCase()
                            );
                        }
                    }

                    if (doComment) {
                        const comment =
                            buildCommentFromPost(
                                postText,
                                commentTemplates.length > 0
                                    ? commentTemplates : null
                            );
                        if (comment) {
                            await delay(
                                2000 + Math.random() * 2000
                            );
                            const commented =
                                await commentOnPost(
                                    post, comment
                                );
                            if (commented) {
                                actions.push('commented');
                            }
                        }
                    }

                    if (actions.length > 0) {
                        totalEngaged++;
                        consecutiveFails = 0;
                        backoffMultiplier = 1;
                        if (urn) newUrns.push(urn);
                        engageLog.push({
                            author,
                            postText:
                                postText.substring(0, 100),
                            status: actions.join('+'),
                            time: new Date().toISOString()
                        });
                        window.postMessage({
                            type: 'LINKEDIN_BOT_PROGRESS',
                            sent: totalEngaged,
                            limit,
                            page: scrollCount + 1,
                            skipped: 0
                        }, '*');
                    }

                    await delay(
                        2000 + Math.random() * 3000
                    );

                    } catch (postErr) {
                        console.log(
                            '[LinkedIn Bot] Error on post:',
                            postErr.message
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
                                Math.round(backoff / 1000) +
                                's'
                            );
                            await delay(backoff);
                            consecutiveFails = 0;
                        }
                    }
                }

                if (totalEngaged >= limit) break;

                window.scrollBy({
                    top: window.innerHeight * 0.8,
                    behavior: 'smooth'
                });
                scrollCount++;
                await delay(3000 + Math.random() * 2000);
            }

            if (newUrns.length > 0) {
                saveEngagedUrns(newUrns);
                console.log(
                    '[LinkedIn Bot] Saved ' +
                    newUrns.length + ' new engaged URNs'
                );
            }

            return {
                success: true,
                mode: 'feed',
                message: `Feed engagement done! ` +
                    `Interacted with ${totalEngaged} posts.`,
                log: engageLog
            };
        } catch (error) {
            if (newUrns.length > 0) {
                saveEngagedUrns(newUrns);
            }
            return {
                success: false,
                mode: 'feed',
                error: error.message,
                log: engageLog
            };
        }
    }

    window.addEventListener('message', (event) => {
        if (event.source !== window) return;
        if (event.data?.type === 'LINKEDIN_BOT_STOP') {
            stopRequested = true;
        }
        if (event.data?.type ===
            'LINKEDIN_FEED_ENGAGE_START') {
            runFeedEngage(event.data.config)
                .then(result => {
                    window.postMessage({
                        type: 'LINKEDIN_BOT_DONE',
                        result
                    }, '*');
                });
        }
    });
}
