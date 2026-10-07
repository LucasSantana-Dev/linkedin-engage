const lib = require('../extension/lib/popup-run-result');

describe('popup-run-result contract', () => {
    it('exports the expected functions and freezes the API', () => {
        expect(typeof lib.deriveDoneRunStatus).toBe('function');
        expect(typeof lib.buildDoneFailureMessage).toBe('function');
        expect(Object.isFrozen(lib)).toBe(true);
    });

    describe('deriveDoneRunStatus', () => {
        const d = lib.deriveDoneRunStatus;
        it('honours explicit runStatus (case-insensitive)', () => {
            expect(d({ runStatus: 'SUCCESS' })).toBe('success');
            expect(d({ runStatus: 'failed' })).toBe('failed');
            expect(d({ runStatus: 'Canceled' })).toBe('canceled');
        });
        it('treats non-object input as empty (failed, nothing processed)', () => {
            expect(d(null)).toBe('failed');
            expect(d('x')).toBe('failed');
            expect(d(undefined)).toBe('failed');
        });
        it('ignores unknown runStatus values', () => {
            expect(d({ runStatus: 'weird', processedCount: 1 })).toBe('success');
        });
        it('treats company no-results as success', () => {
            expect(d({ mode: 'companies', reason: 'no-results' })).toBe('success');
            expect(d({ mode: 'companies', stepCode: 'NO-RESULTS' })).toBe('success');
            expect(d({
                mode: 'companies',
                log: [{ status: 'ok' }, null, { status: 'Skipped-No-Results' }]
            })).toBe('success');
            expect(d({ mode: 'companies', log: [{ status: 'ok' }] })).toBe('failed');
            expect(d({ mode: 'connect', reason: 'no-results' })).toBe('failed');
        });
        it('detects cancellation by flag or message', () => {
            expect(d({ stoppedByUser: true })).toBe('canceled');
            expect(d({ error: 'Stopped by user' })).toBe('canceled');
            expect(d({ message: 'canceled by user' })).toBe('canceled');
            expect(d({ reason: 'cancelled by user' })).toBe('canceled');
        });
        it('fails on error text or zero processed', () => {
            expect(d({ error: 'boom', processedCount: 5 })).toBe('failed');
            expect(d({ processedCount: 0 })).toBe('failed');
            expect(d({ processedPosts: 0 })).toBe('failed');
        });
        it('uses processedPosts fallback and success flag', () => {
            expect(d({ processedPosts: 3 })).toBe('success');
            expect(d({ processedCount: 3, success: false })).toBe('failed');
            expect(d({ processedCount: 3, success: true })).toBe('success');
        });
    });

    describe('buildDoneFailureMessage', () => {
        const tr = (key, _subs, fallback) => `tr:${key}|${fallback}`;
        const resultText = (resp, raw) => `rt:${raw}`;
        const b = (r) => lib.buildDoneFailureMessage(r, tr, resultText);

        it('localizes company reasons through tr', () => {
            expect(b({ mode: 'companies', reason: 'follow-not-confirmed' }))
                .toMatch(/^tr:popup.company.followNotConfirmed\|/);
            expect(b({ mode: 'companies', reason: ' No-Target-Matches ' }))
                .toMatch(/^tr:popup.company.noTargetMatches\|/);
            expect(b({ mode: 'companies', reason: 'already-following-only' }))
                .toMatch(/^tr:popup.company.alreadyFollowingOnly\|/);
            expect(b({ mode: 'companies', reason: 'cards-timeout' }))
                .toMatch(/^tr:popup.company.cardsTimeout\|/);
        });
        it('maps cards-timeout stepCode in companies mode', () => {
            expect(b({ mode: 'companies', stepCode: 'Cards-Timeout' }))
                .toMatch(/^tr:popup.company.cardsTimeout\|/);
        });
        it('returns plain english messages outside companies mode', () => {
            expect(b({ reason: 'follow-not-confirmed' }))
                .toBe('Follow click attempted but could not be confirmed on LinkedIn UI.');
            expect(b({ reason: 'no-target-matches' }))
                .toBe('No company matched the target filter for this run.');
            expect(b({ reason: 'already-following-only' }))
                .toBe('All matched companies were already followed.');
        });
        it('ignores cards-timeout outside companies mode', () => {
            expect(b({ reason: 'cards-timeout', stepCode: 'cards-timeout' }))
                .toBe('tr:popup.runNoItemsProcessed|No items processed.');
        });
        it('falls back to error, message, then default', () => {
            expect(b({ error: 'bad' })).toBe('rt:bad');
            expect(b({ message: 'msg' })).toBe('rt:msg');
            expect(b({})).toBe('tr:popup.runNoItemsProcessed|No items processed.');
            expect(b(null)).toBe('tr:popup.runNoItemsProcessed|No items processed.');
        });
    });
});
