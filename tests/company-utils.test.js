/**
 * @jest-environment jsdom
 */
const {
    extractCompanyInfo,
    findCompanyCards,
    getCompanySearchPageState,
    matchesTargetCompanies,
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

    it('handles null company name', () => {
        expect(matchesTargetCompanies(null, ['test']))
            .toBe(false);
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
});
