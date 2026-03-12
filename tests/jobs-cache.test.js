const {
    CACHE_VERSION,
    encryptJobsProfileCache,
    decryptJobsProfileCache
} = require('../extension/lib/jobs-cache');

describe('jobs profile cache encryption', () => {
    const profile = {
        fullName: 'Lucas Santana',
        email: 'lucas@example.com',
        phone: '+55 11 99999-1111',
        city: 'Sao Paulo',
        headline: 'Product Designer',
        portfolioUrl: 'https://portfolio.example.com'
    };

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

    afterAll(() => {
        delete global.CACHE_VERSION;
        delete global.PROFILE_FIELDS;
        delete global.normalizeStructuredProfile;
        delete global.encryptJobsProfileCache;
        delete global.decryptJobsProfileCache;
        delete global.getJobsProfileCacheStatus;
    });
});
