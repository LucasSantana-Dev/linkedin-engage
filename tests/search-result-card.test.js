/**
 * @jest-environment jsdom
 */
const fs = require('fs');
const path = require('path');
const lib = require('../extension/lib/search-result-card');
const { isPendingInCard } = require('../extension/lib/invite-utils');
const { findCompanyCards } = require('../extension/lib/company-utils');

function load(name) {
    const html = fs.readFileSync(
        path.join(__dirname, 'fixtures/linkedin-search-results', name),
        'utf8'
    );
    document.body.innerHTML = html;
    return document;
}

describe('findResultCard', () => {
    test('resolves the listitem card from a nested Connect link', () => {
        load('people-cards.html');
        const connect = document.querySelector(
            'a[aria-label^="Invite"]'
        );
        const card = lib.findResultCard(connect);
        expect(card.getAttribute('role')).toBe('listitem');
        expect(card.querySelector('a[href*="pessoa-teste-1"]')).toBeTruthy();
    });

    test('ignores mutual-connection avatar li (not an ancestor)', () => {
        load('people-cards.html');
        const li = document.querySelector('li');
        expect(lib.findResultCard(li)).toBe(li);
        const connect = document.querySelector('a[aria-label^="Invite"]');
        expect(lib.findResultCard(connect).tagName).toBe('DIV');
    });

    test('legacy selectors win over listitem', () => {
        document.body.innerHTML =
            '<div role="listitem"><div class="entity-result">' +
            '<button id="b">Connect</button></div></div>';
        const card = lib.findResultCard(document.getElementById('b'));
        expect(card.className).toBe('entity-result');
    });

    test('returns null for missing or non-element input', () => {
        expect(lib.findResultCard(null)).toBeNull();
        expect(lib.findResultCard({})).toBeNull();
        document.body.innerHTML = '<button id="b"></button>';
        expect(lib.findResultCard(document.getElementById('b'))).toBeNull();
    });

    test('selector keeps legacy selectors and adds listitem', () => {
        expect(lib.SEARCH_RESULT_CARD_SELECTOR).toContain('.entity-result');
        expect(lib.SEARCH_RESULT_CARD_SELECTOR).toContain(
            '[data-chameleon-result-urn]'
        );
        expect(lib.SEARCH_RESULT_CARD_SELECTOR).toContain(
            '[role="listitem"]'
        );
    });
});

describe('extractPersonCardInfo', () => {
    test('extracts the new layout (Connect card)', () => {
        load('people-cards.html');
        const card = document.querySelectorAll('[role="listitem"]')[0];
        const info = lib.extractPersonCardInfo(card);
        expect(info).toEqual({
            name: 'Pessoa Teste 1',
            headline: 'Senior Tech Recruiter at Acme 1',
            profileUrl: 'https://www.linkedin.com/in/pessoa-teste-1/',
            location: 'Sao Paulo, Brazil',
            summary: 'Current: Technical Recruiter at Acme 1',
            photoUrl: '',
            mutualConnections: 34
        });
    });

    test('extracts the second card without a Premium badge', () => {
        load('people-cards.html');
        const card = document.querySelectorAll('[role="listitem"]')[1];
        const info = lib.extractPersonCardInfo(card);
        expect(info.name).toBe('Pessoa Teste 2');
        expect(info.headline).toBe('Talent Acquisition Partner at Beta 2');
        expect(info.location).toBe('Lisbon, Portugal');
        expect(info.mutualConnections).toBe(4);
    });

    test('photo url prefers src, falls back to data-delayed-url', () => {
        document.body.innerHTML =
            '<div role="listitem"><p><a href="https://x.test/in/a/?q=1">A</a>' +
            '</p><figure><img src="https://img.test/a.png"></figure></div>';
        const card = document.querySelector('[role="listitem"]');
        expect(lib.extractPersonCardInfo(card).photoUrl)
            .toBe('https://img.test/a.png');
        document.body.innerHTML =
            '<div class="entity-result"><img data-delayed-url="d.png"></div>';
        expect(lib.extractPersonCardInfo(
            document.querySelector('.entity-result')
        ).photoUrl).toBe('d.png');
    });

    test('extracts the legacy layout', () => {
        document.body.innerHTML =
            '<li class="entity-result">' +
            '<span class="entity-result__title-text">' +
            '<a href="https://www.linkedin.com/in/legacy/?miniProfile=1">' +
            '<span dir="ltr">Legacy Person\nextra</span></a></span>' +
            '<div class="entity-result__primary-subtitle">Head</div>' +
            '<div class="entity-result__secondary-subtitle">Rio</div>' +
            '<p class="entity-result__summary">Sum</p>' +
            '<img class="presence-entity__image" src="p.png">' +
            '<div class="entity-result__simple-insight">' +
            '12 mutual connections</div></li>';
        const info = lib.extractPersonCardInfo(
            document.querySelector('li')
        );
        expect(info).toEqual({
            name: 'Legacy Person',
            headline: 'Head',
            profileUrl: 'https://www.linkedin.com/in/legacy/',
            location: 'Rio',
            summary: 'Sum',
            photoUrl: expect.stringContaining('p.png'),
            mutualConnections: 12
        });
    });

    test('handles pt-BR mutual text, no profile and empty card', () => {
        document.body.innerHTML =
            '<div role="listitem"><a href="/search/x">' +
            '2 outras conexões em comum</a></div>';
        const info = lib.extractPersonCardInfo(
            document.querySelector('[role="listitem"]')
        );
        expect(info.mutualConnections).toBe(2);
        expect(info.name).toBe('Unknown');
        expect(info.profileUrl).toBe('');
        expect(info.headline).toBe('');
        expect(lib.extractPersonCardInfo(null))
            .toEqual({ name: 'Unknown', headline: '' });
    });

    test('name link with no text falls back to Unknown', () => {
        document.body.innerHTML =
            '<div role="listitem"><p><a href="https://x.test/in/z/"></a>' +
            '</p></div>';
        const info = lib.extractPersonCardInfo(
            document.querySelector('[role="listitem"]')
        );
        expect(info.name).toBe('Unknown');
        expect(info.profileUrl).toBe('https://x.test/in/z/');
    });
});

describe('company cards', () => {
    test('finds role=listitem company cards scoped to main', () => {
        load('company-cards.html');
        const outside = document.createElement('div');
        outside.setAttribute('role', 'listitem');
        outside.innerHTML = '<a href="/company/other/">Other</a>';
        document.body.appendChild(outside);
        const cards = lib.findCompanyResultCards(document);
        expect(cards).toHaveLength(2);
        expect(cards).not.toContain(outside);
    });

    test('falls back to root when no main and merges legacy cards', () => {
        document.body.innerHTML =
            '<div class="entity-result"></div>' +
            '<div role="listitem"><a href="/company/a/">A</a></div>' +
            '<div role="listitem"><a href="/in/b/">B</a></div>';
        expect(lib.findCompanyResultCards(document)).toHaveLength(2);
        expect(lib.findCompanyResultCards(null)).toEqual([]);
    });

    test('extracts the subtitle block after the company name', () => {
        load('company-cards.html');
        const [first] = lib.findCompanyResultCards(document);
        expect(lib.extractCompanyCardSubtitle(first))
            .toBe('Software Development • Sao Paulo, SP');
        expect(lib.extractCompanyCardSubtitle(null)).toBe('');
        document.body.innerHTML = '<div><p><a href="/company/x/">X</a></p></div>';
        expect(lib.extractCompanyCardSubtitle(document.body)).toBe('');
    });

    test('company-utils sees the new cards too', () => {
        load('company-cards.html');
        expect(findCompanyCards(document)).toHaveLength(2);
    });
});

describe('pending state in the new card', () => {
    test('detects the Pending anchor but not a Connect card', () => {
        load('people-cards.html');
        const [connectCard, pendingCard] =
            document.querySelectorAll('[role="listitem"]');
        expect(isPendingInCard(pendingCard)).toBe(true);
        expect(isPendingInCard(connectCard)).toBe(false);
    });
});
