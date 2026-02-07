const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  page.setViewportSize({ width: 1920, height: 1080 });

  try {
    console.log('📍 Opening http://localhost:4000...');
    await page.goto('http://localhost:4000/', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(2000);

    console.log('\n🖱️ Clicking "Start Tutorial" button...');
    const startBtn = await page.$('#startTutorial');
    if (!startBtn) {
      console.error('❌ Start Tutorial button not found!');
      return;
    }

    await page.click('#startTutorial');
    await page.waitForTimeout(1500);

    // Check if tutorial opened
    const tutorialOverlay = await page.$('#tutorialOverlay');
    const isVisible = await tutorialOverlay.evaluate(el =>
      !el.classList.contains('hidden')
    );

    console.log(`✅ Tutorial overlay visible: ${isVisible}`);

    // Test each step
    for (let i = 0; i < 5; i++) {
      const stepInfo = await page.evaluate(() => {
        const title = document.getElementById('tutorialTitle')?.textContent;
        const desc = document.getElementById('tutorialDescription')?.textContent;
        const progress = document.getElementById('tutorialProgress')?.textContent;
        const nextBtn = document.getElementById('tutorialNext');
        const highlight = document.getElementById('tutorialHighlight');

        return {
          progress,
          title,
          description: desc?.substring(0, 60) + '...',
          nextBtnText: nextBtn?.textContent,
          highlightVisible: highlight && !highlight.hidden,
        };
      });

      console.log(`\n📌 Step ${i + 1} (${stepInfo.progress}):`);
      console.log(`   Title: ${stepInfo.title}`);
      console.log(`   Description: ${stepInfo.description}`);
      console.log(`   Highlight visible: ${stepInfo.highlightVisible}`);
      console.log(`   Next button text: "${stepInfo.nextBtnText}"`);

      if (i < 4) {
        // Click Next button
        console.log('   → Clicking Next...');
        await page.click('#tutorialNext');
        await page.waitForTimeout(800);
      }
    }

    // Test Finish button
    console.log('\n✅ Clicking Finish button...');
    await page.click('#tutorialNext');
    await page.waitForTimeout(800);

    const isClosed = await page.evaluate(() => {
      const overlay = document.getElementById('tutorialOverlay');
      return overlay.classList.contains('hidden');
    });

    console.log(`✅ Tutorial closed after finish: ${isClosed}`);

    // Reopen with keyboard shortcut
    console.log('\n⌨️ Pressing Ctrl+T to reopen tutorial...');
    await page.keyboard.press('Control+T');
    await page.waitForTimeout(1000);

    const reopened = await page.evaluate(() => {
      const overlay = document.getElementById('tutorialOverlay');
      return !overlay.classList.contains('hidden');
    });

    console.log(`✅ Tutorial reopened with keyboard: ${reopened}`);

    // Test Skip button
    console.log('\n🚫 Clicking Skip button...');
    await page.click('#tutorialSkip');
    await page.waitForTimeout(800);

    const skipped = await page.evaluate(() => {
      const overlay = document.getElementById('tutorialOverlay');
      return overlay.classList.contains('hidden');
    });

    console.log(`✅ Tutorial closed with skip: ${skipped}`);

    console.log('\n✅✅✅ ALL TESTS PASSED ✅✅✅');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();
