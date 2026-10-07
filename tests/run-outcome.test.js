const {
    RUN_STATUS_SUCCESS,
    RUN_STATUS_FAILED,
    RUN_STATUS_CANCELED,
    normalizeRunOutcome
} = require('../extension/lib/run-outcome');

describe('normalizeRunOutcome', () => {
    test('returns canceled when stopped by user', () => {
        const result = normalizeRunOutcome({
            mode: 'connect',
            message: 'Run canceled by user.',
            stoppedByUser: true,
            processedCount: 3
        });

        expect(result.runStatus).toBe(RUN_STATUS_CANCELED);
        expect(result.reason).toBe('stopped-by-user');
        expect(result.success).toBe(false);
    });

    test('returns failed for challenge/runtime errors', () => {
        const challenge = normalizeRunOutcome({
            mode: 'connect',
            error: 'CAPTCHA or security challenge detected',
            processedCount: 2
        });
        const runtime = normalizeRunOutcome({
            mode: 'jobs',
            error: 'Unknown runtime error',
            processedCount: 1
        });

        expect(challenge.runStatus).toBe(RUN_STATUS_FAILED);
        expect(challenge.reason).toBe('challenge');
        expect(runtime.runStatus).toBe(RUN_STATUS_FAILED);
        expect(runtime.reason).toBe('runtime-error');
    });

    test('returns failed when no items were processed', () => {
        const result = normalizeRunOutcome({
            mode: 'connect',
            success: true,
            processedCount: 0,
            actionCount: 0,
            skippedCount: 0,
            log: []
        });

        expect(result.runStatus).toBe(RUN_STATUS_FAILED);
        expect(result.reason).toBe('no-items-processed');
        expect(result.success).toBe(false);
    });

    test('keeps company no-results as success when explicitly signaled', () => {
        const result = normalizeRunOutcome({
            mode: 'company',
            success: true,
            reason: 'no-results',
            stepCode: 'no-results',
            processedCount: 0,
            actionCount: 0,
            skippedCount: 0,
            log: [{ status: 'skipped-no-results' }]
        });

        expect(result.runStatus).toBe(RUN_STATUS_SUCCESS);
        expect(result.reason).toBe('no-results');
        expect(result.success).toBe(true);
    });

    test('keeps company no-results as success when only log signal exists', () => {
        const result = normalizeRunOutcome({
            mode: 'company',
            reason: 'unknown',
            stepCode: '',
            processedCount: 0,
            actionCount: 0,
            skippedCount: 0,
            log: [{ status: 'skipped-no-results' }]
        });

        expect(result.runStatus).toBe(RUN_STATUS_SUCCESS);
        expect(result.reason).toBe('unknown');
        expect(result.success).toBe(true);
    });

    test('keeps connect no-results as success via reason signal (no skip-log)', () => {
        // Empty search page: zero cards, nothing skipped/sent. content.js sets
        // reason/stepCode 'no-results'. Must be SUCCESS, not FAILED.
        const result = normalizeRunOutcome({
            mode: 'connect',
            reason: 'no-results',
            stepCode: 'no-results',
            processedCount: 0,
            actionCount: 0,
            skippedCount: 0,
            log: []
        });

        expect(result.runStatus).toBe(RUN_STATUS_SUCCESS);
        expect(result.reason).toBe('no-results');
        expect(result.success).toBe(true);
    });

    test('keeps zero-processed connect runs as failed without a no-results signal', () => {
        const result = normalizeRunOutcome({
            mode: 'connect',
            reason: 'unknown',
            processedCount: 0,
            actionCount: 0,
            skippedCount: 0,
            log: []
        });

        expect(result.runStatus).toBe(RUN_STATUS_FAILED);
        expect(result.success).toBe(false);
    });

    test('keeps zero-processed company runs as failed when no no-results signal exists', () => {
        const result = normalizeRunOutcome({
            mode: 'company',
            reason: 'unknown',
            stepCode: '',
            processedCount: 0,
            actionCount: 0,
            skippedCount: 0,
            log: []
        });

        expect(result.runStatus).toBe(RUN_STATUS_FAILED);
        expect(result.reason).toBe('no-items-processed');
        expect(result.success).toBe(false);
    });

    test('preserves explicit failed reason when provided', () => {
        const result = normalizeRunOutcome({
            mode: 'company',
            runStatus: 'failed',
            reason: 'no-target-matches',
            error: 'No company matched the target filter.',
            processedCount: 4,
            actionCount: 0,
            skippedCount: 4
        });

        expect(result.runStatus).toBe(RUN_STATUS_FAILED);
        expect(result.reason).toBe('no-target-matches');
        expect(result.success).toBe(false);
    });

    test('returns success when processed >= 1 and no error', () => {
        const result = normalizeRunOutcome({
            mode: 'connect',
            log: [
                { status: 'sent' },
                { status: 'skipped-duplicate' }
            ]
        });

        expect(result.runStatus).toBe(RUN_STATUS_SUCCESS);
        expect(result.success).toBe(true);
        expect(result.processedCount).toBe(2);
        expect(result.actionCount).toBe(1);
        expect(result.skippedCount).toBe(1);
    });

    test('infers processed count from mode-specific fields and mode hint', () => {
        const company = normalizeRunOutcome({
            mode: 'company',
            processedCount: 0,
            followedThisStep: 2,
            actionCount: 0,
            skippedCount: 0
        });

        expect(company.processedCount).toBe(2);
        expect(company.runStatus).toBe(RUN_STATUS_SUCCESS);
    });

    test('returns reason=unknown when processedPosts>0 but no actionable output (L91)', () => {
        const result = normalizeRunOutcome({ mode: 'connect', processedPosts: 2 });
        expect(result.runStatus).toBe(RUN_STATUS_FAILED);
        expect(result.reason).toBe('unknown');
    });

    test('covers || fallback for null status in log entries (L106 arm=1)', () => {
        const result = normalizeRunOutcome({
            mode: 'company',
            log: [{ status: null }]
        });
        expect(result.runStatus).toBe(RUN_STATUS_FAILED);
        expect(result.reason).toBe('no-items-processed');
    });
});

describe('withdraw mode outcome', () => {
    test('zero eligible invites (no-results) is a successful run', () => {
        const result = normalizeRunOutcome({
            mode: 'withdraw',
            reason: 'no-results',
            processedCount: 0,
            skippedCount: 0
        });
        expect(result.runStatus).toBe(RUN_STATUS_SUCCESS);
    });

    test('withdrawn entries count as actions', () => {
        const result = normalizeRunOutcome({
            mode: 'withdraw',
            log: [
                { status: 'withdrawn' },
                { status: 'error-withdraw-not-confirmed' }
            ]
        });
        expect(result.actionCount).toBe(1);
        expect(result.runStatus).toBe(RUN_STATUS_SUCCESS);
    });
});

describe('computeConnectOutcomeMetrics', () => {
    const { computeConnectOutcomeMetrics } = require('../extension/lib/run-outcome');

    test('counts actions, skips and ignores errors, quota stops and empty status', () => {
        const metrics = computeConnectOutcomeMetrics([
            { status: 'sent' },
            { status: 'skipped-already' },
            { status: 'skip-no-button' },
            { status: 'error-modal' },
            { status: 'stopped-quota' },
            { status: '' },
            null,
            { status: 'sent-no-note' }
        ], true, 3);
        expect(metrics).toEqual({
            processedCount: 8,
            actionCount: 2,
            skippedCount: 2,
            noteQuotaExhausted: true,
            sentWithoutNoteAfterQuota: 3
        });
    });

    test('treats a non-array log as empty', () => {
        expect(computeConnectOutcomeMetrics(undefined, false, 0)).toEqual({
            processedCount: 0,
            actionCount: 0,
            skippedCount: 0,
            noteQuotaExhausted: false,
            sentWithoutNoteAfterQuota: 0
        });
    });
});

describe('composeConnectResult', () => {
    const { composeConnectResult } = require('../extension/lib/run-outcome');
    const fallback = [{ status: 'sent' }];

    test('falls back to the shared log and succeeds', () => {
        const result = composeConnectResult({ extra: 1 }, undefined, fallback, false, 0);
        expect(result).toMatchObject({
            extra: 1, mode: 'connect', runStatus: 'success', reason: 'unknown',
            success: true, processedCount: 1, actionCount: 1
        });
        expect(result.log).toBe(fallback);
    });

    test('uses the explicit log over the fallback', () => {
        const explicit = [{ status: 'skipped-x' }, { status: 'sent' }];
        const result = composeConnectResult({}, explicit, fallback, true, 2);
        expect(result.log).toBe(explicit);
        expect(result).toMatchObject({
            processedCount: 2, skippedCount: 1,
            noteQuotaExhausted: true, sentWithoutNoteAfterQuota: 2
        });
    });

    test('non-object payload behaves as empty and empty log fails', () => {
        const result = composeConnectResult(null, [], fallback, false, 0);
        expect(result).toMatchObject({
            runStatus: 'failed', reason: 'no-items-processed', success: false
        });
    });

    test('stopped by user is canceled', () => {
        const result = composeConnectResult({ stoppedByUser: true }, undefined, fallback, false, 0);
        expect(result).toMatchObject({ runStatus: 'canceled', reason: 'stopped-by-user', success: false });
    });

    test('error with challenge text maps to challenge reason', () => {
        const result = composeConnectResult({ error: 'Checkpoint hit' }, undefined, fallback, false, 0);
        expect(result).toMatchObject({ runStatus: 'failed', reason: 'challenge' });
    });

    test('other error maps to runtime-error', () => {
        const result = composeConnectResult({ error: 'boom' }, undefined, fallback, false, 0);
        expect(result).toMatchObject({ runStatus: 'failed', reason: 'runtime-error' });
    });

    test('empty log with error text still reports challenge first', () => {
        const result = composeConnectResult({ error: 'authwall' }, [], fallback, false, 0);
        expect(result.reason).toBe('challenge');
    });

    test('explicit runStatus and reason are preserved', () => {
        const result = composeConnectResult(
            { runStatus: 'failed', reason: 'custom' }, undefined, fallback, false, 0
        );
        expect(result).toMatchObject({ runStatus: 'failed', reason: 'custom', success: false });
    });

    test('failed with empty log and no error reports no-items-processed', () => {
        const result = composeConnectResult({ runStatus: 'failed' }, [], fallback, false, 0);
        expect(result.reason).toBe('no-items-processed');
    });

    test('canceled runStatus given explicitly derives stopped-by-user', () => {
        const result = composeConnectResult({ runStatus: 'canceled' }, undefined, fallback, false, 0);
        expect(result.reason).toBe('stopped-by-user');
    });

    test('exports are frozen', () => {
        expect(Object.isFrozen(require('../extension/lib/run-outcome'))).toBe(true);
    });
});
