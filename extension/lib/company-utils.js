function extractCompanyInfo(card) {
    const nameEl = card.querySelector(
        '.entity-result__title-text a span, ' +
        '.entity-result__title-text a, ' +
        '.app-aware-link span[dir]'
    );
    const name = nameEl
        ? (nameEl.innerText || nameEl.textContent || '')
            .trim().split('\n')[0]
        : 'Unknown';
    const subtitleEl = card.querySelector(
        '.entity-result__primary-subtitle'
    );
    const subtitle = subtitleEl
        ? (subtitleEl.innerText ||
            subtitleEl.textContent || '').trim()
        : '';
    const linkEl = card.querySelector(
        'a[href*="/company/"]'
    );
    const companyUrl = linkEl
        ? linkEl.href.split('?')[0] : '';
    return { name, subtitle, companyUrl };
}

function matchesTargetCompanies(companyName, targets) {
    if (!targets || !targets.length) return true;
    const lower = (companyName || '').toLowerCase();
    return targets.some(t =>
        lower.includes(t.toLowerCase())
    );
}

function isFollowingText(text) {
    const t = (text || '').trim();
    return t === 'Following' || t === 'Seguindo';
}

function isNextPageButton(btn) {
    if (!btn || btn.disabled) return false;
    const label = btn.getAttribute('aria-label') || '';
    return label === 'Next' || label === 'Avançar';
}

function detectChallenge() {
    const url = (typeof window !== 'undefined'
        ? window.location.href : '');
    if (/checkpoint|authwall|challenge/i.test(url)) {
        return true;
    }
    const body = typeof document !== 'undefined'
        ? document.body : null;
    const text = (body?.innerText ||
        body?.textContent || '');
    return /security verification|unusual activity|verificação de segurança/i.test(text);
}

function buildCompanySearchUrl(query) {
    return 'https://www.linkedin.com/search/results/' +
        'companies/' +
        `?keywords=${encodeURIComponent(query)}` +
        '&origin=FACETED_SEARCH';
}

function findCompanyCards(root) {
    const el = root || document;
    return el.querySelectorAll(
        '.entity-result, ' +
        '[data-chameleon-result-urn], ' +
        '.reusable-search__result-container'
    );
}

function findFollowBtnInCard(card) {
    const btns = card.querySelectorAll('button');
    for (const btn of btns) {
        if (isCompanyFollowText(
            btn.innerText || btn.textContent
        ) && !btn.disabled) {
            return btn;
        }
    }
    return null;
}

function isCompanyFollowText(text) {
    const t = (text || '').trim().replace(/^\+\s*/, '');
    return t === 'Follow' || t === 'Seguir';
}

function buildBatchFromRotation(
    allCompanies, startIdx, batchSize
) {
    if (!allCompanies || !allCompanies.length) return [];
    const start = startIdx % allCompanies.length;
    return allCompanies.slice(start, start + batchSize);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        extractCompanyInfo,
        matchesTargetCompanies,
        isFollowingText,
        isNextPageButton,
        detectChallenge,
        buildCompanySearchUrl,
        findCompanyCards,
        findFollowBtnInCard,
        isCompanyFollowText,
        buildBatchFromRotation
    };
}
