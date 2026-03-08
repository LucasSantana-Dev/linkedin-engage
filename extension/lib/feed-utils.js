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
        'proud to', 'orgulho', 'conquista',
        'feliz em anunciar', 'feliz em compartilhar',
        'começando como', 'anunciar que', 'nova fase',
        'promovido', 'certificado', 'aprovado',
        'muito feliz', 'alcancei', 'consegui'
    ],
    technical: [
        'architecture', 'algorithm', 'deploy',
        'performance', 'scalab', 'microservice',
        'refactor', 'ci/cd', 'pipeline',
        'latency', 'distributed', 'caching',
        'dependency injection', 'singleton',
        'design pattern', 'service mesh',
        'adapter pattern', 'strategy pattern',
        'factory pattern', 'observer pattern',
        'solid principles', 'clean code',
        'clean architecture', 'repository pattern',
        'event-driven', 'event sourcing', 'cqrs',
        'load balancing', 'reverse proxy',
        'tdd', 'unit test', 'integration test',
        'adapter', 'strategy', 'pattern',
        'abstraction', 'polymorphism',
        'encapsulation', 'inheritance',
        'tech debt', 'technical debt',
        'code review', 'pair programming',
        'system design', 'distributed system',
        'race condition', 'deadlock', 'concurrency',
        'throughput', 'availability', 'resilience',
        'idempotent', 'eventual consistency',
        'monolith to microservice', 'migration',
        'padrão de projeto', 'padrões de projeto',
        'arquitetura limpa', 'código limpo'
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
        'got my first job', 'my first job',
        'landed a job', 'got the job',
        'primeiro dia', 'comecei na', 'entrando na',
        'novo emprego', 'nova posição', 'fui contratado'
    ]
};

const CATEGORY_TEMPLATES = {
    hiring: [
        'solid role. sharing with my network for ' +
            'visibility',
        'the {topic} space is heating up. love to ' +
            'see companies investing in talent',
        'great opportunity. what does the day-to-day ' +
            'look like for this role?',
        'this is the kind of role I like seeing. ' +
            '{keyPhrase}',
        'bookmarked. know a few people who might ' +
            'be interested',
        'the tech stack on this sounds exciting. ' +
            'any remote flexibility?',
        'good to see {topic} hiring. the market ' +
            'needed this',
        'reposting for reach. companies that ' +
            'invest in {topic} talent tend to ' +
            'build great products'
    ],
    achievement: [
        'huge milestone. {topic} is not easy to ' +
            'break into',
        'earned it. excited to see what comes next',
        'that takes real work. {keyPhrase}',
        'really happy to see this. {topic} needs ' +
            'more people like you',
        'the journey to get here is no joke. ' +
            'looking forward to what you build next',
        'big move. {topic} is a great space to be ' +
            'in right now',
        'this is inspiring. go get it'
    ],
    technical: [
        'great visual breakdown. {topic} is one of ' +
            'those things that clicks once you see ' +
            'it diagrammed like this',
        'we use this approach in production. the key ' +
            'is knowing when NOT to apply {topic}',
        'solid reference material. I always explain ' +
            '{topic} to juniors using examples like this',
        'this is exactly the kind of content that ' +
            'makes {topic} accessible to more devs',
        'saving this. {topic} comes up in every ' +
            'system design interview too',
        'been thinking about this a lot lately. ' +
            '{keyPhrase}',
        'ran into something similar last quarter. ' +
            '{topic} is tricky to get right',
        'this is super underrated. more people ' +
            'need to talk about {topic}',
        'yes! {keyPhrase} - we learned this the ' +
            'hard way too',
        'clean explanation. the separation of ' +
            'concerns here is what makes {topic} ' +
            'so powerful in practice',
        'I refactored a whole module using this ' +
            'approach. {topic} made the codebase ' +
            'way more maintainable',
        'this is the kind of post I wish existed ' +
            'when I was learning {topic}. clear and ' +
            'practical'
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
        'the point about {topic} is spot on. ' +
            'bookmarked',
        'saving this. practical and to the point',
        'wish someone told me this a couple ' +
            'years ago. {keyPhrase}',
        'simple but effective. sending to my team',
        'the {topic} tip alone makes this worth ' +
            'sharing',
        'adding this to my notes. {keyPhrase}',
        'underrated advice. especially the part ' +
            'about {topic}'
    ],
    story: [
        'not enough people talk about {topic} ' +
            'honestly. glad you did',
        '{keyPhrase}. that part hit different',
        'went through something similar. it ' +
            'changes your perspective',
        'more of this on LinkedIn please',
        'I can relate to this more than you know',
        'the honesty here is refreshing. {topic} ' +
            'is rarely discussed this openly',
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
        'ok this one got me',
        'the accuracy hurts',
        'I feel personally attacked by this',
        'showed this to my team and we all ' +
            'felt called out',
        'whoever made this has clearly lived it',
        'why is this so accurate though',
        'I should not be laughing this hard at work',
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
        'came at the right time. saving this',
        'keeping this for the tough days',
        'the part about {topic} really hit home',
        'good reminder when things get hard',
        'forwarding this to someone who could ' +
            'use it today',
        'simple but powerful. {keyPhrase}',
        'more of this mindset please'
    ],
    project: [
        'clean execution. {topic} needs more ' +
            'people actually building',
        'just checked it out. solid work',
        'the {topic} space needs more builders ' +
            'like this',
        'shipping over talking. always respect ' +
            'people who build in public',
        'bookmarked. going to try this out',
        'how long did it take to build? the ' +
            '{topic} part looks well thought out',
        'interesting approach. saving for reference'
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
        'huge move. {topic} is a great space ' +
            'to be in right now',
        'exciting times. sounds like a great fit',
        'they got a good one. wishing you the best',
        'been following your journey. happy to ' +
            'see this',
        'new chapter. go make it count',
        '{topic} is lucky to have you. looking ' +
            'forward to seeing what you build',
        'earned it. excited for what comes next'
    ],
    generic: [
        'interesting perspective. {keyPhrase}',
        'this resonated more than expected. ' +
            '{keyPhrase}',
        'been seeing more posts about {topic} ' +
            'lately and this one stands out',
        'shared this with a colleague who was ' +
            'just talking about {topic} yesterday',
        'saving this for reference. {keyPhrase}',
        'underrated take. more people in the ' +
            '{topic} space should see this',
        'the way you framed {topic} here made ' +
            'something click for me',
        'hadn\'t considered it from this angle. ' +
            'good perspective'
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
        'grande marco. {topic} não é fácil de ' +
            'entrar',
        'merecido. ansioso pra ver o que vem ' +
            'por aí',
        'dá pra ver o trabalho por trás. {keyPhrase}',
        'muito bom ver isso. {topic} precisa de ' +
            'mais gente assim',
        'o caminho até aqui não é fácil. animado ' +
            'pra ver o que vc constrói',
        'grande movimento. {topic} é uma ótima ' +
            'área pra estar agora',
        'isso inspira. vai com tudo'
    ],
    technical: [
        'ótima visualização. {topic} é daqueles ' +
            'conceitos que faz sentido quando vc ' +
            'vê um diagrama assim',
        'a gente usa essa abordagem em produção. ' +
            'o segredo é saber quando NÃO aplicar ' +
            '{topic}',
        'material de referência. sempre explico ' +
            '{topic} pra juniors com exemplos assim',
        'exatamente o tipo de conteúdo que torna ' +
            '{topic} acessível pra mais devs',
        'salvando. {topic} aparece em toda ' +
            'entrevista de system design também',
        'tenho pensado muito nisso ultimamente. ' +
            '{keyPhrase}',
        'passei por algo parecido. {topic} é ' +
            'difícil de acertar',
        'isso é super subestimado. mais gente ' +
            'precisa falar sobre {topic}',
        'sim! {keyPhrase} - a gente aprendeu ' +
            'isso da pior forma também',
        'explicação limpa. a separação de ' +
            'responsabilidades é o que torna ' +
            '{topic} tão poderoso na prática',
        'refatorei um módulo inteiro usando essa ' +
            'abordagem. {topic} deixou o código ' +
            'muito mais sustentável',
        'esse é o tipo de post que eu queria que ' +
            'existisse quando eu tava aprendendo ' +
            '{topic}. claro e prático'
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
        'o ponto sobre {topic} tá certíssimo. ' +
            'salvei',
        'salvando. prático e direto ao ponto',
        'queria ter visto isso uns anos atrás. ' +
            '{keyPhrase}',
        'simples mas eficaz. mandei pro time',
        'a dica de {topic} sozinha já vale o post',
        'anotando. {keyPhrase}',
        'conselho subestimado. principalmente a ' +
            'parte de {topic}'
    ],
    story: [
        'pouca gente fala sobre {topic} de ' +
            'verdade. bom que vc falou',
        '{keyPhrase}. essa parte pegou diferente',
        'passei por algo parecido. muda a ' +
            'perspectiva',
        'mais disso no LinkedIn por favor',
        'me identifico mais do que vc imagina',
        'a honestidade aqui é rara. {topic} ' +
            'raramente é discutido assim',
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
        'ok essa me pegou',
        'a precisão dói',
        'me senti pessoalmente atacado',
        'mostrei pro time e todo mundo se sentiu ' +
            'representado',
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
        'chegou na hora certa. salvando',
        'guardando isso pros dias difíceis',
        'a parte sobre {topic} me pegou',
        'bom lembrete quando as coisas apertam',
        'mandando pra alguém que pode precisar ' +
            'disso hoje',
        'simples mas poderoso. {keyPhrase}',
        'mais dessa mentalidade por favor'
    ],
    project: [
        'execução limpa. {topic} precisa de mais ' +
            'gente construindo',
        'dei uma olhada. trabalho sólido',
        'a área de {topic} precisa de mais builders ' +
            'assim',
        'shipar > falar. sempre respeito quem ' +
            'constrói em público',
        'salvei. vou testar',
        'quanto tempo levou? a parte de {topic} ' +
            'parece bem pensada',
        'abordagem interessante. salvando pra ' +
            'referência'
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
        'grande movimento. {topic} é uma ótima ' +
            'área pra estar agora',
        'parece encaixar bem. animado por vc',
        'eles ganharam alguém bom. desejando o ' +
            'melhor',
        'acompanhando sua trajetória. bom ver isso',
        'novo capítulo. vai fazer a diferença',
        '{topic} tem sorte de ter vc. ansioso pra ' +
            'ver o que vc constrói',
        'merecido. animado pelo que vem por aí'
    ],
    generic: [
        'perspectiva interessante. {keyPhrase}',
        'isso fez mais sentido do que eu esperava. ' +
            '{keyPhrase}',
        'tô vendo mais posts sobre {topic} ' +
            'ultimamente e esse se destaca',
        'mandei pra um colega que tava falando ' +
            'sobre {topic} ontem mesmo',
        'salvando pra referência. {keyPhrase}',
        'take subestimado. mais gente da área de ' +
            '{topic} devia ver isso',
        'a forma que vc colocou {topic} aqui fez ' +
            'algo clicar pra mim',
        'não tinha pensado por esse ângulo. boa ' +
            'perspectiva'
    ]
};

const CATEGORY_FOLLOW_UPS = {
    technical: [
        '', '',
        ' what stack are you using for this?',
        ' curious how you measured the impact.',
        ' have you benchmarked this?',
        ''
    ],
    question: [
        '', '',
        ' would love to hear more takes on this.',
        ' what has your experience been?',
        ''
    ],
    hiring: [
        '', '', '',
        ' is this remote-friendly?',
        ''
    ],
    project: [
        '', '',
        ' what was the hardest part to build?',
        ' is it open source?',
        ''
    ],
    humor: ['', '', '', '', ''],
    newjob: ['', '', '', '', ''],
    achievement: ['', '', '', '', ''],
    jobseeking: [
        '', '',
        ' what kind of role are you targeting?',
        ''
    ],
    critique: [
        '', '',
        ' curious how others are handling this.',
        ''
    ],
    story: [
        '', '',
        ' have you written more about this?',
        ''
    ],
    tips: [
        '', '',
        ' any more resources on this?',
        ''
    ],
    motivation: ['', '', '', '', ''],
    news: [
        '', '',
        ' curious how this plays out long-term.',
        ''
    ],
    generic: [
        '', '', '', '',
        ' would love to connect and chat more.',
        ''
    ]
};

const CATEGORY_FOLLOW_UPS_PT = {
    technical: [
        '', '',
        ' qual stack vc tá usando?',
        ' curioso como mediu o impacto.',
        ''
    ],
    question: [
        '', '',
        ' quero ver mais opiniões sobre isso.',
        ' qual tem sido sua experiência?',
        ''
    ],
    hiring: [
        '', '', '',
        ' aceita remoto?',
        ''
    ],
    project: [
        '', '',
        ' qual foi a parte mais difícil de construir?',
        ' é open source?',
        ''
    ],
    humor: ['', '', '', '', ''],
    newjob: ['', '', '', '', ''],
    achievement: ['', '', '', '', ''],
    jobseeking: [
        '', '',
        ' que tipo de vaga vc tá buscando?',
        ''
    ],
    critique: [
        '', '',
        ' curioso como outros estão lidando com isso.',
        ''
    ],
    story: [
        '', '',
        ' vc já escreveu mais sobre isso?',
        ''
    ],
    tips: [
        '', '',
        ' tem mais material sobre isso?',
        ''
    ],
    motivation: ['', '', '', '', ''],
    news: [
        '', '',
        ' curioso como isso se desenrola.',
        ''
    ],
    generic: [
        '', '', '', '',
        ' bora conectar e trocar mais sobre isso.',
        ''
    ]
};

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
    { pattern: /\b(design pattern|adapter pattern|strategy pattern|factory pattern|observer pattern|singleton|builder pattern|decorator pattern|facade pattern|proxy pattern|padr[ãõ][oe]s?\sde\sprojeto|adapter|strategy)\b/i, label: 'design patterns' },
    { pattern: /\b(solid|clean code|clean architecture|hexagonal|ddd|domain.driven|arquitetura\slimpa|arquitetura\shexagonal)\b/i, label: 'software architecture' },
    { pattern: /\b(artificial intelligence|ai|gpt|llm|genai|copilot|chatgpt|claude)\b/i, label: 'AI' },
    { pattern: /\b(machine learning|ml|deep learning|neural)\b/i, label: 'machine learning' },
    { pattern: /\b(react|angular|vue|svelte|next\.?js)\b/i, label: 'frontend development' },
    { pattern: /\b(node\.?js|express|fastify|nest\.?js|deno|bun)\b/i, label: 'backend development' },
    { pattern: /\b(python|django|flask|fastapi)\b/i, label: 'Python' },
    { pattern: /\b(java|spring\s?boot|kotlin)\b/i, label: 'Java' },
    { pattern: /\b(rust|go|golang)\b/i, label: 'systems programming' },
    { pattern: /\b(typescript|javascript)\b/i, label: 'TypeScript' },
    { pattern: /\b(docker|kubernetes|k8s|container)\b/i, label: 'containerization' },
    { pattern: /\b(aws|azure|gcp|cloud)\b/i, label: 'cloud infrastructure' },
    { pattern: /\b(devops|ci\/cd|pipeline|deploy|terraform|ansible)\b/i, label: 'DevOps' },
    { pattern: /\b(security|cybersec|vulnerability|owasp|auth)\b/i, label: 'security' },
    { pattern: /\b(data engineer|etl|data pipeline|spark|kafka)\b/i, label: 'data engineering' },
    { pattern: /\b(microservice|monolith|event.driven|message queue|rabbitmq)\b/i, label: 'distributed systems' },
    { pattern: /\b(api|rest|graphql|grpc|websocket)\b/i, label: 'API design' },
    { pattern: /\b(test|tdd|bdd|unit test|integration test|jest|cypress)\b/i, label: 'testing' },
    { pattern: /\b(remote work|work from home|wfh|hybrid)\b/i, label: 'remote work' },
    { pattern: /\b(hiring|recruit|talent|interview)\b/i, label: 'hiring' },
    { pattern: /\b(leader|management|team lead|cto|tech lead)\b/i, label: 'leadership' },
    { pattern: /\b(startup|founder|entrepreneur|vc)\b/i, label: 'startups' },
    { pattern: /\b(product|pm|product manager|roadmap)\b/i, label: 'product management' },
    { pattern: /\b(ux|ui|figma|accessibility)\b/i, label: 'design' },
    { pattern: /\b(open source|oss|github|contribute)\b/i, label: 'open source' },
    { pattern: /\b(career|growth|mentoring|learning)\b/i, label: 'career growth' },
    { pattern: /\b(agile|scrum|kanban|sprint)\b/i, label: 'agile methodologies' },
    { pattern: /\b(database|sql|postgres|mongo|redis)\b/i, label: 'databases' },
    { pattern: /\b(mobile|ios|android|flutter|react native)\b/i, label: 'mobile development' },
    { pattern: /\b(blockchain|web3|crypto|smart contract)\b/i, label: 'blockchain' },
    { pattern: /\b(pagamento|payment|stripe|paypal|checkout|frete|shipping)\b/i, label: 'payment systems' },
    { pattern: /\b(refactor|legacy|tech debt|technical debt|migration)\b/i, label: 'code quality' }
];

const HIGH_SIGNAL_CATEGORIES = new Set([
    'achievement', 'hiring', 'jobseeking', 'newjob',
    'humor'
]);

function classifyPost(postText) {
    if (!postText) return 'generic';
    const lower = postText.toLowerCase();
    const scores = {};

    for (const [category, keywords] of
        Object.entries(POST_CATEGORIES)) {
        let score = 0;
        for (const kw of keywords) {
            if (lower.includes(kw)) {
                score++;
                if (kw.length > 8) score += 0.5;
            }
        }
        if (HIGH_SIGNAL_CATEGORIES.has(category)) {
            score *= 1.5;
        }
        scores[category] = score;
    }

    let bestCategory = 'generic';
    let bestScore = 0;
    for (const [cat, score] of Object.entries(scores)) {
        if (score > bestScore) {
            bestScore = score;
            bestCategory = cat;
        }
    }

    if (bestScore < 1 && lower.length > 20) {
        for (const entry of TOPIC_MAP) {
            if (entry.pattern.test(lower)) {
                return 'technical';
            }
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
    return 'tech';
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
    'parabéns', 'incrível', 'demais',
    'para', 'pagamento', 'cálculo', 'frete',
    'aplicação', 'exemplo', 'utilizar', 'através',
    'porém', 'porém', 'além', 'dessa', 'desse',
    'nesse', 'nessa', 'cada', 'entre', 'outro',
    'outra', 'outros', 'mesma', 'mesmo', 'apenas',
    'sendo', 'fazer', 'qual', 'onde', 'quem',
    'algo', 'nada', 'tudo', 'pode', 'devemos',
    'sistema', 'solução', 'método', 'código',
    'implementação', 'arquitetura', 'padrão',
    'seguir', 'utilizado', 'utilizada', 'criado',
    'criada', 'funciona', 'permite', 'necessário',
    'cara', 'mano', 'pior', 'semana', 'resolver',
    'inteiro', 'galera', 'trampo', 'foda', 'massa',
    'maneiro', 'tava', 'ficou', 'tinha', 'seria',
    'deveria', 'kkk', 'rsrs', 'hein', 'eita'
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
    let r = comment;

    if (Math.random() < 0.5) {
        r = r.replace(/\.$/, '');
    }

    if (Math.random() < 0.2 && /^[a-z]/.test(r)) {
        r = r[0].toUpperCase() + r.slice(1);
    }

    return r;
}

const CONCEPT_PATTERNS = [
    /\b(\w+[\s-]\w*(?:Pattern|Architecture|Design|Framework|Protocol|Algorithm|Principle|Strategy|Approach|System|Service|Layer|Pipeline|Queue|Cache|Stack))\b/gi,
    /\b((?:adapter|strategy|factory|observer|singleton|decorator|facade|proxy|builder|mediator|command|iterator)\s*(?:pattern)?)\b/gi,
    /\b(SOLID|DRY|KISS|YAGNI|TDD|BDD|DDD|CQRS|MVC|MVVM|REST|GraphQL|gRPC|OAuth|JWT|CI\/CD)\b/g,
    /\b(React|Angular|Vue|Svelte|Next\.?js|Nest\.?js|Express|Spring\s?Boot|Django|FastAPI|Flask|Laravel|Rails)\b/g,
    /\b(TypeScript|JavaScript|Python|Java|Kotlin|Rust|Go|C#|\.NET|Ruby|PHP|Swift|Dart)\b/g,
    /\b(Docker|Kubernetes|AWS|Azure|GCP|Terraform|Ansible|Jenkins|GitHub\s?Actions|Vercel|Supabase)\b/g,
    /\b(PostgreSQL?|MongoDB|Redis|MySQL|Kafka|RabbitMQ|Elasticsearch|DynamoDB)\b/g,
    /\b(Node\.?js|Deno|Bun)\b/g,
    /\b(microservic\w+|serverless|monolith\w*|event[- ]driven|message[- ]queue)\b/gi,
    /\b(pagamento|frete|checkout|payment|shipping|billing|subscription)\b/gi,
    /\b(full[- ]?stack|front[- ]?end|back[- ]?end|dev[- ]?ops|machine[- ]?learning|deep[- ]?learning)\b/gi,
    /\b(Staff\s+Engineer|Senior\s+Engineer|Tech\s+Lead|Engineering\s+Manager|CTO|VP\s+Engineering)\b/gi,
    /\b(Module\s+Federation|Micro\s+Frontend|Server\s+Components|Edge\s+Computing)\b/gi
];

function extractConcepts(postText) {
    if (!postText) return [];
    const found = new Map();

    for (const pattern of CONCEPT_PATTERNS) {
        const regex = new RegExp(
            pattern.source, pattern.flags
        );
        let match;
        while ((match = regex.exec(postText)) !== null) {
            const term = match[1].trim();
            if (term.length < 2 || term.length > 40) {
                continue;
            }
            const key = term.toLowerCase();
            if (!found.has(key) ||
                term.length > found.get(key).length) {
                found.set(key, term);
            }
        }
    }

    const stopWords = new Set([
        'the', 'and', 'for', 'with', 'that', 'this',
        'from', 'are', 'was', 'has', 'have', 'been',
        'will', 'can', 'not', 'but', 'all', 'our',
        'your', 'their', 'what', 'when', 'how',
        'just', 'more', 'some', 'also', 'than',
        'like', 'into', 'over', 'its', 'you',
        'que', 'com', 'uma', 'por', 'dos', 'das',
        'seu', 'sua', 'nos', 'são'
    ]);

    const articles = /^(o|a|os|as|um|uma|the|an?|el|la|los|las|do|da|dos|das|no|na|nos|nas|de|em|por|ao|à)\s+/i;

    return [...found.entries()]
        .filter(([key]) => !stopWords.has(key))
        .map(([key, val]) => {
            const cleaned = val.replace(articles, '');
            return [cleaned.toLowerCase(), cleaned];
        })
        .filter(([key, val]) =>
            val.length >= 3 && !stopWords.has(key))
        .sort((a, b) => b[1].length - a[1].length)
        .filter(([key], i, arr) =>
            !arr.some(([k], j) =>
                j < i && k.includes(key)))
        .map(([, val]) => val)
        .slice(0, 5);
}

const COMPOSED_EN = {
    technical: [
        (c) => 'great breakdown of ' + c[0] +
            (c[1]
                ? '. the connection with ' + c[1] +
                  ' makes a lot of sense'
                : '. really clear example'),
        (c) => 'we had a similar discussion about ' +
            c[0] + ' at work recently' +
            (c[1] ? ', ended up going with ' + c[1] : '') +
            '. sharing this with the team',
        (c) => 'went through this exact problem ' +
            'with ' + c[0] + ' in production' +
            (c[1]
                ? ', combining it with ' + c[1] +
                  ' helped a lot'
                : '. wish I had this reference before'),
        (c) => c[0] + ' explained with a real use case ' +
            'like this makes all the difference',
        (c) => 'saving this. ' + c[0] +
            ' keeps coming up in code reviews and ' +
            'this is one of the better explanations',
        (c) => 'interesting approach with ' + c[0] +
            (c[1]
                ? ' and ' + c[1]
                : '') +
            '. definitely trying this',
        (c) => 'had to learn ' + c[0] +
            ' the hard way. this would have saved ' +
            'me a lot of time',
        (c) => c[0] + ' seems straightforward until ' +
            'you actually implement it. good to ' +
            'see the details here',
        (c) => 'been using ' + c[0] +
            ' for a while but never thought about' +
            (c[1]
                ? ' combining it with ' + c[1] +
                  '. interesting idea'
                : ' it from this angle'),
        (c) => 'the ' + c[0] + ' example is really ' +
            'practical' +
            (c[1]
                ? '. the ' + c[1] + ' comparison ' +
                  'helps it click'
                : ''),
    ],
    hiring: [
        (c) => (c[0] ? c[0] : 'this stack') +
            (c[1] ? ' + ' + c[1] : '') +
            ' is a solid combination. sharing with ' +
            'my network',
        (c) => (c[0] ? c[0] + ' roles' : 'roles like this') +
            ' are hard to find. is this remote?',
        (c) => 'know a few people who would be a ' +
            'great fit. sharing',
        (c) => (c[0] || 'this role') +
            ' sounds interesting. what does the ' +
            'day-to-day look like?',
    ],
    achievement: [
        (c) => 'huge milestone' +
            (c[0]
                ? '. ' + c[0] + ' is not easy to ' +
                  'break into'
                : '. takes real work to get there'),
        (c) => 'earned it. ' +
            (c[0]
                ? 'excited to see what you do ' +
                  'with ' + c[0]
                : 'exciting times ahead'),
        (c) => 'big move' +
            (c[0]
                ? '. ' + c[0] + ' is a great space ' +
                  'to be in right now'
                : '. looking forward to what comes next'),
        (c) => (c[0]
                ? c[0] + ' needs more people like you'
                : 'the journey to get here is no joke') +
            '. looking forward to seeing what you ' +
            'build next',
    ],
    question: [
        (c) => 'good question' +
            (c[0]
                ? '. ' + c[0] + ' really depends ' +
                  'on the context and team'
                : '') + '. curious to see the answers',
        (c) => 'honestly it depends, but ' +
            (c[0]
                ? 'with ' + c[0] + ' I would say'
                : 'in my experience') +
            ' start simple and iterate from there',
        (c) => 'been thinking about this too' +
            (c[0]
                ? '. ' + c[0] + ' has so many ' +
                  'valid approaches'
                : '') +
            '. following for the discussion',
    ],
    tips: [
        (c) => 'solid advice' +
            (c[0]
                ? ', especially the ' + c[0] + ' part'
                : '') +
            '. bookmarked',
        (c) => 'wish I had this a couple years ago' +
            (c[0]
                ? '. the ' + c[0] + ' tip alone is ' +
                  'worth it'
                : ''),
        (c) => 'this is practical. ' +
            (c[0]
                ? c[0] + ' is one of those things ' +
                  'you usually learn the hard way'
                : 'saving for reference'),
        (c) => 'good stuff' +
            (c[0]
                ? '. ' + c[0] + ' is underrated ' +
                  'and people skip it too often'
                : '. simple but effective'),
    ],
    story: [
        (c) => 'the honesty here is rare' +
            (c[0]
                ? '. the ' + c[0] + ' part is ' +
                  'really relatable'
                : '') +
            '. more people should talk about it',
        (c) => 'went through something similar' +
            (c[0]
                ? ' with ' + c[0]
                : '') +
            '. appreciate the honesty',
        (c) => 'posts like this actually help people' +
            (c[0]
                ? '. ' + c[0] + ' is tough and ' +
                  'nobody talks about it enough'
                : ''),
    ],
    news: [
        (c) => (c[0] ? c[0] + ' is' : 'this is') +
            ' moving fast. did not expect this',
        (c) => 'been following ' +
            (c[0] || 'this') +
            ' closely. curious where it goes',
        (c) => 'interesting. ' +
            (c[0] ? c[0] : 'this') +
            ' could change a lot of things',
    ],
    humor: [
        (c) => 'too accurate' +
            (c[0]
                ? '. the ' + c[0] + ' part especially'
                : ''),
        (c) => 'showed this to my team and everyone ' +
            'felt called out',
        (c) => 'the accuracy is painful' +
            (c[0]
                ? '. ' + c[0] + ' devs know exactly ' +
                  'what this feels like'
                : ''),
        (c) => 'ok this one got me' +
            (c[0]
                ? '. the ' + c[0] + ' bit is spot on'
                : '. so true'),
    ],
    critique: [
        (c) => 'glad someone said it' +
            (c[0] ? ' about ' + c[0] : '') +
            '. needed to be said',
        (c) => 'been thinking the same thing' +
            (c[0]
                ? ' about ' + c[0]
                : '') +
            '. valid points here',
        (c) => 'fair take' +
            (c[0]
                ? '. ' + c[0] + ' definitely needs ' +
                  'more of this kind of discussion'
                : '. more people should be honest ' +
                  'about this'),
    ],
    motivation: [
        (c) => 'came at the right time' +
            (c[0]
                ? '. the ' + c[0] + ' part resonated'
                : ''),
        (c) => 'keeping this for the tough days' +
            (c[0]
                ? '. ' + c[0] + ' is not an easy path'
                : ''),
        (c) => 'good reminder' +
            (c[0]
                ? '. ' + c[0] + ' takes a lot of ' +
                  'persistence'
                : '. easy to forget this when ' +
                  'things get hard'),
    ],
    project: [
        (c) => 'this is really cool' +
            (c[0] ? '. ' + c[0] : '') +
            (c[1]
                ? ' with ' + c[1] + ' is a nice touch'
                : ' looks solid') +
            '. how long did it take?',
        (c) => 'nice work' +
            (c[0]
                ? '. the ' + c[0] + ' part is well done'
                : '') +
            '. is the code open source?',
        (c) => 'was looking for something like this' +
            (c[0]
                ? '. the ' + c[0] + ' approach is clean'
                : ''),
    ],
    jobseeking: [
        (c) => 'sharing for visibility. ' +
            (c[0]
                ? c[0] + ' professionals are in demand'
                : 'strong profile'),
        (c) => (c[0]
                ? c[0] + ' background'
                : 'your profile') +
            ' is solid. should not take long',
        (c) => 'good luck with the search' +
            (c[0]
                ? '. ' + c[0] + ' roles are out there'
                : '') +
            '. rooting for you',
    ],
    newjob: [
        (c) => 'huge move. ' +
            (c[0] ? c[0] + ' is' : 'that is') +
            ' a great space to be in',
        (c) => 'they got a good one' +
            (c[0]
                ? '. ' + c[0] + ' is lucky to have you'
                : '. wishing you the best'),
        (c) => 'been following your journey. ' +
            (c[0]
                ? c[0] + ' sounds like a great fit'
                : 'happy to see this'),
    ],
    generic: [
        (c) => 'interesting angle' +
            (c[0]
                ? '. ' + c[0] + ' is worth digging into'
                : '. more people should see this'),
        (c) => 'hadn\'t thought about ' +
            (c[0] || 'it') +
            ' this way. good perspective',
        (c) => 'shared this with my team. ' +
            (c[0]
                ? c[0] + ' keeps coming up in our ' +
                  'discussions'
                : 'relevant to what we are working on'),
    ]
};

const COMPOSED_PT = {
    technical: [
        (c) => 'boa explicação de ' + c[0] +
            (c[1]
                ? '. a relação com ' + c[1] +
                  ' faz bastante sentido'
                : '. exemplo bem claro'),
        (c) => 'a gente teve uma discussão parecida ' +
            'sobre ' + c[0] + ' recentemente' +
            (c[1] ? ', acabamos indo com ' + c[1] : '') +
            '. mandei pro time',
        (c) => 'passei por esse problema com ' +
            c[0] + ' em produção' +
            (c[1]
                ? ', combinar com ' + c[1] +
                  ' ajudou bastante'
                : '. queria ter essa referência antes'),
        (c) => c[0] + ' explicado com caso de uso real ' +
            'assim faz toda a diferença',
        (c) => 'salvando. ' + c[0] +
            ' aparece bastante em code review e ' +
            'essa é uma das melhores explicações',
        (c) => 'abordagem interessante com ' + c[0] +
            (c[1]
                ? ' e ' + c[1]
                : '') +
            '. vou tentar isso',
        (c) => 'aprendi ' + c[0] +
            ' da forma difícil. isso teria me ' +
            'economizado bastante tempo',
        (c) => c[0] + ' parece simples até vc ' +
            'implementar de verdade. bom ver ' +
            'os detalhes aqui',
        (c) => 'uso ' + c[0] +
            ' faz um tempo mas nunca pensei' +
            (c[1]
                ? ' em combinar com ' + c[1] +
                  '. ideia interessante'
                : ' por esse ângulo'),
        (c) => 'o exemplo de ' + c[0] +
            ' é bem prático' +
            (c[1]
                ? '. a comparação com ' + c[1] +
                  ' ajuda a entender'
                : ''),
    ],
    hiring: [
        (c) => (c[0] ? c[0] : 'essa stack') +
            (c[1] ? ' + ' + c[1] : '') +
            ' é uma boa combinação. compartilhando',
        (c) => (c[0] ? 'vagas de ' + c[0] : 'vagas assim') +
            ' são difíceis de achar. aceita remoto?',
        (c) => 'conheço gente que se encaixaria bem. ' +
            'compartilhando',
        (c) => (c[0] || 'essa vaga') +
            ' parece interessante. como é o dia a dia?',
    ],
    achievement: [
        (c) => 'grande marco' +
            (c[0]
                ? '. ' + c[0] + ' não é fácil de ' +
                  'entrar'
                : '. dá pra ver o trabalho por trás'),
        (c) => 'merecido. ' +
            (c[0]
                ? 'ansioso pra ver o que vc faz ' +
                  'com ' + c[0]
                : 'momento muito bom'),
        (c) => 'grande movimento' +
            (c[0]
                ? '. ' + c[0] + ' é uma área ótima ' +
                  'pra estar agora'
                : '. animado pelo que vem por aí'),
        (c) => (c[0]
                ? c[0] + ' precisa de mais gente assim'
                : 'o caminho até aqui não é fácil') +
            '. ansioso pra ver o que vc constrói',
    ],
    question: [
        (c) => 'boa pergunta' +
            (c[0]
                ? '. ' + c[0] + ' depende muito ' +
                  'do contexto e do time'
                : '') + '. curioso pelas respostas',
        (c) => 'sinceramente depende, mas ' +
            (c[0]
                ? 'com ' + c[0] + ' eu diria'
                : 'pela minha experiência') +
            ' começar simples e iterar',
        (c) => 'também tenho pensado nisso' +
            (c[0]
                ? '. ' + c[0] + ' tem muitas ' +
                  'abordagens válidas'
                : '') +
            '. seguindo a discussão',
    ],
    tips: [
        (c) => 'conselho sólido' +
            (c[0]
                ? ', principalmente a parte de ' + c[0]
                : '') +
            '. salvei',
        (c) => 'queria ter visto isso uns anos atrás' +
            (c[0]
                ? '. a dica de ' + c[0] + ' sozinha ' +
                  'já vale'
                : ''),
        (c) => 'bem prático. ' +
            (c[0]
                ? c[0] + ' é uma daquelas coisas que ' +
                  'a gente geralmente aprende errando'
                : 'salvando pra referência'),
        (c) => 'bom demais' +
            (c[0]
                ? '. ' + c[0] + ' é subestimado e ' +
                  'muita gente pula'
                : '. simples mas eficaz'),
    ],
    story: [
        (c) => 'a honestidade aqui é rara' +
            (c[0]
                ? '. a parte de ' + c[0] + ' é bem ' +
                  'identificável'
                : '') +
            '. mais gente devia falar sobre isso',
        (c) => 'passei por algo parecido' +
            (c[0]
                ? ' com ' + c[0]
                : '') +
            '. valeu pela honestidade',
        (c) => 'post assim que realmente ajuda ' +
            'as pessoas' +
            (c[0]
                ? '. ' + c[0] + ' é difícil e ' +
                  'pouca gente fala sobre'
                : ''),
    ],
    news: [
        (c) => (c[0] ? c[0] + ' tá' : 'isso tá') +
            ' andando rápido. não esperava',
        (c) => 'acompanhando ' +
            (c[0] || 'isso') +
            ' de perto. curioso pra ver onde vai dar',
        (c) => 'interessante. ' +
            (c[0] ? c[0] : 'isso') +
            ' pode mudar muita coisa',
    ],
    humor: [
        (c) => 'preciso demais' +
            (c[0]
                ? '. a parte de ' + c[0] + ' principalmente'
                : ''),
        (c) => 'mostrei pro time e todo mundo se ' +
            'sentiu representado',
        (c) => 'a precisão dói' +
            (c[0]
                ? '. quem trabalha com ' + c[0] +
                  ' sabe exatamente como é'
                : ''),
        (c) => 'essa me pegou' +
            (c[0]
                ? '. a parte de ' + c[0] + ' é certeira'
                : '. muito real'),
    ],
    critique: [
        (c) => 'bom que alguém falou' +
            (c[0] ? ' sobre ' + c[0] : '') +
            '. precisava ser dito',
        (c) => 'tenho pensado a mesma coisa' +
            (c[0]
                ? ' sobre ' + c[0]
                : '') +
            '. pontos válidos',
        (c) => 'take justo' +
            (c[0]
                ? '. ' + c[0] + ' precisa de mais ' +
                  'esse tipo de discussão'
                : '. mais gente devia ser honesta ' +
                  'sobre isso'),
    ],
    motivation: [
        (c) => 'chegou na hora certa' +
            (c[0]
                ? '. a parte de ' + c[0] + ' fez sentido'
                : ''),
        (c) => 'guardando pra os dias difíceis' +
            (c[0]
                ? '. ' + c[0] + ' não é um caminho fácil'
                : ''),
        (c) => 'bom lembrete' +
            (c[0]
                ? '. ' + c[0] + ' exige muita ' +
                  'persistência'
                : '. fácil esquecer disso quando ' +
                  'as coisas apertam'),
    ],
    project: [
        (c) => 'muito legal' +
            (c[0] ? '. ' + c[0] : '') +
            (c[1]
                ? ' com ' + c[1] + ' ficou bom'
                : ' tá sólido') +
            '. quanto tempo levou?',
        (c) => 'bom trabalho' +
            (c[0]
                ? '. a parte de ' + c[0] + ' ficou ' +
                  'bem feita'
                : '') +
            '. o código é open source?',
        (c) => 'tava procurando algo assim' +
            (c[0]
                ? '. a abordagem com ' + c[0] + ' é limpa'
                : ''),
    ],
    jobseeking: [
        (c) => 'compartilhando pra dar visibilidade. ' +
            (c[0]
                ? 'profissionais de ' + c[0] +
                  ' estão em alta'
                : 'perfil forte'),
        (c) => (c[0]
                ? 'experiência com ' + c[0]
                : 'seu perfil') +
            ' é sólida. não deve demorar',
        (c) => 'boa sorte na busca' +
            (c[0]
                ? '. vagas de ' + c[0] + ' existem'
                : '') +
            '. torcendo por vc',
    ],
    newjob: [
        (c) => 'grande movimento. ' +
            (c[0] ? c[0] + ' é' : 'isso é') +
            ' uma ótima área pra estar',
        (c) => 'eles ganharam alguém bom' +
            (c[0]
                ? '. ' + c[0] + ' tem sorte de ter vc'
                : '. desejando o melhor'),
        (c) => 'acompanhando sua trajetória. ' +
            (c[0]
                ? c[0] + ' tá numa fase ótima agora'
                : 'desejando o melhor'),
    ],
    generic: [
        (c) => 'ângulo interessante' +
            (c[0]
                ? '. ' + c[0] + ' vale aprofundar'
                : 'mais gente devia ver isso'),
        (c) => 'não tinha pensado em ' +
            (c[0] || 'isso') +
            ' assim. boa perspectiva',
        (c) => 'mandei pro time. ' +
            (c[0]
                ? c[0] + ' tem aparecido bastante nas ' +
                  'nossas discussões'
                : 'relevante pro que estamos trabalhando'),
    ]
};


function buildCommentFromPost(postText, userTemplates) {
    const category = classifyPost(postText);
    const lang = detectLanguage(postText);

    if (userTemplates && userTemplates.length > 0) {
        const topic = extractTopic(postText);
        const excerpt = (postText || '')
            .substring(0, 50).trim();
        let comment = pickRandom(userTemplates);
        comment = comment
            .replace(/\{topic\}/g, topic)
            .replace(/\{excerpt\}/g, excerpt)
            .replace(/\{category\}/g, category);
        return comment;
    }

    const concepts = extractConcepts(postText);

    if (concepts.length > 0) {
        const composed = lang === 'pt'
            ? COMPOSED_PT : COMPOSED_EN;
        const pool = composed[category] ||
            composed.generic;
        const fn = pickRandom(pool);
        let comment = fn(concepts);
        return humanize(comment);
    }

    const topic = extractTopic(postText);
    const textLen = (postText || '').length;
    const rawPhrase = extractKeyPhrase(postText);
    const phraseIsTooSimilar = rawPhrase &&
        rawPhrase.length > textLen * 0.7;
    const hasKeyPhrase = rawPhrase &&
        rawPhrase.length > 0 && !phraseIsTooSimilar;
    const keyPhrase = hasKeyPhrase
        ? '"' + lowerFirst(rawPhrase) + '"'
        : '';

    const templates = lang === 'pt'
        ? CATEGORY_TEMPLATES_PT : CATEGORY_TEMPLATES;
    const templatePool = templates[category] ||
        templates.generic;

    let candidates = templatePool;
    if (!hasKeyPhrase) {
        const noPhrase = templatePool.filter(
            t => !t.includes('{keyPhrase}')
        );
        if (noPhrase.length > 0) candidates = noPhrase;
    }
    let template = pickRandom(candidates);

    let comment = template
        .replace(/\{topic\}/g, topic)
        .replace(/\{keyPhrase\}/g, keyPhrase)
        .replace(/\{excerpt\}/g,
            (postText || '').substring(0, 50).trim())
        .replace(/\{category\}/g, category);

    comment = comment.replace(/\s{2,}/g, ' ').trim();
    if (comment.includes('""')) {
        comment = comment
            .replace(/\s*""\s*/g, ' ').trim();
    }

    const openers = lang === 'pt'
        ? OPENERS_PT : OPENERS;
    const opener = pickRandom(openers);
    if (opener && !comment.startsWith(opener.trim())) {
        comment = opener + comment;
    }

    return humanize(comment);
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

function getPostText(postEl) {
    if (!postEl) return '';
    const parts = [];

    const bodySelectors = [
        '.feed-shared-text',
        '.feed-shared-inline-show-more-text',
        '.feed-shared-update-v2__description',
        '.update-components-text',
        '[data-test-id="main-feed-activity-content"]',
        'span.break-words',
        '.feed-shared-text-view span[dir="ltr"]',
        'div.feed-shared-update-v2__commentary ' +
            'span[dir="ltr"]',
        '[class*="update-components-text"] ' +
            'span[dir="ltr"]'
    ];
    for (const sel of bodySelectors) {
        const el = postEl.querySelector(sel);
        if (el) {
            const t = (el.innerText ||
                el.textContent || '').trim();
            if (t && t.length > 10 &&
                !parts.includes(t)) {
                parts.push(t);
                break;
            }
        }
    }

    const titleSel =
        '.feed-shared-article__title, ' +
        '.feed-shared-article__title-text, ' +
        '.update-components-article__title, ' +
        '.feed-shared-article-card__title, ' +
        '.article-card__title span';
    const titleEls = postEl.querySelectorAll(titleSel);
    for (const el of titleEls) {
        const t = (el.innerText ||
            el.textContent || '').trim();
        if (t && !parts.includes(t)) parts.push(t);
    }

    if (parts.length > 0) return parts.join(' ');

    const spans = postEl.querySelectorAll(
        'span[dir="ltr"]'
    );
    let longest = '';
    for (const s of spans) {
        const t = (s.innerText ||
            s.textContent || '').trim();
        if (t.length > longest.length) longest = t;
    }
    if (longest) return longest;

    const allText = (postEl.innerText ||
        postEl.textContent || '').trim();
    if (allText.length > 50) {
        const lines = allText.split('\n')
            .filter(l => l.trim().length > 15);
        if (lines.length > 0) {
            return lines.slice(0, 3).join(' ');
        }
    }
    return allText.substring(0, 500);
}

function getPostAuthor(postEl) {
    if (!postEl) return 'Unknown';
    const sel =
        '.update-components-actor__name span, ' +
        '.feed-shared-actor__name span, ' +
        'a.update-components-actor__meta-link span, ' +
        '[data-test-id*="actor-name"] span, ' +
        'span.feed-shared-actor__title span';
    const authorEl = postEl.querySelector(sel);
    return authorEl
        ? (authorEl.innerText ||
            authorEl.textContent || '').trim()
            .split('\n')[0]
        : 'Unknown';
}

function getPostUrn(postEl) {
    if (!postEl) return '';
    return postEl.getAttribute('data-urn') ||
        postEl.getAttribute('data-id') ||
        postEl.querySelector('[data-urn]')
            ?.getAttribute('data-urn') ||
        postEl.querySelector('[data-id]')
            ?.getAttribute('data-id') || '';
}

function isLikeButton(btn) {
    if (!btn) return false;
    const label = btn.getAttribute('aria-label') || '';
    return /Like|Gostei|React|Reagir/i.test(label);
}

function isCommentButton(btn) {
    if (!btn) return false;
    const label = btn.getAttribute('aria-label') || '';
    const text = (btn.innerText ||
        btn.textContent || '').trim();
    return label.includes('Comment') ||
        label.includes('Comentar') ||
        text === 'Comment' ||
        text === 'Comentar';
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getReactionType,
        classifyPost,
        buildCommentFromPost,
        extractTopic,
        extractKeyPhrase,
        extractConcepts,
        humanize,
        detectLanguage,
        isReactablePost,
        shouldSkipPost,
        isCompanyFollowText,
        getPostText,
        getPostAuthor,
        getPostUrn,
        isLikeButton,
        isCommentButton,
        POST_CATEGORIES,
        CATEGORY_TEMPLATES,
        CATEGORY_TEMPLATES_PT,
        TOPIC_MAP
    };
}
