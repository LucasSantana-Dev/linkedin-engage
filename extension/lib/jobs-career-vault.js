(function(root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.LinkedInJobsCareerVault = api;
    Object.keys(api).forEach(function(key) {
        if (typeof root[key] === 'undefined') {
            root[key] = api[key];
        }
    });
})(
    typeof globalThis !== 'undefined' ? globalThis : this,
    function() {
        const DB_NAME = 'linkedinEngageJobsVaultV1';
        const STORE_NAME = 'documents';
        const DB_VERSION = 1;
        const ENCRYPTION_ALGO = 'AES-GCM';
        const PBKDF2_HASH = 'SHA-256';
        const PBKDF2_ITERATIONS = 150000;
        const SALT_BYTES = 16;
        const IV_BYTES = 12;

        function getCryptoApi() {
            if (globalThis.crypto?.subtle) {
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
            bytes.forEach(byte => {
                binary += String.fromCharCode(byte);
            });
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
            return String(value == null ? '' : value).trim();
        }

        async function deriveKey(passphrase, salt) {
            const cryptoApi = getCryptoApi();
            const encoder = new TextEncoder();
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

        function openVault(indexedDbApi) {
            return new Promise((resolve, reject) => {
                const request = (indexedDbApi || globalThis.indexedDB)
                    .open(DB_NAME, DB_VERSION);
                request.onerror = () => reject(
                    request.error || new Error('Failed to open jobs vault')
                );
                request.onupgradeneeded = () => {
                    const db = request.result;
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        db.createObjectStore(STORE_NAME, {
                            keyPath: 'id'
                        });
                    }
                };
                request.onsuccess = () => resolve(request.result);
            });
        }

        function withStore(mode, task, indexedDbApi) {
            return openVault(indexedDbApi).then(db => new Promise(
                (resolve, reject) => {
                    const tx = db.transaction(STORE_NAME, mode);
                    const store = tx.objectStore(STORE_NAME);
                    task(store, resolve, reject);
                    tx.onerror = () => reject(
                        tx.error || new Error('Jobs vault transaction failed')
                    );
                    tx.oncomplete = () => db.close();
                }
            ));
        }

        async function sha256Hex(arrayBuffer) {
            const bytes = new Uint8Array(arrayBuffer);
            const digest = await getCryptoApi().subtle.digest(
                'SHA-256',
                bytes
            );
            return Array.from(new Uint8Array(digest))
                .map(byte => byte.toString(16).padStart(2, '0'))
                .join('');
        }

        async function encryptVaultPayload(payload, passphrase) {
            const cryptoApi = getCryptoApi();
            const encoder = new TextEncoder();
            const salt = cryptoApi.getRandomValues(
                new Uint8Array(SALT_BYTES)
            );
            const iv = cryptoApi.getRandomValues(
                new Uint8Array(IV_BYTES)
            );
            const key = await deriveKey(passphrase, salt);
            const ciphertext = await cryptoApi.subtle.encrypt(
                { name: ENCRYPTION_ALGO, iv },
                key,
                encoder.encode(JSON.stringify(payload))
            );
            return {
                salt: toBase64(salt),
                iv: toBase64(iv),
                ciphertext: toBase64(ciphertext)
            };
        }

        async function decryptVaultPayload(envelope, passphrase) {
            const cryptoApi = getCryptoApi();
            const decoder = new TextDecoder();
            const key = await deriveKey(
                passphrase,
                fromBase64(envelope.salt)
            );
            const plain = await cryptoApi.subtle.decrypt(
                {
                    name: ENCRYPTION_ALGO,
                    iv: fromBase64(envelope.iv)
                },
                key,
                fromBase64(envelope.ciphertext)
            );
            return JSON.parse(decoder.decode(plain));
        }

        async function upsertJobsCareerVaultDocument(record, passphrase, indexedDbApi) {
            const payload = {
                extractedText: sanitizeString(record.extractedText),
                bytesBase64: toBase64(record.arrayBuffer)
            };
            const envelope = await encryptVaultPayload(payload, passphrase);
            const savedRecord = {
                id: sanitizeString(record.id),
                fileName: sanitizeString(record.fileName),
                extension: sanitizeString(record.extension),
                size: Number(record.size) || 0,
                sha256: sanitizeString(record.sha256),
                updatedAt: new Date().toISOString(),
                envelope
            };
            return withStore(
                'readwrite',
                (store, resolve) => {
                    store.put(savedRecord).onsuccess = () => resolve(savedRecord);
                },
                indexedDbApi
            );
        }

        function listJobsCareerVaultDocuments(indexedDbApi) {
            return withStore(
                'readonly',
                (store, resolve) => {
                    store.getAll().onsuccess = event => {
                        resolve(event.target.result || []);
                    };
                },
                indexedDbApi
            );
        }

        async function loadJobsCareerVaultDocuments(passphrase, indexedDbApi) {
            const records = await listJobsCareerVaultDocuments(indexedDbApi);
            const docs = [];
            for (const record of records) {
                const payload = await decryptVaultPayload(
                    record.envelope,
                    passphrase
                );
                docs.push({
                    id: record.id,
                    fileName: record.fileName,
                    extension: record.extension,
                    size: record.size,
                    sha256: record.sha256,
                    updatedAt: record.updatedAt,
                    extractedText: sanitizeString(payload.extractedText)
                });
            }
            return docs;
        }

        function removeJobsCareerVaultDocument(id, indexedDbApi) {
            return withStore(
                'readwrite',
                (store, resolve) => {
                    store.delete(id).onsuccess = () => resolve(true);
                },
                indexedDbApi
            );
        }

        function clearJobsCareerVault(indexedDbApi) {
            return withStore(
                'readwrite',
                (store, resolve) => {
                    store.clear().onsuccess = () => resolve(true);
                },
                indexedDbApi
            );
        }

        return {
            DB_NAME,
            STORE_NAME,
            sha256Hex,
            upsertJobsCareerVaultDocument,
            listJobsCareerVaultDocuments,
            loadJobsCareerVaultDocuments,
            removeJobsCareerVaultDocument,
            clearJobsCareerVault
        };
    }
);
