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
    });
});
