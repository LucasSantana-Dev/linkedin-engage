const {
    FEED_WARMUP_DEFAULT_REQUIRED_RUNS,
    clampWarmupRuns,
    getDefaultFeedWarmupState,
    sanitizeFeedWarmupState,
    resolveFeedWarmupRuntime,
    applyFeedWarmupRunResult,
    resetFeedWarmupState
} = require('../extension/lib/feed-warmup');

describe('feed warmup state', () => {
    test('resolves active warmup when completed runs are below required', () => {
        const runtime = resolveFeedWarmupRuntime({
            completedRuns: 1,
            requiredRuns: 2,
            enabled: true
        }, {});

        expect(runtime.warmupActive).toBe(true);
        expect(runtime.currentRunNumber).toBe(2);
        expect(runtime.commentsEnabled).toBe(false);
        expect(runtime.reactionsForced).toBe(true);
    });

    test('resolves comments enabled when warmup disabled', () => {
        const runtime = resolveFeedWarmupRuntime({
            completedRuns: 0,
            requiredRuns: 2,
            enabled: false
        }, {});

        expect(runtime.warmupActive).toBe(false);
        expect(runtime.commentsEnabled).toBe(true);
        expect(runtime.reactionsForced).toBe(false);
    });

    test('increments completed runs only on successful warmup run with processed posts', () => {
        const state = sanitizeFeedWarmupState({
            completedRuns: 0,
            requiredRuns: 2,
            enabled: true
        });
        const next = applyFeedWarmupRunResult(state, {
            mode: 'feed',
            warmupActive: true,
            success: true,
            processedPosts: 5,
            warmupPostsLearned: 4,
            warmupThreadsLearned: 2
        });

        expect(next.completedRuns).toBe(1);
        expect(next.totalLearnedPosts).toBe(4);
        expect(next.totalLearnedThreads).toBe(2);
        expect(next.lastRunAt).toBeTruthy();
    });

    test('does not increment completed runs for failed or empty runs', () => {
        const state = sanitizeFeedWarmupState({
            completedRuns: 1,
            requiredRuns: 2,
            enabled: true
        });
        const failed = applyFeedWarmupRunResult(state, {
            mode: 'feed',
            warmupActive: true,
            success: false,
            processedPosts: 8
        });
        const empty = applyFeedWarmupRunResult(state, {
            mode: 'feed',
            warmupActive: true,
            success: true,
            processedPosts: 0
        });

        expect(failed.completedRuns).toBe(1);
        expect(empty.completedRuns).toBe(1);
    });

    test('resets warmup progress with provided config', () => {
        const reset = resetFeedWarmupState({
            feedWarmupEnabled: false,
            feedWarmupRunsRequired: 4
        });

        expect(reset.completedRuns).toBe(0);
        expect(reset.enabled).toBe(false);
        expect(reset.requiredRuns).toBe(4);
        expect(reset.totalLearnedPosts).toBe(0);
        expect(reset.totalLearnedThreads).toBe(0);
    });

    test('clamps invalid required runs values', () => {
        expect(clampWarmupRuns(-1)).toBe(0);
        expect(clampWarmupRuns(11)).toBe(10);
        expect(clampWarmupRuns('x')).toBe(
            FEED_WARMUP_DEFAULT_REQUIRED_RUNS
        );
        expect(getDefaultFeedWarmupState().requiredRuns).toBe(
            FEED_WARMUP_DEFAULT_REQUIRED_RUNS
        );
    });
});
