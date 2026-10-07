(function(root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
    root.LinkedInSearchResultCard = api;
    Object.keys(api).forEach(k => { if (typeof root[k] === 'undefined') root[k] = api[k]; });
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
    // Pure card resolution for LinkedIn people/company search results.
    // Legacy layout: .entity-result, li, [data-chameleon-result-urn].
    // 2026-10 layout: div[role="listitem"] with obfuscated classes.
    // Every helper takes its element as a parameter: no document/chrome reads.

    const LEGACY_LIST_SELECTOR =
        '.entity-result, ' +
        '.reusable-search__result-container, ' +
        'li.reusable-search__result-container, ' +
        '[data-chameleon-result-urn], ' +
        'div[data-view-name="search-entity-result-universal-template"]';
    const LEGACY_CARD_SELECTOR = LEGACY_LIST_SELECTOR + ', li';
    const LISTITEM_SELECTOR = '[role="listitem"]';
    const SEARCH_RESULT_CARD_SELECTOR =
        LEGACY_LIST_SELECTOR + ', ' + LISTITEM_SELECTOR;
    const COMPANY_LEGACY_SELECTOR =
        '.entity-result, ' +
        '[data-chameleon-result-urn], ' +
        '.reusable-search__result-container';

    function textOf(el) {
        if (!el) return '';
        return String(el.innerText || el.textContent || '').trim();
    }

    function squash(text) {
        return String(text || '').replace(/\s+/g, ' ').trim();
    }

    // Nearest result card around a control. Legacy selectors win, then the
    // role="listitem" card. The mutual-connection avatar <li> elements sit
    // beside the controls, never above them.
    function findResultCard(el) {
        if (!el || typeof el.closest !== 'function') return null;
        return el.closest(LEGACY_CARD_SELECTOR) ||
            el.closest(LISTITEM_SELECTOR);
    }

    // First link matching the selector that carries text, else the first.
    // Guards against empty anchor clones some parsers leave behind.
    function firstLabelledLink(scope, selector) {
        const links = Array.from(scope.querySelectorAll(selector));
        return links.find(a => squash(textOf(a))) || links[0] || null;
    }

    function infoBlocks(nameEl) {
        const nameP = nameEl && nameEl.closest('p');
        const out = [];
        let sib = nameP ? nameP.nextElementSibling : null;
        while (sib) {
            const p = sib.matches('p') ? sib : sib.querySelector('p');
            if (p) out.push(squash(textOf(p)));
            sib = sib.nextElementSibling;
        }
        return out;
    }

    function parseMutual(card) {
        const legacy = card.querySelector(
            '.entity-result__simple-insight, .member-insights__reason'
        );
        const texts = legacy
            ? [textOf(legacy)]
            : Array.from(card.querySelectorAll('a')).map(textOf);
        for (const t of texts) {
            const m = t.match(
                /(\d+)\s*(?:other\s+|outras?\s+)?(?:mutual|conex\S*\s+em\s+comum)/i
            );
            if (m) return parseInt(m[1], 10);
        }
        return 0;
    }

    function extractPersonCardInfo(card) {
        if (!card) return { name: 'Unknown', headline: '' };
        const nameEl = card.querySelector(
            '.entity-result__title-text a span[dir], ' +
            '.entity-result__title-text a, ' +
            'span.entity-result__title-text'
        );
        const nameLink = firstLabelledLink(card, 'p > a[href*="/in/"]');
        const legacyHeadline = card.querySelector(
            '.entity-result__primary-subtitle'
        );
        const blocks = nameLink && !legacyHeadline
            ? infoBlocks(nameLink) : [];
        let name = 'Unknown';
        if (nameEl) {
            name = textOf(nameEl).split('\n')[0];
        } else if (nameLink) {
            name = squash(textOf(nameLink)) || 'Unknown';
        }
        const headline = legacyHeadline
            ? textOf(legacyHeadline) : (blocks[0] || '');
        const linkEl = nameLink || card.querySelector('a[href*="/in/"]');
        const profileUrl = linkEl
            ? String(linkEl.href || '').split('?')[0] : '';
        const locEl = card.querySelector(
            '.entity-result__secondary-subtitle'
        );
        const location = locEl ? textOf(locEl) : (blocks[1] || '');
        const summaryEl = card.querySelector('.entity-result__summary');
        let summary = summaryEl ? textOf(summaryEl) : '';
        if (!summaryEl) {
            const cur = Array.from(card.querySelectorAll('p')).find(
                p => /^(?:current|atual)\s*:/i.test(textOf(p))
            );
            summary = cur ? squash(textOf(cur)) : '';
        }
        const imgEl = card.querySelector(
            'img.presence-entity__image, ' +
            'img.EntityPhoto-circle-5, ' +
            'img[data-delayed-url], ' +
            'figure img'
        );
        const photoUrl = imgEl
            ? ((imgEl.getAttribute('src') && imgEl.src) ||
                (imgEl.dataset && imgEl.dataset.delayedUrl) || '')
            : '';
        return {
            name, headline, profileUrl, location, summary, photoUrl,
            mutualConnections: parseMutual(card)
        };
    }

    // Company cards under root: legacy selectors plus role="listitem" cards
    // that hold a company link, scoped to <main> when the page has one.
    function findCompanyResultCards(root) {
        if (!root || typeof root.querySelectorAll !== 'function') return [];
        const out = new Set(root.querySelectorAll(COMPANY_LEGACY_SELECTOR));
        const scope = root.querySelector('main') || root;
        for (const item of scope.querySelectorAll(LISTITEM_SELECTOR)) {
            if (item.querySelector('a[href*="/company/"]')) out.add(item);
        }
        return Array.from(out);
    }

    // Subtitle for the role="listitem" company card: industry/location block
    // right after the name. Empty when the card has no company link.
    function extractCompanyCardSubtitle(card) {
        const link = card &&
            firstLabelledLink(card, 'p > a[href*="/company/"]');
        return link ? (infoBlocks(link)[0] || '') : '';
    }

    return Object.freeze({
        SEARCH_RESULT_CARD_SELECTOR,
        findResultCard,
        extractPersonCardInfo,
        findCompanyResultCards,
        extractCompanyCardSubtitle
    });
});
