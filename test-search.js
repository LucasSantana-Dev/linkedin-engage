const { chromium } = require('playwright');
const path = require('path');

const USER_DATA_DIR = path.join(__dirname, 'linkedin_session');

async function testSearch() {
    const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
      headless: true,
      channel: 'chrome'
    });
    const page = await context.newPage();

    const queriesToTest = [
        '(recruiter OR "talent acquisition") (react OR node) senior',
        'recruiter (contract OR freelance) (react OR node)',
        'recruiter remote (brazil OR latam) (react OR node)',
        '(recruiter OR agency) staffing (react OR node) contract',
        'recruiter "next.js" aws senior'
    ];

    for (let i = 0; i < queriesToTest.length; i++) {
        const query = queriesToTest[i];
        console.log(`\\n--- Final Validation ${i+1}: ${query} ---`);
        const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}&origin=GLOBAL_SEARCH_HEADER`;
        await page.goto(searchUrl, { waitUntil: 'load' });
        await page.waitForTimeout(4000);
        const text = await page.innerText('body');
        if (text.includes('No results found')) {
            console.log('Result: NO RESULTS FOUND');
        } else {
            console.log('Result: FOUND SOMETHING!');
        }
    }

    await context.close();
}
testSearch().catch(console.error);
