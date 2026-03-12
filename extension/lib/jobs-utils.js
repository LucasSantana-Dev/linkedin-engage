(function(root, factory) {
    const api = factory();
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
    function() {
        function normalizeText(value) {
            return String(value || '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
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

            if (current.easyApply !== true) {
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

            return {
                skipReason: null,
                matchedExcludedCompany: null
            };
        }

        function scoreJobCandidate(job, config) {
            const titleScore = scoreTextMatch(
                job.title,
                config.roleTerms
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

            return (
                titleScore * 0.40 +
                seniorityScore * 0.20 +
                locationScore * 0.15 +
                recencyScore * 0.15 +
                companyScore * 0.10
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

        return {
            normalizeText,
            matchesExcludedJobCompany,
            evaluateJobCandidate,
            rankJobsForApply,
            buildLinkedInJobsSearchUrl
        };
    }
);
