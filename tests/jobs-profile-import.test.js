/**
 * @jest-environment jsdom
 */

const {
    extractLinkedInProfileForJobs
} = require('../extension/lib/jobs-profile-import');

describe('jobs profile import', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('extracts and deduplicates profile fields from linkedin profile markup', () => {
        document.body.innerHTML = `
            <section>
                <div class="text-body-medium break-words">
                    Senior Full Stack Engineer
                </div>
                <div id="about"></div>
                <div>
                    <div class="display-flex">
                        <div class="full-width">
                            Building distributed products for global teams.
                        </div>
                    </div>
                </div>
                <div class="text-body-small inline t-black--light break-words">
                    São Paulo, Brazil
                </div>
                <div id="skills"></div>
                <div>
                    <span aria-hidden="true">React</span>
                    <span aria-hidden="true">Node.js</span>
                    <span aria-hidden="true">React</span>
                </div>
                <div id="experience"></div>
                <div>
                    <span aria-hidden="true">Senior Full Stack Engineer</span>
                    <span aria-hidden="true">Lucas Corp</span>
                    <span aria-hidden="true">Senior Full Stack Engineer</span>
                </div>
            </section>
        `;

        expect(extractLinkedInProfileForJobs(document)).toEqual({
            headline: 'Senior Full Stack Engineer',
            about: 'Building distributed products for global teams.',
            location: 'São Paulo, Brazil',
            skills: ['React', 'Node.js'],
            experiences: ['Senior Full Stack Engineer', 'Lucas Corp']
        });
    });

    it('uses the provided root and returns empty strings/lists when fields are absent', () => {
        const root = document.createElement('div');
        root.innerHTML = `
            <div data-generated-suggestion-target>
                <span>Focusing on backend systems</span>
            </div>
            <div data-view-name="profile-component-entity">
                <span aria-hidden="true">Backend Engineer</span>
            </div>
        `;

        expect(extractLinkedInProfileForJobs(root)).toEqual({
            headline: '',
            about: 'Focusing on backend systems',
            location: '',
            skills: [],
            experiences: ['Backend Engineer']
        });
    });

    it('returns all empty fields for a completely blank root', () => {
        const root = document.createElement('div');
        const result = extractLinkedInProfileForJobs(root);

        expect(result).toEqual({
            headline: '',
            about: '',
            location: '',
            skills: [],
            experiences: []
        });
    });

    it('falls back to document when no root is provided', () => {
        document.body.innerHTML = `
            <div class="pv-text-details__left-panel">
                <div class="text-body-medium">Product Manager</div>
                <div class="text-body-small">New York, NY</div>
            </div>
        `;

        const result = extractLinkedInProfileForJobs(null);
        expect(result.headline).toBe('Product Manager');
        expect(result.location).toBe('New York, NY');
    });

    it('normalizes whitespace in extracted text', () => {
        const root = document.createElement('div');
        root.innerHTML = `
            <div class="text-body-medium break-words">
                Senior   Full   Stack
                     Engineer
            </div>
        `;

        const result = extractLinkedInProfileForJobs(root);
        expect(result.headline).toBe('Senior Full Stack Engineer');
    });

    it('respects the limit for skills and experiences', () => {
        const root = document.createElement('div');
        const spans = Array.from({ length: 25 }, (_, i) =>
            `<span aria-hidden="true">Skill ${i + 1}</span>`
        ).join('');
        root.innerHTML = `
            <div id="skills"></div>
            <div>${spans}</div>
        `;

        const result = extractLinkedInProfileForJobs(root);
        expect(result.skills).toHaveLength(20);
        expect(result.skills[0]).toBe('Skill 1');
        expect(result.skills[19]).toBe('Skill 20');
    });

    it('deduplicates skills case-insensitively', () => {
        const root = document.createElement('div');
        root.innerHTML = `
            <div data-field="skill_assessment">
                <span aria-hidden="true">React</span>
                <span aria-hidden="true">react</span>
                <span aria-hidden="true">REACT</span>
                <span aria-hidden="true">Node.js</span>
            </div>
        `;

        const result = extractLinkedInProfileForJobs(root);
        expect(result.skills).toEqual(['React', 'Node.js']);
    });

    it('does not overwrite already-defined globals on re-require (L8 arm=1)', () => {
        const saved = globalThis.extractLinkedInProfileForJobs;
        globalThis.extractLinkedInProfileForJobs = 'already-set';
        jest.resetModules();
        require('../extension/lib/jobs-profile-import');
        expect(globalThis.extractLinkedInProfileForJobs).toBe('already-set');
        globalThis.extractLinkedInProfileForJobs = saved;
        jest.resetModules();
    });

    it('skips empty or whitespace-only text nodes', () => {
        const root = document.createElement('div');
        root.innerHTML = `
            <div id="skills"></div>
            <div>
                <span aria-hidden="true">   </span>
                <span aria-hidden="true">TypeScript</span>
                <span aria-hidden="true"></span>
                <span aria-hidden="true">Python</span>
            </div>
        `;

        const result = extractLinkedInProfileForJobs(root);
        expect(result.skills).toEqual(['TypeScript', 'Python']);
    });
});
