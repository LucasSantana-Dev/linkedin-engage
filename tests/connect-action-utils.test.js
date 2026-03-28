/**
 * @jest-environment jsdom
 */

const {
    isImplicitConnectMenuAction,
    isPotentialMoreActionsButton,
    findConnectActionInMenuItems,
    findFollowButtonInCard,
    cardHasExplicitConnect,
    findMoreActionsButtonInCard
} = require('../extension/lib/connect-action-utils');

describe('connect-action-utils', () => {
    it('detects implicit connect actions in menu text', () => {
        expect(isImplicitConnectMenuAction('Connect')).toBe(true);
        expect(isImplicitConnectMenuAction('Conectar')).toBe(true);
        expect(isImplicitConnectMenuAction('Invite to connect')).toBe(true);
        expect(isImplicitConnectMenuAction('Message')).toBe(false);
    });

    it('detects likely more-actions buttons by aria and classes', () => {
        const more = document.createElement('button');
        more.setAttribute('aria-label', 'More actions for Jane Doe');
        expect(isPotentialMoreActionsButton(more)).toBe(true);

        const dropdown = document.createElement('button');
        dropdown.className = 'artdeco-dropdown__trigger';
        expect(isPotentialMoreActionsButton(dropdown)).toBe(true);

        const plain = document.createElement('button');
        plain.textContent = 'Message';
        expect(isPotentialMoreActionsButton(plain)).toBe(false);

        const link = document.createElement('a');
        link.setAttribute('title', 'Mais ações');
        expect(isPotentialMoreActionsButton(link)).toBe(true);

        const div = document.createElement('div');
        div.textContent = 'More actions';
        expect(isPotentialMoreActionsButton(div)).toBe(false);

        expect(isPotentialMoreActionsButton(null)).toBe(false);
    });

    it('finds connect action from mixed menu items', () => {
        const a = document.createElement('button');
        a.textContent = 'Message';
        const b = document.createElement('button');
        b.textContent = 'Invite to connect';
        const c = document.createElement('button');
        c.textContent = 'Follow';
        const match = findConnectActionInMenuItems([a, b, c]);
        expect(match).toBe(b);

        const byAria = document.createElement('button');
        byAria.setAttribute('aria-label', 'Convidar para conectar');
        expect(findConnectActionInMenuItems([a, byAria])).toBe(byAria);

        expect(findConnectActionInMenuItems([a, c])).toBe(null);
        expect(findConnectActionInMenuItems(null)).toBe(null);
    });

    it('finds follow button even when not first in card', () => {
        const card = document.createElement('div');
        const message = document.createElement('button');
        message.textContent = 'Message';
        const follow = document.createElement('button');
        follow.textContent = 'Follow';
        card.appendChild(message);
        card.appendChild(follow);
        const found = findFollowButtonInCard(card);
        expect(found).toBe(follow);

        const following = document.createElement('button');
        following.textContent = 'Following';
        card.appendChild(following);

        const disabledFollow = document.createElement('button');
        disabledFollow.textContent = 'Follow';
        disabledFollow.disabled = true;
        card.appendChild(disabledFollow);

        const foundWithNoise = findFollowButtonInCard(card);
        expect(foundWithNoise).toBe(follow);

        expect(findFollowButtonInCard(null)).toBe(null);
    });

    it('detects explicit connect controls in card', () => {
        const card = document.createElement('div');
        const span = document.createElement('span');
        span.textContent = 'Connect';
        const btn = document.createElement('button');
        btn.appendChild(span);
        card.appendChild(btn);

        expect(cardHasExplicitConnect(card)).toBe(true);

        const cardWithAria = document.createElement('div');
        const action = document.createElement('button');
        action.setAttribute('aria-label', 'Invite to connect');
        cardWithAria.appendChild(action);
        expect(cardHasExplicitConnect(cardWithAria)).toBe(true);

        const cardWithoutConnect = document.createElement('div');
        const follow = document.createElement('button');
        follow.textContent = 'Follow';
        cardWithoutConnect.appendChild(follow);
        expect(cardHasExplicitConnect(cardWithoutConnect)).toBe(false);
        expect(cardHasExplicitConnect(null)).toBe(false);
    });

    it('finds enabled more-actions button and skips disabled controls', () => {
        const card = document.createElement('div');
        const disabledMore = document.createElement('button');
        disabledMore.setAttribute('aria-label', 'More actions');
        disabledMore.setAttribute('aria-disabled', 'true');

        const enabledMore = document.createElement('button');
        enabledMore.setAttribute('aria-label', 'More actions for profile');

        card.appendChild(disabledMore);
        card.appendChild(enabledMore);

        expect(findMoreActionsButtonInCard(card)).toBe(enabledMore);
        expect(findMoreActionsButtonInCard(null)).toBe(null);

        const noMoreCard = document.createElement('div');
        const message = document.createElement('button');
        message.textContent = 'Message';
        noMoreCard.appendChild(message);
        expect(findMoreActionsButtonInCard(noMoreCard)).toBe(null);
    });
});
