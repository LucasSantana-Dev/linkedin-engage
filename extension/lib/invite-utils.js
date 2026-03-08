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

function extractNameFromAria(ariaLabel) {
    const m = (ariaLabel || '').match(/Invite\s+(\S+)/i);
    return m ? m[1] : null;
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
        isFollowButtonText
    };
}
