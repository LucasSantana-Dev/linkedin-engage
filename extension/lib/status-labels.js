(function(root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
    root.LinkedInStatusLabels = api;
    Object.keys(api).forEach(k => { if (typeof root[k] === 'undefined') root[k] = api[k]; });
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
    const BASE_STATUS_LABELS = Object.freeze({
        sent: ['status.sent', 'Sent'],
        accepted: ['status.accepted', 'Accepted'],
        visited: ['status.visited', 'Visited'],
        followed: ['status.followed', 'Followed'],
        'visited-followed': ['status.visitedFollowed', 'Visited + Followed']
    });

    const COMPANY_STATUS_LABELS = Object.freeze({
        'company-followed': ['status.companyFollowed', 'Company followed']
    });

    // translate(key, fallback) is injected by the caller.
    // options.includeCompany: also resolve company-* statuses.
    // options.trim: trim the raw status before matching.
    function getStatusLabel(status, translate, options) {
        const opts = options || {};
        let value = String(status || '');
        if (opts.trim) value = value.trim();
        const map = opts.includeCompany
            ? { ...BASE_STATUS_LABELS, ...COMPANY_STATUS_LABELS }
            : BASE_STATUS_LABELS;
        if (map[value]) {
            const [key, fallback] = map[value];
            return translate(key, fallback);
        }
        if (opts.includeCompany && value.startsWith('company-')) {
            return translate(
                'status.companyAction',
                value.replace(/^company-/, 'company ')
            );
        }
        if (value.startsWith('skipped-')) {
            const reason = value.replace(/^skipped-/, '');
            return translate(`status.${reason}`, reason);
        }
        return value.replace(/-/g, ' ');
    }

    return Object.freeze({ getStatusLabel });
});
