(function(root, factory) {
    const api = factory(
        root.LinkedInJobsCareerIntelligence,
        root.LinkedInJobsCareerVault
    );
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.LinkedInJobsCareerParser = api;
    Object.keys(api).forEach(function(key) {
        if (typeof root[key] === 'undefined') {
            root[key] = api[key];
        }
    });
})(
    typeof globalThis !== 'undefined' ? globalThis : this,
    function(careerIntel, careerVault) {
        let pdfJsPromise = null;
        let _pdfJsLoader = null;
        function _setPdfJsLoader(fn) { _pdfJsLoader = fn; pdfJsPromise = null; }

        let _parseTelemetry = null;
        function _setParseTelemetry(fn) { _parseTelemetry = fn; }

        // PII-safe by construction: only the file type and outcome are ever
        // emitted — never the filename, extracted text, or hash. A throwing
        // hook must never break parsing.
        function emitParseEvent(fileType, outcome) {
            if (!_parseTelemetry) return;
            try {
                _parseTelemetry({
                    action: 'resumeParse',
                    fileType,
                    outcome
                });
            } catch (_err) {
                // telemetry must not affect the parse result
            }
        }

        function sanitizeText(value) {
            return String(value || '')
                .replace(/\s+/g, ' ')
                .trim();
        }

        async function loadPdfJs() {
            if (pdfJsPromise) return pdfJsPromise;
            if (_pdfJsLoader) {
                pdfJsPromise = Promise.resolve(_pdfJsLoader());
                return pdfJsPromise;
            }
            pdfJsPromise = import(
                chrome.runtime.getURL('vendor/pdf.min.mjs')
            ).then((module) => {
                const pdfjs = module.default || module;
                pdfjs.GlobalWorkerOptions.workerSrc =
                    chrome.runtime.getURL('vendor/pdf.worker.min.mjs');
                return pdfjs;
            });
            return pdfJsPromise;
        }

        async function extractTextFromPdf(arrayBuffer) {
            const pdfjs = await loadPdfJs();
            const loadingTask = pdfjs.getDocument({
                data: arrayBuffer
            });
            const pdf = await loadingTask.promise;
            const parts = [];
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                parts.push(
                    content.items
                        .map(item => sanitizeText(item.str))
                        .filter(Boolean)
                        .join(' ')
                );
            }
            return parts.join('\n\n').trim();
        }

        let mammothPromise = null;
        let _mammothLoader = null;
        function _setMammothLoader(fn) { _mammothLoader = fn; mammothPromise = null; }

        // mammoth ships as a UMD bundle that assigns globalThis.mammoth as a
        // side-effect — it is NOT an ES module, so it cannot be loaded with the
        // dynamic import() used for pdf.min.mjs. Load it on demand by injecting a
        // classic <script> from the packaged vendor file, guarding against a
        // global that is already present (idempotent re-entry).
        function loadMammoth() {
            if (globalThis.mammoth?.extractRawText) {
                return Promise.resolve(globalThis.mammoth);
            }
            if (mammothPromise) return mammothPromise;
            if (_mammothLoader) {
                mammothPromise = Promise.resolve(_mammothLoader());
                return mammothPromise;
            }
            if (typeof document === 'undefined'
                || typeof chrome === 'undefined'
                || !chrome.runtime?.getURL) {
                return Promise.reject(new Error('DOCX parser unavailable'));
            }
            mammothPromise = new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = chrome.runtime.getURL(
                    'vendor/mammoth.browser.min.js'
                );
                script.onload = () => {
                    if (globalThis.mammoth?.extractRawText) {
                        resolve(globalThis.mammoth);
                    } else {
                        reject(new Error('DOCX parser unavailable'));
                    }
                };
                script.onerror = () => reject(
                    new Error('DOCX parser unavailable')
                );
                (document.head || document.documentElement)
                    .appendChild(script);
            });
            return mammothPromise;
        }

        async function extractTextFromDocx(arrayBuffer) {
            const mammoth = await loadMammoth();
            const result = await mammoth.extractRawText({ arrayBuffer });
            return sanitizeText(result?.value || '');
        }

        function readFileBuffer(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onerror = () => reject(
                    reader.error || new Error('Failed to read file')
                );
                reader.onload = () => resolve(reader.result);
                reader.readAsArrayBuffer(file);
            });
        }

        async function parseResumeFile(file) {
            const validation =
                careerIntel.validateResumeVaultFileMeta(file);
            if (!validation.ok) {
                throw new Error(validation.reason);
            }
            const arrayBuffer = await readFileBuffer(file);
            const extension = validation.extension;
            let extractedText;
            try {
                extractedText = extension === 'pdf'
                    ? await extractTextFromPdf(arrayBuffer)
                    : await extractTextFromDocx(arrayBuffer);
            } catch (err) {
                emitParseEvent(extension, 'failed');
                throw err;
            }
            emitParseEvent(extension, 'ok');
            return {
                id: await careerVault.sha256Hex(arrayBuffer),
                fileName: String(file.name || ''),
                extension,
                size: Number(file.size) || 0,
                sha256: await careerVault.sha256Hex(arrayBuffer),
                arrayBuffer,
                extractedText
            };
        }

        return {
            parseResumeFile,
            extractTextFromPdf,
            extractTextFromDocx,
            _setPdfJsLoader,
            _setMammothLoader,
            _setParseTelemetry
        };
    }
);
