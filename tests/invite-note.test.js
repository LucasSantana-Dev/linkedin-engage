const {
    DEFAULT_INVITE_NOTE_MAX,
    fitInviteNote
} = require('../extension/lib/invite-note');

describe('invite-note', () => {
    test('exports a frozen api with the 200 default', () => {
        expect(DEFAULT_INVITE_NOTE_MAX).toBe(200);
        expect(Object.isFrozen(require('../extension/lib/invite-note'))).toBe(true);
    });

    test('returns short text unchanged', () => {
        expect(fitInviteNote('Hello there', 200)).toBe('Hello there');
    });

    test('returns text of exactly max length unchanged', () => {
        const text = 'a'.repeat(50);
        expect(fitInviteNote(text, 50)).toBe(text);
    });

    test('cuts at the last whitespace before max', () => {
        const out = fitInviteNote('hello wonderful world today', 20);
        expect(out).toBe('hello wonderful');
        expect(out.length).toBeLessThanOrEqual(20);
    });

    test('keeps the full window when the next char is whitespace', () => {
        expect(fitInviteNote('hello world again', 11)).toBe('hello world');
    });

    test('hard cuts when there is no whitespace in the window', () => {
        expect(fitInviteNote('a'.repeat(300), 100)).toBe('a'.repeat(100));
    });

    test('hard cuts when the only whitespace is too far back', () => {
        const text = 'ab ' + 'c'.repeat(100);
        expect(fitInviteNote(text, 80)).toBe(text.slice(0, 80));
    });

    test('trims trailing punctuation and spaces', () => {
        expect(fitInviteNote('hello there, - ; : and more words', 18))
            .toBe('hello there');
    });

    test('falls back to 200 for invalid max values', () => {
        const text = 'word '.repeat(100);
        [undefined, null, 0, -5, NaN, 'abc'].forEach(bad => {
            const out = fitInviteNote(text, bad);
            expect(out.length).toBeLessThanOrEqual(200);
            expect(out.length).toBeGreaterThan(150);
        });
    });

    test('floors fractional max values', () => {
        expect(fitInviteNote('a'.repeat(30), 10.9)).toBe('a'.repeat(10));
    });

    test('treats non-string input as empty', () => {
        expect(fitInviteNote(null, 10)).toBe('');
        expect(fitInviteNote(42, 10)).toBe('');
    });
});
