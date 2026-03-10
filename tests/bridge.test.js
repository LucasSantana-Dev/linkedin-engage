/**
 * @jest-environment jsdom
 */

describe('bridge AI relay', () => {
    beforeEach(() => {
        jest.resetModules();
        global.chrome = {
            runtime: {
                onMessage: {
                    addListener: jest.fn()
                },
                sendMessage: jest.fn((payload, cb) => {
                    if (payload.action === 'generateAIComment') {
                        cb({
                            comment: null,
                            reason: 'skip-low-confidence'
                        });
                        return;
                    }
                    if (typeof cb === 'function') cb({});
                })
            },
            storage: {
                local: {
                    get: jest.fn((key, cb) => cb({})),
                    set: jest.fn()
                }
            }
        };
        require('../extension/bridge');
    });

    afterEach(() => {
        delete global.chrome;
    });

    it('forwards goalMode and returns reason in AI result relay', async () => {
        const postSpy = jest.spyOn(window, 'postMessage');

        window.dispatchEvent(new MessageEvent('message', {
            source: window,
            data: {
                type: 'LINKEDIN_BOT_AI_COMMENT',
                requestId: 42,
                postText: 'post',
                existingComments: [],
                author: 'A',
                authorTitle: 'B',
                lang: 'en',
                category: 'technical',
                reactions: {},
                reactionSummary: { total: 12, dominant: 'LIKE' },
                commentThreadSummary: { count: 2 },
                imageSignals: { hasImage: false },
                patternProfile: {
                    patternConfidence: 82,
                    styleFamily: 'analytical'
                },
                apiKey: 'k',
                goalMode: 'active',
                allowLowSignalRecovery: true
            }
        }));

        expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                action: 'generateAIComment',
                goalMode: 'active',
                allowLowSignalRecovery: true,
                patternProfile: expect.objectContaining({
                    patternConfidence: 82
                })
            }),
            expect.any(Function)
        );
        expect(postSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'LINKEDIN_BOT_AI_COMMENT_RESULT',
                reason: 'skip-low-confidence',
                requestId: 42
            }),
            '*'
        );
        postSpy.mockRestore();
    });

    it('forwards learn-only pattern profile ingestion', () => {
        window.dispatchEvent(new MessageEvent('message', {
            source: window,
            data: {
                type: 'LINKEDIN_BOT_PATTERN_LEARN',
                lang: 'pt',
                category: 'hiring',
                patternProfile: {
                    analyzedCount: 6,
                    patternConfidence: 74
                },
                runMeta: {
                    warmupActive: true,
                    runNumber: 1
                }
            }
        }));

        expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                action: 'ingestPatternProfile',
                lang: 'pt',
                category: 'hiring',
                patternProfile: expect.objectContaining({
                    analyzedCount: 6
                }),
                runMeta: expect.objectContaining({
                    warmupActive: true,
                    runNumber: 1
                })
            }),
            expect.any(Function)
        );
    });
});
