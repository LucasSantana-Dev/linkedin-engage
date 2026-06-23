(function(root, factory) {
    const api = factory(
        root.LinkedInSearchTemplates ||
        (typeof require === 'function'
            ? require('./search-templates')
            : null),
        root.LinkedInSearchLanguage ||
        (typeof require === 'function'
            ? require('./search-language')
            : null)
    );
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.LinkedInJobsCareerIntelligence = api;
    Object.keys(api).forEach(function(key) {
        if (typeof root[key] === 'undefined') {
            root[key] = api[key];
        }
    });
})(
    typeof globalThis !== 'undefined' ? globalThis : this,
    function(searchTemplates, searchLanguage) {
        const textUtils = typeof require === 'function'
            ? require('./text-utils.js')
            : (typeof globalThis !== 'undefined' && globalThis.LinkedInTextUtils ? globalThis.LinkedInTextUtils : null);
        const resolveSearchLocale =
            searchLanguage?.resolveSearchLocale;
        const localizeSearchTerms =
            searchLanguage?.localizeSearchTerms;
        const MAX_RESUME_BYTES = 5 * 1024 * 1024;
        const MAX_RESUME_FILES = 5;
        const GENERIC_STOPWORDS = new Set([
            'team',
            'results',
            'professional',
            'experience',
            'experiences',
            'developed',
            'building',
            'worked',
            'using',
            'global',
            'products',
            'product',
            'distributed'
        ]);
        const BRAZIL_OFFSHORE_SIGNALS = Object.freeze([
            'remote',
            'brazil',
            'brasil',
            'latam',
            'latin america',
            'contractor',
            'independent contractor',
            'offshore',
            'nearshore',
            'employer of record',
            'eor',
            'b2b',
            'timezone overlap'
        ]);
        const KEYWORD_PATTERNS = Object.freeze([
            ['node.js', /\bnode(?:\.js)?\b/g],
            ['react', /\breact(?:\.js)?\b/g],
            ['typescript', /\btypescript\b/g],
            ['javascript', /\bjavascript\b/g],
            ['aws', /\baws\b|\bamazon web services\b/g],
            ['docker', /\bdocker\b/g],
            ['postgresql', /\bpostgres(?:ql)?\b/g],
            ['redis', /\bredis\b/g],
            ['java', /\bjava\b/g],
            ['spring boot', /\bspring boot\b/g],
            ['python', /\bpython\b/g],
            ['react native', /\breact native\b/g],
            ['next.js', /\bnext(?:\.js)?\b/g],
            ['kubernetes', /\bkubernetes\b/g]
        ]);
        const ROLE_PATTERNS = Object.freeze([
            ['full stack engineer', /\bfull[-\s]?stack (?:engineer|developer)\b/g],
            ['software engineer', /\bsoftware engineer\b/g],
            ['backend engineer', /\bbackend (?:engineer|developer)\b/g],
            ['frontend engineer', /\bfront[-\s]?end (?:engineer|developer)\b/g],
            ['product engineer', /\bproduct engineer\b/g],
            ['product designer', /\bproduct designer\b/g],
            ['ux designer', /\bux designer\b/g],
            ['ui designer', /\bui designer\b/g],
            ['qa engineer', /\bqa (?:engineer|analyst)\b/g]
        ]);

        function normalizeText(value) {
            const normalized = textUtils.normalizeToSearch(value);
            return normalized
                .replace(/[^\p{L}\p{N}.+\s/-]/gu, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        }

        function uniqueList(values, limit) {
            const seen = new Set();
            const out = [];
            for (const raw of values || []) {
                const value = String(raw || '').trim();
                const key = normalizeText(value);
                if (!key || seen.has(key)) continue;
                seen.add(key);
                out.push(value);
                if (limit && out.length >= limit) break;
            }
            return out;
        }

        function tokenize(text) {
            return normalizeText(text)
                .split(/\s+/)
                .filter(Boolean)
                .filter(token => token.length >= 3)
                .filter(token => !GENERIC_STOPWORDS.has(token));
        }

        function validateResumeVaultFileMeta(file) {
            const name = String(file?.name || '').trim();
            const size = Number(file?.size) || 0;
            const ext = name.split('.').pop()?.toLowerCase() || '';
            if (ext !== 'pdf' && ext !== 'docx') {
                return {
                    ok: false,
                    reason: 'unsupported-file-type',
                    extension: ext
                };
            }
            if (size <= 0 || size > MAX_RESUME_BYTES) {
                return {
                    ok: false,
                    reason: 'file-too-large',
                    extension: ext
                };
            }
            return {
                ok: true,
                extension: ext
            };
        }

        function detectMatches(text, patterns, limit) {
            const normalized = normalizeText(text);
            const hits = [];
            for (const [label, pattern] of patterns) {
                if (!pattern.test(normalized)) continue;
                hits.push(label);
                if (limit && hits.length >= limit) break;
            }
            return uniqueList(hits, limit);
        }

        function detectSeniority(text) {
            const normalized = normalizeText(text);
            if (/\b(staff|principal|lead|head|director)\b/.test(normalized)) {
                return 'lead';
            }
            if (/\b(senior|sr)\b/.test(normalized)) return 'senior';
            if (/\b(mid|pleno|associate)\b/.test(normalized)) return 'mid';
            if (/\b(junior|jr|entry)\b/.test(normalized)) return 'junior';
            if (/\b(intern|trainee|estagio)\b/.test(normalized)) return 'intern';
            return 'mid';
        }

        function mapExperienceLevel(seniority) {
            if (seniority === 'intern') return '1';
            if (seniority === 'junior') return '2';
            if (seniority === 'lead') return '5';
            if (seniority === 'senior') return '4';
            return '3';
        }

        function inferAreaPreset(roles, keywords) {
            const combined = normalizeText(
                roles.concat(keywords).join(' ')
            );
            if (/\b(designer|ux|ui|branding|creative)\b/.test(combined)) {
                return 'creative';
            }
            if (/\b(engineer|developer|react|node|aws|typescript|java|python)\b/
                .test(combined)) {
                return 'tech';
            }
            return 'custom';
        }

        function collectSourceText(input) {
            const profile = input?.profile || {};
            const importedProfile = input?.importedProfile || {};
            const resumeDocuments = Array.isArray(input?.resumeDocuments)
                ? input.resumeDocuments
                : [];
            const chunks = [
                profile.currentTitle,
                profile.resumeSummary,
                profile.city,
                importedProfile.headline,
                importedProfile.about,
                importedProfile.location,
                ...(importedProfile.skills || []),
                ...(importedProfile.experiences || []),
                ...resumeDocuments.map(doc => doc?.extractedText || '')
            ];
            return chunks.filter(Boolean).join('\n');
        }

        function inferLocationTerms(text) {
            const normalized = normalizeText(text);
            const terms = [];
            if (/\bbrazil|brasil\b/.test(normalized)) terms.push('brazil');
            if (/\bremote|distributed\b/.test(normalized)) terms.push('remote');
            if (/\blatam|latin america\b/.test(normalized)) terms.push('latam');
            if (!terms.includes('remote')) terms.push('remote');
            return uniqueList(terms, 4);
        }

        function inferKeywordTerms(text) {
            const detected = detectMatches(text, KEYWORD_PATTERNS, 12);
            if (detected.length >= 8) return detected.slice(0, 12);
            const tokens = tokenize(text);
            return uniqueList(detected.concat(tokens), 12);
        }

        function inferRemotePreference(text) {
            return /\bremote|distributed|async|global team\b/.test(
                normalizeText(text)
            );
        }

        function analyzeJobsCareerInputs(input) {
            const sourceText = collectSourceText(input);
            const inferredRoles = detectMatches(sourceText, ROLE_PATTERNS, 5);
            const keywordTerms = inferKeywordTerms(sourceText);
            const seniority = detectSeniority(sourceText);
            const locationTerms = inferLocationTerms(sourceText);
            const remotePreferred = inferRemotePreference(sourceText);
            const areaPreset = inferAreaPreset(
                inferredRoles,
                keywordTerms
            );

            return {
                version: 1,
                areaPreset,
                seniority,
                inferredRoles: uniqueList(
                    inferredRoles.length
                        ? inferredRoles
                        : ['software engineer'],
                    5
                ),
                keywordTerms: uniqueList(keywordTerms, 12),
                locationTerms: uniqueList(locationTerms, 4),
                workType: remotePreferred ? '2' : '',
                experienceLevel: mapExperienceLevel(seniority),
                remotePreferred,
                sourceTextLength: sourceText.length
            };
        }

        function chooseTemplateId(areaPreset, expectedResultsBucket) {
            const bucket = String(expectedResultsBucket || 'balanced');
            if (areaPreset === 'creative') {
                return `jobs.creative.target_company_roles.${bucket}`;
            }
            if (areaPreset === 'tech') {
                return bucket === 'broad'
                    ? 'jobs.any.market_scan.broad'
                    : 'jobs.tech.high_fit_easy_apply.precise';
            }
            return `jobs.custom.high_fit_easy_apply.${
                bucket === 'precise' ? 'balanced' : bucket
            }`;
        }

        function buildJobsCareerSearchPlan(snapshot, options) {
            const source = snapshot && typeof snapshot === 'object'
                ? snapshot
                : {};
            const expectedResultsBucket = String(
                options?.expectedResultsBucket || 'balanced'
            );
            const resolvedLocale =
                typeof resolveSearchLocale === 'function'
                    ? resolveSearchLocale({
                        mode: 'jobs',
                        requestedMode: options?.searchLanguageMode,
                        selectedLocations: source.locationTerms,
                        locationTerms: source.locationTerms,
                        usageGoal: 'high_fit_easy_apply',
                        expectedResultsBucket,
                        jobsBrazilOffshoreFriendly:
                            options?.jobsBrazilOffshoreFriendly === true
                    })
                    : 'en';
            const baseRoleTerms = uniqueList(source.inferredRoles, 5);
            const baseKeywordTerms = uniqueList(source.keywordTerms, 12);
            const baseLocationTerms = uniqueList(source.locationTerms, 4);
            const roleTerms = typeof localizeSearchTerms === 'function'
                ? uniqueList(
                    localizeSearchTerms(baseRoleTerms, resolvedLocale),
                    5
                )
                : baseRoleTerms;
            const keywordTerms = typeof localizeSearchTerms === 'function'
                ? uniqueList(
                    localizeSearchTerms(baseKeywordTerms, resolvedLocale),
                    12
                )
                : baseKeywordTerms;
            const locationTerms = typeof localizeSearchTerms === 'function'
                ? uniqueList(
                    localizeSearchTerms(baseLocationTerms, resolvedLocale),
                    4
                )
                : baseLocationTerms;
            const templateId = chooseTemplateId(
                source.areaPreset || 'custom',
                expectedResultsBucket
            );
            const compiled = searchTemplates?.compileBooleanQuery
                ? searchTemplates.compileBooleanQuery({
                    should: roleTerms,
                    must: locationTerms.concat(keywordTerms.slice(0, 4)),
                    mustNot: [],
                    budget: 12,
                    explicitAnd: true,
                    wrapShould: true
                })
                : {
                    query: roleTerms.join(' OR '),
                    operatorCount: 0
                };

            return {
                templateId,
                areaPreset: source.areaPreset || 'custom',
                roleTerms,
                keywordTerms,
                locationTerms,
                query: compiled.query,
                operatorCount: compiled.operatorCount || 0,
                workType: source.workType || '',
                experienceLevel: source.experienceLevel || '',
                resolvedSearchLocale: resolvedLocale
            };
        }

        function getBrazilOffshoreSignals() {
            return BRAZIL_OFFSHORE_SIGNALS.slice();
        }

        return {
            MAX_RESUME_BYTES,
            MAX_RESUME_FILES,
            validateResumeVaultFileMeta,
            analyzeJobsCareerInputs,
            buildJobsCareerSearchPlan,
            getBrazilOffshoreSignals
        };
    }
);
