(function(root, factory) {
    const api = factory();
    /* istanbul ignore next */
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.LinkedInI18n = api;
    Object.keys(api).forEach(function(key) {
        if (typeof root[key] === 'undefined') {
            root[key] = api[key];
        }
    });
})(
    /* istanbul ignore next */
    typeof globalThis !== 'undefined' ? globalThis : this,
    function() {
        const fs = typeof require === 'function'
            ? require('fs')
            : null;
        const path = typeof require === 'function'
            ? require('path')
            : null;

        const UI_LANGUAGE_MODES = Object.freeze([
            'auto',
            'en',
            'pt_BR'
        ]);

        const catalogCache = Object.create(null);

        function normalizeUiLanguageMode(value) {
            const mode = String(value || '').trim();
            if (UI_LANGUAGE_MODES.includes(mode)) {
                return mode;
            }
            return 'auto';
        }

        function resolveUiLocale(mode, browserLocale) {
            const normalized = normalizeUiLanguageMode(mode);
            if (normalized !== 'auto') {
                return normalized;
            }
            const locale = String(browserLocale || '').toLowerCase();
            return locale.startsWith('pt') ? 'pt_BR' : 'en';
        }

        function getLocaleFilePath(locale) {
            return `_locales/${locale}/messages.json`;
        }

        function normalizeCatalog(raw) {
            return raw && typeof raw === 'object' ? raw : {};
        }

        function normalizeCatalogKey(key) {
            return String(key || '').replace(/[.-]/g, '_');
        }

        function interpolateMessage(template, substitutions) {
            if (!Array.isArray(substitutions) || substitutions.length === 0) {
                return template;
            }
            return substitutions.reduce(function(result, value, index) {
                const token = new RegExp(`\\$${index + 1}`, 'g');
                return result.replace(token, String(value ?? ''));
            }, template);
        }

        function getMessage(catalog, fallbackCatalog, key, substitutions) {
            const catalogKey = normalizeCatalogKey(key);
            const active = normalizeCatalog(catalog)[catalogKey];
            const fallback = normalizeCatalog(fallbackCatalog)[catalogKey];
            const entry = active || fallback;
            if (!entry || typeof entry.message !== 'string') {
                return '';
            }
            return interpolateMessage(entry.message, substitutions);
        }

        async function loadLocaleMessages(locale) {
            const normalizedLocale = resolveUiLocale(locale, locale);
            if (catalogCache[normalizedLocale]) {
                return catalogCache[normalizedLocale];
            }

            const filePath = getLocaleFilePath(normalizedLocale);
            /* istanbul ignore else */
            if (fs && path && typeof __dirname === 'string') {
                const absolutePath = path.resolve(
                    __dirname,
                    '..',
                    filePath
                );
                const text = fs.readFileSync(absolutePath, 'utf8');
                const parsed = JSON.parse(text);
                catalogCache[normalizedLocale] = parsed;
                return parsed;
            }

            const url = typeof chrome !== 'undefined' &&
                chrome.runtime &&
                typeof chrome.runtime.getURL === 'function'
                ? chrome.runtime.getURL(filePath)
                : filePath;
            const response = await fetch(url);
            const parsed = await response.json();
            catalogCache[normalizedLocale] = parsed;
            return parsed;
        }

        function setTranslatedText(node, value) {
            if (!node) return;
            node.textContent = value;
        }

        function applyTranslations(rootNode, activeCatalog, fallbackCatalog) {
            const root = rootNode || document;
            root.querySelectorAll('[data-i18n]').forEach(function(node) {
                const text = getMessage(
                    activeCatalog,
                    fallbackCatalog,
                    node.dataset.i18n
                );
                if (text) setTranslatedText(node, text);
            });
            root.querySelectorAll('[data-i18n-placeholder]')
                .forEach(function(node) {
                    const text = getMessage(
                        activeCatalog,
                        fallbackCatalog,
                        node.dataset.i18nPlaceholder
                    );
                    if (text) node.setAttribute('placeholder', text);
                });
            root.querySelectorAll('[data-i18n-title]').forEach(function(node) {
                const text = getMessage(
                    activeCatalog,
                    fallbackCatalog,
                    node.dataset.i18nTitle
                );
                if (text) node.setAttribute('title', text);
            });
            root.querySelectorAll('[data-i18n-aria-label]')
                .forEach(function(node) {
                    const text = getMessage(
                        activeCatalog,
                        fallbackCatalog,
                        node.dataset.i18nAriaLabel
                    );
                    if (text) node.setAttribute('aria-label', text);
                });
        }

        return {
            UI_LANGUAGE_MODES,
            normalizeUiLanguageMode,
            normalizeCatalogKey,
            resolveUiLocale,
            loadLocaleMessages,
            getMessage,
            applyTranslations
        };
    }
);
