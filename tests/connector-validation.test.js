const { z } = require('zod');

const connectSchema = z.object({
    query: z.string().min(1).max(500).optional()
});

const scheduleSchema = z.object({
    mode: z.enum(['connect', 'feed', 'company']).optional(),
    query: z.string().max(500).optional(),
    limit: z.number().int().min(1).max(200).optional(),
    targetCompanies: z.array(
        z.string().max(200)
    ).max(50).optional()
});

const webhookSchema = z.object({
    event: z.string().min(1).max(100),
    data: z.record(z.string(), z.unknown()).optional()
});

describe('connectSchema', () => {
    it('accepts valid query', () => {
        const r = connectSchema.safeParse({
            query: 'recruiter software'
        });
        expect(r.success).toBe(true);
    });

    it('accepts empty body (query optional)', () => {
        const r = connectSchema.safeParse({});
        expect(r.success).toBe(true);
    });

    it('rejects empty string query', () => {
        const r = connectSchema.safeParse({ query: '' });
        expect(r.success).toBe(false);
    });

    it('rejects query over 500 chars', () => {
        const r = connectSchema.safeParse({
            query: 'a'.repeat(501)
        });
        expect(r.success).toBe(false);
    });

    it('rejects non-string query', () => {
        const r = connectSchema.safeParse({ query: 123 });
        expect(r.success).toBe(false);
    });
});

describe('scheduleSchema', () => {
    it('accepts valid schedule', () => {
        const r = scheduleSchema.safeParse({
            mode: 'connect',
            query: 'engineer latam',
            limit: 50,
            targetCompanies: ['Google', 'Meta']
        });
        expect(r.success).toBe(true);
    });

    it('accepts minimal body', () => {
        const r = scheduleSchema.safeParse({});
        expect(r.success).toBe(true);
    });

    it('rejects invalid mode', () => {
        const r = scheduleSchema.safeParse({
            mode: 'destroy'
        });
        expect(r.success).toBe(false);
    });

    it('rejects limit below 1', () => {
        const r = scheduleSchema.safeParse({ limit: 0 });
        expect(r.success).toBe(false);
    });

    it('rejects limit above 200', () => {
        const r = scheduleSchema.safeParse({ limit: 201 });
        expect(r.success).toBe(false);
    });

    it('rejects non-integer limit', () => {
        const r = scheduleSchema.safeParse({ limit: 3.5 });
        expect(r.success).toBe(false);
    });

    it('rejects too many target companies', () => {
        const r = scheduleSchema.safeParse({
            targetCompanies: Array(51).fill('Company')
        });
        expect(r.success).toBe(false);
    });

    it('accepts all valid modes', () => {
        for (const mode of ['connect', 'feed', 'company']) {
            const r = scheduleSchema.safeParse({ mode });
            expect(r.success).toBe(true);
        }
    });
});

describe('webhookSchema', () => {
    it('accepts valid webhook', () => {
        const r = webhookSchema.safeParse({
            event: 'task_complete',
            data: { count: 5 }
        });
        expect(r.success).toBe(true);
    });

    it('accepts webhook without data', () => {
        const r = webhookSchema.safeParse({
            event: 'ping'
        });
        expect(r.success).toBe(true);
    });

    it('rejects missing event', () => {
        const r = webhookSchema.safeParse({});
        expect(r.success).toBe(false);
    });

    it('rejects empty event string', () => {
        const r = webhookSchema.safeParse({ event: '' });
        expect(r.success).toBe(false);
    });

    it('rejects event over 100 chars', () => {
        const r = webhookSchema.safeParse({
            event: 'x'.repeat(101)
        });
        expect(r.success).toBe(false);
    });
});
