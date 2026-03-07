const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const pino = require('pino');
const chalk = require('chalk');

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  }
});

const app = express();
app.use(cors());
app.use(express.json());

const CACHED_SELECTORS_FILE = path.join(__dirname, 'cached-selectors.json');
const USER_DATA_DIR = path.join(__dirname, 'linkedin_session');

// Delay helper for human-like pauses
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runAutomation(searchQuery) {
  let context;
  try {
    // 1. Launch Persistent Browser
    logger.info(chalk.cyan('Launching browser...'));
    context = await chromium.launchPersistentContext(USER_DATA_DIR, {
      headless: false, // Keep false for manual login if needed, true for production background
      channel: 'chrome',
      args: ['--disable-notifications']
    });

    const page = await context.newPage();

    // 2. Navigate and Check Login Options
    let searchUrl = '';
    if (searchQuery.startsWith('http')) {
        logger.info(chalk.cyan(`Navigating to provided search URL: ${searchQuery.substring(0, 50)}...`));
        searchUrl = searchQuery;
    } else {
        logger.info(chalk.blue(`[BOT] Navigating to search URL with keyword query: `) + chalk.yellow(searchQuery));
        const encodedQuery = encodeURIComponent(searchQuery);
        // Includes: US (103644278), Canada (101121807), UK (101165590), Germany (101282230), Netherlands (102890719)
        const geoFilter = '%5B%22103644278%22%2C%22101121807%22%2C%22101165590%22%2C%22101282230%22%2C%22102890719%22%5D';
        searchUrl = `https://www.linkedin.com/search/results/people/?geoUrn=${geoFilter}&keywords=${encodedQuery}&origin=FACETED_SEARCH`;
    }

    await page.goto(searchUrl, { waitUntil: 'load', timeout: 60000 });

    // Check if we hit the login gate
    const currentUrl = page.url();
    if (currentUrl.includes('login') || currentUrl.includes('authwall') || currentUrl.includes('checkpoint')) {
      logger.warn(chalk.yellow('Not logged in. You have 120 seconds to login manually in the browser window.'));
      logger.info(chalk.cyan('Awaiting manual login...'));
      await page.waitForURL('**/search/results/people/**', { timeout: 120000 });
      logger.info(chalk.green('Manual login detected! Continuing automation...'));
    } else {
        logger.info(chalk.green('Already logged in, proceeding with search results.'));
    }

    // Give the page a moment to fully render the results
    await delay(3000);

    // Scroll down slowly to trigger lazy loading of search results
    logger.info(chalk.blue('[BOT] Scrolling down to load lazy-rendered search results...'));
    for (let i = 0; i < 4; i++) {
        await page.mouse.wheel(0, 600);
        await delay(1000);
    }

    // Scroll back up to the top
    await page.evaluate(() => window.scrollTo(0, 0));
    await delay(1000);

    // 3. Find and Click Connect Buttons
    logger.info(chalk.blue('[BOT] Searching for "Connect" buttons on the page...'));

    // Attempt 1: Look for exact Connect buttons
    let connectButtons = await page.$$('button:has-text("Connect")');

    let buttonsClicked = 0;

    logger.info(chalk.blue(`[BOT] Found `) + chalk.green(connectButtons.length) + chalk.blue(` potential 'Connect' buttons in the current view.`));

    for (const button of connectButtons) {
        if (buttonsClicked >= 5) { // Limit for testing/safety
            logger.warn(chalk.yellow('Reached limit of 5 clicks per run.'));
            break;
        }

        try {
            await button.scrollIntoViewIfNeeded();
            await delay(1000 + Math.random() * 1500); // Random delay 1-2.5s

            await button.click();
            logger.info(chalk.cyan(`Clicked Connect button ${buttonsClicked + 1}`));

            // 4. Handle Modal (Send with a note)
            try {
                // Wait to see if the "Add a note" button is available
                const addNoteBtn = await page.$('button[aria-label="Add a note"]', { timeout: 3000 });
                if (addNoteBtn) {
                    await addNoteBtn.click();
                    await delay(1000);

                    // Try to extract the person's name to personalize the note
                    let personName = "there";
                    try {
                        logger.info(chalk.blue('[BOT] Attempting to extract candidate name from the modal...'));
                        const modalTitle = await page.$eval('h2[id="send-invite-modal"]', el => el.innerText).catch(() => null);
                        if (modalTitle && modalTitle.includes("Invite ")) {
                            const parts = modalTitle.split(' ');
                            if (parts.length > 1) {
                                personName = parts[1];
                                logger.info(chalk.blue(`[BOT] Extracted name from modal title: `) + chalk.green(personName));
                            }
                        } else {
                            const ariaLabel = await button.getAttribute('aria-label');
                            if (ariaLabel && ariaLabel.includes("Invite ")) {
                                const parts = ariaLabel.split(' ');
                                if (parts.length > 1) {
                                    personName = parts[1];
                                    logger.info(chalk.blue(`[BOT] Extracted name from button aria-label: `) + chalk.green(personName));
                                }
                            }
                        }
                    } catch (e) {
                        logger.warn(chalk.yellow("[BOT] Could not extract name, using fallback 'there'."));
                    }

                    // Craft the personalized note
                    const noteText = `Hi ${personName}, I came across your profile and thought it would be great to connect. I’m always looking to expand my professional network. Looking forward to staying in touch!`;

                    // Find the textarea and type the note
                    const textArea = await page.$('textarea[name="message"]');
                    if (textArea) {
                        logger.info(chalk.blue(`[BOT] Typing personalized message for `) + chalk.green(personName) + chalk.blue(`...`));
                        await textArea.fill(noteText);
                        await delay(1500);

                        // Click Send
                        logger.info(chalk.blue(`[BOT] Looking for Send button to finalize connection...`));
                        const sendBtn = await page.$('button[aria-label="Send now"]', { timeout: 2000 }) ||
                                        await page.$('button:has-text("Send")');
                        if (sendBtn) {
                            await sendBtn.click();
                            logger.info(chalk.green(`[BOT] ✅ Connection request sent successfully to ${personName} with a custom note.`));
                            buttonsClicked++;
                        } else {
                           logger.warn(chalk.yellow("[BOT] ⚠️ Could not find the 'Send' button after typing note."));
                        }
                    } else {
                        logger.warn(chalk.yellow("[BOT] ⚠️ Could not find the textarea to type the note."));
                    }

                } else {
                    // Fallback to sending without a note if the "Add a note" button isn't there
                    logger.warn(chalk.yellow("'Add a note' button not found, falling back to sending without a note."));
                    const sendButtonSelectors = [
                        'button[aria-label="Send now"]',
                        'button[aria-label="Send without a note"]',
                        'button span:has-text("Send")'
                    ];

                    let modalClicked = false;
                    for (const selector of sendButtonSelectors) {
                        try {
                            const sendBtn = await page.$(selector, { timeout: 2000 });
                            if (sendBtn) {
                                 await sendBtn.click();
                                 logger.info(chalk.green("Connection request sent (Without note fallback)."));
                                 modalClicked = true;
                                 buttonsClicked++;
                                 break;
                            }
                        } catch(e) { }
                    }

                    if (!modalClicked) {
                        logger.error(chalk.red("Could not find the 'Send' button. Closing modal."));
                        const closeBtn = await page.$('button[aria-label="Dismiss"]');
                        if (closeBtn) await closeBtn.click();
                    }
                }

                await delay(2000 + Math.random() * 3000);

            } catch (modalError) {
                logger.error(chalk.red('Error handling modal: ' + modalError.message));
            }

        } catch (clickError) {
             logger.error(chalk.red('Error clicking a connect button: ' + clickError.message));
        }
    }

    logger.info(chalk.green(`Automation complete. Sent ${buttonsClicked} requests.`));
    await context.close();
    return { success: true, message: `Successfully executed. Sent ${buttonsClicked} connection requests.` };

  } catch (error) {
    logger.error(chalk.red('Automation encountered an error: ' + error.stack || error));
    if (context) await context.close();
    return { success: false, error: error.message };
  }
}

// --- EXPRESS API ROUTES ---

const searchQueries = [
    '(recruiter OR "talent acquisition") (react OR node) senior',
    'recruiter (contract OR freelance) (react OR node)',
    'recruiter remote (brazil OR latam) (react OR node)',
    '(recruiter OR agency) staffing (react OR node) contract',
    'recruiter "next.js" aws senior'
];

app.post('/api/linkedin/connect', async (req, res) => {
    logger.info(chalk.magenta('\\n--- Incoming Local Trigger Request ---'));

    logger.info(chalk.blue('[BOT] Picking a random highly-targeted Contractor query...'));
    const query = searchQueries[Math.floor(Math.random() * searchQueries.length)];

    logger.info(chalk.blue(`[BOT] Loaded Search Query: `) + chalk.yellow(query));

    // Send immediate response so the caller doesn't timeout
    res.json({ success: true, message: 'Automation triggered locally. Running in background.', query });

    // Run automation asynchronously
    await runAutomation(query);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    logger.info(chalk.bold.green(`\\n========================================`));
    logger.info(chalk.bold.green(`🚀 LinkedIn Automation Locally API running`));
    logger.info(chalk.bold.green(`========================================`));
    logger.info(chalk.cyan(`To trigger the automation, run in another terminal:`));
    logger.info(chalk.yellow(`curl -X POST http://localhost:${PORT}/api/linkedin/connect`));
    logger.info(chalk.bold.green(`========================================\\n`));
});
