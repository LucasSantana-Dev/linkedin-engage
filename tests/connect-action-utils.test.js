/**
 * @jest-environment jsdom
 */

const {
    isImplicitConnectMenuAction,
    isPotentialMoreActionsButton,
    findConnectActionInMenuItems,
    findFollowButtonInCard,
    cardHasExplicitConnect
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
    });

    it('detects explicit connect controls in card', () => {
        const card = document.createElement('div');
        const span = document.createElement('span');
        span.textContent = 'Connect';
        const btn = document.createElement('button');
        btn.appendChild(span);
        card.appendChild(btn);

        expect(cardHasExplicitConnect(card)).toBe(true);
    });
});
