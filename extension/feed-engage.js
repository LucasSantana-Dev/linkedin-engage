if (typeof window.linkedInFeedEngageInjected === 'undefined') {
    window.linkedInFeedEngageInjected = true;

    const delay = ms => new Promise(r => setTimeout(r, ms));
    let stopRequested = false;
    const engageLog = [];
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

        const bodySelectors = [
            '.feed-shared-text',
            '.feed-shared-inline-show-more-text',
            '.feed-shared-update-v2__description',
            '.update-components-text',
            '[data-test-id="main-feed-activity-content"]',
            'span.break-words',
            '.feed-shared-text-view span[dir="ltr"]',
            'div.feed-shared-update-v2__commentary ' +
                'span[dir="ltr"]',
            '[class*="update-components-text"] ' +
                'span[dir="ltr"]'
        ];
        for (const sel of bodySelectors) {
            const el = postEl.querySelector(sel);
            if (el) {
                const t = (el.innerText ||
                    el.textContent || '').trim();
                if (t && t.length > 10 &&
                    !parts.includes(t)) {
                    parts.push(t);
                    break;
                }
            }
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
            const t = (el.innerText ||
                el.textContent || '').trim();
            if (t && !parts.includes(t)) parts.push(t);
        }

        if (parts.length > 0) return parts.join(' ');

        const spans = postEl.querySelectorAll(
            'span[dir="ltr"]'
        );
        let longest = '';
        for (const s of spans) {
            const t = (s.innerText ||
                s.textContent || '').trim();
            if (t.length > longest.length) longest = t;
        }
        if (longest) return longest;

        const allText = (postEl.innerText || '').trim();
        if (allText.length > 50) {
            const lines = allText.split('\n')
                .filter(l => l.trim().length > 15);
            if (lines.length > 0) {
                return lines.slice(0, 3).join(' ');
            }
        }
        return allText.substring(0, 500);
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
        const likeBtns = postEl.querySelectorAll('button');
        let likeBtn = null;
        for (const btn of likeBtns) {
            const label = (
                btn.getAttribute('aria-label') || ''
            ).toLowerCase();
            const text = (
                btn.innerText || btn.textContent || ''
            ).trim().toLowerCase();
            if (label.includes('like') ||
                label.includes('gostei') ||
                label.includes('react') ||
                label.includes('reagir') ||
                text === 'like' || text === 'gostei') {
                likeBtn = btn;
                break;
            }
        }
        if (!likeBtn) {
            likeBtn = postEl.querySelector(
                'button.react-button, ' +
                'button.reactions-react-button, ' +
                'button.social-actions-button'
            );
        }
        if (!likeBtn) return false;

        const alreadyLiked =
            likeBtn.getAttribute('aria-pressed') === 'true';
        if (alreadyLiked) return false;

        if (reactionType === 'LIKE') {
            likeBtn.click();
            await delay(500);
            return true;
        }

        async function tryOpenReactionPopup() {
            const rect = likeBtn.getBoundingClientRect();
            const cx = rect.x + rect.width / 2;
            const cy = rect.y + rect.height / 2;

            likeBtn.dispatchEvent(new PointerEvent(
                'pointerdown', {
                    bubbles: true, cancelable: true,
                    clientX: cx, clientY: cy,
                    button: 0, pointerId: 1
                }
            ));
            for (const evt of [
                'mousedown', 'pointerenter',
                'mouseenter', 'mouseover'
            ]) {
                likeBtn.dispatchEvent(new MouseEvent(
                    evt, {
                        bubbles: true, cancelable: true,
                        clientX: cx, clientY: cy
                    }
                ));
            }

            await delay(2000);

            likeBtn.dispatchEvent(new PointerEvent(
                'pointerup', {
                    bubbles: true, cancelable: true,
                    clientX: cx, clientY: cy,
                    button: 0, pointerId: 1
                }
            ));
            likeBtn.dispatchEvent(new MouseEvent(
                'mouseup', {
                    bubbles: true, cancelable: true,
                    clientX: cx, clientY: cy
                }
            ));

            await delay(500);

            const popupSels = [
                '.reactions-menu',
                '[class*="reactions-menu"]',
                '.react-button__popup',
                '[class*="react-button"] [role="toolbar"]',
                '[class*="react-button"] [role="listbox"]',
                'div[class*="reaction"][class*="bar"]',
                '.artdeco-hoverable-content--visible',
                '[class*="reactions-bar"]',
                '[data-test-id*="reaction"]'
            ];
            for (const sel of popupSels) {
                const el = document.querySelector(sel);
                if (el) return el;
            }

            const above = document.elementsFromPoint(
                cx, rect.y - 40
            );
            for (const el of above) {
                if (el.querySelector &&
                    el !== likeBtn &&
                    el !== document.body &&
                    el !== document.documentElement) {
                    const items = el.querySelectorAll(
                        'button, [role="menuitem"], ' +
                        '[role="option"], img'
                    );
                    if (items.length >= 2) return el;
                }
            }
            return null;
        }

        let popup = await tryOpenReactionPopup();

        if (!popup) {
            for (const evt of [
                'mouseleave', 'pointerleave'
            ]) {
                likeBtn.dispatchEvent(new MouseEvent(
                    evt, { bubbles: true }
                ));
            }
            await delay(500);
            popup = await tryOpenReactionPopup();
        }

        if (popup) {
            const btns = popup.querySelectorAll(
                'button, [role="menuitem"], ' +
                '[role="option"], img[alt], ' +
                '[data-reaction-type]'
            );
            const enLabel = REACTION_MAP[reactionType];
            const ptLabel = REACTION_MAP_PT[reactionType];
            for (const btn of btns) {
                const label = (
                    btn.getAttribute('aria-label') ||
                    btn.getAttribute('alt') ||
                    btn.getAttribute(
                        'data-reaction-type') ||
                    btn.innerText || ''
                ).trim();
                if (label.includes(enLabel) ||
                    label.includes(ptLabel) ||
                    label.toUpperCase() ===
                        reactionType) {
                    btn.click();
                    await delay(500);
                    console.log(
                        '[LinkedIn Bot] Reacted: ' +
                        enLabel
                    );
                    return true;
                }
            }
            console.log(
                '[LinkedIn Bot] Popup open but no match' +
                ' for ' + enLabel + '. Found: ' +
                [...btns].map(b =>
                    b.getAttribute('aria-label') ||
                    b.getAttribute('alt') ||
                    b.innerText || '?'
                ).join(', ')
            );

            for (const btn of btns) {
                if (btn.getAttribute('aria-label') ||
                    btn.getAttribute('alt')) {
                    btn.click();
                    await delay(500);
                    console.log(
                        '[LinkedIn Bot] Used first ' +
                        'available reaction: ' +
                        (btn.getAttribute('aria-label') ||
                        btn.getAttribute('alt'))
                    );
                    return true;
                }
            }
        } else {
            console.log(
                '[LinkedIn Bot] No reaction popup after' +
                ' 2 attempts, falling back to Like'
            );
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

        const inserted = document.execCommand(
            'insertText', false, text
        );

        if (!inserted || (editor.innerText || '')
            .trim() !== text.trim()) {
            editor.innerText = text;
        }

        for (const evtType of ['input', 'change']) {
            editor.dispatchEvent(new InputEvent(evtType, {
                bubbles: true,
                inputType: 'insertText',
                data: text
            }));
        }
        for (const evtType of ['keydown', 'keypress',
            'keyup']) {
            editor.dispatchEvent(new KeyboardEvent(
                evtType, {
                    bubbles: true, key: ' ',
                    keyCode: 32, which: 32
                }
            ));
        }
    }

    function findCommentSection(postEl) {
        let container = postEl;
        for (let i = 0; i < 5; i++) {
            if (!container) break;
            const section = container.querySelector(
                '.comments-comment-box, ' +
                '.comments-comment-texteditor, ' +
                'form[class*="comment"], ' +
                'div[class*="comments-comment-box"]'
            );
            if (section) return section;
            const editor = container.querySelector(
                'div[role="textbox"]' +
                '[contenteditable="true"]'
            );
            if (editor) return editor.closest(
                'form, [class*="comment-box"], ' +
                '[class*="comments"]'
            ) || editor.parentElement;
            container = container.parentElement;
        }
        return null;
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

        commentBtn.scrollIntoView({
            behavior: 'smooth', block: 'center'
        });
        await delay(300);
        commentBtn.click();

        let editor = null;
        let searchScope = postEl;
        for (let i = 0; i < 12; i++) {
            await delay(500);

            const commentSection =
                findCommentSection(postEl);
            if (commentSection) {
                editor = commentSection.querySelector(
                    'div[role="textbox"]' +
                    '[contenteditable="true"]'
                );
                if (editor) {
                    searchScope = commentSection;
                    break;
                }
            }

            editor = postEl.querySelector(
                'div[role="textbox"]' +
                '[contenteditable="true"]'
            );
            if (editor) break;

            let parent = postEl.parentElement;
            for (let d = 0; d < 3 && !editor; d++) {
                if (!parent) break;
                editor = parent.querySelector(
                    'div[role="textbox"]' +
                    '[contenteditable="true"]'
                );
                if (editor) {
                    searchScope = parent;
                    break;
                }
                parent = parent.parentElement;
            }
            if (editor) break;

            if (i === 5) {
                commentBtn.click();
                await delay(300);
            }
        }
        if (!editor) {
            console.log(
                '[LinkedIn Bot] No comment editor found ' +
                'for post by ' + getPostAuthor(postEl)
            );
            return false;
        }

        console.log(
            '[LinkedIn Bot] Found editor for post by ' +
            getPostAuthor(postEl) + ', typing: ' +
            commentText.substring(0, 50)
        );
        setEditorText(editor, commentText);

        let submitBtn = null;
        for (let attempt = 0; attempt < 8; attempt++) {
            await delay(800);

            const scopes = [searchScope, postEl];
            for (const scope of scopes) {
                if (submitBtn) break;
                const btns = scope.querySelectorAll(
                    'button'
                );
                for (const btn of btns) {
                    if (btn.disabled) continue;
                    const cls = btn.className || '';
                    const label =
                        btn.getAttribute('aria-label') || '';
                    const text = (btn.innerText ||
                        btn.textContent || '').trim();

                    const isSubmit =
                        cls.includes('submit-button') ||
                        cls.includes('comments-comment-box' +
                            '__submit-button') ||
                        (cls.includes('comment') &&
                            (cls.includes('submit') ||
                            btn.type === 'submit')) ||
                        label.includes('Post comment') ||
                        label.includes(
                            'Publicar comentário') ||
                        label.includes(
                            'Submit comment') ||
                        label === 'Post' ||
                        label === 'Publicar' ||
                        label === 'Submit' ||
                        label === 'Enviar' ||
                        label === 'Comment' ||
                        label === 'Comentar';
                    const isSubmitText =
                        (text === 'Post' || text === 'Publicar' ||
                        text === 'Comment' || text === 'Comentar' ||
                        text === 'Submit' || text === 'Enviar') &&
                        (cls.includes('comment') ||
                        cls.includes('artdeco') ||
                        cls.includes('submit') ||
                        btn.closest(
                            '[class*="comment-box"],' +
                            '[class*="comments-comment"],' +
                            'form[class*="comment"]'
                        ));
                    if (isSubmit || isSubmitText) {
                        submitBtn = btn;
                        break;
                    }
                }
            }

            if (submitBtn) break;

            if (attempt < 7) {
                editor.focus();
                editor.dispatchEvent(new InputEvent(
                    'input', {
                        bubbles: true,
                        inputType: 'insertText',
                        data: commentText
                    }
                ));
                editor.dispatchEvent(new KeyboardEvent(
                    'keydown', {
                        bubbles: true, key: 'a',
                        keyCode: 65
                    }
                ));
                editor.dispatchEvent(new KeyboardEvent(
                    'keyup', {
                        bubbles: true, key: 'a',
                        keyCode: 65
                    }
                ));
            }
        }

        if (submitBtn) {
            console.log(
                '[LinkedIn Bot] Clicking submit: ' +
                (submitBtn.className || '').substring(0, 50)
            );
            submitBtn.click();
            await delay(2000);

            const editorText = (
                editor.innerText ||
                editor.textContent || ''
            ).trim();
            if (editorText.length > 0 &&
                editorText !== commentText) {
                console.log(
                    '[LinkedIn Bot] Comment may not have ' +
                    'submitted (editor still has text)'
                );
            }
            return true;
        }

        console.log(
            '[LinkedIn Bot] No submit button found ' +
            'after 8 attempts. Editor scope: ' +
            (searchScope.className || '').substring(0, 60)
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
                'new role', 'achievement', 'milestone',
                'launched', 'shipped', 'certified',
                'graduated', 'accepted', 'first day',
                'new chapter', 'conquista', 'orgulho',
                'lancei', 'formei'],
            support: ['struggle', 'difficult', 'layoff',
                'mental health', 'challenge', 'tough',
                'burnout', 'let go', 'laid off',
                'lost my job', 'open to work',
                'looking for', 'job search',
                'desligado', 'demitido', 'busca'],
            insightful: ['research', 'data', 'study',
                'insight', 'analysis', 'trend', 'report',
                'pattern', 'architecture', 'design',
                'algorithm', 'framework', 'approach',
                'technical', 'engineering', 'system',
                'lesson', 'learned', 'tip:', 'dica',
                'strategy', 'best practice', 'solid',
                'clean code', 'refactor', 'performance',
                'scale', 'microservice', 'api',
                'deploy', 'ci/cd', 'testing',
                'padrão', 'arquitetura', 'solução'],
            funny: ['joke', 'humor', 'meme', 'funny',
                'lol', 'haha', 'kkkk', 'rsrs', '😂',
                '🤣', 'junior dev', 'senior dev',
                'it works on my machine', 'friday deploy',
                'merge conflict', 'stackoverflow'],
            love: ['passion', 'love', 'inspire',
                'grateful', 'thankful', 'amazing',
                'incredible', 'blessed', 'honored',
                'incrível', 'abençoado', 'grato',
                'obrigado', 'obrigada']
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
                        behavior: typeof scrollBehavior
                            === 'function'
                            ? scrollBehavior() : 'smooth',
                        block: 'center'
                    });
                    const postLen =
                        (postText || '').length;
                    const readTime =
                        typeof shouldSimulateReading
                            === 'function' &&
                        shouldSimulateReading(postLen)
                            ? readingDuration(postLen)
                            : 0;
                    await delay(
                        (typeof actionDelay === 'function'
                            ? actionDelay(profile)
                            : 1000 + Math.random() * 1500)
                        + readTime
                    );

                    let actions = [];

                    if (doReact) {
                        const reactionType =
                            getReactionType(
                                postText, reactionKeywords
                            );
                        console.log(
                            '[LinkedIn Bot] Reaction type: ' +
                            reactionType + ' (' +
                            REACTION_MAP[reactionType] + ')'
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
                        const lang = detectLanguage(postText);
                        const category =
                            classifyPost(postText);
                        const comment =
                            buildCommentFromPost(
                                postText,
                                commentTemplates.length > 0
                                    ? commentTemplates : null
                            );
                        console.log(
                            '[LinkedIn Bot] Comment: lang=' +
                            lang + ' cat=' + category +
                            ' text="' +
                            (comment || '').substring(0, 80) +
                            '"'
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
                            } else {
                                console.log(
                                    '[LinkedIn Bot] Comment ' +
                                    'failed to post'
                                );
                            }
                        }
                    }

                    if (actions.length > 0) {
                        totalEngaged++;
                        consecutiveFails = 0;
                        backoffMultiplier = 1;
                        if (urn) newUrns.push(urn);
                        const logEntry = {
                            author,
                            postText:
                                postText.substring(0, 100),
                            status: actions.join('+'),
                            time: new Date().toISOString()
                        };
                        engageLog.push(logEntry);
                        window.postMessage({
                            type: 'LINKEDIN_BOT_ANALYTICS',
                            entry: {
                                mode: 'feed',
                                category: classifyPost(
                                    postText
                                ),
                                reaction: actions.find(
                                    a => a !== 'commented'
                                ) || null,
                                commented: actions.includes(
                                    'commented'
                                ),
                                lang: detectLanguage(
                                    postText
                                ),
                                postLength:
                                    (postText || '').length
                            }
                        }, '*');
                        window.postMessage({
                            type: 'LINKEDIN_BOT_PROGRESS',
                            sent: totalEngaged,
                            limit,
                            page: scrollCount + 1,
                            skipped: 0
                        }, '*');
                    }

                    if (typeof shouldTakePause === 'function'
                        && shouldTakePause(
                            profile, totalEngaged
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
                                : 2000 + Math.random() * 3000
                        );
                    }

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
                    top: typeof scrollVariation === 'function'
                        ? scrollVariation()
                        : window.innerHeight * 0.8,
                    behavior: typeof scrollBehavior
                        === 'function'
                        ? scrollBehavior() : 'smooth'
                });
                scrollCount++;
                await delay(
                    typeof humanDelay === 'function'
                        ? humanDelay(3000, 1500)
                        : 3000 + Math.random() * 2000
                );
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
