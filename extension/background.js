chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'start') {
        const query = request.query;
        const geoUrn = request.geoUrn
            || '%5B%22103644278%22%2C%22101121807%22' +
               '%2C%22101165590%22%2C%22101282230%22' +
               '%2C%22102890719%22%5D';

        let searchUrl =
            'https://www.linkedin.com/search/results/people/' +
            `?geoUrn=${geoUrn}` +
            `&keywords=${encodeURIComponent(query)}` +
            '&origin=FACETED_SEARCH';

        if (request.activelyHiring) {
            searchUrl += '&activelyHiring=true';
        }

        chrome.tabs.create({ url: searchUrl, active: true }, (tab) => {
            chrome.tabs.onUpdated.addListener(
                function listener(tabId, info) {
                    if (tabId !== tab.id || info.status !== 'complete') {
                        return;
                    }
                    chrome.tabs.onUpdated.removeListener(listener);

                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['bridge.js'],
                        world: 'ISOLATED'
                    }, () => {
                        chrome.scripting.executeScript({
                            target: { tabId: tab.id },
                            files: ['content.js'],
                            world: 'MAIN'
                        }, () => {
                            chrome.tabs.sendMessage(tab.id, {
                                action: 'runAutomation',
                                limit: request.limit,
                                sendNote: request.sendNote,
                                noteTemplate: request.noteTemplate
                            }, (response) => {
                                sendResponse(response);
                            });
                        });
                    });
                }
            );
        });

        return true;
    }
});
