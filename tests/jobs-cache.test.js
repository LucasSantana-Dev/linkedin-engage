const {
    CACHE_VERSION,
    PROFILE_FIELDS,
    normalizeStructuredProfile,
    encryptJobsProfileCache,
    decryptJobsProfileCache,
    getJobsProfileCacheStatus
} = require('../extension/lib/jobs-cache');

describe('jobs profile cache', () => {
    const profile = {
        fullName: 'Lucas Santana',
        email: 'lucas@example.com',
        phone: '+55 11 99999-1111',
        city: 'Sao Paulo',
        headline: 'Product Designer',
        portfolioUrl: 'https://portfolio.example.com'
    };

    describe('normalizeStructuredProfile', () => {
        it('normalizes string fields and strips whitespace', () => {
            const result = normalizeStructuredProfile({
                fullName: '  Lucas  Santana  ',
                headline: 'Engineer',
                city: '  São Paulo  '
            });

            expect(result.fullName).toBe('Lucas Santana');
            expect(result.headline).toBe('Engineer');
            expect(result.city).toBe('São Paulo');
        });

        it('normalizes array fields and removes empty entries', () => {
            const result = normalizeStructuredProfile({
                skills: ['React', '  ', '', 'Node.js', null, undefined]
            });

            expect(result.skills).toEqual(['React', 'Node.js']);
        });

        it('truncates arrays to 50 items', () => {
            const skills = Array.from({ length: 60 }, (_, i) => `Skill ${i}`);
            const result = normalizeStructuredProfile({ skills });
            expect(result.skills).toHaveLength(50);
        });

        it('omits null/undefined values', () => {
            const result = normalizeStructuredProfile({
                fullName: null,
                email: undefined,
                headline: 'Engineer'
            });

            expect(result.fullName).toBeUndefined();
            expect(result.email).toBeUndefined();
            expect(result.headline).toBe('Engineer');
        });

        it('omits empty string values after sanitization', () => {
            const result = normalizeStructuredProfile({
                fullName: '   ',
                headline: ''
            });

            expect(result.fullName).toBeUndefined();
            expect(result.headline).toBeUndefined();
        });

        it('omits empty arrays after filtering', () => {
            const result = normalizeStructuredProfile({
                skills: ['  ', '', null]
            });

            expect(result.skills).toBeUndefined();
        });

        it('ignores unknown keys not in PROFILE_FIELDS', () => {
            const result = normalizeStructuredProfile({
                fullName: 'Test',
                unknownField: 'should be ignored'
            });

            expect(result.fullName).toBe('Test');
            expect(result.unknownField).toBeUndefined();
        });

        it('returns empty object for null/invalid input', () => {
            expect(normalizeStructuredProfile(null)).toEqual({});
            expect(normalizeStructuredProfile(undefined)).toEqual({});
            expect(normalizeStructuredProfile('string')).toEqual({});
            expect(normalizeStructuredProfile(42)).toEqual({});
        });
    });

    describe('encryption', () => {
        it('encrypts and decrypts structured profile payload', async () => {
            const envelope = await encryptJobsProfileCache(
                profile,
                'strong-passphrase'
            );

            expect(envelope.version).toBe(CACHE_VERSION);
            expect(typeof envelope.salt).toBe('string');
            expect(typeof envelope.iv).toBe('string');
            expect(typeof envelope.ciphertext).toBe('string');
            expect(typeof envelope.updatedAt).toBe('string');

            const decrypted = await decryptJobsProfileCache(
                envelope,
                'strong-passphrase'
            );
            expect(decrypted).toEqual(profile);
        });

        it('fails decrypt with wrong passphrase', async () => {
            const envelope = await encryptJobsProfileCache(
                profile,
                'correct-passphrase'
            );

            await expect(
                decryptJobsProfileCache(
                    envelope,
                    'wrong-passphrase'
                )
            ).rejects.toThrow('Invalid profile cache passphrase');
        });

        it('rejects invalid cache envelope', async () => {
            await expect(
                decryptJobsProfileCache(
                    { version: CACHE_VERSION, salt: 'abc' },
                    'passphrase'
                )
            ).rejects.toThrow('Invalid jobs profile cache envelope');
        });

        it('rejects null/empty envelope', async () => {
            await expect(
                decryptJobsProfileCache(null, 'passphrase')
            ).rejects.toThrow('Invalid jobs profile cache envelope');

            await expect(
                decryptJobsProfileCache({}, 'passphrase')
            ).rejects.toThrow('Invalid jobs profile cache envelope');
        });

        it('rejects short passphrase on encrypt', async () => {
            await expect(
                encryptJobsProfileCache(profile, 'ab')
            ).rejects.toThrow('at least 4 characters');
        });

        it('rejects short passphrase on decrypt', async () => {
            const envelope = await encryptJobsProfileCache(
                profile,
                'strong-passphrase'
            );

            await expect(
                decryptJobsProfileCache(envelope, '   ')
            ).rejects.toThrow('at least 4 characters');
        });

        it('does not expose plaintext in encrypted envelope', async () => {
            const envelope = await encryptJobsProfileCache(
                profile,
                'strong-passphrase'
            );
            const raw = JSON.stringify(envelope);
            expect(raw).not.toContain('Lucas Santana');
            expect(raw).not.toContain('lucas@example.com');
            expect(raw).not.toContain('Product Designer');
        });
    });

    describe('getJobsProfileCacheStatus', () => {
        it('returns not-exists for null/undefined envelope', () => {
            expect(getJobsProfileCacheStatus(null)).toEqual({
                exists: false,
                locked: false,
                version: null,
                updatedAt: null
            });

            expect(getJobsProfileCacheStatus(undefined)).toEqual({
                exists: false,
                locked: false,
                version: null,
                updatedAt: null
            });
        });

        it('returns not-exists for incomplete envelope', () => {
            expect(getJobsProfileCacheStatus({ salt: 'abc' })).toEqual({
                exists: false,
                locked: false,
                version: null,
                updatedAt: null
            });
        });

        it('returns exists/locked for valid envelope', async () => {
            const envelope = await encryptJobsProfileCache(
                profile,
                'strong-passphrase'
            );

            const status = getJobsProfileCacheStatus(envelope);
            expect(status.exists).toBe(true);
            expect(status.locked).toBe(true);
            expect(status.version).toBe(CACHE_VERSION);
            expect(new Date(status.updatedAt).getTime()).not.toBeNaN();
        });

        it('falls back to CACHE_VERSION when version is missing', async () => {
            const envelope = await encryptJobsProfileCache(
                profile,
                'strong-passphrase'
            );
            delete envelope.version;

            const status = getJobsProfileCacheStatus(envelope);
            expect(status.version).toBe(CACHE_VERSION);
        });
    });

    describe('constants', () => {
        it('exports expected PROFILE_FIELDS', () => {
            expect(PROFILE_FIELDS).toContain('fullName');
            expect(PROFILE_FIELDS).toContain('email');
            expect(PROFILE_FIELDS).toContain('skills');
            expect(Object.isFrozen(PROFILE_FIELDS)).toBe(true);
        });
    });

    describe('browser base64 paths (no Buffer)', () => {
        let savedBuffer;

        beforeEach(() => {
            savedBuffer = global.Buffer;
            // Save Buffer reference before deleting so btoa/atob closures can use it
            const NodeBuffer = global.Buffer;
            delete global.Buffer;
            // Provide browser-like btoa/atob in Node
            global.btoa = (str) => NodeBuffer.from(str, 'binary').toString('base64');
            global.atob = (b64) => NodeBuffer.from(b64, 'base64').toString('binary');
        });

        afterEach(() => {
            global.Buffer = savedBuffer;
            delete global.btoa;
            delete global.atob;
        });

        it('encrypts and decrypts via browser btoa/atob path', async () => {
            const result = await encryptJobsProfileCache(profile, 'browser-pass');
            expect(typeof result.ciphertext).toBe('string');
            const decrypted = await decryptJobsProfileCache(result, 'browser-pass');
            expect(decrypted.fullName).toBe('Lucas Santana');
        });
    });

    describe('toIsoDate NaN fallback', () => {
        it('getJobsProfileCacheStatus returns a valid ISO date for invalid updatedAt', async () => {
            const envelope = await encryptJobsProfileCache(profile, 'pass');
            envelope.updatedAt = 'not-a-date';
            const status = getJobsProfileCacheStatus(envelope);
            expect(status.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        });
    });

    describe('decryptJobsProfileCache JSON.parse error', () => {
        it('throws Invalid jobs profile cache payload for corrupted plaintext', async () => {
            const envelope = await encryptJobsProfileCache(profile, 'pass');
            // Corrupt the ciphertext so decryption succeeds but JSON.parse fails
            // We do this by encrypting garbage JSON with the same passphrase
            const badProfile = { fullName: '\x00\x01\x02' };
            // Encrypt a non-JSON string by patching the module indirectly:
            // Instead, encrypt valid data then manually corrupt the parsed result
            // by replacing ciphertext with one that decrypts to invalid JSON.
            // Easiest: encrypt a string that is not valid JSON via a second encrypt call
            // using a known-bad payload approach — we test the error path by
            // providing a ciphertext that decrypts to non-JSON bytes.
            // Since we can't easily do that without internals, we verify the error
            // message by catching a wrong-passphrase error first, then test
            // that a structurally valid envelope with wrong passphrase throws the
            // passphrase error (not the JSON error). The JSON error path is
            // exercised when decryption succeeds but the result is not valid JSON.
            // We simulate this by encrypting a raw non-JSON string using the
            // Web Crypto API directly.
            const cryptoApi = require('crypto').webcrypto;
            const encoder = new TextEncoder();
            const salt = cryptoApi.getRandomValues(new Uint8Array(16));
            const iv = cryptoApi.getRandomValues(new Uint8Array(12));
            const keyMaterial = await cryptoApi.subtle.importKey(
                'raw', encoder.encode('pass'), { name: 'PBKDF2' }, false,
                ['deriveKey']
            );
            const key = await cryptoApi.subtle.deriveKey(
                { name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' },
                keyMaterial,
                { name: 'AES-GCM', length: 256 },
                false,
                ['encrypt', 'decrypt']
            );
            const ciphertext = await cryptoApi.subtle.encrypt(
                { name: 'AES-GCM', iv },
                key,
                encoder.encode('not valid json {{{{')
            );
            const toB64 = (buf) => Buffer.from(buf).toString('base64');
            const corruptEnvelope = {
                salt: toB64(salt),
                iv: toB64(iv),
                ciphertext: toB64(ciphertext),
                version: CACHE_VERSION
            };
            await expect(decryptJobsProfileCache(corruptEnvelope, 'pass'))
                .rejects.toThrow('Invalid jobs profile cache payload');
        });
    });

    afterAll(() => {
        delete global.CACHE_VERSION;
        delete global.PROFILE_FIELDS;
        delete global.normalizeStructuredProfile;
        delete global.encryptJobsProfileCache;
        delete global.decryptJobsProfileCache;
        delete global.getJobsProfileCacheStatus;
    });
});
