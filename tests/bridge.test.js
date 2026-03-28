/**
 * @jest-environment jsdom
 */

describe('bridge AI relay', () => {
    beforeEach(() => {
        jest.resetModules();
        global.chrome = {
            runtime: {
                lastError: null,
                onMessage: {
                    addListener: jest.fn()
                },
                sendMessage: jest.fn((payload, cb) => {
                    if (payload.action === 'generateAIComment') {
                        cb({
                            comment: null,
                            reason: 'skip-copy-risk',
                            diagnostics: {
                                ruleHit: 'shared-4gram',
                                tokenOverlap: 0.81
                            },
                            attempts: 2
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

    it('does not leave runtime message channels pending for sync actions', () => {
        const listener = chrome.runtime.onMessage
            .addListener.mock.calls[0][0];
        const sendResponse = jest.fn();

        const runResult = listener({
            action: 'runAutomation'
        }, null, sendResponse);
        const customResult = listener({
            action: 'runCustom',
            msgType: 'LINKEDIN_BOT_CUSTOM',
            config: {}
        }, null, sendResponse);
        const stopResult = listener({
            action: 'stop'
        }, null, sendResponse);

        expect(runResult).toBeUndefined();
        expect(customResult).toBeUndefined();
        expect(stopResult).toBeUndefined();
        expect(sendResponse).toHaveBeenNthCalledWith(1, {
            status: 'started'
        });
        expect(sendResponse).toHaveBeenNthCalledWith(2, {
            status: 'started'
        });
        expect(sendResponse).toHaveBeenNthCalledWith(3, {
            status: 'stopping'
        });
    });

    it('forwards goalMode and returns diagnostics in AI result relay', async () => {
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
                reason: 'skip-copy-risk',
                diagnostics: expect.objectContaining({
                    ruleHit: 'shared-4gram'
                }),
                attempts: 2,
                requestId: 42
            }),
            '*'
        );
        postSpy.mockRestore();
    });

    it('posts bridge-runtime-error fallback when runtime callback fails', () => {
        chrome.runtime.sendMessage = jest.fn((payload, cb) => {
            if (payload.action === 'generateAIComment') {
                chrome.runtime.lastError = {
                    message: 'The message port closed.'
                };
                cb(undefined);
                chrome.runtime.lastError = null;
                return;
            }
            if (typeof cb === 'function') cb({});
        });
        const postSpy = jest.spyOn(window, 'postMessage');

        window.dispatchEvent(new MessageEvent('message', {
            source: window,
            data: {
                type: 'LINKEDIN_BOT_AI_COMMENT',
                requestId: 99,
                postText: 'post',
                existingComments: [],
                author: 'A',
                category: 'technical',
                apiKey: 'k'
            }
        }));

        expect(postSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'LINKEDIN_BOT_AI_COMMENT_RESULT',
                comment: null,
                reason: 'bridge-runtime-error',
                diagnostics: expect.objectContaining({
                    source: 'bridge'
                }),
                attempts: 0,
                requestId: 99
            }),
            '*'
        );
        expect(postSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'LINKEDIN_BOT_ANALYTICS',
                entry: expect.objectContaining({
                    status: 'bridge-runtime-error'
                })
            }),
            '*'
        );
        postSpy.mockRestore();
    });

    it('relays distance-risk diagnostics from background', () => {
        chrome.runtime.sendMessage = jest.fn((payload, cb) => {
            if (payload.action === 'generateAIComment') {
                cb({
                    comment: null,
                    reason: 'skip-distance-risk',
                    diagnostics: {
                        risky: true,
                        riskType: 'distance',
                        ruleHit: 'direct-intimacy-phrase',
                        matchedSnippet: 'happy for you'
                    },
                    attempts: 2
                });
                return;
            }
            if (typeof cb === 'function') cb({});
        });
        const postSpy = jest.spyOn(window, 'postMessage');

        window.dispatchEvent(new MessageEvent('message', {
            source: window,
            data: {
                type: 'LINKEDIN_BOT_AI_COMMENT',
                requestId: 7,
                postText: 'post',
                existingComments: [],
                author: 'A',
                category: 'newjob',
                apiKey: 'k'
            }
        }));

        expect(postSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'LINKEDIN_BOT_AI_COMMENT_RESULT',
                reason: 'skip-distance-risk',
                diagnostics: expect.objectContaining({
                    riskType: 'distance',
                    ruleHit: 'direct-intimacy-phrase'
                }),
                attempts: 2,
                requestId: 7
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
            })
        );
    });
});
