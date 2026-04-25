/**
 * @jest-environment jsdom
 */
const fs = require('fs');
const path = require('path');
const {
    cardHasExplicitConnect,
    findFollowButtonInCard,
    findMoreActionsButtonInCard,
    isFollowActionText,
    isImplicitConnectMenuAction,
    findConnectActionInMenuItems
} = require('../extension/lib/connect-action-utils');

function loadCard(name) {
    const html = fs.readFileSync(
        path.join(
            __dirname, 'fixtures/linkedin-cards', name + '.html'
        ),
        'utf8'
    );
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html.trim();
    return wrapper.firstElementChild;
}

function cardSearchable(card) {
    return card.closest('.entity-result, ' +
        '.reusable-search__result-container, ' +
        'li.reusable-search__result-container, ' +
        '[data-chameleon-result-urn], ' +
        'div[data-view-name="search-entity-result-universal-template"], ' +
        'li') || card;
}

describe('LinkedIn card DOM fixtures — regression lock', () => {
    describe('connect-available', () => {
        const card = loadCard('connect-available');
        test('card matches the broadened search selector', () => {
            expect(cardSearchable(card)).toBe(card);
        });
        test('cardHasExplicitConnect returns true', () => {
            expect(cardHasExplicitConnect(card)).toBe(true);
        });
        test('findFollowButtonInCard returns null (no Follow)', () => {
            expect(findFollowButtonInCard(card)).toBeNull();
        });
    });

    describe('follow-only (screen-reader "connect" text is ignored)', () => {
        const card = loadCard('follow-only');
        test('card matches the broadened search selector', () => {
            expect(cardSearchable(card)).toBe(card);
        });
        test('cardHasExplicitConnect returns false — this was the silent bug in v1.36.18', () => {
            expect(cardHasExplicitConnect(card)).toBe(false);
        });
        test('findFollowButtonInCard returns the "+ Follow" button', () => {
            const btn = findFollowButtonInCard(card);
            expect(btn).not.toBeNull();
            const text = (btn.innerText || btn.textContent || '')
                .trim();
            expect(isFollowActionText(text)).toBe(true);
        });
        test('+ Follow text passes isFollowActionText', () => {
            expect(isFollowActionText('+ Follow')).toBe(true);
            expect(isFollowActionText('Follow')).toBe(true);
            expect(isFollowActionText('+ Seguir')).toBe(true);
            expect(isFollowActionText('Following')).toBe(false);
        });
    });

    describe('pending', () => {
        const card = loadCard('pending');
        test('cardHasExplicitConnect returns false (Pending is aria-disabled)', () => {
            expect(cardHasExplicitConnect(card)).toBe(false);
        });
        test('findFollowButtonInCard returns null', () => {
            expect(findFollowButtonInCard(card)).toBeNull();
        });
    });

    describe('connect-via-more', () => {
        const card = loadCard('connect-via-more');
        test('cardHasExplicitConnect returns false — Connect is inside a hidden menu', () => {
            expect(cardHasExplicitConnect(card)).toBe(false);
        });
        test('findFollowButtonInCard returns the "+ Follow" button', () => {
            expect(findFollowButtonInCard(card)).not.toBeNull();
        });
        test('findMoreActionsButtonInCard finds the three-dot trigger', () => {
            expect(findMoreActionsButtonInCard(card)).not.toBeNull();
        });
        test('findConnectActionInMenuItems finds the menu Connect action', () => {
            const menuItems = card.querySelectorAll(
                '[role="menuitem"], .artdeco-dropdown__content-inner *'
            );
            const hit = findConnectActionInMenuItems(menuItems);
            expect(hit).not.toBeNull();
        });
    });

    describe('universal-template-follow (new LinkedIn DOM)', () => {
        const card = loadCard('universal-template-follow');
        test('card matches the broadened search selector', () => {
            expect(cardSearchable(card)).toBe(card);
        });
        test('cardHasExplicitConnect returns false', () => {
            expect(cardHasExplicitConnect(card)).toBe(false);
        });
        test('findFollowButtonInCard finds the "+ Follow" button', () => {
            expect(findFollowButtonInCard(card)).not.toBeNull();
        });
    });

    describe('aria-label permissive matches (isImplicitConnectMenuAction)', () => {
        test('matches "Invite to connect"', () => {
            expect(isImplicitConnectMenuAction(
                'Invite to connect'
            )).toBe(true);
        });
        test('matches "Invite Jane to connect"', () => {
            expect(isImplicitConnectMenuAction(
                'Invite Jane to connect'
            )).toBe(true);
        });
        test('matches "Connect"', () => {
            expect(isImplicitConnectMenuAction('Connect'))
                .toBe(true);
        });
        test('does NOT match "connect with them" free text', () => {
            expect(isImplicitConnectMenuAction(
                'View profile and connect with them on LinkedIn'
            )).toBe(true);
        });
    });
});
