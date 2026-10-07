const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'extension');
const html = fs.readFileSync(path.join(root, 'options.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'options.js'), 'utf8');

function readCardLabelKeys() {
    const match = js.match(/const cardLabels = \[([\s\S]*?)\];/);
    expect(match).not.toBeNull();
    return [...match[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
}

describe('options dashboard card labels', () => {
    const keys = readCardLabelKeys();

    test('cardLabels has one key per .card-label node', () => {
        const nodes = html.match(/class="card-label"/g) || [];
        expect(keys.length).toBe(nodes.length);
    });

    test('cardLabels has no duplicate keys', () => {
        expect(new Set(keys).size).toBe(keys.length);
    });

    test.each(['en', 'pt_BR'])('every key exists in %s locale', locale => {
        const messages = JSON.parse(fs.readFileSync(
            path.join(root, '_locales', locale, 'messages.json'), 'utf8'
        ));
        keys.forEach(key => {
            expect(messages[key.replace(/\./g, '_')]).toBeDefined();
        });
    });
});
