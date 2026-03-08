var POST_CATEGORIES = {
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
        'muito feliz', 'alcancei', 'consegui',
        'alegria', 'empolgado', 'empolgada',
        'compartilho', 'novo desafio', 'nova etapa',
        'formado', 'formei', 'graduação',
        'mestrado', 'doutorado', 'pós-graduação',
        'diploma', 'concluí'
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
        'piada', 'kkkk', 'rsrs', 'engraçado',
        'plot twist', 'spoiler', 'nobody told me',
        'surprise', 'turns out', 'apparently',
        'the real', 'truth is', 'unpaid intern',
        'ctrl+z', 'git blame', 'rubber duck',
        'works in production', 'ship it',
        'no one:', 'me:', 'reality:',
        'expectation', 'vs reality',
        'never getting paid', 'paid for thinking',
        'send help', 'pray for me',
        'ask me how i know', 'don\'t ask',
        'learned the hard way', 'why is this',
        'ninguém me avisou', 'socorro', 'rindo',
        'chorei', 'mas pelo menos', 'e eu achando'
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
        'novo emprego', 'nova posição', 'fui contratado',
        'fazer parte', 'novo desafio', 'nova jornada',
        'bora pro próximo', 'vamos pra cima',
        'nova oportunidade', 'aceitei'
    ]
};

var CATEGORY_TEMPLATES = {
    hiring: [
        'what does the day-to-day look like?',
        'any remote flexibility on this one?',
        'know someone who might be a good fit, ' +
            'sharing',
        'is {topic} the main focus or more of ' +
            'a cross-functional thing?',
        'what\'s the team size?',
        'is this open to candidates ' +
            'relocating from abroad?'
    ],
    achievement: [
        'congrats!',
        'congrats, good luck!',
        'happy for you!',
        'congrats!'
    ],
    technical: [
        'we ran into this last month, ' +
            'wish we had this diagram then',
        'the tricky part with {topic} is ' +
            'knowing when NOT to use it',
        'had to learn {topic} the hard way ' +
            'on a deadline, this would\'ve helped',
        'bookmarking, {topic} always comes up ' +
            'in interviews',
        '{keyPhrase} - yep, learned that one ' +
            'the hard way',
        'we debated this exact thing on our ' +
            'team last week',
        'how do you handle {topic} at scale ' +
            'though? that\'s where it gets messy',
        'our team switched to this approach ' +
            'and it made a real difference',
        '{topic} is one of those things ' +
            'that looks simple until you implement it'
    ],
    question: [
        'honestly depends on the context but ' +
            'I\'d lean {keyPhrase}',
        'been going back and forth on this too',
        'we tried both and honestly {topic} ' +
            'came down to "it depends"',
        'following, curious what others think',
        'for me {keyPhrase}, but I get the ' +
            'other side too'
    ],
    tips: [
        'the {topic} one is so true',
        'wish someone told me {keyPhrase} ' +
            'like 2 years ago',
        'sending this to my team',
        'the {topic} tip alone is worth it',
        '{keyPhrase} is underrated advice'
    ],
    story: [
        'been through something similar, ' +
            'it really shifts your perspective',
        'you don\'t hear people talk about ' +
            '{topic} this honestly',
        '{keyPhrase} - yeah, that part',
        'appreciate you sharing this'
    ],
    news: [
        'didn\'t see this coming',
        'been watching {topic}, this is big',
        'curious how this plays out',
        '{topic} is moving so fast',
        'was literally talking about this yesterday'
    ],
    humor: [
        'lmaooo',
        'hahaha too real',
        'ok I laughed',
        'didn\'t have to call us out like that',
        'sent this to my team chat',
        'me every monday honestly',
        'this is why I have trust issues with {topic}',
        'stop it, it\'s too early for this',
        'alright alright fair enough haha'
    ],
    critique: [
        'fair point honestly',
        'been thinking about this too',
        'interesting perspective',
        'yeah this keeps coming up lately',
        '{keyPhrase} - interesting take'
    ],
    motivation: [
        'needed to hear this today',
        'forwarding this to a friend',
        'the {topic} part is so true',
        'yeah, good reminder'
    ],
    project: [
        'just checked it out, pretty cool',
        'how long did this take?',
        'is the code open source?',
        'the {topic} part is nice, ' +
            'what stack did you use?',
        'bookmarked, might try this out'
    ],
    jobseeking: [
        'sharing for reach, good luck!',
        'someone in my network might have ' +
            'something, sharing',
        'good luck with the search!',
        '{topic} people are in demand, ' +
            'you\'ll find something',
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
        'interesting take on {topic}',
        'hadn\'t thought about it that way',
        'a colleague was just talking about ' +
            'this yesterday',
        'yeah {keyPhrase}, makes sense',
        'curious what others think about this'
    ]
};

var CATEGORY_TEMPLATES_PT = {
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
        'parabéns!',
        'parabéns, boa sorte!',
        'parabéns, sucesso!',
        'parabéns!'
    ],
    technical: [
        'a gente passou por isso mês passado, ' +
            'queria ter visto esse diagrama antes',
        'o pulo do gato com {topic} é saber ' +
            'quando NÃO usar',
        'tive que aprender {topic} no susto, ' +
            'isso aqui teria ajudado demais',
        'salvando, {topic} sempre cai em entrevista',
        '{keyPhrase} - é, aprendi na marra também',
        'a gente debateu exatamente isso no time ' +
            'semana passada',
        'como vc lida com {topic} em escala? ' +
            'é aí que complica',
        'nosso time migrou pra essa abordagem ' +
            'e fez diferença real'
    ],
    question: [
        'depende do contexto mas eu iria de ' +
            '{keyPhrase}',
        'também fico nessa dúvida',
        'a gente tentou dos dois jeitos e {topic} ' +
            'sempre foi "depende"',
        'seguindo, curioso pelas respostas',
        'pra mim {keyPhrase}, mas entendo ' +
            'o outro lado'
    ],
    tips: [
        'a de {topic} é muito boa',
        'queria ter ouvido {keyPhrase} ' +
            'uns 2 anos atrás',
        'mandei pro time',
        'só a dica de {topic} já vale'
    ],
    story: [
        'passei por algo parecido, muda ' +
            'a perspectiva',
        'vc não vê gente falando de {topic} ' +
            'assim com essa honestidade',
        '{keyPhrase} - é, essa parte',
        'valeu por compartilhar'
    ],
    news: [
        'eita, não esperava essa',
        'acompanhando {topic}, isso é grande',
        'curioso como isso vai afetar o mercado',
        '{topic} tá voando',
        'tava falando disso ontem literalmente'
    ],
    humor: [
        'kkkkk',
        'hahahaha real demais',
        'ok eu ri',
        'não precisava me atacar assim',
        'mandei pro grupo do time',
        'eu toda segunda basicamente',
        'por isso que eu tenho trauma de {topic}',
        'para, é cedo demais pra isso',
        'tá bom tá bom justo hahaha'
    ],
    critique: [
        'justo, faz sentido',
        'tô pensando nisso também',
        'perspectiva interessante',
        'esse assunto tá aparecendo bastante',
        '{keyPhrase} - ponto interessante'
    ],
    motivation: [
        'precisava ouvir isso hoje',
        'mandei pra um amigo',
        'a parte de {topic} é muito real',
        'é, bom lembrete'
    ],
    project: [
        'dei uma olhada, bem legal',
        'quanto tempo levou?',
        'o código tá aberto?',
        'a parte de {topic} ficou boa, ' +
            'qual stack vc usou?',
        'salvei, quero testar'
    ],
    jobseeking: [
        'compartilhando, boa sorte!',
        'alguém da minha rede pode ter algo, ' +
            'compartilhando',
        'boa sorte na busca!',
        'gente de {topic} tá em alta, ' +
            'vai dar certo'
    ],
    newjob: [
        'parabéns pela nova fase!',
        'show, boa sorte!',
        'boa, sucesso!',
        'parabéns!'
    ],
    generic: [
        'olha interessante sobre {topic}',
        'não tinha pensado por esse lado',
        'um colega tava falando disso ontem',
        'é, {keyPhrase}, faz sentido',
        'curioso o que os outros acham disso'
    ]
};

var CATEGORY_FOLLOW_UPS = {
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

var CATEGORY_FOLLOW_UPS_PT = {
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

var OPENERS = [
    '', '', '', '', '',
    'honestly, ', 'yeah, ', '',
    '', ''
];

var OPENERS_PT = [
    '', '', '', '', '',
    'sinceramente, ', '', '',
    '', ''
];

var TOPIC_MAP = [
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

var HIGH_SIGNAL_CATEGORIES = new Set([
    'achievement', 'hiring', 'jobseeking', 'newjob',
    'humor'
]);

var PT_MARKERS = [
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

var CONCEPT_PATTERNS = [
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

var COMPOSED_EN = {
    technical: [
        (c) => 'we ran into ' + c[0] +
            ' last month' +
            (c[1] ? ', ended up going with ' + c[1]
                : '') + '. wish we had this then',
        (c) => c[0] + ' looks simple until you ' +
            'actually build it',
        (c) => 'had to learn ' + c[0] +
            ' on a deadline, not fun. ' +
            'bookmarking this',
        (c) => 'how do you handle ' + c[0] +
            ' at scale though?',
        (c) => 'our team debated ' + c[0] +
            (c[1] ? ' vs ' + c[1] : '') +
            ' just last week haha',
        (c) => 'been using ' + c[0] +
            ' for a while but never thought ' +
            'about it this way',
    ],
    hiring: [
        (c) => 'is this remote friendly?',
        (c) => 'know someone who\'d be a fit, sharing',
        (c) => 'what\'s the team size' +
            (c[0] ? ' for ' + c[0] : '') + '?',
        (c) => 'cool, what\'s the stack?',
        (c) => 'sharing for reach',
    ],
    achievement: [
        (c) => 'congrats!',
        (c) => 'congrats, good luck!',
        (c) => 'happy for you!',
    ],
    question: [
        (c) => 'honestly depends, ' +
            (c[0] ? 'with ' + c[0] + ' I\'d say'
                : 'in my experience') +
            ' start simple',
        (c) => 'been going back and forth on this too' +
            (c[0] ? ', especially with ' + c[0] : ''),
        (c) => 'following, curious what others think',
    ],
    tips: [
        (c) => c[0]
            ? 'the ' + c[0] + ' one is so true'
            : 'bookmarking this',
        (c) => 'wish I knew ' +
            (c[0] || 'this') + ' 2 years ago',
        (c) => 'sending this to my team',
    ],
    story: [
        (c) => 'been through something similar' +
            (c[0] ? ' with ' + c[0] : ''),
        (c) => 'appreciate you sharing this',
        (c) => 'you don\'t hear people talk about ' +
            (c[0] || 'this') + ' honestly like this',
    ],
    news: [
        (c) => (c[0] || 'this') +
            ' is moving fast',
        (c) => 'been watching ' +
            (c[0] || 'this') +
            ', curious where it goes',
    ],
    humor: [
        (c) => 'hahaha' +
            (c[0] ? ' the ' + c[0] + ' part' : ''),
        (c) => 'lol sent this to my team chat',
        (c) => 'ok I laughed' +
            (c[0] ? ', the ' + c[0] +
                ' bit is too real' : ''),
        (c) => 'didn\'t have to call us out ' +
            'like that haha',
    ],
    critique: [
        (c) => 'fair point' +
            (c[0] ? ' about ' + c[0] : ''),
        (c) => 'been thinking about this too',
        (c) => 'interesting take' +
            (c[0] ? ' on ' + c[0] : ''),
        (c) => 'yeah this comes up a lot in' +
            ' conversations lately',
    ],
    motivation: [
        (c) => 'needed to hear this today',
        (c) => 'forwarding this',
        (c) => 'yeah' +
            (c[0] ? ', ' + c[0] + ' is no joke' : '') +
            '. good reminder',
    ],
    project: [
        (c) => 'how long did ' +
            (c[0] || 'this') + ' take?',
        (c) => 'just checked it out, cool. ' +
            'is the code open source?',
        (c) => 'bookmarked, might try this',
    ],
    jobseeking: [
        (c) => 'sharing for reach, good luck!',
        (c) => (c[0] || 'your background') +
            ' is in demand, you\'ll find something',
    ],
    newjob: [
        (c) => 'congrats!',
        (c) => 'nice, good luck!',
    ],
    generic: [
        (c) => 'hadn\'t thought about ' +
            (c[0] || 'it') + ' that way',
        (c) => 'a coworker was just talking about ' +
            (c[0] || 'this') + ' yesterday',
        (c) => 'interesting take',
    ]
};

var COMPOSED_PT = {
    technical: [
        (c) => 'a gente passou por isso com ' + c[0] +
            ' mês passado' +
            (c[1] ? ', acabamos indo de ' + c[1] : ''),
        (c) => c[0] + ' parece simples até vc ' +
            'implementar de verdade',
        (c) => 'tive que aprender ' + c[0] +
            ' no susto, isso teria ajudado',
        (c) => 'como vc lida com ' + c[0] +
            ' em escala?',
        (c) => 'o time debateu ' + c[0] +
            (c[1] ? ' vs ' + c[1] : '') +
            ' semana passada haha',
        (c) => 'uso ' + c[0] +
            ' faz tempo mas nunca pensei ' +
            'por esse lado',
    ],
    hiring: [
        (c) => 'aceita remoto?',
        (c) => 'conheço gente que pode se encaixar',
        (c) => 'como é o time' +
            (c[0] ? ' de ' + c[0] : '') + '?',
        (c) => 'compartilhando pra dar alcance',
        (c) => 'qual a stack?',
    ],
    achievement: [
        (c) => 'parabéns!',
        (c) => 'parabéns, boa sorte!',
        (c) => 'parabéns, sucesso!',
    ],
    question: [
        (c) => 'depende, mas ' +
            (c[0] ? 'com ' + c[0] + ' eu iria de'
                : 'pela minha experiência') +
            ' começar simples',
        (c) => 'também fico nessa' +
            (c[0] ? ', ainda mais com ' + c[0] : ''),
        (c) => 'seguindo, curioso pelas respostas',
    ],
    tips: [
        (c) => c[0]
            ? 'a de ' + c[0] + ' é muito boa'
            : 'salvando',
        (c) => 'queria ter ouvido isso ' +
            'uns 2 anos atrás',
        (c) => 'mandei pro time',
    ],
    story: [
        (c) => 'passei por algo parecido' +
            (c[0] ? ' com ' + c[0] : ''),
        (c) => 'valeu por compartilhar',
        (c) => 'vc não vê gente falando de ' +
            (c[0] || 'isso') + ' assim',
    ],
    news: [
        (c) => (c[0] || 'isso') + ' tá voando',
        (c) => 'acompanhando ' +
            (c[0] || 'isso') +
            ', curioso onde vai dar',
    ],
    humor: [
        (c) => 'kkkkk' +
            (c[0] ? ' a parte de ' + c[0] : ''),
        (c) => 'mandei pro grupo do time',
        (c) => 'ok eu ri' +
            (c[0] ? ', ' + c[0] +
                ' é real demais' : ''),
        (c) => 'não precisava atacar assim hahaha',
    ],
    critique: [
        (c) => 'justo' +
            (c[0] ? ' sobre ' + c[0] : ''),
        (c) => 'tô pensando nisso também',
        (c) => 'ponto interessante' +
            (c[0] ? ' sobre ' + c[0] : ''),
        (c) => 'esse assunto tá aparecendo bastante' +
            ' ultimamente',
    ],
    motivation: [
        (c) => 'precisava ouvir isso hoje',
        (c) => 'mandei pra um amigo',
        (c) => 'é' +
            (c[0] ? ', ' + c[0] + ' não é fácil' : '') +
            '. bom lembrete',
    ],
    project: [
        (c) => 'quanto tempo levou ' +
            (c[0] || 'isso') + '?',
        (c) => 'dei uma olhada, legal. ' +
            'o código tá aberto?',
        (c) => 'salvei, quero testar',
    ],
    jobseeking: [
        (c) => 'compartilhando, boa sorte!',
        (c) => (c[0] || 'sua experiência') +
            ' tá em alta, vai dar certo',
    ],
    newjob: [
        (c) => 'parabéns!',
        (c) => 'show, boa sorte!',
    ],
    generic: [
        (c) => 'não tinha pensado em ' +
            (c[0] || 'isso') + ' assim',
        (c) => 'um colega tava falando de ' +
            (c[0] || 'isso') + ' ontem',
        (c) => 'interessante',
    ]
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        POST_CATEGORIES,
        CATEGORY_TEMPLATES,
        CATEGORY_TEMPLATES_PT,
        CATEGORY_FOLLOW_UPS,
        CATEGORY_FOLLOW_UPS_PT,
        OPENERS,
        OPENERS_PT,
        TOPIC_MAP,
        HIGH_SIGNAL_CATEGORIES,
        PT_MARKERS,
        CONCEPT_PATTERNS,
        COMPOSED_EN,
        COMPOSED_PT
    };
}
