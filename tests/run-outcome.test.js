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
