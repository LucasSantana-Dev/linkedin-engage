(function () {
    if (window.__linkedInSearchFilterActive) return;
    window.__linkedInSearchFilterActive = true;

    const STYLE_ID = 'le-search-filter-style';

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent =
            '[data-le-filtered="message"] {' +
            '  opacity: 0.15 !important;' +
            '  pointer-events: none !important;' +
            '  transition: opacity 0.3s ease !important;' +
            '}';
        document.head.appendChild(style);
    }

    function dimConnectedCards() {
        const cards = document.querySelectorAll(
            '.entity-result, ' +
            '.reusable-search__result-container, ' +
            'li.reusable-search__result-container'
        );
        for (const card of cards) {
            if (card.getAttribute('data-le-filtered')) {
                continue;
            }
            const btns = card.querySelectorAll(
                'button, a[href*="messaging"]'
            );
            let hasConnect = false;
            let hasMessage = false;
            for (const b of btns) {
                const t = (b.innerText || '')
                    .trim().toLowerCase();
                if (t === 'connect' || t === 'conectar') {
                    hasConnect = true;
                }
                if (t === 'message' || t === 'mensagem') {
                    hasMessage = true;
                }
            }
            if (hasMessage && !hasConnect) {
                card.setAttribute(
                    'data-le-filtered', 'message'
                );
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
    injectStyle();

    function run() {
        injectStyle();
        dimConnectedCards();
    }

    run();

    const observer = new MutationObserver(run);
    observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true
    });

    setInterval(run, 2000);
})();
