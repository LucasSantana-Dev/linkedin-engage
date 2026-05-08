/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');
const {
    UI_LANGUAGE_MODES,
    normalizeUiLanguageMode,
    normalizeCatalogKey,
    resolveUiLocale,
    getMessage,
    loadLocaleMessages,
    applyTranslations
} = require('../extension/lib/i18n');

const LOCALES = ['en', 'pt_BR'];

function readLocaleCatalog(locale) {
    const filePath = path.join(
        __dirname,
        '..',
        'extension',
        '_locales',
        locale,
        'messages.json'
    );
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

describe('i18n', () => {
    it('exposes frozen language modes constant', () => {
        expect(UI_LANGUAGE_MODES).toEqual(['auto', 'en', 'pt_BR']);
        expect(Object.isFrozen(UI_LANGUAGE_MODES)).toBe(true);
    });

    it('normalizes ui language mode with auto fallback', () => {
        expect(normalizeUiLanguageMode('en')).toBe('en');
        expect(normalizeUiLanguageMode('pt_BR')).toBe('pt_BR');
        expect(normalizeUiLanguageMode('auto')).toBe('auto');
        expect(normalizeUiLanguageMode('invalid')).toBe('auto');
        expect(normalizeUiLanguageMode('')).toBe('auto');
        expect(normalizeUiLanguageMode(null)).toBe('auto');
        expect(normalizeUiLanguageMode(undefined)).toBe('auto');
        expect(normalizeUiLanguageMode(123)).toBe('auto');
    });

    it('resolves browser locale automatically', () => {
        expect(resolveUiLocale('auto', 'pt-BR')).toBe('pt_BR');
        expect(resolveUiLocale('auto', 'pt-PT')).toBe('pt_BR');
        expect(resolveUiLocale('auto', 'en-US')).toBe('en');
        expect(resolveUiLocale('auto', 'fr-FR')).toBe('en');
        expect(resolveUiLocale('auto', '')).toBe('en');
        expect(resolveUiLocale('auto', null)).toBe('en');
    });

    it('prefers explicit locale override over browser locale', () => {
        expect(resolveUiLocale('en', 'pt-BR')).toBe('en');
        expect(resolveUiLocale('pt_BR', 'en-US')).toBe('pt_BR');
    });

    it('falls back to english when a key is missing in the active locale', () => {
        const active = {
            known: { message: 'Olá' }
        };
        const fallback = {
            known: { message: 'Hello' },
            missing: { message: 'Fallback copy' }
        };

        expect(getMessage(active, fallback, 'known')).toBe('Olá');
        expect(getMessage(active, fallback, 'missing')).toBe('Fallback copy');
        expect(getMessage(active, fallback, 'unknown')).toBe('');
    });

    it('returns empty string for entries with non-string message', () => {
        const catalog = {
            bad_entry: { message: 123 },
            null_entry: { message: null },
            missing_msg: {}
        };

        expect(getMessage(catalog, {}, 'bad_entry')).toBe('');
        expect(getMessage(catalog, {}, 'null_entry')).toBe('');
        expect(getMessage(catalog, {}, 'missing_msg')).toBe('');
    });

    it('handles null/invalid catalogs gracefully', () => {
        expect(getMessage(null, null, 'anykey')).toBe('');
        expect(getMessage(undefined, undefined, 'anykey')).toBe('');
        expect(getMessage('notobj', {}, 'anykey')).toBe('');
    });

    it('normalizes logical dotted keys to Chrome-safe locale catalog keys', () => {
        expect(normalizeCatalogKey('common.mode')).toBe('common_mode');
        expect(normalizeCatalogKey('jobs.search-language')).toBe(
            'jobs_search_language'
        );
        expect(normalizeCatalogKey('a.b-c.d')).toBe('a_b_c_d');
        expect(normalizeCatalogKey(null)).toBe('');
        expect(normalizeCatalogKey(undefined)).toBe('');
        expect(normalizeCatalogKey('')).toBe('');
    });

    it('loads english and portuguese locale catalogs from disk', async () => {
        const en = await loadLocaleMessages('en');
        const pt = await loadLocaleMessages('pt_BR');

        expect(en.extensionName.message).toBe('LinkedIn Engage');
        expect(getMessage(en, {}, 'common.mode')).toBe('Mode');
        expect(getMessage(pt, {}, 'common.mode')).toBe('Modo');
        expect(getMessage(pt, {}, 'common.searchLanguage'))
            .toBe('Idioma da busca');
    });

    it('returns cached catalog on second load', async () => {
        const first = await loadLocaleMessages('en');
        const second = await loadLocaleMessages('en');
        expect(first).toBe(second);
    });

    it('includes critical popup and dashboard localization keys in both catalogs', async () => {
        const en = await loadLocaleMessages('en');
        const pt = await loadLocaleMessages('pt_BR');
        const requiredKeys = [
            'common.connect',
            'common.companies',
            'common.jobs',
            'popup.progress.page',
            'popup.progress.skipped',
            'options.card.avgPerDay',
            'options.card.bestHour',
            'options.card.bestDay',
            'options.card.topCategory'
        ];

        requiredKeys.forEach(key => {
            expect(getMessage(en, {}, key)).toBeTruthy();
            expect(getMessage(pt, {}, key)).toBeTruthy();
        });
    });

    it('stores only Chrome-safe keys in both locale catalogs', () => {
        LOCALES.forEach(locale => {
            const keys = Object.keys(readLocaleCatalog(locale));
            keys.forEach(key => {
                expect(key).toMatch(/^[A-Za-z0-9_]+$/);
            });
        });
    });

    it('resolves dotted logical keys against underscore locale keys', async () => {
        const pt = await loadLocaleMessages('pt_BR');

        expect(getMessage(pt, {}, 'common.mode')).toBe('Modo');
        expect(
            getMessage(pt, {}, 'popup.connect.selectedCount', [3])
        ).toBe('3 selecionados');
    });

    it('interpolates locale substitutions from catalog messages', () => {
        const active = {
            summary: { message: 'Rate limits: $1/$2 today' }
        };

        expect(
            getMessage(active, {}, 'summary', [4, 10])
        ).toBe('Rate limits: 4/10 today');
    });

    it('skips interpolation when substitutions is empty or not an array', () => {
        const catalog = {
            hello: { message: 'Hello $1' }
        };

        expect(getMessage(catalog, {}, 'hello', [])).toBe('Hello $1');
        expect(getMessage(catalog, {}, 'hello', null)).toBe('Hello $1');
        expect(getMessage(catalog, {}, 'hello')).toBe('Hello $1');
    });

    it('interpolates null/undefined substitution values as empty string', () => {
        const catalog = {
            greeting: { message: 'Hi $1 and $2' }
        };

        expect(
            getMessage(catalog, {}, 'greeting', [null, undefined])
        ).toBe('Hi  and ');
    });

    describe('applyTranslations', () => {
        beforeEach(() => {
            document.body.innerHTML = '';
        });

        it('translates data-i18n nodes with active catalog', () => {
            document.body.innerHTML = `
                <span data-i18n="greeting">old</span>
                <span data-i18n="farewell">old</span>
            `;

            const active = {
                greeting: { message: 'Hello' },
                farewell: { message: 'Bye' }
            };

            applyTranslations(document, active, {});

            const nodes = document.querySelectorAll('[data-i18n]');
            expect(nodes[0].textContent).toBe('Hello');
            expect(nodes[1].textContent).toBe('Bye');
        });

        it('translates data-i18n-placeholder attributes', () => {
            document.body.innerHTML = `
                <input data-i18n-placeholder="search_hint" placeholder="old">
            `;

            applyTranslations(document, {
                search_hint: { message: 'Search...' }
            }, {});

            const input = document.querySelector('input');
            expect(input.getAttribute('placeholder')).toBe('Search...');
        });

        it('translates data-i18n-title attributes', () => {
            document.body.innerHTML = `
                <button data-i18n-title="btn_title" title="old">Click</button>
            `;

            applyTranslations(document, {
                btn_title: { message: 'Start run' }
            }, {});

            const btn = document.querySelector('button');
            expect(btn.getAttribute('title')).toBe('Start run');
        });

        it('translates data-i18n-aria-label attributes', () => {
            document.body.innerHTML = `
                <button data-i18n-aria-label="close_btn" aria-label="old">X</button>
            `;

            applyTranslations(document, {
                close_btn: { message: 'Close dialog' }
            }, {});

            const btn = document.querySelector('button');
            expect(btn.getAttribute('aria-label')).toBe('Close dialog');
        });

        it('falls back to fallback catalog when active key is missing', () => {
            document.body.innerHTML = `
                <span data-i18n="only_in_en">old</span>
            `;

            applyTranslations(document, {}, {
                only_in_en: { message: 'Fallback text' }
            });

            const span = document.querySelector('span');
            expect(span.textContent).toBe('Fallback text');
        });

        it('preserves original content when key is missing from both catalogs', () => {
            document.body.innerHTML = `
                <span data-i18n="missing_key">original</span>
            `;

            applyTranslations(document, {}, {});

            const span = document.querySelector('span');
            expect(span.textContent).toBe('original');
        });

        it('scopes to provided root node', () => {
            document.body.innerHTML = `
                <div id="inner">
                    <span data-i18n="hello">old</span>
                </div>
                <span data-i18n="hello">outer</span>
            `;

            const inner = document.getElementById('inner');
            applyTranslations(inner, {
                hello: { message: 'Inner hello' }
            }, {});

            expect(inner.querySelector('span').textContent).toBe('Inner hello');
            expect(document.body.querySelector(':scope > span').textContent)
                .toBe('outer');
        });

        it('falls back to document when rootNode is null', () => {
            document.body.innerHTML = `
                <span data-i18n="test_key">old</span>
            `;

            applyTranslations(null, {
                test_key: { message: 'Updated' }
            }, {});

            expect(document.querySelector('span').textContent).toBe('Updated');
        });
    });
});
