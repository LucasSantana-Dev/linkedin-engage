/**
 * @jest-environment jsdom
 */
const {
    extractCompanyInfo,
    matchesTargetCompanies,
    isFollowingText,
    isNextPageButton
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
