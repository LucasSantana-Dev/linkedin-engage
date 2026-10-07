(function(root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
    root.LinkedInInviteWithdraw = api;
    Object.keys(api).forEach(k => { if (typeof root[k] === 'undefined') root[k] = api[k]; });
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
    // Pure logic for the "Withdraw stale invites" mode. Every DOM helper takes
    // its root/card as a parameter: no global `document` is read in here.

    const SENT_INVITES_URL =
        'https://www.linkedin.com/mynetwork/invitation-manager/sent/';
    const DEFAULT_MIN_WEEKS = 3;
    const MAX_MIN_WEEKS = 520;
    const DEFAULT_RUN_LIMIT = 20;
    const MAX_RUN_LIMIT = 20;
    const MAX_CONSECUTIVE_FAILURES = 3;

    const UNIT_DAYS = Object.freeze({
        minute: 0,
        hour: 0,
        day: 1,
        week: 7,
        month: 30,
        year: 365
    });

    function normalizeText(text) {
        return String(text || '')
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }

    function unitFromWord(word) {
        const w = String(word || '');
        if (/^(minute|minuto)s?$/.test(w)) return 'minute';
        if (/^(hour|hora)s?$/.test(w)) return 'hour';
        if (/^(day|dia)s?$/.test(w)) return 'day';
        if (/^(week|semana)s?$/.test(w)) return 'week';
        if (/^(month|months|mes|meses)$/.test(w)) return 'month';
        if (/^(year|ano)s?$/.test(w)) return 'year';
        return null;
    }

    // "Sent 3 months ago" / "Enviado há 3 meses" -> approximate age in days.
    // Returns null for anything that is not a recognised sent-age phrase, so
    // callers never act on an unparseable age.
    function parseSentAgeDays(text) {
        const t = normalizeText(text);
        if (!t) return null;
        if (/^(sent )?(today|just now)$/.test(t) ||
            /^enviad[oa] (hoje|agora)$/.test(t)) {
            return 0;
        }
        if (/^(sent )?yesterday$/.test(t) || /^enviad[oa] ontem$/.test(t)) {
            return 1;
        }
        const en = t.match(/^sent (\d{1,4}) ([a-z]+) ago$/);
        const pt = t.match(/^enviad[oa] ha (\d{1,4}) ([a-z]+)$/);
        const m = en || pt;
        if (!m) return null;
        const unit = unitFromWord(m[2]);
        if (!unit) return null;
        return Number(m[1]) * UNIT_DAYS[unit];
    }

    function normalizeMinWeeks(value) {
        const n = Math.floor(Number(value));
        if (!Number.isFinite(n) || n < 1) return DEFAULT_MIN_WEEKS;
        return Math.min(n, MAX_MIN_WEEKS);
    }

    function normalizeRunLimit(value) {
        const n = Math.floor(Number(value));
        if (!Number.isFinite(n) || n < 1) return DEFAULT_RUN_LIMIT;
        return Math.min(n, MAX_RUN_LIMIT);
    }

    function isWithdrawEligible(days, minWeeks) {
        if (typeof days !== 'number' || !Number.isFinite(days) || days < 0) {
            return false;
        }
        return days >= normalizeMinWeeks(minWeeks) * 7;
    }

    function isWithdrawLabel(text) {
        return /^(withdraw|retirar)$/i.test(String(text || '').trim());
    }

    function isWithdrawAriaLabel(label) {
        return /^(withdraw invitation|retirar convite)/i
            .test(String(label || '').trim());
    }

    const CONTROL_SELECTOR = 'a, button, [role="button"]';

    function findWithdrawLink(card) {
        if (!card || typeof card.querySelectorAll !== 'function') return null;
        const controls = Array.from(card.querySelectorAll(CONTROL_SELECTOR));
        return controls.find(el =>
            isWithdrawAriaLabel(el.getAttribute('aria-label'))
        ) || controls.find(el => isWithdrawLabel(el.textContent)) || null;
    }

    // The age lives in a leaf element ("Sent 3 weeks ago"). Returns the first
    // leaf text that parses, else ''.
    function findAgeText(card) {
        if (!card || typeof card.querySelectorAll !== 'function') return '';
        const leaves = Array.from(card.querySelectorAll('span, p, time'))
            .filter(el => el.children.length === 0);
        for (const el of leaves) {
            const text = (el.textContent || '').trim();
            if (parseSentAgeDays(text) !== null) return text;
        }
        return '';
    }

    function extractInviteName(card, withdrawLink) {
        const label = withdrawLink
            ? String(withdrawLink.getAttribute('aria-label') || '')
            : '';
        const m = label.match(
            /^(?:withdraw invitation sent to|retirar convite enviado (?:para|a))\s+(.+)$/i
        );
        if (m && m[1].trim()) return m[1].trim();
        const p = card && card.querySelector ? card.querySelector('p') : null;
        return p ? (p.textContent || '').trim() : '';
    }

    function extractProfileUrl(card) {
        const a = card && card.querySelector
            ? card.querySelector('a[href*="/in/"]')
            : null;
        return a ? a.href || a.getAttribute('href') || '' : '';
    }

    function extractInviteKey(info) {
        return info.profileUrl || info.name || '';
    }

    function describeCard(card) {
        const withdrawLink = findWithdrawLink(card);
        if (!withdrawLink) return null;
        const ageText = findAgeText(card);
        const info = {
            card,
            withdrawLink,
            ageText,
            ageDays: ageText ? parseSentAgeDays(ageText) : null,
            name: extractInviteName(card, withdrawLink),
            profileUrl: extractProfileUrl(card)
        };
        info.key = extractInviteKey(info);
        return info;
    }

    // Cards of the Sent invitations list that carry a withdraw control.
    function findSentInviteCards(root) {
        if (!root || typeof root.querySelectorAll !== 'function') return [];
        const list = root.querySelector('[data-testid="lazy-column"]');
        const scope = list || root;
        return Array.from(scope.querySelectorAll('[role="listitem"]'))
            .map(describeCard)
            .filter(Boolean);
    }

    function findInviteByKey(root, key) {
        if (!key) return null;
        return findSentInviteCards(root).find(c => c.key === key) || null;
    }

    // Oldest first, only invites old enough, capped at `max`. Unparseable ages
    // are never eligible.
    function selectWithdrawBatch(invites, options) {
        const minWeeks = normalizeMinWeeks(options && options.minWeeks);
        const max = Math.max(0, Math.floor(Number(options && options.max)) || 0);
        const eligible = (invites || [])
            .filter(i => isWithdrawEligible(i.ageDays, minWeeks));
        const sorted = eligible
            .map((invite, index) => ({ invite, index }))
            .sort((a, b) =>
                (b.invite.ageDays - a.invite.ageDays) || (a.index - b.index)
            )
            .map(x => x.invite);
        const skippedUnknownAge = (invites || [])
            .filter(i => i.ageDays === null).length;
        return {
            batch: sorted.slice(0, max),
            eligibleCount: eligible.length,
            skippedUnknownAge,
            skippedTooRecent: (invites || []).length - eligible.length -
                skippedUnknownAge
        };
    }

    function isDescendantOrSame(a, b) {
        return !!a && !!b && (a === b || a.contains(b) || b.contains(a));
    }

    // A per-card withdraw control is never a confirmation: it sits in a list
    // item that lives inside the dialog (a list item that merely wraps the
    // dialog does not count). Decided by structure only: LinkedIn's real
    // confirm button carries the same per-card aria-label as the card link.
    function isCardWithdrawControl(el, dialog) {
        if (typeof el.closest !== 'function') return false;
        const item = el.closest('[role="listitem"]');
        return !!item && (!dialog || dialog.contains(item));
    }

    const DIALOG_SELECTOR =
        '[role="dialog"], [role="alertdialog"], dialog, [aria-modal="true"]';

    // Candidate confirmation containers: ARIA dialogs and native <dialog>
    // elements (which carry no role). Closed native dialogs and hidden
    // elements are skipped.
    function findDialogCandidates(root) {
        return Array.from(new Set(root.querySelectorAll(DIALOG_SELECTOR)))
            .filter(el => {
                if (el.tagName === 'DIALOG' && !el.hasAttribute('open')) {
                    return false;
                }
                return !el.hasAttribute('hidden') &&
                    el.getAttribute('aria-hidden') !== 'true';
            });
    }

    // Confirmation button in a modal dialog, never the original card control.
    function findWithdrawConfirm(root, originalLink) {
        if (!root || typeof root.querySelectorAll !== 'function') return null;
        for (const dialog of findDialogCandidates(root)) {
            const candidates = Array.from(
                dialog.querySelectorAll(CONTROL_SELECTOR)
            );
            const hit = candidates.find(el =>
                isWithdrawLabel(el.textContent) &&
                !isDescendantOrSame(el, originalLink) &&
                !isCardWithdrawControl(el, dialog)
            );
            if (hit) return hit;
        }
        return null;
    }

    // Cancel / close control of an open dialog, used to clean up after a
    // failed attempt.
    function findDialogDismiss(root) {
        if (!root || typeof root.querySelectorAll !== 'function') return null;
        for (const dialog of findDialogCandidates(root)) {
            const candidates = Array.from(
                dialog.querySelectorAll(CONTROL_SELECTOR)
            );
            const hit = candidates.find(el =>
                /^(cancel|dismiss|close|not now|cancelar|fechar|agora nao)$/
                    .test(normalizeText(el.textContent))
            ) || candidates.find(el =>
                /^(dismiss|close|fechar)/
                    .test(normalizeText(el.getAttribute('aria-label')))
            );
            if (hit) return hit;
        }
        return null;
    }

    // Success signal: the card (or its withdraw control) is gone from the DOM.
    function isWithdrawComplete(card, withdrawLink) {
        if (!card || !withdrawLink) return true;
        if (!card.isConnected || !withdrawLink.isConnected) return true;
        return !card.contains(withdrawLink);
    }

    function detectChallengeSignal(url, bodyText) {
        if (/checkpoint|authwall|challenge/i.test(String(url || ''))) {
            return true;
        }
        return /security verification|unusual activity|captcha|verificacao de seguranca/i
            .test(normalizeText(String(bodyText || '').substring(0, 3000)));
    }

    function isLoginUrl(url) {
        return /\/(login|uas\/login)|authwall/i.test(String(url || ''));
    }

    function shouldAbortOnFailures(consecutiveFailures) {
        return Number(consecutiveFailures) >= MAX_CONSECUTIVE_FAILURES;
    }

    // Number of invites this run may withdraw: user limit, hard per-run cap and
    // whatever is left of the hourly/daily budget.
    function computeRunBudget(limit, rateRemaining) {
        const remaining = Number(rateRemaining);
        const cap = normalizeRunLimit(limit);
        if (!Number.isFinite(remaining)) return cap;
        return Math.max(0, Math.min(cap, Math.floor(remaining)));
    }

    const MESSAGES = Object.freeze({
        en: {
            running: 'LinkedIn Engage: withdrawing stale invites...',
            stop: 'Stop',
            done: 'Withdrew $1 stale invitation(s).',
            doneDetail: 'Withdrew $1 stale invitation(s). Kept $2 recent and $3 with unknown age.',
            none: 'No pending invitation older than $1 week(s) was found.',
            canceled: 'Run canceled by user.',
            failures: 'Could not confirm the withdrawal after $1 attempts. Stopped.',
            challenge: 'LinkedIn security challenge detected. Stopped.',
            failedPrefix: 'Withdraw stale invites failed: '
        },
        pt_BR: {
            running: 'LinkedIn Engage: retirando convites antigos...',
            stop: 'Parar',
            done: '$1 convite(s) antigo(s) retirado(s).',
            doneDetail: '$1 convite(s) antigo(s) retirado(s). $2 recente(s) mantido(s) e $3 com data desconhecida.',
            none: 'Nenhum convite pendente com mais de $1 semana(s) foi encontrado.',
            canceled: 'Execução cancelada pelo usuário.',
            failures: 'Não foi possível confirmar a retirada após $1 tentativas. Execução interrompida.',
            challenge: 'Desafio de segurança do LinkedIn detectado. Execução interrompida.',
            failedPrefix: 'Falha ao retirar convites antigos: '
        }
    });

    function resolveWithdrawLocale(pageLang, browserLang) {
        const raw = String(pageLang || browserLang || '').toLowerCase();
        return raw.startsWith('pt') ? 'pt_BR' : 'en';
    }

    function withdrawText(key, locale, subs) {
        const catalog = MESSAGES[locale] || MESSAGES.en;
        const template = catalog[key] || MESSAGES.en[key] || '';
        return template.replace(/\$(\d)/g, (_, n) => {
            const v = Array.isArray(subs) ? subs[Number(n) - 1] : undefined;
            return v === undefined ? '' : String(v);
        });
    }

    return Object.freeze({
        SENT_INVITES_URL,
        DEFAULT_MIN_WEEKS,
        DEFAULT_RUN_LIMIT,
        MAX_RUN_LIMIT,
        MAX_CONSECUTIVE_FAILURES,
        parseSentAgeDays,
        normalizeMinWeeks,
        normalizeRunLimit,
        isWithdrawEligible,
        isWithdrawLabel,
        findWithdrawLink,
        findAgeText,
        extractInviteName,
        extractProfileUrl,
        findSentInviteCards,
        findInviteByKey,
        selectWithdrawBatch,
        findWithdrawConfirm,
        findDialogDismiss,
        isWithdrawComplete,
        detectChallengeSignal,
        isLoginUrl,
        shouldAbortOnFailures,
        computeRunBudget,
        resolveWithdrawLocale,
        withdrawText
    });
});
