var RUN_STATUS_SUCCESS = 'success';
var RUN_STATUS_FAILED = 'failed';
var RUN_STATUS_CANCELED = 'canceled';

function toSafeInt(value) {
    var n = Math.floor(Number(value) || 0);
    return n > 0 ? n : 0;
}

function isSkipStatus(status) {
    return /^skipped|^skip-/.test(String(status || ''));
}

function isErrorStatus(status) {
    return /^error-/.test(String(status || ''));
}

function isActionStatus(status) {
    var s = String(status || '');
    if (!s) return false;
    if (isSkipStatus(s) || isErrorStatus(s)) return false;
    if (s === 'warmup-learning') return false;
    return true;
}

function countSkipped(log) {
    if (!Array.isArray(log)) return 0;
    return log.filter(function(entry) {
        return isSkipStatus(entry?.status);
    }).length;
}

function countActions(log) {
    if (!Array.isArray(log)) return 0;
    return log.filter(function(entry) {
        return isActionStatus(entry?.status);
    }).length;
}

function inferProcessed(result, mode, actionCount, skippedCount) {
    var direct = toSafeInt(result?.processedCount);
    if (direct > 0) return direct;

    if (mode === 'feed') {
        var posts = toSafeInt(result?.processedPosts);
        if (posts > 0) return posts;
    }

    if (mode === 'company') {
        var perStep = toSafeInt(result?.followedThisStep);
        if (perStep > 0) return perStep;
    }

    var fromCounts = actionCount + skippedCount;
    if (fromCounts > 0) return fromCounts;
    return 0;
}

function detectStoppedByUser(result) {
    if (result?.stoppedByUser === true) return true;
    var text = [
        result?.message || '',
        result?.error || '',
        result?.reason || ''
    ].join(' ').toLowerCase();
    return /stopped by user|canceled by user|cancelled by user/.test(text);
}

function detectChallenge(result) {
    var text = String(result?.error || '').toLowerCase();
    return /captcha|security challenge|checkpoint|authwall|challenge/.test(text);
}

function inferReason(runStatus, result) {
    var explicitReason = String(result?.reason || '')
        .trim();
    if (runStatus === RUN_STATUS_CANCELED) {
        return 'stopped-by-user';
    }
    if (explicitReason && explicitReason !== 'unknown') {
        return explicitReason;
    }
    if (runStatus === RUN_STATUS_SUCCESS) {
        return explicitReason || 'unknown';
    }
    if (detectChallenge(result)) {
        return 'challenge';
    }
    if (String(result?.error || '').trim()) {
        return 'runtime-error';
    }
    if (toSafeInt(result?.processedCount) === 0 &&
        toSafeInt(result?.processedPosts) === 0) {
        return 'no-items-processed';
    }
    return 'unknown';
}

function inferRunStatus(result, stoppedByUser, processedCount) {
    if (stoppedByUser) return RUN_STATUS_CANCELED;
    if (String(result?.error || '').trim()) return RUN_STATUS_FAILED;
    if (processedCount === 0) return RUN_STATUS_FAILED;
    return RUN_STATUS_SUCCESS;
}

function normalizeRunOutcome(result, modeHint) {
    var source = result && typeof result === 'object'
        ? result
        : {};
    var mode = String(source.mode || modeHint || 'connect').trim() || 'connect';
    var skippedCount = toSafeInt(source.skippedCount);
    if (skippedCount === 0) {
        skippedCount = countSkipped(source.log);
    }
    var actionCount = toSafeInt(source.actionCount);
    if (actionCount === 0) {
        actionCount = countActions(source.log);
    }
    var processedCount = inferProcessed(
        source,
        mode,
        actionCount,
        skippedCount
    );
    var stoppedByUser = detectStoppedByUser(source);
    var runStatus = inferRunStatus(source, stoppedByUser, processedCount);
    var reason = inferReason(runStatus, {
        ...source,
        processedCount
    });

    return {
        ...source,
        mode,
        runStatus,
        reason,
        success: runStatus === RUN_STATUS_SUCCESS,
        stoppedByUser,
        processedCount,
        actionCount,
        skippedCount
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        RUN_STATUS_SUCCESS,
        RUN_STATUS_FAILED,
        RUN_STATUS_CANCELED,
        normalizeRunOutcome
    };
}
