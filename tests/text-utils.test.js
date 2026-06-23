// Direct module access (covers Node path)
const { stripAccents, normalizeToSearch } = require('../extension/lib/text-utils.js');

describe('text-utils', () => {
    describe('stripAccents', () => {
        it('should strip accents from Latin characters', () => {
            expect(stripAccents('café')).toBe('cafe');
            expect(stripAccents('João')).toBe('Joao');
            expect(stripAccents('café au lait')).toBe('cafe au lait');
        });

        it('should handle multiple accents', () => {
            expect(stripAccents('àáâãäå')).toBe('aaaaaa');
            expect(stripAccents('èéêë')).toBe('eeee');
        });

        it('should preserve non-accented characters', () => {
            expect(stripAccents('hello')).toBe('hello');
            expect(stripAccents('123')).toBe('123');
        });

        it('should handle null and undefined', () => {
            expect(stripAccents(null)).toBe('');
            expect(stripAccents(undefined)).toBe('');
        });

        it('should coerce non-string input to string', () => {
            expect(stripAccents(0)).toBe('0');
            expect(stripAccents(123)).toBe('123');
            expect(stripAccents(false)).toBe('false');
        });

        it('should handle empty strings', () => {
            expect(stripAccents('')).toBe('');
        });

        it('should handle Portuguese characters', () => {
            expect(stripAccents('São Paulo')).toBe('Sao Paulo');
            expect(stripAccents('açúcar')).toBe('acucar');
        });

        it('should handle Spanish characters', () => {
            expect(stripAccents('niño')).toBe('nino');
            expect(stripAccents('España')).toBe('Espana');
        });
    });

    describe('normalizeToSearch', () => {
        it('should normalize text for searching', () => {
            expect(normalizeToSearch('  Héllo  ')).toBe('hello');
            expect(normalizeToSearch('CAFÉ')).toBe('cafe');
        });

        it('should handle null and undefined', () => {
            expect(normalizeToSearch(null)).toBe('');
            expect(normalizeToSearch(undefined)).toBe('');
        });

        it('should coerce non-string input to string', () => {
            expect(normalizeToSearch(0)).toBe('0');
            expect(normalizeToSearch(123)).toBe('123');
        });

        it('should handle whitespace', () => {
            expect(normalizeToSearch('  \t\n  ')).toBe('');
            expect(normalizeToSearch('  hello  world  ')).toBe('hello  world');
        });

        it('should combine NFD + accent-strip + lowercase + trim', () => {
            expect(normalizeToSearch('  João Silva  ')).toBe('joao silva');
            expect(normalizeToSearch('ESPAÑA')).toBe('espana');
        });

        it('should handle mixed content', () => {
            expect(normalizeToSearch('  Café & Restaurante  ')).toBe('cafe & restaurante');
        });

        it('should handle arrays coerced to string', () => {
            expect(normalizeToSearch([])).toBe('');
            expect(normalizeToSearch(['test'])).toBe('test');
        });

        it('should handle objects coerced to string', () => {
            const obj = { toString: () => 'Café' };
            expect(normalizeToSearch(obj)).toBe('cafe');
        });
    });

    describe('module export pattern (UMD coverage)', () => {
        it('should export as CommonJS module', () => {
            const mod = require('../extension/lib/text-utils.js');
            expect(typeof mod.stripAccents).toBe('function');
            expect(typeof mod.normalizeToSearch).toBe('function');
        });

        it('should export functions as frozen object', () => {
            const mod = require('../extension/lib/text-utils.js');
            expect(Object.isFrozen(mod)).toBe(true);
        });

        it('should have both functions available', () => {
            expect(typeof stripAccents).toBe('function');
            expect(typeof normalizeToSearch).toBe('function');
        });

        it('should not be shadowed by module functions in global scope', () => {
            // Verify the functions at module level match what we imported
            expect(stripAccents('Café')).toBe('Cafe');
            expect(normalizeToSearch('  JOSÉ  ')).toBe('jose');
        });
    });

    describe('edge case coverage', () => {
        it('should handle very long strings with accents', () => {
            const longStr = 'à'.repeat(1000);
            const result = stripAccents(longStr);
            expect(result).toBe('a'.repeat(1000));
        });

        it('should handle mixed ASCII and accented characters', () => {
            expect(stripAccents('Hello café mundo')).toBe('Hello cafe mundo');
            expect(normalizeToSearch('Hello CAFÉ mundo')).toBe('hello cafe mundo');
        });

        it('stripAccents should not lowercase', () => {
            expect(stripAccents('CAFÉ')).toBe('CAFE');
            expect(stripAccents('José')).toBe('Jose');
        });

        it('should handle consecutive spaces with trim', () => {
            expect(normalizeToSearch('  test   multiple   spaces  ')).toBe('test   multiple   spaces');
        });
    });
});
