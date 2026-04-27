const {
    buildCompanySearchUrl,
    sanitizeCompanySearchQuery,
    splitCompanySearchQueries,
    normalizeCompanyTargets,
    buildJobsSearchUrl
} = require('../extension/lib/company-query');

describe('buildCompanySearchUrl', () => {
    it('builds a valid LinkedIn company search URL', () => {
        const url = buildCompanySearchUrl('Google');
        expect(url).toBe('https://www.linkedin.com/search/results/companies/?keywords=Google&origin=FACETED_SEARCH');
    });

    it('URL encodes special characters in query', () => {
        const url = buildCompanySearchUrl('Tech & AI');
        expect(url).toContain('keywords=Tech%20%26%20AI');
    });

    it('URL encodes quotes in query', () => {
        const url = buildCompanySearchUrl('"Fortune 500"');
        expect(url).toContain('keywords=%22Fortune%20500%22');
    });

    it('handles empty query', () => {
        const url = buildCompanySearchUrl('');
        expect(url).toBe('https://www.linkedin.com/search/results/companies/?keywords=&origin=FACETED_SEARCH');
    });

    it('includes FACETED_SEARCH origin parameter', () => {
        const url = buildCompanySearchUrl('test');
        expect(url).toContain('origin=FACETED_SEARCH');
    });
});

describe('sanitizeCompanySearchQuery', () => {
    it('normalizes smart quotes to straight quotes', () => {
        const result = sanitizeCompanySearchQuery('"test"');
        expect(result).toBe('"test"');
    });

    it('normalizes smart apostrophes to straight apostrophes', () => {
        const result = sanitizeCompanySearchQuery("'test'");
        expect(result).toBe("'test'");
    });

    it('collapses multiple spaces into single space', () => {
        const result = sanitizeCompanySearchQuery('test   query  here');
        expect(result).toBe('test query here');
    });

    it('collapses newlines to spaces', () => {
        const result = sanitizeCompanySearchQuery('test\n\nquery');
        expect(result).toBe('test query');
    });

    it('trims leading and trailing whitespace', () => {
        const result = sanitizeCompanySearchQuery('  test  ');
        expect(result).toBe('test');
    });

    it('uppercases lowercase boolean operators', () => {
        const result = sanitizeCompanySearchQuery('test and query or result');
        expect(result).toBe('test AND query OR result');
    });

    it('removes consecutive boolean operators', () => {
        const result = sanitizeCompanySearchQuery('test AND OR query');
        expect(result).toBe('test OR query');
    });

    it('removes leading boolean operator', () => {
        const result = sanitizeCompanySearchQuery('AND test query');
        expect(result).toBe('test query');
    });

    it('removes leading OR', () => {
        const result = sanitizeCompanySearchQuery('OR test query');
        expect(result).toBe('test query');
    });

    it('removes leading NOT', () => {
        const result = sanitizeCompanySearchQuery('NOT test query');
        expect(result).toBe('test query');
    });

    it('removes trailing boolean operator with space', () => {
        const result = sanitizeCompanySearchQuery('test query AND');
        expect(result).toBe('test query');
    });

    it('removes trailing OR with space', () => {
        const result = sanitizeCompanySearchQuery('test query OR');
        expect(result).toBe('test query');
    });

    it('returns empty string for null input', () => {
        const result = sanitizeCompanySearchQuery(null);
        expect(result).toBe('');
    });

    it('returns empty string for undefined input', () => {
        const result = sanitizeCompanySearchQuery(undefined);
        expect(result).toBe('');
    });

    it('returns empty string for whitespace-only input', () => {
        const result = sanitizeCompanySearchQuery('   \n  \t  ');
        expect(result).toBe('');
    });

    it('handles mixed case boolean operators', () => {
        const result = sanitizeCompanySearchQuery('test AnD query Or result');
        expect(result).toBe('test AND query OR result');
    });

    it('preserves query structure with valid boolean operators', () => {
        const result = sanitizeCompanySearchQuery('python AND (machine OR deep) NOT java');
        expect(result).toBe('python AND (machine OR deep) NOT java');
    });

    it('handles word boundaries correctly for boolean operators', () => {
        const result = sanitizeCompanySearchQuery('android and app');
        expect(result).toBe('android AND app');
    });
});

describe('splitCompanySearchQueries', () => {
    it('splits on single newline', () => {
        const result = splitCompanySearchQueries('query1\nquery2');
        expect(result).toEqual(['query1', 'query2']);
    });

    it('splits on multiple newlines', () => {
        const result = splitCompanySearchQueries('query1\n\nquery2');
        expect(result).toEqual(['query1', 'query2']);
    });

    it('applies sanitization to each query', () => {
        const result = splitCompanySearchQueries('  test  \n  query  ');
        expect(result).toEqual(['test', 'query']);
    });

    it('filters out empty queries', () => {
        const result = splitCompanySearchQueries('query1\n\n\nquery2');
        expect(result).toEqual(['query1', 'query2']);
    });

    it('filters out whitespace-only queries', () => {
        const result = splitCompanySearchQueries('query1\n   \nquery2');
        expect(result).toEqual(['query1', 'query2']);
    });

    it('returns empty array for null input', () => {
        const result = splitCompanySearchQueries(null);
        expect(result).toEqual([]);
    });

    it('returns empty array for undefined input', () => {
        const result = splitCompanySearchQueries(undefined);
        expect(result).toEqual([]);
    });

    it('returns empty array for empty string', () => {
        const result = splitCompanySearchQueries('');
        expect(result).toEqual([]);
    });

    it('returns empty array for whitespace-only string', () => {
        const result = splitCompanySearchQueries('   \n  \n  ');
        expect(result).toEqual([]);
    });

    it('sanitizes boolean operators in split queries', () => {
        const result = splitCompanySearchQueries('test and google\nfacebook or meta');
        expect(result).toEqual(['test AND google', 'facebook OR meta']);
    });

    it('handles single query without newlines', () => {
        const result = splitCompanySearchQueries('single query');
        expect(result).toEqual(['single query']);
    });

    it('preserves order of queries', () => {
        const result = splitCompanySearchQueries('third\nfirst\nsecond');
        expect(result).toEqual(['third', 'first', 'second']);
    });
});

describe('normalizeCompanyTargets', () => {
    it('deduplicates case-insensitive entries', () => {
        const result = normalizeCompanyTargets(['Google', 'google', 'GOOGLE']);
        expect(result).toEqual(['Google']);
    });

    it('trims whitespace from each entry', () => {
        const result = normalizeCompanyTargets(['  Google  ', ' Facebook ']);
        expect(result).toEqual(['Google', 'Facebook']);
    });

    it('collapses internal whitespace', () => {
        const result = normalizeCompanyTargets(['Google  Inc', 'Microsoft   Corp']);
        expect(result).toEqual(['Google Inc', 'Microsoft Corp']);
    });

    it('filters out empty strings', () => {
        const result = normalizeCompanyTargets(['Google', '', 'Facebook']);
        expect(result).toEqual(['Google', 'Facebook']);
    });

    it('filters out whitespace-only entries', () => {
        const result = normalizeCompanyTargets(['Google', '   ', 'Facebook']);
        expect(result).toEqual(['Google', 'Facebook']);
    });

    it('returns empty array for null input', () => {
        const result = normalizeCompanyTargets(null);
        expect(result).toEqual([]);
    });

    it('returns empty array for undefined input', () => {
        const result = normalizeCompanyTargets(undefined);
        expect(result).toEqual([]);
    });

    it('returns empty array for empty array', () => {
        const result = normalizeCompanyTargets([]);
        expect(result).toEqual([]);
    });

    it('preserves first occurrence capitalization', () => {
        const result = normalizeCompanyTargets(['Google Inc', 'GOOGLE INC']);
        expect(result).toEqual(['Google Inc']);
    });

    it('handles mixed case deduplication', () => {
        const result = normalizeCompanyTargets(['Apple', 'APPLE', 'apple', 'Microsoft']);
        expect(result).toEqual(['Apple', 'Microsoft']);
    });

    it('handles null values in array', () => {
        const result = normalizeCompanyTargets(['Google', null, 'Facebook']);
        expect(result).toEqual(['Google', 'Facebook']);
    });

    it('preserves order of unique entries', () => {
        const result = normalizeCompanyTargets(['Zebra', 'Apple', 'Google']);
        expect(result).toEqual(['Zebra', 'Apple', 'Google']);
    });

    it('handles entries with special characters', () => {
        const result = normalizeCompanyTargets(['AT&T', 'at&t']);
        expect(result).toEqual(['AT&T']);
    });
});

describe('buildJobsSearchUrl', () => {
    it('builds a valid LinkedIn jobs search URL', () => {
        const url = buildJobsSearchUrl('Engineer');
        expect(url).toBe('https://www.linkedin.com/jobs/search/?keywords=Engineer&f_AL=true');
    });

    it('URL encodes special characters in query', () => {
        const url = buildJobsSearchUrl('Senior & Lead');
        expect(url).toContain('keywords=Senior%20%26%20Lead');
    });

    it('includes base path /jobs/search/', () => {
        const url = buildJobsSearchUrl('test');
        expect(url).toContain('/jobs/search/');
    });

    it('includes f_AL=true parameter', () => {
        const url = buildJobsSearchUrl('test');
        expect(url).toContain('f_AL=true');
    });

    it('handles empty query', () => {
        const url = buildJobsSearchUrl('');
        expect(url).toBe('https://www.linkedin.com/jobs/search/?keywords=&f_AL=true');
    });

    it('delegates to buildLinkedInJobsSearchUrl if available', () => {
        const originalBuild = global.buildLinkedInJobsSearchUrl;
        global.buildLinkedInJobsSearchUrl = function(query, options) {
            return 'custom://jobs?q=' + query;
        };

        const url = buildJobsSearchUrl('test', {});
        expect(url).toBe('custom://jobs?q=test');

        if (originalBuild) {
            global.buildLinkedInJobsSearchUrl = originalBuild;
        } else {
            delete global.buildLinkedInJobsSearchUrl;
        }
    });

    it('falls back to default URL when buildLinkedInJobsSearchUrl not available', () => {
        const originalBuild = global.buildLinkedInJobsSearchUrl;
        delete global.buildLinkedInJobsSearchUrl;

        const url = buildJobsSearchUrl('Engineer');
        expect(url).toContain('linkedin.com/jobs/search/');
        expect(url).toContain('keywords=Engineer');

        if (originalBuild) {
            global.buildLinkedInJobsSearchUrl = originalBuild;
        }
    });

    it('handles null options gracefully', () => {
        const url = buildJobsSearchUrl('test', null);
        expect(url).toContain('linkedin.com/jobs/search/');
    });
});
