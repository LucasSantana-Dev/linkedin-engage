/**
 * @jest-environment jsdom
 */
const fs = require('fs');
const path = require('path');
const lib = require('../extension/lib/invite-withdraw');

function loadFixture() {
    const html = fs.readFileSync(
        path.join(
            __dirname,
            'fixtures/linkedin-sent-invitations/sent-list.html'
        ),
        'utf8'
    );
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    document.body.innerHTML = '';
    document.body.appendChild(wrapper);
    return wrapper;
}

describe('parseSentAgeDays', () => {
    test.each([
        ['Sent today', 0],
        ['Sent yesterday', 1],
        ['Sent 1 day ago', 1],
        ['Sent 5 days ago', 5],
        ['Sent 2 weeks ago', 14],
        ['Sent 3 weeks ago', 21],
        ['Sent 1 month ago', 30],
        ['Sent 3 months ago', 90],
        ['Sent 1 year ago', 365],
        ['Sent 2 years ago', 730],
        ['Sent 4 hours ago', 0],
        ['Sent 10 minutes ago', 0],
        ['  sent   3   weeks ago ', 21],
        ['Enviado hoje', 0],
        ['Enviado ontem', 1],
        ['Enviado há 4 dias', 4],
        ['Enviado há 1 semana', 7],
        ['Enviado há 3 semanas', 21],
        ['Enviado há 1 mês', 30],
        ['Enviado há 5 meses', 150],
        ['Enviado há 2 anos', 730],
        ['Enviada há 2 horas', 0]
    ])('%s -> %s', (text, days) => {
        expect(lib.parseSentAgeDays(text)).toBe(days);
    });

    test.each([
        '', null, undefined, 'Test Person 1', 'Withdraw',
        'Sent a while ago', 'Sent 3 fortnights ago', 'Connected 3 weeks ago',
        'Enviado há muito tempo', 'Sent 3 weeks'
    ])('unparseable %p -> null', (text) => {
        expect(lib.parseSentAgeDays(text)).toBeNull();
    });
});

describe('normalizers and eligibility', () => {
    test('normalizeMinWeeks', () => {
        expect(lib.normalizeMinWeeks(undefined)).toBe(3);
        expect(lib.normalizeMinWeeks('x')).toBe(3);
        expect(lib.normalizeMinWeeks(0)).toBe(3);
        expect(lib.normalizeMinWeeks(-2)).toBe(3);
        expect(lib.normalizeMinWeeks('5')).toBe(5);
        expect(lib.normalizeMinWeeks(4.9)).toBe(4);
        expect(lib.normalizeMinWeeks(99999)).toBe(520);
    });

    test('normalizeRunLimit caps at 20', () => {
        expect(lib.normalizeRunLimit(undefined)).toBe(20);
        expect(lib.normalizeRunLimit(0)).toBe(20);
        expect(lib.normalizeRunLimit(7)).toBe(7);
        expect(lib.normalizeRunLimit(500)).toBe(20);
    });

    test('isWithdrawEligible', () => {
        expect(lib.isWithdrawEligible(21, 3)).toBe(true);
        expect(lib.isWithdrawEligible(20, 3)).toBe(false);
        expect(lib.isWithdrawEligible(90, 3)).toBe(true);
        expect(lib.isWithdrawEligible(14, undefined)).toBe(false);
        expect(lib.isWithdrawEligible(7, 1)).toBe(true);
        expect(lib.isWithdrawEligible(null, 1)).toBe(false);
        expect(lib.isWithdrawEligible(NaN, 1)).toBe(false);
        expect(lib.isWithdrawEligible(-1, 1)).toBe(false);
        expect(lib.isWithdrawEligible('30', 1)).toBe(false);
    });

    test('computeRunBudget', () => {
        expect(lib.computeRunBudget(20, 40)).toBe(20);
        expect(lib.computeRunBudget(20, 5)).toBe(5);
        expect(lib.computeRunBudget(50, undefined)).toBe(20);
        expect(lib.computeRunBudget(10, 0)).toBe(0);
        expect(lib.computeRunBudget(10, -3)).toBe(0);
        expect(lib.computeRunBudget(10, 7.9)).toBe(7);
    });

    test('shouldAbortOnFailures', () => {
        expect(lib.shouldAbortOnFailures(2)).toBe(false);
        expect(lib.shouldAbortOnFailures(3)).toBe(true);
        expect(lib.shouldAbortOnFailures(undefined)).toBe(false);
    });

    test('isWithdrawLabel', () => {
        expect(lib.isWithdrawLabel(' Withdraw ')).toBe(true);
        expect(lib.isWithdrawLabel('Retirar')).toBe(true);
        expect(lib.isWithdrawLabel('Withdraw invitation')).toBe(false);
        expect(lib.isWithdrawLabel(null)).toBe(false);
    });
});

describe('fixture DOM helpers', () => {
    beforeEach(() => { loadFixture(); });

    test('findSentInviteCards reads the captured list', () => {
        const cards = lib.findSentInviteCards(document);
        expect(cards).toHaveLength(4);
        expect(cards.map(c => c.name)).toEqual([
            'Test Person 1', 'Test Person 2', 'Test Person 3', 'Test Person 4'
        ]);
        expect(cards.map(c => c.ageDays)).toEqual([90, 21, 14, 5]);
        expect(cards[0].ageText).toBe('Sent 3 months ago');
        expect(cards[0].profileUrl)
            .toBe('https://www.linkedin.com/in/test-person-1/');
        expect(cards[0].withdrawLink.getAttribute('aria-label'))
            .toBe('Withdraw invitation sent to Test Person 1');
        expect(cards[0].key).toBe(cards[0].profileUrl);
    });

    test('selectWithdrawBatch picks eligible, oldest first, capped', () => {
        const cards = lib.findSentInviteCards(document);
        const all = lib.selectWithdrawBatch(cards, { minWeeks: 3, max: 20 });
        expect(all.batch.map(c => c.name))
            .toEqual(['Test Person 1', 'Test Person 2']);
        expect(all.eligibleCount).toBe(2);
        expect(all.skippedTooRecent).toBe(2);
        expect(all.skippedUnknownAge).toBe(0);

        const one = lib.selectWithdrawBatch(cards, { minWeeks: 3, max: 1 });
        expect(one.batch.map(c => c.name)).toEqual(['Test Person 1']);

        const week = lib.selectWithdrawBatch(cards, { minWeeks: 1, max: 20 });
        expect(week.batch.map(c => c.name)).toEqual([
            'Test Person 1', 'Test Person 2', 'Test Person 3'
        ]);

        expect(lib.selectWithdrawBatch(cards, { minWeeks: 3, max: 0 }).batch)
            .toEqual([]);
        expect(lib.selectWithdrawBatch(null, null).batch).toEqual([]);
    });

    test('selectWithdrawBatch never selects unknown ages and keeps ties stable', () => {
        const invites = [
            { name: 'a', ageDays: 30 },
            { name: 'b', ageDays: null },
            { name: 'c', ageDays: 30 },
            { name: 'd', ageDays: 100 }
        ];
        const res = lib.selectWithdrawBatch(invites, { minWeeks: 3, max: 5 });
        expect(res.batch.map(i => i.name)).toEqual(['d', 'a', 'c']);
        expect(res.skippedUnknownAge).toBe(1);
        expect(res.skippedTooRecent).toBe(0);
    });

    test('findInviteByKey re-locates an invite and tolerates misses', () => {
        const found = lib.findInviteByKey(
            document, 'https://www.linkedin.com/in/test-person-2/'
        );
        expect(found.name).toBe('Test Person 2');
        expect(lib.findInviteByKey(document, 'nope')).toBeNull();
        expect(lib.findInviteByKey(document, '')).toBeNull();
    });

    test('key falls back to the name when there is no profile link', () => {
        const card = document.createElement('div');
        card.setAttribute('role', 'listitem');
        card.innerHTML =
            '<p>No Link</p><span>Sent 2 months ago</span>' +
            '<a aria-label="Withdraw invitation sent to No Link" href="#">' +
            '<span>Withdraw</span></a>';
        const root = document.createElement('div');
        root.appendChild(card);
        const [info] = lib.findSentInviteCards(root);
        expect(info.profileUrl).toBe('');
        expect(info.key).toBe('No Link');
    });

    test('cards without a withdraw control are ignored', () => {
        const root = document.createElement('div');
        root.innerHTML = '<div role="listitem"><p>X</p><span>Sent 2 weeks ago</span></div>';
        expect(lib.findSentInviteCards(root)).toEqual([]);
        expect(lib.findSentInviteCards(null)).toEqual([]);
        expect(lib.findSentInviteCards({})).toEqual([]);
    });

    test('findWithdrawLink falls back to the visible label (PT-BR)', () => {
        const card = document.createElement('div');
        card.innerHTML = '<button>Retirar</button><button>Mais</button>';
        expect(lib.findWithdrawLink(card).textContent).toBe('Retirar');
        expect(lib.findWithdrawLink(null)).toBeNull();
        expect(lib.findWithdrawLink(document.createElement('div'))).toBeNull();
    });

    test('findAgeText and extractInviteName fallbacks', () => {
        const card = document.createElement('div');
        card.innerHTML = '<p>Fallback Name</p><span>hello</span>';
        expect(lib.findAgeText(card)).toBe('');
        expect(lib.findAgeText(null)).toBe('');
        expect(lib.extractInviteName(card, null)).toBe('Fallback Name');
        expect(lib.extractInviteName(document.createElement('div'), null))
            .toBe('');
        expect(lib.extractInviteName(null, null)).toBe('');
        const link = document.createElement('a');
        link.setAttribute(
            'aria-label', 'Retirar convite enviado para Maria Souza'
        );
        expect(lib.extractInviteName(card, link)).toBe('Maria Souza');
        expect(lib.extractProfileUrl(null)).toBe('');
        expect(lib.extractProfileUrl(document.createElement('div'))).toBe('');
    });
});

describe('confirmation dialog and completion helpers', () => {
    function dialogDom() {
        document.body.innerHTML =
            '<div id="card"><a id="orig" aria-label="Withdraw invitation sent to A">' +
            '<span>Withdraw</span></a></div>' +
            '<div role="dialog"><p>Withdraw invitation?</p>' +
            '<button id="cancel">Cancel</button>' +
            '<button id="ok"> Withdraw </button></div>';
        return document.getElementById('orig');
    }

    test('findWithdrawConfirm returns the dialog button, not the card link', () => {
        const orig = dialogDom();
        expect(lib.findWithdrawConfirm(document, orig).id).toBe('ok');
    });

    test('findWithdrawConfirm ignores buttons outside dialogs and wrong labels', () => {
        document.body.innerHTML =
            '<button>Withdraw</button><div role="alertdialog">' +
            '<button>Keep</button></div>';
        expect(lib.findWithdrawConfirm(document, null)).toBeNull();
        expect(lib.findWithdrawConfirm(null, null)).toBeNull();
    });

    test('findWithdrawConfirm skips a control that is the original link', () => {
        document.body.innerHTML =
            '<div role="dialog"><a id="orig">Withdraw</a></div>';
        expect(lib.findWithdrawConfirm(
            document, document.getElementById('orig')
        )).toBeNull();
    });

    test('findDialogDismiss finds cancel by text or aria-label', () => {
        dialogDom();
        expect(lib.findDialogDismiss(document).id).toBe('cancel');
        document.body.innerHTML =
            '<div role="dialog"><button aria-label="Dismiss"><svg></svg></button></div>';
        expect(lib.findDialogDismiss(document)).not.toBeNull();
        document.body.innerHTML = '<div role="dialog"><button>Other</button></div>';
        expect(lib.findDialogDismiss(document)).toBeNull();
        expect(lib.findDialogDismiss(null)).toBeNull();
    });

    test('isWithdrawComplete', () => {
        document.body.innerHTML = '<div id="c"><a id="l">Withdraw</a></div>';
        const card = document.getElementById('c');
        const link = document.getElementById('l');
        expect(lib.isWithdrawComplete(card, link)).toBe(false);
        expect(lib.isWithdrawComplete(null, link)).toBe(true);
        const other = document.createElement('a');
        expect(lib.isWithdrawComplete(card, other)).toBe(true);
        card.removeChild(link);
        expect(lib.isWithdrawComplete(card, link)).toBe(true);
        document.body.removeChild(card);
        expect(lib.isWithdrawComplete(card, link)).toBe(true);
    });
});

describe('challenge and login detection', () => {
    test('detectChallengeSignal', () => {
        expect(lib.detectChallengeSignal(
            'https://www.linkedin.com/checkpoint/challenge/x', ''
        )).toBe(true);
        expect(lib.detectChallengeSignal('https://x', 'Security verification needed'))
            .toBe(true);
        expect(lib.detectChallengeSignal('https://x', 'Verificação de segurança'))
            .toBe(true);
        expect(lib.detectChallengeSignal(
            'https://www.linkedin.com/mynetwork/invitation-manager/sent/', 'Sent'
        )).toBe(false);
        expect(lib.detectChallengeSignal(undefined, undefined)).toBe(false);
    });

    test('isLoginUrl', () => {
        expect(lib.isLoginUrl('https://www.linkedin.com/login?x=1')).toBe(true);
        expect(lib.isLoginUrl('https://www.linkedin.com/uas/login')).toBe(true);
        expect(lib.isLoginUrl(lib.SENT_INVITES_URL)).toBe(false);
        expect(lib.isLoginUrl(undefined)).toBe(false);
    });
});

describe('localized messages', () => {
    test('resolveWithdrawLocale', () => {
        expect(lib.resolveWithdrawLocale('pt-BR', 'en-US')).toBe('pt_BR');
        expect(lib.resolveWithdrawLocale('', 'pt')).toBe('pt_BR');
        expect(lib.resolveWithdrawLocale('en', 'pt')).toBe('en');
        expect(lib.resolveWithdrawLocale('', '')).toBe('en');
    });

    test('withdrawText substitutes and falls back', () => {
        expect(lib.withdrawText('done', 'en', [3]))
            .toBe('Withdrew 3 stale invitation(s).');
        expect(lib.withdrawText('doneDetail', 'pt_BR', [3, 2, 1]))
            .toContain('3 convite(s)');
        expect(lib.withdrawText('none', 'xx', [3])).toContain('3 week(s)');
        expect(lib.withdrawText('none', 'en')).toContain('older than  week');
        expect(lib.withdrawText('missingKey', 'en')).toBe('');
    });

    test('no dash characters in any message', () => {
        const all = ['en', 'pt_BR'].flatMap(l =>
            ['running', 'stop', 'done', 'doneDetail', 'none', 'canceled',
                'failures', 'challenge', 'failedPrefix']
                .map(k => lib.withdrawText(k, l, [1, 2, 3])));
        all.forEach(t => expect(t).not.toMatch(/[\u2013\u2014]/));
    });
});
