(function(root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.LinkedInIntentPresets = api;
    Object.keys(api).forEach(function(key) {
        if (typeof root[key] === 'undefined') {
            root[key] = api[key];
        }
    });
})(
    typeof globalThis !== 'undefined' ? globalThis : this,
    function() {
        const INTENT_PRESETS = Object.freeze({
            'recruiter-tech-global': {
                areaPreset: 'recruiter-tech-general',
                usageGoal: 'recruiter_outreach',
                expectedResults: 'balanced',
                language: 'en',
                goalMode: 'passive'
            },
            'recruiter-tech-senior': {
                areaPreset: 'recruiter-tech-senior',
                usageGoal: 'recruiter_outreach',
                expectedResults: 'precise',
                language: 'en',
                goalMode: 'passive'
            },
            'recruiter-tech-remote': {
                areaPreset: 'recruiter-tech-remote-global',
                usageGoal: 'recruiter_outreach',
                expectedResults: 'balanced',
                language: 'en',
                goalMode: 'passive'
            },
            'recruiter-tech-startup': {
                areaPreset: 'recruiter-tech-startup-saas',
                usageGoal: 'recruiter_outreach',
                expectedResults: 'balanced',
                language: 'en',
                goalMode: 'passive'
            },
            'recruiter-tech-agency': {
                areaPreset: 'recruiter-tech-agency',
                usageGoal: 'recruiter_outreach',
                expectedResults: 'broad',
                language: 'en',
                goalMode: 'passive'
            },
            'recruiter-tech-brazil': {
                areaPreset: 'recruiter-tech-brazil',
                usageGoal: 'recruiter_outreach',
                expectedResults: 'balanced',
                language: 'pt_BR',
                goalMode: 'passive'
            },
            'recruiter-design': {
                areaPreset: 'ui-ux',
                usageGoal: 'recruiter_outreach',
                expectedResults: 'balanced',
                language: 'en',
                goalMode: 'passive'
            },
            'peer-networking-tech': {
                areaPreset: 'tech',
                usageGoal: 'peer_networking',
                expectedResults: 'balanced',
                language: 'en',
                goalMode: 'passive'
            },
            'decision-makers-tech': {
                areaPreset: 'tech',
                usageGoal: 'decision_makers',
                expectedResults: 'precise',
                language: 'en',
                goalMode: 'passive'
            }
        });

        return {
            INTENT_PRESETS
        };
    }
);
