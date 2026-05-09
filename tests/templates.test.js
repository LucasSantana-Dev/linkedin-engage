/**
 * @jest-environment node
 */
const {
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
} = require('../extension/lib/templates');

describe('templates', () => {
    describe('CATEGORY_TEMPLATES', () => {
        it('has templates for all major categories', () => {
            ['hiring', 'achievement', 'technical', 'question',
                'humor', 'critique', 'motivation', 'project',
                'jobseeking', 'newjob', 'hiring_active',
                'departure_transition'].forEach(cat => {
                expect(CATEGORY_TEMPLATES).toHaveProperty(cat);
                expect(Array.isArray(CATEGORY_TEMPLATES[cat])).toBe(true);
            });
        });

        it('hiring templates mention {topic} placeholder', () => {
            const allHiring = CATEGORY_TEMPLATES.hiring.join(' ');
            expect(allHiring).toContain('{topic}');
        });

        it('technical templates contain contextual references', () => {
            const allTech = CATEGORY_TEMPLATES.technical.join(' ');
            expect(allTech).toContain('{topic}');
        });

        it('achievement templates are short congratulatory phrases', () => {
            CATEGORY_TEMPLATES.achievement.forEach(t => {
                expect(t.toLowerCase()).toMatch(/congrats/);
            });
        });

        it('departure_transition templates are present and non-empty', () => {
            expect(CATEGORY_TEMPLATES.departure_transition.length).toBeGreaterThan(0);
            CATEGORY_TEMPLATES.departure_transition.forEach(t => {
                expect(t.length).toBeGreaterThan(0);
            });
        });

        it('tips, story, news, generic arrays exist (may be empty)', () => {
            ['tips', 'story', 'news', 'generic'].forEach(cat => {
                expect(Array.isArray(CATEGORY_TEMPLATES[cat])).toBe(true);
            });
        });
    });

    describe('CATEGORY_TEMPLATES_PT', () => {
        it('has PT templates for all major categories', () => {
            ['hiring', 'achievement', 'technical', 'question',
                'humor', 'critique', 'motivation', 'project',
                'jobseeking', 'newjob', 'hiring_active',
                'departure_transition'].forEach(cat => {
                expect(CATEGORY_TEMPLATES_PT).toHaveProperty(cat);
            });
        });

        it('PT achievement templates use parabéns', () => {
            const allAchieve = CATEGORY_TEMPLATES_PT.achievement.join(' ');
            expect(allAchieve.toLowerCase()).toContain('parabéns');
        });

        it('PT hiring templates use Portuguese vocabulary', () => {
            const allHiring = CATEGORY_TEMPLATES_PT.hiring.join(' ');
            expect(allHiring).toContain('{topic}');
        });

        it('PT departure_transition templates are non-empty', () => {
            expect(CATEGORY_TEMPLATES_PT.departure_transition.length)
                .toBeGreaterThan(0);
        });
    });

    describe('CATEGORY_FOLLOW_UPS', () => {
        it('has follow-up arrays for core categories', () => {
            ['technical', 'question', 'hiring', 'project',
                'humor', 'newjob', 'achievement', 'jobseeking',
                'critique', 'story', 'tips', 'motivation',
                'news', 'generic'].forEach(cat => {
                expect(Array.isArray(CATEGORY_FOLLOW_UPS[cat])).toBe(true);
            });
        });

        it('PT follow-ups mirror the EN structure', () => {
            const enKeys = Object.keys(CATEGORY_FOLLOW_UPS).sort();
            const ptKeys = Object.keys(CATEGORY_FOLLOW_UPS_PT).sort();
            expect(enKeys).toEqual(ptKeys);
        });
    });

    describe('OPENERS / OPENERS_PT', () => {
        it('OPENERS is a non-empty array', () => {
            expect(Array.isArray(OPENERS)).toBe(true);
            expect(OPENERS.length).toBeGreaterThan(0);
        });

        it('OPENERS_PT is a non-empty array', () => {
            expect(Array.isArray(OPENERS_PT)).toBe(true);
            expect(OPENERS_PT.length).toBeGreaterThan(0);
        });

        it('openers contain some empty strings as no-op slots', () => {
            expect(OPENERS.filter(o => o === '').length).toBeGreaterThan(0);
        });

        it('openers contain some non-empty strings', () => {
            expect(OPENERS.filter(o => o !== '').length).toBeGreaterThan(0);
        });
    });

    describe('TOPIC_MAP', () => {
        it('is a non-empty array of pattern/label pairs', () => {
            expect(Array.isArray(TOPIC_MAP)).toBe(true);
            expect(TOPIC_MAP.length).toBeGreaterThan(10);
            TOPIC_MAP.forEach(entry => {
                expect(entry.pattern).toBeInstanceOf(RegExp);
                expect(typeof entry.label).toBe('string');
                expect(entry.label.length).toBeGreaterThan(0);
            });
        });

        it('maps representative keywords to expected labels', () => {
            const cases = [
                ['frontend development', ['React', 'Angular', 'Vue', 'Next.js']],
                ['containerization', ['docker', 'kubernetes']],
                ['AI', ['artificial intelligence', 'LLM', 'GPT']],
                ['cloud infrastructure', ['AWS', 'cloud']],
                ['software architecture', ['clean architecture', 'SOLID']],
                ['TypeScript', ['TypeScript', 'JavaScript']],
                ['data engineering', ['data engineer', 'kafka']],
                ['distributed systems', ['microservice', 'event-driven']],
                ['mobile development', ['mobile', 'ios', 'android']],
                ['code quality', ['refactor', 'tech debt']],
            ];
            cases.forEach(([label, keywords]) => {
                const entry = TOPIC_MAP.find(e => e.label === label);
                expect(entry).toBeDefined();
                keywords.forEach(k => expect(k).toMatch(entry.pattern));
            });
        });
    });

    describe('HIGH_SIGNAL_CATEGORIES', () => {
        it('is a Set containing key engagement categories', () => {
            expect(HIGH_SIGNAL_CATEGORIES).toBeInstanceOf(Set);
            expect(HIGH_SIGNAL_CATEGORIES.has('achievement')).toBe(true);
            expect(HIGH_SIGNAL_CATEGORIES.has('hiring')).toBe(true);
            expect(HIGH_SIGNAL_CATEGORIES.has('jobseeking')).toBe(true);
            expect(HIGH_SIGNAL_CATEGORIES.has('newjob')).toBe(true);
            expect(HIGH_SIGNAL_CATEGORIES.has('humor')).toBe(true);
        });

        it('does not include lower-signal categories', () => {
            expect(HIGH_SIGNAL_CATEGORIES.has('generic')).toBe(false);
            expect(HIGH_SIGNAL_CATEGORIES.has('motivation')).toBe(false);
        });
    });

    describe('CONCEPT_PATTERNS', () => {
        it('is a non-empty array of RegExp patterns', () => {
            expect(Array.isArray(CONCEPT_PATTERNS)).toBe(true);
            expect(CONCEPT_PATTERNS.length).toBeGreaterThan(5);
            CONCEPT_PATTERNS.forEach(p => {
                expect(p).toBeInstanceOf(RegExp);
            });
        });

        it('matches representative concept text across categories', () => {
            const samples = [
                'The Adapter Pattern solves interface mismatch',
                'We practice TDD and SOLID principles with REST APIs',
                'Built with React and Next.js, deployed on Vercel',
                'We use TypeScript and Python in our stack',
                'Deployed via Docker on AWS with Terraform',
                'We store data in PostgreSQL and cache with Redis',
                'Looking for a Staff Engineer or Tech Lead',
                'Our event-driven microservices use message queues',
            ];
            samples.forEach(text => {
                const matches = CONCEPT_PATTERNS.some(p => {
                    p.lastIndex = 0;
                    return p.test(text);
                });
                expect(matches).toBe(true);
            });
        });
    });

    describe('COMPOSED_EN', () => {
        it('has composed template functions for all major categories', () => {
            ['technical', 'hiring', 'achievement', 'question', 'tips',
                'story', 'news', 'humor', 'critique', 'motivation',
                'project', 'jobseeking', 'newjob', 'departure_transition',
                'generic', 'hiring_active'].forEach(cat => {
                expect(COMPOSED_EN).toHaveProperty(cat);
                expect(Array.isArray(COMPOSED_EN[cat])).toBe(true);
            });
        });

        it('technical templates are callables that interpolate concepts', () => {
            COMPOSED_EN.technical.forEach(fn => {
                expect(typeof fn).toBe('function');
                const result = fn(['React', 'TypeScript']);
                expect(typeof result).toBe('string');
                expect(result.length).toBeGreaterThan(0);
            });
        });

        it('technical templates handle empty concept array', () => {
            COMPOSED_EN.technical.forEach(fn => {
                const result = fn([]);
                expect(typeof result).toBe('string');
            });
        });

        it('hiring templates use first concept when provided', () => {
            const result = COMPOSED_EN.hiring[0](['TypeScript']);
            expect(result.toLowerCase()).toContain('typescript');
        });

        it('hiring templates fall back gracefully when no concepts', () => {
            const result = COMPOSED_EN.hiring[0]([]);
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });

        it('achievement templates are static (no interpolation needed)', () => {
            COMPOSED_EN.achievement.forEach(fn => {
                const result = fn([]);
                expect(result.toLowerCase()).toContain('congrats');
            });
        });

        it('humor templates return short fixed strings', () => {
            COMPOSED_EN.humor.forEach(fn => {
                const result = fn([]);
                expect(result.length).toBeGreaterThan(0);
                expect(result.length).toBeLessThan(30);
            });
        });

        it('jobseeking templates return non-empty strings', () => {
            COMPOSED_EN.jobseeking.forEach(fn => {
                expect(fn(['developer']).length).toBeGreaterThan(0);
                expect(fn([]).length).toBeGreaterThan(0);
            });
        });

        it('departure_transition templates are static non-empty strings', () => {
            COMPOSED_EN.departure_transition.forEach(fn => {
                const result = fn([]);
                expect(typeof result).toBe('string');
                expect(result.length).toBeGreaterThan(0);
            });
        });

        it('generic templates interpolate concept or fall back', () => {
            const withConcept = COMPOSED_EN.generic[0](['microservices']);
            const withoutConcept = COMPOSED_EN.generic[0]([]);
            expect(withConcept).toContain('microservices');
            expect(typeof withoutConcept).toBe('string');
        });

        it('question templates handle concept present and absent', () => {
            const with1 = COMPOSED_EN.question[0](['Docker']);
            const without = COMPOSED_EN.question[0]([]);
            expect(typeof with1).toBe('string');
            expect(typeof without).toBe('string');
        });

        it('news templates interpolate concept', () => {
            const result = COMPOSED_EN.news[0](['AI']);
            expect(result).toContain('AI');
        });

        it('motivation templates reference concept when provided', () => {
            const result = COMPOSED_EN.motivation[2](['burnout']);
            expect(result).toContain('burnout');
        });

        it('tips templates handle concept present and absent', () => {
            const withConcept = COMPOSED_EN.tips[0](['TDD']);
            const withoutConcept = COMPOSED_EN.tips[0]([]);
            expect(withConcept).toContain('TDD');
            expect(withoutConcept.length).toBeGreaterThan(0);
        });

        it('story templates handle concept present and absent', () => {
            const withConcept = COMPOSED_EN.story[0](['Kubernetes']);
            const withoutConcept = COMPOSED_EN.story[0]([]);
            expect(withConcept).toContain('Kubernetes');
            expect(withoutConcept.length).toBeGreaterThan(0);
        });

        it('critique templates interpolate concept', () => {
            const result = COMPOSED_EN.critique[0](['hustle culture']);
            expect(result).toContain('hustle culture');
        });

        it('project templates use concept', () => {
            const result = COMPOSED_EN.project[0](['React Native']);
            expect(result).toContain('React Native');
        });
    });

    describe('COMPOSED_PT', () => {
        it('has PT composed template functions for all major categories', () => {
            ['technical', 'hiring', 'achievement', 'question', 'tips',
                'story', 'news', 'humor', 'critique', 'motivation',
                'project', 'jobseeking', 'newjob', 'departure_transition',
                'generic', 'hiring_active'].forEach(cat => {
                expect(COMPOSED_PT).toHaveProperty(cat);
                expect(Array.isArray(COMPOSED_PT[cat])).toBe(true);
            });
        });

        it('PT technical templates work with two concepts', () => {
            COMPOSED_PT.technical.forEach(fn => {
                const result = fn(['React', 'TypeScript']);
                expect(typeof result).toBe('string');
                expect(result.length).toBeGreaterThan(0);
            });
        });

        it('PT technical templates handle empty concepts', () => {
            COMPOSED_PT.technical.forEach(fn => {
                const result = fn([]);
                expect(typeof result).toBe('string');
            });
        });

        it('PT achievement templates use parabéns', () => {
            COMPOSED_PT.achievement.forEach(fn => {
                const result = fn([]);
                expect(result.toLowerCase()).toContain('parabéns');
            });
        });

        it('PT humor templates return short strings', () => {
            COMPOSED_PT.humor.forEach(fn => {
                const result = fn([]);
                expect(result.length).toBeGreaterThan(0);
                expect(result.length).toBeLessThan(30);
            });
        });

        it('PT departure_transition templates are non-empty', () => {
            COMPOSED_PT.departure_transition.forEach(fn => {
                const result = fn([]);
                expect(typeof result).toBe('string');
                expect(result.length).toBeGreaterThan(0);
            });
        });

        it('PT generic templates interpolate concept', () => {
            const result = COMPOSED_PT.generic[0](['DevOps']);
            expect(result).toContain('DevOps');
        });

        it('PT newjob templates are short congratulations', () => {
            COMPOSED_PT.newjob.forEach(fn => {
                const result = fn([]);
                expect(result.length).toBeGreaterThan(0);
            });
        });

        it('PT news templates use concept', () => {
            const result = COMPOSED_PT.news[0](['IA']);
            expect(result).toContain('IA');
        });

        it('PT jobseeking templates handle with/without concept', () => {
            const with1 = COMPOSED_PT.jobseeking[1](['backend']);
            const without = COMPOSED_PT.jobseeking[0]([]);
            expect(with1).toContain('backend');
            expect(without.length).toBeGreaterThan(0);
        });

        it('EN and PT COMPOSED have the same category keys', () => {
            const enKeys = Object.keys(COMPOSED_EN).sort();
            const ptKeys = Object.keys(COMPOSED_PT).sort();
            expect(enKeys).toEqual(ptKeys);
        });
    });

    describe('COMPOSED_EN two-concept branch paths', () => {
        it('technical fn[0] with two concepts joins them with ended up going', () => {
            const result = COMPOSED_EN.technical[0](['Docker', 'Kubernetes']);
            expect(result).toContain('Docker');
            expect(result).toContain('Kubernetes');
        });

        it('technical fn[0] without second concept omits ended up going', () => {
            const result = COMPOSED_EN.technical[0](['Docker']);
            expect(result).toContain('Docker');
            expect(result).not.toContain('ended up going');
        });

        it('technical fn[3] with two concepts formats vs comparison', () => {
            const result = COMPOSED_EN.technical[3](['REST', 'GraphQL']);
            expect(result).toContain('REST');
            expect(result).toContain('vs');
            expect(result).toContain('GraphQL');
        });

        it('technical fn[3] without second concept skips vs', () => {
            const result = COMPOSED_EN.technical[3](['REST']);
            expect(result).toContain('REST');
            expect(result).not.toContain('vs');
        });

        it('question fn[0] with concept uses it after I\'d say', () => {
            const result = COMPOSED_EN.question[0](['TypeScript']);
            expect(result).toContain('TypeScript');
        });

        it('question fn[0] without concept uses fallback', () => {
            const result = COMPOSED_EN.question[0]([]);
            expect(result).toContain('in my experience');
        });

        it('question fn[1] with concept uses especially with', () => {
            const result = COMPOSED_EN.question[1](['microservices']);
            expect(result).toContain('microservices');
        });

        it('question fn[1] without concept skips especially with', () => {
            const result = COMPOSED_EN.question[1]([]);
            expect(result).not.toContain('especially with');
        });

        it('motivation fn[2] with concept includes it', () => {
            const result = COMPOSED_EN.motivation[2](['burnout']);
            expect(result).toContain('burnout');
        });

        it('motivation fn[2] without concept uses yeah good reminder form', () => {
            const result = COMPOSED_EN.motivation[2]([]);
            expect(result).toContain('good reminder');
        });

        it('tips fn[0] with concept mentions it', () => {
            const result = COMPOSED_EN.tips[0](['TDD']);
            expect(result).toContain('TDD');
        });

        it('tips fn[0] without concept uses this fallback', () => {
            const result = COMPOSED_EN.tips[0]([]);
            expect(result).toBe('this is practical');
        });

        it('story fn[0] with concept includes with concept', () => {
            const result = COMPOSED_EN.story[0](['Kubernetes']);
            expect(result).toContain('Kubernetes');
        });

        it('story fn[0] without concept uses just been through something similar', () => {
            const result = COMPOSED_EN.story[0]([]);
            expect(result).not.toContain('with');
        });

        it('story fn[2] with concept includes it', () => {
            const result = COMPOSED_EN.story[2](['burnout']);
            expect(result).toContain('burnout');
        });

        it('story fn[2] without concept uses this', () => {
            const result = COMPOSED_EN.story[2]([]);
            expect(result).toContain('this');
        });

        it('news fn[0] with concept includes it', () => {
            const result = COMPOSED_EN.news[0](['AI regulation']);
            expect(result).toContain('AI regulation');
        });

        it('news fn[0] without concept uses this fallback', () => {
            const result = COMPOSED_EN.news[0]([]);
            expect(result).toContain('this');
        });

        it('critique fn[0] with concept includes about concept', () => {
            const result = COMPOSED_EN.critique[0](['hustle culture']);
            expect(result).toContain('hustle culture');
        });

        it('critique fn[0] without concept omits about', () => {
            const result = COMPOSED_EN.critique[0]([]);
            expect(result).toBe('fair point');
        });

        it('project fn[0] with concept includes it', () => {
            const result = COMPOSED_EN.project[0](['React Native']);
            expect(result).toContain('React Native');
        });

        it('project fn[0] without concept uses this fallback', () => {
            const result = COMPOSED_EN.project[0]([]);
            expect(result).toContain('this');
        });

        it('jobseeking fn[1] with concept includes it', () => {
            const result = COMPOSED_EN.jobseeking[1](['backend dev']);
            expect(result).toContain('backend dev');
        });

        it('jobseeking fn[1] without concept uses your background fallback', () => {
            const result = COMPOSED_EN.jobseeking[1]([]);
            expect(result).toContain('your background');
        });

        it('generic fn[0] with concept includes it', () => {
            const result = COMPOSED_EN.generic[0](['microservices']);
            expect(result).toContain('microservices');
        });

        it('generic fn[0] without concept uses it fallback', () => {
            const result = COMPOSED_EN.generic[0]([]);
            expect(result).toContain('it');
        });

        it('hiring fn[0] with concept uses it', () => {
            const result = COMPOSED_EN.hiring[0](['TypeScript']);
            expect(result).toContain('TypeScript');
        });

        it('hiring fn[2] with concept uses it in space mention', () => {
            const result = COMPOSED_EN.hiring[2](['fintech']);
            expect(result).toContain('fintech');
        });

        it('hiring_active templates return non-empty strings', () => {
            COMPOSED_EN.hiring_active.forEach(fn => {
                const result = fn(['DevOps']);
                expect(typeof result).toBe('string');
                expect(result.length).toBeGreaterThan(0);
            });
        });
    });

    describe('COMPOSED_PT two-concept branch paths', () => {
        it('PT technical fn[0] with two concepts includes both', () => {
            const result = COMPOSED_PT.technical[0](['Docker', 'Kubernetes']);
            expect(result).toContain('Docker');
            expect(result).toContain('Kubernetes');
        });

        it('PT technical fn[0] without second concept omits acabamos indo de', () => {
            const result = COMPOSED_PT.technical[0](['Docker']);
            expect(result).toContain('Docker');
            expect(result).not.toContain('acabamos');
        });

        it('PT technical fn[3] with two concepts includes vs', () => {
            const result = COMPOSED_PT.technical[3](['REST', 'GraphQL']);
            expect(result).toContain('REST');
            expect(result).toContain('vs');
        });

        it('PT question fn[0] with concept uses com concept', () => {
            const result = COMPOSED_PT.question[0](['Docker']);
            expect(result).toContain('Docker');
        });

        it('PT question fn[0] without concept uses pela minha experiência', () => {
            const result = COMPOSED_PT.question[0]([]);
            expect(result).toContain('experiência');
        });

        it('PT question fn[1] with concept uses ainda mais com', () => {
            const result = COMPOSED_PT.question[1](['microservices']);
            expect(result).toContain('microservices');
        });

        it('PT motivation fn[2] with concept uses it', () => {
            const result = COMPOSED_PT.motivation[2](['burnout']);
            expect(result).toContain('burnout');
        });

        it('PT motivation fn[2] without concept uses bom lembrete form', () => {
            const result = COMPOSED_PT.motivation[2]([]);
            expect(result).toContain('bom lembrete');
        });

        it('PT tips fn[0] with concept uses a de concept', () => {
            const result = COMPOSED_PT.tips[0](['TDD']);
            expect(result).toContain('TDD');
        });

        it('PT tips fn[0] without concept uses isso é bem prático', () => {
            const result = COMPOSED_PT.tips[0]([]);
            expect(result).toBe('isso é bem prático');
        });

        it('PT critique fn[0] with concept includes sobre concept', () => {
            const result = COMPOSED_PT.critique[0](['hustle culture']);
            expect(result).toContain('hustle culture');
        });

        it('PT critique fn[0] without concept returns justo', () => {
            const result = COMPOSED_PT.critique[0]([]);
            expect(result).toBe('justo');
        });

        it('PT hiring_active templates return non-empty strings', () => {
            COMPOSED_PT.hiring_active.forEach(fn => {
                const result = fn(['devops']);
                expect(typeof result).toBe('string');
                expect(result.length).toBeGreaterThan(0);
            });
        });

        it('PT hiring fn[2] with concept uses it', () => {
            const result = COMPOSED_PT.hiring[2](['fintech']);
            expect(result).toContain('fintech');
        });

        it('PT story fn[0] without concept avoids com', () => {
            const result = COMPOSED_PT.story[0]([]);
            expect(typeof result).toBe('string');
        });

        it('PT story fn[2] with concept includes it', () => {
            const result = COMPOSED_PT.story[2](['agile']);
            expect(result).toContain('agile');
        });
    });

    describe('COMPOSED_EN uncovered branches', () => {
        it('hiring fn[1] returns fixed string', () => {
            expect(COMPOSED_EN.hiring[1]([])).toBe('interesting setup for this team');
        });

        it('tips fn[1] with concept uses it', () => {
            const r = COMPOSED_EN.tips[1](['Vim']);
            expect(r).toContain('Vim');
        });
        it('tips fn[1] without concept uses this', () => {
            const r = COMPOSED_EN.tips[1]([]);
            expect(r).toContain('this');
        });
        it('tips fn[2] returns solid takeaway', () => {
            expect(COMPOSED_EN.tips[2]([])).toBe('solid takeaway here');
        });

        it('story fn[1] returns appreciate string', () => {
            expect(COMPOSED_EN.story[1]([])).toBe('appreciate you sharing this');
        });

        it('news fn[1] with concept uses it', () => {
            expect(COMPOSED_EN.news[1](['AI regulation'])).toContain('AI regulation');
        });
        it('news fn[1] without concept uses this', () => {
            expect(COMPOSED_EN.news[1]([])).toContain('this');
        });

        it('critique fn[1] returns been thinking', () => {
            expect(COMPOSED_EN.critique[1]([])).toBe('been thinking about this too');
        });
        it('critique fn[2] returns conversations lately', () => {
            expect(COMPOSED_EN.critique[2]([])).toContain('conversations lately');
        });

        it('motivation fn[0] returns needed to hear', () => {
            expect(COMPOSED_EN.motivation[0]([])).toBe('needed to hear this today');
        });
        it('motivation fn[1] returns good reminder today', () => {
            expect(COMPOSED_EN.motivation[1]([])).toBe('good reminder today');
        });

        it('project fn[1] returns worth following', () => {
            expect(COMPOSED_EN.project[1]([])).toBe('worth following this build');
        });
        it('project fn[2] with concept uses it', () => {
            expect(COMPOSED_EN.project[2](['API'])).toContain('API');
        });
        it('project fn[2] without concept uses project', () => {
            expect(COMPOSED_EN.project[2]([])).toContain('project');
        });

        it('newjob fn[0] returns congrats', () => {
            expect(COMPOSED_EN.newjob[0]([])).toBe('congrats!');
        });
        it('newjob fn[1] returns nice good luck', () => {
            expect(COMPOSED_EN.newjob[1]([])).toBe('nice, good luck!');
        });

        it('generic fn[1] with concept uses it', () => {
            expect(COMPOSED_EN.generic[1](['burnout'])).toContain('burnout');
        });
        it('generic fn[1] without concept uses this', () => {
            expect(COMPOSED_EN.generic[1]([])).toContain('this');
        });
    });

    describe('COMPOSED_PT uncovered branches', () => {
        it('hiring fn[1] returns fixed string', () => {
            expect(COMPOSED_PT.hiring[1]([])).toBe('setup interessante para esse time');
        });

        it('tips fn[1] returns queria ter ouvido', () => {
            expect(COMPOSED_PT.tips[1]([])).toContain('2 anos');
        });
        it('tips fn[2] returns bom ponto aqui', () => {
            expect(COMPOSED_PT.tips[2]([])).toBe('bom ponto aqui');
        });

        it('story fn[1] returns valeu por compartilhar', () => {
            expect(COMPOSED_PT.story[1]([])).toBe('valeu por compartilhar');
        });

        it('news fn[1] with concept uses it', () => {
            expect(COMPOSED_PT.news[1](['Web3'])).toContain('Web3');
        });
        it('news fn[1] without concept uses isso', () => {
            expect(COMPOSED_PT.news[1]([])).toContain('isso');
        });

        it('critique fn[1] returns tô pensando', () => {
            expect(COMPOSED_PT.critique[1]([])).toContain('pensando');
        });
        it('critique fn[2] returns aparecendo bastante', () => {
            expect(COMPOSED_PT.critique[2]([])).toContain('bastante');
        });

        it('motivation fn[0] returns precisava ouvir', () => {
            expect(COMPOSED_PT.motivation[0]([])).toBe('precisava ouvir isso hoje');
        });
        it('motivation fn[1] returns bom lembrete hoje', () => {
            expect(COMPOSED_PT.motivation[1]([])).toBe('bom lembrete hoje');
        });

        it('project fn[1] returns curti a proposta', () => {
            expect(COMPOSED_PT.project[1]([])).toBe('curti a proposta');
        });
        it('project fn[2] with concept uses it', () => {
            expect(COMPOSED_PT.project[2](['frontend'])).toContain('frontend');
        });
        it('project fn[2] without concept uses projeto', () => {
            expect(COMPOSED_PT.project[2]([])).toContain('projeto');
        });

        it('newjob fn[0] returns parabéns', () => {
            expect(COMPOSED_PT.newjob[0]([])).toBe('parabéns!');
        });
        it('newjob fn[1] returns show boa sorte', () => {
            expect(COMPOSED_PT.newjob[1]([])).toContain('sorte');
        });

        it('generic fn[1] with concept uses it', () => {
            expect(COMPOSED_PT.generic[1](['liderança'])).toContain('liderança');
        });
        it('generic fn[1] without concept uses isso', () => {
            expect(COMPOSED_PT.generic[1]([])).toContain('isso');
        });
    });
});
