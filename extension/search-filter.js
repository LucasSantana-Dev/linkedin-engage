(function () {
    if (window.__leSearchFilter) return;
    window.__leSearchFilter = true;

    function isMessageBtn(btn) {
        const aria = (
            btn.getAttribute('aria-label') || ''
        ).toLowerCase();
        if (aria.startsWith('message') ||
            aria.startsWith('mensagem')) {
            return true;
        }
        const text = (btn.innerText || '')
            .trim().toLowerCase();
        return text === 'message' || text === 'mensagem';
    }

    function isConnectBtn(btn) {
        const aria = (
            btn.getAttribute('aria-label') || ''
        ).toLowerCase();
        if (aria.includes('invite') &&
            aria.includes('connect')) {
            return true;
        }
        if (aria === 'connect' || aria === 'conectar') {
            return true;
        }
        const text = (btn.innerText || '')
            .trim().toLowerCase();
        return text === 'connect' || text === 'conectar';
    }

    function dimCards() {
        const cards = document.querySelectorAll(
            '.entity-result, ' +
            '.reusable-search__result-container, ' +
            '[data-chameleon-result-urn]'
        );
        for (const card of cards) {
            if (card.dataset.leDone) continue;
            const btns = card.querySelectorAll('button, a');
            let hasConnect = false;
            let hasMessage = false;
            for (const b of btns) {
                if (isMessageBtn(b)) hasMessage = true;
                if (isConnectBtn(b)) hasConnect = true;
            }
            if (hasMessage && !hasConnect) {
                card.style.setProperty(
                    'opacity', '0.15', 'important'
                );
                card.style.setProperty(
                    'pointer-events', 'none', 'important'
                );
                card.dataset.leDone = 'dim';
            } else if (hasConnect) {
                card.dataset.leDone = 'ok';
            }
        }
    }

    function stripFirstDegree() {
        const url = new URL(window.location.href);
        const raw = url.searchParams.get('network');
        if (!raw) return;
        try {
            const arr = JSON.parse(raw);
            if (!Array.isArray(arr) ||
                !arr.includes('F')) return;
            const filtered = arr.filter(v => v !== 'F');
            if (filtered.length === 0) {
                filtered.push('S', 'O');
            }
            url.searchParams.set(
                'network',
                JSON.stringify(filtered)
            );
            window.location.replace(url.toString());
        } catch (e) {}
    }

    stripFirstDegree();
    dimCards();

    const obs = new MutationObserver(dimCards);
    if (document.body) {
        obs.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    setInterval(dimCards, 1500);
})();
