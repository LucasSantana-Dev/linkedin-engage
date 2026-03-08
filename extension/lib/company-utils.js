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

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        extractCompanyInfo,
        matchesTargetCompanies,
        isFollowingText,
        isNextPageButton
    };
}
