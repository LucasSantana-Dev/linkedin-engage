(function(root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.LinkedInConnectActionUtils = api;
    Object.keys(api).forEach(function(key) {
        if (typeof root[key] === 'undefined') {
            root[key] = api[key];
        }
    });
})(
    typeof globalThis !== 'undefined' ? globalThis : this,
    function() {
        function normalizeActionText(value) {
            return String(value || '')
                .toLowerCase()
                .replace(/\s+/g, ' ')
                .trim();
        }

        function isImplicitConnectMenuAction(value) {
            const text = normalizeActionText(value);
            if (!text) return false;
            return /(^|\s)(connect|conectar)(\s|$)/.test(text) ||
                /invite\s+to\s+connect/.test(text) ||
                /convidar\s+para\s+conectar/.test(text);
        }

        function isFollowActionText(value) {
            const text = normalizeActionText(value).replace(/^\+\s*/, '');
            if (!text) return false;
            if (/^(following|seguindo)\b/.test(text)) return false;
            return /^(follow|seguir)\b/.test(text);
        }

        function isPotentialMoreActionsButton(el) {
            if (!el) return false;
            const tag = String(el.tagName || '').toLowerCase();
            if (tag !== 'button' && tag !== 'a') return false;

            const text = normalizeActionText(
                el.innerText || el.textContent || ''
            );
            const aria = normalizeActionText(
                el.getAttribute ? el.getAttribute('aria-label') : ''
            );
            const title = normalizeActionText(
                el.getAttribute ? el.getAttribute('title') : ''
            );
            const className = normalizeActionText(
                el.className || ''
            );
            const aggregate = `${text} ${aria} ${title} ${className}`;

            return /\bmore\b/.test(aggregate) ||
                /\bmais\b/.test(aggregate) ||
                /\bactions?\b/.test(aggregate) ||
                /\ba[cç][aã]o/.test(aggregate) ||
                /artdeco-dropdown__trigger/.test(className) ||
                /\boverflow\b/.test(className);
        }

        function findConnectActionInMenuItems(items) {
            for (const item of items || []) {
                const text = item?.innerText || item?.textContent || '';
                const aria = item?.getAttribute
                    ? item.getAttribute('aria-label')
                    : '';
                if (isImplicitConnectMenuAction(text) ||
                    isImplicitConnectMenuAction(aria)) {
                    return item;
                }
            }
            return null;
        }

        function findFollowButtonInCard(card) {
            if (!card?.querySelectorAll) return null;
            const buttons = card.querySelectorAll('button');
            for (const button of buttons) {
                if (button.disabled) continue;
                const text = button.innerText || button.textContent || '';
                const aria = button.getAttribute('aria-label') || '';
                if (isFollowActionText(text) || isFollowActionText(aria)) {
                    return button;
                }
            }
            return null;
        }

        function cardHasExplicitConnect(card) {
            if (!card?.querySelectorAll) return false;
            const actionable = card.querySelectorAll('button, a');
            for (const element of actionable) {
                if (element.disabled ||
                    element.getAttribute('aria-disabled') === 'true') {
                    continue;
                }
                const text = normalizeActionText(
                    element.innerText || element.textContent || ''
                );
                const aria = normalizeActionText(
                    element.getAttribute
                        ? element.getAttribute('aria-label') : ''
                );
                if (/^(connect|conectar)$/.test(text)) return true;
                if (/^\s*connect\s+/.test(text) &&
                    text.length < 40) return true;
                if (/\binvite\b.*\bto\s+connect\b/.test(aria) &&
                    aria.length < 80) {
                    return true;
                }
                if (/\bconvidar\b.*\bpara\s+conectar\b/.test(aria) &&
                    aria.length < 80) {
                    return true;
                }
            }
            return false;
        }

        function findMoreActionsButtonInCard(card) {
            if (!card?.querySelectorAll) return null;
            const elements = card.querySelectorAll('button, a');
            for (const element of elements) {
                if (element.disabled ||
                    element.getAttribute('aria-disabled') === 'true') {
                    continue;
                }
                if (isPotentialMoreActionsButton(element)) {
                    return element;
                }
            }
            return null;
        }

        return {
            isImplicitConnectMenuAction,
            isFollowActionText,
            isPotentialMoreActionsButton,
            findConnectActionInMenuItems,
            findFollowButtonInCard,
            cardHasExplicitConnect,
            findMoreActionsButtonInCard
        };
    }
);
