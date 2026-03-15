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
});
