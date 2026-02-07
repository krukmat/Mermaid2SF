const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setViewportSize({ width: 1920, height: 1080 });

  try {
    console.log('📍 Testing final positioning...');
    await page.goto('http://localhost:4000/', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Open tutorial
    await page.click('#startTutorial');
    await page.waitForTimeout(1000);

    // Go to step 4
    for (let i = 0; i < 3; i++) {
      await page.click('#tutorialNext');
      await page.waitForTimeout(800);
    }

    // Step 4: Compile & preview
    console.log('\n📸 Capturing Step 4 (Compile & preview)...');
    await page.screenshot({ path: '/tmp/step4-final.png', fullPage: true });

    // Go to step 5
    await page.click('#tutorialNext');
    await page.waitForTimeout(800);

    // Step 5: Monitor issues
    console.log('📸 Capturing Step 5 (Monitor issues)...');
    await page.screenshot({ path: '/tmp/step5-final.png', fullPage: true });

    console.log('\n✅ Screenshots saved:');
    console.log('  - /tmp/step4-final.png');
    console.log('  - /tmp/step5-final.png');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();
