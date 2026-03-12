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
        const STATE_TAG_VERSION = 5;

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
            }
        };

        const AREA_PRESET_VALUES = Object.freeze([
            'tech',
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
            'custom'
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
            '"business development"'
        ];

        const AREA_LABELS = {
            tech: { en: 'technology', pt: 'tecnologia' },
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
                return String(role).toLowerCase();
            });
            const ordered = ROLE_PRIORITY
                .filter(function(term) {
                    return normalized.includes(term);
                })
                .map(function(term) {
                    return roles[normalized.indexOf(term)];
                });
            for (const role of roles) {
                if (!ordered.includes(role)) ordered.push(role);
            }
            return ordered.slice(0, safeLimit);
        }

        function buildConnectQueryFromTags(tags, roleTermsLimit) {
            const source = tags && typeof tags === 'object'
                ? tags
                : {};
            const parts = [];
            const safeRoles = limitRoleTerms(
                toArray(source.role),
                roleTermsLimit
            );
            if (safeRoles.length === 1) {
                parts.push(safeRoles[0]);
            } else if (safeRoles.length > 1) {
                parts.push(safeRoles.join(' OR '));
            }
            ['industry', 'market', 'level']
                .forEach(function(group) {
                    toArray(source[group]).forEach(function(term) {
                        parts.push(term);
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
            isValidAreaPreset,
            normalizeAreaPreset,
            shouldResetAreaPresetOnManualTag,
            parseExcludedCompanies,
            applyAreaPresetToTags,
            buildConnectQueryFromTags,
            getConnectTemplates,
            migrateConnectPopupState
        };
    }
);
