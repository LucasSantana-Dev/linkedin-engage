(function(root, factory) {
    const api = factory();
    /* istanbul ignore next */
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.LinkedInChipHydrator = api;
    Object.keys(api).forEach(function(key) {
        /* istanbul ignore next */
        if (typeof root[key] === 'undefined') {
            root[key] = api[key];
        }
    });
})(
    /* istanbul ignore next */
    typeof globalThis !== 'undefined' ? globalThis : this,
    function() {
        /**
         * Static market chip data (no area filtering).
         * Maps data-value to display label.
         */
        const MARKET_CHIPS = {
            latam: 'LATAM',
            brazil: 'Brazil',
            nearshore: 'Nearshore',
            'latin america': 'Latin America',
            offshore: 'Offshore',
            'distributed team': 'Distributed Team',
            'hiring in brazil': 'Hiring in Brazil'
        };

        /**
         * Static level chip data (no area filtering).
         * Maps data-value to display label.
         */
        const LEVEL_CHIPS = {
            intern: 'Intern',
            associate: 'Associate',
            junior: 'Junior',
            'mid-level': 'Mid-Level',
            senior: 'Senior',
            lead: 'Lead',
            staff: 'Staff'
        };

        /**
         * Static work mode chip data (no area filtering).
         * Maps data-value to display label.
         */
        const WORK_MODE_CHIPS = {
            remote: 'Remote',
            'on-site': 'On-site',
            hybrid: 'Hybrid'
        };

        /**
         * Maps UI area names to AREA_PRESETS keys.
         * UI areas may aggregate roles/industries from multiple presets.
         */
        const AREA_TO_PRESETS_MAPPING = {
            recruiting: ['headhunting'],
            tech: ['tech', 'tech-frontend', 'tech-backend', 'tech-fullstack', 'tech-devops', 
                   'tech-data', 'tech-cloud', 'tech-security', 'tech-mobile', 'tech-ml-ai'],
            finance: ['finance'],
            'real-estate': ['real-estate'],
            legal: ['legal-judicial-media'],
            healthcare: ['healthcare'],
            education: ['education'],
            marketing: ['marketing'],
            sales: ['sales'],
            design: ['graphic-design', 'ui-ux', 'art-direction'],
            creative: ['branding', 'motion-design', 'video-editing', 'videomaker']
        };

        /**
         * Build a single chip element (HTML element or string).
         * @param {string} group - data-group value (role, industry, market, level, workMode)
         * @param {string} area - data-area value (tech, recruiting, etc.) or null/undefined for area-agnostic groups
         * @param {string} value - data-value attribute
         * @param {string} label - display text (human-readable label)
         * @returns {HTMLElement} A <span> element with class="tag" and standard attrs
         */
        function buildChipMarkup(group, area, value, label) {
            const span = document.createElement('span');
            span.className = 'tag';
            span.setAttribute('data-group', group);
            if (area) {
                span.setAttribute('data-area', area);
            }
            span.setAttribute('data-value', value);
            span.textContent = label;
            return span;
        }

        /**
         * Hydrate a container with chips for a specific group.
         * Clears existing chips and populates from data source.
         * @param {HTMLElement} containerEl - the .tag-scroll-area element to populate
         * @param {string} group - group name (role, industry, market, level, workMode)
         * @param {object} AREA_PRESETS - the area presets data (from connect-config)
         * @param {object} options - { levelChips?, workModeChips?, marketChips? }
         *   - levelChips: custom level data
         *   - workModeChips: custom work mode data
         *   - marketChips: custom market data
         */
        function hydrateChipsForGroup(containerEl, group, AREA_PRESETS, options) {
            if (!containerEl) {
                return; // Container not found, silently no-op
            }

            options = options || {};
            const levelChips = options.levelChips || LEVEL_CHIPS;
            const workModeChips = options.workModeChips || WORK_MODE_CHIPS;
            const marketChips = options.marketChips || MARKET_CHIPS;

            // Clear existing chips
            containerEl.innerHTML = '';

            if (group === 'level') {
                // Level chips: static, area-agnostic
                Object.entries(levelChips).forEach(([value, label]) => {
                    const chip = buildChipMarkup('level', null, value, label);
                    containerEl.appendChild(chip);
                });
            } else if (group === 'workMode') {
                // Work mode chips: static, area-agnostic
                Object.entries(workModeChips).forEach(([value, label]) => {
                    const chip = buildChipMarkup('workMode', null, value, label);
                    containerEl.appendChild(chip);
                });
            } else if (group === 'market') {
                // Market chips: static, no area attribute
                Object.entries(marketChips).forEach(([value, label]) => {
                    const chip = buildChipMarkup('market', null, value, label);
                    containerEl.appendChild(chip);
                });
            } else if (group === 'role' || group === 'industry') {
                // Role and industry: driven by AREA_PRESETS using area mapping
                // Build area->term mapping using the UI area organization
                const uiAreaToTerms = {};
                
                Object.entries(AREA_TO_PRESETS_MAPPING).forEach(([uiArea, presetKeys]) => {
                    if (!uiAreaToTerms[uiArea]) {
                        uiAreaToTerms[uiArea] = [];
                    }
                    presetKeys.forEach((presetKey) => {
                        const preset = AREA_PRESETS[presetKey];
                        if (preset && preset[group]) {
                            uiAreaToTerms[uiArea] = uiAreaToTerms[uiArea].concat(preset[group]);
                        }
                    });
                });

                // Render chips organized by UI area
                const areaOrder = [
                    'recruiting', 'tech', 'finance', 'real-estate', 'legal',
                    'healthcare', 'education', 'marketing', 'sales', 'design',
                    'creative'
                ];

                const renderedTerms = new Set();

                areaOrder.forEach((uiArea) => {
                    /* istanbul ignore else */
                    if (uiAreaToTerms[uiArea]) {
                        uiAreaToTerms[uiArea].forEach((term) => {
                            // De-duplicate: only render each term once per group
                            if (!renderedTerms.has(term.toLowerCase())) {
                                renderedTerms.add(term.toLowerCase());
                                const label = term.replace(/^"/, '').replace(/"$/, '');
                                const chip = buildChipMarkup(group, uiArea, term, label);
                                containerEl.appendChild(chip);
                            }
                        });
                    }
                });

                // Also add terms from areas not in the standard order (if any)
                /* istanbul ignore next */
                Object.keys(uiAreaToTerms).forEach((uiArea) => {
                    /* istanbul ignore next */
                    if (!areaOrder.includes(uiArea)) {
                        uiAreaToTerms[uiArea].forEach((term) => {
                            if (!renderedTerms.has(term.toLowerCase())) {
                                renderedTerms.add(term.toLowerCase());
                                const label = term.replace(/^"/, '').replace(/"$/, '');
                                const chip = buildChipMarkup(group, uiArea, term, label);
                                containerEl.appendChild(chip);
                            }
                        });
                    }
                });
            }
        }

        /**
         * Hydrate all chip groups in the popup.
         * @param {HTMLElement} rootEl - the root element (document or a container)
         * @param {object} config - { AREA_PRESETS, levelChips?, workModeChips?, marketChips? }
         */
        function hydrateAllChips(rootEl, config) {
            if (!rootEl) return;

            config = config || {};
            const AREA_PRESETS = config.AREA_PRESETS || {};

            const groups = ['role', 'industry', 'market', 'level', 'workMode'];
            groups.forEach((group) => {
                let container = null;

                const tagGroups = Array.from(
                    rootEl.querySelectorAll('.tag-group')
                );
                const groupNames = {
                    role: 'Role',
                    industry: 'Industry',
                    market: 'Market Focus',
                    level: 'Level They Hire',
                    workMode: 'Work Mode'
                };

                const targetLabel = groupNames[group];

                tagGroups.forEach((tagGroup) => {
                    const label = tagGroup.querySelector('.tag-group-label');
                    if (label && label.textContent.trim() === targetLabel) {
                        const scrollArea = tagGroup.querySelector('.tag-scroll-area');
                        if (scrollArea) {
                            container = scrollArea;
                        }
                    }
                });

                if (container) {
                    hydrateChipsForGroup(container, group, AREA_PRESETS, {
                        levelChips: config.levelChips,
                        workModeChips: config.workModeChips,
                        marketChips: config.marketChips
                    });
                }
            });
        }

        return {
            MARKET_CHIPS,
            LEVEL_CHIPS,
            WORK_MODE_CHIPS,
            AREA_TO_PRESETS_MAPPING,
            buildChipMarkup,
            hydrateChipsForGroup,
            hydrateAllChips
        };
    }
);
