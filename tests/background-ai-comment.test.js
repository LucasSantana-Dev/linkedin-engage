describe('background AI comment copy guard', () => {
    let runtimeListener;
    let requestBodies;

    function setupChrome() {
        global.chrome = {
            tabs: {
                onUpdated: {
                    addListener: jest.fn(),
                    removeListener: jest.fn()
                },
                onRemoved: {
                    addListener: jest.fn(),
                    removeListener: jest.fn()
                },
                create: jest.fn(),
                update: jest.fn(),
                get: jest.fn((tabId, cb) => cb({
                    id: tabId,
                    status: 'complete'
                })),
                sendMessage: jest.fn((tabId, msg, cb) => {
                    if (typeof cb === 'function') cb();
                }),
                remove: jest.fn()
            },
            scripting: {
                executeScript: jest.fn(() => Promise.resolve([]))
            },
            runtime: {
                lastError: null,
                onMessage: {
                    addListener: jest.fn((listener) => {
                        runtimeListener = listener;
                    })
                },
                onInstalled: {
                    addListener: jest.fn()
                },
                onStartup: {
                    addListener: jest.fn()
                },
                sendMessage: jest.fn()
            },
            alarms: {
                create: jest.fn(),
                clear: jest.fn(),
                onAlarm: {
                    addListener: jest.fn()
                }
            },
            notifications: {
                create: jest.fn()
            },
            storage: {
                local: {
                    get: jest.fn((keys, cb) => cb({})),
                    set: jest.fn((obj, cb) => {
                        if (typeof cb === 'function') cb();
                    }),
                    remove: jest.fn((keys, cb) => {
                        if (typeof cb === 'function') cb();
                    })
                }
            }
        };
    }

    function baseRequest() {
        return {
            action: 'generateAIComment',
            postText:
                'Vibe coding helps teams ship MVPs faster with clear prompts.',
            existingComments: [{
                text: 'Vibe coding is useful to create MVPs fast.'
            }, {
                text: 'Clear prompts make outputs better for demos.'
            }, {
                text: 'In daily work this saves a lot of time.'
            }],
            author: 'A',
            authorTitle: 'Engineer',
            lang: 'en',
            category: 'technical',
            reactions: { INTEREST: 12 },
            reactionSummary: {
                total: 150,
                dominant: 'INTEREST',
                intensity: 'high'
            },
            commentThreadSummary: {
                count: 3,
                dominantSentiment: 'insight',
                dominantLanguage: 'en',
                keywords: ['vibe', 'coding', 'prompts', 'mvp'],
                samplePhrases: ['vibe coding useful']
            },
            imageSignals: { hasImage: false },
            patternProfile: null,
            allowLowSignalRecovery: true,
            apiKey: 'test-key',
            goalMode: 'passive'
        };
    }

    function mockFetchWithReplies(replies) {
        requestBodies = [];
        let idx = 0;
        global.fetch = jest.fn(async (url, opts) => {
            requestBodies.push(JSON.parse(opts.body || '{}'));
            const reply = replies[Math.min(idx, replies.length - 1)];
            idx++;
            return {
                ok: true,
                status: 200,
                json: async () => ({
                    choices: [{
                        message: {
                            content: reply
                        }
                    }]
                })
            };
        });
    }

    async function sendRuntimeRequest(request) {
        return new Promise(resolve => {
            let done = false;
            const sendResponse = (value) => {
                if (done) return;
                done = true;
                resolve(value);
            };
            const ret = runtimeListener(request, {}, sendResponse);
            if (ret !== true) {
                sendResponse(undefined);
            }
            setTimeout(() => sendResponse(undefined), 50);
        });
    }

    beforeEach(() => {
        jest.resetModules();
        global.importScripts = jest.fn();
        global.buildPatternGuidance = jest.fn(() => ({
            lowSignal: false,
            lengthBand: 'short',
            toneIntensity: 'low',
            punctuationRhythm: 'balanced',
            allowQuestion: false,
            maxEmoji: 0,
            styleFamily: 'analytical',
            preferredOpeners: ['solid point'],
            topNgrams: ['vibe coding', 'clear prompts']
        }));
        setupChrome();
        require('../extension/background');
    });

    afterEach(() => {
        delete global.chrome;
        delete global.importScripts;
        delete global.buildPatternGuidance;
        delete global.fetch;
    });

    it('retries once on copy-risk and accepts second response', async () => {
        mockFetchWithReplies([
            'Vibe coding is useful to create MVPs fast.',
            'Prompt clarity makes vibe coding practical for fast MVP delivery.'
        ]);

        const result = await sendRuntimeRequest(baseRequest());
        expect(result).toEqual(expect.objectContaining({
            comment: 'Prompt clarity makes vibe coding practical for fast MVP delivery.',
            reason: null,
            attempts: 2
        }));
        expect(global.fetch).toHaveBeenCalledTimes(2);
        expect(requestBodies[1].temperature)
            .toBeGreaterThan(requestBodies[0].temperature);
    });

    it('returns skip-copy-risk after two risky attempts with diagnostics', async () => {
        mockFetchWithReplies([
            'Vibe coding is useful to create MVPs fast.',
            'Vibe coding is useful to create MVPs fast.'
        ]);

        const result = await sendRuntimeRequest(baseRequest());
        expect(result.comment).toBeNull();
        expect(result.reason).toBe('skip-copy-risk');
        expect(result.attempts).toBe(2);
        expect(result.diagnostics).toEqual(
            expect.objectContaining({
                risky: true,
                ruleHit: 'exact-normalized'
            })
        );
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('accepts non-copy comment without retry', async () => {
        mockFetchWithReplies([
            'Clear prompts and tight iteration keep delivery practical.'
        ]);

        const result = await sendRuntimeRequest(baseRequest());
        expect(result).toEqual(expect.objectContaining({
            comment:
                'Clear prompts and tight iteration keep delivery practical.',
            reason: null,
            attempts: 1
        }));
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('retries once on distance-risk and accepts neutral second response', async () => {
        const request = {
            ...baseRequest(),
            category: 'newjob',
            postText: 'Excited to announce I just joined a new team.',
            existingComments: [{
                text: 'Parabéns pela nova fase!'
            }, {
                text: 'Success in this new chapter.'
            }, {
                text: 'Great move, all the best.'
            }]
        };
        mockFetchWithReplies([
            'Happy for you on this new chapter!',
            'Congrats on the new role, wishing you success.'
        ]);

        const result = await sendRuntimeRequest(request);
        expect(result).toEqual(expect.objectContaining({
            comment: 'Congrats on the new role, wishing you success.',
            reason: null,
            attempts: 2
        }));
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('returns skip-distance-risk after two overpersonal attempts', async () => {
        const request = {
            ...baseRequest(),
            category: 'achievement',
            postText: 'Excited to announce I started a new role this week.',
            existingComments: [{
                text: 'Congrats on the new role!'
            }, {
                text: 'Great new role move.'
            }, {
                text: 'Wishing success in the new role.'
            }]
        };
        mockFetchWithReplies([
            'Happy for you on this new role!',
            'So proud of you in this new role.'
        ]);

        const result = await sendRuntimeRequest(request);
        expect(result.comment).toBeNull();
        expect(result.reason).toBe('skip-distance-risk');
        expect(result.attempts).toBe(2);
        expect(result.diagnostics).toEqual(
            expect.objectContaining({
                risky: true,
                riskType: 'distance',
                ruleHit: expect.any(String)
            })
        );
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('injects departure-only anti-congrats instruction into prompt', async () => {
        const request = {
            ...baseRequest(),
            category: 'achievement',
            postText: 'Today is my last day at Acme and I am leaving ' +
                'after a long journey.',
            existingComments: [{
                text: 'Wishing you the best in this transition.'
            }, {
                text: 'All the best in your next chapter.'
            }, {
                text: 'Great transition message.'
            }],
            reactionSummary: {
                total: 45,
                dominant: 'PRAISE',
                intensity: 'high'
            },
            commentThreadSummary: {
                count: 3,
                dominantSentiment: 'celebration',
                dominantLanguage: 'en',
                keywords: ['transition', 'chapter', 'journey']
            }
        };
        mockFetchWithReplies(['SKIP']);

        await sendRuntimeRequest(request);
        const prompt = requestBodies[0]?.messages?.[0]?.content || '';
        expect(prompt).toContain('DEPARTURE-ONLY');
        expect(prompt).toContain('Do NOT congratulate');
    });

    it('rejects congratulatory AI output on departure-only post', async () => {
        const request = {
            ...baseRequest(),
            category: 'achievement',
            postText: 'Today is my last day at Acme and I am leaving ' +
                'after a long journey.',
            existingComments: [{
                text: 'Wishing you the best in this transition.'
            }, {
                text: 'All the best in your next chapter.'
            }, {
                text: 'Great transition message.'
            }],
            reactionSummary: {
                total: 45,
                dominant: 'PRAISE',
                intensity: 'high'
            },
            commentThreadSummary: {
                count: 3,
                dominantSentiment: 'celebration',
                dominantLanguage: 'en',
                keywords: ['transition', 'chapter', 'journey']
            }
        };
        mockFetchWithReplies([
            'Congrats on this transition chapter.'
        ]);

        const result = await sendRuntimeRequest(request);
        expect(result).toEqual(expect.objectContaining({
            comment: null,
            reason: 'skip-safety-guard'
        }));
    });

    it('accepts neutral AI output on departure-only post', async () => {
        const request = {
            ...baseRequest(),
            category: 'achievement',
            postText: 'Today is my last day at Acme and I am leaving ' +
                'after a long journey.',
            existingComments: [{
                text: 'Wishing you the best in this transition.'
            }, {
                text: 'All the best in your next chapter.'
            }, {
                text: 'Great transition message.'
            }],
            reactionSummary: {
                total: 45,
                dominant: 'PRAISE',
                intensity: 'high'
            },
            commentThreadSummary: {
                count: 3,
                dominantSentiment: 'celebration',
                dominantLanguage: 'en',
                keywords: ['transition', 'chapter', 'journey']
            }
        };
        mockFetchWithReplies([
            'Wishing you a smooth transition in this next chapter.'
        ]);

        const result = await sendRuntimeRequest(request);
        expect(result).toEqual(expect.objectContaining({
            comment:
                'Wishing you a smooth transition in this next chapter.',
            reason: null
        }));
    });
});
