const fs = require('fs');
const path = require('path');

const EXT = path.join(__dirname, '..', 'extension');
const read = (rel) => fs.readFileSync(path.join(EXT, rel), 'utf8');

// Requires that are genuinely optional: reason documented per entry.
const OPTIONAL_ALLOWLIST = {};

function requireTargets(libRel) {
    const src = read(libRel);
    const out = [];
    const re = /require\(\s*['"]\.\/([\w-]+)(?:\.js)?['"]\s*\)/g;
    let m;
    while ((m = re.exec(src)) !== null) out.push(`lib/${m[1]}.js`);
    return [...new Set(out)];
}

function contextsFromBackground() {
    const src = read('background.js');
    const ctxs = {};
    const sw = [...src.matchAll(/importScripts\(\s*'(lib\/[\w-]+\.js)'\s*\)/g)]
        .map((m) => m[1]);
    ctxs['service worker importScripts'] = sw;
    const arrRe = /\[([^\]]*'lib\/[\w-]+\.js'[^\]]*)\]/g;
    let m;
    let n = 0;
    while ((m = arrRe.exec(src)) !== null) {
        const libs = [...m[1].matchAll(/'(lib\/[\w-]+\.js)'/g)].map((x) => x[1]);
        n++;
        ctxs[`background.js array #${n} (${libs[0]}...)`] = libs;
    }
    return ctxs;
}

function contextsFromHtml(rel) {
    const dir = path.posix.dirname(rel);
    const libs = [...read(rel).matchAll(/<script\s+src="([^"]+)"/g)]
        .map((m) => path.posix.normalize(path.posix.join(dir, m[1])))
        .filter((p) => /^lib\/[\w-]+\.js$/.test(p));
    return { [rel]: libs };
}

const contexts = {
    ...contextsFromBackground(),
    ...contextsFromHtml('popup/popup.html'),
    ...contextsFromHtml('options.html')
};

describe('script load order', () => {
    it('discovers the expected contexts', () => {
        const names = Object.keys(contexts);
        expect(contexts['service worker importScripts'].length).toBeGreaterThan(10);
        expect(names.filter((n) => n.startsWith('background.js array')).length)
            .toBeGreaterThanOrEqual(3);
        expect(contexts['popup/popup.html'].length).toBeGreaterThan(10);
        expect(contexts['options.html'].length).toBeGreaterThan(3);
    });

    it('text-utils.js has no relative require dependencies', () => {
        expect(requireTargets('lib/text-utils.js')).toEqual([]);
    });

    Object.entries(contexts).forEach(([name, libs]) => {
        it(`loads every require('./x') dependency first: ${name}`, () => {
            const problems = [];
            libs.forEach((lib, idx) => {
                requireTargets(lib).forEach((dep) => {
                    if ((OPTIONAL_ALLOWLIST[lib] || []).includes(dep)) return;
                    const at = libs.indexOf(dep);
                    if (at === -1 || at > idx) {
                        problems.push(`${lib} needs ${dep} loaded earlier`);
                    }
                });
            });
            expect(problems).toEqual([]);
        });
    });
});
