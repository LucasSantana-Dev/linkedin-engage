/**
 * @jest-environment jsdom
 */
const { detectNoSearchResults } = require('../extension/lib/search-no-results');

describe('detectNoSearchResults — shared module', () => {
    afterEach(() => { document.body.innerHTML = ''; });

    it('returns true immediately when resultsCountHint is 0', () => {
        expect(detectNoSearchResults(document, { resultsCountHint: 0 })).toBe(true);
    });

    it('returns false when resultsCountHint is non-zero (no DOM signal)', () => {
        expect(detectNoSearchResults(document, { resultsCountHint: 42 })).toBe(false);
    });

    it('detects EN "No results found" in artdeco-empty-state', () => {
        document.body.innerHTML =
            '<div class="artdeco-empty-state"><h2>No results found</h2></div>';
        expect(detectNoSearchResults(document)).toBe(true);
    });

    it('detects PT-BR "Nenhum resultado encontrado" in main', () => {
        document.body.innerHTML = '<main>Nenhum resultado encontrado</main>';
        expect(detectNoSearchResults(document)).toBe(true);
    });

    it('detects "0 results" via company-only selector .search-results-container__no-results-message', () => {
        document.body.innerHTML =
            '<div class="search-results-container__no-results-message">0 results</div>';
        expect(detectNoSearchResults(document)).toBe(true);
    });

    it('detects no-results via .search-reusables__no-results (Connect-only selector)', () => {
        document.body.innerHTML =
            '<div class="search-reusables__no-results">No results found</div>';
        expect(detectNoSearchResults(document)).toBe(true);
    });

    it('detects zero count via h2 span count selector', () => {
        document.body.innerHTML =
            '<header><h2><span>0 results</span></h2></header>';
        expect(detectNoSearchResults(document)).toBe(true);
    });

    it('does not fire when count selector shows non-zero results', () => {
        document.body.innerHTML =
            '<header><div class="search-results__total">About 132 results</div></header>';
        expect(detectNoSearchResults(document)).toBe(false);
    });

    it('does not misfire on unrelated "0 X" phrases', () => {
        document.body.innerHTML =
            '<header><div class="search-results__total">0 endorsements</div></header>';
        expect(detectNoSearchResults(document)).toBe(false);
    });

    it('detects no-results via resultsCountText param', () => {
        expect(
            detectNoSearchResults(document, { resultsCountText: 'No results found' })
        ).toBe(true);
    });

    it('detects PT-BR no-results via resultsCountText param', () => {
        expect(
            detectNoSearchResults(document, { resultsCountText: '0 resultados' })
        ).toBe(true);
    });

    it('detects no-results via body text fallback', () => {
        document.body.textContent = 'No results found for your search criteria.';
        expect(detectNoSearchResults(document)).toBe(true);
    });

    it('returns false when results are present', () => {
        document.body.innerHTML =
            '<main><div class="entity-result">Jane Doe</div></main>';
        expect(detectNoSearchResults(document)).toBe(false);
    });

    it('returns false when root is null and document has no signal', () => {
        expect(detectNoSearchResults(null)).toBe(false);
    });

    it('defaults to document when no root is given', () => {
        document.body.innerHTML =
            '<div class="artdeco-empty-state">No results found</div>';
        expect(detectNoSearchResults()).toBe(true);
    });
});
