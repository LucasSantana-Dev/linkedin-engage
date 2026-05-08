(function(root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
    root.FeatureToggles = api;
    Object.keys(api).forEach(k => { if (typeof root[k] === 'undefined') root[k] = api[k]; });
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
    const FEATURE_KEYS = Object.freeze({
        CONNECT: 'connectEnabled',
        JOBS: 'jobsEnabled',
        COMPANIES: 'companiesEnabled'
    });

    const DEFAULTS = Object.freeze({
        connectEnabled: true,
        jobsEnabled: true,
        companiesEnabled: true
    });

    function getFeatureToggles(callback) {
        // In Node test environment, return defaults
        if (typeof chrome === 'undefined' || !chrome.storage) {
            callback({ ...DEFAULTS });
            return;
        }
        chrome.storage.local.get('featureToggles', (data) => {
            callback({ ...DEFAULTS, ...(data.featureToggles || {}) });
        });
    }

    function setFeatureToggle(key, value, callback) {
        if (!Object.values(FEATURE_KEYS).includes(key)) {
            if (callback) callback(new Error(`Unknown toggle key: ${key}`));
            return;
        }
        if (typeof chrome === 'undefined' || !chrome.storage) {
            if (callback) callback(null);
            return;
        }
        chrome.storage.local.get('featureToggles', (data) => {
            const current = { ...DEFAULTS, ...(data.featureToggles || {}) };
            current[key] = !!value;
            chrome.storage.local.set({ featureToggles: current }, () => {
                if (callback) callback(null);
            });
        });
    }

    return Object.freeze({ FEATURE_KEYS, DEFAULTS, getFeatureToggles, setFeatureToggle });
});
