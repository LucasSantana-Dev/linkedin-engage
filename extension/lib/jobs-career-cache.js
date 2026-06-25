(function(root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.LinkedInJobsCareerCache = api;
    Object.keys(api).forEach(function(key) {
        if (typeof root[key] === 'undefined') {
            root[key] = api[key];
        }
    });
})(
    typeof globalThis !== 'undefined' ? globalThis : this,
    function() {
        const CAREER_INTEL_CACHE_VERSION = 1;
        const PBKDF2_ITERATIONS = 150000;
        const PBKDF2_HASH = 'SHA-256';
        const ENCRYPTION_ALGO = 'AES-GCM';
        const SALT_BYTES = 16;
        const IV_BYTES = 12;

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
            for (const byte of bytes) binary += String.fromCharCode(byte);
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

        function sanitizeString(value) {
            return String(value == null ? '' : value)
                .replace(/\s+/g, ' ')
                .trim();
        }

        function normalizeArray(values, limit) {
            if (!Array.isArray(values)) return [];
            const out = [];
            const seen = new Set();
            values.forEach(item => {
                const value = sanitizeString(item);
                const key = value.toLowerCase();
                if (!value || seen.has(key)) return;
                seen.add(key);
                out.push(value);
            });
            return typeof limit === 'number'
                ? out.slice(0, limit)
                : out;
        }

        function normalizeCareerIntelState(state) {
            const source = state && typeof state === 'object'
                ? state
                : {};
            let importedProfile = null;
            if (source.importedProfile &&
                typeof source.importedProfile === 'object') {
                const nextProfile = {};
                const headline = sanitizeString(
                    source.importedProfile.headline
                );
                const about = sanitizeString(source.importedProfile.about);
                const location = sanitizeString(
                    source.importedProfile.location
                );
                const skills = normalizeArray(
                    source.importedProfile.skills,
                    40
                );
                const experiences = normalizeArray(
                    source.importedProfile.experiences,
                    20
                );
                if (headline) nextProfile.headline = headline;
                if (about) nextProfile.about = about;
                if (location) nextProfile.location = location;
                if (skills.length) nextProfile.skills = skills;
                if (experiences.length) nextProfile.experiences = experiences;
                importedProfile = Object.keys(nextProfile).length
                    ? nextProfile
                    : null;
            }
            const documents = Array.isArray(source.documents)
                ? source.documents.map(doc => {
                    const nextDoc = {
                        id: sanitizeString(doc?.id),
                        fileName: sanitizeString(doc?.fileName)
                    };
                    const extension = sanitizeString(doc?.extension);
                    const sha256 = sanitizeString(doc?.sha256);
                    const size = Number(doc?.size) || 0;
                    const updatedAt = sanitizeString(doc?.updatedAt);
                    if (extension) nextDoc.extension = extension;
                    if (sha256) nextDoc.sha256 = sha256;
                    if (size > 0) nextDoc.size = size;
                    if (updatedAt) nextDoc.updatedAt = updatedAt;
                    return nextDoc;
                }).filter(doc => doc.id && doc.fileName)
                : [];
            let analysisSnapshot = null;
            if (source.analysisSnapshot &&
                typeof source.analysisSnapshot === 'object') {
                const nextSnapshot = {};
                const areaPreset = sanitizeString(
                    source.analysisSnapshot.areaPreset
                );
                const seniority = sanitizeString(
                    source.analysisSnapshot.seniority
                );
                const inferredRoles = normalizeArray(
                    source.analysisSnapshot.inferredRoles,
                    5
                );
                const keywordTerms = normalizeArray(
                    source.analysisSnapshot.keywordTerms,
                    12
                );
                const locationTerms = normalizeArray(
                    source.analysisSnapshot.locationTerms,
                    5
                );
                const workType = sanitizeString(
                    source.analysisSnapshot.workType
                );
                const experienceLevel = sanitizeString(
                    source.analysisSnapshot.experienceLevel
                );
                if (areaPreset) nextSnapshot.areaPreset = areaPreset;
                if (seniority) nextSnapshot.seniority = seniority;
                if (inferredRoles.length) {
                    nextSnapshot.inferredRoles = inferredRoles;
                }
                if (keywordTerms.length) {
                    nextSnapshot.keywordTerms = keywordTerms;
                }
                if (locationTerms.length) {
                    nextSnapshot.locationTerms = locationTerms;
                }
                if (workType) nextSnapshot.workType = workType;
                if (experienceLevel) {
                    nextSnapshot.experienceLevel = experienceLevel;
                }
                analysisSnapshot = Object.keys(nextSnapshot).length
                    ? nextSnapshot
                    : null;
            }

            return {
                importedProfile,
                documents,
                analysisSnapshot
            };
        }

        function assertPassphrase(passphrase) {
            const clean = String(passphrase || '').trim();
            if (clean.length < 4) {
                throw new Error(
                    'Career intelligence passphrase must have at least 4 characters'
                );
            }
            return clean;
        }

        async function deriveKey(passphrase, salt) {
            const cryptoApi = getCryptoApi();
            const encoder = new TextEncoder();
            // Normalize identically to the vault's deriveKey. In practice this
            // is a no-op (callers pass assertPassphrase() output, already
            // trimmed), so existing ciphertext is unaffected — it just makes
            // this function independently robust if ever called directly.
            const baseKey = await cryptoApi.subtle.importKey(
                'raw',
                encoder.encode(String(passphrase || '').trim()),
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
            if (!envelope ||
                typeof envelope !== 'object' ||
                !envelope.salt ||
                !envelope.iv ||
                !envelope.ciphertext) {
                throw new Error('Invalid jobs career intelligence envelope');
            }
        }

        async function encryptJobsCareerIntelState(state, passphrase) {
            const cleanPassphrase = assertPassphrase(passphrase);
            const cryptoApi = getCryptoApi();
            const encoder = new TextEncoder();
            const payload = normalizeCareerIntelState(state);
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
                version: CAREER_INTEL_CACHE_VERSION,
                salt: toBase64(salt),
                iv: toBase64(iv),
                ciphertext: toBase64(ciphertext),
                updatedAt: new Date().toISOString()
            };
        }

        // Fail loud on an envelope written by a newer extension version rather
        // than silently parsing a future schema as the current one. Older
        // versions would be migrated here once a v2 schema exists (none yet).
        function assertSupportedVersion(envelope) {
            const v = Number(envelope.version) || CAREER_INTEL_CACHE_VERSION;
            if (v > CAREER_INTEL_CACHE_VERSION) {
                throw new Error(
                    'Unsupported career intelligence cache version: ' + v +
                    ' (supported up to ' + CAREER_INTEL_CACHE_VERSION +
                    '). Update the extension.'
                );
            }
        }

        async function decryptJobsCareerIntelState(envelope, passphrase) {
            assertEnvelope(envelope);
            assertSupportedVersion(envelope);
            const cleanPassphrase = assertPassphrase(passphrase);
            const cryptoApi = getCryptoApi();
            const decoder = new TextDecoder();
            const key = await deriveKey(
                cleanPassphrase,
                fromBase64(envelope.salt)
            );

            let plain;
            try {
                plain = await cryptoApi.subtle.decrypt(
                    {
                        name: ENCRYPTION_ALGO,
                        iv: fromBase64(envelope.iv)
                    },
                    key,
                    fromBase64(envelope.ciphertext)
                );
            } catch (error) {
                throw new Error('Invalid career intelligence passphrase');
            }

            try {
                return normalizeCareerIntelState(
                    JSON.parse(decoder.decode(plain))
                );
            } catch (error) {
                throw new Error('Invalid jobs career intelligence payload');
            }
        }

        function getJobsCareerIntelStatus(envelope) {
            if (!envelope ||
                typeof envelope !== 'object' ||
                !envelope.ciphertext) {
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
                version: Number(envelope.version) ||
                    CAREER_INTEL_CACHE_VERSION,
                updatedAt: sanitizeString(envelope.updatedAt) || null
            };
        }

        return {
            CAREER_INTEL_CACHE_VERSION,
            normalizeCareerIntelState,
            encryptJobsCareerIntelState,
            decryptJobsCareerIntelState,
            getJobsCareerIntelStatus
        };
    }
);
