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


    it('safeSend swallows promise rejection from a closed message channel', async () => {
        let listenerHandler;
        global.chrome = {
            runtime: {
                lastError: null,
                onMessage: {
                    addListener: jest.fn(fn => {
                        listenerHandler = fn;
                    })
                },
                sendMessage: jest.fn(() => {
                    return Promise.reject(new Error(
                        'A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received'
                    ));
                })
            },
            storage: {
                local: {
                    get: jest.fn(),
                    set: jest.fn()
                }
            }
        };
        let unhandled = null;
        const onUnhandled = (event) => {
            unhandled = event;
            event.preventDefault?.();
        };
        if (typeof window !== 'undefined') {
            window.addEventListener(
                'unhandledrejection', onUnhandled
            );
        }

        require('../extension/bridge');

        window.dispatchEvent(new MessageEvent('message', {
            source: window,
            data: {
                type: 'LINKEDIN_BOT_DONE',
                result: { sent: 0 }
            }
        }));

        expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
            expect.objectContaining({ action: 'done' })
        );

        await new Promise(r => setTimeout(r, 25));

        if (typeof window !== 'undefined') {
            window.removeEventListener(
                'unhandledrejection', onUnhandled
            );
        }
        expect(unhandled).toBeNull();
    });
});
