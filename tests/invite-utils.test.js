/**
 * @jest-environment jsdom
 */
const {
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
    isBrazilGeoTarget
} = require('../extension/lib/invite-utils');

describe('isButtonClickable', () => {
    it('returns true for enabled button', () => {
        const btn = document.createElement('button');
        expect(isButtonClickable(btn)).toBe(true);
    });

    it('returns false for disabled button', () => {
        const btn = document.createElement('button');
        btn.disabled = true;
        expect(isButtonClickable(btn)).toBe(false);
    });

    it('returns false for button with disabled attr', () => {
        const btn = document.createElement('button');
        btn.setAttribute('disabled', 'disabled');
        expect(isButtonClickable(btn)).toBe(false);
    });

    it('returns false for muted button', () => {
        const btn = document.createElement('button');
        btn.classList.add('artdeco-button--muted');
        expect(isButtonClickable(btn)).toBe(false);
    });

    it('returns true for button with other classes', () => {
        const btn = document.createElement('button');
        btn.classList.add('artdeco-button--primary');
        expect(isButtonClickable(btn)).toBe(true);
    });
});

describe('isConnectButtonText', () => {
    it('matches "Connect"', () => {
        expect(isConnectButtonText('Connect')).toBe(true);
    });

    it('matches "Conectar" (PT-BR)', () => {
        expect(isConnectButtonText('Conectar')).toBe(true);
    });

    it('matches with whitespace', () => {
        expect(isConnectButtonText('  Connect  ')).toBe(true);
    });

    it('rejects "Message"', () => {
        expect(isConnectButtonText('Message')).toBe(false);
    });

    it('rejects "Pending"', () => {
        expect(isConnectButtonText('Pending')).toBe(false);
    });

    it('rejects partial match "Connect Now"', () => {
        expect(isConnectButtonText('Connect Now')).toBe(false);
    });
});

describe('shouldExcludeButton', () => {
    it('excludes "Message"', () => {
        expect(shouldExcludeButton('Message')).toBe(true);
    });

    it('excludes "Following"', () => {
        expect(shouldExcludeButton('Following')).toBe(true);
    });

    it('excludes "Withdraw"', () => {
        expect(shouldExcludeButton('Withdraw')).toBe(true);
    });

    it('excludes "Pending"', () => {
        expect(shouldExcludeButton('Pending')).toBe(true);
    });

    it('excludes "Pendente" (PT-BR)', () => {
        expect(shouldExcludeButton('Pendente')).toBe(true);
    });

    it('allows "Connect"', () => {
        expect(shouldExcludeButton('Connect')).toBe(false);
    });

    it('is case insensitive', () => {
        expect(shouldExcludeButton('PENDING')).toBe(true);
        expect(shouldExcludeButton('message')).toBe(true);
    });
});

describe('isAlreadyConnectedCardText', () => {
    it('detects 1st-degree profile badge', () => {
        expect(isAlreadyConnectedCardText(
            'John Doe 1st • Software Engineer'
        )).toBe(true);
    });

    it('detects PT-BR 1º grau marker', () => {
        expect(isAlreadyConnectedCardText(
            'Maria Silva • Conexão de 1º grau'
        )).toBe(true);
    });

    it('returns false for non-connected text', () => {
        expect(isAlreadyConnectedCardText(
            'Pedro Souza • 2nd • Recruiter'
        )).toBe(false);
    });
});

describe('hasMessageButtonInCard', () => {
    it('returns false for null card', () => {
        expect(hasMessageButtonInCard(null)).toBe(false);
    });

    it('detects Message button in card', () => {
        const card = document.createElement('div');
        const btn = document.createElement('button');
        btn.innerText = 'Message';
        card.appendChild(btn);
        expect(hasMessageButtonInCard(card)).toBe(true);
    });

    it('detects PT-BR Mensagem button', () => {
        const card = document.createElement('div');
        const btn = document.createElement('button');
        btn.innerText = 'Mensagem';
        card.appendChild(btn);
        expect(hasMessageButtonInCard(card)).toBe(true);
    });

    it('returns false when only Connect button', () => {
        const card = document.createElement('div');
        const btn = document.createElement('button');
        btn.innerText = 'Connect';
        card.appendChild(btn);
        expect(hasMessageButtonInCard(card)).toBe(false);
    });

    it('is case insensitive', () => {
        const card = document.createElement('div');
        const btn = document.createElement('button');
        btn.innerText = 'MESSAGE';
        card.appendChild(btn);
        expect(hasMessageButtonInCard(card)).toBe(true);
    });
});

describe('isPendingState', () => {
    it('detects "Pending" in innerText', () => {
        const btn = document.createElement('button');
        btn.innerText = 'Pending';
        expect(isPendingState(btn)).toBe(true);
    });

    it('detects "Pendente" (PT-BR)', () => {
        const btn = document.createElement('button');
        btn.innerText = 'Pendente';
        expect(isPendingState(btn)).toBe(true);
    });

    it('detects pending in aria-label', () => {
        const btn = document.createElement('button');
        btn.setAttribute('aria-label', 'Pending invitation');
        expect(isPendingState(btn)).toBe(true);
    });

    it('returns false for Connect button', () => {
        const btn = document.createElement('button');
        btn.innerText = 'Connect';
        expect(isPendingState(btn)).toBe(false);
    });
});

describe('isPendingInCard', () => {
    it('returns false for null card', () => {
        expect(isPendingInCard(null)).toBe(false);
    });

    it('detects pending button in card', () => {
        const card = document.createElement('div');
        const btn = document.createElement('button');
        btn.innerText = 'Pending';
        card.appendChild(btn);
        expect(isPendingInCard(card)).toBe(true);
    });

    it('detects pendente button in card', () => {
        const card = document.createElement('div');
        const btn = document.createElement('button');
        btn.innerText = 'Pendente';
        card.appendChild(btn);
        expect(isPendingInCard(card)).toBe(true);
    });

    it('returns false when no pending button', () => {
        const card = document.createElement('div');
        const btn = document.createElement('button');
        btn.innerText = 'Connect';
        card.appendChild(btn);
        expect(isPendingInCard(card)).toBe(false);
    });
});

describe('isInviteUrl', () => {
    it('matches LinkedIn invite API', () => {
        const url = 'https://www.linkedin.com/voyager/api/' +
            'voyagerRelationshipsDashMemberRelationships' +
            '?action=verifyQuotaAndCreateV2';
        expect(isInviteUrl(url)).toBe(true);
    });

    it('rejects non-invite URLs', () => {
        expect(isInviteUrl(
            'https://www.linkedin.com/feed/'
        )).toBe(false);
    });

    it('rejects partial match (only MemberRelationships)', () => {
        expect(isInviteUrl(
            'https://www.linkedin.com/api/' +
            'MemberRelationships?action=get'
        )).toBe(false);
    });
});

describe('detectChallengeFromUrl', () => {
    it('detects checkpoint URL', () => {
        expect(detectChallengeFromUrl(
            'https://www.linkedin.com/checkpoint/lg/login'
        )).toBe(true);
    });

    it('detects authwall URL', () => {
        expect(detectChallengeFromUrl(
            'https://www.linkedin.com/authwall'
        )).toBe(true);
    });

    it('detects challenge URL', () => {
        expect(detectChallengeFromUrl(
            'https://www.linkedin.com/challenge/verify'
        )).toBe(true);
    });

    it('passes normal LinkedIn URLs', () => {
        expect(detectChallengeFromUrl(
            'https://www.linkedin.com/search/results/people/'
        )).toBe(false);
    });
});

describe('detectChallengeFromText', () => {
    it('detects "security verification"', () => {
        expect(detectChallengeFromText(
            'Please complete security verification'
        )).toBe(true);
    });

    it('detects PT-BR verification', () => {
        expect(detectChallengeFromText(
            'Complete a verificação de segurança'
        )).toBe(true);
    });

    it('detects "unusual activity"', () => {
        expect(detectChallengeFromText(
            'We noticed unusual activity'
        )).toBe(true);
    });

    it('passes normal page text', () => {
        expect(detectChallengeFromText(
            'People you may know'
        )).toBe(false);
    });
});

describe('isEmailRequiredContent', () => {
    it('returns false for null modal', () => {
        expect(isEmailRequiredContent(null)).toBe(false);
    });

    it('detects email input by aria-label', () => {
        const modal = document.createElement('div');
        const input = document.createElement('input');
        input.setAttribute('aria-label', 'Email address');
        modal.appendChild(input);
        expect(isEmailRequiredContent(modal)).toBe(true);
    });

    it('detects email input by placeholder', () => {
        const modal = document.createElement('div');
        const input = document.createElement('input');
        input.setAttribute('placeholder', 'Enter e-mail');
        modal.appendChild(input);
        expect(isEmailRequiredContent(modal)).toBe(true);
    });

    it('detects "enter their email" in modal text', () => {
        const modal = document.createElement('div');
        modal.innerText =
            'You need to enter their email to connect';
        expect(isEmailRequiredContent(modal)).toBe(true);
    });

    it('detects PT-BR email prompt', () => {
        const modal = document.createElement('div');
        modal.innerText =
            'Por favor, digite o e-mail dessa pessoa';
        expect(isEmailRequiredContent(modal)).toBe(true);
    });

    it('returns false for invite modal without email', () => {
        const modal = document.createElement('div');
        modal.innerText =
            'You can customize this invitation';
        expect(isEmailRequiredContent(modal)).toBe(false);
    });
});

describe('extractFirstName', () => {
    it('extracts first name from full name', () => {
        expect(extractFirstName('John Doe')).toBe('John');
    });

    it('handles single name', () => {
        expect(extractFirstName('Maria')).toBe('Maria');
    });

    it('returns "there" for empty string', () => {
        expect(extractFirstName('')).toBe('there');
    });

    it('returns "there" for null', () => {
        expect(extractFirstName(null)).toBe('there');
    });

    it('trims whitespace', () => {
        expect(extractFirstName('  Ana Silva  '))
            .toBe('Ana');
    });

    it('handles multiple spaces', () => {
        expect(extractFirstName('José  da  Silva'))
            .toBe('José');
    });
});

describe('extractNameFromAria', () => {
    it('extracts name from aria-label', () => {
        expect(extractNameFromAria(
            'Invite John to connect'
        )).toBe('John');
    });

    it('returns null for non-matching label', () => {
        expect(extractNameFromAria(
            'Send message to John'
        )).toBeNull();
    });

    it('returns null for null input', () => {
        expect(extractNameFromAria(null)).toBeNull();
    });

    it('is case insensitive', () => {
        expect(extractNameFromAria(
            'invite Maria to connect'
        )).toBe('Maria');
    });
});

describe('isBrazilianProfile', () => {
    it('detects Brazil by location', () => {
        expect(isBrazilianProfile({
            location: 'São Paulo, Brazil',
            headline: 'Software Engineer',
            summary: ''
        })).toBe(true);
    });

    it('detects Portuguese cues in headline/summary', () => {
        expect(isBrazilianProfile({
            location: 'Lisbon, Portugal',
            headline: 'Engenheiro de Software',
            summary: 'Atuando com times de produto e dados'
        })).toBe(true);
    });

    it('returns false for non-Brazilian profile', () => {
        expect(isBrazilianProfile({
            location: 'Berlin, Germany',
            headline: 'Senior Backend Engineer',
            summary: 'Building distributed systems'
        })).toBe(false);
    });
});

describe('isFollowButtonText', () => {
    it('matches "Follow"', () => {
        expect(isFollowButtonText('Follow')).toBe(true);
    });

    it('matches "Seguir" (PT-BR)', () => {
        expect(isFollowButtonText('Seguir')).toBe(true);
    });

    it('matches with whitespace', () => {
        expect(isFollowButtonText('  Follow  ')).toBe(true);
    });

    it('rejects "Following"', () => {
        expect(isFollowButtonText('Following')).toBe(false);
    });

    it('rejects "Connect"', () => {
        expect(isFollowButtonText('Connect')).toBe(false);
    });

    it('rejects "Unfollow"', () => {
        expect(isFollowButtonText('Unfollow')).toBe(false);
    });

    it('rejects empty string', () => {
        expect(isFollowButtonText('')).toBe(false);
    });
});

describe('isFollowingButtonText', () => {
    it('matches "Following"', () => {
        expect(isFollowingButtonText('Following')).toBe(true);
    });

    it('matches "Seguindo" (PT-BR)', () => {
        expect(isFollowingButtonText('Seguindo')).toBe(true);
    });

    it('matches with whitespace', () => {
        expect(isFollowingButtonText('  Following  ')).toBe(true);
    });

    it('rejects "Follow"', () => {
        expect(isFollowingButtonText('Follow')).toBe(false);
    });

    it('rejects "Connect"', () => {
        expect(isFollowingButtonText('Connect')).toBe(false);
    });

    it('rejects empty string', () => {
        expect(isFollowingButtonText('')).toBe(false);
    });
});

describe('isBrazilGeoTarget', () => {
    it('detects encoded Brazil geo URN id', () => {
        expect(isBrazilGeoTarget('%5B%22106057199%22%5D'))
            .toBe(true);
    });

    it('detects raw Brazil geo URN id', () => {
        expect(isBrazilGeoTarget('["106057199"]'))
            .toBe(true);
    });

    it('returns false for non-Brazil geo URN ids', () => {
        expect(isBrazilGeoTarget(
            '%5B%22103644278%22%2C%22101121807%22%5D'
        )).toBe(false);
    });

    it('returns false for empty input', () => {
        expect(isBrazilGeoTarget('')).toBe(false);
        expect(isBrazilGeoTarget(null)).toBe(false);
    });
});
