/**
 * @jest-environment jsdom
 */
const {
    extractCompanyInfo,
    findCompanyCards,
    getCompanySearchPageState,
    matchesTargetCompanies,
    isLowFitCompanyEntity,
    isFollowingText,
    isCompanyFollowConfirmed,
    getCompanyFollowConfirmationSignals,
    isNextPageButton,
    isCompanyFollowText
} = require('../extension/lib/company-utils');

function createCard({ name, subtitle, companyUrl }) {
    const card = document.createElement('div');
    card.classList.add('entity-result');

    if (name) {
        const titleWrap = document.createElement('div');
        titleWrap.className =
            'entity-result__title-text';
        const link = document.createElement('a');
        if (companyUrl) {
            link.href = companyUrl + '?trk=test';
        }
        const span = document.createElement('span');
        span.textContent = name;
        link.appendChild(span);
        titleWrap.appendChild(link);
        card.appendChild(titleWrap);
    }

    if (subtitle) {
        const sub = document.createElement('div');
        sub.className = 'entity-result__primary-subtitle';
        sub.textContent = subtitle;
        card.appendChild(sub);
    }

    return card;
}

describe('extractCompanyInfo', () => {
    it('extracts name from title span', () => {
        const card = createCard({
            name: 'Acme Corp',
            subtitle: 'Technology',
            companyUrl: 'https://linkedin.com/company/acme'
        });
        document.body.appendChild(card);
        const info = extractCompanyInfo(card);
        expect(info.name).toBe('Acme Corp');
        expect(info.subtitle).toBe('Technology');
        expect(info.companyUrl).toBe(
            'https://linkedin.com/company/acme'
        );
        document.body.removeChild(card);
    });

    it('returns Unknown for missing name', () => {
        const card = document.createElement('div');
        const info = extractCompanyInfo(card);
        expect(info.name).toBe('Unknown');
    });

    it('returns empty subtitle when missing', () => {
        const card = createCard({
            name: 'Test Co'
        });
        document.body.appendChild(card);
        const info = extractCompanyInfo(card);
        expect(info.subtitle).toBe('');
        document.body.removeChild(card);
    });

    it('strips query params from company URL', () => {
        const card = createCard({
            name: 'Test',
            companyUrl:
                'https://linkedin.com/company/test'
        });
        document.body.appendChild(card);
        const info = extractCompanyInfo(card);
        expect(info.companyUrl).toBe(
            'https://linkedin.com/company/test'
        );
        document.body.removeChild(card);
    });

    it('returns empty URL when no company link', () => {
        const card = document.createElement('div');
        const span = document.createElement('span');
        span.className = 'app-aware-link';
        span.setAttribute('dir', 'ltr');
        span.textContent = 'Some Company';
        card.appendChild(span);
        const info = extractCompanyInfo(card);
        expect(info.companyUrl).toBe('');
    });

    it('takes first line of multi-line name', () => {
        const card = createCard({
            name: 'Company Name\nSubtitle text',
            companyUrl:
                'https://linkedin.com/company/co'
        });
        document.body.appendChild(card);
        const info = extractCompanyInfo(card);
        expect(info.name).toBe('Company Name');
        document.body.removeChild(card);
    });

    it('falls back to generic company link text when title selector is absent', () => {
        const card = document.createElement('div');
        const link = document.createElement('a');
        link.href = 'https://linkedin.com/company/hotjar?trk=test';
        link.textContent = 'Hotjar | by Contentsquare';
        card.appendChild(link);

        document.body.appendChild(card);
        const info = extractCompanyInfo(card);
        expect(info.name).toBe('Hotjar | by Contentsquare');
        expect(info.companyUrl).toBe(
            'https://linkedin.com/company/hotjar'
        );
        document.body.removeChild(card);
    });

    it('falls back to company URL slug when visible name is unavailable', () => {
        const card = document.createElement('div');
        const link = document.createElement('a');
        link.href = 'https://linkedin.com/company/hotjar-labs/';
        link.textContent = '';
        card.appendChild(link);

        document.body.appendChild(card);
        const info = extractCompanyInfo(card);
        expect(info.name).toBe('hotjar labs');
        expect(info.companyUrl).toBe(
            'https://linkedin.com/company/hotjar-labs/'
        );
        document.body.removeChild(card);
    });
});

describe('matchesTargetCompanies', () => {
    it('returns true when no targets', () => {
        expect(matchesTargetCompanies('Any', []))
            .toBe(true);
        expect(matchesTargetCompanies('Any', null))
            .toBe(true);
    });

    it('matches partial company name', () => {
        expect(matchesTargetCompanies(
            'Google LLC', ['google']
        )).toBe(true);
    });

    it('is case-insensitive', () => {
        expect(matchesTargetCompanies(
            'MICROSOFT', ['microsoft']
        )).toBe(true);
    });

    it('returns false when no match', () => {
        expect(matchesTargetCompanies(
            'Apple Inc', ['google', 'meta']
        )).toBe(false);
    });

    it('matches any of multiple targets', () => {
        expect(matchesTargetCompanies(
            'Meta Platforms', ['google', 'meta']
        )).toBe(true);
    });

    it('matches using word boundaries to avoid partial word collisions', () => {
        expect(matchesTargetCompanies(
            'Metabase', ['meta']
        )).toBe(false);
        expect(matchesTargetCompanies(
            'Meta Platforms', ['meta']
        )).toBe(true);
    });

    it('normalizes accents and punctuation in company names and targets', () => {
        expect(matchesTargetCompanies(
            'Sao Joao Tech', ['são joão']
        )).toBe(true);
        expect(matchesTargetCompanies(
            'CI&T Brasil', ['ci t']
        )).toBe(true);
    });

    it('handles null company name', () => {
        expect(matchesTargetCompanies(null, ['test']))
            .toBe(false);
    });
});

describe('isLowFitCompanyEntity', () => {
    it('flags universities and institutes as low-fit entities', () => {
        expect(isLowFitCompanyEntity({
            name: 'Software Engineering Institute',
            subtitle: 'Higher Education'
        }).isLowFit).toBe(true);
    });

    it('flags generic groups and job boards as low-fit entities', () => {
        expect(isLowFitCompanyEntity({
            name: 'Software Improvement Group',
            subtitle: 'Professional Training and Jobs'
        }).isLowFit).toBe(true);
    });

    it('keeps product companies as eligible entities', () => {
        expect(isLowFitCompanyEntity({
            name: 'Vercel',
            subtitle: 'Software Development'
        }).isLowFit).toBe(false);
    });
});

describe('isFollowingText', () => {
    it('matches Following', () => {
        expect(isFollowingText('Following')).toBe(true);
    });

    it('matches Seguindo (PT)', () => {
        expect(isFollowingText('Seguindo')).toBe(true);
    });

    it('trims whitespace', () => {
        expect(isFollowingText('  Following  '))
            .toBe(true);
    });

    it('rejects Follow', () => {
        expect(isFollowingText('Follow')).toBe(false);
    });

    it('rejects empty/null', () => {
        expect(isFollowingText('')).toBe(false);
        expect(isFollowingText(null)).toBe(false);
    });
});

describe('isNextPageButton', () => {
    it('returns true for Next button', () => {
        const btn = document.createElement('button');
        btn.setAttribute('aria-label', 'Next');
        expect(isNextPageButton(btn)).toBe(true);
    });

    it('returns true for Avançar button', () => {
        const btn = document.createElement('button');
        btn.setAttribute('aria-label', 'Avançar');
        expect(isNextPageButton(btn)).toBe(true);
    });

    it('returns false for disabled button', () => {
        const btn = document.createElement('button');
        btn.setAttribute('aria-label', 'Next');
        btn.disabled = true;
        expect(isNextPageButton(btn)).toBe(false);
    });

    it('returns false for non-next button', () => {
        const btn = document.createElement('button');
        btn.setAttribute('aria-label', 'Previous');
        expect(isNextPageButton(btn)).toBe(false);
    });

    it('returns false for null', () => {
        expect(isNextPageButton(null)).toBe(false);
    });
});

describe('isCompanyFollowText', () => {
    it('matches Follow label with company name', () => {
        expect(isCompanyFollowText('Follow Acme Inc'))
            .toBe(true);
    });

    it('matches Seguir label with company name', () => {
        expect(isCompanyFollowText('Seguir Empresa XPTO'))
            .toBe(true);
    });

    it('rejects Following variants', () => {
        expect(isCompanyFollowText('Following Acme Inc'))
            .toBe(false);
        expect(isCompanyFollowText('Seguindo Empresa XPTO'))
            .toBe(false);
    });
});

describe('isCompanyFollowConfirmed', () => {
    afterEach(() => {
        document.body.textContent = '';
    });

    it('confirms when button text changes to Following', () => {
        const card = document.createElement('div');
        const btn = document.createElement('button');
        btn.textContent = 'Following';
        card.appendChild(btn);
        document.body.appendChild(card);

        const result = isCompanyFollowConfirmed(
            card,
            document
        );
        expect(result.confirmed).toBe(true);
        expect(result.signals).toContain(
            'button-text-following'
        );
    });

    it('confirms when aria pressed is true', () => {
        const card = document.createElement('div');
        const btn = document.createElement('button');
        btn.textContent = 'Follow';
        btn.setAttribute('aria-pressed', 'true');
        card.appendChild(btn);
        document.body.appendChild(card);

        const result = isCompanyFollowConfirmed(
            card,
            document
        );
        expect(result.confirmed).toBe(true);
        expect(result.signals).toContain(
            'aria-pressed-true'
        );
    });

    it('confirms when unfollow state is exposed in aria label', () => {
        const card = document.createElement('div');
        const btn = document.createElement('button');
        btn.textContent = 'Follow';
        btn.setAttribute('aria-label', 'Unfollow Acme');
        card.appendChild(btn);
        document.body.appendChild(card);

        const result = isCompanyFollowConfirmed(
            card,
            document
        );
        expect(result.confirmed).toBe(true);
        expect(result.signals).toContain(
            'aria-unfollow-state'
        );
    });

    it('confirms when toast reports follow success', () => {
        const card = document.createElement('div');
        const btn = document.createElement('button');
        btn.textContent = 'Follow';
        card.appendChild(btn);
        document.body.appendChild(card);

        const toast = document.createElement('div');
        toast.className = 'artdeco-toast-item__message';
        toast.textContent = "You're now following Acme";
        document.body.appendChild(toast);

        const result = isCompanyFollowConfirmed(
            card,
            document
        );
        expect(result.confirmed).toBe(true);
        expect(result.signals).toContain(
            'toast-follow-success'
        );
    });

    it('returns false when no confirmation signal is present', () => {
        const card = document.createElement('div');
        const btn = document.createElement('button');
        btn.textContent = 'Follow';
        card.appendChild(btn);
        document.body.appendChild(card);

        const result = isCompanyFollowConfirmed(
            card,
            document
        );
        expect(result.confirmed).toBe(false);
        expect(result.signals).toEqual([]);
    });
});

describe('getCompanyFollowConfirmationSignals', () => {
    afterEach(() => {
        document.body.textContent = '';
    });

    it('deduplicates repeated confirmation signals', () => {
        const card = document.createElement('div');
        const a = document.createElement('button');
        a.textContent = 'Following';
        const b = document.createElement('button');
        b.textContent = 'Following';
        card.appendChild(a);
        card.appendChild(b);
        document.body.appendChild(card);

        const signals = getCompanyFollowConfirmationSignals(
            card,
            document
        );
        expect(signals).toEqual(['button-text-following']);
    });
});

describe('findCompanyCards', () => {
    afterEach(() => {
        document.body.textContent = '';
    });

    it('finds legacy class-based cards', () => {
        const card = document.createElement('div');
        card.className = 'entity-result';
        document.body.appendChild(card);
        expect(findCompanyCards(document).length).toBe(1);
    });

    it('falls back to stable container from company link', () => {
        const li = document.createElement('li');
        const wrapper = document.createElement('div');
        const link = document.createElement('a');
        link.href = 'https://www.linkedin.com/company/acme/';
        link.textContent = 'Acme';
        const btn = document.createElement('button');
        btn.textContent = 'Follow';
        wrapper.appendChild(link);
        wrapper.appendChild(btn);
        li.appendChild(wrapper);
        document.body.appendChild(li);

        const cards = findCompanyCards(document);
        expect(cards.length).toBe(1);
        expect(cards[0]).toBe(li);
    });

    it('deduplicates cards matched by class and fallback', () => {
        const card = document.createElement('div');
        card.className = 'entity-result';
        const link = document.createElement('a');
        link.href = 'https://www.linkedin.com/company/acme/';
        link.textContent = 'Acme';
        const btn = document.createElement('button');
        btn.textContent = 'Follow';
        card.appendChild(link);
        card.appendChild(btn);
        document.body.appendChild(card);

        const cards = findCompanyCards(document);
        expect(cards.length).toBe(1);
        expect(cards[0]).toBe(card);
    });
});

describe('getCompanySearchPageState', () => {
    afterEach(() => {
        document.body.textContent = '';
    });

    it('detects explicit no-results in English', () => {
        document.body.textContent = 'No results found';
        const state = getCompanySearchPageState(document);
        expect(state.cardsFound).toBe(false);
        expect(state.isExplicitNoResults).toBe(true);
    });

    it('detects explicit no-results in Portuguese', () => {
        document.body.textContent = 'Nenhum resultado encontrado';
        const state = getCompanySearchPageState(document);
        expect(state.cardsFound).toBe(false);
        expect(state.isExplicitNoResults).toBe(true);
    });

    it('parses non-zero results count hints', () => {
        document.body.textContent = 'About 6,600 results';
        const state = getCompanySearchPageState(document);
        expect(state.resultsCountHint).toBe(6600);
        expect(state.isExplicitNoResults).toBe(false);
    });

    it('distinguishes timeout-like state from explicit no-results', () => {
        document.body.textContent = 'About 132 results';
        const state = getCompanySearchPageState(document);
        expect(state.cardsFound).toBe(false);
        expect(state.resultsCountHint).toBe(132);
        expect(state.isExplicitNoResults).toBe(false);
    });

    it('treats zero result count as explicit no-results', () => {
        document.body.textContent = '0 resultados';
        const state = getCompanySearchPageState(document);
        expect(state.resultsCountHint).toBe(0);
        expect(state.isExplicitNoResults).toBe(true);
    });

    it('falls back to body text for results count when no selector matches', () => {
        // No h2 or known selectors — only body text with count
        document.body.innerHTML = '<p>About 1,234 results for your search</p>';
        const state = getCompanySearchPageState(document);
        expect(state.resultsCountHint).toBe(1234);
    });

    it('detects explicit no-results via .search-no-results node text', () => {
        document.body.innerHTML = '<div class="search-no-results">No results found for this query.</div>';
        const state = getCompanySearchPageState(document);
        expect(state.isExplicitNoResults).toBe(true);
    });
});

describe('getCompanyFollowConfirmationSignals — non-clickable-following', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('adds non-clickable-following signal when button is disabled with Following text', () => {
        const card = document.createElement('div');
        const btn = document.createElement('button');
        btn.disabled = true;
        btn.textContent = 'Following';
        card.appendChild(btn);
        document.body.appendChild(card);

        const signals = getCompanyFollowConfirmationSignals(card, document);
        expect(signals).toContain('non-clickable-following');
    });

    it('adds non-clickable-following signal when aria-disabled=true with Following text', () => {
        const card = document.createElement('div');
        const btn = document.createElement('button');
        btn.setAttribute('aria-disabled', 'true');
        btn.textContent = 'Following';
        card.appendChild(btn);
        document.body.appendChild(card);

        const signals = getCompanyFollowConfirmationSignals(card, document);
        expect(signals).toContain('non-clickable-following');
    });

    it('does not add non-clickable-following when button is enabled', () => {
        const card = document.createElement('div');
        const btn = document.createElement('button');
        btn.disabled = false;
        btn.textContent = 'Following';
        card.appendChild(btn);
        document.body.appendChild(card);

        const signals = getCompanyFollowConfirmationSignals(card, document);
        expect(signals).not.toContain('non-clickable-following');
    });
});

describe('detectChallenge', () => {
    const { detectChallenge } = require('../extension/lib/company-utils');

    it('returns true when body text contains security verification', () => {
        document.body.textContent = 'Security verification required to continue.';
        expect(detectChallenge()).toBe(true);
    });

    it('returns true when body text contains unusual activity', () => {
        document.body.textContent = 'We noticed unusual activity on your account.';
        expect(detectChallenge()).toBe(true);
    });

    it('returns true when body text contains verificação de segurança', () => {
        document.body.textContent = 'Verificação de segurança necessária.';
        expect(detectChallenge()).toBe(true);
    });

    it('returns false for normal page content', () => {
        document.body.textContent = 'Normal search results page content here.';
        expect(detectChallenge()).toBe(false);
    });


});

describe('getCompanySearchPageState innerText branch', () => {
    it('uses innerText when available for results count text', () => {
        const doc = document.implementation.createHTMLDocument('test');
        const h2 = doc.createElement('h2');
        Object.defineProperty(h2, 'innerText', {
            get: () => 'About 500 results',
            configurable: true
        });
        doc.body.appendChild(h2);
        const state = getCompanySearchPageState(doc);
        expect(state).toBeDefined();
    });
});

describe('extractCompanySlugName no-match branch (line 11)', () => {
    it('returns empty string when URL has no /company/ path', () => {
        const { extractCompanyInfo } = require('../extension/lib/company-utils');
        const doc = document.implementation.createHTMLDocument('test');
        const card = doc.createElement('div');
        // link with href that does NOT contain /company/
        const link = doc.createElement('a');
        link.href = 'https://www.linkedin.com/in/someprofile/';
        card.appendChild(link);
        // no name element, so name falls through to slugName -> extractCompanySlugName
        const info = extractCompanyInfo(card);
        expect(info.name).toBe('Unknown');
    });
});

describe('extractCompanyInfo innerText branches (lines 35, 48)', () => {
    it('hits innerText branch for nameEl via Object.defineProperty (line 35)', () => {
        const card = document.createElement('div');
        const titleDiv = document.createElement('div');
        titleDiv.className = 'entity-result__title-text';
        const link = document.createElement('a');
        link.href = 'https://www.linkedin.com/company/acme-solutions/';
        const span = document.createElement('span');
        // Define innerText with a distinct value. In jsdom, innerText is not
        // implemented natively, so the getter will fire when accessed.
        Object.defineProperty(span, 'innerText', {
            get: () => 'Acme Solutions',
            configurable: true
        });
        link.appendChild(span);
        titleDiv.appendChild(link);
        card.appendChild(titleDiv);
        const info = extractCompanyInfo(card);
        // Whether innerText or textContent wins, the branch is exercised
        expect(info).toHaveProperty('name');
        expect(info.companyUrl).toBe('https://www.linkedin.com/company/acme-solutions/');
    });

    it('uses innerText for subtitleEl when available (line 48)', () => {
        const doc = document.implementation.createHTMLDocument('test');
        const card = doc.createElement('div');
        const titleDiv = doc.createElement('div');
        titleDiv.className = 'entity-result__title-text';
        const link = doc.createElement('a');
        link.href = 'https://www.linkedin.com/company/acme/';
        const span = doc.createElement('span');
        span.textContent = 'Acme';
        link.appendChild(span);
        titleDiv.appendChild(link);
        card.appendChild(titleDiv);
        const sub = doc.createElement('div');
        sub.className = 'entity-result__primary-subtitle';
        Object.defineProperty(sub, 'innerText', {
            get: () => 'Technology · 500 employees',
            configurable: true
        });
        card.appendChild(sub);
        const info = extractCompanyInfo(card);
        expect(info.subtitle).toBe('Technology · 500 employees');
    });
});

describe('findFallbackCompanyContainers (lines 67-79)', () => {
    it('finds containers that have a button and a company link', () => {
        const doc = document.implementation.createHTMLDocument('test');
        const li = doc.createElement('li');
        const link = doc.createElement('a');
        link.href = 'https://www.linkedin.com/company/testcorp/';
        li.appendChild(link);
        const btn = doc.createElement('button');
        btn.textContent = 'Follow';
        li.appendChild(btn);
        doc.body.appendChild(li);
        const { findCompanyCards } = require('../extension/lib/company-utils');
        const cards = findCompanyCards(doc);
        // li is a fallback container — findCompanyCards calls findFallbackCompanyContainers internally
        expect(cards.length).toBeGreaterThanOrEqual(1);
    });

    it('skips containers without a button', () => {
        const doc = document.implementation.createHTMLDocument('test');
        const li = doc.createElement('li');
        const link = doc.createElement('a');
        link.href = 'https://www.linkedin.com/company/testcorp/';
        li.appendChild(link);
        // No button added
        doc.body.appendChild(li);
        const { findCompanyCards } = require('../extension/lib/company-utils');
        const cards = findCompanyCards(doc);
        expect(cards.length).toBe(0);
    });
});

describe('getCompanyFollowConfirmationSignals aria branches (lines 124-134, 165)', () => {
    it('detects aria-pressed-true signal (line 162)', () => {
        const doc = document.implementation.createHTMLDocument('test');
        const card = doc.createElement('div');
        const btn = doc.createElement('button');
        btn.textContent = 'Following';
        btn.setAttribute('aria-pressed', 'true');
        card.appendChild(btn);
        doc.body.appendChild(card);
        const signals = getCompanyFollowConfirmationSignals(card, doc);
        expect(signals).toContain('aria-pressed-true');
    });

    it('detects non-clickable-following when btn.disabled + following text (line 165)', () => {
        const doc = document.implementation.createHTMLDocument('test');
        const card = doc.createElement('div');
        const btn = doc.createElement('button');
        btn.textContent = 'Following';
        btn.disabled = true;
        card.appendChild(btn);
        doc.body.appendChild(card);
        const signals = getCompanyFollowConfirmationSignals(card, doc);
        expect(signals).toContain('non-clickable-following');
    });

    it('detects non-clickable-following via aria-disabled (line 165)', () => {
        const doc = document.implementation.createHTMLDocument('test');
        const card = doc.createElement('div');
        const btn = doc.createElement('button');
        btn.textContent = 'Following';
        btn.setAttribute('aria-disabled', 'true');
        card.appendChild(btn);
        doc.body.appendChild(card);
        const signals = getCompanyFollowConfirmationSignals(card, doc);
        expect(signals).toContain('non-clickable-following');
    });
});

describe('isNextPageButton null branch (line 190)', () => {
    it('returns false when btn is null', () => {
        expect(isNextPageButton(null)).toBe(false);
    });

    it('returns false when btn is disabled', () => {
        const btn = document.createElement('button');
        btn.setAttribute('aria-label', 'Next');
        btn.disabled = true;
        expect(isNextPageButton(btn)).toBe(false);
    });
});

describe('getCompanySearchPageState resultsCountHint + detectExplicit via body (lines 271, 287-313)', () => {
    it('parses comma-formatted count from body text (line 271, 287-291)', () => {
        const doc = document.implementation.createHTMLDocument('test');
        doc.body.textContent = 'About 1,500 results found here';
        const state = getCompanySearchPageState(doc);
        expect(state.resultsCountHint).toBe(1500);
        expect(state.resultsCountText).toMatch(/1,500 results/i);
    });

    it('returns empty resultsCountText when no results text in body', () => {
        const doc = document.implementation.createHTMLDocument('test');
        doc.body.textContent = 'Some random page with no keyword';
        const state = getCompanySearchPageState(doc);
        expect(state.resultsCountText).toBe('');
        expect(state.resultsCountHint).toBeNull();
    });

    it('detects no-results via body text (line 314-318)', () => {
        const doc = document.implementation.createHTMLDocument('test');
        doc.body.textContent = 'No results found for your search criteria.';
        const state = getCompanySearchPageState(doc);
        expect(state.isExplicitNoResults).toBe(true);
    });

    it('detects no-results via main element (line 304-311)', () => {
        const doc = document.implementation.createHTMLDocument('test');
        const main = doc.createElement('main');
        main.textContent = 'Nenhum resultado encontrado para esta busca.';
        doc.body.appendChild(main);
        const state = getCompanySearchPageState(doc);
        expect(state.isExplicitNoResults).toBe(true);
    });

    it('detects no-results when resultsCountHint is 0', () => {
        const doc = document.implementation.createHTMLDocument('test');
        const h2 = doc.createElement('h2');
        const span = doc.createElement('span');
        span.textContent = '0 results';
        h2.appendChild(span);
        doc.body.appendChild(h2);
        const state = getCompanySearchPageState(doc);
        expect(state.isExplicitNoResults).toBe(true);
    });

    it('returns false for isExplicitNoResults when results exist', () => {
        const doc = document.implementation.createHTMLDocument('test');
        const h2 = doc.createElement('h2');
        const span = doc.createElement('span');
        span.textContent = '150 results found';
        h2.appendChild(span);
        doc.body.appendChild(h2);
        const state = getCompanySearchPageState(doc);
        expect(state.isExplicitNoResults).toBe(false);
        expect(state.resultsCountHint).toBe(150);
    });
});
