(function(root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.LinkedInSearchLanguage = api;
    Object.keys(api).forEach(function(key) {
        if (typeof root[key] === 'undefined') {
            root[key] = api[key];
        }
    });
})(
    typeof globalThis !== 'undefined' ? globalThis : this,
    function() {
        const SEARCH_LANGUAGE_MODES = Object.freeze([
            'auto',
            'en',
            'pt_BR',
            'bilingual'
        ]);

        const TERM_VARIANTS = Object.freeze({
            recruiter: {
                en: ['recruiter'],
                pt_BR: ['recrutador']
            },
            'talent acquisition': {
                en: ['talent acquisition'],
                pt_BR: ['aquisição de talentos']
            },
            'hiring manager': {
                en: ['hiring manager'],
                pt_BR: ['gestor de contratação']
            },
            sourcer: {
                en: ['sourcer'],
                pt_BR: ['sourcer']
            },
            'head of talent': {
                en: ['head of talent'],
                pt_BR: ['líder de talentos']
            },
            'software engineer': {
                en: ['software engineer'],
                pt_BR: ['engenheiro de software']
            },
            'engineering manager': {
                en: ['engineering manager'],
                pt_BR: ['gerente de engenharia']
            },
            developer: {
                en: ['developer'],
                pt_BR: ['desenvolvedor']
            },
            'tech lead': {
                en: ['tech lead'],
                pt_BR: ['líder técnico']
            },
            'product manager': {
                en: ['product manager'],
                pt_BR: ['gerente de produto']
            },
            qa: {
                en: ['qa'],
                pt_BR: ['analista de qa']
            },
            director: {
                en: ['director'],
                pt_BR: ['diretor']
            },
            manager: {
                en: ['manager'],
                pt_BR: ['gerente']
            },
            headhunter: {
                en: ['headhunter'],
                pt_BR: ['headhunter']
            },
            'executive search': {
                en: ['executive search'],
                pt_BR: ['busca executiva']
            },
            'product designer': {
                en: ['product designer'],
                pt_BR: ['designer de produto']
            },
            'ux designer': {
                en: ['ux designer'],
                pt_BR: ['designer ux']
            },
            'ui designer': {
                en: ['ui designer'],
                pt_BR: ['designer ui']
            },
            'art director': {
                en: ['art director'],
                pt_BR: ['diretor de arte']
            },
            'brand strategist': {
                en: ['brand strategist'],
                pt_BR: ['estrategista de marca']
            },
            'brand designer': {
                en: ['brand designer'],
                pt_BR: ['designer de marca']
            },
            'backend engineer': {
                en: ['backend engineer'],
                pt_BR: ['engenheiro backend']
            },
            'full stack engineer': {
                en: ['full stack engineer'],
                pt_BR: ['engenheiro full stack']
            },
            'product engineer': {
                en: ['product engineer'],
                pt_BR: ['engenheiro de produto']
            },
            designer: {
                en: ['designer'],
                pt_BR: ['designer']
            },
            analyst: {
                en: ['analyst'],
                pt_BR: ['analista']
            },
            software: {
                en: ['software'],
                pt_BR: ['software']
            },
            engineering: {
                en: ['engineering'],
                pt_BR: ['engenharia']
            },
            tech: {
                en: ['tech'],
                pt_BR: ['tecnologia']
            },
            data: {
                en: ['data'],
                pt_BR: ['dados']
            },
            startup: {
                en: ['startup'],
                pt_BR: ['startup']
            },
            finance: {
                en: ['finance'],
                pt_BR: ['finanças']
            },
            'financial services': {
                en: ['financial services'],
                pt_BR: ['serviços financeiros']
            },
            sales: {
                en: ['sales'],
                pt_BR: ['vendas']
            },
            marketing: {
                en: ['marketing'],
                pt_BR: ['marketing']
            },
            design: {
                en: ['design'],
                pt_BR: ['design']
            },
            'product design': {
                en: ['product design'],
                pt_BR: ['design de produto']
            },
            'user experience': {
                en: ['user experience'],
                pt_BR: ['experiência do usuário']
            },
            recruiting: {
                en: ['recruiting'],
                pt_BR: ['recrutamento']
            },
            staffing: {
                en: ['staffing'],
                pt_BR: ['recrutamento e seleção']
            },
            technology: {
                en: ['technology'],
                pt_BR: ['tecnologia']
            },
            global: {
                en: ['global'],
                pt_BR: ['global']
            },
            latam: {
                en: ['latam'],
                pt_BR: ['latam']
            },
            brazil: {
                en: ['brazil'],
                pt_BR: ['brasil']
            },
            'hiring in brazil': {
                en: ['hiring in brazil'],
                pt_BR: ['contratando no brasil']
            },
            nearshore: {
                en: ['nearshore'],
                pt_BR: ['nearshore']
            },
            remote: {
                en: ['remote'],
                pt_BR: ['remoto']
            },
            hybrid: {
                en: ['hybrid'],
                pt_BR: ['híbrido']
            },
            'easy apply': {
                en: ['easy apply'],
                pt_BR: ['candidatura simplificada']
            },
            'developer tools': {
                en: ['developer tools'],
                pt_BR: ['ferramentas para desenvolvedores']
            },
            saas: {
                en: ['saas'],
                pt_BR: ['saas']
            },
            'software company': {
                en: ['software company'],
                pt_BR: ['empresa de software']
            },
            'technology companies': {
                en: ['technology companies'],
                pt_BR: ['empresas de tecnologia']
            },
            'hiring teams': {
                en: ['hiring teams'],
                pt_BR: ['times de contratação']
            },
            branding: {
                en: ['branding'],
                pt_BR: ['branding']
            },
            'brand strategy': {
                en: ['brand strategy'],
                pt_BR: ['estratégia de marca']
            },
            'visual identity': {
                en: ['visual identity'],
                pt_BR: ['identidade visual']
            },
            'creative direction': {
                en: ['creative direction'],
                pt_BR: ['direção criativa']
            },
            'design system': {
                en: ['design system'],
                pt_BR: ['design system']
            },
            creative: {
                en: ['creative'],
                pt_BR: ['criativo']
            },
            senior: {
                en: ['senior'],
                pt_BR: ['sênior']
            },
            lead: {
                en: ['lead'],
                pt_BR: ['liderança']
            },
            'mid-level': {
                en: ['mid-level'],
                pt_BR: ['pleno']
            },
            'frontend engineer': {
                en: ['frontend engineer'],
                pt_BR: ['engenheiro frontend']
            },
            'frontend developer': {
                en: ['frontend developer'],
                pt_BR: ['desenvolvedor frontend']
            },
            'react developer': {
                en: ['react developer'],
                pt_BR: ['desenvolvedor react']
            },
            'ui engineer': {
                en: ['ui engineer'],
                pt_BR: ['engenheiro de interface']
            },
            'web developer': {
                en: ['web developer'],
                pt_BR: ['desenvolvedor web']
            },
            'backend developer': {
                en: ['backend developer'],
                pt_BR: ['desenvolvedor backend']
            },
            'api engineer': {
                en: ['api engineer'],
                pt_BR: ['engenheiro de api']
            },
            'platform engineer': {
                en: ['platform engineer'],
                pt_BR: ['engenheiro de plataforma']
            },
            'server engineer': {
                en: ['server engineer'],
                pt_BR: ['engenheiro de servidor']
            },
            'fullstack developer': {
                en: ['fullstack developer'],
                pt_BR: ['desenvolvedor fullstack']
            },
            'devops engineer': {
                en: ['devops engineer'],
                pt_BR: ['engenheiro devops']
            },
            'site reliability engineer': {
                en: ['site reliability engineer'],
                pt_BR: ['engenheiro de confiabilidade']
            },
            sre: {
                en: ['sre'],
                pt_BR: ['sre']
            },
            'infrastructure engineer': {
                en: ['infrastructure engineer'],
                pt_BR: ['engenheiro de infraestrutura']
            },
            'data engineer': {
                en: ['data engineer'],
                pt_BR: ['engenheiro de dados']
            },
            'data scientist': {
                en: ['data scientist'],
                pt_BR: ['cientista de dados']
            },
            'analytics engineer': {
                en: ['analytics engineer'],
                pt_BR: ['engenheiro de analytics']
            },
            'data analyst': {
                en: ['data analyst'],
                pt_BR: ['analista de dados']
            },
            'machine learning engineer': {
                en: ['machine learning engineer'],
                pt_BR: ['engenheiro de machine learning']
            },
            'cloud engineer': {
                en: ['cloud engineer'],
                pt_BR: ['engenheiro cloud']
            },
            'cloud architect': {
                en: ['cloud architect'],
                pt_BR: ['arquiteto cloud']
            },
            'solutions architect': {
                en: ['solutions architect'],
                pt_BR: ['arquiteto de soluções']
            },
            'ai engineer': {
                en: ['ai engineer'],
                pt_BR: ['engenheiro de ia']
            },
            'nlp engineer': {
                en: ['nlp engineer'],
                pt_BR: ['engenheiro de nlp']
            },
            'ml ops engineer': {
                en: ['ml ops engineer'],
                pt_BR: ['engenheiro de mlops']
            },
            'security engineer': {
                en: ['security engineer'],
                pt_BR: ['engenheiro de segurança']
            },
            'cybersecurity analyst': {
                en: ['cybersecurity analyst'],
                pt_BR: ['analista de cibersegurança']
            },
            'application security': {
                en: ['application security'],
                pt_BR: ['segurança de aplicações']
            },
            'security architect': {
                en: ['security architect'],
                pt_BR: ['arquiteto de segurança']
            },
            'penetration tester': {
                en: ['penetration tester'],
                pt_BR: ['pentester']
            },
            'mobile engineer': {
                en: ['mobile engineer'],
                pt_BR: ['engenheiro mobile']
            },
            'ios developer': {
                en: ['ios developer'],
                pt_BR: ['desenvolvedor ios']
            },
            'android developer': {
                en: ['android developer'],
                pt_BR: ['desenvolvedor android']
            },
            'react native developer': {
                en: ['react native developer'],
                pt_BR: ['desenvolvedor react native']
            },
            'mobile developer': {
                en: ['mobile developer'],
                pt_BR: ['desenvolvedor mobile']
            },
            'web development': {
                en: ['web development'],
                pt_BR: ['desenvolvimento web']
            },
            frontend: {
                en: ['frontend'],
                pt_BR: ['frontend']
            },
            'design systems': {
                en: ['design systems'],
                pt_BR: ['design systems']
            },
            'backend development': {
                en: ['backend development'],
                pt_BR: ['desenvolvimento backend']
            },
            infrastructure: {
                en: ['infrastructure'],
                pt_BR: ['infraestrutura']
            },
            'cloud services': {
                en: ['cloud services'],
                pt_BR: ['serviços em nuvem']
            },
            fintech: {
                en: ['fintech'],
                pt_BR: ['fintech']
            },
            'software development': {
                en: ['software development'],
                pt_BR: ['desenvolvimento de software']
            },
            devops: {
                en: ['devops'],
                pt_BR: ['devops']
            },
            'cloud computing': {
                en: ['cloud computing'],
                pt_BR: ['computação em nuvem']
            },
            observability: {
                en: ['observability'],
                pt_BR: ['observabilidade']
            },
            'data engineering': {
                en: ['data engineering'],
                pt_BR: ['engenharia de dados']
            },
            analytics: {
                en: ['analytics'],
                pt_BR: ['analytics']
            },
            'artificial intelligence': {
                en: ['artificial intelligence'],
                pt_BR: ['inteligência artificial']
            },
            'big data': {
                en: ['big data'],
                pt_BR: ['big data']
            },
            'business intelligence': {
                en: ['business intelligence'],
                pt_BR: ['business intelligence']
            },
            aws: {
                en: ['aws'],
                pt_BR: ['aws']
            },
            azure: {
                en: ['azure'],
                pt_BR: ['azure']
            },
            gcp: {
                en: ['gcp'],
                pt_BR: ['gcp']
            },
            cybersecurity: {
                en: ['cybersecurity'],
                pt_BR: ['cibersegurança']
            },
            'information security': {
                en: ['information security'],
                pt_BR: ['segurança da informação']
            },
            'cloud security': {
                en: ['cloud security'],
                pt_BR: ['segurança em nuvem']
            },
            'security operations': {
                en: ['security operations'],
                pt_BR: ['operações de segurança']
            },
            'mobile development': {
                en: ['mobile development'],
                pt_BR: ['desenvolvimento mobile']
            },
            'mobile apps': {
                en: ['mobile apps'],
                pt_BR: ['aplicativos mobile']
            },
            'consumer tech': {
                en: ['consumer tech'],
                pt_BR: ['tecnologia para consumidores']
            },
            'machine learning': {
                en: ['machine learning'],
                pt_BR: ['aprendizado de máquina']
            },
            'deep learning': {
                en: ['deep learning'],
                pt_BR: ['deep learning']
            },
            'natural language processing': {
                en: ['natural language processing'],
                pt_BR: ['processamento de linguagem natural']
            },
            'generative ai': {
                en: ['generative ai'],
                pt_BR: ['ia generativa']
            },
            'frontend engineering': {
                en: ['frontend engineering'],
                pt_BR: ['engenharia frontend']
            },
            'backend engineering': {
                en: ['backend engineering'],
                pt_BR: ['engenharia backend']
            },
            'api development': {
                en: ['api development'],
                pt_BR: ['desenvolvimento de api']
            },
            'platform engineering': {
                en: ['platform engineering'],
                pt_BR: ['engenharia de plataforma']
            },
            'full stack': {
                en: ['full stack'],
                pt_BR: ['full stack']
            },
            'software engineering': {
                en: ['software engineering'],
                pt_BR: ['engenharia de software']
            },
            'product engineering': {
                en: ['product engineering'],
                pt_BR: ['engenharia de produto']
            },
            'site reliability': {
                en: ['site reliability'],
                pt_BR: ['confiabilidade de serviço']
            },
            'data science': {
                en: ['data science'],
                pt_BR: ['ciência de dados']
            },
            'analytics engineering': {
                en: ['analytics engineering'],
                pt_BR: ['engenharia de analytics']
            },
            'cloud engineering': {
                en: ['cloud engineering'],
                pt_BR: ['engenharia cloud']
            },
            'cloud infrastructure': {
                en: ['cloud infrastructure'],
                pt_BR: ['infraestrutura em nuvem']
            },
            'cloud architect': {
                en: ['cloud architect'],
                pt_BR: ['arquiteto cloud']
            },
            'security engineering': {
                en: ['security engineering'],
                pt_BR: ['engenharia de segurança']
            },
            'ios': {
                en: ['ios'],
                pt_BR: ['ios']
            },
            android: {
                en: ['android'],
                pt_BR: ['android']
            },
            'react native': {
                en: ['react native'],
                pt_BR: ['react native']
            },
            'ai research': {
                en: ['ai research'],
                pt_BR: ['pesquisa em ia']
            },
            'generative ai': {
                en: ['generative ai'],
                pt_BR: ['ia generativa']
            }
        });

        const TERM_ALIASES = Object.freeze({
            recrutador: 'recruiter',
            'aquisicao de talentos': 'talent acquisition',
            'aquisição de talentos': 'talent acquisition',
            'gestor de contratacao': 'hiring manager',
            'gestor de contratação': 'hiring manager',
            'lider de talentos': 'head of talent',
            'líder de talentos': 'head of talent',
            'engenheiro de software': 'software engineer',
            'gerente de engenharia': 'engineering manager',
            desenvolvedor: 'developer',
            'lider tecnico': 'tech lead',
            'líder técnico': 'tech lead',
            'gerente de produto': 'product manager',
            'analista de qa': 'qa',
            diretor: 'director',
            gerente: 'manager',
            'busca executiva': 'executive search',
            'designer de produto': 'product designer',
            'designer ux': 'ux designer',
            'designer ui': 'ui designer',
            'diretor de arte': 'art director',
            'estrategista de marca': 'brand strategist',
            'designer de marca': 'brand designer',
            'engenheiro backend': 'backend engineer',
            'engenheiro full stack': 'full stack engineer',
            'engenheiro de produto': 'product engineer',
            analista: 'analyst',
            engenharia: 'engineering',
            tecnologia: 'technology',
            dados: 'data',
            finanças: 'finance',
            financas: 'finance',
            'servicos financeiros': 'financial services',
            'serviços financeiros': 'financial services',
            vendas: 'sales',
            'design de produto': 'product design',
            'experiencia do usuario': 'user experience',
            'experiência do usuário': 'user experience',
            recrutamento: 'recruiting',
            'recrutamento e selecao': 'staffing',
            'recrutamento e seleção': 'staffing',
            brasil: 'brazil',
            'contratando no brasil': 'hiring in brazil',
            remoto: 'remote',
            hibrido: 'hybrid',
            híbrido: 'hybrid',
            'candidatura simplificada': 'easy apply',
            'ferramentas para desenvolvedores': 'developer tools',
            'empresa de software': 'software company',
            'empresas de tecnologia': 'technology companies',
            'times de contratacao': 'hiring teams',
            'times de contratação': 'hiring teams',
            'estrategia de marca': 'brand strategy',
            'estratégia de marca': 'brand strategy',
            'identidade visual': 'visual identity',
            'direcao criativa': 'creative direction',
            'direção criativa': 'creative direction',
            criativo: 'creative',
            senior: 'senior',
            sênior: 'senior',
            'pleno': 'mid-level',
            global: 'global',
            latam: 'latam',
            nearshore: 'nearshore',
            'engenheiro frontend': 'frontend engineer',
            'desenvolvedor frontend': 'frontend developer',
            'desenvolvedor react': 'react developer',
            'engenheiro de interface': 'ui engineer',
            'desenvolvedor web': 'web developer',
            'desenvolvedor backend': 'backend developer',
            'engenheiro de api': 'api engineer',
            'engenheiro de plataforma': 'platform engineer',
            'engenheiro de servidor': 'server engineer',
            'desenvolvedor fullstack': 'fullstack developer',
            'engenheiro devops': 'devops engineer',
            'engenheiro de confiabilidade': 'site reliability engineer',
            'engenheiro de infraestrutura': 'infrastructure engineer',
            'engenheiro de dados': 'data engineer',
            'cientista de dados': 'data scientist',
            'engenheiro de analytics': 'analytics engineer',
            'analista de dados': 'data analyst',
            'engenheiro de machine learning': 'machine learning engineer',
            'engenheiro cloud': 'cloud engineer',
            'arquiteto cloud': 'cloud architect',
            'arquiteto de solucoes': 'solutions architect',
            'arquiteto de soluções': 'solutions architect',
            'engenheiro de ia': 'ai engineer',
            'engenheiro de nlp': 'nlp engineer',
            'engenheiro de mlops': 'ml ops engineer',
            'engenheiro de seguranca': 'security engineer',
            'engenheiro de segurança': 'security engineer',
            'analista de ciberseguranca': 'cybersecurity analyst',
            'analista de cibersegurança': 'cybersecurity analyst',
            'seguranca de aplicacoes': 'application security',
            'segurança de aplicações': 'application security',
            'arquiteto de seguranca': 'security architect',
            'arquiteto de segurança': 'security architect',
            pentester: 'penetration tester',
            'engenheiro mobile': 'mobile engineer',
            'desenvolvedor ios': 'ios developer',
            'desenvolvedor android': 'android developer',
            'desenvolvedor react native': 'react native developer',
            'desenvolvedor mobile': 'mobile developer',
            'desenvolvimento web': 'web development',
            'design systems': 'design systems',
            'desenvolvimento backend': 'backend development',
            infraestrutura: 'infrastructure',
            'servicos em nuvem': 'cloud services',
            'serviços em nuvem': 'cloud services',
            'desenvolvimento de software': 'software development',
            'computacao em nuvem': 'cloud computing',
            'computação em nuvem': 'cloud computing',
            observabilidade: 'observability',
            'engenharia de dados': 'data engineering',
            'inteligencia artificial': 'artificial intelligence',
            'inteligência artificial': 'artificial intelligence',
            'big data': 'big data',
            'business intelligence': 'business intelligence',
            ciberseguranca: 'cybersecurity',
            cibersegurança: 'cybersecurity',
            'seguranca da informacao': 'information security',
            'segurança da informação': 'information security',
            'seguranca em nuvem': 'cloud security',
            'segurança em nuvem': 'cloud security',
            'operacoes de seguranca': 'security operations',
            'operações de segurança': 'security operations',
            'desenvolvimento mobile': 'mobile development',
            'aplicativos mobile': 'mobile apps',
            'aprendizado de maquina': 'machine learning',
            'aprendizado de máquina': 'machine learning',
            'processamento de linguagem natural': 'natural language processing',
            'ia generativa': 'generative ai',
            'engenharia frontend': 'frontend engineering',
            'engenharia backend': 'backend engineering',
            'desenvolvimento de api': 'api development',
            'engenharia de plataforma': 'platform engineering',
            'full stack': 'full stack',
            'engenharia de software': 'software engineering',
            'engenharia de produto': 'product engineering',
            'confiabilidade de servico': 'site reliability',
            'confiabilidade de serviço': 'site reliability',
            'ciencia de dados': 'data science',
            'ciência de dados': 'data science',
            'engenharia cloud': 'cloud engineering',
            'infraestrutura em nuvem': 'cloud infrastructure',
            'engenharia de seguranca': 'security engineering',
            'engenharia de segurança': 'security engineering',
            'pesquisa em ia': 'ai research'
        });

        function normalizeSearchLanguageMode(value) {
            const mode = String(value || '').trim();
            if (SEARCH_LANGUAGE_MODES.includes(mode)) {
                return mode;
            }
            return 'auto';
        }

        function normalizeTermKey(value) {
            return String(value || '')
                .replace(/^"+|"+$/g, '')
                .trim()
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '');
        }

        function resolveCanonicalTerm(value) {
            const key = normalizeTermKey(value);
            if (!key) return '';
            if (TERM_VARIANTS[key]) {
                return key;
            }
            return TERM_ALIASES[key] || key;
        }

        function dedupe(values) {
            const seen = new Set();
            return values.filter(function(value) {
                const key = normalizeTermKey(value);
                if (!key || seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        }

        function localizeSearchTerms(values, locale) {
            const normalizedLocale = normalizeSearchLanguageMode(locale) === 'auto'
                ? 'en'
                : normalizeSearchLanguageMode(locale);
            const targetLocale = normalizedLocale === 'bilingual'
                ? 'bilingual'
                : normalizedLocale;

            const localized = [];
            values.forEach(function(raw) {
                const canonical = resolveCanonicalTerm(raw);
                const variants = TERM_VARIANTS[canonical];
                if (!variants) {
                    localized.push(String(raw || '').replace(/^"+|"+$/g, '').trim());
                    return;
                }
                if (targetLocale === 'bilingual') {
                    localized.push.apply(localized, variants.en);
                    localized.push.apply(localized, variants.pt_BR);
                    return;
                }
                localized.push.apply(localized, variants[targetLocale] || variants.en);
            });
            return dedupe(localized).filter(Boolean);
        }

        function hasBrazilSignals(context) {
            const haystack = [
                ...(context.selectedLocations || []),
                ...(context.marketTerms || []),
                ...(context.locationTerms || []),
                context.areaPreset,
                context.query
            ].join(' ').toLowerCase();
            return /(brazil|brasil|rio|sao paulo|são paulo|local)/.test(haystack);
        }

        function hasGlobalSignals(context) {
            const haystack = [
                ...(context.selectedLocations || []),
                ...(context.marketTerms || []),
                ...(context.locationTerms || []),
                context.areaPreset,
                context.query
            ].join(' ').toLowerCase();
            if (context.jobsBrazilOffshoreFriendly === true) {
                return true;
            }
            if (context.mode === 'connect' &&
                context.usageGoal === 'recruiter_outreach' &&
                !hasBrazilSignals(context)) {
                return true;
            }
            if (context.mode === 'jobs' &&
                context.jobsBrazilOffshoreFriendly !== true &&
                hasBrazilSignals(context)) {
                return /(global|worldwide|international|offshore|nearshore)/.test(
                    haystack
                );
            }
            return /(global|worldwide|international|offshore|nearshore|remote)/.test(haystack);
        }

        function shouldUseBilingual(context) {
            const bucket = String(context.expectedResultsBucket || '').toLowerCase();
            const goal = String(context.usageGoal || '').toLowerCase();
            const haystack = [
                ...(context.selectedLocations || []),
                ...(context.marketTerms || [])
            ].join(' ').toLowerCase();
            const mixed = /latam/.test(haystack) && /global/.test(haystack);
            return bucket === 'broad' || goal === 'market_scan'
                ? mixed || /latam/.test(haystack)
                : false;
        }

        function resolveSearchLocale(context) {
            const source = context && typeof context === 'object'
                ? context : {};
            const requestedMode = normalizeSearchLanguageMode(
                source.requestedMode || source.searchLanguageMode
            );
            const hasBilingualSignals = shouldUseBilingual(source);
            const hasBrazil = hasBrazilSignals(source);
            const hasGlobal = hasGlobalSignals(source);
            if (requestedMode !== 'auto') {
                return requestedMode;
            }
            if (hasBilingualSignals) {
                return 'bilingual';
            }
            if (source.jobsBrazilOffshoreFriendly === true) {
                return 'en';
            }
            if (source.mode === 'jobs' && hasBrazil) {
                return 'pt_BR';
            }
            if (hasGlobal) {
                return 'en';
            }
            if (hasBrazil) {
                return 'pt_BR';
            }
            return 'en';
        }

        return {
            SEARCH_LANGUAGE_MODES,
            normalizeSearchLanguageMode,
            resolveSearchLocale,
            resolveCanonicalTerm,
            localizeSearchTerms
        };
    }
);
