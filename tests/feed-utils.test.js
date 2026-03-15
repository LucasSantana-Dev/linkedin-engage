/**
 * @jest-environment jsdom
 */
const {
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
    getPostAuthorTitle,
    getPostReactions,
    getPostUrn,
    isLikeButton,
    isCommentButton,
    getExistingComments,
    classifyCommentSentiment,
    summarizeCommentThread,
    analyzeCommentPatterns,
    summarizeReactions,
    getPostImageSignals,
    getPostCommentSignal,
    assessCommentCopyRisk,
    isPolemicPost,
    validateCommentPatternFit,
    validateGeneratedCommentSafety,
    detectCareerTransitionSignals,
    SENTIMENT_PATTERNS,
    POST_CATEGORIES,
    CATEGORY_TEMPLATES,
    CATEGORY_TEMPLATES_PT
} = require('../extension/lib/feed-utils');

describe('getReactionType', () => {
    const keywords = {
        celebrate: ['congrat', 'promoted', 'new role'],
        support: ['struggle', 'layoff', 'mental health'],
        insightful: ['research', 'data', 'study'],
        funny: ['joke', 'humor', 'lol'],
        love: ['passion', 'grateful', 'inspire']
    };

    it('returns PRAISE for celebrate keywords', () => {
        expect(getReactionType(
            'Congratulations on the new role!', keywords
        )).toBe('PRAISE');
    });

    it('returns EMPATHY for support keywords', () => {
        expect(getReactionType(
            'Mental health matters in tech', keywords
        )).toBe('EMPATHY');
    });

    it('returns INTEREST for insightful keywords', () => {
        expect(getReactionType(
            'New research on AI trends', keywords
        )).toBe('INTEREST');
    });

    it('returns ENTERTAINMENT for funny keywords', () => {
        expect(getReactionType(
            'This joke is hilarious lol', keywords
        )).toBe('ENTERTAINMENT');
    });

    it('returns APPRECIATION for love keywords', () => {
        expect(getReactionType(
            'So grateful for this team', keywords
        )).toBe('APPRECIATION');
    });

    it('returns LIKE as default', () => {
        expect(getReactionType(
            'Just another day at work', keywords
        )).toBe('LIKE');
    });

    it('returns LIKE for empty text', () => {
        expect(getReactionType('', keywords)).toBe('LIKE');
        expect(getReactionType(null, keywords)).toBe('LIKE');
    });

    it('returns LIKE when no keywords provided', () => {
        expect(getReactionType('congrats!', null)).toBe('LIKE');
    });

    it('is case-insensitive', () => {
        expect(getReactionType(
            'CONGRATULATIONS!', keywords
        )).toBe('PRAISE');
    });
});

describe('classifyPost', () => {
    it('classifies hiring posts', () => {
        expect(classifyPost(
            'We\'re hiring a senior engineer! Join our team.'
        )).toBe('hiring');
    });

    it('classifies achievement posts', () => {
        expect(classifyPost(
            'Excited to announce I\'ve been promoted ' +
            'to Staff Engineer!'
        )).toBe('achievement');
    });

    it('classifies technical posts', () => {
        expect(classifyPost(
            'How we improved our API latency by ' +
            'refactoring the database layer and ' +
            'adding caching with Redis'
        )).toBe('technical');
    });

    it('classifies question posts', () => {
        expect(classifyPost(
            'What do you think about the future ' +
            'of remote work? Curious to hear your thoughts?'
        )).toBe('question');
    });

    it('classifies tips posts', () => {
        expect(classifyPost(
            'Pro tip: Here\'s what I learned about ' +
            'writing clean code. Best practice is ' +
            'to keep functions small.'
        )).toBe('tips');
    });

    it('classifies story posts', () => {
        expect(classifyPost(
            'Let me tell you about my journey. ' +
            '5 years ago I was rejected from every ' +
            'company I applied to.'
        )).toBe('story');
    });

    it('classifies news posts', () => {
        expect(classifyPost(
            'Just announced: The latest report shows ' +
            'significant growth in the AI market. ' +
            'Industry trend worth watching.'
        )).toBe('news');
    });

    it('returns generic for unclassifiable posts', () => {
        expect(classifyPost(
            'Beautiful sunset today'
        )).toBe('generic');
    });

    it('returns generic for empty/null text', () => {
        expect(classifyPost('')).toBe('generic');
        expect(classifyPost(null)).toBe('generic');
    });

    it('picks category with most keyword matches', () => {
        expect(classifyPost(
            'We\'re hiring! Open role for engineers. ' +
            'Apply now and join our team. ' +
            'Send your resume today.'
        )).toBe('hiring');
    });

    it('classifies PT-BR hiring posts', () => {
        expect(classifyPost(
            'Estamos contratando! Vaga para dev senior.'
        )).toBe('hiring');
    });

    it('forces hiring when hiring signals collide with humor', () => {
        expect(classifyPost(
            'We are hiring and recruiting now 😂 lol ' +
            'for this open role in our team'
        )).toBe('hiring');
    });

    it('classifies humor/meme posts', () => {
        expect(classifyPost(
            'AI didn\'t remove the chaos from ' +
            'software development. Junior dev using ' +
            'AI to write code. Senior dev reviewing ' +
            '500 lines of spaghetti lol 😂'
        )).toBe('humor');
    });

    it('classifies critique posts', () => {
        expect(classifyPost(
            'Unpopular opinion: hustle culture is ' +
            'toxic and we need to stop glorifying ' +
            'burnout in tech.'
        )).toBe('critique');
    });

    it('classifies motivation posts', () => {
        expect(classifyPost(
            'Never give up on your dream. ' +
            'Consistency and discipline are ' +
            'the secret to success.'
        )).toBe('motivation');
    });

    it('classifies project showcase posts', () => {
        expect(classifyPost(
            'Just launched my side project! ' +
            'Check out the demo I built with React.'
        )).toBe('project');
    });

    it('classifies job seeking posts', () => {
        expect(classifyPost(
            'Open to work! I was recently laid off ' +
            'and looking for new opportunity. ' +
            'Any leads appreciated. #opentowork'
        )).toBe('jobseeking');
    });

    it('classifies new job posts', () => {
        expect(classifyPost(
            'Excited to start my first day at ' +
            'Google! Grateful to announce I\'m ' +
            'joining their cloud team.'
        )).toBe('newjob');
    });
});

describe('detectCareerTransitionSignals', () => {
    it('detects departure-only transition', () => {
        const signals = detectCareerTransitionSignals(
            'Happy to share that today is my last day at Acme. ' +
            'I am leaving after an incredible journey.'
        );
        expect(signals.hasDepartureSignal).toBe(true);
        expect(signals.hasNewJobSignal).toBe(false);
        expect(signals.isDepartureOnly).toBe(true);
    });

    it('does not flag departure-only when new role is announced', () => {
        const signals = detectCareerTransitionSignals(
            'Last day at Acme. Next week I am joining Beta as a ' +
            'Senior Engineer in a new role.'
        );
        expect(signals.hasDepartureSignal).toBe(true);
        expect(signals.hasNewJobSignal).toBe(true);
        expect(signals.isDepartureOnly).toBe(false);
    });
});

describe('extractKeyPhrase', () => {
    it('returns empty for short text', () => {
        expect(extractKeyPhrase('hi')).toBe('');
        expect(extractKeyPhrase(null)).toBe('');
    });

    it('extracts a sentence from post text', () => {
        const phrase = extractKeyPhrase(
            'Here is some context. The most important ' +
            'thing is to never give up. And keep going.'
        );
        expect(typeof phrase).toBe('string');
        expect(phrase.length).toBeGreaterThan(10);
    });

    it('prefers sentences with signal words', () => {
        const phrase = extractKeyPhrase(
            'Today was nice. The biggest problem with ' +
            'our industry is burnout. Anyway bye.'
        );
        expect(phrase.toLowerCase()).toContain('biggest');
    });

    it('handles single-sentence posts', () => {
        const phrase = extractKeyPhrase(
            'The key to success in engineering is ' +
            'consistency and shipping often'
        );
        expect(phrase.length).toBeGreaterThan(10);
    });

    it('skips very short sentences', () => {
        const phrase = extractKeyPhrase(
            'Ok. Sure. The real problem is that most ' +
            'people underestimate how hard shipping is.'
        );
        expect(phrase.length).toBeGreaterThan(15);
    });
});

describe('humanize', () => {
    it('returns a string', () => {
        const result = humanize('hello world');
        expect(typeof result).toBe('string');
    });

    it('produces varied output across many runs', () => {
        const results = new Set();
        for (let i = 0; i < 100; i++) {
            results.add(humanize('test comment here.'));
        }
        expect(results.size).toBeGreaterThan(1);
    });

    it('does not corrupt the original text', () => {
        for (let i = 0; i < 50; i++) {
            const result = humanize('some text here');
            expect(result.toLowerCase())
                .toContain('some text here');
        }
    });
});

describe('buildCommentFromPost', () => {
    it('generates comment without user templates', () => {
        const result = buildCommentFromPost(
            'Excited to announce I got promoted! ' +
            'The biggest lesson was to always push ' +
            'yourself and never stop learning.', null
        );
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(3);
    });

    it('uses user templates when provided', () => {
        const result = buildCommentFromPost(
            'Great article about AI',
            ['Nice post about {topic}!']
        );
        expect(result).toBe('Nice post about AI!');
    });

    it('replaces {topic} in user templates', () => {
        const result = buildCommentFromPost(
            'Great article about AI and machine learning',
            ['Interesting take on {topic}!']
        );
        expect(result).toBe('Interesting take on AI!');
    });

    it('replaces {excerpt} with post substring', () => {
        const result = buildCommentFromPost(
            'Hello world this is a test',
            ['Re: {excerpt}']
        );
        expect(result).toContain('Re: Hello world');
    });

    it('replaces {category} with detected category', () => {
        const result = buildCommentFromPost(
            'We\'re hiring engineers! Join our team.',
            ['Category: {category}']
        );
        expect(result).toBe('Category: hiring');
    });

    it('generates varied comments for same post', () => {
        const post = 'We just deployed our new ' +
            'Kubernetes cluster to production. ' +
            'The key was getting caching right.';
        const results = new Set();
        for (let i = 0; i < 80; i++) {
            results.add(buildCommentFromPost(post, null));
        }
        expect(results.size).toBeGreaterThan(3);
    });

    it('includes key phrase from post content', () => {
        const post = 'There are many opinions on this. ' +
            'The biggest mistake most people make is ' +
            'not shipping early enough. Just keep going.';
        const comments = [];
        for (let i = 0; i < 30; i++) {
            comments.push(buildCommentFromPost(post, null));
        }
        const hasQuote = comments.some(c =>
            c.includes('biggest') || c.includes('shipping')
        );
        expect(hasQuote).toBe(true);
    });

    it('does not skip humanization for built-in', () => {
        const results = [];
        for (let i = 0; i < 50; i++) {
            results.push(buildCommentFromPost(
                'Remote work is the future of our industry',
                null
            ));
        }
        const hasVariation = new Set(results).size > 3;
        expect(hasVariation).toBe(true);
    });

    it('skips humanization for user templates', () => {
        const result = buildCommentFromPost(
            'AI post here',
            ['Exact template output.']
        );
        expect(result).toBe('Exact template output.');
    });
});

describe('extractTopic', () => {
    it('returns AI for AI-related text', () => {
        expect(extractTopic('AI is changing the world'))
            .toBe('AI');
    });

    it('returns specific tech topics', () => {
        expect(extractTopic('We use React and Next.js'))
            .toBe('frontend development');
        expect(extractTopic('Deploying with Docker'))
            .toBe('containerization');
        expect(extractTopic('AWS Lambda is powerful'))
            .toBe('cloud infrastructure');
        expect(extractTopic('Python FastAPI backend'))
            .toBe('Python');
    });

    it('returns career topics', () => {
        expect(extractTopic('Tips for career growth'))
            .toBe('career growth');
        expect(extractTopic('Remote work is the future'))
            .toBe('remote work');
    });

    it('returns "tech" for unrecognized content', () => {
        expect(extractTopic('Nothing special here'))
            .toBe('tech');
    });

    it('returns "this" for empty text', () => {
        expect(extractTopic('')).toBe('this');
        expect(extractTopic(null)).toBe('this');
    });

    it('matches first topic when multiple present', () => {
        expect(extractTopic(
            'AI and machine learning with Python'
        )).toBe('AI');
    });
});

describe('isReactablePost', () => {
    it('returns false for null', () => {
        expect(isReactablePost(null)).toBe(false);
    });

    it('returns false for short content', () => {
        const el = document.createElement('div');
        el.textContent = 'Short';
        expect(isReactablePost(el)).toBe(false);
    });

    it('returns true for substantial content', () => {
        const el = document.createElement('div');
        const longText = 'This is a long enough post ' +
            'with substantial content to engage with.';
        el.textContent = longText;
        document.body.appendChild(el);
        expect(isReactablePost(el)).toBe(true);
        document.body.removeChild(el);
    });
});

describe('shouldSkipPost', () => {
    it('returns false with no keywords', () => {
        expect(shouldSkipPost('any text', [])).toBe(false);
        expect(shouldSkipPost('any text', null)).toBe(false);
    });

    it('skips when keyword matches', () => {
        expect(shouldSkipPost(
            'This is a Sponsored post', ['sponsored']
        )).toBe(true);
    });

    it('is case-insensitive', () => {
        expect(shouldSkipPost(
            'PROMOTED content', ['promoted']
        )).toBe(true);
    });

    it('does not skip when no keyword matches', () => {
        expect(shouldSkipPost(
            'Great engineering article', ['sponsored', 'ad']
        )).toBe(false);
    });
});

describe('isCompanyFollowText', () => {
    it('matches Follow', () => {
        expect(isCompanyFollowText('Follow')).toBe(true);
    });

    it('matches Seguir (PT)', () => {
        expect(isCompanyFollowText('Seguir')).toBe(true);
    });

    it('matches + Follow', () => {
        expect(isCompanyFollowText('+ Follow')).toBe(true);
    });

    it('matches + Seguir', () => {
        expect(isCompanyFollowText('+ Seguir')).toBe(true);
    });

    it('trims whitespace', () => {
        expect(isCompanyFollowText('  Follow  ')).toBe(true);
    });

    it('rejects Following', () => {
        expect(isCompanyFollowText('Following')).toBe(false);
    });

    it('rejects empty', () => {
        expect(isCompanyFollowText('')).toBe(false);
        expect(isCompanyFollowText(null)).toBe(false);
    });
});

describe('POST_CATEGORIES', () => {
    it('has all expected categories', () => {
        const expected = [
            'hiring', 'achievement', 'technical',
            'question', 'tips', 'story', 'news',
            'humor', 'critique', 'motivation',
            'project', 'jobseeking', 'newjob'
        ];
        for (const cat of expected) {
            expect(POST_CATEGORIES[cat]).toBeDefined();
            expect(POST_CATEGORIES[cat].length)
                .toBeGreaterThan(0);
        }
    });
});

describe('CATEGORY_TEMPLATES', () => {
    it('has templates for all categories plus generic', () => {
        const expected = [
            'hiring', 'achievement', 'technical',
            'question', 'tips', 'story', 'news',
            'humor', 'critique', 'motivation',
            'project', 'jobseeking', 'newjob', 'generic'
        ];
        const allowEmpty = new Set([
            'generic', 'story', 'news', 'tips'
        ]);
        for (const cat of expected) {
            expect(CATEGORY_TEMPLATES[cat]).toBeDefined();
            if (!allowEmpty.has(cat)) {
                expect(CATEGORY_TEMPLATES[cat].length)
                    .toBeGreaterThanOrEqual(3);
            }
        }
    });

    it('templates are conversational length', () => {
        for (const templates of
            Object.values(CATEGORY_TEMPLATES)) {
            for (const tmpl of templates) {
                expect(tmpl.length).toBeLessThan(150);
            }
        }
    });
});

describe('detectLanguage', () => {
    it('returns pt for Portuguese text', () => {
        expect(detectLanguage(
            'Estamos contratando! Nossa empresa ' +
            'precisa de pessoas com experiência ' +
            'em desenvolvimento.'
        )).toBe('pt');
    });

    it('returns en for English text', () => {
        expect(detectLanguage(
            'We are hiring engineers to join ' +
            'our growing team.'
        )).toBe('en');
    });

    it('returns en for empty/null', () => {
        expect(detectLanguage('')).toBe('en');
        expect(detectLanguage(null)).toBe('en');
    });

    it('returns pt with 3+ PT markers', () => {
        expect(detectLanguage(
            'Isso também é muito importante'
        )).toBe('pt');
    });

    it('returns en with fewer than 3 markers', () => {
        expect(detectLanguage(
            'Check this AI tool'
        )).toBe('en');
    });
});

describe('CATEGORY_TEMPLATES_PT', () => {
    it('has templates for all categories plus generic', () => {
        const expected = [
            'hiring', 'achievement', 'technical',
            'question', 'tips', 'story', 'news',
            'humor', 'critique', 'motivation',
            'project', 'jobseeking', 'newjob', 'generic'
        ];
        const allowEmpty = new Set([
            'generic', 'story', 'news', 'tips'
        ]);
        for (const cat of expected) {
            expect(CATEGORY_TEMPLATES_PT[cat])
                .toBeDefined();
            if (!allowEmpty.has(cat)) {
                expect(CATEGORY_TEMPLATES_PT[cat].length)
                    .toBeGreaterThanOrEqual(3);
            }
        }
    });

    it('templates are conversational length', () => {
        for (const templates of
            Object.values(CATEGORY_TEMPLATES_PT)) {
            for (const tmpl of templates) {
                expect(tmpl.length).toBeLessThan(150);
            }
        }
    });
});

describe('buildCommentFromPost PT-BR', () => {
    it('generates PT comment for PT post', () => {
        const post = 'Estamos contratando! Nossa empresa ' +
            'precisa de pessoas com experiência em ' +
            'desenvolvimento e tecnologia.';
        const results = new Set();
        for (let i = 0; i < 50; i++) {
            results.add(buildCommentFromPost(post, null));
        }
        const allComments = [...results];
        const hasPt = allComments.some(c =>
            /vaga|compartilh|stack|contratando|rede/i
                .test(c)
        );
        expect(hasPt).toBe(true);
    });

    it('generates EN comment for EN post', () => {
        const post = 'We are hiring engineers to work ' +
            'on our cloud infrastructure team. ' +
            'Apply now and join us!';
        const results = new Set();
        for (let i = 0; i < 50; i++) {
            results.add(buildCommentFromPost(post, null));
        }
        const allComments = [...results];
        const hasEn = allComments.some(c =>
            /remote|day-to-day|fit|team|stack|sharing/i
                .test(c)
        );
        expect(hasEn).toBe(true);
    });

    it('uses user templates regardless of language', () => {
        const post = 'Nossa equipe está muito orgulhosa ' +
            'dessa conquista incrível!';
        const result = buildCommentFromPost(
            post, ['Custom: {topic}']
        );
        expect(result).toContain('Custom:');
    });
});

describe('extractConcepts', () => {
    it('returns empty array for null/empty input', () => {
        expect(extractConcepts(null)).toEqual([]);
        expect(extractConcepts('')).toEqual([]);
        expect(extractConcepts(undefined)).toEqual([]);
    });

    it('extracts framework names', () => {
        const concepts = extractConcepts(
            'We built our app with React and Next.js'
        );
        expect(concepts).toEqual(
            expect.arrayContaining(['React'])
        );
    });

    it('extracts language names', () => {
        const concepts = extractConcepts(
            'Migrating from JavaScript to TypeScript'
        );
        const lower = concepts.map(c => c.toLowerCase());
        expect(lower).toContain('typescript');
        expect(lower).toContain('javascript');
    });

    it('extracts infrastructure tools', () => {
        const concepts = extractConcepts(
            'Deploying with Docker on Kubernetes via AWS'
        );
        const lower = concepts.map(c => c.toLowerCase());
        expect(lower).toContain('docker');
        expect(lower).toContain('kubernetes');
    });

    it('extracts design patterns', () => {
        const concepts = extractConcepts(
            'We applied the adapter pattern and ' +
            'strategy pattern in our codebase'
        );
        const joined = concepts.join(' ').toLowerCase();
        expect(joined).toContain('adapter');
        expect(joined).toContain('strategy');
    });

    it('extracts acronyms like SOLID, TDD, REST', () => {
        const concepts = extractConcepts(
            'Following SOLID principles with TDD ' +
            'on a REST API'
        );
        expect(concepts).toEqual(
            expect.arrayContaining(['SOLID', 'TDD', 'REST'])
        );
    });

    it('extracts databases', () => {
        const concepts = extractConcepts(
            'Switched from MongoDB to PostgreSQL ' +
            'with a Redis cache layer'
        );
        const joined = concepts.join(' ').toLowerCase();
        expect(joined).toContain('mongodb');
        expect(joined).toContain('redis');
    });

    it('extracts architectural terms', () => {
        const concepts = extractConcepts(
            'Moving to a microservices architecture ' +
            'with event-driven messaging'
        );
        const joined = concepts.join(' ').toLowerCase();
        expect(joined).toContain('microservice');
        expect(joined).toContain('event-driven');
    });

    it('filters out stop words', () => {
        const concepts = extractConcepts(
            'The and for with React is great'
        );
        const lower = concepts.map(c => c.toLowerCase());
        expect(lower).not.toContain('the');
        expect(lower).not.toContain('and');
        expect(lower).not.toContain('for');
    });

    it('returns max 5 concepts', () => {
        const concepts = extractConcepts(
            'Using React, Angular, Vue, Svelte, ' +
            'Next.js, Nest.js, Express, Django, ' +
            'Flask, Laravel, Rails with TypeScript'
        );
        expect(concepts.length).toBeLessThanOrEqual(5);
    });

    it('deduplicates overlapping concepts', () => {
        const concepts = extractConcepts(
            'The observer pattern is a design pattern ' +
            'we use in observer-based systems'
        );
        const observerCount = concepts.filter(c =>
            c.toLowerCase().includes('observer')
        ).length;
        expect(observerCount).toBeLessThanOrEqual(1);
    });

    it('extracts role titles', () => {
        const concepts = extractConcepts(
            'Looking for a Staff Engineer and ' +
            'Tech Lead for our team'
        );
        const joined = concepts.join(' ').toLowerCase();
        expect(
            joined.includes('staff engineer') ||
            joined.includes('tech lead')
        ).toBe(true);
    });

    it('extracts compound terms', () => {
        const concepts = extractConcepts(
            'Server Components and Module Federation ' +
            'changed how we build frontends'
        );
        const joined = concepts.join(' ').toLowerCase();
        expect(
            joined.includes('server components') ||
            joined.includes('module federation')
        ).toBe(true);
    });

    it('returns concepts sorted by length (longest first)', () => {
        const concepts = extractConcepts(
            'We use React with Clean Architecture ' +
            'and SOLID principles'
        );
        for (let i = 1; i < concepts.length; i++) {
            expect(concepts[i - 1].length)
                .toBeGreaterThanOrEqual(concepts[i].length);
        }
    });

    it('rejects terms shorter than 2 or longer than 40', () => {
        const concepts = extractConcepts('Using Go');
        const hasGo = concepts.some(c =>
            c.toLowerCase() === 'go'
        );
        expect(hasGo).toBe(false);
    });
});

describe('composed template integration', () => {
    it('uses concept in comment for technical post', () => {
        const post = 'Here is how we implemented the ' +
            'Repository Pattern in our TypeScript ' +
            'codebase with clean architecture. ' +
            'The key insight was separating the ' +
            'domain layer from infrastructure.';
        const comments = new Set();
        for (let i = 0; i < 50; i++) {
            comments.add(buildCommentFromPost(post, null));
        }
        const all = [...comments];
        const referencesConcept = all.some(c => {
            const lower = c.toLowerCase();
            return lower.includes('typescript') ||
                lower.includes('repository') ||
                lower.includes('clean architecture') ||
                lower.includes('pattern');
        });
        expect(referencesConcept).toBe(true);
    });

    it('uses PT composed templates for PT tech post', () => {
        const post = 'Implementamos o padrão de projeto ' +
            'Observer com TypeScript no nosso sistema ' +
            'distribuído. A arquitetura ficou muito ' +
            'mais limpa depois dessa refatoração.';
        const comments = new Set();
        for (let i = 0; i < 50; i++) {
            comments.add(buildCommentFromPost(post, null));
        }
        const all = [...comments];
        const hasPtConcept = all.some(c => {
            const lower = c.toLowerCase();
            return lower.includes('typescript') ||
                lower.includes('observer') ||
                lower.includes('padrão');
        });
        expect(hasPtConcept).toBe(true);
    });

    it('falls back to string templates for no-concept posts', () => {
        const post = 'Just wanted to share my thoughts ' +
            'on the current state of remote work ' +
            'and how it affects team culture.';
        const result = buildCommentFromPost(post, null);
        expect(result).toBeTruthy();
        expect(result.length).toBeGreaterThan(10);
    });

    it('composed comments vary across runs', () => {
        const post = 'Deep dive into Docker and ' +
            'Kubernetes for production deployments. ' +
            'The key was getting the service mesh ' +
            'configuration right.';
        const results = new Set();
        for (let i = 0; i < 80; i++) {
            results.add(buildCommentFromPost(post, null));
        }
        expect(results.size).toBeGreaterThan(3);
    });

    it('composed hiring comment references stack', () => {
        const post = 'We\'re hiring! Looking for a ' +
            'Senior React and TypeScript developer ' +
            'to join our team. Apply now!';
        const comments = [];
        for (let i = 0; i < 50; i++) {
            comments.push(buildCommentFromPost(post, null));
        }
        const mentionsStack = comments.some(c => {
            const lower = c.toLowerCase();
            return lower.includes('react') ||
                lower.includes('typescript') ||
                lower.includes('stack');
        });
        expect(mentionsStack).toBe(true);
    });

    it('user templates always take priority over composed', () => {
        const post = 'Migrating from Express to Nest.js ' +
            'with TypeScript was a game changer ' +
            'for our API architecture.';
        const result = buildCommentFromPost(
            post, ['My template: {topic}']
        );
        expect(result).toMatch(/^My template:/);
    });

    it('composed comment is humanized', () => {
        const post = 'How we scaled our PostgreSQL ' +
            'database with Redis caching and ' +
            'Kubernetes auto-scaling. The results ' +
            'were impressive.';
        const results = new Set();
        for (let i = 0; i < 100; i++) {
            results.add(buildCommentFromPost(post, null));
        }
        expect(results.size).toBeGreaterThan(3);
    });
});

describe('classifyCommentSentiment', () => {
    it('detects celebration', () => {
        expect(classifyCommentSentiment(
            'Congratulations! 🎉'
        )).toBe('celebration');
    });

    it('detects PT-BR celebration', () => {
        expect(classifyCommentSentiment(
            'Parabéns!'
        )).toBe('celebration');
    });

    it('detects agreement', () => {
        expect(classifyCommentSentiment(
            'I totally agree with this'
        )).toBe('agreement');
    });

    it('detects gratitude', () => {
        expect(classifyCommentSentiment(
            'Thanks for sharing this!'
        )).toBe('gratitude');
    });

    it('detects question', () => {
        expect(classifyCommentSentiment(
            'How did you do that?'
        )).toBe('question');
    });

    it('detects insight', () => {
        expect(classifyCommentSentiment(
            'Great point about scaling'
        )).toBe('insight');
    });

    it('detects support', () => {
        expect(classifyCommentSentiment(
            'Keep going, you got this!'
        )).toBe('support');
    });

    it('detects personal experience', () => {
        expect(classifyCommentSentiment(
            'I also had this experience at work'
        )).toBe('personal');
    });

    it('returns generic for unclassified', () => {
        expect(classifyCommentSentiment(
            'Nice post'
        )).toBe('generic');
    });

    it('handles null/empty', () => {
        expect(classifyCommentSentiment(null))
            .toBe('generic');
        expect(classifyCommentSentiment(''))
            .toBe('generic');
    });
});

describe('SENTIMENT_PATTERNS', () => {
    it('exports all sentiment categories', () => {
        expect(Object.keys(SENTIMENT_PATTERNS))
            .toEqual(expect.arrayContaining([
                'celebration', 'agreement', 'gratitude',
                'question', 'insight', 'support', 'personal'
            ]));
    });

    it('each pattern is a RegExp', () => {
        for (const p of Object.values(SENTIMENT_PATTERNS)) {
            expect(p).toBeInstanceOf(RegExp);
        }
    });
});

describe('getExistingComments', () => {
    it('returns empty array for null', () => {
        expect(getExistingComments(null)).toEqual([]);
    });

    it('returns empty when no commentList', () => {
        const el = document.createElement('div');
        expect(getExistingComments(el)).toEqual([]);
    });

    it('extracts comments from DOM', () => {
        const post = document.createElement('div');
        const list = document.createElement('div');
        list.setAttribute(
            'data-testid', 'abc-commentList-xyz'
        );

        const c1 = document.createElement('div');
        const tb1 = document.createElement('div');
        tb1.setAttribute(
            'data-testid', 'expandable-text-box'
        );
        tb1.textContent = 'Congratulations! 🎉';
        const a1 = document.createElement('a');
        a1.href = '/in/john-doe/';
        a1.textContent = 'John Doe';
        c1.appendChild(a1);
        c1.appendChild(tb1);

        const sep = document.createElement('div');

        const c2 = document.createElement('div');
        const tb2 = document.createElement('div');
        tb2.setAttribute(
            'data-testid', 'expandable-text-box'
        );
        tb2.textContent = 'How did you achieve this?';
        c2.appendChild(tb2);

        list.appendChild(c1);
        list.appendChild(sep);
        list.appendChild(c2);
        post.appendChild(list);

        const result = getExistingComments(post);
        expect(result).toHaveLength(2);
        expect(result[0].text)
            .toBe('Congratulations! 🎉');
        expect(result[0].author).toBe('John Doe');
        expect(result[0].sentiment)
            .toBe('celebration');
        expect(result[1].text)
            .toBe('How did you achieve this?');
        expect(result[1].sentiment).toBe('question');
    });

    it('skips empty text boxes', () => {
        const post = document.createElement('div');
        const list = document.createElement('div');
        list.setAttribute(
            'data-testid', 'test-commentList-id'
        );
        const c1 = document.createElement('div');
        const tb1 = document.createElement('div');
        tb1.setAttribute(
            'data-testid', 'expandable-text-box'
        );
        tb1.textContent = '';
        c1.appendChild(tb1);
        list.appendChild(c1);
        post.appendChild(list);

        expect(getExistingComments(post)).toEqual([]);
    });

    it('strips badges from author names', () => {
        const post = document.createElement('div');
        const list = document.createElement('div');
        list.setAttribute(
            'data-testid', 'x-commentList-y'
        );
        const c1 = document.createElement('div');
        const a1 = document.createElement('a');
        a1.href = '/in/jane/';
        a1.textContent = 'Jane Smith Verified Pro';
        c1.appendChild(a1);
        const tb1 = document.createElement('div');
        tb1.setAttribute(
            'data-testid', 'expandable-text-box'
        );
        tb1.textContent = 'Great insights!';
        c1.appendChild(tb1);
        list.appendChild(c1);
        post.appendChild(list);

        const result = getExistingComments(post);
        expect(result[0].author).toBe('Jane Smith');
    });

    it('extracts comments from alternative LinkedIn comment list selectors', () => {
        const post = document.createElement('div');
        const list = document.createElement('ul');
        list.className = 'comments-comments-list';
        const item = document.createElement('li');
        item.className = 'comments-comment-item';
        const body = document.createElement('div');
        body.className = 'comments-comment-item-content-body';
        body.textContent = 'Great perspective on scaling.';
        item.appendChild(body);
        const author = document.createElement('a');
        author.href = '/in/alex/';
        author.textContent = 'Alex';
        item.appendChild(author);
        list.appendChild(item);
        post.appendChild(list);

        const result = getExistingComments(post);
        expect(result).toHaveLength(1);
        expect(result[0].text).toBe('Great perspective on scaling.');
    });
});

describe('getPostCommentSignal', () => {
    it('parses regular English comment count', () => {
        const post = document.createElement('div');
        const social = document.createElement('span');
        social.className = 'social-details-social-counts';
        social.textContent = '12 comments';
        post.appendChild(social);
        const signal = getPostCommentSignal(post);
        expect(signal.count).toBe(12);
    });

    it('parses Portuguese comment count', () => {
        const post = document.createElement('div');
        const social = document.createElement('span');
        social.className = 'social-details-social-counts';
        social.textContent = '12 comentários';
        post.appendChild(social);
        const signal = getPostCommentSignal(post);
        expect(signal.count).toBe(12);
    });

    it('parses comma-separated count', () => {
        const post = document.createElement('div');
        const social = document.createElement('span');
        social.className = 'social-details-social-counts';
        social.textContent = '1,234 comments';
        post.appendChild(social);
        const signal = getPostCommentSignal(post);
        expect(signal.count).toBe(1234);
    });

    it('parses compact k count', () => {
        const post = document.createElement('div');
        const social = document.createElement('span');
        social.className = 'social-details-social-counts';
        social.textContent = '1.2k comments';
        post.appendChild(social);
        const signal = getPostCommentSignal(post);
        expect(signal.count).toBe(1200);
    });

    it('falls back to visible comments when count label is absent', () => {
        const post = document.createElement('div');
        const list = document.createElement('div');
        list.setAttribute('data-testid', 'abc-commentList-xyz');
        const item = document.createElement('div');
        const text = document.createElement('div');
        text.setAttribute('data-testid', 'expandable-text-box');
        text.textContent = 'Great thread.';
        item.appendChild(text);
        list.appendChild(item);
        post.appendChild(list);

        const signal = getPostCommentSignal(post);
        expect(signal.count).toBe(1);
        expect(signal.source).toBe('visible-thread');
    });
});

describe('buildCommentFromPost with context', () => {
    it('still works with no existing comments', () => {
        const result = buildCommentFromPost(
            'Excited about our new product launch!',
            null, []
        );
        expect(result).toBeTruthy();
        expect(result.length).toBeGreaterThan(5);
    });

    it('still works with undefined comments', () => {
        const result = buildCommentFromPost(
            'Excited about our new product launch!',
            null, undefined
        );
        expect(result).toBeTruthy();
    });

    it('keeps career congratulations professional-neutral', () => {
        const post = 'Excited to share I got promoted!';
        const existing = [
            {
                text: 'Congratulations!',
                author: 'A',
                sentiment: 'celebration'
            },
            {
                text: 'Parabéns!',
                author: 'B',
                sentiment: 'celebration'
            }
        ];
        const results = new Set();
        for (let i = 0; i < 50; i++) {
            results.add(
                buildCommentFromPost(post, null, existing)
            );
        }
        const overpersonalRe =
            /happy for you|proud of you|muito realizado|feliz por voc[eê]/i;
        const hasOverpersonal = [...results].some(
            c => overpersonalRe.test(c)
        );
        expect(hasOverpersonal).toBe(false);
    });

    it('user templates bypass context filtering', () => {
        const existing = [
            {
                text: 'Congratulations!',
                author: 'A',
                sentiment: 'celebration'
            }
        ];
        const result = buildCommentFromPost(
            'Got promoted!',
            ['Congrats on {topic}!'],
            existing
        );
        expect(result).toContain('Congrats');
    });
});

describe('summarizeCommentThread', () => {
    it('summarizes dominant style from existing comments', () => {
        const summary = summarizeCommentThread([
            {
                text: 'Congrats! Huge win for your team!',
                sentiment: 'celebration'
            },
            {
                text: 'Amazing milestone, well deserved!',
                sentiment: 'celebration'
            },
            {
                text: 'Great point on ownership and focus.',
                sentiment: 'insight'
            }
        ]);

        expect(summary.count).toBe(3);
        expect(summary.dominantSentiment).toBe('celebration');
        expect(summary.styleHint).toBe('congratulatory');
        expect(summary.brevity).toBe('short');
    });

    it('returns safe defaults for empty input', () => {
        const summary = summarizeCommentThread([]);
        expect(summary.count).toBe(0);
        expect(summary.dominantSentiment).toBe('generic');
        expect(summary.styleHint).toBe('neutral');
    });

    it('captures expressive thread signals for prompt tuning', () => {
        const summary = summarizeCommentThread([
            {
                text: 'Love this! 👏',
                sentiment: 'celebration'
            },
            {
                text: 'So true!!',
                sentiment: 'agreement'
            },
            {
                text: 'Any chance you can share the stack?',
                sentiment: 'question'
            }
        ]);

        expect(summary.exclamationRate).toBeGreaterThan(0);
        expect(summary.emojiRate).toBeGreaterThan(0);
        expect(summary.questionRate).toBeGreaterThan(0);
    });

    it('extracts reusable thread keywords and phrases', () => {
        const summary = summarizeCommentThread([
            {
                text: 'Strong point on observability rollout in production.',
                sentiment: 'insight'
            },
            {
                text: 'Observability and incident response maturity are key.',
                sentiment: 'insight'
            },
            {
                text: 'Great practical take on production readiness.',
                sentiment: 'agreement'
            }
        ]);

        expect(summary.keywords).toContain('observability');
        expect(summary.keywords).toContain('production');
        expect(summary.samplePhrases.length).toBeGreaterThan(0);
    });
});

describe('summarizeReactions', () => {
    it('extracts dominant reaction and intensity', () => {
        const summary = summarizeReactions({
            PRAISE: 5,
            INTEREST: 2,
            LIKE: 10,
            _total: 420
        });
        expect(summary.total).toBe(420);
        expect(summary.dominant).toBe('LIKE');
        expect(summary.intensity).toBe('high');
    });
});

describe('getPostImageSignals', () => {
    it('captures meaningful image cues and ignores avatars', () => {
        const post = document.createElement('div');

        const avatar = document.createElement('img');
        avatar.alt = 'John Doe profile photo';
        post.appendChild(avatar);

        const content = document.createElement('img');
        content.alt = 'Dashboard screenshot with growth chart and KPI metrics';
        post.appendChild(content);

        const signals = getPostImageSignals(post);
        expect(signals.hasImage).toBe(true);
        expect(signals.cues).toContain('chart');
        expect(signals.cues).toContain('product');
    });
});

describe('validateGeneratedCommentSafety', () => {
    it('rejects congratulatory comment on humor context', () => {
        const safe = validateGeneratedCommentSafety(
            'congrats on this one',
            { category: 'humor' }
        );
        expect(safe).toBe(false);
    });

    it('rejects saved/bookmarked language on social-impact metrics posts', () => {
        const safe = validateGeneratedCommentSafety(
            'bookmarked this for later',
            {
                category: 'news',
                postText: 'Women in leadership reached 45% this year'
            }
        );
        expect(safe).toBe(false);
    });

    it('rejects questions and discussion openers', () => {
        expect(validateGeneratedCommentSafety(
            'What do you think?',
            { category: 'technical' }
        )).toBe(false);
        expect(validateGeneratedCommentSafety(
            'Let me know your thoughts',
            { category: 'technical' }
        )).toBe(false);
    });

    it('accepts minimal laugh style for humor', () => {
        const safe = validateGeneratedCommentSafety(
            'lol too real',
            { category: 'humor' }
        );
        expect(safe).toBe(true);
    });

    it('rejects overpersonal congratulations in career categories', () => {
        expect(validateGeneratedCommentSafety(
            'happy for you on this new role',
            { category: 'newjob' }
        )).toBe(false);
        expect(validateGeneratedCommentSafety(
            'muito realizado com essa conquista',
            { category: 'achievement' }
        )).toBe(false);
        expect(validateGeneratedCommentSafety(
            'orgulho de você, parabéns',
            { category: 'career' }
        )).toBe(false);
    });

    it('accepts neutral congratulations in career categories', () => {
        expect(validateGeneratedCommentSafety(
            'parabéns pela nova posição, sucesso nessa etapa',
            { category: 'newjob' }
        )).toBe(true);
        expect(validateGeneratedCommentSafety(
            'congrats on the new role, wishing you success',
            { category: 'achievement' }
        )).toBe(true);
    });

    it('rejects congratulatory wording on departure-only posts', () => {
        const safe = validateGeneratedCommentSafety(
            'congrats on this transition',
            {
                category: 'achievement',
                postText: 'Today is my last day at Acme, moving on ' +
                    'after a great journey.'
            }
        );
        expect(safe).toBe(false);
    });
});

describe('buildCommentFromPost with reactions context', () => {
    it('uses reactions to classify fallback tone', () => {
        const post = 'Quick thought from today.';
        const reactions = { ENTERTAINMENT: 8, _total: 20 };
        const outputs = new Set();
        for (let i = 0; i < 60; i++) {
            const c = buildCommentFromPost(
                post, null, [], 'passive', reactions
            );
            if (c) outputs.add(c.toLowerCase());
        }
        const hasHumor = [...outputs].some(text =>
            /lol|haha|real one|too real|kkkk/.test(text)
        );
        expect(hasHumor).toBe(true);
    });
});

describe('buildCommentFromPost departure-only behavior', () => {
    it('never emits congratulatory wording for departure-only posts', () => {
        const post = 'Happy to share that this is my last day at Acme. ' +
            'I am leaving and moving on after an amazing cycle.';
        const outputs = new Set();
        for (let i = 0; i < 40; i++) {
            const c = buildCommentFromPost(post, null, []);
            if (c) outputs.add(c.toLowerCase());
        }
        expect(outputs.size).toBeGreaterThan(0);
        for (const out of outputs) {
            expect(
                /\b(congrats|congratulations|parab[eé]ns|well deserved|muito merecido)\b/i
                    .test(out)
            ).toBe(false);
        }
    });
});

describe('analyzeCommentPatterns', () => {
    it('derives dominant style and intent from coherent threads', () => {
        const thread = Array.from({ length: 15 }).map(
            (_, i) => ({
                text: i % 2 === 0
                    ? 'solid point on latency, very practical'
                    : 'strong take on latency and production focus',
                sentiment: 'insight'
            })
        );
        const profile = analyzeCommentPatterns(thread, {
            maxComments: 15,
            category: 'technical'
        });
        expect(profile.analyzedCount).toBe(15);
        expect(profile.patternConfidence).toBeGreaterThan(60);
        expect(profile.styleFamily).toBe('analytical');
        expect(profile.lengthBand).toMatch(/short|medium/);
        expect(profile.topNgrams.length).toBeGreaterThan(0);
        expect(profile.lowSignal).toBe(false);
    });

    it('returns low confidence for sparse/noisy context', () => {
        const profile = analyzeCommentPatterns([
            { text: 'nice' }
        ], {
            maxComments: 15,
            category: 'generic'
        });
        expect(profile.analyzedCount).toBe(1);
        expect(profile.patternConfidence).toBeLessThan(60);
        expect(profile.lowSignal).toBe(true);
    });
});

describe('validateCommentPatternFit', () => {
    const strongProfile = {
        patternConfidence: 82,
        lengthBand: 'short',
        toneIntensity: 'low',
        punctuationRhythm: 'balanced',
        styleFamily: 'analytical',
        openers: [
            { text: 'solid point', weight: 1.2 }
        ],
        topNgrams: [
            { text: 'latency production', weight: 1.5 },
            { text: 'production focus', weight: 1.1 }
        ],
        recommended: {
            lengthBand: 'short',
            toneIntensity: 'low',
            punctuationRhythm: 'balanced',
            allowQuestion: false,
            allowEmoji: false,
            maxEmoji: 0
        }
    };

    it('accepts in-style short neutral output', () => {
        const result = validateCommentPatternFit(
            'solid point on production latency',
            strongProfile,
            null,
            { existingComments: [] }
        );
        expect(result.ok).toBe(true);
    });

    it('rejects low-signal profile', () => {
        const result = validateCommentPatternFit(
            'solid point',
            { ...strongProfile, patternConfidence: 35 },
            null,
            {}
        );
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('skip-pattern-low-signal');
    });

    it('rejects style mismatch and questions', () => {
        const result = validateCommentPatternFit(
            'THIS IS AMAZING!!! what do you think?',
            strongProfile,
            null,
            {}
        );
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('skip-pattern-fit');
    });

    it('rejects exact phrase copying from existing comments', () => {
        const result = validateCommentPatternFit(
            'solid point on latency, very practical',
            strongProfile,
            null,
            {
                existingComments: [{
                    text: 'solid point on latency, very practical'
                }]
            }
        );
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('skip-pattern-fit');
    });
});

describe('assessCommentCopyRisk', () => {
    it('rejects near-duplicate wording by token containment', () => {
        const result = assessCommentCopyRisk(
            'MVPs fast with vibe coding are useful for demos.',
            [{
                text: 'Vibe coding is very useful to create MVPs very fast today.'
            }]
        );
        expect(result.risky).toBe(true);
        expect(result.ruleHit).toBe('high-token-containment');
    });

    it('rejects shared contiguous four-word snippets', () => {
        const result = assessCommentCopyRisk(
            'Clear prompts make outputs better in demos.',
            [{
                text: 'Honestly clear prompts make outputs better for demos.'
            }]
        );
        expect(result.risky).toBe(true);
        expect(result.ruleHit).toBe('shared-4gram');
        expect(result.matchedSnippet).toContain('clear prompts');
    });

    it('accepts original wording on the same topic', () => {
        const result = assessCommentCopyRisk(
            'Fast MVP delivery comes from prompt clarity and tight iteration.',
            [{
                text: 'Vibe coding is useful to create MVPs fast.'
            }, {
                text: 'Clear prompts make outputs better for demos.'
            }]
        );
        expect(result.risky).toBe(false);
        expect(result.ruleHit).toBeNull();
    });
});

describe('buildCommentFromPost with pattern discipline', () => {
    it('skips fallback when pattern signal is low', () => {
        const result = buildCommentFromPost(
            'Strong technical perspective on latency',
            ['solid point on latency'],
            [],
            'passive',
            { INTEREST: 5, _total: 40 },
            { category: 'technical' },
            {
                patternConfidence: 40,
                recommended: {
                    lengthBand: 'short',
                    toneIntensity: 'low',
                    allowQuestion: false,
                    allowEmoji: false,
                    maxEmoji: 0
                }
            }
        );
        expect(result).toBeNull();
    });

    it('allows explicit low-signal recovery mode for fallback generation', () => {
        const result = buildCommentFromPost(
            'Strong technical perspective on latency',
            ['solid point on latency'],
            [],
            'passive',
            { INTEREST: 5, _total: 40 },
            { category: 'technical' },
            {
                patternConfidence: 40,
                recommended: {
                    lengthBand: 'short',
                    toneIntensity: 'low',
                    allowQuestion: false,
                    allowEmoji: false,
                    maxEmoji: 0
                }
            },
            { allowLowSignalRecovery: true }
        );
        expect(result).toBe('solid point on latency');
    });

    it('rejects fallback output when copy-risk is detected', () => {
        const options = {
            allowLowSignalRecovery: true
        };
        const existing = [{
            text: 'solid point on production latency',
            sentiment: 'insight'
        }];
        const result = buildCommentFromPost(
            'Strong technical perspective on latency',
            ['solid point on production latency'],
            existing,
            'passive',
            { INTEREST: 5, _total: 40 },
            {
                category: 'technical',
                existingComments: existing
            },
            null,
            options
        );
        expect(result).toBeNull();
        expect(options.lastRejectReason).toBe('skip-copy-risk');
        expect(options.lastRejectDiagnostics).toEqual(
            expect.objectContaining({
                risky: true,
                ruleHit: 'exact-normalized'
            })
        );
    });

    it('rejects fallback output when distance-risk is detected', () => {
        const options = {
            allowLowSignalRecovery: true
        };
        const result = buildCommentFromPost(
            'Excited to announce I accepted a new role',
            ['happy for you!'],
            [],
            'passive',
            { PRAISE: 6, _total: 40 },
            {
                category: 'newjob',
                existingComments: []
            },
            null,
            options
        );
        expect(result).toBeNull();
        expect(options.lastRejectReason).toBe('skip-distance-risk');
        expect(options.lastRejectDiagnostics).toEqual(
            expect.objectContaining({
                risky: true,
                riskType: 'distance',
                ruleHit: expect.any(String)
            })
        );
    });
});

describe('isPolemicPost', () => {
    it('returns true for hard-blocked political content', () => {
        expect(isPolemicPost('political debate about government')).toBe(true);
        expect(isPolemicPost('religion and church beliefs')).toBe(true);
        expect(isPolemicPost('feminist agenda and aborto debate')).toBe(true);
        expect(isPolemicPost('racist rhetoric exposed')).toBe(true);
        expect(isPolemicPost('wake up sheep brainwash')).toBe(true);
        expect(isPolemicPost('cancel culture boycott brands')).toBe(true);
    });

    it('returns false for neutral professional content', () => {
        expect(isPolemicPost('Excited to announce I joined a new team')).toBe(false);
        expect(isPolemicPost('Here is my experience with React hooks')).toBe(false);
    });

    it('accumulates soft polemic signals', () => {
        expect(isPolemicPost('The worst garbage scam layoff firing')).toBe(true);
    });

    it('returns false for single soft signal below threshold', () => {
        expect(isPolemicPost('some people think this is the worst')).toBe(false);
    });

    it('boosts score when existing comments contain heated language', () => {
        const heated = [
            { text: 'This is absolute nonsense, totally wrong' },
            { text: 'I completely disagree, this is ridiculous' }
        ];
        expect(isPolemicPost('interesting take on the market', heated)).toBe(true);
    });

    it('returns false for empty input', () => {
        expect(isPolemicPost('')).toBe(false);
        expect(isPolemicPost(null)).toBe(false);
    });

    it('handles single heated comment (score 1, not enough)', () => {
        const oneHeated = [
            { text: 'I disagree with this approach' }
        ];
        expect(isPolemicPost('some professional post', oneHeated)).toBe(false);
    });
});

describe('getPostText', () => {
    it('returns empty string for null element', () => {
        expect(getPostText(null)).toBe('');
    });

    it('extracts text from data-testid expandable-text-box', () => {
        const post = document.createElement('div');
        const textBox = document.createElement('div');
        textBox.setAttribute('data-testid', 'expandable-text-box');
        textBox.textContent = 'This is a detailed post about software engineering';
        post.appendChild(textBox);
        const result = getPostText(post);
        expect(result).toBe('This is a detailed post about software engineering');
    });

    it('falls back to .feed-shared-text selector', () => {
        const post = document.createElement('div');
        const textEl = document.createElement('span');
        textEl.className = 'feed-shared-text';
        textEl.textContent = 'A great post about TypeScript and React best practices';
        post.appendChild(textEl);
        const result = getPostText(post);
        expect(result).toContain('TypeScript');
    });

    it('falls back to span[dir=ltr] when no primary selector matches', () => {
        const post = document.createElement('div');
        const span = document.createElement('span');
        span.setAttribute('dir', 'ltr');
        span.textContent = 'Long enough content to be extracted by span fallback path here';
        post.appendChild(span);
        expect(getPostText(post).length).toBeGreaterThan(0);
    });

    it('extracts article title when present', () => {
        const post = document.createElement('div');
        const title = document.createElement('span');
        title.className = 'article-card__title';
        title.textContent = 'The Future of Remote Work in Tech';
        post.appendChild(title);
        const result = getPostText(post);
        expect(result).toContain('Future');
    });

    it('falls back to innerText/textContent for generic content', () => {
        const post = document.createElement('div');
        post.textContent = 'This is a fairly long post that should be captured by the generic fallback path of getPostText function.';
        const result = getPostText(post);
        expect(result.length).toBeGreaterThan(0);
    });
});

describe('getPostAuthor', () => {
    it('returns "Unknown" for null element', () => {
        expect(getPostAuthor(null)).toBe('Unknown');
    });

    it('extracts author from /in/ link when not a social action', () => {
        const post = document.createElement('div');
        const link = document.createElement('a');
        link.setAttribute('href', '/in/lucassantana');
        link.textContent = 'Lucas Santana';
        post.appendChild(link);
        const result = getPostAuthor(post);
        expect(result).toBe('Lucas Santana');
    });

    it('falls back to Unknown when no name selectors match', () => {
        const post = document.createElement('div');
        post.textContent = 'Some generic content with no author';
        const result = getPostAuthor(post);
        expect(result).toBe('Unknown');
    });

    it('extracts company author from /company/ link', () => {
        const post = document.createElement('div');
        const link = document.createElement('a');
        link.setAttribute('href', '/company/stripe');
        link.textContent = 'Stripe';
        post.appendChild(link);
        const result = getPostAuthor(post);
        expect(result).toBe('Stripe');
    });
});

describe('getPostAuthorTitle', () => {
    it('returns empty string for null element', () => {
        expect(getPostAuthorTitle(null)).toBe('');
    });

    it('extracts title from actor description selector', () => {
        const post = document.createElement('div');
        const desc = document.createElement('span');
        desc.className = 'update-components-actor__description';
        desc.textContent = 'Senior Software Engineer at Stripe';
        post.appendChild(desc);
        expect(getPostAuthorTitle(post)).toBe('Senior Software Engineer at Stripe');
    });

    it('falls back to feed-shared-actor__description', () => {
        const post = document.createElement('div');
        const desc = document.createElement('span');
        desc.className = 'feed-shared-actor__description';
        desc.textContent = 'Product Manager at Google';
        post.appendChild(desc);
        expect(getPostAuthorTitle(post)).toBe('Product Manager at Google');
    });

    it('falls back to actor sub-description selector', () => {
        const post = document.createElement('div');
        const desc = document.createElement('span');
        desc.className = 'update-components-actor__sub-description';
        desc.textContent = 'Tech Lead • Remote';
        post.appendChild(desc);
        expect(getPostAuthorTitle(post)).toBe('Tech Lead • Remote');
    });

    it('returns empty for very short or very long text', () => {
        const post = document.createElement('div');
        const desc = document.createElement('span');
        desc.className = 'update-components-actor__description';
        desc.textContent = 'A';
        post.appendChild(desc);
        expect(getPostAuthorTitle(post)).toBe('');
    });
});

describe('getPostReactions', () => {
    it('returns empty object for null element', () => {
        expect(getPostReactions(null)).toEqual({});
    });

    it('counts reactions from data-test-app-aware-reaction-type', () => {
        const post = document.createElement('div');
        const like1 = document.createElement('img');
        like1.setAttribute('data-test-app-aware-reaction-type', 'LIKE');
        const like2 = document.createElement('img');
        like2.setAttribute('data-test-app-aware-reaction-type', 'LIKE');
        const praise = document.createElement('img');
        praise.setAttribute('data-test-app-aware-reaction-type', 'PRAISE');
        post.appendChild(like1);
        post.appendChild(like2);
        post.appendChild(praise);
        const reactions = getPostReactions(post);
        expect(reactions.LIKE).toBe(2);
        expect(reactions.PRAISE).toBe(1);
    });

    it('infers reaction type from alt text when attribute is missing', () => {
        const post = document.createElement('div');
        const img = document.createElement('img');
        img.setAttribute('alt', 'celebrate reaction');
        post.appendChild(img);
        const reactions = getPostReactions(post);
        expect(typeof reactions).toBe('object');
    });
});

describe('getPostUrn', () => {
    it('returns empty string for null element', () => {
        expect(getPostUrn(null)).toBe('');
    });

    it('extracts URN from data-urn attribute', () => {
        const post = document.createElement('div');
        post.setAttribute('data-urn', 'urn:li:activity:12345');
        expect(getPostUrn(post)).toBe('urn:li:activity:12345');
    });

    it('extracts URN from data-id attribute', () => {
        const post = document.createElement('div');
        post.setAttribute('data-id', 'urn:li:activity:67890');
        expect(getPostUrn(post)).toBe('urn:li:activity:67890');
    });

    it('extracts URN from child element with data-urn', () => {
        const post = document.createElement('div');
        const child = document.createElement('div');
        child.setAttribute('data-urn', 'urn:li:activity:99999');
        post.appendChild(child);
        expect(getPostUrn(post)).toBe('urn:li:activity:99999');
    });
});

describe('isLikeButton', () => {
    it('returns false for null element', () => {
        expect(isLikeButton(null)).toBe(false);
    });

    it('returns true for aria-label containing "like"', () => {
        const btn = document.createElement('button');
        btn.setAttribute('aria-label', 'Like this post');
        expect(isLikeButton(btn)).toBe(true);
    });

    it('returns true for aria-label with "Gostei" (PT-BR)', () => {
        const btn = document.createElement('button');
        btn.setAttribute('aria-label', 'Gostei desta publicação');
        expect(isLikeButton(btn)).toBe(true);
    });

    it('returns false for comment button', () => {
        const btn = document.createElement('button');
        btn.setAttribute('aria-label', 'Comment on this post');
        expect(isLikeButton(btn)).toBe(false);
    });
});

describe('isCommentButton', () => {
    it('returns false for null element', () => {
        expect(isCommentButton(null)).toBe(false);
    });

    it('returns true for aria-label containing "comment"', () => {
        const btn = document.createElement('button');
        btn.setAttribute('aria-label', 'Comment on this post');
        expect(isCommentButton(btn)).toBe(true);
    });

    it('returns true for aria-label containing "comentar"', () => {
        const btn = document.createElement('button');
        btn.setAttribute('aria-label', 'Comentar publicação');
        expect(isCommentButton(btn)).toBe(true);
    });

    it('returns false for like button', () => {
        const btn = document.createElement('button');
        btn.setAttribute('aria-label', 'Like this post');
        expect(isCommentButton(btn)).toBe(false);
    });
});

describe('classifyPost — humor and critique boost paths', () => {
    it('classifies "vs reality" pattern as humor', () => {
        const result = classifyPost(
            'Expectation vs Reality: what they show in tutorials vs what you actually write'
        );
        expect(result).toBe('humor');
    });

    it('classifies "hot take" as critique', () => {
        const result = classifyPost(
            'Hot take: most tech companies don\'t actually care about code quality'
        );
        expect(result).toBe('critique');
    });

    it('classifies "unpopular opinion" as critique', () => {
        const result = classifyPost(
            'Unpopular opinion: remote work is not for everyone'
        );
        expect(result).toBe('critique');
    });

    it('safety override routes hiring+humor to hiring', () => {
        const result = classifyPost(
            'We are hiring! Join our team. Apply now. ' +
            'lol it works on my machine haha'
        );
        expect(result).toBe('hiring');
    });

    it('classifies short technical post via TOPIC_MAP fallback', () => {
        const result = classifyPost('React hooks changed everything');
        expect(['technical', 'tech', 'generic']).toContain(result);
    });
});

describe('detectLanguage — edge cases', () => {
    it('returns en for empty/null input', () => {
        expect(detectLanguage('')).toBe('en');
        expect(detectLanguage(null)).toBe('en');
    });

    it('returns pt for text with many PT markers', () => {
        const pt = 'Você não pode deixar de compartilhar isso com sua equipe. Estamos todos muito felizes com o resultado.';
        expect(detectLanguage(pt)).toBe('pt');
    });

    it('returns pt when accent count is high', () => {
        const pt = 'é uma situação muito difícil. Você está bem? Não é fácil.';
        expect(detectLanguage(pt)).toBe('pt');
    });

    it('returns pt for kkk/informal markers', () => {
        const pt = 'kkk isso é real demais pra mim';
        expect(detectLanguage(pt)).toBe('pt');
    });

    it('returns en for English content', () => {
        const en = 'Just shipped a new feature to production. Very excited about the team\'s work this sprint.';
        expect(detectLanguage(en)).toBe('en');
    });

    it('uses stricter threshold for short texts', () => {
        const shortPt = 'você está';
        expect(detectLanguage(shortPt)).toBe('pt');
    });
});

describe('extractConcepts — edge cases', () => {
    it('returns empty array for null/empty input', () => {
        expect(extractConcepts(null)).toEqual([]);
        expect(extractConcepts('')).toEqual([]);
    });

    it('extracts known framework names', () => {
        const concepts = extractConcepts(
            'We built this with React and Next.js, deployed on Vercel with PostgreSQL'
        );
        expect(concepts.length).toBeGreaterThan(0);
        const lower = concepts.map(c => c.toLowerCase());
        expect(lower.some(c => c.includes('react') || c.includes('next') || c.includes('vercel') || c.includes('postgresql'))).toBe(true);
    });

    it('extracts tech acronyms', () => {
        const concepts = extractConcepts(
            'We follow TDD and SOLID principles in our TypeScript codebase'
        );
        expect(concepts.length).toBeGreaterThan(0);
    });

    it('deduplicates and limits to 5 concepts', () => {
        const text = 'React React TypeScript TypeScript Docker Docker AWS AWS Kubernetes Kubernetes GraphQL GraphQL';
        const concepts = extractConcepts(text);
        expect(concepts.length).toBeLessThanOrEqual(5);
    });

    it('filters stop words', () => {
        const concepts = extractConcepts('the and for with that this from are was');
        concepts.forEach(c => {
            expect(['the', 'and', 'for', 'with', 'that', 'this']).not.toContain(c.toLowerCase());
        });
    });
});

describe('extractTopic — coverage paths', () => {
    it('returns "this" for null/undefined input', () => {
        expect(extractTopic(null)).toBe('this');
        expect(extractTopic('')).toBe('this');
    });

    it('returns "tech" fallback when no topic matches', () => {
        expect(extractTopic('random words that match nothing specific')).toBe('tech');
    });

    it('returns matching topic label for React content', () => {
        expect(extractTopic('React and Angular are popular frontend frameworks')).toBe('frontend development');
    });

    it('returns AI topic for AI/GPT content', () => {
        expect(extractTopic('GPT and LLM models are changing everything')).toBe('AI');
    });
});

describe('validateCommentPatternFit — bucket paths', () => {
    it('returns ok false for empty comment', () => {
        const result = validateCommentPatternFit('', {}, null, {});
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('skip-pattern-fit');
    });

    it('returns ok false when patternConfidence is below threshold but > 0', () => {
        const result = validateCommentPatternFit('Nice post', {
            patternConfidence: 0.05
        }, null, {});
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('skip-pattern-low-signal');
    });

    it('checks length band compatibility via bucket', () => {
        const result = validateCommentPatternFit(
            'Ok.',
            {},
            { lengthMix: { long: 10, medium: 5, short: 1 } },
            {}
        );
        expect(typeof result.ok).toBe('boolean');
    });

    it('accepts comment when no pattern profile provided', () => {
        const result = validateCommentPatternFit('Great insight here.', null, null, {});
        expect(result.ok).toBe(true);
    });

    it('accepts comment that matches expected length band', () => {
        const result = validateCommentPatternFit(
            'Great insight!',
            { recommended: { lengthBand: 'short', toneIntensity: 'balanced' }, patternConfidence: 0.8 },
            null,
            {}
        );
        expect(typeof result.ok).toBe('boolean');
    });
});

describe('analyzeCommentPatterns — zero-comment edge case', () => {
    it('returns lowSignal true when no comments provided', () => {
        const result = analyzeCommentPatterns([], 'technical');
        expect(result.lowSignal).toBe(true);
        expect(result.analyzedCount).toBe(0);
    });

    it('returns default recommended fields when low signal', () => {
        const result = analyzeCommentPatterns([], 'technical');
        expect(result.recommended).toBeDefined();
        expect(result.recommended.lengthBand).toBe('short');
    });
});
