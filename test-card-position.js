const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  page.setViewportSize({ width: 1920, height: 1080 });

  try {
    console.log('📍 Testing tutorial card positioning...\n');
    await page.goto('http://localhost:4000/', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Open tutorial
    await page.click('#startTutorial');
    await page.waitForTimeout(1000);

    // Go to step 4 (Compile & preview)
    for (let i = 0; i < 3; i++) {
      await page.click('#tutorialNext');
      await page.waitForTimeout(800);
    }

    // Step 4: Capture card position info
    console.log('=== STEP 4: Compile & preview ===');
    const step4Info = await page.evaluate(() => {
      const card = document.querySelector('.tutorial-card');
      const highlight = document.querySelector('#tutorialHighlight');
      const target = document.querySelector('#compileXml');

      if (!card || !highlight || !target) return null;

      const cardRect = card.getBoundingClientRect();
      const highlightRect = highlight.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();

      return {
        card: {
          left: cardRect.left,
          top: cardRect.top,
          width: cardRect.width,
          height: cardRect.height,
          bottom: cardRect.bottom,
          visible: window.getComputedStyle(card).visibility !== 'hidden'
        },
        highlight: {
          top: highlightRect.top,
          bottom: highlightRect.bottom
        },
        target: {
          top: targetRect.top,
          bottom: targetRect.bottom
        },
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      };
    });

    if (step4Info) {
      console.log('Tutorial card:');
      console.log('  Position:', `left=${step4Info.card.left}, top=${step4Info.card.top}`);
      console.log('  Size:', `width=${step4Info.card.width}, height=${step4Info.card.height}`);
      console.log('  Visible:', step4Info.card.visible);
      console.log('\nHighlight:');
      console.log('  Top:', step4Info.highlight.top);
      console.log('  Bottom:', step4Info.highlight.bottom);
      console.log('\nTarget (#compileXml):');
      console.log('  Top:', step4Info.target.top);
      console.log('  Bottom:', step4Info.target.bottom);
      console.log('\nRelation:');
      console.log('  Card is above highlight:', step4Info.card.bottom < step4Info.highlight.top ? 'YES ✓' : 'NO ✗');
      console.log('  Card top - Highlight top:', (step4Info.card.top - step4Info.highlight.top).toFixed(2));
    }

    await page.screenshot({ path: '/tmp/step4-card-debug.png', fullPage: true });

    // Go to step 5
    await page.click('#tutorialNext');
    await page.waitForTimeout(800);

    // Step 5: Capture card position info
    console.log('\n=== STEP 5: Monitor issues ===');
    const step5Info = await page.evaluate(() => {
      const card = document.querySelector('.tutorial-card');
      const highlight = document.querySelector('#tutorialHighlight');
      const target = document.querySelector('#statusDetails');

      if (!card || !highlight || !target) return null;

      const cardRect = card.getBoundingClientRect();
      const highlightRect = highlight.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();

      return {
        card: {
          left: cardRect.left,
          top: cardRect.top,
          width: cardRect.width,
          height: cardRect.height,
          bottom: cardRect.bottom,
          visible: window.getComputedStyle(card).visibility !== 'hidden'
        },
        highlight: {
          top: highlightRect.top,
          bottom: highlightRect.bottom
        },
        target: {
          top: targetRect.top,
          bottom: targetRect.bottom
        },
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      };
    });

    if (step5Info) {
      console.log('Tutorial card:');
      console.log('  Position:', `left=${step5Info.card.left}, top=${step5Info.card.top}`);
      console.log('  Size:', `width=${step5Info.card.width}, height=${step5Info.card.height}`);
      console.log('  Visible:', step5Info.card.visible);
      console.log('\nHighlight:');
      console.log('  Top:', step5Info.highlight.top);
      console.log('  Bottom:', step5Info.highlight.bottom);
      console.log('\nTarget (#statusDetails):');
      console.log('  Top:', step5Info.target.top);
      console.log('  Bottom:', step5Info.target.bottom);
      console.log('\nRelation:');
      console.log('  Card is above highlight:', step5Info.card.bottom < step5Info.highlight.top ? 'YES ✓' : 'NO ✗');
      console.log('  Card top - Highlight top:', (step5Info.card.top - step5Info.highlight.top).toFixed(2));
    }

    await page.screenshot({ path: '/tmp/step5-card-debug.png', fullPage: true });

    console.log('\n✅ Debug screenshots saved:');
    console.log('  - /tmp/step4-card-debug.png');
    console.log('  - /tmp/step5-card-debug.png');

    console.log('\n⏳ Browser will stay open for 10 seconds for manual inspection...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();
