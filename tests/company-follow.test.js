/**
 * @jest-environment jsdom
 */
const {
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
} = require('../extension/lib/company-utils');

function createCard({ name, subtitle, companyUrl, followText }) {
    const card = document.createElement('div');
    card.classList.add('entity-result');

    if (name) {
        const titleWrap = document.createElement('div');
        titleWrap.className = 'entity-result__title-text';
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

    if (followText) {
        const btn = document.createElement('button');
        btn.textContent = followText;
        card.appendChild(btn);
    }

    return card;
}

afterEach(() => {
    document.body.textContent = '';
});

describe('buildCompanySearchUrl', () => {
    it('encodes query into LinkedIn company search URL', () => {
        const url = buildCompanySearchUrl('Hotjar');
        expect(url).toBe(
            'https://www.linkedin.com/search/results/' +
            'companies/?keywords=Hotjar' +
            '&origin=FACETED_SEARCH'
        );
    });

    it('encodes special characters', () => {
        const url = buildCompanySearchUrl('CI&T Brazil');
        expect(url).toContain('CI%26T%20Brazil');
    });

    it('handles empty query', () => {
        const url = buildCompanySearchUrl('');
        expect(url).toContain('keywords=');
    });
});

describe('isCompanyFollowText', () => {
    it('matches Follow', () => {
        expect(isCompanyFollowText('Follow')).toBe(true);
    });

    it('matches Seguir (PT)', () => {
        expect(isCompanyFollowText('Seguir')).toBe(true);
    });

    it('matches + Follow', () => {
        expect(isCompanyFollowText('+ Follow')).toBe(true);
    });

    it('matches + Seguir', () => {
        expect(isCompanyFollowText('+ Seguir')).toBe(true);
    });

    it('trims whitespace', () => {
        expect(isCompanyFollowText('  Follow  ')).toBe(true);
    });

    it('rejects Following', () => {
        expect(isCompanyFollowText('Following')).toBe(false);
    });

    it('rejects Seguindo', () => {
        expect(isCompanyFollowText('Seguindo')).toBe(false);
    });

    it('rejects empty/null', () => {
        expect(isCompanyFollowText('')).toBe(false);
        expect(isCompanyFollowText(null)).toBe(false);
    });
});

describe('findCompanyCards', () => {
    it('finds entity-result cards', () => {
        const card = document.createElement('div');
        card.classList.add('entity-result');
        document.body.appendChild(card);
        const cards = findCompanyCards(document);
        expect(cards.length).toBe(1);
    });

    it('finds chameleon-urn cards', () => {
        const card = document.createElement('div');
        card.setAttribute(
            'data-chameleon-result-urn',
            'urn:li:company:123'
        );
        document.body.appendChild(card);
        const cards = findCompanyCards(document);
        expect(cards.length).toBe(1);
    });

    it('finds reusable-search cards', () => {
        const card = document.createElement('div');
        card.classList.add(
            'reusable-search__result-container'
        );
        document.body.appendChild(card);
        const cards = findCompanyCards(document);
        expect(cards.length).toBe(1);
    });

    it('returns empty for no cards', () => {
        const cards = findCompanyCards(document);
        expect(cards.length).toBe(0);
    });

    it('scopes to provided root element', () => {
        const root = document.createElement('div');
        const card = document.createElement('div');
        card.classList.add('entity-result');
        root.appendChild(card);

        const outside = document.createElement('div');
        outside.classList.add('entity-result');
        document.body.appendChild(outside);
        document.body.appendChild(root);

        const cards = findCompanyCards(root);
        expect(cards.length).toBe(1);
    });
});

describe('findFollowBtnInCard', () => {
    it('finds Follow button in card', () => {
        const card = createCard({
            name: 'Acme', followText: 'Follow'
        });
        const btn = findFollowBtnInCard(card);
        expect(btn).not.toBeNull();
        expect(btn.textContent).toBe('Follow');
    });

    it('finds + Follow button', () => {
        const card = createCard({
            name: 'Acme', followText: '+ Follow'
        });
        const btn = findFollowBtnInCard(card);
        expect(btn).not.toBeNull();
    });

    it('finds Seguir button (PT)', () => {
        const card = createCard({
            name: 'Acme', followText: 'Seguir'
        });
        const btn = findFollowBtnInCard(card);
        expect(btn).not.toBeNull();
    });

    it('returns null for Following button', () => {
        const card = createCard({
            name: 'Acme', followText: 'Following'
        });
        const btn = findFollowBtnInCard(card);
        expect(btn).toBeNull();
    });

    it('returns null for disabled button', () => {
        const card = document.createElement('div');
        const btn = document.createElement('button');
        btn.textContent = 'Follow';
        btn.disabled = true;
        card.appendChild(btn);
        expect(findFollowBtnInCard(card)).toBeNull();
    });

    it('returns null when no buttons', () => {
        const card = document.createElement('div');
        expect(findFollowBtnInCard(card)).toBeNull();
    });
});

describe('detectChallenge', () => {
    it('returns false for normal pages', () => {
        expect(detectChallenge()).toBe(false);
    });

    it('detects security verification text', () => {
        document.body.textContent =
            'security verification required';
        expect(detectChallenge()).toBe(true);
    });

    it('detects unusual activity text', () => {
        document.body.textContent =
            'We detected unusual activity';
        expect(detectChallenge()).toBe(true);
    });

    it('detects PT verification', () => {
        document.body.textContent =
            'verificação de segurança';
        expect(detectChallenge()).toBe(true);
    });
});

describe('buildBatchFromRotation', () => {
    const companies = [
        'A', 'B', 'C', 'D', 'E',
        'F', 'G', 'H', 'I', 'J'
    ];

    it('returns first batch from start', () => {
        const batch = buildBatchFromRotation(
            companies, 0, 3
        );
        expect(batch).toEqual(['A', 'B', 'C']);
    });

    it('returns batch from middle', () => {
        const batch = buildBatchFromRotation(
            companies, 3, 3
        );
        expect(batch).toEqual(['D', 'E', 'F']);
    });

    it('wraps index past end', () => {
        const batch = buildBatchFromRotation(
            companies, 12, 3
        );
        expect(batch).toEqual(['C', 'D', 'E']);
    });

    it('returns remaining when near end', () => {
        const batch = buildBatchFromRotation(
            companies, 8, 5
        );
        expect(batch).toEqual(['I', 'J']);
    });

    it('returns empty for empty list', () => {
        expect(buildBatchFromRotation([], 0, 3))
            .toEqual([]);
    });

    it('returns empty for null list', () => {
        expect(buildBatchFromRotation(null, 0, 3))
            .toEqual([]);
    });

    it('handles batch larger than list', () => {
        const batch = buildBatchFromRotation(
            ['X', 'Y'], 0, 10
        );
        expect(batch).toEqual(['X', 'Y']);
    });
});

describe('per-company search integration', () => {
    it('builds correct URLs for each company', () => {
        const companies = ['Hotjar', 'Doist', 'Toggl'];
        const urls = companies.map(buildCompanySearchUrl);
        expect(urls[0]).toContain('keywords=Hotjar');
        expect(urls[1]).toContain('keywords=Doist');
        expect(urls[2]).toContain('keywords=Toggl');
    });

    it('filters cards by target companies', () => {
        const targets = ['acme', 'globex'];
        expect(matchesTargetCompanies(
            'Acme Corp', targets
        )).toBe(true);
        expect(matchesTargetCompanies(
            'Globex Industries', targets
        )).toBe(true);
        expect(matchesTargetCompanies(
            'Initech', targets
        )).toBe(false);
    });

    it('identifies follow vs following state', () => {
        expect(isCompanyFollowText('Follow')).toBe(true);
        expect(isFollowingText('Following')).toBe(true);
        expect(isCompanyFollowText('Following'))
            .toBe(false);
        expect(isFollowingText('Follow')).toBe(false);
    });
});

describe('batch rotation schedule flow', () => {
    const companies = Array.from(
        { length: 20 }, (_, i) => `Co${i}`
    );

    it('covers all companies across rotations', () => {
        const batchSize = 7;
        const seen = [];
        let idx = 0;
        for (let run = 0; run < 3; run++) {
            const batch = buildBatchFromRotation(
                companies, idx, batchSize
            );
            seen.push(...batch);
            idx += batch.length;
            if (idx >= companies.length) idx = 0;
        }
        expect(seen.length).toBe(20);
        expect(new Set(seen).size).toBe(20);
    });

    it('resets to start after full cycle', () => {
        let idx = 0;
        const batchSize = 10;
        const first = buildBatchFromRotation(
            companies, idx, batchSize
        );
        idx += first.length;
        const second = buildBatchFromRotation(
            companies, idx, batchSize
        );
        idx += second.length;
        idx = idx >= companies.length ? 0 : idx;
        const third = buildBatchFromRotation(
            companies, idx, batchSize
        );
        expect(third[0]).toBe('Co0');
    });
});
