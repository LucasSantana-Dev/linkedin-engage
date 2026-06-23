(function(root, factory) {
    const api = factory(
        root.LinkedInTextUtils ||
        (typeof require === 'function' ? require('./text-utils.js') : null)
    );
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.LinkedInJobsUtils = api;
    Object.keys(api).forEach(function(key) {
        if (typeof root[key] === 'undefined') {
            root[key] = api[key];
        }
    });
})(
    typeof globalThis !== 'undefined' ? globalThis : this,
    function(textUtils) {
        function normalizeText(value) {
            const normalized = textUtils?.normalizeToSearch(value) || String(value || '').toLowerCase().trim();
            return normalized
                .replace(/[^\p{L}\p{N}\s]/gu, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        }

        function toList(value) {
            if (Array.isArray(value)) {
                return value.map(item => String(item || '').trim())
                    .filter(Boolean);
            }
            if (typeof value === 'string') {
                return value
                    .split('\n')
                    .map(item => item.trim())
                    .filter(Boolean);
            }
            return [];
        }

        function tokenize(value) {
            return normalizeText(value)
                .split(' ')
                .map(part => part.trim())
                .filter(Boolean);
        }

        function uniqueNormalized(list) {
            const seen = new Set();
            const out = [];
            for (const raw of toList(list)) {
                const normalized = normalizeText(raw);
                if (!normalized || seen.has(normalized)) continue;
                seen.add(normalized);
                out.push(normalized);
            }
            return out;
        }

        function matchesExcludedJobCompany(company, excludedCompanies) {
            const normalizedCompany = normalizeText(company);
            if (!normalizedCompany) return null;
            const rawList = toList(excludedCompanies);
            for (const raw of rawList) {
                const normalized = normalizeText(raw);
                if (!normalized) continue;
                if (normalizedCompany.includes(normalized) ||
                    normalized.includes(normalizedCompany)) {
                    return raw;
                }
            }
            return null;
        }

        function scoreTextMatch(text, terms) {
            const tokens = tokenize(text);
            if (!tokens.length) return 0;
            const source = uniqueNormalized(terms);
            if (!source.length) return 0.5;
            let hit = 0;
            for (const term of source) {
                const termTokens = tokenize(term);
                if (!termTokens.length) continue;
                const matched = termTokens.every(
                    token => tokens.includes(token)
                );
                if (matched) hit++;
            }
            return hit / source.length;
        }

        function inferSeniority(value) {
            const text = normalizeText(value);
            if (!text) return 'unknown';
            if (/director|head|principal|staff|lead/.test(text)) {
                return 'lead';
            }
            if (/senior|sr|pleno senior/.test(text)) {
                return 'senior';
            }
            if (/mid|pleno/.test(text)) {
                return 'mid';
            }
            if (/junior|jr/.test(text)) {
                return 'junior';
            }
            if (/intern|estagio|trainee/.test(text)) {
                return 'intern';
            }
            return 'unknown';
        }

        function scoreSeniority(job, desiredLevels) {
            const desired = uniqueNormalized(desiredLevels);
            if (!desired.length) return 0.6;
            const jobLevel = inferSeniority(
                job.seniority || job.title
            );
            if (jobLevel === 'unknown') return 0.2;
            return desired.includes(jobLevel) ? 1 : 0.2;
        }

        function scoreLocationFit(job, locationTerms) {
            const terms = uniqueNormalized(locationTerms);
            if (!terms.length) return 0.6;
            const locationText = normalizeText(
                `${job.location || ''} ${job.workType || ''}`
            );
            if (!locationText) return 0;
            let hit = 0;
            for (const term of terms) {
                if (locationText.includes(term)) hit++;
            }
            return hit / terms.length;
        }

        function scoreRecency(hoursAgo) {
            const hours = Number(hoursAgo);
            if (!Number.isFinite(hours) || hours < 0) return 0.4;
            if (hours <= 6) return 1;
            if (hours <= 24) return 0.85;
            if (hours <= 72) return 0.6;
            if (hours <= 168) return 0.35;
            return 0.15;
        }

        function scoreCompanyFit(company, preferredCompanies) {
            const target = uniqueNormalized(preferredCompanies);
            if (!target.length) return 0.5;
            const normalized = normalizeText(company);
            if (!normalized) return 0;
            for (const term of target) {
                if (normalized.includes(term) ||
                    term.includes(normalized)) {
                    return 1;
                }
            }
            return 0.1;
        }

        function getOffshoreCompatibility(job, config) {
            if (config?.jobsBrazilOffshoreFriendly !== true) {
                return {
                    allowed: true,
                    score: 0.5
                };
            }
            const text = normalizeText(
                `${job.detailText || ''} ${job.location || ''} ${job.workType || ''}`
            );
            if (!text) {
                // No offshore signal at all (e.g. detail text not yet loaded):
                // undeterminable -> neutral 0.5, not a 0.2 penalty, so a
                // UI-lagged job isn't unfairly down-ranked.
                return {
                    allowed: true,
                    score: 0.5
                };
            }

            if (/\bus only\b|\bmust reside in\b|\bcitizen\b|\bpermanent resident\b|\bon site only\b|\bnot open to international candidates\b/
                .test(text)) {
                return {
                    allowed: false,
                    score: 0
                };
            }

            let hits = 0;
            const positivePatterns = [
                /\bremote\b/,
                /\bbrazil\b|\bbrasil\b/,
                /\blatam\b|\blatin america\b/,
                /\bcontractor\b/,
                /\bindependent contractor\b/,
                /\boffshore\b/,
                /\bnearshore\b/,
                /\bemployer of record\b|\beor\b/,
                /\bb2b\b/,
                /\btimezone overlap\b/,
                /\bdistributed team\b|\bglobal team\b/
            ];
            positivePatterns.forEach(pattern => {
                if (pattern.test(text)) hits++;
            });

            if (hits === 0) {
                return {
                    allowed: true,
                    score: 0.2
                };
            }

            return {
                allowed: true,
                score: Math.min(1, 0.3 + hits * 0.1)
            };
        }

        function hasAppliedBefore(job, appliedJobIds) {
            if (job.alreadyApplied === true) return true;
            const seen = new Set(toList(appliedJobIds)
                .map(normalizeText));
            const id = normalizeText(job.id);
            const url = normalizeText(job.jobUrl);
            return (id && seen.has(id)) || (url && seen.has(url));
        }

        function evaluateJobCandidate(job, config) {
            const current = job && typeof job === 'object' ? job : {};
            const settings = config && typeof config === 'object'
                ? config
                : {};

            if (settings.easyApplyOnly !== false &&
                current.easyApply !== true) {
                return {
                    skipReason: 'skipped-no-easy-apply',
                    matchedExcludedCompany: null
                };
            }

            if (hasAppliedBefore(current, settings.appliedJobIds)) {
                return {
                    skipReason: 'skipped-already-applied',
                    matchedExcludedCompany: null
                };
            }

            const excludedMatch = matchesExcludedJobCompany(
                current.company,
                settings.excludedCompanies
            );
            if (excludedMatch) {
                return {
                    skipReason: 'skipped-excluded-company',
                    matchedExcludedCompany: excludedMatch
                };
            }

            const offshore = getOffshoreCompatibility(
                current,
                settings
            );
            if (!offshore.allowed) {
                return {
                    skipReason: 'skipped-offshore-incompatible',
                    matchedExcludedCompany: null
                };
            }

            return {
                skipReason: null,
                matchedExcludedCompany: null,
                offshoreCompatibility: offshore.score
            };
        }

        function scoreJobCandidate(job, config) {
            const titleScore = scoreTextMatch(
                job.title,
                config.roleTerms
            );
            const keywordScore = scoreTextMatch(
                `${job.title || ''} ${job.detailText || ''}`,
                config.keywordTerms
            );
            const seniorityScore = scoreSeniority(
                job,
                config.desiredLevels
            );
            const locationScore = scoreLocationFit(
                job,
                config.locationTerms
            );
            const recencyScore = scoreRecency(job.postedHoursAgo);
            const companyScore = scoreCompanyFit(
                job.company,
                config.preferredCompanies
            );
            const offshore = getOffshoreCompatibility(job, config);

            return (
                titleScore * 0.30 +
                keywordScore * 0.25 +
                seniorityScore * 0.15 +
                locationScore * 0.10 +
                companyScore * 0.05 +
                recencyScore * 0.05 +
                offshore.score * 0.10
            );
        }

        function rankJobsForApply(jobs, config) {
            const source = Array.isArray(jobs) ? jobs : [];
            const settings = config && typeof config === 'object'
                ? config
                : {};
            const enriched = source.map((job, index) => {
                const base = job && typeof job === 'object'
                    ? { ...job }
                    : {};
                const decision = evaluateJobCandidate(base, settings);
                const score = decision.skipReason
                    ? 0
                    : scoreJobCandidate(base, settings);
                return {
                    ...base,
                    index,
                    score,
                    skipReason: decision.skipReason,
                    offshoreCompatibility:
                        decision.offshoreCompatibility,
                    matchedExcludedCompany:
                        decision.matchedExcludedCompany
                };
            });

            return enriched.sort((a, b) => {
                const aSkipped = !!a.skipReason;
                const bSkipped = !!b.skipReason;
                if (aSkipped !== bSkipped) return aSkipped ? 1 : -1;
                if (b.score !== a.score) return b.score - a.score;
                const aHours = Number(a.postedHoursAgo);
                const bHours = Number(b.postedHoursAgo);
                if (Number.isFinite(aHours) &&
                    Number.isFinite(bHours) &&
                    aHours !== bHours) {
                    return aHours - bHours;
                }
                return a.index - b.index;
            });
        }

        function buildLinkedInJobsSearchUrl(query, options) {
            const settings = options && typeof options === 'object'
                ? options
                : {};
            const keywords = String(query || '').trim();
            const url = new URL('https://www.linkedin.com/jobs/search/');
            if (keywords) url.searchParams.set('keywords', keywords);
            if (settings.easyApplyOnly !== false) {
                url.searchParams.set('f_AL', 'true');
            }
            const experience = String(
                settings.experienceLevel || ''
            ).trim();
            if (experience) url.searchParams.set('f_E', experience);
            const workType = String(settings.workType || '').trim();
            if (workType) url.searchParams.set('f_WT', workType);
            const location = String(settings.location || '').trim();
            if (location) url.searchParams.set('location', location);
            return url.toString();
        }

        // jobs-assist runs in the MAIN world (no chrome.i18n), so notification
        // text is resolved inline here — mirroring the file's existing inline
        // EN/PT detection idiom. Locale follows LinkedIn's page language (what
        // the user actually sees the notification over).
        function resolveJobsLocale(docLang, navLang) {
            const probe = String(docLang || navLang || '').toLowerCase();
            return probe.startsWith('pt') ? 'pt' : 'en';
        }

        const JOBS_NOTIFICATIONS = {
            securityChallenge: {
                en: 'LinkedIn security challenge detected — job assist ' +
                    'stopped. Please solve the CAPTCHA and retry.',
                pt: 'Desafio de seguranca do LinkedIn detectado — ' +
                    'assistente de vagas interrompido. Resolva o CAPTCHA ' +
                    'e tente novamente.'
            },
            securityChallengeMidRun: {
                en: 'LinkedIn security challenge detected mid-run — job ' +
                    'assist stopped.',
                pt: 'Desafio de seguranca do LinkedIn detectado durante a ' +
                    'execucao — assistente de vagas interrompido.'
            },
            manualInput: {
                en: 'Manual input required — complete the current ' +
                    'application form and restart Jobs Assist.',
                pt: 'Entrada manual necessaria — preencha o formulario de ' +
                    'candidatura atual e reinicie o Assistente de Vagas.'
            },
            failedPrefix: {
                en: 'Jobs assist failed: ',
                pt: 'Falha no assistente de vagas: '
            }
        };

        function jobsNotificationText(key, locale) {
            const entry = JOBS_NOTIFICATIONS[key];
            if (!entry) return '';
            return entry[locale] || entry.en;
        }

        // Pick the <select> option value matching a target string, so the
        // Easy-Apply filler can populate dropdowns without corrupting them
        // (returns null when nothing matches -> caller leaves the select alone).
        function findMatchingOptionValue(options, value) {
            const target = normalizeText(value);
            if (!target || !Array.isArray(options)) return null;
            // Exact value match first (skip empty-value placeholders).
            for (const opt of options) {
                if (!opt || !opt.value) continue;
                if (normalizeText(opt.value) === target) return opt.value;
            }
            // Then fuzzy text containment either direction.
            for (const opt of options) {
                if (!opt || !opt.value) continue;
                const text = normalizeText(opt.text);
                if (!text) continue;
                if (text.includes(target) || target.includes(text)) {
                    return opt.value;
                }
            }
            return null;
        }

        return {
            normalizeText,
            matchesExcludedJobCompany,
            evaluateJobCandidate,
            rankJobsForApply,
            buildLinkedInJobsSearchUrl,
            resolveJobsLocale,
            jobsNotificationText,
            findMatchingOptionValue
        };
    }
);
