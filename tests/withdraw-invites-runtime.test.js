/**
 * @jest-environment jsdom
 */
const fs = require('fs');
const path = require('path');

const FIXTURE = fs.readFileSync(
    path.join(
        __dirname, 'fixtures/linkedin-sent-invitations/sent-list.html'
    ),
    'utf8'
);
const FAST = {
    listWaitMs: 200,
    pollMs: 5,
    scrollWaitMs: 5,
    maxScrollRounds: 4,
    confirmWaitMs: 120,
    resultWaitMs: 120,
    afterClickMs: 1,
    betweenActionsMs: 1,
    humanize: false
};

describe('withdraw-invites MAIN-world runtime', () => {
    let api;
    let clicks;
    let scriptListeners;

    // jsdom's window.postMessage leaves event.source null, so deliver the
    // control messages the way the bridge does (source === window).
    function send(data) {
        window.dispatchEvent(new MessageEvent('message', {
            data, source: window
        }));
    }

    // behavior: 'direct' (card removed on click), 'confirm' (dialog then
    // removal), 'never' (nothing happens), 'confirm-never' (dialog, no effect)
    function wire(behavior) {
        document.querySelectorAll('[role="listitem"]').forEach(card => {
            const link = card.querySelector('a[aria-label^="Withdraw"]');
            link.addEventListener('click', (e) => {
                e.preventDefault();
                clicks.push(link.getAttribute('aria-label'));
                if (behavior === 'direct') {
                    card.remove();
                } else if (behavior === 'confirm' ||
                    behavior === 'confirm-native' ||
                    behavior === 'confirm-never') {
                    const dlg = document.createElement(
                        behavior === 'confirm-native' ? 'dialog' : 'div'
                    );
                    if (behavior === 'confirm-native') {
                        dlg.setAttribute('open', '');
                    } else {
                        dlg.setAttribute('role', 'dialog');
                    }
                    const okLabel = behavior === 'confirm-native'
                        ? ` aria-label="${link.getAttribute('aria-label')}"`
                        : '';
                    dlg.innerHTML =
                        '<button class="cancel">Cancel</button>' +
                        `<button class="ok"${okLabel}>Withdraw</button>`;
                    dlg.querySelector('.cancel').addEventListener(
                        'click', () => dlg.remove()
                    );
                    dlg.querySelector('.ok').addEventListener('click', () => {
                        dlg.remove();
                        if (behavior !== 'confirm-never') card.remove();
                    });
                    document.body.appendChild(dlg);
                }
            });
        });
    }

    function load(behavior, html) {
        jest.resetModules();
        delete window.linkedInWithdrawInvitesInjected;
        document.body.innerHTML = html || FIXTURE;
        window.scrollTo = jest.fn();
        window.LinkedInInviteWithdraw =
            require('../extension/lib/invite-withdraw');
        wire(behavior);
        const realAdd = window.addEventListener;
        window.addEventListener = (type, fn, opts) => {
            if (type === 'message') scriptListeners.push(fn);
            return realAdd.call(window, type, fn, opts);
        };
        require('../extension/withdraw-invites');
        window.addEventListener = realAdd;
        api = window.__LINKEDIN_WITHDRAW_INVITES_TEST_API__;
    }

    beforeEach(() => { clicks = []; scriptListeners = []; });

    afterEach(() => {
        scriptListeners.forEach(fn =>
            window.removeEventListener('message', fn));
        delete window.linkedInWithdrawInvitesInjected;
        delete window.__LINKEDIN_WITHDRAW_INVITES_TEST_API__;
        delete window.LinkedInInviteWithdraw;
        document.body.innerHTML = '';
    });

    function waitForMessage(type, timeoutMs = 4000) {
        return new Promise((resolve, reject) => {
            const t = setTimeout(() => {
                window.removeEventListener('message', h);
                reject(new Error('timeout waiting for ' + type));
            }, timeoutMs);
            function h(event) {
                if (event.data?.type !== type) return;
                clearTimeout(t);
                window.removeEventListener('message', h);
                resolve(event.data);
            }
            window.addEventListener('message', h);
        });
    }

    test('withdraws eligible invites oldest first (no confirm dialog)', async () => {
        load('direct');
        const result = await api.runWithdrawInvites({
            minWeeks: 3, limit: 20, timing: FAST
        });
        expect(clicks).toEqual([
            'Withdraw invitation sent to Test Person 1',
            'Withdraw invitation sent to Test Person 2'
        ]);
        expect(result.mode).toBe('withdraw');
        expect(result.withdrawn).toBe(2);
        expect(result.actionCount).toBe(2);
        expect(result.tooRecentCount).toBe(2);
        expect(result.runStatus).toBe('success');
        expect(result.log.map(e => e.status))
            .toEqual(['withdrawn', 'withdrawn']);
        expect(result.log[0].headline).toBe('Sent 3 months ago');
        expect(document.querySelectorAll('[role="listitem"]')).toHaveLength(2);
    });

    test('clicks the confirmation dialog button and verifies removal', async () => {
        load('confirm');
        const result = await api.runWithdrawInvites({
            minWeeks: 3, limit: 1, timing: FAST
        });
        expect(clicks).toHaveLength(1);
        expect(result.withdrawn).toBe(1);
        expect(document.querySelector('[role="dialog"]')).toBeNull();
    });

    test('withdraws through a native role-less dialog', async () => {
        load('confirm-native');
        const result = await api.runWithdrawInvites({
            minWeeks: 3, limit: 1, timing: FAST
        });
        expect(clicks).toHaveLength(1);
        expect(result.withdrawn).toBe(1);
        expect(document.querySelector('dialog')).toBeNull();
    });

    test('respects the remaining daily budget', async () => {
        load('direct');
        const result = await api.runWithdrawInvites({
            minWeeks: 3, limit: 20, rateRemaining: 1, timing: FAST
        });
        expect(result.withdrawn).toBe(1);
        expect(clicks).toEqual(['Withdraw invitation sent to Test Person 1']);
    });

    test('reports no-results when nothing is old enough', async () => {
        load('direct');
        const result = await api.runWithdrawInvites({
            minWeeks: 520, limit: 20, timing: FAST
        });
        expect(clicks).toEqual([]);
        expect(result.reason).toBe('no-results');
        expect(result.runStatus).toBe('success');
        expect(result.skippedCount).toBe(4);
    });

    test('empty page is a no-results success', async () => {
        load('direct', '<div></div>');
        const result = await api.runWithdrawInvites({
            minWeeks: 3, timing: FAST
        });
        expect(result.reason).toBe('no-results');
        expect(result.processedCount).toBe(0);
    });

    test('aborts after 3 consecutive unconfirmed withdrawals', async () => {
        const many = Array.from({ length: 5 }, (_, i) =>
            `<div role="listitem"><p>P${i}</p><span>Sent 3 months ago</span>` +
            `<a aria-label="Withdraw invitation sent to P${i}" href="#">` +
            '<span>Withdraw</span></a></div>').join('');
        load('never', `<div data-testid="lazy-column">${many}</div>`);
        const result = await api.runWithdrawInvites({
            minWeeks: 3, limit: 20, timing: FAST
        });
        expect(clicks).toHaveLength(3);
        expect(result.success).toBe(false);
        expect(result.reason).toBe('withdraw-not-confirmed');
        expect(result.error).toContain('3');
        expect(result.log.every(e => e.status === 'error-withdraw-not-confirmed'))
            .toBe(true);
    });

    test('dismisses a dialog whose confirm has no effect and counts a failure', async () => {
        load('confirm-never');
        const result = await api.runWithdrawInvites({
            minWeeks: 3, limit: 20, timing: FAST
        });
        expect(result.withdrawn).toBe(0);
        expect(result.reason).toBe('withdraw-not-confirmed');
        expect(result.runStatus).toBe('failed');
        expect(document.querySelector('[role="dialog"]')).toBeNull();
    });

    test('a failure between successes does not abort the run', async () => {
        const many = Array.from({ length: 3 }, (_, i) =>
            `<div role="listitem"><p>P${i}</p><span>Sent ${i + 4} weeks ago</span>` +
            `<a aria-label="Withdraw invitation sent to P${i}" href="#">` +
            '<span>Withdraw</span></a></div>').join('');
        load('direct', `<div data-testid="lazy-column">${many}</div>`);
        // P2 (oldest first: P2, P1, P0): make the first one unremovable.
        const firstLink = document.querySelector(
            'a[aria-label$="P2"]'
        );
        firstLink.addEventListener('click', (e) => {
            e.stopImmediatePropagation();
        }, true);
        const result = await api.runWithdrawInvites({
            minWeeks: 3, limit: 20, timing: FAST
        });
        expect(result.withdrawn).toBe(2);
        expect(result.log.map(e => e.status)).toEqual([
            'error-withdraw-not-confirmed', 'withdrawn', 'withdrawn'
        ]);
    });

    test('stops on challenge URL', async () => {
        load('direct');
        window.history.pushState({}, '', '/checkpoint/challenge/abc');
        const result = await api.runWithdrawInvites({ timing: FAST });
        window.history.pushState({}, '', '/');
        expect(result.reason).toBe('challenge');
        expect(result.success).toBe(false);
        expect(clicks).toEqual([]);
    });

    test('login URL requests login and fails', async () => {
        load('direct');
        window.history.pushState({}, '', '/login');
        const seen = waitForMessage('LINKEDIN_BOT_LOGIN_REQUIRED');
        const result = await api.runWithdrawInvites({ timing: FAST });
        window.history.pushState({}, '', '/');
        await seen;
        expect(result.reason).toBe('login-required');
    });

    test('Stop before processing yields a canceled run', async () => {
        load('direct');
        api.requestStop();
        const result = await api.runWithdrawInvites({ timing: FAST });
        expect(result.stoppedByUser).toBe(true);
        expect(result.runStatus).toBe('canceled');
        expect(clicks).toEqual([]);
    });

    test('Stop mid-run via bridge message cancels the remaining work', async () => {
        load('direct');
        const done = waitForMessage('LINKEDIN_BOT_WITHDRAW_DONE');
        const progress = waitForMessage('LINKEDIN_BOT_WITHDRAW_PROGRESS');
        send({
            type: 'LINKEDIN_WITHDRAW_INVITES_START',
            config: { minWeeks: 3, limit: 20, timing: FAST }
        });
        await progress;
        send({ type: 'LINKEDIN_BOT_STOP' });
        const msg = await done;
        expect(msg.result.stoppedByUser).toBe(true);
        expect(clicks.length).toBeLessThan(3);
    });

    test('start message runs and posts the done message', async () => {
        load('direct');
        const done = waitForMessage('LINKEDIN_BOT_WITHDRAW_DONE');
        send({
            type: 'LINKEDIN_WITHDRAW_INVITES_START',
            config: { minWeeks: 3, limit: 20, timing: FAST }
        });
        const msg = await done;
        expect(msg.result.withdrawn).toBe(2);
    });

    test('runtime errors are reported as a failed run', async () => {
        load('direct');
        window.scrollTo = () => { throw new Error('boom'); };
        const done = waitForMessage('LINKEDIN_BOT_WITHDRAW_DONE');
        send({
            type: 'LINKEDIN_WITHDRAW_INVITES_START',
            config: { timing: FAST }
        });
        const msg = await done;
        expect(msg.result.reason).toBe('runtime-error');
        expect(msg.result.success).toBe(false);
        expect(msg.result.error).toBe('boom');
    });

    test('ignores a second start while running and foreign messages', async () => {
        load('direct');
        const done = waitForMessage('LINKEDIN_BOT_WITHDRAW_DONE');
        const start = {
            type: 'LINKEDIN_WITHDRAW_INVITES_START',
            config: { minWeeks: 3, limit: 20, timing: FAST }
        };
        send(start);
        send(start);
        send({ type: 'SOMETHING_ELSE' });
        await done;
        expect(clicks).toHaveLength(2);
    });

    test('scrolls until the list stops growing', async () => {
        load('direct');
        const list = document.querySelector('[data-testid="lazy-column"]');
        const make = (n) => {
            const el = document.createElement('div');
            el.setAttribute('role', 'listitem');
            el.innerHTML =
                `<p>Extra ${n}</p><span>Sent 1 year ago</span>` +
                `<a aria-label="Withdraw invitation sent to Extra ${n}" href="#">` +
                '<span>Withdraw</span></a>';
            return el;
        };
        let added = 0;
        window.scrollTo = jest.fn(() => {
            if (added < 2) { added++; list.appendChild(make(added)); }
        });
        const count = await api.loadAllCards({ ...FAST, stalledRounds: 2 });
        expect(count).toBe(6);
        expect(window.scrollTo).toHaveBeenCalled();
    });
});
