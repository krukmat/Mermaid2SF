const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  page.setViewportSize({ width: 1920, height: 1080 });

  try {
    console.log('📍 Testing card positioning logic...\n');
    await page.goto('http://localhost:4000/', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Open tutorial
    await page.click('#startTutorial');
    await page.waitForTimeout(1000);

    // Go to step 4
    for (let i = 0; i < 3; i++) {
      await page.click('#tutorialNext');
      await page.waitForTimeout(1000);
    }

    // Step 4: Debug positioning logic
    console.log('=== STEP 4 DEBUG ===');
    const debug4 = await page.evaluate(() => {
      const highlight = document.querySelector('#tutorialHighlight');
      const highlightRect = highlight.getBoundingClientRect();

      const cardWidth = 380;
      const cardHeight = 180;
      const padding = 20;
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      const highlightTop = highlightRect.top;
      const highlightBottom = highlightRect.bottom;
      const spaceAbove = highlightTop - 80;
      const spaceBelow = viewportHeight - highlightBottom;

      const shouldBeAbove = spaceAbove >= cardHeight + padding;
      const shouldBeBelow = spaceBelow >= cardHeight + padding;

      return {
        highlightTop,
        highlightBottom,
        spaceAbove,
        spaceBelow,
        cardHeight,
        padding,
        viewportHeight,
        shouldBeAbove,
        shouldBeBelow,
        expectedTop: shouldBeAbove ? highlightTop - cardHeight - padding :
                     (shouldBeBelow ? highlightBottom + padding : padding + 80)
      };
    });

    console.log('Highlight top:', debug4.highlightTop);
    console.log('Highlight bottom:', debug4.highlightBottom);
    console.log('Space above (minus header):', debug4.spaceAbove);
    console.log('Space below:', debug4.spaceBelow);
    console.log('Card height needed:', debug4.cardHeight);
    console.log('Padding:', debug4.padding);
    console.log('\nLogic:');
    console.log('  Should position above?', debug4.shouldBeAbove, `(space: ${debug4.spaceAbove} >= ${debug4.cardHeight + debug4.padding})`);
    console.log('  Should position below?', debug4.shouldBeBelow, `(space: ${debug4.spaceBelow} >= ${debug4.cardHeight + debug4.padding})`);
    console.log('  Expected card top:', debug4.expectedTop);

    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();
