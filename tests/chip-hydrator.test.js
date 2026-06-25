/**
 * @jest-environment jsdom
 */

const {
    MARKET_CHIPS,
    LEVEL_CHIPS,
    WORK_MODE_CHIPS,
    buildChipMarkup,
    hydrateChipsForGroup,
    hydrateAllChips
} = require('../extension/lib/chip-hydrator');

const { AREA_PRESETS } = require('../extension/lib/connect-config');

describe('chip-hydrator', () => {
    describe('buildChipMarkup', () => {
        it('builds a chip with required attrs', () => {
            const chip = buildChipMarkup('role', 'tech', 'software engineer', 'Software Engineer');
            expect(chip.tagName).toBe('SPAN');
            expect(chip.className).toBe('tag');
            expect(chip.getAttribute('data-group')).toBe('role');
            expect(chip.getAttribute('data-area')).toBe('tech');
            expect(chip.getAttribute('data-value')).toBe('software engineer');
            expect(chip.textContent).toBe('Software Engineer');
        });

        it('builds a chip without data-area when area is null', () => {
            const chip = buildChipMarkup('level', null, 'senior', 'Senior');
            expect(chip.getAttribute('data-group')).toBe('level');
            expect(chip.getAttribute('data-area')).toBeNull();
            expect(chip.getAttribute('data-value')).toBe('senior');
            expect(chip.textContent).toBe('Senior');
        });

        it('builds a chip with undefined area (same as null)', () => {
            const chip = buildChipMarkup('workMode', undefined, 'remote', 'Remote');
            expect(chip.getAttribute('data-area')).toBeNull();
        });
    });

    describe('hydrateChipsForGroup', () => {
        let container;

        beforeEach(() => {
            container = document.createElement('div');
            container.className = 'tag-scroll-area';
        });

        it('populates level chips', () => {
            hydrateChipsForGroup(container, 'level', AREA_PRESETS);
            const chips = container.querySelectorAll('.tag');
            expect(chips.length).toBe(Object.keys(LEVEL_CHIPS).length);
            // Verify standard attrs
            chips.forEach((chip) => {
                expect(chip.getAttribute('data-group')).toBe('level');
                expect(chip.getAttribute('data-area')).toBeNull();
                expect(chip.getAttribute('data-value')).toBeTruthy();
            });
        });

        it('populates work mode chips', () => {
            hydrateChipsForGroup(container, 'workMode', AREA_PRESETS);
            const chips = container.querySelectorAll('.tag');
            expect(chips.length).toBe(Object.keys(WORK_MODE_CHIPS).length);
            chips.forEach((chip) => {
                expect(chip.getAttribute('data-group')).toBe('workMode');
                expect(chip.getAttribute('data-area')).toBeNull();
            });
        });

        it('populates market chips', () => {
            hydrateChipsForGroup(container, 'market', AREA_PRESETS);
            const chips = container.querySelectorAll('.tag');
            expect(chips.length).toBe(Object.keys(MARKET_CHIPS).length);
            chips.forEach((chip) => {
                expect(chip.getAttribute('data-group')).toBe('market');
                expect(chip.getAttribute('data-area')).toBeNull();
            });
        });

        it('populates role chips from AREA_PRESETS', () => {
            hydrateChipsForGroup(container, 'role', AREA_PRESETS);
            const chips = container.querySelectorAll('.tag');
            expect(chips.length).toBeGreaterThan(0);
            // Verify attrs structure
            chips.forEach((chip) => {
                expect(chip.getAttribute('data-group')).toBe('role');
                expect(chip.getAttribute('data-area')).toBeTruthy();
                expect(chip.getAttribute('data-value')).toBeTruthy();
            });
        });

        it('populates industry chips from AREA_PRESETS', () => {
            hydrateChipsForGroup(container, 'industry', AREA_PRESETS);
            const chips = container.querySelectorAll('.tag');
            expect(chips.length).toBeGreaterThan(0);
            chips.forEach((chip) => {
                expect(chip.getAttribute('data-group')).toBe('industry');
                expect(chip.getAttribute('data-area')).toBeTruthy();
            });
        });

        it('clears existing chips before populating', () => {
            const oldChip = document.createElement('span');
            oldChip.className = 'tag';
            oldChip.textContent = 'Old';
            container.appendChild(oldChip);

            expect(container.querySelectorAll('.tag').length).toBe(1);
            hydrateChipsForGroup(container, 'level', AREA_PRESETS);
            expect(container.querySelector('.tag[data-group="level"]')).toBeTruthy();
            expect(container.textContent).not.toContain('Old');
        });

        it('handles missing container gracefully', () => {
            // Should not throw
            expect(() => {
                hydrateChipsForGroup(null, 'level', AREA_PRESETS);
            }).not.toThrow();
        });

        it('handles empty AREA_PRESETS gracefully', () => {
            hydrateChipsForGroup(container, 'role', {});
            expect(container.querySelectorAll('.tag').length).toBe(0);
        });

        it('does nothing for unknown group type (else-if FALSE arm)', () => {
            hydrateChipsForGroup(container, 'unknown', AREA_PRESETS);
            expect(container.querySelectorAll('.tag').length).toBe(0);
        });

        it('accepts custom level chips', () => {
            const customLevels = {
                entry: 'Entry Level',
                expert: 'Expert'
            };
            hydrateChipsForGroup(container, 'level', AREA_PRESETS, {
                levelChips: customLevels
            });
            const chips = container.querySelectorAll('.tag');
            expect(chips.length).toBe(2);
            expect(chips[0].getAttribute('data-value')).toBe('entry');
            expect(chips[1].getAttribute('data-value')).toBe('expert');
        });

        it('accepts custom market chips', () => {
            const customMarkets = {
                'us-only': 'US Only'
            };
            hydrateChipsForGroup(container, 'market', AREA_PRESETS, {
                marketChips: customMarkets
            });
            const chips = container.querySelectorAll('.tag');
            expect(chips.length).toBe(1);
            expect(chips[0].getAttribute('data-value')).toBe('us-only');
        });
    });

    describe('hydrateAllChips', () => {
        let root;

        beforeEach(() => {
            // Create a minimal DOM structure matching popup.html
            root = document.createElement('div');
            root.innerHTML = `
                <div class="tag-group">
                    <div class="tag-group-label">Role</div>
                    <div class="tag-scroll-area"></div>
                </div>
                <div class="tag-group">
                    <div class="tag-group-label">Industry</div>
                    <div class="tag-scroll-area"></div>
                </div>
                <div class="tag-group">
                    <div class="tag-group-label">Market Focus</div>
                    <div class="tag-scroll-area"></div>
                </div>
                <div class="tag-group">
                    <div class="tag-group-label">Level They Hire</div>
                    <div class="tag-scroll-area"></div>
                </div>
                <div class="tag-group">
                    <div class="tag-group-label">Work Mode</div>
                    <div class="tag-scroll-area"></div>
                </div>
            `;
        });

        it('hydrates all 5 groups', () => {
            hydrateAllChips(root, { AREA_PRESETS });
            const roleChips = root.querySelectorAll('.tag[data-group="role"]');
            const industryChips = root.querySelectorAll('.tag[data-group="industry"]');
            const marketChips = root.querySelectorAll('.tag[data-group="market"]');
            const levelChips = root.querySelectorAll('.tag[data-group="level"]');
            const workModeChips = root.querySelectorAll('.tag[data-group="workMode"]');

            expect(roleChips.length).toBeGreaterThan(0);
            expect(industryChips.length).toBeGreaterThan(0);
            expect(marketChips.length).toBe(Object.keys(MARKET_CHIPS).length);
            expect(levelChips.length).toBe(Object.keys(LEVEL_CHIPS).length);
            expect(workModeChips.length).toBe(Object.keys(WORK_MODE_CHIPS).length);
        });

        it('preserves class and attrs on generated chips', () => {
            hydrateAllChips(root, { AREA_PRESETS });
            const allChips = root.querySelectorAll('.tag');
            allChips.forEach((chip) => {
                expect(chip.className).toBe('tag');
                expect(chip.getAttribute('data-group')).toBeTruthy();
                expect(chip.getAttribute('data-value')).toBeTruthy();
                expect(chip.textContent).toBeTruthy();
            });
        });

        it('handles missing root gracefully', () => {
            expect(() => {
                hydrateAllChips(null, { AREA_PRESETS });
            }).not.toThrow();
        });

        it('handles missing containers without throwing', () => {
            const minimalRoot = document.createElement('div');
            // No tag-group divs
            expect(() => {
                hydrateAllChips(minimalRoot, { AREA_PRESETS });
            }).not.toThrow();
        });

        it('handles omitted config argument (L200/L201 || {} arms)', () => {
            expect(() => { hydrateAllChips(root); }).not.toThrow();
            expect(root.querySelectorAll('.tag[data-group="role"]').length).toBe(0);
        });

        it('skips tag-group with label but no scroll-area (L224 false arm)', () => {
            const noScrollRoot = document.createElement('div');
            noScrollRoot.innerHTML = '<div class="tag-group"><div class="tag-group-label">Role</div></div>';
            expect(() => { hydrateAllChips(noScrollRoot, { AREA_PRESETS }); }).not.toThrow();
            expect(noScrollRoot.querySelectorAll('.tag').length).toBe(0);
        });

        it('accepts custom chip data', () => {
            const customLevels = { expert: 'Expert', novice: 'Novice' };
            const customMarkets = { 'custom-market': 'Custom Market' };
            const customModes = { flexible: 'Flexible' };

            hydrateAllChips(root, {
                AREA_PRESETS,
                levelChips: customLevels,
                marketChips: customMarkets,
                workModeChips: customModes
            });

            const levelChips = root.querySelectorAll('.tag[data-group="level"]');
            const marketChips = root.querySelectorAll('.tag[data-group="market"]');
            const workModeChips = root.querySelectorAll('.tag[data-group="workMode"]');

            expect(levelChips.length).toBe(2);
            expect(marketChips.length).toBe(1);
            expect(workModeChips.length).toBe(1);
        });
    });

    describe('frozen public API', () => {
        it('exports all required symbols', () => {
            const hydrator = require('../extension/lib/chip-hydrator');
            expect(hydrator.MARKET_CHIPS).toBeDefined();
            expect(hydrator.LEVEL_CHIPS).toBeDefined();
            expect(hydrator.WORK_MODE_CHIPS).toBeDefined();
            expect(typeof hydrator.buildChipMarkup).toBe('function');
            expect(typeof hydrator.hydrateChipsForGroup).toBe('function');
            expect(typeof hydrator.hydrateAllChips).toBe('function');
        });

        it('data structures are not empty', () => {
            expect(Object.keys(MARKET_CHIPS).length).toBe(7);
            expect(Object.keys(LEVEL_CHIPS).length).toBe(7);
            expect(Object.keys(WORK_MODE_CHIPS).length).toBe(3);
        });
    });
});
