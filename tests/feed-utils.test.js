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
    getExistingComments,
    classifyCommentSentiment,
    summarizeCommentThread,
    analyzeCommentPatterns,
    summarizeReactions,
    getPostImageSignals,
    getPostCommentSignal,
    validateCommentPatternFit,
    validateGeneratedCommentSafety,
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

    it('avoids celebration when others celebrate', () => {
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
        const celebrationRe =
            /congrat|parabéns|amazing|awesome|🎉|👏/i;
        const allCelebration = [...results].every(
            c => celebrationRe.test(c)
        );
        expect(allCelebration).toBe(false);
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
});
