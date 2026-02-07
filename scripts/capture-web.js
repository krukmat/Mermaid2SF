/* eslint-env node */
/* eslint-disable @typescript-eslint/no-require-imports */
// TASK: Capture web visualizer screenshot for analysis
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();

  try {
    console.log('Navigating to http://localhost:4000/...');
    await page.goto('http://localhost:4000/', {
      waitUntil: 'load',
      timeout: 30000,
    });

    // Wait for dynamic content and JavaScript execution
    await page.waitForTimeout(3000);

    // Wait for hero section to be visible
    try {
      await page.waitForSelector('.hero', { timeout: 5000 });
      console.log('✓ Hero section loaded');
    } catch (error) {
      console.log('! Hero section not found (may be OK if page loaded)', error?.message);
    }

    // Take full page screenshot
    await page.screenshot({
      path: 'docs/assets/web-visualizer-full.png',
      fullPage: true,
    });
    console.log('✓ Full page screenshot saved to docs/assets/web-visualizer-full.png');

    // Take viewport screenshot
    await page.screenshot({
      path: 'docs/assets/web-visualizer-viewport.png',
      fullPage: false,
    });
    console.log('✓ Viewport screenshot saved to docs/assets/web-visualizer-viewport.png');

    // Get page title and basic info
    const title = await page.title();
    const url = page.url();
    console.log(`\nPage Info:\n- Title: ${title}\n- URL: ${url}`);

    // Get some basic metrics
    /* eslint-disable no-undef */
    const metrics = await page.evaluate(() => {
      return {
        buttons: document.querySelectorAll('button').length,
        inputs: document.querySelectorAll('input, textarea').length,
        canvases: document.querySelectorAll('canvas').length,
        svgs: document.querySelectorAll('svg').length,
      };
    });
    /* eslint-enable no-undef */
    console.log('\nPage Metrics:', metrics);
  } catch (error) {
    console.error('Error capturing page:', error.message);
  } finally {
    await browser.close();
  }
})();
