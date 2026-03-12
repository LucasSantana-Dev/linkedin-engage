(function(root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.LinkedInJobsCache = api;
    Object.keys(api).forEach(function(key) {
        if (typeof root[key] === 'undefined') {
            root[key] = api[key];
        }
    });
})(
    typeof globalThis !== 'undefined' ? globalThis : this,
    function() {
        const CACHE_VERSION = 1;
        const PBKDF2_ITERATIONS = 150000;
        const PBKDF2_HASH = 'SHA-256';
        const ENCRYPTION_ALGO = 'AES-GCM';
        const SALT_BYTES = 16;
        const IV_BYTES = 12;
        const PROFILE_FIELDS = Object.freeze([
            'fullName',
            'email',
            'phone',
            'headline',
            'location',
            'city',
            'country',
            'portfolioUrl',
            'website',
            'linkedinUrl',
            'resumeSummary',
            'yearsExperience',
            'currentTitle',
            'skills'
        ]);

        function getCryptoApi() {
            if (typeof globalThis !== 'undefined' &&
                globalThis.crypto?.subtle) {
                return globalThis.crypto;
            }
            if (typeof require === 'function') {
                try {
                    const nodeCrypto = require('crypto');
                    if (nodeCrypto.webcrypto?.subtle) {
                        return nodeCrypto.webcrypto;
                    }
                } catch (err) {}
            }
            throw new Error('Web Crypto API unavailable');
        }

        function toBase64(buffer) {
            if (typeof Buffer !== 'undefined') {
                return Buffer.from(buffer).toString('base64');
            }
            const bytes = new Uint8Array(buffer);
            let binary = '';
            for (const b of bytes) binary += String.fromCharCode(b);
            return btoa(binary);
        }

        function fromBase64(input) {
            if (typeof Buffer !== 'undefined') {
                return Uint8Array.from(
                    Buffer.from(String(input || ''), 'base64')
                );
            }
            const binary = atob(String(input || ''));
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            return bytes;
        }

        function toIsoDate(value) {
            const date = value ? new Date(value) : new Date();
            if (Number.isNaN(date.getTime())) {
                return new Date().toISOString();
            }
            return date.toISOString();
        }

        function sanitizeString(value) {
            return String(value == null ? '' : value)
                .replace(/\s+/g, ' ')
                .trim();
        }

        function normalizeStructuredProfile(profile) {
            const source = profile && typeof profile === 'object'
                ? profile
                : {};
            const next = {};

            for (const key of PROFILE_FIELDS) {
                const value = source[key];
                if (value == null) continue;
                if (Array.isArray(value)) {
                    const list = value
                        .map(item => sanitizeString(item))
                        .filter(Boolean)
                        .slice(0, 50);
                    if (list.length > 0) next[key] = list;
                    continue;
                }
                const normalized = sanitizeString(value);
                if (normalized) next[key] = normalized;
            }

            return next;
        }

        function assertPassphrase(passphrase) {
            const clean = String(passphrase || '').trim();
            if (clean.length < 4) {
                throw new Error(
                    'Profile passphrase must have at least 4 characters'
                );
            }
            return clean;
        }

        async function deriveKey(passphrase, salt) {
            const cryptoApi = getCryptoApi();
            const encoder = new TextEncoder();
            const baseKey = await cryptoApi.subtle.importKey(
                'raw',
                encoder.encode(passphrase),
                'PBKDF2',
                false,
                ['deriveKey']
            );
            return cryptoApi.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt,
                    iterations: PBKDF2_ITERATIONS,
                    hash: PBKDF2_HASH
                },
                baseKey,
                { name: ENCRYPTION_ALGO, length: 256 },
                false,
                ['encrypt', 'decrypt']
            );
        }

        function assertEnvelope(envelope) {
            const source = envelope && typeof envelope === 'object'
                ? envelope
                : null;
            if (!source ||
                !source.salt ||
                !source.iv ||
                !source.ciphertext) {
                throw new Error(
                    'Invalid jobs profile cache envelope'
                );
            }
        }

        async function encryptJobsProfileCache(profile, passphrase) {
            const cleanPassphrase = assertPassphrase(passphrase);
            const cryptoApi = getCryptoApi();
            const encoder = new TextEncoder();
            const payload = normalizeStructuredProfile(profile);
            const salt = cryptoApi.getRandomValues(
                new Uint8Array(SALT_BYTES)
            );
            const iv = cryptoApi.getRandomValues(
                new Uint8Array(IV_BYTES)
            );
            const key = await deriveKey(cleanPassphrase, salt);
            const ciphertext = await cryptoApi.subtle.encrypt(
                { name: ENCRYPTION_ALGO, iv },
                key,
                encoder.encode(JSON.stringify(payload))
            );
            return {
                version: CACHE_VERSION,
                salt: toBase64(salt),
                iv: toBase64(iv),
                ciphertext: toBase64(ciphertext),
                updatedAt: new Date().toISOString()
            };
        }

        async function decryptJobsProfileCache(envelope, passphrase) {
            assertEnvelope(envelope);
            const cleanPassphrase = assertPassphrase(passphrase);
            const cryptoApi = getCryptoApi();
            const decoder = new TextDecoder();
            const salt = fromBase64(envelope.salt);
            const iv = fromBase64(envelope.iv);
            const ciphertext = fromBase64(envelope.ciphertext);
            const key = await deriveKey(cleanPassphrase, salt);

            let plain;
            try {
                plain = await cryptoApi.subtle.decrypt(
                    { name: ENCRYPTION_ALGO, iv },
                    key,
                    ciphertext
                );
            } catch (err) {
                throw new Error('Invalid profile cache passphrase');
            }

            let parsed;
            try {
                parsed = JSON.parse(decoder.decode(plain));
            } catch (err) {
                throw new Error('Invalid jobs profile cache payload');
            }
            return normalizeStructuredProfile(parsed);
        }

        function getJobsProfileCacheStatus(envelope) {
            const source = envelope && typeof envelope === 'object'
                ? envelope
                : null;
            if (!source ||
                !source.salt ||
                !source.iv ||
                !source.ciphertext) {
                return {
                    exists: false,
                    locked: false,
                    version: null,
                    updatedAt: null
                };
            }
            return {
                exists: true,
                locked: true,
                version: Number(source.version) || CACHE_VERSION,
                updatedAt: toIsoDate(source.updatedAt)
            };
        }

        return {
            CACHE_VERSION,
            PROFILE_FIELDS,
            normalizeStructuredProfile,
            encryptJobsProfileCache,
            decryptJobsProfileCache,
            getJobsProfileCacheStatus
        };
    }
);
