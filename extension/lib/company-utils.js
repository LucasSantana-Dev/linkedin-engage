function normalizeCompanyName(value) {
    return String(value || '')
        .trim()
        .split('\n')[0]
        .trim();
}

function extractCompanySlugName(companyUrl) {
    if (!companyUrl) return '';
    const match = companyUrl.match(/\/company\/([^/?#]+)/i);
    if (!match || !match[1]) return '';
    return decodeURIComponent(match[1])
        .replace(/[-_]+/g, ' ')
        .trim();
}

function extractCompanyInfo(card) {
    const nameEl = card.querySelector(
        '.entity-result__title-text a span, ' +
        '.entity-result__title-text a, ' +
        '.app-aware-link span[dir]'
    );
    const subtitleEl = card.querySelector(
        '.entity-result__primary-subtitle'
    );
    const linkEl = card.querySelector(
        'a[href*="/company/"]'
    );

    const companyUrl = linkEl
        ? linkEl.href.split('?')[0]
        : '';
    const titleName = normalizeCompanyName(
        nameEl
            ? (nameEl.innerText || nameEl.textContent || '')
            : ''
    );
    const linkName = normalizeCompanyName(
        linkEl
            ? (linkEl.innerText || linkEl.textContent || '')
            : ''
    );
    const slugName = normalizeCompanyName(
        extractCompanySlugName(companyUrl)
    );
    const name = titleName || linkName || slugName || 'Unknown';
    const subtitle = subtitleEl
        ? (subtitleEl.innerText ||
            subtitleEl.textContent || '').trim()
        : '';

    return { name, subtitle, companyUrl };
}

function uniqueElements(elements) {
    const seen = new Set();
    const out = [];
    for (const el of elements) {
        if (!el || seen.has(el)) continue;
        seen.add(el);
        out.push(el);
    }
    return out;
}

function findFallbackCompanyContainers(root) {
    const el = root || document;
    const out = [];
    const links = el.querySelectorAll('a[href*="/company/"]');
    for (const link of links) {
        const container = link.closest(
            '.entity-result, ' +
            '.reusable-search__result-container, ' +
            '[data-chameleon-result-urn], ' +
            '.scaffold-layout__list-item, li'
        );
        if (!container) continue;
        if (!container.querySelector('button')) continue;
        if (!container.querySelector('a[href*="/company/"]')) continue;
        out.push(container);
    }
    return uniqueElements(out);
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

function normalizeInlineText(value) {
    return String(value || '')
        .replace(/\s+/g, ' ')
        .trim();
}

function hasFollowSuccessToast(root) {
    const el = root || document;
    if (!el?.querySelectorAll) return false;
    const toastNodes = el.querySelectorAll(
        '.artdeco-toast-item__message, ' +
        '.artdeco-toast-item, ' +
        '[role="alert"]'
    );
    const patterns = [
        /\byou(?:'re| are)?\s+now\s+following\b/i,
        /\bnow\s+following\b/i,
        /\byou(?:'re| are)?\s+following\b/i,
        /\bagora\s+voc[eê]\s+segue\b/i,
        /\bvoc[eê]\s+est[aá]\s+seguindo\b/i,
        /\best[aá]\s+seguindo\b/i
    ];
    for (const node of toastNodes) {
        const text = normalizeInlineText(
            node.innerText || node.textContent
        );
        if (!text) continue;
        if (patterns.some((re) => re.test(text))) {
            return true;
        }
    }
    return false;
}

function getCompanyFollowConfirmationSignals(card, root) {
    const signals = [];
    if (card?.querySelectorAll) {
        const buttons = card.querySelectorAll('button');
        for (const btn of buttons) {
            const text = normalizeInlineText(
                btn.innerText || btn.textContent
            );
            const aria = normalizeInlineText(
                btn.getAttribute('aria-label')
            );
            const title = normalizeInlineText(
                btn.getAttribute('title')
            );
            const ariaPressed = String(
                btn.getAttribute('aria-pressed') || ''
            ).toLowerCase();
            const ariaDisabled = String(
                btn.getAttribute('aria-disabled') || ''
            ).toLowerCase();
            const descriptor = `${aria} ${title}`.trim();
            const hasFollowingDescriptor =
                /following|seguindo|unfollow|deixar de seguir/i
                    .test(descriptor);
            if (isFollowingText(text)) {
                signals.push('button-text-following');
            }
            if (/unfollow|deixar de seguir/i.test(descriptor)) {
                signals.push('aria-unfollow-state');
            }
            if (ariaPressed === 'true') {
                signals.push('aria-pressed-true');
            }
            if ((btn.disabled || ariaDisabled === 'true') &&
                (isFollowingText(text) || hasFollowingDescriptor)) {
                signals.push('non-clickable-following');
            }
        }
    }
    if (hasFollowSuccessToast(root)) {
        signals.push('toast-follow-success');
    }
    return [...new Set(signals)];
}

function isCompanyFollowConfirmed(card, root) {
    const signals = getCompanyFollowConfirmationSignals(
        card,
        root
    );
    return {
        confirmed: signals.length > 0,
        signals
    };
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
    const legacy = Array.from(el.querySelectorAll('.entity-result'));
    const chameleon = Array.from(el.querySelectorAll(
        '[data-chameleon-result-urn]'
    ));
    const reusable = Array.from(el.querySelectorAll(
        '.reusable-search__result-container'
    ));
    const fallback = findFallbackCompanyContainers(el);
    return uniqueElements([
        ...legacy,
        ...chameleon,
        ...reusable,
        ...fallback
    ]);
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
    if (!t) return false;
    if (/^(Following|Seguindo)\b/i.test(t)) return false;
    return /^(Follow|Seguir)\b/i.test(t);
}

function getResultsCountText(root) {
    const el = root || document;
    const selectors = [
        'h2 span',
        'h2',
        '.search-results-container__text',
        '.search-results__total',
        '[data-test-search-results-count]'
    ];
    for (const selector of selectors) {
        const nodes = el.querySelectorAll(selector);
        for (const node of nodes) {
            const text = (node.innerText || node.textContent || '')
                .replace(/\s+/g, ' ')
                .trim();
            if (/\b(results?|resultados?)\b/i.test(text)) {
                return text;
            }
        }
    }
    const bodyText = (el.body?.innerText ||
        el.body?.textContent || '')
        .replace(/\s+/g, ' ')
        .trim();
    const match = bodyText.match(
        /(?:about|cerca de|aproximadamente)?\s*[\d.,]+\s*(?:results?|resultados?)/i
    );
    return match ? match[0] : '';
}

function parseResultsCountHint(text) {
    if (!text) return null;
    const normalized = String(text).replace(/\s+/g, ' ').trim();
    const match = normalized.match(
        /([\d][\d.,]*)\s*(?:results?|resultados?)/i
    );
    if (!match) return null;
    const digits = match[1].replace(/[^\d]/g, '');
    if (!digits) return null;
    const parsed = parseInt(digits, 10);
    return Number.isFinite(parsed) ? parsed : null;
}

function detectExplicitNoResults(root, resultsCountHint, resultsCountText) {
    if (resultsCountHint === 0) return true;
    const el = root || document;
    const patterns = /\b(?:no results found|nenhum resultado(?: encontrado)?|0\s*results?|0\s*resultados?)\b/i;
    const selectors = [
        '.search-no-results',
        '.search-results-container__no-results-message',
        '.artdeco-empty-state',
        'main'
    ];
    for (const selector of selectors) {
        const nodes = el.querySelectorAll(selector);
        for (const node of nodes) {
            const text = (node.innerText || node.textContent || '')
                .replace(/\s+/g, ' ')
                .trim();
            if (patterns.test(text)) return true;
        }
    }
    if (patterns.test(resultsCountText || '')) return true;
    const bodyText = (el.body?.innerText ||
        el.body?.textContent || '')
        .replace(/\s+/g, ' ')
        .trim();
    return patterns.test(bodyText);
}

function getCompanySearchPageState(root) {
    const el = root || document;
    const legacyHits = el.querySelectorAll('.entity-result').length;
    const chameleonHits = el.querySelectorAll(
        '[data-chameleon-result-urn]'
    ).length;
    const reusableHits = el.querySelectorAll(
        '.reusable-search__result-container'
    ).length;
    const fallbackCards = findFallbackCompanyContainers(el);
    const cards = findCompanyCards(el);
    const resultsCountText = getResultsCountText(el);
    const resultsCountHint = parseResultsCountHint(resultsCountText);
    const isExplicitNoResults = detectExplicitNoResults(
        el,
        resultsCountHint,
        resultsCountText
    );
    return {
        cards,
        cardsFound: cards.length > 0,
        isExplicitNoResults,
        resultsCountHint,
        resultsCountText,
        selectorHits: {
            legacyEntity: legacyHits,
            chameleon: chameleonHits,
            reusable: reusableHits,
            fallbackLink: fallbackCards.length
        }
    };
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
        isCompanyFollowConfirmed,
        getCompanyFollowConfirmationSignals,
        isNextPageButton,
        detectChallenge,
        buildCompanySearchUrl,
        findCompanyCards,
        findFollowBtnInCard,
        isCompanyFollowText,
        getCompanySearchPageState,
        buildBatchFromRotation
    };
}
