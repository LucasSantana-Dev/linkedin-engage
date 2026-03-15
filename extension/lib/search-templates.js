(function(root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.LinkedInSearchTemplates = api;
    Object.keys(api).forEach(function(key) {
        if (typeof root[key] === 'undefined') {
            root[key] = api[key];
        }
    });
})(
    typeof globalThis !== 'undefined' ? globalThis : this,
    function() {
        const searchLanguageApi = typeof require === 'function'
            ? require('./search-language')
            : (typeof globalThis !== 'undefined'
                ? globalThis.LinkedInSearchLanguage
                : null);
        const resolveSearchLocale =
            searchLanguageApi?.resolveSearchLocale;
        const localizeSearchTerms =
            searchLanguageApi?.localizeSearchTerms;
        const EXPECTED_RESULTS_BUCKETS = Object.freeze([
            'precise',
            'balanced',
            'broad'
        ]);

        const MODE_USAGE_GOALS = Object.freeze({
            connect: [
                'recruiter_outreach',
                'peer_networking',
                'decision_makers',
                'brazil_focus'
            ],
            companies: [
                'talent_watchlist',
                'brand_watchlist',
                'competitor_watch'
            ],
            jobs: [
                'high_fit_easy_apply',
                'market_scan',
                'target_company_roles'
            ]
        });

        const MODE_DEFAULT_USAGE_GOAL = Object.freeze({
            connect: 'recruiter_outreach',
            companies: 'talent_watchlist',
            jobs: 'high_fit_easy_apply'
        });

        const CONNECT_ROLE_LIMITS = Object.freeze({
            precise: 4,
            balanced: 6,
            broad: 8
        });

        const AREA_FAMILY_MAP = Object.freeze({
            tech: 'tech',
            'tech-frontend': 'tech',
            'tech-backend': 'tech',
            'tech-fullstack': 'tech',
            'tech-devops': 'tech',
            'tech-data': 'tech',
            'tech-cloud': 'tech',
            'tech-security': 'tech',
            'tech-mobile': 'tech',
            'tech-ml-ai': 'tech',
            finance: 'business',
            'real-estate': 'business',
            marketing: 'business',
            sales: 'business',
            headhunting: 'talent',
            'legal-judicial-media': 'regulated',
            'environmental-engineering': 'regulated',
            'sanitary-engineering': 'regulated',
            healthcare: 'regulated',
            education: 'regulated',
            'graphic-design': 'creative',
            'art-direction': 'creative',
            branding: 'creative',
            'ui-ux': 'creative',
            'motion-design': 'creative',
            'video-editing': 'creative',
            videomaker: 'creative',
            custom: 'custom',
            creative: 'creative',
            business: 'business',
            regulated: 'regulated',
            talent: 'talent',
            any: 'custom'
        });

        const SEARCH_TEMPLATES = Object.freeze([
            {
                id: 'connect.tech.recruiter_outreach.precise',
                mode: 'connect',
                areaPreset: 'tech',
                usageGoal: 'recruiter_outreach',
                expectedResultsBucket: 'precise',
                querySpec: {
                    role: [
                        'recruiter',
                        'talent acquisition',
                        'hiring manager',
                        'sourcer'
                    ],
                    industry: ['software', 'engineering'],
                    market: ['nearshore', 'brazil'],
                    level: ['senior']
                },
                filterSpec: {
                    degree2nd: true,
                    degree3rd: false,
                    activelyHiring: true
                },
                defaults: {
                    roleLimit: 4,
                    region: '106057199'
                }
            },
            {
                id: 'connect.tech.peer_networking.balanced',
                mode: 'connect',
                areaPreset: 'tech',
                usageGoal: 'peer_networking',
                expectedResultsBucket: 'balanced',
                querySpec: {
                    role: [
                        'software engineer',
                        'engineering manager',
                        'developer',
                        'tech lead',
                        'product manager',
                        'qa'
                    ],
                    industry: ['tech', 'data', 'startup'],
                    market: ['latam'],
                    level: ['mid-level', 'senior']
                },
                filterSpec: {
                    degree2nd: true,
                    degree3rd: true,
                    activelyHiring: false
                },
                defaults: {
                    roleLimit: 6
                }
            },
            {
                id: 'connect.tech-frontend.peer_networking.balanced',
                mode: 'connect',
                areaPreset: 'tech-frontend',
                usageGoal: 'peer_networking',
                expectedResultsBucket: 'balanced',
                querySpec: {
                    role: [
                        'frontend engineer',
                        'frontend developer',
                        'react developer',
                        'ui engineer',
                        'web developer',
                        'tech lead'
                    ],
                    industry: ['web development', 'SaaS', 'frontend'],
                    market: ['latam'],
                    level: ['mid-level', 'senior']
                },
                filterSpec: {
                    degree2nd: true,
                    degree3rd: true,
                    activelyHiring: false
                },
                defaults: { roleLimit: 6 }
            },
            {
                id: 'connect.tech-frontend.recruiter_outreach.precise',
                mode: 'connect',
                areaPreset: 'tech-frontend',
                usageGoal: 'recruiter_outreach',
                expectedResultsBucket: 'precise',
                querySpec: {
                    role: [
                        'recruiter',
                        'talent acquisition',
                        'hiring manager',
                        'sourcer'
                    ],
                    industry: ['web development', 'SaaS', 'software'],
                    market: ['brazil'],
                    level: ['senior']
                },
                filterSpec: {
                    degree2nd: true,
                    degree3rd: false,
                    activelyHiring: true
                },
                defaults: { roleLimit: 4, region: '106057199' }
            },
            {
                id: 'connect.tech-backend.peer_networking.balanced',
                mode: 'connect',
                areaPreset: 'tech-backend',
                usageGoal: 'peer_networking',
                expectedResultsBucket: 'balanced',
                querySpec: {
                    role: [
                        'backend engineer',
                        'backend developer',
                        'api engineer',
                        'platform engineer',
                        'software engineer',
                        'tech lead'
                    ],
                    industry: ['backend development', 'SaaS', 'infrastructure'],
                    market: ['latam'],
                    level: ['mid-level', 'senior']
                },
                filterSpec: {
                    degree2nd: true,
                    degree3rd: true,
                    activelyHiring: false
                },
                defaults: { roleLimit: 6 }
            },
            {
                id: 'connect.tech-backend.recruiter_outreach.precise',
                mode: 'connect',
                areaPreset: 'tech-backend',
                usageGoal: 'recruiter_outreach',
                expectedResultsBucket: 'precise',
                querySpec: {
                    role: [
                        'recruiter',
                        'talent acquisition',
                        'hiring manager',
                        'sourcer'
                    ],
                    industry: ['software', 'fintech', 'infrastructure'],
                    market: ['brazil'],
                    level: ['senior']
                },
                filterSpec: {
                    degree2nd: true,
                    degree3rd: false,
                    activelyHiring: true
                },
                defaults: { roleLimit: 4, region: '106057199' }
            },
            {
                id: 'connect.tech-fullstack.peer_networking.balanced',
                mode: 'connect',
                areaPreset: 'tech-fullstack',
                usageGoal: 'peer_networking',
                expectedResultsBucket: 'balanced',
                querySpec: {
                    role: [
                        'full stack engineer',
                        'fullstack developer',
                        'software engineer',
                        'product engineer',
                        'web developer',
                        'tech lead'
                    ],
                    industry: ['software development', 'SaaS', 'startup'],
                    market: ['latam'],
                    level: ['mid-level', 'senior']
                },
                filterSpec: {
                    degree2nd: true,
                    degree3rd: true,
                    activelyHiring: false
                },
                defaults: { roleLimit: 6 }
            },
            {
                id: 'connect.tech-devops.peer_networking.balanced',
                mode: 'connect',
                areaPreset: 'tech-devops',
                usageGoal: 'peer_networking',
                expectedResultsBucket: 'balanced',
                querySpec: {
                    role: [
                        'devops engineer',
                        'site reliability engineer',
                        'platform engineer',
                        'infrastructure engineer',
                        'cloud engineer'
                    ],
                    industry: ['devops', 'cloud computing', 'infrastructure'],
                    market: ['latam'],
                    level: ['mid-level', 'senior']
                },
                filterSpec: {
                    degree2nd: true,
                    degree3rd: true,
                    activelyHiring: false
                },
                defaults: { roleLimit: 6 }
            },
            {
                id: 'connect.tech-data.peer_networking.balanced',
                mode: 'connect',
                areaPreset: 'tech-data',
                usageGoal: 'peer_networking',
                expectedResultsBucket: 'balanced',
                querySpec: {
                    role: [
                        'data engineer',
                        'data scientist',
                        'analytics engineer',
                        'data analyst',
                        'machine learning engineer'
                    ],
                    industry: [
                        'data engineering',
                        'analytics',
                        'artificial intelligence'
                    ],
                    market: ['latam'],
                    level: ['mid-level', 'senior']
                },
                filterSpec: {
                    degree2nd: true,
                    degree3rd: true,
                    activelyHiring: false
                },
                defaults: { roleLimit: 6 }
            },
            {
                id: 'connect.tech-cloud.peer_networking.balanced',
                mode: 'connect',
                areaPreset: 'tech-cloud',
                usageGoal: 'peer_networking',
                expectedResultsBucket: 'balanced',
                querySpec: {
                    role: [
                        'cloud engineer',
                        'cloud architect',
                        'solutions architect',
                        'infrastructure engineer',
                        'devops engineer'
                    ],
                    industry: ['cloud computing', 'infrastructure', 'SaaS'],
                    market: ['latam', 'global'],
                    level: ['mid-level', 'senior']
                },
                filterSpec: {
                    degree2nd: true,
                    degree3rd: true,
                    activelyHiring: false
                },
                defaults: { roleLimit: 6 }
            },
            {
                id: 'connect.tech-security.peer_networking.balanced',
                mode: 'connect',
                areaPreset: 'tech-security',
                usageGoal: 'peer_networking',
                expectedResultsBucket: 'balanced',
                querySpec: {
                    role: [
                        'security engineer',
                        'cybersecurity analyst',
                        'application security',
                        'security architect',
                        'penetration tester'
                    ],
                    industry: [
                        'cybersecurity',
                        'information security',
                        'cloud security'
                    ],
                    market: ['latam'],
                    level: ['mid-level', 'senior']
                },
                filterSpec: {
                    degree2nd: true,
                    degree3rd: true,
                    activelyHiring: false
                },
                defaults: { roleLimit: 6 }
            },
            {
                id: 'connect.tech-mobile.peer_networking.balanced',
                mode: 'connect',
                areaPreset: 'tech-mobile',
                usageGoal: 'peer_networking',
                expectedResultsBucket: 'balanced',
                querySpec: {
                    role: [
                        'mobile engineer',
                        'ios developer',
                        'android developer',
                        'react native developer',
                        'mobile developer'
                    ],
                    industry: ['mobile development', 'fintech', 'startup'],
                    market: ['latam'],
                    level: ['mid-level', 'senior']
                },
                filterSpec: {
                    degree2nd: true,
                    degree3rd: true,
                    activelyHiring: false
                },
                defaults: { roleLimit: 6 }
            },
            {
                id: 'connect.tech-ml-ai.peer_networking.balanced',
                mode: 'connect',
                areaPreset: 'tech-ml-ai',
                usageGoal: 'peer_networking',
                expectedResultsBucket: 'balanced',
                querySpec: {
                    role: [
                        'machine learning engineer',
                        'ai engineer',
                        'data scientist',
                        'nlp engineer',
                        'ml ops engineer'
                    ],
                    industry: [
                        'artificial intelligence',
                        'machine learning',
                        'deep learning'
                    ],
                    market: ['latam', 'global'],
                    level: ['mid-level', 'senior']
                },
                filterSpec: {
                    degree2nd: true,
                    degree3rd: true,
                    activelyHiring: false
                },
                defaults: { roleLimit: 6 }
            },
            {
                id: 'connect.business.decision_makers.balanced',
                mode: 'connect',
                areaPreset: 'business',
                usageGoal: 'decision_makers',
                expectedResultsBucket: 'balanced',
                querySpec: {
                    role: [
                        'head of talent',
                        'hiring manager',
                        'recruiter',
                        'director',
                        'manager'
                    ],
                    industry: [
                        'finance',
                        'financial services',
                        'sales',
                        'marketing'
                    ],
                    market: ['global', 'latam'],
                    level: ['senior', 'lead']
                },
                filterSpec: {
                    degree2nd: true,
                    degree3rd: true,
                    activelyHiring: false,
                    skipOpenToWorkRecruiters: true,
                    skipJobSeekingSignals: true
                },
                defaults: {
                    roleLimit: 6
                }
            },
            {
                id: 'connect.creative.peer_networking.precise',
                mode: 'connect',
                areaPreset: 'creative',
                usageGoal: 'peer_networking',
                expectedResultsBucket: 'precise',
                querySpec: {
                    role: [
                        'product designer',
                        'ux designer',
                        'ui designer',
                        'art director'
                    ],
                    industry: [
                        'design',
                        'product design',
                        'user experience'
                    ],
                    market: ['brazil', 'latam'],
                    level: ['mid-level', 'senior']
                },
                filterSpec: {
                    degree2nd: true,
                    degree3rd: false,
                    activelyHiring: false
                },
                defaults: {
                    roleLimit: 4
                }
            },
            {
                id: 'connect.talent.recruiter_outreach.balanced',
                mode: 'connect',
                areaPreset: 'talent',
                usageGoal: 'recruiter_outreach',
                expectedResultsBucket: 'balanced',
                querySpec: {
                    role: [
                        'recruiter',
                        'talent acquisition',
                        'headhunter',
                        'executive search',
                        'sourcer'
                    ],
                    industry: ['recruiting', 'staffing'],
                    market: ['latam', 'brazil'],
                    level: ['senior', 'lead']
                },
                filterSpec: {
                    degree2nd: true,
                    degree3rd: true,
                    activelyHiring: true
                },
                defaults: {
                    roleLimit: 6
                }
            },
            {
                id: 'connect.custom.brazil_focus.precise',
                mode: 'connect',
                areaPreset: 'custom',
                usageGoal: 'brazil_focus',
                expectedResultsBucket: 'precise',
                querySpec: {
                    role: [
                        'recruiter',
                        'talent acquisition',
                        'hiring manager'
                    ],
                    industry: ['technology'],
                    market: ['brazil', 'hiring in brazil'],
                    level: []
                },
                filterSpec: {
                    degree2nd: true,
                    degree3rd: false,
                    activelyHiring: true
                },
                defaults: {
                    roleLimit: 4,
                    region: '106057199'
                }
            },
            {
                id: 'connect.custom.recruiter_outreach.balanced',
                mode: 'connect',
                areaPreset: 'custom',
                usageGoal: 'recruiter_outreach',
                expectedResultsBucket: 'balanced',
                querySpec: {
                    role: [
                        'recruiter',
                        'talent acquisition',
                        'hiring manager',
                        'head of talent'
                    ],
                    industry: ['tech'],
                    market: ['global'],
                    level: ['senior']
                },
                filterSpec: {
                    degree2nd: true,
                    degree3rd: true,
                    activelyHiring: false
                },
                defaults: {
                    roleLimit: 6
                }
            },
            {
                id: 'connect.custom.peer_networking.balanced',
                mode: 'connect',
                areaPreset: 'custom',
                usageGoal: 'peer_networking',
                expectedResultsBucket: 'balanced',
                querySpec: {
                    role: ['software engineer', 'product manager'],
                    industry: ['technology'],
                    market: ['global'],
                    level: ['mid-level', 'senior']
                },
                filterSpec: {
                    degree2nd: true,
                    degree3rd: true,
                    activelyHiring: false
                },
                defaults: {
                    roleLimit: 6
                }
            },
            {
                id: 'companies.creative.brand_watchlist.balanced',
                mode: 'companies',
                areaPreset: 'creative',
                usageGoal: 'brand_watchlist',
                expectedResultsBucket: 'balanced',
                querySpec: {
                    keywords: [
                        'branding',
                        'brand strategy',
                        'visual identity',
                        'creative direction'
                    ]
                },
                filterSpec: {
                    batchSize: 12
                },
                defaults: {
                    targetCompanies: [
                        'Interbrand',
                        'Landor',
                        'Wolff Olins',
                        'FutureBrand',
                        'Canva',
                        'Figma',
                        'Adobe'
                    ]
                }
            },
            {
                id: 'companies.custom.competitor_watch.precise',
                mode: 'companies',
                areaPreset: 'custom',
                usageGoal: 'competitor_watch',
                expectedResultsBucket: 'precise',
                querySpec: {
                    keywords: ['software company', 'technology']
                },
                filterSpec: {
                    batchSize: 8
                },
                defaults: {
                    targetCompanies: []
                }
            },
            {
                id: 'companies.tech.talent_watchlist.balanced',
                mode: 'companies',
                areaPreset: 'tech',
                usageGoal: 'talent_watchlist',
                expectedResultsBucket: 'balanced',
                querySpec: {
                    keywords: [
                        'software engineering teams',
                        'developer tools',
                        'saas'
                    ]
                },
                filterSpec: {
                    batchSize: 10
                },
                defaults: {
                    targetCompanies: [
                        'Vercel',
                        'Supabase',
                        'Datadog',
                        'Cloudflare'
                    ]
                }
            },
            {
                id: 'companies.tech-frontend.talent_watchlist.balanced',
                mode: 'companies',
                areaPreset: 'tech-frontend',
                usageGoal: 'talent_watchlist',
                expectedResultsBucket: 'balanced',
                querySpec: {
                    keywords: [
                        'frontend engineering',
                        'web development',
                        'design systems'
                    ]
                },
                filterSpec: { batchSize: 10 },
                defaults: {
                    targetCompanies: [
                        'Vercel', 'Netlify', 'Shopify', 'Canva',
                        'Figma', 'Airbnb', 'Nubank', 'Mercado Livre'
                    ]
                }
            },
            {
                id: 'companies.tech-backend.talent_watchlist.balanced',
                mode: 'companies',
                areaPreset: 'tech-backend',
                usageGoal: 'talent_watchlist',
                expectedResultsBucket: 'balanced',
                querySpec: {
                    keywords: [
                        'backend engineering',
                        'api development',
                        'platform engineering'
                    ]
                },
                filterSpec: { batchSize: 10 },
                defaults: {
                    targetCompanies: [
                        'Stripe', 'Datadog', 'Cloudflare', 'Nubank',
                        'PagSeguro', 'Stone', 'iFood', 'Mercado Livre'
                    ]
                }
            },
            {
                id: 'companies.tech-fullstack.talent_watchlist.balanced',
                mode: 'companies',
                areaPreset: 'tech-fullstack',
                usageGoal: 'talent_watchlist',
                expectedResultsBucket: 'balanced',
                querySpec: {
                    keywords: [
                        'software engineering',
                        'full stack development',
                        'product engineering'
                    ]
                },
                filterSpec: { batchSize: 10 },
                defaults: {
                    targetCompanies: [
                        'Vercel', 'Supabase', 'Shopify', 'GitLab',
                        'Nubank', 'iFood', 'Mercado Livre', 'VTEX'
                    ]
                }
            },
            {
                id: 'companies.tech-devops.talent_watchlist.balanced',
                mode: 'companies',
                areaPreset: 'tech-devops',
                usageGoal: 'talent_watchlist',
                expectedResultsBucket: 'balanced',
                querySpec: {
                    keywords: [
                        'devops',
                        'site reliability',
                        'platform engineering',
                        'cloud infrastructure'
                    ]
                },
                filterSpec: { batchSize: 10 },
                defaults: {
                    targetCompanies: [
                        'Datadog', 'HashiCorp', 'Cloudflare',
                        'GitLab', 'Nubank', 'iFood', 'Stone', 'CI&T'
                    ]
                }
            },
            {
                id: 'companies.tech-data.talent_watchlist.balanced',
                mode: 'companies',
                areaPreset: 'tech-data',
                usageGoal: 'talent_watchlist',
                expectedResultsBucket: 'balanced',
                querySpec: {
                    keywords: [
                        'data engineering',
                        'data science',
                        'analytics',
                        'machine learning'
                    ]
                },
                filterSpec: { batchSize: 10 },
                defaults: {
                    targetCompanies: [
                        'Databricks', 'Snowflake', 'Confluent',
                        'Nubank', 'Itau Unibanco', 'iFood', 'Stone', 'CI&T'
                    ]
                }
            },
            {
                id: 'companies.tech-ml-ai.talent_watchlist.balanced',
                mode: 'companies',
                areaPreset: 'tech-ml-ai',
                usageGoal: 'talent_watchlist',
                expectedResultsBucket: 'balanced',
                querySpec: {
                    keywords: [
                        'artificial intelligence',
                        'machine learning',
                        'generative ai',
                        'ai research'
                    ]
                },
                filterSpec: { batchSize: 10 },
                defaults: {
                    targetCompanies: [
                        'OpenAI', 'Anthropic', 'Hugging Face',
                        'Databricks', 'Nubank', 'iFood', 'Take Blip', 'CI&T'
                    ]
                }
            },
            {
                id: 'companies.tech-security.talent_watchlist.balanced',
                mode: 'companies',
                areaPreset: 'tech-security',
                usageGoal: 'talent_watchlist',
                expectedResultsBucket: 'balanced',
                querySpec: {
                    keywords: [
                        'cybersecurity',
                        'information security',
                        'application security'
                    ]
                },
                filterSpec: { batchSize: 10 },
                defaults: {
                    targetCompanies: [
                        'CrowdStrike', 'Cloudflare', 'Snyk',
                        'Nubank', 'Itau Unibanco', 'Tempest Security', 'Axur', 'CI&T'
                    ]
                }
            },
            {
                id: 'companies.tech-mobile.talent_watchlist.balanced',
                mode: 'companies',
                areaPreset: 'tech-mobile',
                usageGoal: 'talent_watchlist',
                expectedResultsBucket: 'balanced',
                querySpec: {
                    keywords: [
                        'mobile development',
                        'ios',
                        'android',
                        'react native'
                    ]
                },
                filterSpec: { batchSize: 10 },
                defaults: {
                    targetCompanies: [
                        'Shopify', 'Nubank', 'iFood', 'PicPay',
                        'C6 Bank', 'Wildlife Studios', 'Rappi', 'CI&T'
                    ]
                }
            },
            {
                id: 'companies.tech-cloud.talent_watchlist.balanced',
                mode: 'companies',
                areaPreset: 'tech-cloud',
                usageGoal: 'talent_watchlist',
                expectedResultsBucket: 'balanced',
                querySpec: {
                    keywords: [
                        'cloud computing',
                        'cloud infrastructure',
                        'solutions architect'
                    ]
                },
                filterSpec: { batchSize: 10 },
                defaults: {
                    targetCompanies: [
                        'Amazon Web Services', 'Google Cloud',
                        'Cloudflare', 'HashiCorp', 'Nubank',
                        'Itau Unibanco', 'CI&T', 'Thoughtworks'
                    ]
                }
            },
            {
                id: 'companies.custom.talent_watchlist.balanced',
                mode: 'companies',
                areaPreset: 'custom',
                usageGoal: 'talent_watchlist',
                expectedResultsBucket: 'balanced',
                querySpec: {
                    keywords: ['technology companies', 'hiring teams']
                },
                filterSpec: {
                    batchSize: 10
                },
                defaults: {
                    targetCompanies: []
                }
            },
            {
                id: 'jobs.tech.high_fit_easy_apply.precise',
                mode: 'jobs',
                areaPreset: 'tech',
                usageGoal: 'high_fit_easy_apply',
                expectedResultsBucket: 'precise',
                querySpec: {
                    roleTerms: [
                        'software engineer',
                        'backend engineer',
                        'full stack engineer',
                        'product engineer'
                    ],
                    locationTerms: ['remote', 'brazil'],
                    keywords: ['easy apply']
                },
                filterSpec: {
                    easyApplyOnly: true,
                    workType: '2',
                    experienceLevel: '4'
                },
                defaults: {
                    preferredCompanies: [],
                    excludedCompanies: []
                }
            },
            {
                id: 'jobs.tech-frontend.high_fit_easy_apply.precise',
                mode: 'jobs',
                areaPreset: 'tech-frontend',
                usageGoal: 'high_fit_easy_apply',
                expectedResultsBucket: 'precise',
                querySpec: {
                    roleTerms: [
                        'frontend engineer',
                        'frontend developer',
                        'react developer',
                        'ui engineer'
                    ],
                    locationTerms: ['remote', 'brazil'],
                    keywords: ['easy apply']
                },
                filterSpec: {
                    easyApplyOnly: true,
                    workType: '2',
                    experienceLevel: '4'
                },
                defaults: {
                    preferredCompanies: [
                        'Vercel', 'Netlify', 'Shopify', 'Nubank',
                        'iFood', 'Mercado Livre', 'VTEX', 'QuintoAndar'
                    ],
                    excludedCompanies: []
                }
            },
            {
                id: 'jobs.tech-backend.high_fit_easy_apply.precise',
                mode: 'jobs',
                areaPreset: 'tech-backend',
                usageGoal: 'high_fit_easy_apply',
                expectedResultsBucket: 'precise',
                querySpec: {
                    roleTerms: [
                        'backend engineer',
                        'backend developer',
                        'api engineer',
                        'platform engineer'
                    ],
                    locationTerms: ['remote', 'brazil'],
                    keywords: ['easy apply']
                },
                filterSpec: {
                    easyApplyOnly: true,
                    workType: '2',
                    experienceLevel: '4'
                },
                defaults: {
                    preferredCompanies: [
                        'Stripe', 'Datadog', 'Cloudflare', 'Nubank',
                        'PagSeguro', 'Stone', 'iFood', 'Mercado Livre'
                    ],
                    excludedCompanies: []
                }
            },
            {
                id: 'jobs.tech-fullstack.high_fit_easy_apply.precise',
                mode: 'jobs',
                areaPreset: 'tech-fullstack',
                usageGoal: 'high_fit_easy_apply',
                expectedResultsBucket: 'precise',
                querySpec: {
                    roleTerms: [
                        'full stack engineer',
                        'fullstack developer',
                        'software engineer',
                        'product engineer'
                    ],
                    locationTerms: ['remote', 'brazil'],
                    keywords: ['easy apply']
                },
                filterSpec: {
                    easyApplyOnly: true,
                    workType: '2',
                    experienceLevel: '4'
                },
                defaults: {
                    preferredCompanies: [
                        'Vercel', 'Supabase', 'Shopify', 'Nubank',
                        'iFood', 'Mercado Livre', 'QuintoAndar', 'Loft'
                    ],
                    excludedCompanies: []
                }
            },
            {
                id: 'jobs.tech-devops.high_fit_easy_apply.precise',
                mode: 'jobs',
                areaPreset: 'tech-devops',
                usageGoal: 'high_fit_easy_apply',
                expectedResultsBucket: 'precise',
                querySpec: {
                    roleTerms: [
                        'devops engineer',
                        'site reliability engineer',
                        'platform engineer',
                        'infrastructure engineer'
                    ],
                    locationTerms: ['remote', 'brazil'],
                    keywords: ['easy apply']
                },
                filterSpec: {
                    easyApplyOnly: true,
                    workType: '2',
                    experienceLevel: '4'
                },
                defaults: {
                    preferredCompanies: [
                        'Datadog', 'HashiCorp', 'Cloudflare', 'GitLab',
                        'Nubank', 'iFood', 'Stone', 'CI&T'
                    ],
                    excludedCompanies: []
                }
            },
            {
                id: 'jobs.tech-data.high_fit_easy_apply.precise',
                mode: 'jobs',
                areaPreset: 'tech-data',
                usageGoal: 'high_fit_easy_apply',
                expectedResultsBucket: 'precise',
                querySpec: {
                    roleTerms: [
                        'data engineer',
                        'data scientist',
                        'analytics engineer',
                        'machine learning engineer'
                    ],
                    locationTerms: ['remote', 'brazil'],
                    keywords: ['easy apply']
                },
                filterSpec: {
                    easyApplyOnly: true,
                    workType: '2',
                    experienceLevel: '4'
                },
                defaults: {
                    preferredCompanies: [
                        'Databricks', 'Snowflake', 'Confluent', 'Nubank',
                        'Itau Unibanco', 'iFood', 'Stone', 'CI&T'
                    ],
                    excludedCompanies: []
                }
            },
            {
                id: 'jobs.tech-cloud.high_fit_easy_apply.precise',
                mode: 'jobs',
                areaPreset: 'tech-cloud',
                usageGoal: 'high_fit_easy_apply',
                expectedResultsBucket: 'precise',
                querySpec: {
                    roleTerms: [
                        'cloud engineer',
                        'cloud architect',
                        'solutions architect',
                        'infrastructure engineer'
                    ],
                    locationTerms: ['remote', 'brazil'],
                    keywords: ['easy apply']
                },
                filterSpec: {
                    easyApplyOnly: true,
                    workType: '2',
                    experienceLevel: '4'
                },
                defaults: {
                    preferredCompanies: [
                        'Amazon Web Services', 'Google Cloud',
                        'Cloudflare', 'Nubank', 'Itau Unibanco', 'CI&T'
                    ],
                    excludedCompanies: []
                }
            },
            {
                id: 'jobs.tech-security.high_fit_easy_apply.precise',
                mode: 'jobs',
                areaPreset: 'tech-security',
                usageGoal: 'high_fit_easy_apply',
                expectedResultsBucket: 'precise',
                querySpec: {
                    roleTerms: [
                        'security engineer',
                        'cybersecurity analyst',
                        'application security',
                        'security architect'
                    ],
                    locationTerms: ['remote', 'brazil'],
                    keywords: ['easy apply']
                },
                filterSpec: {
                    easyApplyOnly: true,
                    workType: '2',
                    experienceLevel: '4'
                },
                defaults: {
                    preferredCompanies: [
                        'CrowdStrike', 'Cloudflare', 'Snyk',
                        'Nubank', 'Itau Unibanco', 'Tempest Security', 'Axur'
                    ],
                    excludedCompanies: []
                }
            },
            {
                id: 'jobs.tech-mobile.high_fit_easy_apply.precise',
                mode: 'jobs',
                areaPreset: 'tech-mobile',
                usageGoal: 'high_fit_easy_apply',
                expectedResultsBucket: 'precise',
                querySpec: {
                    roleTerms: [
                        'mobile engineer',
                        'ios developer',
                        'android developer',
                        'react native developer'
                    ],
                    locationTerms: ['remote', 'brazil'],
                    keywords: ['easy apply']
                },
                filterSpec: {
                    easyApplyOnly: true,
                    workType: '2',
                    experienceLevel: '4'
                },
                defaults: {
                    preferredCompanies: [
                        'Nubank', 'iFood', 'PicPay', 'C6 Bank',
                        'Wildlife Studios', 'Rappi', 'Shopify', 'Airbnb'
                    ],
                    excludedCompanies: []
                }
            },
            {
                id: 'jobs.tech-ml-ai.high_fit_easy_apply.precise',
                mode: 'jobs',
                areaPreset: 'tech-ml-ai',
                usageGoal: 'high_fit_easy_apply',
                expectedResultsBucket: 'precise',
                querySpec: {
                    roleTerms: [
                        'machine learning engineer',
                        'ai engineer',
                        'data scientist',
                        'nlp engineer'
                    ],
                    locationTerms: ['remote', 'brazil'],
                    keywords: ['easy apply']
                },
                filterSpec: {
                    easyApplyOnly: true,
                    workType: '2',
                    experienceLevel: '4'
                },
                defaults: {
                    preferredCompanies: [
                        'OpenAI', 'Anthropic', 'Hugging Face', 'Databricks',
                        'Nubank', 'iFood', 'Take Blip', 'CI&T'
                    ],
                    excludedCompanies: []
                }
            },
            {
                id: 'jobs.any.market_scan.broad',
                mode: 'jobs',
                areaPreset: 'any',
                usageGoal: 'market_scan',
                expectedResultsBucket: 'broad',
                querySpec: {
                    roleTerms: [
                        'software engineer',
                        'product manager',
                        'designer',
                        'analyst'
                    ],
                    locationTerms: ['remote'],
                    keywords: ['technology']
                },
                filterSpec: {
                    easyApplyOnly: true
                },
                defaults: {
                    preferredCompanies: [],
                    excludedCompanies: []
                }
            },
            {
                id: 'jobs.creative.target_company_roles.balanced',
                mode: 'jobs',
                areaPreset: 'creative',
                usageGoal: 'target_company_roles',
                expectedResultsBucket: 'balanced',
                querySpec: {
                    roleTerms: [
                        'product designer',
                        'ux designer',
                        'ui designer',
                        'brand designer'
                    ],
                    locationTerms: ['remote', 'hybrid'],
                    keywords: ['design system', 'creative']
                },
                filterSpec: {
                    easyApplyOnly: true,
                    workType: '3',
                    experienceLevel: '3'
                },
                defaults: {
                    preferredCompanies: [
                        'Canva',
                        'Figma',
                        'Nubank',
                        'Mercado Livre'
                    ],
                    excludedCompanies: []
                }
            },
            {
                id: 'jobs.custom.high_fit_easy_apply.balanced',
                mode: 'jobs',
                areaPreset: 'custom',
                usageGoal: 'high_fit_easy_apply',
                expectedResultsBucket: 'balanced',
                querySpec: {
                    roleTerms: ['software engineer', 'developer'],
                    locationTerms: ['remote'],
                    keywords: ['easy apply']
                },
                filterSpec: {
                    easyApplyOnly: true
                },
                defaults: {
                    preferredCompanies: [],
                    excludedCompanies: []
                }
            }
        ]);

        function normalizeMode(value) {
            const mode = String(value || '').toLowerCase().trim();
            if (mode === 'connect' || mode === 'companies' || mode === 'jobs') {
                return mode;
            }
            return 'connect';
        }

        function normalizeExpectedResultsBucket(value) {
            const bucket = String(value || '').toLowerCase().trim();
            if (EXPECTED_RESULTS_BUCKETS.includes(bucket)) {
                return bucket;
            }
            return 'balanced';
        }

        function normalizeUsageGoal(mode, value) {
            const normalizedMode = normalizeMode(mode);
            const goals = MODE_USAGE_GOALS[normalizedMode] || [];
            const goal = String(value || '').toLowerCase().trim();
            if (goals.includes(goal)) {
                return goal;
            }
            return MODE_DEFAULT_USAGE_GOAL[normalizedMode];
        }

        function normalizeAreaPresetValue(value) {
            const raw = String(value || '').trim();
            if (!raw) return 'custom';
            if (typeof normalizeAreaPreset === 'function') {
                return normalizeAreaPreset(raw);
            }
            return raw.toLowerCase();
        }

        function normalizeAreaFamily(areaPreset) {
            const key = normalizeAreaPresetValue(areaPreset);
            return AREA_FAMILY_MAP[key] || 'custom';
        }

        function listFrom(value) {
            if (Array.isArray(value)) {
                return value.map(item => String(item || '').trim())
                    .filter(Boolean);
            }
            if (typeof value === 'string') {
                return value.split('\n')
                    .map(item => item.trim())
                    .filter(Boolean);
            }
            return [];
        }

        function uniqueNormalized(values) {
            const seen = new Set();
            const out = [];
            for (const raw of listFrom(values)) {
                const key = String(raw).toLowerCase().trim();
                if (!key || seen.has(key)) continue;
                seen.add(key);
                out.push(raw);
            }
            return out;
        }

        function sanitizeBooleanTerm(value) {
            let text = String(value || '')
                .replace(/[()]/g, ' ')
                .replace(/[,:;!?]+/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            if (!text) return '';
            if (/^(AND|OR|NOT)$/i.test(text)) {
                return text.toUpperCase();
            }
            const quoted = /^".*"$/.test(text);
            if (!quoted && /\s/.test(text)) {
                text = `"${text}"`;
            }
            return text;
        }

        function trimShouldByBudget(should, must, mustNot, budget, explicitAnd) {
            let nextShould = should.slice();
            let nextMust = must.slice();
            let nextMustNot = mustNot.slice();
            let operatorCount = countOperators(
                nextShould,
                nextMust,
                nextMustNot,
                explicitAnd
            );
            while (operatorCount > budget && nextShould.length > 1) {
                nextShould.pop();
                operatorCount = countOperators(
                    nextShould,
                    nextMust,
                    nextMustNot,
                    explicitAnd
                );
            }
            while (operatorCount > budget && nextMust.length > 0) {
                nextMust.pop();
                operatorCount = countOperators(
                    nextShould,
                    nextMust,
                    nextMustNot,
                    explicitAnd
                );
            }
            while (operatorCount > budget && nextMustNot.length > 0) {
                nextMustNot.pop();
                operatorCount = countOperators(
                    nextShould,
                    nextMust,
                    nextMustNot,
                    explicitAnd
                );
            }
            return {
                should: nextShould,
                must: nextMust,
                mustNot: nextMustNot,
                operatorCount
            };
        }

        function countOperators(should, must, mustNot, explicitAnd) {
            const orCount = should.length > 1 ? should.length - 1 : 0;
            const notCount = mustNot.length;
            let clauseCount = 0;
            if (should.length > 0) clauseCount += 1;
            clauseCount += must.length;
            clauseCount += mustNot.length;
            const andCount = explicitAnd
                ? Math.max(0, clauseCount - 1)
                : 0;
            return orCount + notCount + andCount;
        }

        function compileBooleanQuery(config) {
            const source = config && typeof config === 'object'
                ? config
                : {};
            const budget = Math.max(
                1,
                Math.min(20, Number(source.budget) || 12)
            );
            const explicitAnd = source.explicitAnd === true;
            const wrapShould = source.wrapShould !== false;
            const should = uniqueNormalized(source.should)
                .map(sanitizeBooleanTerm)
                .filter(Boolean);
            const must = uniqueNormalized(source.must)
                .map(sanitizeBooleanTerm)
                .filter(Boolean);
            const mustNot = uniqueNormalized(source.mustNot)
                .map(sanitizeBooleanTerm)
                .filter(Boolean);

            const trimmed = trimShouldByBudget(
                should,
                must,
                mustNot,
                budget,
                explicitAnd
            );

            const clauses = [];
            if (trimmed.should.length > 0) {
                let shouldClause = trimmed.should.join(' OR ');
                if (wrapShould && trimmed.should.length > 1) {
                    shouldClause = `(${shouldClause})`;
                }
                clauses.push(shouldClause);
            }
            trimmed.must.forEach(term => clauses.push(term));
            trimmed.mustNot.forEach(term => {
                clauses.push(`NOT ${term}`);
            });

            const query = explicitAnd
                ? clauses.join(' AND ').trim()
                : clauses.join(' ').trim();

            return {
                query,
                should: trimmed.should,
                must: trimmed.must,
                mustNot: trimmed.mustNot,
                operatorCount: trimmed.operatorCount,
                budget,
                explicitAnd
            };
        }

        function countBooleanOperators(query) {
            return String(query || '')
                .split(/\s+/)
                .filter(token => /^(AND|OR|NOT)$/i.test(token))
                .length;
        }

        function findTemplateById(id) {
            return SEARCH_TEMPLATES.find(template => template.id === id) || null;
        }

        function findModeDefaultTemplate(mode, usageGoal, expectedResultsBucket) {
            const byGoal = SEARCH_TEMPLATES.find(template =>
                template.mode === mode &&
                template.areaPreset === 'custom' &&
                template.usageGoal === usageGoal &&
                template.expectedResultsBucket === expectedResultsBucket
            );
            if (byGoal) return byGoal;
            return SEARCH_TEMPLATES.find(template =>
                template.mode === mode &&
                template.areaPreset === 'custom' &&
                template.expectedResultsBucket === 'balanced'
            ) || SEARCH_TEMPLATES.find(template => template.mode === mode) || null;
        }

        function selectSearchTemplate(options) {
            const source = options && typeof options === 'object'
                ? options
                : {};
            const mode = normalizeMode(source.mode);
            const usageGoal = normalizeUsageGoal(mode, source.usageGoal);
            const expectedResultsBucket = normalizeExpectedResultsBucket(
                source.expectedResultsBucket
            );
            const auto = source.auto !== false;
            const areaPreset = normalizeAreaPresetValue(source.areaPreset);
            const areaFamily = normalizeAreaFamily(areaPreset);

            if (!auto) {
                const manual = findTemplateById(source.templateId);
                if (manual && manual.mode === mode) {
                    return manual;
                }
            }

            const exact = SEARCH_TEMPLATES.find(template =>
                template.mode === mode &&
                template.areaPreset === areaPreset &&
                template.usageGoal === usageGoal &&
                template.expectedResultsBucket === expectedResultsBucket
            );
            if (exact) return exact;

            const family = SEARCH_TEMPLATES.find(template =>
                template.mode === mode &&
                template.areaPreset === areaFamily &&
                template.usageGoal === usageGoal &&
                template.expectedResultsBucket === expectedResultsBucket
            );
            if (family) return family;

            const any = SEARCH_TEMPLATES.find(template =>
                template.mode === mode &&
                template.areaPreset === 'any' &&
                template.usageGoal === usageGoal &&
                template.expectedResultsBucket === expectedResultsBucket
            );
            if (any) return any;

            return findModeDefaultTemplate(mode, usageGoal, expectedResultsBucket);
        }

        function mergeGroupTerms(template, selected, key) {
            const base = listFrom(template?.querySpec?.[key]);
            const extra = listFrom(selected?.[key]);
            return uniqueNormalized(base.concat(extra));
        }

        function localizeTerms(values, locale) {
            if (typeof localizeSearchTerms !== 'function') {
                return uniqueNormalized(values);
            }
            return uniqueNormalized(localizeSearchTerms(values, locale));
        }

        function buildConnectQueryPlan(template, options) {
            const selectedTags = options?.selectedTags || {};
            const searchLocale = typeof resolveSearchLocale === 'function'
                ? resolveSearchLocale({
                    mode: 'connect',
                    requestedMode: options?.searchLanguageMode,
                    marketTerms: listFrom(selectedTags.market),
                    usageGoal: template.usageGoal,
                    expectedResultsBucket:
                        template.expectedResultsBucket
                })
                : 'en';
            const expectedResultsBucket = normalizeExpectedResultsBucket(
                template.expectedResultsBucket
            );
            const groupTerms = {
                role: localizeTerms(
                    mergeGroupTerms(template, selectedTags, 'role'),
                    searchLocale
                ),
                industry: localizeTerms(
                    mergeGroupTerms(template, selectedTags, 'industry'),
                    searchLocale
                ),
                market: localizeTerms(
                    mergeGroupTerms(template, selectedTags, 'market'),
                    searchLocale
                ),
                level: localizeTerms(
                    mergeGroupTerms(template, selectedTags, 'level'),
                    searchLocale
                )
            };

            const maxByBucket = CONNECT_ROLE_LIMITS[expectedResultsBucket] || 6;
            const maxByUi = Math.max(
                1,
                Math.min(10, Number(options?.roleTermsLimit) || 6)
            );
            const templateRoleLimit = Math.max(
                1,
                Math.min(10, Number(template?.defaults?.roleLimit) || maxByBucket)
            );
            const roleLimit = Math.min(maxByBucket, maxByUi, templateRoleLimit);
            const roles = groupTerms.role.slice(0, roleLimit);

            const compiled = compileBooleanQuery({
                should: roles,
                must: groupTerms.industry.concat(
                    groupTerms.market,
                    groupTerms.level
                ),
                mustNot: [],
                budget: 12,
                explicitAnd: false,
                wrapShould: false
            });

            return {
                query: compiled.query,
                filterSpec: { ...(template.filterSpec || {}) },
                defaults: { ...(template.defaults || {}) },
                meta: {
                    templateId: template.id,
                    usageGoal: template.usageGoal,
                    expectedResultsBucket: template.expectedResultsBucket,
                    operatorCount: compiled.operatorCount,
                    compiledQueryLength: compiled.query.length,
                    resolvedSearchLocale: searchLocale,
                    roleTermsUsed: roles.length,
                    mode: 'connect'
                },
                diagnostics: {
                    groupTerms,
                    roleLimit
                }
            };
        }

        function buildCompaniesQueryPlan(template, options) {
            const searchLocale = typeof resolveSearchLocale === 'function'
                ? resolveSearchLocale({
                    mode: 'companies',
                    requestedMode: options?.searchLanguageMode,
                    usageGoal: template.usageGoal,
                    expectedResultsBucket:
                        template.expectedResultsBucket,
                    query: options?.manualQuery
                })
                : 'en';
            const manualQuery = String(options?.manualQuery || '').trim();
            if (manualQuery) {
                return {
                    query: manualQuery,
                    filterSpec: { ...(template.filterSpec || {}) },
                    defaults: { ...(template.defaults || {}) },
                    meta: {
                        templateId: template.id,
                        usageGoal: template.usageGoal,
                        expectedResultsBucket: template.expectedResultsBucket,
                        operatorCount: countBooleanOperators(manualQuery),
                        compiledQueryLength: manualQuery.length,
                        resolvedSearchLocale: searchLocale,
                        mode: 'companies',
                        manualQuery: true
                    },
                    diagnostics: {}
                };
            }

            const keywords = localizeTerms(
                listFrom(template?.querySpec?.keywords),
                searchLocale
            );
            const compiled = compileBooleanQuery({
                should: keywords,
                must: [],
                mustNot: [],
                budget: 12,
                explicitAnd: true,
                wrapShould: true
            });
            return {
                query: compiled.query,
                filterSpec: { ...(template.filterSpec || {}) },
                defaults: { ...(template.defaults || {}) },
                meta: {
                    templateId: template.id,
                    usageGoal: template.usageGoal,
                    expectedResultsBucket: template.expectedResultsBucket,
                    operatorCount: compiled.operatorCount,
                    compiledQueryLength: compiled.query.length,
                    resolvedSearchLocale: searchLocale,
                    mode: 'companies'
                },
                diagnostics: {
                    keywords: compiled.should
                }
            };
        }

        function buildJobsQueryPlan(template, options) {
            const searchLocale = typeof resolveSearchLocale === 'function'
                ? resolveSearchLocale({
                    mode: 'jobs',
                    requestedMode: options?.searchLanguageMode,
                    selectedLocations: listFrom(options?.locationTerms),
                    locationTerms: listFrom(template?.querySpec?.locationTerms),
                    usageGoal: template.usageGoal,
                    expectedResultsBucket:
                        template.expectedResultsBucket,
                    jobsBrazilOffshoreFriendly:
                        options?.jobsBrazilOffshoreFriendly === true
                })
                : 'en';
            const manualQuery = String(options?.manualQuery || '').trim();
            if (manualQuery) {
                return {
                    query: manualQuery,
                    filterSpec: { ...(template.filterSpec || {}) },
                    defaults: { ...(template.defaults || {}) },
                    meta: {
                        templateId: template.id,
                        usageGoal: template.usageGoal,
                        expectedResultsBucket: template.expectedResultsBucket,
                        operatorCount: countBooleanOperators(manualQuery),
                        compiledQueryLength: manualQuery.length,
                        resolvedSearchLocale: searchLocale,
                        mode: 'jobs',
                        manualQuery: true
                    },
                    diagnostics: {}
                };
            }

            const roleTerms = uniqueNormalized(
                listFrom(options?.roleTerms).concat(
                    localizeTerms(
                        listFrom(template?.querySpec?.roleTerms),
                        searchLocale
                    )
                )
            );
            const locationTerms = uniqueNormalized(
                listFrom(options?.locationTerms).concat(
                    localizeTerms(
                        listFrom(template?.querySpec?.locationTerms),
                        searchLocale
                    )
                )
            );
            const keywords = uniqueNormalized(
                localizeTerms(
                    listFrom(template?.querySpec?.keywords),
                    searchLocale
                )
            );

            const compiled = compileBooleanQuery({
                should: roleTerms,
                must: locationTerms.concat(keywords),
                mustNot: [],
                budget: 12,
                explicitAnd: true,
                wrapShould: true
            });

            return {
                query: compiled.query,
                filterSpec: { ...(template.filterSpec || {}) },
                defaults: { ...(template.defaults || {}) },
                meta: {
                    templateId: template.id,
                    usageGoal: template.usageGoal,
                    expectedResultsBucket: template.expectedResultsBucket,
                    operatorCount: compiled.operatorCount,
                    compiledQueryLength: compiled.query.length,
                    resolvedSearchLocale: searchLocale,
                    mode: 'jobs'
                },
                diagnostics: {
                    roleTerms: compiled.should,
                    locationTerms,
                    keywords
                }
            };
        }

        function buildSearchTemplatePlan(options) {
            const source = options && typeof options === 'object'
                ? options
                : {};
            const mode = normalizeMode(source.mode);
            const usageGoal = normalizeUsageGoal(mode, source.usageGoal);
            const expectedResultsBucket = normalizeExpectedResultsBucket(
                source.expectedResultsBucket
            );

            const template = selectSearchTemplate({
                ...source,
                mode,
                usageGoal,
                expectedResultsBucket
            });

            if (!template) {
                return {
                    template: null,
                    query: '',
                    filterSpec: {},
                    defaults: {},
                    meta: {
                        templateId: '',
                        usageGoal,
                        expectedResultsBucket,
                        operatorCount: 0,
                        compiledQueryLength: 0,
                        mode
                    },
                    diagnostics: {}
                };
            }

            let compiled;
            if (mode === 'connect') {
                compiled = buildConnectQueryPlan(template, source);
            } else if (mode === 'companies') {
                compiled = buildCompaniesQueryPlan(template, source);
            } else {
                compiled = buildJobsQueryPlan(template, source);
            }

            return {
                template,
                query: compiled.query,
                filterSpec: compiled.filterSpec,
                defaults: compiled.defaults,
                meta: compiled.meta,
                diagnostics: compiled.diagnostics
            };
        }

        function listSearchTemplates(options) {
            const source = options && typeof options === 'object'
                ? options
                : {};
            const mode = source.mode
                ? normalizeMode(source.mode)
                : '';
            const usageGoal = source.usageGoal
                ? normalizeUsageGoal(mode || 'connect', source.usageGoal)
                : '';
            const expectedResultsBucket = source.expectedResultsBucket
                ? normalizeExpectedResultsBucket(
                    source.expectedResultsBucket
                )
                : '';
            const areaPreset = source.areaPreset
                ? normalizeAreaPresetValue(source.areaPreset)
                : '';
            const areaFamily = areaPreset
                ? normalizeAreaFamily(areaPreset)
                : '';

            return SEARCH_TEMPLATES.filter(template => {
                if (mode && template.mode !== mode) return false;
                if (usageGoal && template.usageGoal !== usageGoal) return false;
                if (expectedResultsBucket &&
                    template.expectedResultsBucket !== expectedResultsBucket) {
                    return false;
                }
                if (areaPreset) {
                    return template.areaPreset === areaPreset ||
                        template.areaPreset === areaFamily ||
                        template.areaPreset === 'any' ||
                        template.areaPreset === 'custom';
                }
                return true;
            });
        }

        return {
            EXPECTED_RESULTS_BUCKETS,
            MODE_USAGE_GOALS,
            SEARCH_TEMPLATES,
            CONNECT_ROLE_LIMITS,
            AREA_FAMILY_MAP,
            normalizeExpectedResultsBucket,
            normalizeUsageGoal,
            normalizeAreaFamily,
            sanitizeBooleanTerm,
            compileBooleanQuery,
            countBooleanOperators,
            selectSearchTemplate,
            buildSearchTemplatePlan,
            listSearchTemplates
        };
    }
);
