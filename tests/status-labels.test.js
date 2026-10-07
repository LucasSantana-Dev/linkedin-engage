const { getStatusLabel } = require('../extension/lib/status-labels');

const tr = (key, fallback) => `${key}|${fallback}`;

describe('getStatusLabel', () => {
    test.each([
        ['sent', 'status.sent|Sent'],
        ['accepted', 'status.accepted|Accepted'],
        ['visited', 'status.visited|Visited'],
        ['followed', 'status.followed|Followed'],
        ['visited-followed', 'status.visitedFollowed|Visited + Followed']
    ])('maps %s to its locale key and fallback', (status, expected) => {
        expect(getStatusLabel(status, tr)).toBe(expected);
    });

    test('maps skipped reasons to status.<reason> with the reason as fallback', () => {
        expect(getStatusLabel('skipped-no-photo', tr))
            .toBe('status.no-photo|no-photo');
    });

    test('humanizes unknown statuses by replacing hyphens', () => {
        expect(getStatusLabel('some-other-state', tr)).toBe('some other state');
    });

    test('treats null and undefined as empty', () => {
        expect(getStatusLabel(null, tr)).toBe('');
        expect(getStatusLabel(undefined, tr)).toBe('');
    });

    test('does not resolve company statuses without includeCompany', () => {
        expect(getStatusLabel('company-followed', tr)).toBe('company followed');
        expect(getStatusLabel('company-other', tr)).toBe('company other');
    });

    test('resolves company statuses with includeCompany', () => {
        const opts = { includeCompany: true };
        expect(getStatusLabel('company-followed', tr, opts))
            .toBe('status.companyFollowed|Company followed');
        expect(getStatusLabel('company-other', tr, opts))
            .toBe('status.companyAction|company other');
        expect(getStatusLabel('sent', tr, opts)).toBe('status.sent|Sent');
    });

    test('trims only when asked', () => {
        expect(getStatusLabel(' sent ', tr, { trim: true }))
            .toBe('status.sent|Sent');
        expect(getStatusLabel(' sent ', tr)).toBe(' sent ');
    });
});
