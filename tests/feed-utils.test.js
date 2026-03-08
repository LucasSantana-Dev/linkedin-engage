/**
 * @jest-environment jsdom
 */
const {
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
        expect(result.length).toBeGreaterThan(10);
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
        expect(results.size).toBeGreaterThan(5);
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
        for (const cat of expected) {
            expect(CATEGORY_TEMPLATES[cat]).toBeDefined();
            expect(CATEGORY_TEMPLATES[cat].length)
                .toBeGreaterThanOrEqual(5);
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
        for (const cat of expected) {
            expect(CATEGORY_TEMPLATES_PT[cat])
                .toBeDefined();
            expect(CATEGORY_TEMPLATES_PT[cat].length)
                .toBeGreaterThanOrEqual(5);
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
            /role|network|stack|hiring|bookmarked/i
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
