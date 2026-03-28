(function(root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.LinkedInConnectConfig = api;
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
        const localizeSearchTerms =
            searchLanguageApi?.localizeSearchTerms;
        const STATE_TAG_VERSION = 8;

        const AREA_PRESETS = {
            tech: {
                role: [
                    'recruiter',
                    '"talent acquisition"',
                    '"hiring manager"',
                    '"software engineer"',
                    '"engineering manager"'
                ],
                industry: [
                    'software',
                    'engineering',
                    'tech',
                    'IT',
                    'data',
                    'startup'
                ]
            },
            'tech-frontend': {
                role: [
                    '"frontend engineer"',
                    '"frontend developer"',
                    '"react developer"',
                    '"ui engineer"',
                    '"web developer"'
                ],
                industry: [
                    '"web development"',
                    'frontend',
                    'SaaS',
                    '"design systems"',
                    '"developer tools"'
                ]
            },
            'tech-backend': {
                role: [
                    '"backend engineer"',
                    '"backend developer"',
                    '"api engineer"',
                    '"platform engineer"',
                    '"server engineer"'
                ],
                industry: [
                    '"backend development"',
                    'infrastructure',
                    'SaaS',
                    '"cloud services"',
                    'fintech'
                ]
            },
            'tech-fullstack': {
                role: [
                    '"full stack engineer"',
                    '"fullstack developer"',
                    '"software engineer"',
                    '"product engineer"',
                    '"web developer"'
                ],
                industry: [
                    '"software development"',
                    'SaaS',
                    'startup',
                    'fintech',
                    '"developer tools"'
                ]
            },
            'tech-devops': {
                role: [
                    '"devops engineer"',
                    '"site reliability engineer"',
                    '"sre"',
                    '"platform engineer"',
                    '"infrastructure engineer"'
                ],
                industry: [
                    'devops',
                    '"cloud computing"',
                    'infrastructure',
                    'SaaS',
                    'observability'
                ]
            },
            'tech-data': {
                role: [
                    '"data engineer"',
                    '"data scientist"',
                    '"analytics engineer"',
                    '"data analyst"',
                    '"machine learning engineer"'
                ],
                industry: [
                    '"data engineering"',
                    'analytics',
                    '"artificial intelligence"',
                    '"big data"',
                    '"business intelligence"'
                ]
            },
            'tech-cloud': {
                role: [
                    '"cloud engineer"',
                    '"cloud architect"',
                    '"solutions architect"',
                    '"infrastructure engineer"',
                    '"devops engineer"'
                ],
                industry: [
                    '"cloud computing"',
                    'AWS',
                    'Azure',
                    'GCP',
                    'infrastructure'
                ]
            },
            'tech-security': {
                role: [
                    '"security engineer"',
                    '"cybersecurity analyst"',
                    '"application security"',
                    '"security architect"',
                    '"penetration tester"'
                ],
                industry: [
                    'cybersecurity',
                    '"information security"',
                    '"application security"',
                    '"cloud security"',
                    '"security operations"'
                ]
            },
            'tech-mobile': {
                role: [
                    '"mobile engineer"',
                    '"ios developer"',
                    '"android developer"',
                    '"react native developer"',
                    '"mobile developer"'
                ],
                industry: [
                    '"mobile development"',
                    '"mobile apps"',
                    'fintech',
                    '"consumer tech"',
                    'startup'
                ]
            },
            'tech-ml-ai': {
                role: [
                    '"machine learning engineer"',
                    '"ai engineer"',
                    '"data scientist"',
                    '"nlp engineer"',
                    '"ml ops engineer"'
                ],
                industry: [
                    '"artificial intelligence"',
                    '"machine learning"',
                    '"deep learning"',
                    '"natural language processing"',
                    '"generative ai"'
                ]
            },
            finance: {
                role: [
                    '"financial analyst"',
                    '"investment analyst"',
                    '"risk manager"',
                    '"credit analyst"',
                    'accountant',
                    'auditor'
                ],
                industry: [
                    'finance',
                    'banking',
                    '"financial services"',
                    'fintech',
                    '"mercado financeiro"',
                    '"servicos financeiros"'
                ]
            },
            'real-estate': {
                role: [
                    '"real estate agent"',
                    'broker',
                    '"property manager"',
                    '"corretor de imoveis"',
                    '"consultor imobiliario"'
                ],
                industry: [
                    '"real estate"',
                    'proptech',
                    '"property management"',
                    'imobiliario',
                    '"mercado imobiliario"'
                ]
            },
            headhunting: {
                role: [
                    'recruiter',
                    'headhunter',
                    'sourcer',
                    '"talent acquisition"',
                    '"executive search"',
                    'recrutador'
                ],
                industry: [
                    'recruiting',
                    'staffing',
                    '"executive search"',
                    'RH',
                    '"recursos humanos"'
                ]
            },
            'legal-judicial-media': {
                role: [
                    'lawyer',
                    'attorney',
                    '"legal counsel"',
                    '"judicial analyst"',
                    'journalist',
                    '"legal reporter"',
                    'advogado',
                    '"analista juridico"',
                    'jornalista'
                ],
                industry: [
                    'legal',
                    'law',
                    'judicial',
                    '"legal media"',
                    'juridico',
                    '"poder judiciario"',
                    'journalism',
                    'jornalismo'
                ]
            },
            'environmental-engineering': {
                role: [
                    '"environmental engineer"',
                    '"environmental analyst"',
                    '"sustainability specialist"',
                    '"environmental consultant"',
                    '"engenheiro ambiental"',
                    '"consultor ambiental"'
                ],
                industry: [
                    'environment',
                    'sustainability',
                    'ESG',
                    '"environmental services"',
                    '"meio ambiente"',
                    '"gestao ambiental"'
                ]
            },
            'sanitary-engineering': {
                role: [
                    '"sanitary engineer"',
                    '"water engineer"',
                    '"wastewater engineer"',
                    '"sanitation specialist"',
                    '"engenheiro sanitarista"',
                    '"engenheiro de saneamento"'
                ],
                industry: [
                    'sanitation',
                    '"water treatment"',
                    '"wastewater treatment"',
                    'saneamento',
                    '"tratamento de agua"',
                    '"tratamento de esgoto"'
                ]
            },
            healthcare: {
                role: [
                    'physician',
                    'nurse',
                    '"healthcare manager"',
                    '"clinical director"',
                    'medico',
                    'enfermeiro',
                    '"gestor de saude"'
                ],
                industry: [
                    'healthcare',
                    'hospital',
                    '"medical services"',
                    'pharma',
                    'saude',
                    'hospitalar'
                ]
            },
            education: {
                role: [
                    'teacher',
                    'professor',
                    'educator',
                    '"school coordinator"',
                    'docente',
                    'pedagogo'
                ],
                industry: [
                    'education',
                    'edtech',
                    '"higher education"',
                    'educacao',
                    'ensino'
                ]
            },
            marketing: {
                role: [
                    '"marketing manager"',
                    '"growth manager"',
                    '"content strategist"',
                    '"brand manager"',
                    '"gerente de marketing"'
                ],
                industry: [
                    'marketing',
                    'advertising',
                    '"digital marketing"',
                    'branding',
                    'publicidade'
                ]
            },
            sales: {
                role: [
                    '"account executive"',
                    '"sales manager"',
                    '"business development"',
                    'vendedor',
                    '"executivo de contas"'
                ],
                industry: [
                    'sales',
                    '"inside sales"',
                    '"B2B sales"',
                    'commercial',
                    'vendas',
                    'comercial'
                ]
            },
            'graphic-design': {
                role: [
                    '"graphic designer"',
                    '"visual designer"',
                    '"designer grafico"',
                    '"designer visual"',
                    '"creative designer"'
                ],
                industry: [
                    '"graphic design"',
                    '"visual design"',
                    '"creative services"',
                    'design',
                    '"comunicacao visual"'
                ]
            },
            'art-direction': {
                role: [
                    '"art director"',
                    '"associate art director"',
                    '"creative director"',
                    '"diretor de arte"',
                    '"direcao de arte"'
                ],
                industry: [
                    '"art direction"',
                    '"creative direction"',
                    'advertising',
                    '"brand campaigns"',
                    '"direcao de arte"'
                ]
            },
            branding: {
                role: [
                    '"brand strategist"',
                    '"brand designer"',
                    '"branding specialist"',
                    '"estrategista de marca"',
                    '"designer de marca"'
                ],
                industry: [
                    'branding',
                    '"brand strategy"',
                    '"brand identity"',
                    '"identidade visual"',
                    '"gestao de marca"'
                ]
            },
            'ui-ux': {
                role: [
                    '"ui ux designer"',
                    '"ux designer"',
                    '"ui designer"',
                    '"product designer"',
                    '"designer de produto"'
                ],
                industry: [
                    '"user experience"',
                    '"user interface"',
                    '"product design"',
                    '"design de produto"',
                    '"design de experiencia"'
                ]
            },
            'motion-design': {
                role: [
                    '"motion designer"',
                    '"motion graphics designer"',
                    'animator',
                    '"designer de motion"',
                    '"motion artist"'
                ],
                industry: [
                    '"motion design"',
                    '"motion graphics"',
                    'animation',
                    '"video animation"',
                    '"design de motion"'
                ]
            },
            'video-editing': {
                role: [
                    '"video editor"',
                    '"post production editor"',
                    '"editor de video"',
                    '"editor audiovisual"',
                    '"montador de video"'
                ],
                industry: [
                    '"video production"',
                    '"post production"',
                    'audiovisual',
                    '"video editing"',
                    '"producao de video"'
                ]
            },
            videomaker: {
                role: [
                    'videomaker',
                    '"video producer"',
                    '"content creator"',
                    '"produtor audiovisual"',
                    '"filmmaker"'
                ],
                industry: [
                    '"video content"',
                    '"content production"',
                    '"media production"',
                    '"criacao de conteudo"',
                    '"producao audiovisual"'
                ]
            }
        };

        const AREA_PRESET_VALUES = Object.freeze([
            'tech',
            'tech-frontend',
            'tech-backend',
            'tech-fullstack',
            'tech-devops',
            'tech-data',
            'tech-cloud',
            'tech-security',
            'tech-mobile',
            'tech-ml-ai',
            'finance',
            'real-estate',
            'headhunting',
            'legal-judicial-media',
            'environmental-engineering',
            'sanitary-engineering',
            'healthcare',
            'education',
            'marketing',
            'sales',
            'graphic-design',
            'art-direction',
            'branding',
            'ui-ux',
            'motion-design',
            'video-editing',
            'videomaker',
            'custom'
        ]);

        const COMPANY_AREA_PRESETS = {
            custom: {
                defaultQuery: '',
                defaultTargetCompanies: []
            },
            tech: {
                defaultQuery:
                    '"nearshore software company" OR "latam talent partner" OR ' +
                    '"offshore engineering team" OR "hiring latam developers" ' +
                    'NOT university NOT college NOT institute NOT academy ' +
                    'NOT bootcamp NOT group NOT jobs',
                defaultTargetCompanies: [
                    'Google',
                    'Microsoft',
                    'Amazon',
                    'Meta',
                    'Apple',
                    'Stripe',
                    'Shopify',
                    'Cloudflare',
                    'Datadog',
                    'GitHub',
                    'Nubank',
                    'iFood',
                    'Mercado Livre',
                    'VTEX',
                    'QuintoAndar',
                    'PicPay',
                    'CI&T',
                    'Thoughtworks'
                ]
            },
            'graphic-design': {
                defaultQuery:
                    '"graphic design" OR "designer grafico" OR ' +
                    '"visual design" OR "comunicacao visual"',
                defaultTargetCompanies: [
                    'Canva',
                    'Adobe',
                    'Figma',
                    '99designs',
                    'Pentagram',
                    'Landor',
                    'Interbrand',
                    'Wolff Olins',
                    'Design Bridge and Partners',
                    'FutureBrand',
                    'AKQA',
                    'Huge',
                    'Nubank',
                    'iFood',
                    'VTEX',
                    'QuintoAndar',
                    'Globo',
                    'C6 Bank'
                ]
            },
            'art-direction': {
                defaultQuery:
                    '"art direction" OR "art director" OR ' +
                    '"direcao de arte" OR "diretor de arte"',
                defaultTargetCompanies: [
                    'WPP',
                    'Ogilvy',
                    'VML',
                    'BBDO',
                    'Publicis Groupe',
                    'Dentsu',
                    'TBWA',
                    'Leo Burnett',
                    'AlmapBBDO',
                    'Africa Creative',
                    'BETC Havas',
                    'DM9',
                    'AKQA',
                    'R/GA',
                    'Natura',
                    'Magazine Luiza',
                    'Mercado Livre',
                    'Nubank'
                ]
            },
            branding: {
                defaultQuery:
                    'branding OR "brand strategy" OR ' +
                    '"identidade visual" OR "estrategia de marca"',
                defaultTargetCompanies: [
                    'Interbrand',
                    'Landor',
                    'Wolff Olins',
                    'FutureBrand',
                    'Design Bridge and Partners',
                    'Pentagram',
                    'Lippincott',
                    'Siegel+Gale',
                    'Nubank',
                    'iFood',
                    'Natura',
                    'Boticario',
                    'Ambev',
                    'Magazine Luiza',
                    'Mercado Livre',
                    'VTEX',
                    'QuintoAndar',
                    'Globo'
                ]
            },
            'ui-ux': {
                defaultQuery:
                    '"ui ux" OR "ux design" OR "product design" OR ' +
                    '"design de produto" OR "design de experiencia"',
                defaultTargetCompanies: [
                    'Figma',
                    'Adobe',
                    'Canva',
                    'Airbnb',
                    'Google',
                    'Microsoft',
                    'Shopify',
                    'Notion',
                    'Nubank',
                    'iFood',
                    'Mercado Livre',
                    'QuintoAndar',
                    'VTEX',
                    'C6 Bank',
                    'PicPay',
                    'Stone',
                    'CI&T',
                    'Thoughtworks'
                ]
            },
            'motion-design': {
                defaultQuery:
                    '"motion design" OR "motion graphics" OR ' +
                    'animation OR "design de motion"',
                defaultTargetCompanies: [
                    'Buck',
                    'Giant Ant',
                    'Ordinary Folk',
                    'School of Motion',
                    'Blender Studio',
                    'Adobe',
                    'Canva',
                    'Google',
                    'Netflix',
                    'Spotify',
                    'Globo',
                    'Nubank',
                    'iFood',
                    'Mercado Livre',
                    'VTEX',
                    'Hotmart',
                    'Take Blip',
                    'Loft'
                ]
            },
            'video-editing': {
                defaultQuery:
                    '"video editing" OR "editor de video" OR ' +
                    '"post production" OR "editor audiovisual"',
                defaultTargetCompanies: [
                    'Adobe',
                    'Blackmagic Design',
                    'Avid',
                    'Frame.io',
                    'Canva',
                    'YouTube',
                    'Netflix',
                    'Vimeo',
                    'Paramount',
                    'Warner Bros Discovery',
                    'Globo',
                    'SBT',
                    'Record TV',
                    'Nubank',
                    'iFood',
                    'Mercado Livre',
                    'Hotmart',
                    'Take Blip'
                ]
            },
            videomaker: {
                defaultQuery:
                    'videomaker OR "video producer" OR ' +
                    '"produtor audiovisual" OR "criador de conteudo"',
                defaultTargetCompanies: [
                    'YouTube',
                    'TikTok',
                    'Meta',
                    'Netflix',
                    'Prime Video',
                    'Vimeo',
                    'Canva',
                    'Adobe',
                    'Globo',
                    'Nubank',
                    'iFood',
                    'Mercado Livre',
                    'Magazine Luiza',
                    'QuintoAndar',
                    'VTEX',
                    'Hotmart',
                    'Take Blip',
                    'RD Station'
                ]
            },
            'tech-frontend': {
                defaultQuery:
                    '"frontend engineering remote" OR "react product team" OR ' +
                    '"hiring latam frontend" OR "remote web platform" ' +
                    'NOT university NOT college NOT institute NOT academy ' +
                    'NOT bootcamp NOT group NOT jobs',
                defaultTargetCompanies: [
                    'Vercel', 'Netlify', 'Shopify', 'Canva',
                    'Figma', 'Airbnb', 'Stripe', 'GitHub',
                    'Notion', 'Linear', 'Nubank', 'iFood',
                    'Mercado Livre', 'VTEX', 'QuintoAndar',
                    'PicPay', 'CI&T', 'Thoughtworks'
                ]
            },
            'tech-backend': {
                defaultQuery:
                    '"backend engineering remote" OR "api platform company" OR ' +
                    '"hiring latam backend" OR "distributed engineering team" ' +
                    'NOT university NOT college NOT institute NOT academy ' +
                    'NOT bootcamp NOT group NOT jobs',
                defaultTargetCompanies: [
                    'Stripe', 'Datadog', 'Cloudflare', 'Twilio',
                    'MongoDB', 'Elastic', 'Redis', 'Confluent',
                    'Nubank', 'PagSeguro', 'Stone', 'C6 Bank',
                    'iFood', 'Mercado Livre', 'VTEX', 'CI&T',
                    'Thoughtworks', 'Wildlife Studios'
                ]
            },
            'tech-fullstack': {
                defaultQuery:
                    '"full stack engineering remote" OR "product engineering company" OR ' +
                    '"hiring latam fullstack" OR "distributed product team" ' +
                    'NOT university NOT college NOT institute NOT academy ' +
                    'NOT bootcamp NOT group NOT jobs',
                defaultTargetCompanies: [
                    'Vercel', 'Supabase', 'Shopify', 'Stripe',
                    'GitHub', 'GitLab', 'Notion', 'Linear',
                    'Nubank', 'iFood', 'Mercado Livre', 'VTEX',
                    'QuintoAndar', 'Loft', 'Creditas', 'PicPay',
                    'CI&T', 'Thoughtworks'
                ]
            },
            'tech-devops': {
                defaultQuery:
                    '"devops engineering remote" OR "site reliability remote" OR ' +
                    '"hiring latam devops" OR "cloud platform team" ' +
                    'NOT university NOT college NOT institute NOT academy ' +
                    'NOT bootcamp NOT group NOT jobs',
                defaultTargetCompanies: [
                    'Datadog', 'HashiCorp', 'Cloudflare',
                    'Grafana Labs', 'GitLab', 'Docker',
                    'Elastic', 'PagerDuty', 'Nubank', 'iFood',
                    'Mercado Livre', 'PagSeguro', 'Stone',
                    'Itau Unibanco', 'Bradesco', 'Banco Inter',
                    'CI&T', 'Thoughtworks'
                ]
            },
            'tech-data': {
                defaultQuery:
                    '"data engineering remote" OR "analytics platform team" OR ' +
                    '"hiring latam data" OR "machine learning product team" ' +
                    'NOT university NOT college NOT institute NOT academy ' +
                    'NOT bootcamp NOT group NOT jobs',
                defaultTargetCompanies: [
                    'Databricks', 'Snowflake', 'dbt Labs',
                    'Confluent', 'Datadog', 'MongoDB', 'Elastic',
                    'Fivetran', 'Nubank', 'iFood',
                    'Mercado Livre', 'Itau Unibanco', 'Stone',
                    'PagSeguro', 'Loft', 'QuintoAndar',
                    'CI&T', 'Thoughtworks'
                ]
            },
            'tech-cloud': {
                defaultQuery:
                    '"cloud engineering remote" OR "platform infrastructure company" OR ' +
                    '"hiring latam cloud" OR "distributed cloud team" ' +
                    'NOT university NOT college NOT institute NOT academy ' +
                    'NOT bootcamp NOT group NOT jobs',
                defaultTargetCompanies: [
                    'Amazon Web Services', 'Google Cloud',
                    'Microsoft Azure', 'Cloudflare', 'HashiCorp',
                    'Datadog', 'Akamai', 'Fastly', 'Nubank',
                    'iFood', 'Mercado Livre', 'Itau Unibanco',
                    'Bradesco', 'Stone', 'PagSeguro',
                    'CI&T', 'Thoughtworks', 'Accenture'
                ]
            },
            'tech-security': {
                defaultQuery:
                    '"security engineering remote" OR "application security company" OR ' +
                    '"hiring latam security" OR "cybersecurity platform" ' +
                    'NOT university NOT college NOT institute NOT academy ' +
                    'NOT bootcamp NOT group NOT jobs',
                defaultTargetCompanies: [
                    'CrowdStrike', 'Palo Alto Networks',
                    'Cloudflare', 'Snyk', 'Wiz', 'Fortinet',
                    'Rapid7', 'SentinelOne', 'Nubank', 'iFood',
                    'Mercado Livre', 'Itau Unibanco', 'Bradesco',
                    'Stone', 'Tempest Security', 'Axur',
                    'CI&T', 'Thoughtworks'
                ]
            },
            'tech-mobile': {
                defaultQuery:
                    '"mobile engineering remote" OR "consumer app platform" OR ' +
                    '"hiring latam mobile" OR "react native product team" ' +
                    'NOT university NOT college NOT institute NOT academy ' +
                    'NOT bootcamp NOT group NOT jobs',
                defaultTargetCompanies: [
                    'Apple', 'Google', 'Meta', 'Spotify', 'Uber',
                    'Airbnb', 'Shopify', 'Block', 'Nubank',
                    'iFood', 'Mercado Livre', 'PicPay',
                    'C6 Bank', '99', 'Rappi', 'Wildlife Studios',
                    'CI&T', 'Thoughtworks'
                ]
            },
            'tech-ml-ai': {
                defaultQuery:
                    '"machine learning platform remote" OR "ai product company" OR ' +
                    '"hiring latam ai" OR "generative ai engineering" ' +
                    'NOT university NOT college NOT institute NOT academy ' +
                    'NOT bootcamp NOT group NOT jobs',
                defaultTargetCompanies: [
                    'OpenAI', 'Anthropic', 'Google DeepMind',
                    'Meta AI', 'Hugging Face', 'Cohere',
                    'Stability AI', 'Databricks', 'Nubank',
                    'iFood', 'Mercado Livre', 'Itau Unibanco',
                    'Stone', 'Take Blip', 'CI&T', 'Thoughtworks',
                    'Loft', 'QuintoAndar'
                ]
            }
        };

        const COMPANY_AREA_PRESET_VALUES = Object.freeze([
            'custom',
            'tech',
            'graphic-design',
            'art-direction',
            'branding',
            'ui-ux',
            'motion-design',
            'video-editing',
            'videomaker',
            'tech-frontend',
            'tech-backend',
            'tech-fullstack',
            'tech-devops',
            'tech-data',
            'tech-cloud',
            'tech-security',
            'tech-mobile',
            'tech-ml-ai'
        ]);

        const ROLE_PRIORITY = [
            'recruiter',
            '"talent acquisition"',
            '"hiring manager"',
            '"head of talent"',
            'headhunter',
            'sourcer',
            '"executive search"',
            '"software engineer"',
            '"engineering manager"',
            'developer',
            '"product manager"',
            'qa',
            '"tech lead"',
            '"frontend engineer"',
            '"frontend developer"',
            '"backend engineer"',
            '"backend developer"',
            '"full stack engineer"',
            '"fullstack developer"',
            '"product engineer"',
            '"devops engineer"',
            '"site reliability engineer"',
            '"platform engineer"',
            '"infrastructure engineer"',
            '"cloud engineer"',
            '"cloud architect"',
            '"solutions architect"',
            '"data engineer"',
            '"data scientist"',
            '"analytics engineer"',
            '"machine learning engineer"',
            '"ai engineer"',
            '"security engineer"',
            '"cybersecurity analyst"',
            '"mobile engineer"',
            '"ios developer"',
            '"android developer"',
            '"financial analyst"',
            '"investment analyst"',
            '"risk manager"',
            '"credit analyst"',
            'accountant',
            'auditor',
            '"real estate agent"',
            'broker',
            '"property manager"',
            'lawyer',
            'attorney',
            '"legal counsel"',
            '"judicial analyst"',
            'journalist',
            '"environmental engineer"',
            '"sanitary engineer"',
            'physician',
            'nurse',
            'teacher',
            'professor',
            '"marketing manager"',
            '"sales manager"',
            '"account executive"',
            '"business development"',
            '"ui ux designer"',
            '"ux designer"',
            '"ui designer"',
            '"product designer"',
            '"graphic designer"',
            '"visual designer"',
            '"designer grafico"',
            '"art director"',
            '"creative director"',
            '"diretor de arte"',
            '"brand strategist"',
            '"brand designer"',
            '"branding specialist"',
            '"motion designer"',
            '"motion graphics designer"',
            '"video editor"',
            '"post production editor"',
            'videomaker',
            '"video producer"',
            '"produtor audiovisual"'
        ];

        const AREA_LABELS = {
            tech: { en: 'technology', pt: 'tecnologia' },
            'tech-frontend': {
                en: 'frontend engineering',
                pt: 'engenharia frontend'
            },
            'tech-backend': {
                en: 'backend engineering',
                pt: 'engenharia backend'
            },
            'tech-fullstack': {
                en: 'full stack engineering',
                pt: 'engenharia full stack'
            },
            'tech-devops': {
                en: 'devops and infrastructure',
                pt: 'devops e infraestrutura'
            },
            'tech-data': {
                en: 'data engineering and science',
                pt: 'engenharia e ciencia de dados'
            },
            'tech-cloud': {
                en: 'cloud engineering',
                pt: 'engenharia cloud'
            },
            'tech-security': {
                en: 'cybersecurity',
                pt: 'ciberseguranca'
            },
            'tech-mobile': {
                en: 'mobile development',
                pt: 'desenvolvimento mobile'
            },
            'tech-ml-ai': {
                en: 'AI and machine learning',
                pt: 'inteligencia artificial e machine learning'
            },
            finance: { en: 'finance', pt: 'financas' },
            'real-estate': {
                en: 'real estate',
                pt: 'mercado imobiliario'
            },
            headhunting: {
                en: 'headhunting and recruiting',
                pt: 'headhunting e recrutamento'
            },
            'legal-judicial-media': {
                en: 'legal, judicial, and media',
                pt: 'juridico, judiciario e midia'
            },
            'environmental-engineering': {
                en: 'environmental engineering',
                pt: 'engenharia ambiental'
            },
            'sanitary-engineering': {
                en: 'sanitary engineering',
                pt: 'engenharia sanitaria'
            },
            healthcare: { en: 'healthcare', pt: 'saude' },
            education: { en: 'education', pt: 'educacao' },
            marketing: { en: 'marketing', pt: 'marketing' },
            sales: { en: 'sales', pt: 'vendas' },
            'graphic-design': {
                en: 'graphic design',
                pt: 'design grafico'
            },
            'art-direction': {
                en: 'art direction',
                pt: 'direcao de arte'
            },
            branding: { en: 'branding', pt: 'branding' },
            'ui-ux': {
                en: 'ui/ux design',
                pt: 'design de ui ux'
            },
            'motion-design': {
                en: 'motion design',
                pt: 'design de motion'
            },
            'video-editing': {
                en: 'video editing',
                pt: 'edicao de video'
            },
            videomaker: { en: 'video production', pt: 'videomaker' },
            custom: { en: 'your field', pt: 'sua area' }
        };

        function normalizeText(text) {
            return String(text || '')
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^\p{L}\p{N}\s"]/gu, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        }

        function isValidAreaPreset(value) {
            return AREA_PRESET_VALUES.includes(value);
        }

        function normalizeAreaPreset(value) {
            if (isValidAreaPreset(value)) return value;
            return 'custom';
        }

        function isValidCompanyAreaPreset(value) {
            return COMPANY_AREA_PRESET_VALUES.includes(value);
        }

        function normalizeCompanyAreaPreset(value) {
            const raw = String(value || '').trim();
            if (raw === 'tech' || raw.startsWith('tech-')) {
                return 'tech';
            }
            if (isValidCompanyAreaPreset(raw)) return raw;
            return 'custom';
        }

        function getCompanyAreaPresetDefaultQuery(value) {
            const normalized = normalizeCompanyAreaPreset(value);
            const preset = COMPANY_AREA_PRESETS[normalized] ||
                COMPANY_AREA_PRESETS.custom;
            return String(preset.defaultQuery || '').trim();
        }

        function getCompanyAreaPresetDefaultTargetCompanies(value) {
            const normalized = normalizeCompanyAreaPreset(value);
            const preset = COMPANY_AREA_PRESETS[normalized] ||
                COMPANY_AREA_PRESETS.custom;
            return uniqueList(preset.defaultTargetCompanies || []);
        }

        function shouldResetAreaPresetOnManualTag(group) {
            return group === 'role' || group === 'industry';
        }

        function toArray(value) {
            if (Array.isArray(value)) return value;
            if (typeof value === 'string') {
                return value
                    .split('\n')
                    .map(function(item) {
                        return item.trim();
                    })
                    .filter(Boolean);
            }
            return [];
        }

        function uniqueList(values) {
            const seen = new Set();
            const out = [];
            for (const raw of values || []) {
                const clean = String(raw || '').trim();
                if (!clean) continue;
                const key = normalizeText(clean);
                if (!key || seen.has(key)) continue;
                seen.add(key);
                out.push(clean);
            }
            return out;
        }

        function parseExcludedCompanies(value) {
            return uniqueList(toArray(value));
        }

        function applyAreaPresetToTags(tags, areaPreset) {
            const normalized = normalizeAreaPreset(areaPreset);
            const source = tags && typeof tags === 'object'
                ? tags
                : {};
            const out = {
                role: toArray(source.role),
                industry: toArray(source.industry),
                market: toArray(source.market),
                level: toArray(source.level)
            };
            if (normalized === 'custom') return out;
            const preset = AREA_PRESETS[normalized];
            if (!preset) return out;
            out.role = preset.role.slice();
            out.industry = preset.industry.slice();
            return out;
        }

        function limitRoleTerms(roles, limit) {
            if (!Array.isArray(roles)) return [];
            const safeLimit = Math.max(
                1,
                Math.min(10, Number(limit) || 6)
            );
            if (roles.length <= safeLimit) return roles.slice();
            const normalized = roles.map(function(role) {
                return normalizeText(role).replace(/^"+|"+$/g, '');
            });
            const ordered = ROLE_PRIORITY
                .filter(function(term) {
                    return normalized.includes(
                        normalizeText(term).replace(/^"+|"+$/g, '')
                    );
                })
                .map(function(term) {
                    const normalizedTerm = normalizeText(term)
                        .replace(/^"+|"+$/g, '');
                    return roles[normalized.indexOf(normalizedTerm)];
                });
            for (const role of roles) {
                if (!ordered.includes(role)) ordered.push(role);
            }
            return ordered.slice(0, safeLimit);
        }

        function formatQueryTerm(term) {
            const clean = String(term || '').trim().replace(/^"+|"+$/g, '');
            if (!clean) return '';
            return /\s/.test(clean) ? `"${clean}"` : clean;
        }

        function localizeTerms(values, searchLanguageMode) {
            if (typeof localizeSearchTerms !== 'function') {
                return toArray(values);
            }
            return localizeSearchTerms(
                toArray(values),
                searchLanguageMode || 'en'
            );
        }

        function buildConnectQueryFromTags(
            tags,
            roleTermsLimit,
            searchLanguageMode
        ) {
            const source = tags && typeof tags === 'object'
                ? tags
                : {};
            const parts = [];
            const safeRoles = limitRoleTerms(
                localizeTerms(source.role, searchLanguageMode),
                roleTermsLimit
            ).map(formatQueryTerm).filter(Boolean);
            if (safeRoles.length === 1) {
                parts.push(safeRoles[0]);
            } else if (safeRoles.length > 1) {
                parts.push(safeRoles.join(' OR '));
            }
            ['industry', 'market', 'level']
                .forEach(function(group) {
                    localizeTerms(
                        source[group],
                        searchLanguageMode
                    ).forEach(function(term) {
                        const formatted = formatQueryTerm(term);
                        if (formatted) parts.push(formatted);
                    });
                });
            return parts.join(' ').trim();
        }

        function getAreaLabel(areaPreset, lang) {
            const normalized = normalizeAreaPreset(areaPreset);
            const table = AREA_LABELS[normalized] ||
                AREA_LABELS.custom;
            if (lang === 'pt') return table.pt;
            return table.en;
        }

        function getConnectTemplates(areaPreset, lang) {
            const locale = lang === 'pt' ? 'pt' : 'en';
            const area = getAreaLabel(areaPreset, locale);
            if (locale === 'pt') {
                return {
                    senior: `Ola {name}, atuo em ${area} e gosto` +
                        ' de trocar aprendizados praticos com' +
                        ' profissionais da area. Vamos conectar?',
                    mid: `Ola {name}, trabalho com projetos em` +
                        ` ${area} e valorizo conversas objetivas` +
                        ' sobre o mercado. Vamos nos conectar!',
                    junior: `Ola {name}, estou desenvolvendo minha` +
                        ` carreira em ${area} e gostaria de` +
                        ' ampliar minha rede com profissionais' +
                        ' da area. Vamos conectar?',
                    lead: `Ola {name}, lidero iniciativas em` +
                        ` ${area} e gosto de compartilhar visoes` +
                        ' praticas sobre execucao e resultados.' +
                        ' Vamos manter contato?',
                    networking: `Ola {name}, vi seu perfil e` +
                        ` gostaria de conectar. Atuo em ${area}` +
                        ' e valorizo trocar insights práticos da' +
                        ' area. Vamos manter contato?'
                };
            }
            return {
                senior: `Hi {name}, I work across projects in` +
                    ` ${area} and value practical exchanges` +
                    ' with professionals in this space. Happy' +
                    ' to connect.',
                mid: `Hi {name}, I work with teams in ${area}` +
                    ' and enjoy sharing practical market' +
                    ' insights. I would like to connect.',
                junior: `Hi {name}, I am building my career in` +
                    ` ${area} and would love to connect with` +
                    ' professionals in this space.',
                lead: `Hi {name}, I lead initiatives in` +
                    ` ${area} and value focused conversations` +
                    ' about execution and outcomes. Happy to' +
                    ' connect.',
                networking: `Hi {name}, I came across your` +
                    ` profile and would like to connect. I work` +
                    ` in ${area} and value exchanging practical` +
                    ' insights. Looking forward to staying in' +
                    ' touch.'
            };
        }

        function migrateConnectPopupState(state) {
            const source = state && typeof state === 'object'
                ? state
                : {};
            const next = { ...source };
            let changed = false;

            if (next.tagVersion !== STATE_TAG_VERSION) {
                next.tagVersion = STATE_TAG_VERSION;
                changed = true;
            }

            const normalizedAreaPreset = normalizeAreaPreset(
                next.areaPreset
            );
            if (next.areaPreset !== normalizedAreaPreset) {
                next.areaPreset = normalizedAreaPreset;
                changed = true;
            }

            const normalizedCompanyAreaPreset =
                normalizeCompanyAreaPreset(
                    next.companyAreaPreset
                );
            if (next.companyAreaPreset !==
                normalizedCompanyAreaPreset) {
                next.companyAreaPreset =
                    normalizedCompanyAreaPreset;
                changed = true;
            }

            const hasExcluded = String(
                next.excludedCompanies || ''
            ).trim().length > 0;
            const legacyCompany = String(next.myCompany || '')
                .trim();
            if (!hasExcluded && legacyCompany) {
                next.excludedCompanies = legacyCompany;
                changed = true;
            }

            if (Array.isArray(next.excludedCompanies)) {
                next.excludedCompanies = parseExcludedCompanies(
                    next.excludedCompanies
                ).join('\n');
                changed = true;
            }

            if (next.myCompany !== undefined) {
                delete next.myCompany;
                changed = true;
            }

            return { state: next, changed };
        }

        return {
            STATE_TAG_VERSION,
            AREA_PRESETS,
            AREA_PRESET_VALUES,
            COMPANY_AREA_PRESET_VALUES,
            isValidAreaPreset,
            normalizeAreaPreset,
            isValidCompanyAreaPreset,
            normalizeCompanyAreaPreset,
            getCompanyAreaPresetDefaultQuery,
            getCompanyAreaPresetDefaultTargetCompanies,
            shouldResetAreaPresetOnManualTag,
            parseExcludedCompanies,
            applyAreaPresetToTags,
            buildConnectQueryFromTags,
            getConnectTemplates,
            migrateConnectPopupState
        };
    }
);
