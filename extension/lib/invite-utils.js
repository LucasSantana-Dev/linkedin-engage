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

function isAlreadyConnectedCardText(text) {
    const lower = (text || '').toLowerCase();
    return /\b1st\b/.test(lower) ||
        /\b1º\b/.test(lower) ||
        lower.includes('1st degree') ||
        lower.includes('1º grau') ||
        lower.includes('1o grau');
}

function hasMessageButtonInCard(card) {
    if (!card) return false;
    const btns = card.querySelectorAll(
        'button, a[data-control-name]'
    );
    for (const b of btns) {
        const t = (b.innerText || '').trim().toLowerCase();
        if (t === 'message' || t === 'mensagem') {
            return true;
        }
    }
    return false;
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

function isSameCompany(headline, myCompany) {
    if (!headline || !myCompany) return false;
    var normalizedHeadline = String(headline)
        .toLowerCase();
    var normalizedCompany = String(myCompany)
        .toLowerCase().trim();
    if (!normalizedCompany) return false;
    return normalizedHeadline.includes(normalizedCompany);
}

function isRecruiterProfile(profile) {
    const headline = normalizeLocaleText(
        profile?.headline || ''
    );
    const summary = normalizeLocaleText(
        profile?.summary || ''
    );
    const all = [headline, summary].join(' ');
    const markers = [
        'recruiter',
        'talent acquisition',
        'sourcer',
        'head of talent',
        'tech recruiter',
        'technical recruiter',
        'recrutador',
        'recrutadora',
        'aquisicao de talentos',
        'captacao de talentos',
        'headhunter'
    ];
    return markers.some(marker =>
        all.includes(marker)
    );
}

function isOpenToWorkCard(card, profile) {
    const cardText = normalizeLocaleText(
        card?.innerText || ''
    );
    let ariaText = '';
    if (card && typeof card.querySelectorAll === 'function') {
        const withAria = card.querySelectorAll(
            '[aria-label]'
        );
        ariaText = Array.from(withAria).map(el =>
            el.getAttribute('aria-label') || ''
        ).join(' ');
    }
    ariaText = normalizeLocaleText(ariaText);
    const profileText = normalizeLocaleText(
        [profile?.headline || '', profile?.summary || '']
            .join(' ')
    );
    const corpus = [
        cardText,
        ariaText,
        profileText
    ].join(' ');
    const signals = [
        'open to work',
        '#opentowork',
        'opentowork',
        'open to opportunities',
        'open for opportunities',
        'open for roles',
        'aberto para trabalho',
        'aberto a oportunidades',
        'aberta a oportunidades',
        'aberto para oportunidades',
        'aberta para oportunidades'
    ];
    return signals.some(signal =>
        corpus.includes(signal)
    );
}

function isJobSeekingProfile(profile, card) {
    const profileText = normalizeLocaleText(
        [profile?.headline || '', profile?.summary || '']
            .join(' ')
    );
    const cardText = normalizeLocaleText(
        card?.innerText || ''
    );
    const corpus = [profileText, cardText].join(' ');
    const jobSeekingSignals = [
        'actively looking',
        'looking for opportunities',
        'seeking opportunities',
        'open to opportunities',
        'open for roles',
        'open to new roles',
        'open to new opportunities',
        'available for work',
        'looking for a new role',
        'buscando novas oportunidades',
        'em busca de oportunidades',
        'a procura de oportunidades',
        'aberto a oportunidades',
        'aberta a oportunidades',
        'disponivel para trabalho',
        'procuro oportunidade',
        '#opentowork',
        'opentowork'
    ];
    return jobSeekingSignals.some(signal =>
        corpus.includes(signal)
    );
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isButtonClickable,
        isConnectButtonText,
        shouldExcludeButton,
        isAlreadyConnectedCardText,
        hasMessageButtonInCard,
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
        isBrazilGeoTarget,
        isSameCompany,
        isRecruiterProfile,
        isOpenToWorkCard,
        isJobSeekingProfile
    };
}
