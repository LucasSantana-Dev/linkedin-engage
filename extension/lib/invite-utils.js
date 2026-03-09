// Extracted from content.js for testability.
// content.js uses these inline (no module imports in MAIN world).
// Keep logic in sync — this is the source of truth for tests.

function isButtonClickable(el) {
    if (el.disabled || el.hasAttribute('disabled')) {
        return false;
    }
    if (el.classList.contains('artdeco-button--muted')) {
        return false;
    }
    return true;
}

function isConnectButtonText(text) {
    const t = text.trim();
    return t === 'Connect' || t === 'Conectar';
}

function shouldExcludeButton(text) {
    const lower = text.toLowerCase();
    return lower.includes('message') ||
        lower.includes('following') ||
        lower.includes('withdraw') ||
        lower.includes('pending') ||
        lower.includes('pendente');
}

function isPendingState(button) {
    const text = (button.innerText || '').trim()
        .toLowerCase();
    const ariaLabel = (
        button.getAttribute('aria-label') || ''
    ).toLowerCase();
    if (text.includes('pending') ||
        ariaLabel.includes('pending') ||
        text.includes('pendente')) {
        return true;
    }
    return false;
}

function isPendingInCard(card) {
    if (!card) return false;
    const btns = card.querySelectorAll('button');
    for (const b of btns) {
        const t = (b.innerText || '').trim().toLowerCase();
        if (t.includes('pending') ||
            t.includes('pendente')) {
            return true;
        }
    }
    return false;
}

function isInviteUrl(url) {
    return url.includes('MemberRelationships') &&
        url.includes('verifyQuotaAndCreate');
}

function detectChallengeFromUrl(url) {
    const lower = url.toLowerCase();
    return lower.includes('/checkpoint/') ||
        lower.includes('/authwall') ||
        lower.includes('/challenge/');
}

function detectChallengeFromText(text) {
    const lower = text.toLowerCase();
    return lower.includes('security verification') ||
        lower.includes('verificação de segurança') ||
        lower.includes("let's do a quick") ||
        lower.includes('unusual activity');
}

function isEmailRequiredContent(modal) {
    if (!modal) return false;
    const inputs = modal.querySelectorAll(
        'input[type="text"], input[type="email"], input'
    );
    for (const input of inputs) {
        const label = (
            input.getAttribute('aria-label') ||
            input.getAttribute('placeholder') || ''
        ).toLowerCase();
        if (label.includes('email') ||
            label.includes('e-mail')) {
            return true;
        }
    }
    const text = (modal.innerText || '').toLowerCase();
    return text.includes('enter their email') ||
        text.includes('digite o e-mail');
}

function extractFirstName(fullName) {
    if (!fullName) return 'there';
    const first = fullName.trim().split(/\s+/)[0];
    return first || 'there';
}

function isFollowButtonText(text) {
    const t = text.trim();
    return t === 'Follow' || t === 'Seguir';
}

function isFollowingButtonText(text) {
    const t = text.trim();
    return t === 'Following' || t === 'Seguindo';
}

function extractNameFromAria(ariaLabel) {
    const m = (ariaLabel || '').match(/Invite\s+(\S+)/i);
    return m ? m[1] : null;
}

function normalizeLocaleText(text) {
    return (text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function isBrazilianProfile(profile) {
    const location = normalizeLocaleText(
        profile?.location || ''
    );
    const headline = normalizeLocaleText(
        profile?.headline || ''
    );
    const summary = normalizeLocaleText(
        profile?.summary || ''
    );
    const all = [location, headline, summary]
        .join(' ');
    const brazilRe =
        /brazil|brasil|sao paulo|rio de janeiro|belo horizonte|curitiba|porto alegre|recife|salvador|fortaleza|brasilia/;
    if (brazilRe.test(all)) return true;

    const ptMarkers = [
        'engenheiro', 'desenvolvedor', 'produto',
        'dados', 'atuando', 'tecnologia', 'gestao',
        'solucoes', 'experiencia', 'times'
    ];
    let ptHits = 0;
    for (const marker of ptMarkers) {
        if (all.includes(marker)) ptHits++;
    }
    return ptHits >= 2;
}

function isBrazilGeoTarget(geoUrn) {
    if (!geoUrn) return false;
    let decoded = String(geoUrn);
    try {
        decoded = decodeURIComponent(decoded);
    } catch (e) {}
    return decoded.includes('106057199') ||
        /"brazil"|"brasil"/i.test(decoded);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isButtonClickable,
        isConnectButtonText,
        shouldExcludeButton,
        isPendingState,
        isPendingInCard,
        isInviteUrl,
        detectChallengeFromUrl,
        detectChallengeFromText,
        isEmailRequiredContent,
        extractFirstName,
        extractNameFromAria,
        isFollowButtonText,
        isFollowingButtonText,
        isBrazilianProfile,
        isBrazilGeoTarget
    };
}
