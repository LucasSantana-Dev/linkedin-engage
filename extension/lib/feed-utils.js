function getReactionType(postText, keywords) {
    const lower = (postText || '').toLowerCase();
    if (keywords?.celebrate?.some(k => lower.includes(k))) {
        return 'PRAISE';
    }
    if (keywords?.support?.some(k => lower.includes(k))) {
        return 'EMPATHY';
    }
    if (keywords?.insightful?.some(k => lower.includes(k))) {
        return 'INTEREST';
    }
    if (keywords?.funny?.some(k => lower.includes(k))) {
        return 'ENTERTAINMENT';
    }
    if (keywords?.love?.some(k => lower.includes(k))) {
        return 'APPRECIATION';
    }
    return 'LIKE';
}

const POST_CATEGORIES = {
    hiring: [
        'hiring', 'we\'re looking', 'job opening',
        'open role', 'apply now', 'join our team',
        'join us', 'position available', 'dm me',
        'send your resume', 'vaga', 'contratando',
        'estamos buscando'
    ],
    achievement: [
        'promoted', 'new role', 'excited to announce',
        'thrilled to share', 'milestone', 'award',
        'certified', 'graduated', 'accepted',
        'just joined', 'new chapter', 'happy to share',
        'proud to', 'orgulho', 'conquista'
    ],
    technical: [
        'architecture', 'algorithm', 'deploy',
        'performance', 'scalab', 'microservice',
        'database', 'refactor', 'ci/cd', 'pipeline',
        'kubernetes', 'docker', 'api', 'framework',
        'testing', 'debug', 'production', 'latency',
        'distributed', 'caching'
    ],
    question: [
        'what do you think', 'thoughts?', 'agree?',
        'how do you', 'what\'s your', 'would you',
        'curious to hear', 'any recommendations',
        'what are your', 'poll:', 'opinião',
        'o que vocês acham'
    ],
    tips: [
        'tip:', 'lesson learned', 'here\'s what i',
        'mistake i made', 'advice', 'pro tip',
        'things i wish', 'do this instead',
        'stop doing', 'start doing', 'best practice',
        'cheat sheet', 'thread:', 'dica:'
    ],
    story: [
        'years ago', 'my journey', 'i remember when',
        'true story', 'let me tell you', 'looking back',
        'when i started', 'story time', 'i was rejected',
        'i failed', 'i quit', 'i got fired'
    ],
    news: [
        'just announced', 'breaking:', 'report shows',
        'according to', 'study finds', 'survey',
        'market', 'industry trend', 'funding',
        'acquisition', 'ipo', 'valuation', 'layoffs'
    ]
};

const CATEGORY_TEMPLATES = {
    hiring: [
        'solid role, sharing with my network',
        'the {topic} space is so hot right now',
        'love seeing companies actually invest in ' +
            '{topic}. good luck with the search!',
        'this is the kind of role I like seeing ' +
            'on my feed. {keyPhrase}',
        'bookmarked. know a few people who might ' +
            'be a fit',
        'interesting - what does the tech stack ' +
            'look like?',
        'good to see {topic} hiring picking up'
    ],
    achievement: [
        'congrats!! well deserved',
        'this is awesome, congrats!',
        'huge! {keyPhrase}',
        'love to see it. congrats on the move!',
        'well deserved - excited to see what you ' +
            'do next',
        'congrats! {topic} needs people like you',
        'this made my day. go get it!!'
    ],
    technical: [
        'been thinking about this a lot lately. ' +
            '{keyPhrase}',
        'ran into something similar last quarter. ' +
            '{topic} is tricky to get right',
        'this is super underrated. more people ' +
            'need to talk about {topic}',
        'solid take. curious what your experience ' +
            'has been with scale?',
        'saving this for later. {topic} keeps ' +
            'coming up in our standups',
        'yes! {keyPhrase} - we learned this the ' +
            'hard way too',
        'the part about {topic} really resonated'
    ],
    question: [
        'honestly it depends. but leaning towards ' +
            '{keyPhrase}',
        'good question - I\'ve been going back and ' +
            'forth on this one too',
        'we tried a few approaches with {topic} ' +
            'and the answer was always "it depends"',
        'curious about this too, following for ' +
            'the replies',
        'this is one of those topics where ' +
            'everyone has a different take. ' +
            'for me, {keyPhrase}',
        'great thread. {topic} is one of those ' +
            'things you just have to figure out ' +
            'by doing'
    ],
    tips: [
        'needed to hear this today',
        'saving this. the point about {topic} ' +
            'is spot on',
        'wish I had this advice 2 years ago lol',
        'simple but so true. {keyPhrase}',
        'screenshot taken, sending to my team',
        'this. especially the part about {topic}',
        'adding this to my notes. {keyPhrase}'
    ],
    story: [
        'appreciate you sharing this',
        'this hits different. {keyPhrase}',
        'needed this perspective today. thanks ' +
            'for being real about it',
        'more of this on LinkedIn please',
        'I can relate to this more than you know',
        'thanks for writing this. not enough people ' +
            'talk about {topic} honestly',
        'real talk. {keyPhrase}'
    ],
    news: [
        'whoa didn\'t see this coming',
        'been following {topic} closely - this ' +
            'is a big deal',
        'interesting. curious how this plays out ' +
            'for the rest of the market',
        '{topic} is moving so fast. hard to keep up',
        'this is going to change things. ' +
            '{keyPhrase}',
        'was just talking about this yesterday. ' +
            '{topic} is wild right now'
    ],
    generic: [
        'needed to see this today, thanks for posting',
        'this resonated. {keyPhrase}',
        'really interesting perspective',
        'following for more on this',
        'shared this with my team',
        'spot on. {keyPhrase}',
        'appreciate you putting this out there',
        'this. 100%'
    ]
};

const CATEGORY_TEMPLATES_PT = {
    hiring: [
        'vaga top, vou compartilhar na minha rede',
        'a área de {topic} tá muito aquecida',
        'bom ver empresas investindo em {topic}. ' +
            'boa sorte na busca!',
        'esse tipo de vaga que eu gosto de ver ' +
            'no feed. {keyPhrase}',
        'salvei. conheço gente que pode se encaixar',
        'interessante - como é a stack?',
        'bom ver {topic} contratando'
    ],
    achievement: [
        'parabéns!! merecido demais',
        'que massa, parabéns!',
        'enorme! {keyPhrase}',
        'bom demais ver isso. parabéns pela conquista!',
        'merecido - ansioso pra ver o próximo passo',
        'parabéns! {topic} precisa de gente como vc',
        'isso alegrou meu dia. vai com tudo!!'
    ],
    technical: [
        'tenho pensado muito nisso ultimamente. ' +
            '{keyPhrase}',
        'passei por algo parecido. {topic} é ' +
            'difícil de acertar',
        'isso é super subestimado. mais gente ' +
            'precisa falar sobre {topic}',
        'ponto sólido. curioso sobre sua ' +
            'experiência com escala',
        'salvando pra depois. {topic} sempre ' +
            'aparece nas nossas dailys',
        'sim! {keyPhrase} - a gente aprendeu ' +
            'isso da pior forma também',
        'a parte sobre {topic} fez muito sentido'
    ],
    question: [
        'sinceramente depende. mas tendendo pra ' +
            '{keyPhrase}',
        'boa pergunta - também fico indo e ' +
            'voltando nisso',
        'a gente tentou várias abordagens com ' +
            '{topic} e a resposta sempre foi "depende"',
        'também curioso sobre isso, seguindo ' +
            'pelas respostas',
        'esse é daqueles temas que cada um tem ' +
            'uma opinião diferente. pra mim, {keyPhrase}',
        'boa thread. {topic} é uma daquelas ' +
            'coisas que só fazendo pra entender'
    ],
    tips: [
        'precisava ouvir isso hoje',
        'salvando isso. o ponto sobre {topic} ' +
            'tá certíssimo',
        'queria ter essa dica 2 anos atrás kk',
        'simples mas muito verdade. {keyPhrase}',
        'print feito, mandando pro time',
        'isso. principalmente a parte de {topic}',
        'anotando. {keyPhrase}'
    ],
    story: [
        'valeu por compartilhar isso',
        'isso pega diferente. {keyPhrase}',
        'precisava dessa perspectiva hoje. ' +
            'valeu pela honestidade',
        'mais disso no LinkedIn por favor',
        'me identifico mais do que vc imagina',
        'valeu por escrever isso. pouca gente ' +
            'fala sobre {topic} de verdade',
        'real. {keyPhrase}'
    ],
    news: [
        'eita não esperava essa',
        'acompanhando {topic} de perto - isso ' +
            'é grande',
        'interessante. curioso como isso afeta ' +
            'o resto do mercado',
        '{topic} tá andando rápido demais. ' +
            'difícil acompanhar',
        'isso vai mudar as coisas. {keyPhrase}',
        'tava falando sobre isso ontem. {topic} ' +
            'tá insano'
    ],
    generic: [
        'precisava ver isso hoje, valeu por postar',
        'isso fez sentido. {keyPhrase}',
        'perspectiva muito interessante',
        'seguindo pra mais sobre isso',
        'compartilhei com meu time',
        'certíssimo. {keyPhrase}',
        'valeu por colocar isso aqui',
        'isso. 100%'
    ]
};

const FOLLOW_UPS = [
    '', '', '', '', '',
    ' what has your experience been?',
    ' would love to connect and chat more about this.',
    ' curious how others are handling this.',
    ' have you written more about this?',
    ''
];

const FOLLOW_UPS_PT = [
    '', '', '', '', '',
    ' qual tem sido sua experiência?',
    ' bora conectar e trocar mais sobre isso.',
    ' curioso como outros estão lidando com isso.',
    ' vc já escreveu mais sobre isso?',
    ''
];

const OPENERS = [
    '', '', '', '',
    'honestly, ', 'yeah ', 'this - ',
    'so true. ', '', ''
];

const OPENERS_PT = [
    '', '', '', '',
    'sinceramente, ', 'sim ', 'isso - ',
    'muito real. ', '', ''
];

const TOPIC_MAP = [
    { pattern: /\b(artificial intelligence|ai|gpt|llm|genai)\b/i, label: 'AI' },
    { pattern: /\b(machine learning|ml|deep learning|neural)\b/i, label: 'machine learning' },
    { pattern: /\b(react|angular|vue|svelte|next\.?js)\b/i, label: 'frontend development' },
    { pattern: /\b(node\.?js|express|fastify|nest\.?js|deno|bun)\b/i, label: 'backend development' },
    { pattern: /\b(python|django|flask|fastapi)\b/i, label: 'Python' },
    { pattern: /\b(java|spring boot|kotlin)\b/i, label: 'Java' },
    { pattern: /\b(rust|go|golang)\b/i, label: 'systems programming' },
    { pattern: /\b(typescript|javascript)\b/i, label: 'TypeScript' },
    { pattern: /\b(docker|kubernetes|k8s|container)\b/i, label: 'containerization' },
    { pattern: /\b(aws|azure|gcp|cloud)\b/i, label: 'cloud infrastructure' },
    { pattern: /\b(devops|ci\/cd|pipeline|deploy)\b/i, label: 'DevOps' },
    { pattern: /\b(security|cybersec|vulnerability|owasp)\b/i, label: 'security' },
    { pattern: /\b(data engineer|etl|data pipeline|spark)\b/i, label: 'data engineering' },
    { pattern: /\b(remote work|work from home|wfh|hybrid)\b/i, label: 'remote work' },
    { pattern: /\b(hiring|recruit|talent|interview)\b/i, label: 'hiring' },
    { pattern: /\b(leader|management|team lead|cto)\b/i, label: 'leadership' },
    { pattern: /\b(startup|founder|entrepreneur|vc)\b/i, label: 'startups' },
    { pattern: /\b(product|pm|product manager|roadmap)\b/i, label: 'product management' },
    { pattern: /\b(design|ux|ui|figma|accessibility)\b/i, label: 'design' },
    { pattern: /\b(open source|oss|github|contribute)\b/i, label: 'open source' },
    { pattern: /\b(career|growth|mentoring|learning)\b/i, label: 'career growth' },
    { pattern: /\b(agile|scrum|kanban|sprint)\b/i, label: 'agile methodologies' },
    { pattern: /\b(database|sql|postgres|mongo|redis)\b/i, label: 'databases' },
    { pattern: /\b(mobile|ios|android|flutter|react native)\b/i, label: 'mobile development' },
    { pattern: /\b(blockchain|web3|crypto|smart contract)\b/i, label: 'blockchain' }
];

function classifyPost(postText) {
    if (!postText) return 'generic';
    const lower = postText.toLowerCase();
    let bestCategory = 'generic';
    let bestScore = 0;

    for (const [category, keywords] of
        Object.entries(POST_CATEGORIES)) {
        let score = 0;
        for (const kw of keywords) {
            if (lower.includes(kw)) score++;
        }
        if (score > bestScore) {
            bestScore = score;
            bestCategory = category;
        }
    }
    return bestCategory;
}

function extractTopic(postText) {
    if (!postText) return 'this';
    for (const entry of TOPIC_MAP) {
        if (entry.pattern.test(postText)) {
            return entry.label;
        }
    }
    return 'this topic';
}

const PT_MARKERS = [
    'você', 'vocês', 'não', 'está', 'também',
    'muito', 'como', 'isso', 'aqui', 'mais',
    'sobre', 'ainda', 'quando', 'porque', 'então',
    'todos', 'nossa', 'nosso', 'trabalho', 'empresa',
    'equipe', 'projeto', 'sempre', 'melhor', 'pessoas',
    'mundo', 'tempo', 'forma', 'importante', 'novo',
    'nova', 'grande', 'parte', 'dia', 'hoje',
    'precisamos', 'precisa', 'conhecimento', 'área',
    'experiência', 'oportunidade', 'resultado',
    'desenvolvimento', 'tecnologia', 'mercado',
    'carreira', 'profissional', 'conteúdo',
    'vaga', 'contratando', 'orgulho', 'conquista',
    'opinião', 'dica', 'obrigado', 'obrigada',
    'parabéns', 'incrível', 'demais'
];

function detectLanguage(text) {
    if (!text) return 'en';
    const lower = text.toLowerCase();
    let score = 0;
    for (const marker of PT_MARKERS) {
        if (lower.includes(marker)) score++;
    }
    return score >= 3 ? 'pt' : 'en';
}

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function extractKeyPhrase(postText) {
    if (!postText || postText.length < 10) return '';
    const sentences = postText
        .replace(/\n+/g, '. ')
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 15 && s.length < 120);
    if (!sentences.length) return '';

    const scored = sentences.map(s => {
        let score = 0;
        const lower = s.toLowerCase();
        const signals = [
            'important', 'key', 'the truth',
            'biggest', 'best', 'worst', 'never',
            'always', 'most people', 'nobody talks',
            'underrated', 'overrated', 'the problem',
            'the solution', 'what works', 'game changer',
            'don\'t', 'stop', 'start', 'here\'s why',
            'the real', 'actually', 'turns out'
        ];
        for (const sig of signals) {
            if (lower.includes(sig)) score += 2;
        }
        if (s.length > 30 && s.length < 80) score += 1;
        return { text: s, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];
    if (best.score === 0) {
        return scored[
            Math.floor(Math.random() * Math.min(3,
                scored.length))
        ].text;
    }
    return best.text;
}

function lowerFirst(s) {
    if (!s) return s;
    if (s.length < 2) return s.toLowerCase();
    if (/^[A-Z]{2}/.test(s)) return s;
    return s[0].toLowerCase() + s.slice(1);
}

function humanize(comment) {
    let result = comment;
    if (Math.random() < 0.3 &&
        result.length > 0 &&
        /^[a-z]/.test(result)) {
        result = result[0].toUpperCase() +
            result.slice(1);
    }
    if (Math.random() < 0.15) {
        result = result.replace(/\.$/, '');
    }
    if (Math.random() < 0.1 && !result.endsWith('!') &&
        !result.endsWith('?')) {
        result = result.replace(/[.!?]*$/, '...');
    }
    return result;
}

function buildCommentFromPost(postText, userTemplates) {
    const category = classifyPost(postText);
    const topic = extractTopic(postText);
    const lang = detectLanguage(postText);

    let template;
    if (userTemplates && userTemplates.length > 0) {
        template = pickRandom(userTemplates);
    } else {
        const templates = lang === 'pt'
            ? CATEGORY_TEMPLATES_PT : CATEGORY_TEMPLATES;
        const pool = templates[category] ||
            templates.generic;
        template = pickRandom(pool);
    }

    const excerpt = (postText || '')
        .substring(0, 50).trim();

    const rawPhrase = extractKeyPhrase(postText);
    const keyPhrase = rawPhrase
        ? '"' + lowerFirst(rawPhrase) + '"'
        : '';

    let comment = template
        .replace(/\{topic\}/g, topic)
        .replace(/\{excerpt\}/g, excerpt)
        .replace(/\{category\}/g, category)
        .replace(/\{keyPhrase\}/g, keyPhrase);

    comment = comment.replace(/\s{2,}/g, ' ').trim();
    if (comment.includes('""') ||
        comment.endsWith('"') && comment.split('"').length < 3) {
        comment = comment.replace(/\s*""\s*/g, ' ').trim();
    }

    if (!userTemplates || !userTemplates.length) {
        const openers = lang === 'pt'
            ? OPENERS_PT : OPENERS;
        const followUps = lang === 'pt'
            ? FOLLOW_UPS_PT : FOLLOW_UPS;
        const opener = pickRandom(openers);
        if (opener && !comment.startsWith(opener.trim())) {
            comment = opener + comment;
        }
        const followUp = pickRandom(followUps);
        if (followUp) {
            comment = comment.replace(/[.!?]*$/, '') +
                followUp;
        }
        comment = humanize(comment);
    }

    return comment;
}

function isReactablePost(postEl) {
    if (!postEl) return false;
    const text = (postEl.innerText ||
        postEl.textContent || '').trim();
    return text.length > 20;
}

function shouldSkipPost(postText, skipKeywords) {
    if (!skipKeywords || !skipKeywords.length) return false;
    const lower = (postText || '').toLowerCase();
    return skipKeywords.some(k => lower.includes(
        k.toLowerCase()
    ));
}

function isCompanyFollowText(text) {
    const t = (text || '').trim();
    return t === 'Follow' || t === 'Seguir' ||
        t === '+ Follow' || t === '+ Seguir';
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getReactionType,
        classifyPost,
        buildCommentFromPost,
        extractTopic,
        extractKeyPhrase,
        humanize,
        detectLanguage,
        isReactablePost,
        shouldSkipPost,
        isCompanyFollowText,
        POST_CATEGORIES,
        CATEGORY_TEMPLATES,
        CATEGORY_TEMPLATES_PT,
        TOPIC_MAP
    };
}
