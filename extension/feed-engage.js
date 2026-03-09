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

    function getMyName() {
        var el = document.querySelector(
            '.feed-identity-module__actor-meta a,' +
            'a[href*="/in/"][class*="ember-view"]' +
            '[data-test-global-nav-item],' +
            '.global-nav__me-photo,' +
            'img.feed-identity-module__member-photo'
        );
        if (el) {
            var alt = el.getAttribute('alt') || '';
            if (alt.length > 2) return alt.trim();
            var txt = (el.innerText ||
                el.textContent || '').trim();
            if (txt.length > 2)
                return txt.split('\n')[0].trim();
        }
        var meLink = document.querySelector(
            '.feed-identity-module a[href*="/in/"]'
        );
        if (meLink) {
            return (meLink.innerText ||
                meLink.textContent || '').trim()
                .split('\n')[0].trim();
        }
        return '';
    }

    function alreadyCommented(existing, myName) {
        if (!myName || !existing || !existing.length)
            return false;
        var lower = myName.toLowerCase();
        return existing.some(function(c) {
            return (c.author || '').toLowerCase()
                .includes(lower) ||
                lower.includes(
                    (c.author || '').toLowerCase());
        });
    }

    let aiRequestId = 0;
    function requestAIComment(data) {
        return new Promise((resolve) => {
            const rid = ++aiRequestId;
            const timeout = setTimeout(
                () => {
                    window.removeEventListener(
                        'message', handler
                    );
                    resolve(null);
                }, 15000
            );
            function handler(event) {
                if (event.data?.type !==
                    'LINKEDIN_BOT_AI_COMMENT_RESULT')
                    return;
                if (event.data.requestId !== rid)
                    return;
                clearTimeout(timeout);
                window.removeEventListener(
                    'message', handler
                );
                resolve(event.data.comment || null);
            }
            window.addEventListener(
                'message', handler
            );
            window.postMessage({
                type: 'LINKEDIN_BOT_AI_COMMENT',
                ...data,
                requestId: rid
            }, '*');
        });
    }

    function detectChallenge() {
        const url = window.location.href;
        if (/checkpoint|authwall|challenge/i.test(url)) {
            return true;
        }
        const text = document.body?.innerText || '';
        return /security verification|unusual activity|verificação de segurança/i.test(text);
    }

    async function expandSeeMore(postEl) {
        var seeMoreBtn = postEl.querySelector(
            '[data-testid="expandable-text-button"]'
        );
        if (seeMoreBtn) {
            seeMoreBtn.click();
            await delay(300);
            return;
        }
        var links = postEl.querySelectorAll(
            'a, button, span'
        );
        for (var el of links) {
            var text = (el.innerText ||
                el.textContent || '').trim().toLowerCase();
            if (text === '…more' || text === '...more' ||
                text === 'more' || text === '…mais' ||
                text === '...mais' || text === 'mais' ||
                text === 'see more' ||
                text === 'ver mais' ||
                text === '\u2026 more' ||
                text === '\u2026 mais') {
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

    function ensureActionBar(el) {
        if (!el) return el;
        const hasBtn = el.querySelector(
            'button[aria-label*="Reaction button"], ' +
            'button[aria-label*="Open reactions"], ' +
            'button[aria-label*="Like"], ' +
            'button[aria-label*="React"]'
        );
        if (hasBtn) return el;
        let parent = el.parentElement;
        for (let i = 0; i < 8; i++) {
            if (!parent) break;
            if (parent.getAttribute('role') === 'listitem') {
                return parent;
            }
            if (parent.classList?.contains(
                'feed-shared-update-v2') ||
                parent.classList?.contains(
                    'occludable-update')) {
                return parent;
            }
            parent = parent.parentElement;
        }
        return el;
    }

    function findActionButtons(postEl) {
        const likeBtn = postEl.querySelector(
            'button[aria-label*="Reaction button"], ' +
            'button[aria-label*="Open reactions"]'
        );
        if (likeBtn) {
            let container = likeBtn.parentElement;
            for (let i = 0; i < 6; i++) {
                if (!container) break;
                const btns = container.querySelectorAll(
                    'button'
                );
                if (btns.length >= 3) return btns;
                container = container.parentElement;
            }
        }
        const bar = postEl.querySelector(
            '.feed-shared-social-action-bar, ' +
            '[class*="social-action-bar"], ' +
            '[class*="social-actions"]'
        );
        const scope = bar || postEl;
        return scope.querySelectorAll('button');
    }

    function findPosts() {
        const feedList = document.querySelector(
            '[data-testid="mainFeed"]'
        );
        if (feedList) {
            const items = feedList.querySelectorAll(
                '[role="listitem"]'
            );
            if (items.length > 0) {
                console.log(
                    '[LinkedIn Bot] findPosts: matched ' +
                    items.length +
                    ' via mainFeed listitem'
                );
                return [...items];
            }
            var postChildren = [];
            for (var c of feedList.children) {
                if (c.querySelector(
                    '[data-testid="expandable-text-box"]'
                ) || c.querySelector(
                    'button[aria-label*="Reaction"]'
                )) {
                    postChildren.push(c);
                }
            }
            if (postChildren.length > 0) {
                console.log(
                    '[LinkedIn Bot] findPosts: matched ' +
                    postChildren.length +
                    ' via mainFeed children'
                );
                return postChildren;
            }
        }

        const sel =
            'div[data-urn*="activity"], ' +
            'div[data-urn*="ugcPost"], ' +
            '.feed-shared-update-v2, ' +
            '.occludable-update';
        let posts = document.querySelectorAll(sel);
        if (posts.length > 0) {
            const adjusted = [];
            const seen = new Set();
            for (const p of posts) {
                const wide = ensureActionBar(p);
                const key = wide.getAttribute('data-urn') ||
                    wide.getAttribute('data-id') ||
                    wide.className;
                if (!seen.has(key)) {
                    seen.add(key);
                    adjusted.push(wide);
                }
            }
            console.log(
                '[LinkedIn Bot] findPosts: matched ' +
                adjusted.length + ' via legacy selectors'
            );
            return adjusted;
        }

        const likeBtns = document.querySelectorAll(
            'button[aria-label*="Reaction button"], ' +
            'button[aria-label*="Like"], ' +
            'button[aria-label*="Gostei"], ' +
            'button[aria-label*="React"], ' +
            'button[aria-label*="Reagir"]'
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
            while (el && depth < 12) {
                if (el.getAttribute('role') ===
                    'listitem') {
                    if (!seen.has(el)) {
                        seen.add(el);
                        real.push(el);
                    }
                    break;
                }
                const urn =
                    el.getAttribute('data-urn') ||
                    el.getAttribute('data-id') || '';
                if (urn && (urn.includes('activity') ||
                    urn.includes('ugcPost'))) {
                    if (!seen.has(urn)) {
                        seen.add(urn);
                        real.push(el);
                    }
                    break;
                }
                el = el.parentElement;
                depth++;
            }
            if (!el || depth >= 12) {
                let container = btn;
                for (let i = 0; i < 8; i++) {
                    if (!container.parentElement) break;
                    container = container.parentElement;
                    const rect =
                        container.getBoundingClientRect();
                    if (rect.height > 150 &&
                        rect.width > 400) {
                        if (!seen.has(container)) {
                            seen.add(container);
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

    const BOILERPLATE_RE = new RegExp(
        '^(' +
        'like|comment|repost|send|share|follow|' +
        'gostei|comentar|compartilhar|enviar|seguir|' +
        'reaction button|open reactions|' +
        'feed post|promoted|\\d+\\s*(comments?|' +
        'reactions?|reposts?|likes?|views?)' +
        ')$', 'i'
    );

    function getPostText(postEl) {
        if (!postEl) return '';
        var textBox = postEl.querySelector(
            '[data-testid="expandable-text-box"]'
        );
        if (textBox) {
            var t = (textBox.innerText || '').trim();
            if (t.length > 10) return t;
        }
        var allText = (postEl.innerText || '').trim();
        if (!allText) return '';
        var lines = allText.split('\n')
            .map(function(l) { return l.trim(); })
            .filter(function(l) {
                return l.length > 5 &&
                    !BOILERPLATE_RE.test(l);
            });
        var content = lines.filter(
            function(l) { return l.length > 30; }
        );
        if (content.length > 0) {
            return content.slice(0, 10).join(' ');
        }
        return lines.slice(0, 5).join(' ')
            .substring(0, 500);
    }

    function getPostAuthor(postEl) {
        if (!postEl) return 'Unknown';
        var stripRe =
            /\s*(Premium Profile|Verified|Profile|\d+(st|nd|rd|th)\+?)\s*/gi;
        var links = postEl.querySelectorAll(
            'a[href*="/in/"]'
        );
        for (var a of links) {
            var raw = (a.innerText || '').trim();
            if (raw.length < 3) continue;
            var name = raw.split('\n')[0].trim()
                .replace(stripRe, ' ').trim();
            if (name.length > 2 && name.length < 60) {
                return name;
            }
        }
        var companyLinks = postEl.querySelectorAll(
            'a[href*="/company/"]'
        );
        for (var c of companyLinks) {
            var cRaw = (c.innerText || '').trim();
            if (cRaw.length < 3) continue;
            var cName = cRaw.split('\n')[0].trim();
            if (cName.length > 2 && cName.length < 60) {
                return cName;
            }
        }
        var oldSel =
            '.update-components-actor__name span, ' +
            '.feed-shared-actor__name span';
        var el = postEl.querySelector(oldSel);
        return el
            ? el.innerText.trim().split('\n')[0]
            : 'Unknown';
    }

    function getPostUrn(postEl) {
        if (!postEl) return '';
        const urn = postEl.getAttribute('data-urn') ||
            postEl.getAttribute('data-entity-urn') ||
            postEl.getAttribute('data-id') || '';
        if (urn) return urn;
        const tracked = postEl.querySelector(
            '[data-view-tracking-scope]'
        );
        if (tracked) {
            const scope = tracked.getAttribute(
                'data-view-tracking-scope'
            ) || '';
            const m = scope.match(
                /"contentTrackingId":"([^"]+)"/
            );
            if (m) return m[1];
        }
        const idx = [...(postEl.parentElement
            ?.children || [])].indexOf(postEl);
        return 'post-' + idx;
    }

    async function reactToPost(postEl, reactionType) {
        let likeBtn = postEl.querySelector(
            'button[aria-label*="Reaction button"]'
        );
        if (!likeBtn) {
            const actionBtns = findActionButtons(postEl);
            for (const btn of actionBtns) {
                const label = (
                    btn.getAttribute('aria-label') || ''
                ).toLowerCase();
                const text = (
                    btn.innerText ||
                    btn.textContent || ''
                ).trim().toLowerCase();
                if (label.includes('like') ||
                    label.includes('gostei') ||
                    label.includes('react') ||
                    label.includes('reagir') ||
                    text === 'like' ||
                    text === 'gostei') {
                    likeBtn = btn;
                    break;
                }
            }
        }
        if (!likeBtn) {
            const actionBtns = findActionButtons(postEl);
            console.log(
                '[LinkedIn Bot] No like button found. ' +
                'Buttons in scope: ' +
                [...actionBtns].map(b =>
                    b.getAttribute('aria-label') ||
                    (b.innerText || '').substring(0, 20)
                ).slice(0, 10).join(', ')
            );
            return false;
        }

        const btnLabel = (
            likeBtn.getAttribute('aria-label') || ''
        ).toLowerCase();
        const alreadyLiked =
            likeBtn.getAttribute('aria-pressed') ===
                'true' ||
            btnLabel.includes('liked') ||
            btnLabel.includes('reacted') ||
            (btnLabel.includes('reaction button') &&
                !btnLabel.includes('no reaction'));
        if (alreadyLiked) return false;

        if (reactionType === 'LIKE') {
            likeBtn.click();
            await delay(500);
            return true;
        }

        async function tryOpenReactionPopup() {
            const menuBtn = postEl.querySelector(
                'button[aria-label="Open reactions menu"]'
            );
            if (menuBtn) {
                menuBtn.click();
                await delay(1000);
            } else {
                const rect =
                    likeBtn.getBoundingClientRect();
                const cx = rect.x + rect.width / 2;
                const cy = rect.y + rect.height / 2;
                for (const evt of [
                    'pointerenter', 'mouseenter',
                    'mouseover'
                ]) {
                    likeBtn.dispatchEvent(
                        new MouseEvent(evt, {
                            bubbles: true,
                            cancelable: true,
                            clientX: cx, clientY: cy
                        })
                    );
                }
                await delay(2000);
            }

            const popupSels = [
                '[role="toolbar"]',
                '[role="listbox"]',
                '.reactions-menu',
                '[class*="reactions-menu"]',
                '.artdeco-hoverable-content--visible'
            ];
            for (const sel of popupSels) {
                const el = document.querySelector(sel);
                if (el &&
                    el.querySelectorAll('button, img')
                        .length >= 2) {
                    return el;
                }
            }

            const rect = likeBtn.getBoundingClientRect();
            const above = document.elementsFromPoint(
                rect.x + rect.width / 2,
                rect.y - 40
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

        let inserted = false;
        try {
            inserted = document.execCommand(
                'insertText', false, text
            );
        } catch (e) {}

        const current = (editor.innerText || '').trim();
        if (!inserted || current !== text.trim()) {
            while (editor.firstChild) {
                editor.removeChild(editor.firstChild);
            }
            const p = document.createElement('p');
            p.textContent = text;
            editor.appendChild(p);
        }

        for (const evtType of ['input', 'change']) {
            editor.dispatchEvent(new InputEvent(evtType, {
                bubbles: true,
                inputType: 'insertText',
                data: text
            }));
        }
        for (const evtType of ['keydown', 'keyup']) {
            editor.dispatchEvent(new KeyboardEvent(
                evtType, {
                    bubbles: true, key: 'a',
                    keyCode: 65, which: 65
                }
            ));
        }

        const nativeSetter =
            Object.getOwnPropertyDescriptor(
                HTMLElement.prototype, 'innerText'
            )?.set;
        if (nativeSetter) {
            try {
                nativeSetter.call(editor, text);
                editor.dispatchEvent(new Event(
                    'input', { bubbles: true }
                ));
            } catch (e) {}
        }
    }

    function findCommentSection(postEl) {
        let container = postEl;
        for (let i = 0; i < 5; i++) {
            if (!container) break;
            const editor = container.querySelector(
                'div[role="textbox"]' +
                '[contenteditable="true"]'
            );
            if (editor) {
                const form = editor.closest('form');
                if (form) return form;
                let parent = editor.parentElement;
                for (let d = 0; d < 8; d++) {
                    if (!parent) break;
                    if (parent.querySelectorAll(
                        'button'
                    ).length >= 2) {
                        return parent;
                    }
                    parent = parent.parentElement;
                }
                return editor.parentElement;
            }
            const section = container.querySelector(
                '.comments-comment-box, ' +
                'form[class*="comment"], ' +
                'div[class*="comments-comment-box"]'
            );
            if (section) return section;
            container = container.parentElement;
        }
        return null;
    }

    async function commentOnPost(postEl, commentText) {
        const actionBtns = findActionButtons(postEl);
        let commentBtn = null;
        for (const btn of actionBtns) {
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
                '[LinkedIn Bot] No comment button found.' +
                ' Action buttons: ' +
                [...actionBtns].map(b =>
                    b.getAttribute('aria-label') ||
                    (b.innerText || '').substring(0, 20)
                ).slice(0, 10).join(', ')
            );
            return false;
        }

        commentBtn.scrollIntoView({
            behavior: 'smooth', block: 'center'
        });
        await delay(300);
        commentBtn.click();

        const editorSels = [
            'div[role="textbox"]' +
                '[contenteditable="true"]',
            'div[contenteditable="true"]' +
                '[aria-label*="Text editor"]',
            'div[contenteditable="true"]' +
                '[aria-label*="comment"]',
            'div[contenteditable="true"]' +
                '[aria-label*="comentário"]',
            'div[contenteditable="true"]' +
                '.ql-editor',
            'div[contenteditable="true"]' +
                '[class*="editor"]'
        ];
        const editorSelJoined = editorSels.join(', ');

        let editor = null;
        let searchScope = postEl;
        for (let i = 0; i < 12; i++) {
            await delay(500);

            const commentSection =
                findCommentSection(postEl);
            if (commentSection) {
                editor = commentSection.querySelector(
                    editorSelJoined
                );
                if (editor) {
                    searchScope = commentSection;
                    break;
                }
            }

            editor = postEl.querySelector(
                editorSelJoined
            );
            if (editor) break;

            let parent = postEl.parentElement;
            for (let d = 0; d < 3 && !editor; d++) {
                if (!parent) break;
                editor = parent.querySelector(
                    editorSelJoined
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

                    const ctrlName =
                        btn.getAttribute(
                            'data-control-name') || '';
                    const isSubmit =
                        cls.includes('submit-button') ||
                        cls.includes('comments-comment-box' +
                            '__submit-button') ||
                        ctrlName === 'submit_comment' ||
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
                    const nearEditor = (() => {
                        if (!editor) return false;
                        let p = editor.parentElement;
                        for (let d = 0; d < 6; d++) {
                            if (!p) return false;
                            if (p.contains(btn))
                                return true;
                            p = p.parentElement;
                        }
                        return false;
                    })();
                    const isSubmitText =
                        (text === 'Post' ||
                        text === 'Publicar' ||
                        text === 'Comment' ||
                        text === 'Comentar' ||
                        text === 'Submit' ||
                        text === 'Enviar') &&
                        (nearEditor ||
                        cls.includes('comment') ||
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

    var commentedPostUrns = new Set();

    function loadCommentedUrns() {
        return new Promise(resolve => {
            const handler = (event) => {
                if (event.source !== window) return;
                if (event.data?.type ===
                    'LINKEDIN_BOT_COMMENTED_LOADED') {
                    window.removeEventListener(
                        'message', handler
                    );
                    resolve(event.data.urns || []);
                }
            };
            window.addEventListener('message', handler);
            window.postMessage({
                type: 'LINKEDIN_BOT_LOAD_COMMENTED'
            }, '*');
            setTimeout(() => {
                window.removeEventListener(
                    'message', handler
                );
                resolve([]);
            }, 3000);
        });
    }

    function saveCommentedUrns(urns) {
        window.postMessage({
            type: 'LINKEDIN_BOT_SAVE_COMMENTED',
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
        const aiApiKey = config?.aiApiKey || '';
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
        let totalCommented = 0;
        const MAX_COMMENTS_PER_SESSION = 8;
        const MIN_POST_LENGTH = 80;
        let scrollCount = 0;
        const MAX_SCROLLS = 20;
        const previousUrns = await loadEngagedUrns();
        const processedUrns = new Set(previousUrns);
        const newUrns = [];
        const prevCommented = await loadCommentedUrns();
        for (var cu of prevCommented) {
            commentedPostUrns.add(cu);
        }
        const newCommentedUrns = [];
        console.log(
            '[LinkedIn Bot] Loaded ' +
            previousUrns.length +
            ' previously engaged URNs, ' +
            commentedPostUrns.size +
            ' previously commented URNs'
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
                        if (newCommentedUrns.length > 0) {
                            saveCommentedUrns(
                                newCommentedUrns);
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
                    const authorTitle =
                        typeof getPostAuthorTitle ===
                            'function'
                            ? getPostAuthorTitle(post)
                            : '';

                    var postReactions =
                        typeof getPostReactions ===
                            'function'
                            ? getPostReactions(post)
                            : {};

                    console.log(
                        '[LinkedIn Bot] Post by ' + author +
                        ': "' + postText.substring(0, 80) +
                        '..." | lang=' +
                        detectLanguage(postText) +
                        ' cat=' + classifyPost(
                            postText, postReactions) +
                        ' reactions=' +
                        JSON.stringify(postReactions)
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

                    let skipComment = false;
                    if (doComment) {
                        var detectedLang =
                            detectLanguage(postText);
                        const category =
                            classifyPost(
                                postText, postReactions);
                        const existing =
                            typeof getExistingComments ===
                                'function'
                                ? getExistingComments(post)
                                : [];
                        const commentThreadSummary =
                            typeof summarizeCommentThread ===
                                'function'
                                ? summarizeCommentThread(
                                    existing
                                )
                                : null;
                        const reactionSummary =
                            typeof summarizeReactions ===
                                'function'
                                ? summarizeReactions(
                                    postReactions
                                )
                                : null;
                        const imageSignals =
                            typeof getPostImageSignals ===
                                'function'
                                ? getPostImageSignals(post)
                                : null;

                        if (urn && commentedPostUrns
                            .has(urn)) {
                            console.log(
                                '[LinkedIn Bot] URN ' +
                                'already commented, skip'
                            );
                            skipComment = true;
                        }
                        if (!skipComment &&
                            alreadyCommented(
                                existing, getMyName())) {
                            console.log(
                                '[LinkedIn Bot] Already' +
                                ' commented (name), skip'
                            );
                            skipComment = true;
                        }
                        if (!skipComment &&
                            totalCommented >=
                            MAX_COMMENTS_PER_SESSION) {
                            console.log(
                                '[LinkedIn Bot] Comment' +
                                ' cap reached (' +
                                MAX_COMMENTS_PER_SESSION +
                                '), skip rest'
                            );
                            skipComment = true;
                        }
                        if (!skipComment &&
                            postText.length <
                            MIN_POST_LENGTH) {
                            console.log(
                                '[LinkedIn Bot] Post too' +
                                ' short (' +
                                postText.length +
                                ' chars), skip comment'
                            );
                            skipComment = true;
                        }
                        if (existing.length > 0) {
                            var ptComments = existing
                                .filter(function(c) {
                                    return detectLanguage(
                                        c.text) === 'pt';
                                }).length;
                            if (ptComments >
                                existing.length / 2) {
                                detectedLang = 'pt';
                            }
                        }
                        const lang = detectedLang;
                        if (!skipComment &&
                            typeof isPolemicPost ===
                            'function' &&
                            isPolemicPost(
                                postText, existing)) {
                            console.log(
                                '[LinkedIn Bot] Skipping' +
                                ' comment — polemic post'
                            );
                            skipComment = true;
                        }
                        if (existing.length > 0) {
                            console.log(
                                '[LinkedIn Bot] Found ' +
                                existing.length +
                                ' existing comments: ' +
                                existing.map(function(c) {
                                    return c.sentiment;
                                }).join(', ')
                            );
                        }

                        let comment = null;
                        if (skipComment) {
                            comment = null;
                        } else if (aiApiKey) {
                            console.log(
                                '[LinkedIn Bot] Requesting' +
                                ' AI comment...'
                            );
                            comment =
                                await requestAIComment({
                                    postText,
                                    existingComments: existing,
                                    author,
                                    authorTitle,
                                    lang,
                                    category,
                                    reactions: postReactions,
                                    reactionSummary,
                                    commentThreadSummary,
                                    imageSignals,
                                    apiKey: aiApiKey
                                });
                            if (comment) {
                                console.log(
                                    '[LinkedIn Bot] AI' +
                                    ' comment: "' +
                                    comment.substring(0, 80)
                                    + '"'
                                );
                            } else {
                                console.log(
                                    '[LinkedIn Bot] AI' +
                                    ' failed, using' +
                                    ' template fallback'
                                );
                            }
                        }

                        if (!comment) {
                            comment =
                                buildCommentFromPost(
                                    postText,
                                    commentTemplates
                                        .length > 0
                                        ? commentTemplates
                                        : null,
                                    existing
                                );
                        }
                        if (comment &&
                            typeof isLowQualityComment ===
                                'function' &&
                            isLowQualityComment(
                                comment, postText)) {
                            console.log(
                                '[LinkedIn Bot] Skipping' +
                                ' low quality comment: "' +
                                comment.substring(0, 60) + '"'
                            );
                            comment = null;
                        }
                        console.log(
                            '[LinkedIn Bot] Comment: lang=' +
                            lang + ' cat=' + category +
                            ' text="' +
                            (comment || '').substring(0, 80) +
                            '"'
                        );
                        if (comment) {
                            await delay(
                                5000 + Math.random() * 8000
                            );
                            const commented =
                                await commentOnPost(
                                    post, comment
                                );
                            if (commented) {
                                actions.push('commented');
                                totalCommented++;
                                if (urn) {
                                    commentedPostUrns
                                        .add(urn);
                                    newCommentedUrns
                                        .push(urn);
                                }
                                await delay(
                                    3000 +
                                    Math.random() * 5000
                                );
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
                                    postText,
                                    postReactions
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
                                : 3000 + Math.random() * 5000
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
            if (newCommentedUrns.length > 0) {
                saveCommentedUrns(newCommentedUrns);
                console.log(
                    '[LinkedIn Bot] Saved ' +
                    newCommentedUrns.length +
                    ' new commented URNs'
                );
            }

            if (config?.nurtureTarget?.profileUrl &&
                totalEngaged > 0) {
                window.postMessage({
                    type: 'LINKEDIN_BOT_NURTURE_ENGAGED',
                    profileUrl:
                        config.nurtureTarget.profileUrl
                }, '*');
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
            if (newCommentedUrns.length > 0) {
                saveCommentedUrns(newCommentedUrns);
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
