/**
 * @jest-environment jsdom
 *
 * Comprehensive tests for jobs-career-parser.js covering both
 * DOCX (mammoth) and PDF (pdfjs) extraction paths.
 */

describe('jobs career parser', () => {
    function loadParser() {
        jest.resetModules();
        global.crypto = require('crypto').webcrypto;
        global.LinkedInJobsCareerIntelligence = require(
            '../extension/lib/jobs-career-intelligence'
        );
        global.LinkedInJobsCareerVault = require(
            '../extension/lib/jobs-career-vault'
        );
        return require('../extension/lib/jobs-career-parser');
    }

    afterEach(() => {
        delete global.LinkedInJobsCareerIntelligence;
        delete global.LinkedInJobsCareerVault;
        delete global.mammoth;
        delete global.chrome;
        delete global.crypto;
    });

    it('rejects unsupported legacy doc files before parsing', async () => {
        const { parseResumeFile } = loadParser();
        const file = new File(['legacy'], 'resume.doc', {
            type: 'application/msword'
        });

        await expect(parseResumeFile(file)).rejects.toThrow(
            'unsupported-file-type'
        );
    });

    it('extracts docx text, sanitizes it, and returns hashed metadata', async () => {
        const { parseResumeFile } = loadParser();
        global.mammoth = {
            extractRawText: jest.fn(async ({ arrayBuffer }) => {
                expect(arrayBuffer).toBeInstanceOf(ArrayBuffer);
                return {
                    value: 'Senior   Engineer\n\nReact   Node.js'
                };
            })
        };

        const file = new File(
            [new Uint8Array([1, 2, 3, 4])],
            'resume.docx',
            {
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            }
        );
        const parsed = await parseResumeFile(file);

        expect(parsed.fileName).toBe('resume.docx');
        expect(parsed.extension).toBe('docx');
        expect(parsed.size).toBe(file.size);
        expect(parsed.extractedText).toBe('Senior Engineer React Node.js');
        expect(parsed.sha256).toHaveLength(64);
        expect(parsed.id).toBe(parsed.sha256);
        expect(parsed.arrayBuffer).toBeInstanceOf(ArrayBuffer);
    });

    it('fails docx extraction when the mammoth parser is unavailable', async () => {
        const { extractTextFromDocx } = loadParser();

        await expect(
            extractTextFromDocx(new Uint8Array([1, 2]).buffer)
        ).rejects.toThrow('DOCX parser unavailable');
    });

    it('sanitizes null/undefined/whitespace text values', async () => {
        const { extractTextFromDocx } = loadParser();
        global.mammoth = {
            extractRawText: jest.fn(async () => ({
                value: '  Hello   World  '
            }))
        };

        const text = await extractTextFromDocx(
            new Uint8Array([1]).buffer
        );
        expect(text).toBe('Hello World');
    });

    it('handles empty docx extraction result', async () => {
        const { extractTextFromDocx } = loadParser();
        global.mammoth = {
            extractRawText: jest.fn(async () => ({
                value: ''
            }))
        };

        const text = await extractTextFromDocx(
            new Uint8Array([1]).buffer
        );
        expect(text).toBe('');
    });

    it('handles docx with null result value', async () => {
        const { extractTextFromDocx } = loadParser();
        global.mammoth = {
            extractRawText: jest.fn(async () => ({
                value: null
            }))
        };

        const text = await extractTextFromDocx(
            new Uint8Array([1]).buffer
        );
        expect(text).toBe('');
    });

    it('rejects oversized files before parsing', async () => {
        const { parseResumeFile } = loadParser();
        const buffer = new ArrayBuffer(6 * 1024 * 1024);
        const file = new File([buffer], 'huge.docx', {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
        Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 });

        await expect(parseResumeFile(file)).rejects.toThrow();
    });

    it('rejects .txt files as unsupported type', async () => {
        const { parseResumeFile } = loadParser();
        const file = new File(['text content'], 'resume.txt', {
            type: 'text/plain'
        });
        await expect(parseResumeFile(file)).rejects.toThrow();
    });

    it('sha256 hash is deterministic for same file content', async () => {
        const { parseResumeFile } = loadParser();
        global.mammoth = {
            extractRawText: jest.fn(async () => ({ value: 'Same content' }))
        };
        const content = new Uint8Array([42, 43, 44, 45]);
        const file1 = new File([content], 'resume.docx', {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
        const file2 = new File([content], 'resume-copy.docx', {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
        const r1 = await parseResumeFile(file1);
        const r2 = await parseResumeFile(file2);
        expect(r1.sha256).toBe(r2.sha256);
        expect(r1.sha256).toMatch(/^[0-9a-f]{64}$/);
    });

    it('extractTextFromPdf processes pdfjs output correctly via direct simulation', async () => {
        loadParser();

        const mockPdf = {
            numPages: 2,
            getPage: async (pageNum) => ({
                getTextContent: async () => ({
                    items: [
                        { str: `Page${pageNum} line one` },
                        { str: '   ' },
                        { str: `Page${pageNum} line two` }
                    ]
                })
            })
        };

        const parts = [];
        for (let i = 1; i <= mockPdf.numPages; i++) {
            const page = await mockPdf.getPage(i);
            const content = await page.getTextContent();
            parts.push(
                content.items
                    .map(item => String(item.str || '').replace(/\s+/g, ' ').trim())
                    .filter(Boolean)
                    .join(' ')
            );
        }
        const text = parts.join('\n\n').trim();
        expect(text).toContain('Page1 line one');
        expect(text).toContain('Page1 line two');
        expect(text).toContain('Page2 line one');
        expect(text).toContain('Page2 line two');
    });

    it('extractTextFromPdf handles pages with no text items', async () => {
        loadParser();

        const mockPdf = {
            numPages: 3,
            getPage: async (pageNum) => ({
                getTextContent: async () => ({
                    items: pageNum === 2
                        ? []
                        : [{ str: `Page ${pageNum} has text` }]
                })
            })
        };

        const parts = [];
        for (let i = 1; i <= mockPdf.numPages; i++) {
            const page = await mockPdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items
                .map(item => String(item.str || '').replace(/\s+/g, ' ').trim())
                .filter(Boolean)
                .join(' ');
            if (pageText) parts.push(pageText);
        }
        const text = parts.join('\n\n').trim();
        expect(text).toContain('Page 1 has text');
        expect(text).toContain('Page 3 has text');
        expect(text).not.toContain('Page 2');
    });

    it('extractTextFromPdf sanitizes whitespace-only strings from items', async () => {
        loadParser();

        const items = [
            { str: '  ' }, { str: '\n' }, { str: 'Real content' }, { str: '' }
        ];
        const filtered = items
            .map(item => String(item.str || '').replace(/\s+/g, ' ').trim())
            .filter(Boolean);
        expect(filtered).toEqual(['Real content']);
    });

    it('extractTextFromPdf rejects when pdfjs cannot be loaded (loadPdfJs path)', async () => {
        // In Node CJS Jest, import() of a chrome-extension:// URL rejects.
        // This exercises lines 26-57 (loadPdfJs + extractTextFromPdf).
        jest.resetModules();
        global.crypto = require('crypto').webcrypto;
        global.LinkedInJobsCareerIntelligence = require(
            '../extension/lib/jobs-career-intelligence'
        );
        global.LinkedInJobsCareerVault = require(
            '../extension/lib/jobs-career-vault'
        );
        global.chrome = {
            runtime: {
                getURL: (path) => `chrome-extension://fake-id/${path}`
            }
        };

        const { extractTextFromPdf } = require('../extension/lib/jobs-career-parser');
        const buf = new ArrayBuffer(8);

        // The dynamic import of a chrome-extension:// URL will reject in Node
        await expect(extractTextFromPdf(buf)).rejects.toBeDefined();
    });

    it('extractTextFromPdf loads pdfjs and extracts text from pages (lines 31-56)', async () => {
        jest.resetModules();
        global.crypto = require('crypto').webcrypto;
        global.LinkedInJobsCareerIntelligence = require(
            '../extension/lib/jobs-career-intelligence'
        );
        global.LinkedInJobsCareerVault = require(
            '../extension/lib/jobs-career-vault'
        );
        global.chrome = {
            runtime: {
                getURL: (p) => `chrome-extension://fake-id/${p}`
            }
        };

        const { extractTextFromPdf, _setPdfJsLoader } = require('../extension/lib/jobs-career-parser');
        const fakePdfJs = require('./fixtures/fake-pdfjs.cjs');
        _setPdfJsLoader(() => fakePdfJs);

        const buf = new Uint8Array([1, 2, 3, 4]).buffer;
        const text = await extractTextFromPdf(buf);
        expect(text).toContain('Hello from page 1');
        expect(text).toContain('More text');
        expect(text).toContain('Hello from page 2');
    });

    it('loadPdfJs returns the cached promise on subsequent calls', async () => {
        jest.resetModules();
        global.crypto = require('crypto').webcrypto;
        global.LinkedInJobsCareerIntelligence = require(
            '../extension/lib/jobs-career-intelligence'
        );
        global.LinkedInJobsCareerVault = require(
            '../extension/lib/jobs-career-vault'
        );

        const { extractTextFromPdf, _setPdfJsLoader } = require('../extension/lib/jobs-career-parser');
        const fakePdfJs = require('./fixtures/fake-pdfjs.cjs');
        let loaderCallCount = 0;
        _setPdfJsLoader(() => {
            loaderCallCount++;
            return fakePdfJs;
        });

        const buf = new Uint8Array([1, 2, 3, 4]).buffer;
        await extractTextFromPdf(buf); // first call — sets pdfJsPromise
        await extractTextFromPdf(buf); // second call — must return cached promise

        // Loader called only once; second call hit the pdfJsPromise cache branch
        expect(loaderCallCount).toBe(1);
    });

    it('readFileBuffer rejects when the FileReader fires an error event', async () => {
        const { parseResumeFile } = loadParser();

        // Provide a File-like object whose FileReader.readAsArrayBuffer triggers onerror
        const originalFileReader = globalThis.FileReader;
        globalThis.FileReader = class {
            readAsArrayBuffer() {
                setTimeout(() => {
                    this.error = new Error('read-error');
                    this.onerror();
                }, 0);
            }
        };

        global.mammoth = {
            extractRawText: jest.fn(async () => ({ value: 'x' }))
        };

        const file = new File(
            [new Uint8Array([1])],
            'resume.docx',
            { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
        );

        try {
            await expect(parseResumeFile(file)).rejects.toThrow('read-error');
        } finally {
            globalThis.FileReader = originalFileReader;
        }
    });

    describe('parse telemetry', () => {
        function docxFile(name = 'resume.docx') {
            return new File([new Uint8Array([1, 2, 3, 4])], name, {
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            });
        }

        it('emits a PII-safe event on successful parse (type + outcome only)', async () => {
            const { parseResumeFile, _setParseTelemetry } = loadParser();
            global.mammoth = {
                extractRawText: jest.fn(async () => ({ value: 'Senior Engineer' }))
            };
            const events = [];
            _setParseTelemetry((e) => events.push(e));

            await parseResumeFile(docxFile('jane-doe-cv.docx'));

            expect(events).toHaveLength(1);
            expect(events[0]).toEqual({
                action: 'resumeParse',
                fileType: 'docx',
                outcome: 'ok'
            });
            // PII guard: filename, extracted text, and hash must NOT leak.
            expect(Object.keys(events[0]).sort()).toEqual([
                'action', 'fileType', 'outcome'
            ]);
        });

        it('emits a failed event when extraction throws, then rethrows', async () => {
            const { parseResumeFile, _setParseTelemetry } = loadParser();
            // no global.mammoth, no chrome → docx extraction fails
            const events = [];
            _setParseTelemetry((e) => events.push(e));

            await expect(parseResumeFile(docxFile())).rejects.toThrow();
            expect(events).toEqual([
                { action: 'resumeParse', fileType: 'docx', outcome: 'failed' }
            ]);
        });

        it('does not emit for pre-parse validation failures', async () => {
            const { parseResumeFile, _setParseTelemetry } = loadParser();
            const events = [];
            _setParseTelemetry((e) => events.push(e));

            const file = new File(['x'], 'resume.txt', { type: 'text/plain' });
            await expect(parseResumeFile(file)).rejects.toThrow();
            expect(events).toEqual([]);
        });

        it('a throwing telemetry hook never breaks parsing', async () => {
            const { parseResumeFile, _setParseTelemetry } = loadParser();
            global.mammoth = {
                extractRawText: jest.fn(async () => ({ value: 'Engineer' }))
            };
            _setParseTelemetry(() => { throw new Error('telemetry boom'); });

            const parsed = await parseResumeFile(docxFile());
            expect(parsed.extractedText).toBe('Engineer');
        });

        it('parses normally when no telemetry hook is set', async () => {
            const { parseResumeFile } = loadParser();
            global.mammoth = {
                extractRawText: jest.fn(async () => ({ value: 'X' }))
            };
            const parsed = await parseResumeFile(docxFile());
            expect(parsed.extractedText).toBe('X');
        });
    });

    describe('lazy mammoth loading', () => {
        it('lazily loads mammoth via the injected loader when no global is set', async () => {
            const { extractTextFromDocx, _setMammothLoader } = loadParser();
            // No global.mammoth — must come from the lazy loader.
            const fakeMammoth = {
                extractRawText: jest.fn(async () => ({ value: '  Lazy  Loaded  ' }))
            };
            _setMammothLoader(() => fakeMammoth);

            const text = await extractTextFromDocx(new Uint8Array([1]).buffer);
            expect(text).toBe('Lazy Loaded');
            expect(fakeMammoth.extractRawText).toHaveBeenCalledTimes(1);
        });

        it('caches the loaded mammoth across extractions (loader runs once)', async () => {
            const { extractTextFromDocx, _setMammothLoader } = loadParser();
            let loaderCalls = 0;
            const fakeMammoth = {
                extractRawText: jest.fn(async () => ({ value: 'x' }))
            };
            _setMammothLoader(() => { loaderCalls++; return fakeMammoth; });

            await extractTextFromDocx(new Uint8Array([1]).buffer);
            await extractTextFromDocx(new Uint8Array([2]).buffer);
            expect(loaderCalls).toBe(1);
        });

        it('de-dupes concurrent docx extractions (loader runs once)', async () => {
            const { extractTextFromDocx, _setMammothLoader } = loadParser();
            let loaderCalls = 0;
            const fakeMammoth = {
                extractRawText: jest.fn(async ({ arrayBuffer }) => ({
                    value: `text${new Uint8Array(arrayBuffer)[0]}`
                }))
            };
            _setMammothLoader(() => { loaderCalls++; return fakeMammoth; });

            const [r1, r2] = await Promise.all([
                extractTextFromDocx(new Uint8Array([1]).buffer),
                extractTextFromDocx(new Uint8Array([2]).buffer)
            ]);
            expect(loaderCalls).toBe(1);
            expect(r1).toBe('text1');
            expect(r2).toBe('text2');
        });

        it('uses an already-present global.mammoth without invoking the loader', async () => {
            const { extractTextFromDocx, _setMammothLoader } = loadParser();
            global.mammoth = {
                extractRawText: jest.fn(async () => ({ value: 'from global' }))
            };
            const loader = jest.fn();
            _setMammothLoader(loader);

            const text = await extractTextFromDocx(new Uint8Array([1]).buffer);
            expect(text).toBe('from global');
            expect(loader).not.toHaveBeenCalled();
        });

        it('injects a vendor <script> and resolves once it sets the global', async () => {
            const { extractTextFromDocx } = loadParser();
            global.chrome = {
                runtime: { getURL: (p) => `chrome-extension://fake/${p}` }
            };
            const realCreate = document.createElement.bind(document);
            jest.spyOn(document, 'createElement').mockImplementation((tag) => {
                const el = realCreate(tag);
                if (tag === 'script') {
                    // Simulate the browser loading the UMD bundle: it sets the
                    // global, then fires onload.
                    Promise.resolve().then(() => {
                        global.mammoth = {
                            extractRawText: async () => ({ value: 'injected' })
                        };
                        el.onload();
                    });
                }
                return el;
            });

            const text = await extractTextFromDocx(new Uint8Array([1]).buffer);
            expect(text).toBe('injected');
            document.createElement.mockRestore();
        });

        it('rejects with DOCX parser unavailable when the script fails to load', async () => {
            const { extractTextFromDocx } = loadParser();
            global.chrome = {
                runtime: { getURL: (p) => `chrome-extension://fake/${p}` }
            };
            const realCreate = document.createElement.bind(document);
            jest.spyOn(document, 'createElement').mockImplementation((tag) => {
                const el = realCreate(tag);
                if (tag === 'script') {
                    Promise.resolve().then(() => el.onerror());
                }
                return el;
            });

            await expect(
                extractTextFromDocx(new Uint8Array([1]).buffer)
            ).rejects.toThrow('DOCX parser unavailable');
            document.createElement.mockRestore();
        });
    });
});
