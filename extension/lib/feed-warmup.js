var FEED_WARMUP_STATE_KEY = 'feedWarmupStateV1';
var FEED_WARMUP_DEFAULT_REQUIRED_RUNS = 2;

function clampWarmupRuns(value) {
    var parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return FEED_WARMUP_DEFAULT_REQUIRED_RUNS;
    }
    return Math.max(0, Math.min(10, Math.floor(parsed)));
}

function getDefaultFeedWarmupState() {
    return {
        completedRuns: 0,
        requiredRuns: FEED_WARMUP_DEFAULT_REQUIRED_RUNS,
        enabled: true,
        lastRunAt: null,
        totalLearnedPosts: 0,
        totalLearnedThreads: 0
    };
}

function sanitizeFeedWarmupState(raw) {
    var base = getDefaultFeedWarmupState();
    var source = raw && typeof raw === 'object' ? raw : {};
    return {
        completedRuns: Math.max(
            0,
            Math.floor(Number(source.completedRuns) || 0)
        ),
        requiredRuns: clampWarmupRuns(source.requiredRuns),
        enabled: source.enabled !== false,
        lastRunAt: typeof source.lastRunAt === 'string'
            ? source.lastRunAt : null,
        totalLearnedPosts: Math.max(
            0,
            Math.floor(Number(source.totalLearnedPosts) || 0)
        ),
        totalLearnedThreads: Math.max(
            0,
            Math.floor(Number(source.totalLearnedThreads) || 0)
        )
    };
}

function resolveFeedWarmupRuntime(state, config) {
    var normalized = sanitizeFeedWarmupState(state);
    var enabled = config?.feedWarmupEnabled !== undefined
        ? config.feedWarmupEnabled !== false
        : normalized.enabled;
    var requiredRuns = config?.feedWarmupRunsRequired !== undefined
        ? clampWarmupRuns(config.feedWarmupRunsRequired)
        : normalized.requiredRuns;

    var nextState = {
        ...normalized,
        enabled,
        requiredRuns
    };
    var warmupActive = enabled &&
        nextState.completedRuns < requiredRuns;
    var currentRunNumber = nextState.completedRuns + 1;

    return {
        state: nextState,
        warmupActive,
        currentRunNumber,
        enabled,
        requiredRuns,
        commentsEnabled: !warmupActive,
        reactionsForced: warmupActive
    };
}

function applyFeedWarmupRunResult(state, runResult) {
    var normalized = sanitizeFeedWarmupState(state);
    var result = runResult && typeof runResult === 'object'
        ? runResult : {};
    var learnedPosts = Math.max(
        0,
        Math.floor(Number(result.warmupPostsLearned) || 0)
    );
    var learnedThreads = Math.max(
        0,
        Math.floor(Number(result.warmupThreadsLearned) || 0)
    );
    var processedPosts = Math.max(
        0,
        Math.floor(Number(result.processedPosts) || 0)
    );
    var isWarmupRun = result.warmupActive === true;
    var succeeded = result.success === true;

    var next = {
        ...normalized,
        totalLearnedPosts: normalized.totalLearnedPosts +
            learnedPosts,
        totalLearnedThreads: normalized.totalLearnedThreads +
            learnedThreads,
        lastRunAt: new Date().toISOString()
    };

    if (isWarmupRun && succeeded && processedPosts > 0) {
        next.completedRuns = normalized.completedRuns + 1;
    }

    return next;
}

function resetFeedWarmupState(config) {
    var enabled = config?.feedWarmupEnabled !== undefined
        ? config.feedWarmupEnabled !== false
        : true;
    var requiredRuns = clampWarmupRuns(
        config?.feedWarmupRunsRequired
    );
    return {
        completedRuns: 0,
        requiredRuns,
        enabled,
        lastRunAt: null,
        totalLearnedPosts: 0,
        totalLearnedThreads: 0
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        FEED_WARMUP_STATE_KEY,
        FEED_WARMUP_DEFAULT_REQUIRED_RUNS,
        clampWarmupRuns,
        getDefaultFeedWarmupState,
        sanitizeFeedWarmupState,
        resolveFeedWarmupRuntime,
        applyFeedWarmupRunResult,
        resetFeedWarmupState
    };
}
