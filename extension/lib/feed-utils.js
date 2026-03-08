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
    ],
    humor: [
        'lol', 'lmao', 'haha', 'meme', 'spaghetti',
        'junior dev', 'senior dev', 'project manager',
        'it works on my machine', 'stackoverflow',
        'stack overflow', '😂', '🤣', '💀',
        'chaos', 'moved it somewhere', 'pain',
        'relatable', 'accurate', 'friday deploy',
        'hotfix', 'prod', 'css', 'merge conflict',
        'piada', 'kkkk', 'rsrs', 'engraçado'
    ],
    critique: [
        'unpopular opinion', 'hot take', 'overrated',
        'stop pretending', 'toxic', 'the problem with',
        'we need to talk about', 'enough with',
        'stop glorifying', 'hustle culture', 'burnout',
        'nobody asked', 'controversial', 'wrong',
        'disagree', 'wake up', 'reality check',
        'opinião impopular', 'chega de'
    ],
    motivation: [
        'never give up', 'keep going', 'you got this',
        'believe in yourself', 'hustle', 'grind',
        'mindset', 'consistency', 'discipline',
        'success is', 'the secret to', 'work hard',
        'dream big', 'no excuses', 'motivation',
        'inspire', 'resilience', 'persistence',
        'não desista', 'força', 'persistência'
    ],
    project: [
        'built', 'launched', 'shipped', 'side project',
        'open source', 'portfolio', 'demo', 'prototype',
        'check out', 'just released', 'i made',
        'i created', 'my project', 'show you',
        'working on', 'finally finished',
        'construí', 'lancei', 'meu projeto'
    ],
    jobseeking: [
        'open to work', 'looking for', 'job search',
        'available for', 'seeking', 'laid off',
        'let go', 'hiring me', 'reach out',
        'any leads', 'on the market', 'new opportunity',
        'résumé', 'resume', '#opentowork',
        'buscando oportunidade', 'disponível',
        'aberto a propostas', 'em busca de'
    ],
    newjob: [
        'first day', 'just started', 'new position',
        'joining', 'new adventure', 'new beginning',
        'grateful to announce', 'excited to start',
        'happy to join', 'i\'m joining',
        'new team', 'day one', 'onboarding',
        'primeiro dia', 'comecei na', 'entrando na'
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
    humor: [
        'ok this one got me 😂',
        'the accuracy hurts lol',
        'I feel personally attacked by this',
        'showed this to my team and we all ' +
            'felt called out',
        'this is too real 💀',
        'whoever made this has clearly lived it',
        'why is this so accurate though',
        'I shouldn\'t be laughing this hard at work',
        'the {topic} part is painfully accurate',
        'sent this to my group chat immediately'
    ],
    critique: [
        'finally someone said it',
        'this needed to be said. {keyPhrase}',
        'agree 100%. more people need to hear this',
        'brave take but honestly fair. {keyPhrase}',
        'been thinking this for a while. glad ' +
            'someone put it into words',
        'this is the kind of honest take we need ' +
            'more of on here',
        'uncomfortable truths. {keyPhrase}',
        'the {topic} industry really needs ' +
            'this conversation'
    ],
    motivation: [
        'needed this energy today',
        'saving this for the tough days',
        'the part about {topic} really hit home',
        'this is the reminder I needed',
        'sharing this with someone who needs to ' +
            'hear it today',
        'simple but powerful. {keyPhrase}',
        'more of this mindset please'
    ],
    project: [
        'this is really cool, nice work!',
        'love seeing people build stuff. ' +
            '{topic} needs more of this',
        'just checked it out - solid execution',
        'the {topic} space needs more builders ' +
            'like this. props!',
        'this is the kind of content I follow ' +
            'LinkedIn for. shipping > talking',
        'bookmarked. gonna try this out',
        'clean work. how long did it take to build?'
    ],
    jobseeking: [
        'hope you land something great soon. ' +
            'sharing for visibility',
        'boosting this. someone in my network ' +
            'might have something',
        'the right role is out there. rooting for you',
        '{topic} people are in demand - won\'t ' +
            'take long',
        'reposting for reach. good luck!',
        'your background is solid. sending good ' +
            'vibes on the search',
        'commented for the algorithm. you got this'
    ],
    newjob: [
        'congrats on the new gig!! go crush it',
        'huge move! excited for you',
        'love to see it. great fit by the sounds of it',
        'congrats! {topic} is an exciting space ' +
            'to be in right now',
        'that\'s awesome, congrats on the move!',
        'new chapter energy. go get it!',
        'congrats!! they\'re lucky to have you'
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
    humor: [
        'ok essa me pegou 😂',
        'a precisão dói kk',
        'me senti pessoalmente atacado',
        'mostrei pro time e todo mundo se sentiu ' +
            'representado',
        'isso é real demais 💀',
        'quem fez isso claramente já viveu',
        'por que isso é tão preciso',
        'não deveria tá rindo tanto no trabalho',
        'a parte de {topic} é dolorosamente precisa',
        'mandei pro grupo na hora'
    ],
    critique: [
        'finalmente alguém falou',
        'isso precisava ser dito. {keyPhrase}',
        'concordo 100%. mais gente precisa ouvir isso',
        'take corajoso mas honesto. {keyPhrase}',
        'penso nisso faz tempo. bom que alguém ' +
            'colocou em palavras',
        'esse tipo de honestidade que a gente ' +
            'precisa mais aqui',
        'verdades inconvenientes. {keyPhrase}',
        'a indústria de {topic} precisa muito ' +
            'dessa conversa'
    ],
    motivation: [
        'precisava dessa energia hoje',
        'guardando isso pros dias difíceis',
        'a parte sobre {topic} me pegou',
        'esse é o lembrete que eu precisava',
        'vou mandar pra alguém que precisa ouvir ' +
            'isso hoje',
        'simples mas poderoso. {keyPhrase}',
        'mais dessa mentalidade por favor'
    ],
    project: [
        'que massa, belo trabalho!',
        'adoro ver gente construindo. {topic} ' +
            'precisa de mais disso',
        'dei uma olhada - execução sólida',
        'a área de {topic} precisa de mais builders ' +
            'assim. parabéns!',
        'esse é o tipo de conteúdo que eu sigo ' +
            'o LinkedIn pra ver. shipar > falar',
        'salvei. vou testar',
        'trabalho limpo. quanto tempo levou pra fazer?'
    ],
    jobseeking: [
        'espero que ache algo incrível logo. ' +
            'compartilhando pra dar visibilidade',
        'dando boost. alguém da minha rede pode ' +
            'ter algo',
        'a vaga certa tá aí. torcendo por vc',
        'gente de {topic} tá em alta - não vai ' +
            'demorar',
        'repostando pro alcance. boa sorte!',
        'seu perfil é muito bom. mandando ' +
            'boas energias na busca',
        'comentando pro algoritmo. vc consegue'
    ],
    newjob: [
        'parabéns pelo novo trampo!! vai arrasar',
        'que move! animado por vc',
        'bom demais. parece encaixar certinho',
        'parabéns! {topic} tá num momento ' +
            'incrível pra estar',
        'demais, parabéns pela mudança!',
        'energia de novo capítulo. vai com tudo!',
        'parabéns!! eles têm sorte de ter vc'
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
