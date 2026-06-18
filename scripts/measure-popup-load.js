#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Measures the parse+eval cost that eager-loading mammoth.browser.min.js
 * imposes on every popup open. The bundle loads from local disk (no network),
 * so append->onload time ~= V8 parse+compile+eval of the 636KB UMD.
 * Also reports popup.html DOMContentLoaded as context.
 * Usage: node scripts/measure-popup-load.js
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const EXTENSION_PATH = path.resolve(__dirname, '../extension');
const PROFILE_DIR = '/tmp/linkedin-engage-measure';
const SAMPLES = 5;

fs.rmSync(PROFILE_DIR, { recursive: true, force: true });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

async function getExtensionId(context) {
  let sw = context.serviceWorkers()[0];
  if (!sw) sw = await context.waitForEvent('serviceworker', { timeout: 20000 });
  return sw.url().split('/')[2];
}

(async () => {
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-first-run', '--no-default-browser-check',
      '--disable-default-apps', '--disable-brave-update',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
  });
  await wait(3000);
  const extensionId = await getExtensionId(context);
  const popupUrl = `chrome-extension://${extensionId}/popup/popup.html`;
  const mammothUrl = `chrome-extension://${extensionId}/vendor/mammoth.browser.min.js`;

  const mammothMs = [];
  const dclMs = [];
  for (let i = 0; i < SAMPLES; i++) {
    const page = await context.newPage();
    await page.goto(popupUrl, { waitUntil: 'load' });
    // popup.html DOMContentLoaded relative to navigation start (lazy build)
    const dcl = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      return nav ? nav.domContentLoadedEventEnd - nav.startTime : null;
    });
    if (dcl != null) dclMs.push(dcl);
    // Isolated parse+eval cost of the mammoth bundle (what eager load forced)
    const t = await page.evaluate((url) => new Promise((resolve) => {
      const s = document.createElement('script');
      const start = performance.now();
      s.onload = () => resolve(performance.now() - start);
      s.onerror = () => resolve(-1);
      s.src = url;
      document.head.appendChild(s);
    }), mammothUrl);
    mammothMs.push(t);
    await page.close();
  }

  await context.close();
  console.log('Samples:', SAMPLES);
  console.log('mammoth parse+eval (ms):', mammothMs.map(x => x.toFixed(1)).join(', '),
    '-> median', median(mammothMs).toFixed(1));
  console.log('popup DOMContentLoaded (ms):', dclMs.map(x => x.toFixed(1)).join(', '),
    '-> median', median(dclMs).toFixed(1));
})().catch(e => { console.error(e); process.exit(1); });
