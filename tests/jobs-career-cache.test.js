const {
    CAREER_INTEL_CACHE_VERSION,
    normalizeCareerIntelState,
    encryptJobsCareerIntelState,
    decryptJobsCareerIntelState,
    getJobsCareerIntelStatus
} = require('../extension/lib/jobs-career-cache');

describe('jobs career intelligence cache', () => {
    const state = {
        importedProfile: {
            headline: 'Senior Full Stack Engineer'
        },
        documents: [{
            id: 'resume-1',
            fileName: 'cv.pdf'
        }],
        analysisSnapshot: {
            inferredRoles: ['full stack engineer'],
            keywordTerms: ['react', 'node.js', 'aws']
        }
    };

    describe('CAREER_INTEL_CACHE_VERSION', () => {
        it('is a positive number', () => {
            expect(typeof CAREER_INTEL_CACHE_VERSION).toBe('number');
            expect(CAREER_INTEL_CACHE_VERSION).toBeGreaterThan(0);
        });
    });

    describe('normalizeCareerIntelState', () => {
        it('normalizes a complete career intel state', () => {
            const result = normalizeCareerIntelState(state);
            expect(result.importedProfile.headline)
                .toBe('Senior Full Stack Engineer');
            expect(result.documents).toHaveLength(1);
            expect(result.documents[0].id).toBe('resume-1');
            expect(result.analysisSnapshot.inferredRoles)
                .toEqual(['full stack engineer']);
        });

        it('returns null importedProfile when source.importedProfile is missing', () => {
            const result = normalizeCareerIntelState({
                documents: [],
                analysisSnapshot: null
            });
            expect(result.importedProfile).toBeNull();
        });

        it('returns null importedProfile when all fields are empty', () => {
            const result = normalizeCareerIntelState({
                importedProfile: {
                    headline: '',
                    about: '',
                    location: '',
                    skills: [],
                    experiences: []
                }
            });
            expect(result.importedProfile).toBeNull();
        });

        it('trims whitespace from importedProfile string fields', () => {
            const result = normalizeCareerIntelState({
                importedProfile: {
                    headline: '  Backend Engineer  ',
                    about: '  Loves distributed systems  ',
                    location: '  São Paulo  '
                }
            });
            expect(result.importedProfile.headline).toBe('Backend Engineer');
            expect(result.importedProfile.about).toBe('Loves distributed systems');
            expect(result.importedProfile.location).toBe('São Paulo');
        });

        it('deduplicates and filters skills array', () => {
            const result = normalizeCareerIntelState({
                importedProfile: {
                    headline: 'Engineer',
                    skills: ['React', '  ', '', 'React', 'Node.js']
                }
            });
            expect(result.importedProfile.skills).toEqual(['React', 'Node.js']);
        });

        it('limits skills to 40 items', () => {
            const skills = Array.from({ length: 50 }, (_, i) => `Skill ${i}`);
            const result = normalizeCareerIntelState({
                importedProfile: { headline: 'Engineer', skills }
            });
            expect(result.importedProfile.skills).toHaveLength(40);
        });

        it('limits experiences to 20 items', () => {
            const experiences = Array.from({ length: 30 }, (_, i) => `Job ${i}`);
            const result = normalizeCareerIntelState({
                importedProfile: { headline: 'Engineer', experiences }
            });
            expect(result.importedProfile.experiences).toHaveLength(20);
        });

        it('filters documents without id or fileName', () => {
            const result = normalizeCareerIntelState({
                documents: [
                    { id: 'doc-1', fileName: 'resume.pdf' },
                    { id: '', fileName: 'invalid.pdf' },
                    { id: 'doc-2', fileName: '' },
                    { fileName: 'no-id.pdf' }
                ]
            });
            expect(result.documents).toHaveLength(1);
            expect(result.documents[0].id).toBe('doc-1');
        });

        it('normalizes document fields', () => {
            const result = normalizeCareerIntelState({
                documents: [{
                    id: '  doc-1  ',
                    fileName: '  resume.pdf  ',
                    extension: 'pdf',
                    sha256: 'abc123',
                    size: 1024,
                    updatedAt: '2026-01-01T00:00:00Z'
                }]
            });
            const doc = result.documents[0];
            expect(doc.id).toBe('doc-1');
            expect(doc.fileName).toBe('resume.pdf');
            expect(doc.extension).toBe('pdf');
            expect(doc.sha256).toBe('abc123');
            expect(doc.size).toBe(1024);
            expect(doc.updatedAt).toBe('2026-01-01T00:00:00Z');
        });

        it('omits optional document fields when empty', () => {
            const result = normalizeCareerIntelState({
                documents: [{
                    id: 'doc-1',
                    fileName: 'resume.pdf',
                    extension: '',
                    sha256: '',
                    size: 0,
                    updatedAt: ''
                }]
            });
            const doc = result.documents[0];
            expect(doc.extension).toBeUndefined();
            expect(doc.sha256).toBeUndefined();
            expect(doc.size).toBeUndefined();
            expect(doc.updatedAt).toBeUndefined();
        });

        it('returns empty documents array when source.documents is not an array', () => {
            const result = normalizeCareerIntelState({ documents: null });
            expect(result.documents).toEqual([]);
        });

        it('normalizes analysisSnapshot fields', () => {
            const result = normalizeCareerIntelState({
                analysisSnapshot: {
                    areaPreset: '  tech-backend  ',
                    seniority: '  senior  ',
                    inferredRoles: ['backend engineer', 'api engineer'],
                    keywordTerms: ['node.js', 'typescript'],
                    locationTerms: ['remote'],
                    workType: '2',
                    experienceLevel: '4'
                }
            });
            const snap = result.analysisSnapshot;
            expect(snap.areaPreset).toBe('tech-backend');
            expect(snap.seniority).toBe('senior');
            expect(snap.inferredRoles).toEqual(['backend engineer', 'api engineer']);
            expect(snap.workType).toBe('2');
            expect(snap.experienceLevel).toBe('4');
        });

        it('limits inferredRoles to 5 items', () => {
            const result = normalizeCareerIntelState({
                analysisSnapshot: {
                    inferredRoles: Array.from({ length: 10 }, (_, i) => `role ${i}`)
                }
            });
            expect(result.analysisSnapshot.inferredRoles).toHaveLength(5);
        });

        it('limits keywordTerms to 12 items', () => {
            const result = normalizeCareerIntelState({
                analysisSnapshot: {
                    keywordTerms: Array.from({ length: 20 }, (_, i) => `kw${i}`)
                }
            });
            expect(result.analysisSnapshot.keywordTerms).toHaveLength(12);
        });

        it('limits locationTerms to 5 items', () => {
            const result = normalizeCareerIntelState({
                analysisSnapshot: {
                    locationTerms: Array.from({ length: 10 }, (_, i) => `city${i}`)
                }
            });
            expect(result.analysisSnapshot.locationTerms).toHaveLength(5);
        });

        it('returns null analysisSnapshot when all fields are empty', () => {
            const result = normalizeCareerIntelState({
                analysisSnapshot: {
                    areaPreset: '',
                    seniority: '',
                    inferredRoles: [],
                    keywordTerms: []
                }
            });
            expect(result.analysisSnapshot).toBeNull();
        });

        it('returns null analysisSnapshot when source.analysisSnapshot is null', () => {
            const result = normalizeCareerIntelState({ analysisSnapshot: null });
            expect(result.analysisSnapshot).toBeNull();
        });

        it('handles null/undefined/primitive input gracefully', () => {
            expect(normalizeCareerIntelState(null)).toEqual({
                importedProfile: null, documents: [], analysisSnapshot: null
            });
            expect(normalizeCareerIntelState(undefined)).toEqual({
                importedProfile: null, documents: [], analysisSnapshot: null
            });
            expect(normalizeCareerIntelState('string')).toEqual({
                importedProfile: null, documents: [], analysisSnapshot: null
            });
        });
    });

    describe('encryption round-trip', () => {
        it('encrypts and decrypts career intelligence state', async () => {
            const envelope = await encryptJobsCareerIntelState(
                state, 'career-passphrase'
            );

            expect(envelope.version).toBe(CAREER_INTEL_CACHE_VERSION);
            expect(typeof envelope.salt).toBe('string');
            expect(typeof envelope.iv).toBe('string');
            expect(typeof envelope.ciphertext).toBe('string');
            expect(typeof envelope.updatedAt).toBe('string');

            const decrypted = await decryptJobsCareerIntelState(
                envelope, 'career-passphrase'
            );
            expect(decrypted).toEqual(state);
        });

        it('fails decrypt with invalid passphrase', async () => {
            const envelope = await encryptJobsCareerIntelState(
                state, 'career-passphrase'
            );
            await expect(
                decryptJobsCareerIntelState(envelope, 'wrong-passphrase')
            ).rejects.toThrow('Invalid career intelligence passphrase');
        });

        it('does not expose plaintext in the envelope', async () => {
            const envelope = await encryptJobsCareerIntelState(
                state, 'career-passphrase'
            );
            const raw = JSON.stringify(envelope);
            expect(raw).not.toContain('Senior Full Stack Engineer');
            expect(raw).not.toContain('resume-1');
        });

        it('rejects short passphrase on encrypt', async () => {
            await expect(
                encryptJobsCareerIntelState(state, 'ab')
            ).rejects.toThrow('at least 4 characters');
        });

        it('rejects short passphrase on decrypt', async () => {
            const envelope = await encryptJobsCareerIntelState(
                state, 'correct-pass'
            );
            await expect(
                decryptJobsCareerIntelState(envelope, 'a')
            ).rejects.toThrow('at least 4 characters');
        });

        it('rejects missing envelope fields', async () => {
            await expect(
                decryptJobsCareerIntelState(null, 'passphrase')
            ).rejects.toThrow('Invalid jobs career intelligence envelope');
            await expect(
                decryptJobsCareerIntelState({}, 'passphrase')
            ).rejects.toThrow('Invalid jobs career intelligence envelope');
            await expect(
                decryptJobsCareerIntelState({ salt: 'x', iv: 'y' }, 'passphrase')
            ).rejects.toThrow('Invalid jobs career intelligence envelope');
        });

        it('encrypts and decrypts null/empty state fields', async () => {
            const sparse = {
                importedProfile: null,
                documents: [],
                analysisSnapshot: null
            };
            const envelope = await encryptJobsCareerIntelState(
                sparse, 'pass1234'
            );
            const decrypted = await decryptJobsCareerIntelState(
                envelope, 'pass1234'
            );
            expect(decrypted).toEqual({
                importedProfile: null,
                documents: [],
                analysisSnapshot: null
            });
        });

        it('encrypts complex state with all optional fields', async () => {
            const full = {
                importedProfile: {
                    headline: 'Cloud Architect',
                    about: 'Loves AWS',
                    location: 'Remote',
                    skills: ['AWS', 'Terraform', 'Kubernetes'],
                    experiences: ['Solutions Architect', 'Cloud Engineer']
                },
                documents: [{
                    id: 'doc-1',
                    fileName: 'resume.pdf',
                    extension: 'pdf',
                    sha256: 'abc123',
                    size: 2048,
                    updatedAt: '2026-01-01T00:00:00Z'
                }],
                analysisSnapshot: {
                    areaPreset: 'tech-cloud',
                    seniority: 'senior',
                    inferredRoles: ['cloud architect'],
                    keywordTerms: ['aws', 'terraform'],
                    locationTerms: ['remote'],
                    workType: '2',
                    experienceLevel: '4'
                }
            };
            const envelope = await encryptJobsCareerIntelState(full, 'pass1234');
            const decrypted = await decryptJobsCareerIntelState(
                envelope, 'pass1234'
            );
            expect(decrypted.importedProfile.headline).toBe('Cloud Architect');
            expect(decrypted.analysisSnapshot.areaPreset).toBe('tech-cloud');
            expect(decrypted.documents[0].fileName).toBe('resume.pdf');
        });
    });

    describe('getJobsCareerIntelStatus', () => {
        it('returns not-exists for null/undefined/empty', () => {
            [null, undefined, {}, { salt: 'x', iv: 'y' }].forEach(input => {
                const status = getJobsCareerIntelStatus(input);
                expect(status.exists).toBe(false);
                expect(status.locked).toBe(false);
                expect(status.version).toBeNull();
                expect(status.updatedAt).toBeNull();
            });
        });

        it('returns exists/locked for valid encrypted envelope', async () => {
            const envelope = await encryptJobsCareerIntelState(
                state, 'career-passphrase'
            );
            const status = getJobsCareerIntelStatus(envelope);
            expect(status.exists).toBe(true);
            expect(status.locked).toBe(true);
            expect(status.version).toBe(CAREER_INTEL_CACHE_VERSION);
            expect(new Date(status.updatedAt).getTime()).not.toBeNaN();
        });

        it('falls back to CAREER_INTEL_CACHE_VERSION when version is missing', async () => {
            const envelope = await encryptJobsCareerIntelState(
                state, 'career-passphrase'
            );
            delete envelope.version;
            const status = getJobsCareerIntelStatus(envelope);
            expect(status.version).toBe(CAREER_INTEL_CACHE_VERSION);
        });

        it('returns null updatedAt when missing from envelope', async () => {
            const envelope = await encryptJobsCareerIntelState(
                state, 'career-passphrase'
            );
            delete envelope.updatedAt;
            const status = getJobsCareerIntelStatus(envelope);
            expect(status.updatedAt).toBeNull();
        });
    });
});
