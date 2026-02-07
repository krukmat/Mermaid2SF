const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setViewportSize({ width: 1920, height: 1080 });

  try {
    console.log('📍 Testing first tutorial steps...\n');
    await page.goto('http://localhost:4000/', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Open tutorial
    await page.click('#startTutorial');
    await page.waitForTimeout(1000);

    // Step 1: Welcome
    console.log('=== STEP 1: Welcome ===');
    await page.screenshot({ path: '/tmp/step1.png', fullPage: true });

    // Go to step 2
    await page.click('#tutorialNext');
    await page.waitForTimeout(800);

    // Step 2: Add your first node
    console.log('📸 Captured Step 1');
    await page.screenshot({ path: '/tmp/step2.png', fullPage: true });
    console.log('📸 Captured Step 2');

    // Go to step 3
    await page.click('#tutorialNext');
    await page.waitForTimeout(800);

    // Step 3: Advanced nodes
    console.log('📸 Captured Step 3');
    await page.screenshot({ path: '/tmp/step3.png', fullPage: true });

    console.log('\n✅ Screenshots saved:');
    console.log('  - /tmp/step1.png');
    console.log('  - /tmp/step2.png');
    console.log('  - /tmp/step3.png');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();
