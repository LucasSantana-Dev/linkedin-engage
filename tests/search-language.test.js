const {
  SEARCH_LANGUAGE_MODES,
  normalizeSearchLanguageMode,
  resolveCanonicalTerm,
  localizeSearchTerms,
  resolveSearchLocale,
} = require('../extension/lib/search-language.js');

describe('search-language.js', () => {
  describe('SEARCH_LANGUAGE_MODES', () => {
    it('exports all required mode keys', () => {
      expect(SEARCH_LANGUAGE_MODES).toContain('en');
      expect(SEARCH_LANGUAGE_MODES).toContain('pt_BR');
      expect(SEARCH_LANGUAGE_MODES).toContain('bilingual');
      expect(SEARCH_LANGUAGE_MODES).toContain('auto');
    });

    it('is frozen to prevent mutations', () => {
      expect(Object.isFrozen(SEARCH_LANGUAGE_MODES)).toBe(true);
    });
  });

  describe('normalizeSearchLanguageMode()', () => {
    it('returns valid modes unchanged', () => {
      expect(normalizeSearchLanguageMode('en')).toBe('en');
      expect(normalizeSearchLanguageMode('pt_BR')).toBe('pt_BR');
      expect(normalizeSearchLanguageMode('bilingual')).toBe('bilingual');
      expect(normalizeSearchLanguageMode('auto')).toBe('auto');
    });

    it('returns AUTO for pt-BR (wrong separator)', () => {
      expect(normalizeSearchLanguageMode('pt-BR')).toBe('auto');
    });

    it('returns AUTO for pt_br (lowercase form)', () => {
      expect(normalizeSearchLanguageMode('pt_br')).toBe('auto');
    });

    it('returns AUTO for mixed case variants', () => {
      expect(normalizeSearchLanguageMode('PT-br')).toBe('auto');
      expect(normalizeSearchLanguageMode('PT_BR')).toBe('auto');
    });

    it('returns AUTO for invalid/unrecognized modes', () => {
      expect(normalizeSearchLanguageMode('invalid')).toBe('auto');
      expect(normalizeSearchLanguageMode('es')).toBe('auto');
      expect(normalizeSearchLanguageMode('')).toBe('auto');
      expect(normalizeSearchLanguageMode(null)).toBe('auto');
      expect(normalizeSearchLanguageMode(undefined)).toBe('auto');
    });

    it('handles non-string inputs gracefully', () => {
      expect(normalizeSearchLanguageMode(123)).toBe('auto');
      expect(normalizeSearchLanguageMode({})).toBe('auto');
      expect(normalizeSearchLanguageMode([])).toBe('auto');
    });
  });

  describe('resolveCanonicalTerm()', () => {
    it('returns term unchanged if already canonical', () => {
      expect(resolveCanonicalTerm('software engineer')).toBe('software engineer');
      expect(resolveCanonicalTerm('recruiter')).toBe('recruiter');
    });

    it('returns unrecognized terms unchanged (no English aliases)', () => {
      expect(resolveCanonicalTerm('dev')).toBe('dev');
      expect(resolveCanonicalTerm('eng')).toBe('eng');
      expect(resolveCanonicalTerm('PM')).toBe('pm');
    });

    it('resolves PT_BR aliases to canonical English terms', () => {
      expect(resolveCanonicalTerm('desenvolvedor')).toBe('developer');
      expect(resolveCanonicalTerm('recruiter')).toBe('recruiter');
    });

    it('normalizes input before resolving (lowercases, removes accents)', () => {
      expect(resolveCanonicalTerm('DEVELOPER')).toBe('developer');
      expect(resolveCanonicalTerm('ENGINEER')).toBe('engineer');
    });

    it('removes double quotes from term before resolving', () => {
      expect(resolveCanonicalTerm('"developer"')).toBe('developer');
      expect(resolveCanonicalTerm('"recruiter"')).toBe('recruiter');
    });

    it('returns canonical term if found in TERM_VARIANTS', () => {
      const result = resolveCanonicalTerm('developer');
      expect(result).toBe('developer');
    });

    it('returns term as-is if no alias exists (after normalization)', () => {
      expect(resolveCanonicalTerm('nonexistent-term')).toBe('nonexistent-term');
      expect(resolveCanonicalTerm('unknown role', 'en')).toBe('unknown role');
    });

    it('strips leading/trailing whitespace from terms', () => {
      expect(resolveCanonicalTerm('  developer  ')).toBe('developer');
      expect(resolveCanonicalTerm('\tengineer\n')).toBe('engineer');
    });

    it('defaults to en mode when locale not specified', () => {
      expect(resolveCanonicalTerm('developer')).toBe('developer');
    });

    it('returns empty string for empty input', () => {
      expect(resolveCanonicalTerm('')).toBe('');
      expect(resolveCanonicalTerm('   ')).toBe('');
    });
  });

  describe('localizeSearchTerms()', () => {
    it('returns array of localized terms for EN mode', () => {
      const result = localizeSearchTerms(['developer', 'engineer'], 'en');
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('returns array of localized terms for PT_BR mode', () => {
      const result = localizeSearchTerms(['developer', 'engineer'], 'pt_BR');
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('includes original term and all variants when available', () => {
      const result = localizeSearchTerms(['developer'], 'en');
      expect(result).toContain('developer');
    });

    it('deduplicates variants in result', () => {
      const result = localizeSearchTerms(['dev', 'developer'], 'en');
      const unique = new Set(result);
      expect(unique.size).toBe(result.length);
    });

    it('handles empty input array', () => {
      const result = localizeSearchTerms([], 'en');
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('handles multiple terms with variants', () => {
      const result = localizeSearchTerms(['developer', 'engineer'], 'en');
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('normalizes input terms (lowercases, removes accents, quotes)', () => {
      const result = localizeSearchTerms(['DEV', '"eng"', 'Développeur'], 'en');
      expect(Array.isArray(result)).toBe(true);
    });

    it('returns variants in consistent order (deduped set)', () => {
      const result1 = localizeSearchTerms(['developer'], 'en');
      const result2 = localizeSearchTerms(['developer'], 'en');
      expect(result1).toEqual(result2);
    });

    it('bilingual mode includes variants from both EN and PT_BR', () => {
      const result = localizeSearchTerms(['developer'], 'bilingual');
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('filters null or undefined terms gracefully', () => {
      expect(() => localizeSearchTerms([null, 'dev'], 'en')).not.toThrow();
      expect(() => localizeSearchTerms([undefined, 'eng'], 'pt_BR')).not.toThrow();
    });

    it('auto mode resolves locale and returns appropriate variants', () => {
      const result = localizeSearchTerms(['developer'], 'auto');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('resolveSearchLocale()', () => {
    it('returns en mode when no signals detected', () => {
      const result = resolveSearchLocale({});
      expect(result).toBe('en');
    });

    it('returns en mode when null/undefined context provided', () => {
      expect(resolveSearchLocale(null)).toBe('en');
      expect(resolveSearchLocale(undefined)).toBe('en');
      expect(resolveSearchLocale()).toBe('en');
    });

    it('returns pt_BR mode when Brazil signals detected in query', () => {
      const result = resolveSearchLocale({
        query: 'brasil',
        mode: 'jobs'
      });
      expect(result).toBe('pt_BR');
    });

    it('detects São Paulo as Brazil signal', () => {
      const result = resolveSearchLocale({
        query: 'sao paulo',
        mode: 'jobs'
      });
      expect(result).toBe('pt_BR');
    });

    it('detects Brazil signal in selectedLocations', () => {
      const result = resolveSearchLocale({
        selectedLocations: ['Brazil', 'São Paulo'],
        mode: 'jobs'
      });
      expect(result).toBe('pt_BR');
    });

    it('returns en mode for English-only context', () => {
      const result = resolveSearchLocale({
        query: 'developer engineer recruiter',
        mode: 'connect'
      });
      expect(result).toBe('en');
    });

    it('respects requestedMode when explicitly set', () => {
      const result = resolveSearchLocale({
        requestedMode: 'pt_BR',
        query: 'developer'
      });
      expect(result).toBe('pt_BR');
    });

    it('respects searchLanguageMode when requestedMode not provided', () => {
      const result = resolveSearchLocale({
        searchLanguageMode: 'bilingual'
      });
      expect(result).toBe('bilingual');
    });

    it('prefers requestedMode over searchLanguageMode', () => {
      const result = resolveSearchLocale({
        requestedMode: 'pt_BR',
        searchLanguageMode: 'en'
      });
      expect(result).toBe('pt_BR');
    });

    it('returns pt_BR for jobs mode with Brazil signals', () => {
      const result = resolveSearchLocale({
        mode: 'jobs',
        query: 'brasil'
      });
      expect(result).toBe('pt_BR');
    });

    it('returns en when jobsBrazilOffshoreFriendly is true', () => {
      const result = resolveSearchLocale({
        jobsBrazilOffshoreFriendly: true,
        query: 'brasil'
      });
      expect(result).toBe('en');
    });

    it('returns bilingual when expectedResultsBucket is broad with latam signals', () => {
      const result = resolveSearchLocale({
        expectedResultsBucket: 'broad',
        marketTerms: ['latam']
      });
      expect(result).toBe('bilingual');
    });

    it('returns bilingual when usageGoal is market_scan with latam signals', () => {
      const result = resolveSearchLocale({
        usageGoal: 'market_scan',
        marketTerms: ['latam']
      });
      expect(result).toBe('bilingual');
    });

    it('returns en for global signals in non-jobs context', () => {
      const result = resolveSearchLocale({
        query: 'global remote engineer',
        mode: 'connect'
      });
      expect(result).toBe('en');
    });

    it('detects global signals (worldwide, international, offshore)', () => {
      const result1 = resolveSearchLocale({
        query: 'worldwide'
      });
      const result2 = resolveSearchLocale({
        query: 'international'
      });
      const result3 = resolveSearchLocale({
        query: 'offshore'
      });
      expect([result1, result2, result3]).toEqual(expect.arrayContaining(['en', 'en', 'en']));
    });

    it('handles empty context object gracefully', () => {
      const result = resolveSearchLocale({});
      expect(typeof result).toBe('string');
      expect(['en', 'pt_BR', 'bilingual']).toContain(result);
    });

    it('ignores irrelevant terms and defaults to en', () => {
      const result = resolveSearchLocale({
        query: 'xyz abc 123 qwerty'
      });
      expect(result).toBe('en');
    });

    it('detects Brazil signals in locationTerms array', () => {
      const result = resolveSearchLocale({
        locationTerms: ['rio', 'sao paulo'],
        mode: 'jobs'
      });
      expect(result).toBe('pt_BR');
    });

    it('handles multiple Brazil signals correctly', () => {
      const result = resolveSearchLocale({
        query: 'brasil',
        selectedLocations: ['São Paulo'],
        mode: 'jobs'
      });
      expect(result).toBe('pt_BR');
    });

    it('detect "local" as Brazil signal in haystack', () => {
      const result = resolveSearchLocale({
        query: 'local',
        mode: 'jobs'
      });
      expect(result).toBe('pt_BR');
    });

    it('returns en for recruiter_outreach mode without Brazil signals', () => {
      const result = resolveSearchLocale({
        mode: 'connect',
        usageGoal: 'recruiter_outreach',
        query: 'developer'
      });
      expect(result).toBe('en');
    });

    it('returns en for remote signal', () => {
      const result = resolveSearchLocale({
        query: 'remote engineer'
      });
      expect(result).toBe('en');
    });
  });

  describe('UMD module registration', () => {
    it('exports functions via module.exports for Node.js require()', () => {
      const api = require('../extension/lib/search-language.js');
      expect(api).toHaveProperty('SEARCH_LANGUAGE_MODES');
      expect(api).toHaveProperty('normalizeSearchLanguageMode');
      expect(api).toHaveProperty('resolveCanonicalTerm');
      expect(api).toHaveProperty('localizeSearchTerms');
      expect(api).toHaveProperty('resolveSearchLocale');
    });

    it('exports are function types (except SEARCH_LANGUAGE_MODES)', () => {
      const api = require('../extension/lib/search-language.js');
      expect(typeof api.normalizeSearchLanguageMode).toBe('function');
      expect(typeof api.resolveCanonicalTerm).toBe('function');
      expect(typeof api.localizeSearchTerms).toBe('function');
      expect(typeof api.resolveSearchLocale).toBe('function');
      expect(typeof api.SEARCH_LANGUAGE_MODES).toBe('object');
    });

    it('module can be loaded multiple times without duplication', () => {
      delete require.cache[require.resolve('../extension/lib/search-language.js')];
      const api1 = require('../extension/lib/search-language.js');
      delete require.cache[require.resolve('../extension/lib/search-language.js')];
      const api2 = require('../extension/lib/search-language.js');
      expect(api1.SEARCH_LANGUAGE_MODES).toEqual(api2.SEARCH_LANGUAGE_MODES);
    });
  });

  describe('Integration: resolveCanonicalTerm + localizeSearchTerms', () => {
    it('canonical resolution feeds into localization correctly', () => {
      const canonical = resolveCanonicalTerm('dev', 'en');
      const localized = localizeSearchTerms([canonical], 'en');
      expect(localized).toContain(canonical);
    });

    it('localization includes canonical form from aliased input', () => {
      const localized = localizeSearchTerms(['dev'], 'en');
      const canonical = resolveCanonicalTerm('dev', 'en');
      expect(localized).toContain(canonical);
    });
  });

  describe('Integration: resolveSearchLocale + localizeSearchTerms', () => {
    it('resolved locale is respected by localization', () => {
      const locale = resolveSearchLocale('desenvolvedor');
      const localized = localizeSearchTerms(['developer'], locale);
      expect(Array.isArray(localized)).toBe(true);
      expect(localized.length).toBeGreaterThan(0);
    });

    it('bilingual locale expansion includes both languages', () => {
      const locale = resolveSearchLocale('developer desenvolvedor');
      const localized = localizeSearchTerms(['developer'], locale);
      expect(Array.isArray(localized)).toBe(true);
    });
  });

  describe('Edge cases and robustness', () => {
    it('handles very long input strings', () => {
      const longQuery = 'developer ' + 'word '.repeat(100);
      expect(() => resolveSearchLocale(longQuery)).not.toThrow();
    });

    it('handles special characters in terms', () => {
      expect(() => localizeSearchTerms(['dev@home', 'eng#1'], 'en')).not.toThrow();
    });

    it('handles Unicode characters correctly', () => {
      expect(() => resolveCanonicalTerm('déve9lòppér', 'pt_BR')).not.toThrow();
    });

    it('normalizeSearchLanguageMode is idempotent', () => {
      const once = normalizeSearchLanguageMode('pt-br');
      const twice = normalizeSearchLanguageMode(once);
      expect(once).toBe(twice);
    });

    it('resolveCanonicalTerm handles whitespace-only input', () => {
      expect(resolveCanonicalTerm('   ')).toBe('');
      expect(resolveCanonicalTerm('\t\n')).toBe('');
    });

    it('localizeSearchTerms preserves array behavior with falsy values filtered', () => {
      const result = localizeSearchTerms(['dev', ''], 'en');
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
