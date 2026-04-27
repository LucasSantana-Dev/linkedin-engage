const {
    normalizeConnectQueryTerm,
    buildRelaxedConnectQuery,
    buildConnectSearchKeywords,
    shouldRetryConnectWithRelaxedQuery,
    buildRelaxedConnectConfig,
    countBooleanOperatorsSafe
} = require('../extension/lib/connect-query');

describe('normalizeConnectQueryTerm', () => {
    it('strips parentheses', () => {
        expect(normalizeConnectQueryTerm('(test)')).toBe('test');
    });

    it('strips brackets', () => {
        expect(normalizeConnectQueryTerm('[test]')).toBe('test');
    });

    it('strips double-quotes', () => {
        expect(normalizeConnectQueryTerm('"test"')).toBe('test');
    });

    it('strips multiple special characters', () => {
        expect(normalizeConnectQueryTerm('([test]")')).toBe('test');
    });

    it('collapses multiple spaces', () => {
        expect(normalizeConnectQueryTerm('test   case')).toBe('test case');
    });

    it('handles empty string', () => {
        expect(normalizeConnectQueryTerm('')).toBe('');
    });

    it('trims whitespace', () => {
        expect(normalizeConnectQueryTerm('  test  ')).toBe('test');
    });
});

describe('buildConnectSearchKeywords', () => {
    it('preserves AND operator verbatim', () => {
        expect(buildConnectSearchKeywords('javascript AND python')).toBe('javascript AND python');
    });

    it('preserves OR operator verbatim', () => {
        expect(buildConnectSearchKeywords('java OR ruby')).toBe('java OR ruby');
    });

    it('preserves NOT operator verbatim', () => {
        expect(buildConnectSearchKeywords('senior NOT manager')).toBe('senior NOT manager');
    });

    it('preserves double quotes when present', () => {
        expect(buildConnectSearchKeywords('"full stack" developer')).toBe('"full stack" developer');
    });

    it('preserves parentheses when present', () => {
        expect(buildConnectSearchKeywords('(javascript OR python) developer')).toBe('(javascript OR python) developer');
    });

    it('joins simple terms with spaces when no boolean ops', () => {
        expect(buildConnectSearchKeywords('python developer')).toBe('python developer');
    });

    it('caps at 8 words for simple queries', () => {
        const query = 'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10';
        const result = buildConnectSearchKeywords(query);
        expect(result.split(/\s+/).length).toBe(8);
    });

    it('strips non-word characters from simple queries', () => {
        expect(buildConnectSearchKeywords('python! ruby@ node#')).toBe('python ruby node');
    });

    it('handles empty string', () => {
        expect(buildConnectSearchKeywords('')).toBe('');
    });

    it('handles whitespace-only string', () => {
        expect(buildConnectSearchKeywords('   ')).toBe('');
    });
});

describe('buildRelaxedConnectQuery', () => {
    it('removes AND operators and returns 4 segments max', () => {
        const result = buildRelaxedConnectQuery('javascript AND python AND ruby AND go AND rust');
        const segments = result.split(/\s+/);
        expect(segments.length).toBeLessThanOrEqual(4);
        expect(result).not.toContain('AND');
    });

    it('removes OR operators', () => {
        const result = buildRelaxedConnectQuery('senior OR junior OR manager');
        expect(result).not.toContain('OR');
    });

    it('returns empty for empty query', () => {
        expect(buildRelaxedConnectQuery('')).toBe('');
    });

    it('collapses duplicate segments', () => {
        const result = buildRelaxedConnectQuery('python AND python OR javascript');
        const segments = result.split(/\s+/);
        expect(segments).toContain('python');
        expect(segments).toContain('javascript');
        // Only one instance of python in the result
        expect(result).toBe('python javascript');
    });

    it('strips special chars from segments', () => {
        const result = buildRelaxedConnectQuery('(javascript) AND [python]');
        expect(result).not.toContain('(');
        expect(result).not.toContain('[');
    });

    it('returns source string when all non-word chars', () => {
        const result = buildRelaxedConnectQuery('!@#');
        expect(result).toBe('!@#');
    });

    it('caps at 4 Boolean-operator-separated segments', () => {
        // With AND/OR, each segment is capped to max 4 segments
        const result = buildRelaxedConnectQuery('one AND two AND three AND four AND five');
        const segments = result.split(/\s+/);
        expect(segments.length).toBeLessThanOrEqual(4);
    });

    it('uses fallback word path when all segments normalize to empty', () => {
        // When source is split by AND/OR but contains only special chars that normalize away
        const result = buildRelaxedConnectQuery('"""" AND """"');
        // Split by AND produces ['""""', '""""'], both normalize to empty strings
        // uniqueSegments is empty, so falls back to word path on the original source
        expect(result).toBe('"""" AND """"');
    });

    it('extracts and caps words in fallback path', () => {
        // The source '"""" AND """"' in fallback path:
        // - splits by /\s+/: ['""""', 'AND', '""""']
        // - maps to remove non-word chars: ['', 'AND', '']
        // - filters out empty and AND: []
        // - returns source since words.length === 0
        expect(buildRelaxedConnectQuery('"""" AND """"')).toBe('"""" AND """"');
    });
});

describe('countBooleanOperatorsSafe', () => {
    it('counts AND operators case-insensitively', () => {
        expect(countBooleanOperatorsSafe('python AND javascript AND ruby')).toBe(2);
    });

    it('counts OR operators case-insensitively', () => {
        expect(countBooleanOperatorsSafe('senior OR junior OR manager')).toBe(2);
    });

    it('counts NOT operators case-insensitively', () => {
        expect(countBooleanOperatorsSafe('senior NOT junior NOT manager')).toBe(2);
    });

    it('counts lowercase operators', () => {
        expect(countBooleanOperatorsSafe('python and javascript or ruby not something')).toBe(3);
    });

    it('counts mixed case operators', () => {
        expect(countBooleanOperatorsSafe('python AND javascript Or ruby NOT something')).toBe(3);
    });

    it('returns 0 for query without operators', () => {
        expect(countBooleanOperatorsSafe('python javascript ruby')).toBe(0);
    });

    it('returns 0 for empty query', () => {
        expect(countBooleanOperatorsSafe('')).toBe(0);
    });

    it('ignores partial word matches', () => {
        expect(countBooleanOperatorsSafe('android operator')).toBe(0);
    });
});

describe('shouldRetryConnectWithRelaxedQuery', () => {
    it('returns true on failed status with no-items-processed', () => {
        const result = {
            mode: 'connect',
            runStatus: 'failed',
            reason: 'no-items-processed',
            processedCount: 0
        };
        const launchState = { attempt: 0 };
        expect(shouldRetryConnectWithRelaxedQuery(result, launchState)).toBe(true);
    });

    it('returns true on failed status with processedCount <= 0', () => {
        const result = {
            mode: 'connect',
            runStatus: 'failed',
            reason: 'other-reason',
            processedCount: 0
        };
        const launchState = { attempt: 0 };
        expect(shouldRetryConnectWithRelaxedQuery(result, launchState)).toBe(true);
    });

    it('returns false on challenge reason', () => {
        const result = {
            mode: 'connect',
            runStatus: 'failed',
            reason: 'challenge'
        };
        const launchState = { attempt: 0 };
        expect(shouldRetryConnectWithRelaxedQuery(result, launchState)).toBe(false);
    });

    it('returns false on stopped-by-user reason', () => {
        const result = {
            mode: 'connect',
            runStatus: 'failed',
            reason: 'stopped-by-user'
        };
        const launchState = { attempt: 0 };
        expect(shouldRetryConnectWithRelaxedQuery(result, launchState)).toBe(false);
    });

    it('returns false when stoppedByUser is true', () => {
        const result = {
            mode: 'connect',
            runStatus: 'failed',
            reason: 'no-items-processed',
            stoppedByUser: true
        };
        const launchState = { attempt: 0 };
        expect(shouldRetryConnectWithRelaxedQuery(result, launchState)).toBe(false);
    });

    it('returns false when attempt >= 1', () => {
        const result = {
            mode: 'connect',
            runStatus: 'failed',
            reason: 'no-items-processed'
        };
        const launchState = { attempt: 1 };
        expect(shouldRetryConnectWithRelaxedQuery(result, launchState)).toBe(false);
    });

    it('returns false when mode is not connect', () => {
        const result = {
            mode: 'jobs',
            runStatus: 'failed',
            reason: 'no-items-processed'
        };
        const launchState = { attempt: 0 };
        expect(shouldRetryConnectWithRelaxedQuery(result, launchState)).toBe(false);
    });

    it('returns false when runStatus is not failed', () => {
        const result = {
            mode: 'connect',
            runStatus: 'success',
            reason: 'no-items-processed'
        };
        const launchState = { attempt: 0 };
        expect(shouldRetryConnectWithRelaxedQuery(result, launchState)).toBe(false);
    });

    it('returns false when launchState is null', () => {
        const result = {
            mode: 'connect',
            runStatus: 'failed',
            reason: 'no-items-processed'
        };
        expect(shouldRetryConnectWithRelaxedQuery(result, null)).toBe(false);
    });

    it('handles missing launchState gracefully', () => {
        const result = {
            mode: 'connect',
            runStatus: 'failed',
            reason: 'no-items-processed'
        };
        expect(shouldRetryConnectWithRelaxedQuery(result, undefined)).toBe(false);
    });

    it('returns false for other failure reasons with processedCount > 0', () => {
        const result = {
            mode: 'connect',
            runStatus: 'failed',
            reason: 'unknown-error',
            processedCount: 5
        };
        const launchState = { attempt: 0 };
        expect(shouldRetryConnectWithRelaxedQuery(result, launchState)).toBe(false);
    });
});

describe('buildRelaxedConnectConfig', () => {
    const mockNormalizeTemplateMeta = (meta, mode) => ({
        templateId: String(meta.templateId || ''),
        usageGoal: String(meta.usageGoal || ''),
        expectedResultsBucket: String(meta.expectedResultsBucket || ''),
        operatorCount: Math.max(0, Number(meta.operatorCount) || 0),
        compiledQueryLength: Math.max(0, Number(meta.compiledQueryLength) || 0),
        mode: mode || meta.mode || 'connect'
    });

    it('returns null for empty query', () => {
        const config = { query: '' };
        expect(buildRelaxedConnectConfig(config, mockNormalizeTemplateMeta)).toBe(null);
    });

    it('returns null when query is not provided', () => {
        const config = {};
        expect(buildRelaxedConnectConfig(config, mockNormalizeTemplateMeta)).toBe(null);
    });

    it('increments connectRelaxAttempt', () => {
        const config = {
            query: 'python AND javascript',
            connectRelaxAttempt: 0
        };
        const result = buildRelaxedConnectConfig(
            config,
            mockNormalizeTemplateMeta
        );
        expect(result.connectRelaxAttempt).toBe(1);
    });

    it('starts connectRelaxAttempt at 1 when not provided', () => {
        const config = {
            query: 'python AND javascript'
        };
        const result = buildRelaxedConnectConfig(
            config,
            mockNormalizeTemplateMeta
        );
        expect(result.connectRelaxAttempt).toBe(1);
    });

    it('sets activelyHiring to false', () => {
        const config = {
            query: 'python AND javascript',
            activelyHiring: true
        };
        const result = buildRelaxedConnectConfig(
            config,
            mockNormalizeTemplateMeta
        );
        expect(result.activelyHiring).toBe(false);
    });

    it('sets networkFilter to encoded S and O', () => {
        const config = {
            query: 'python AND javascript'
        };
        const result = buildRelaxedConnectConfig(
            config,
            mockNormalizeTemplateMeta
        );
        expect(result.networkFilter).toBe(encodeURIComponent('["S","O"]'));
    });

    it('relaxes the query', () => {
        const config = {
            query: 'python AND javascript AND ruby AND go AND rust'
        };
        const result = buildRelaxedConnectConfig(
            config,
            mockNormalizeTemplateMeta
        );
        expect(result.query).not.toContain('AND');
        expect(result.query.split(/\s+/).length)
        .toBeLessThanOrEqual(4);
    });

    it('normalizes template metadata with injected function', () => {
        const config = {
            query: 'python AND javascript',
            templateMeta: {
                templateId: 'test-123',
                usageGoal: 'recruiter_outreach'
            }
        };
        const result = buildRelaxedConnectConfig(
            config,
            mockNormalizeTemplateMeta
        );
        expect(result.templateMeta.templateId).toBe('test-123');
        expect(result.templateMeta.usageGoal).toBe('recruiter_outreach');
        expect(result.templateMeta.operatorCount).toBeGreaterThanOrEqual(0);
        expect(result.templateMeta.compiledQueryLength).toBeGreaterThanOrEqual(0);
    });

    it('works without injected normalizeTemplateMeta function', () => {
        const config = {
            query: 'python AND javascript',
            templateMeta: {
                templateId: 'test-123'
            }
        };
        const result = buildRelaxedConnectConfig(config);
        expect(result.templateMeta.templateId).toBe('test-123');
        expect(result.templateMeta.mode).toBe('connect');
        expect(result.query).not.toContain('AND');
    });

    it('preserves other properties from source config', () => {
        const config = {
            query: 'python AND javascript',
            otherProp: 'value',
            nested: { prop: 123 }
        };
        const result = buildRelaxedConnectConfig(
            config,
            mockNormalizeTemplateMeta
        );
        expect(result.otherProp).toBe('value');
        expect(result.nested.prop).toBe(123);
    });

    it('builds config with maxed out connectRelaxAttempt', () => {
        const config = {
            query: 'python AND javascript',
            connectRelaxAttempt: 999
        };
        const result = buildRelaxedConnectConfig(
            config,
            mockNormalizeTemplateMeta
        );
        expect(result.connectRelaxAttempt).toBe(1000);
    });

    it('handles null templateMeta in source config', () => {
        const config = {
            query: 'python AND javascript',
            templateMeta: null
        };
        const result = buildRelaxedConnectConfig(
            config,
            mockNormalizeTemplateMeta
        );
        expect(result.templateMeta).toBeDefined();
    });

    it('handles undefined query gracefully', () => {
        const config = {
            query: undefined
        };
        const result = buildRelaxedConnectConfig(
            config,
            mockNormalizeTemplateMeta
        );
        expect(result).toBe(null);
    });

    it('builds config with numeric connectRelaxAttempt', () => {
        const config = {
            query: 'test query',
            connectRelaxAttempt: 5
        };
        const result = buildRelaxedConnectConfig(
            config,
            mockNormalizeTemplateMeta
        );
        expect(result.connectRelaxAttempt).toBe(6);
    });
});
