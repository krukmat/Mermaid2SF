const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  page.setViewportSize({ width: 1920, height: 1080 });

  try {
    console.log('📍 Debugging highlight positioning...\n');
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

    // Step 4: Capture positioning info
    console.log('=== STEP 4: Compile & preview ===');
    const step4Info = await page.evaluate(() => {
      const target = document.querySelector('#compileXml');
      const highlight = document.querySelector('#tutorialHighlight');

      if (!target || !highlight) return null;

      const targetRect = target.getBoundingClientRect();
      const highlightRect = highlight.getBoundingClientRect();

      return {
        target: {
          left: targetRect.left,
          top: targetRect.top,
          width: targetRect.width,
          height: targetRect.height,
          right: targetRect.right,
          bottom: targetRect.bottom
        },
        highlight: {
          left: highlightRect.left,
          top: highlightRect.top,
          width: highlightRect.width,
          height: highlightRect.height,
          right: highlightRect.right,
          bottom: highlightRect.bottom
        },
        styles: {
          highlightLeft: highlight.style.left,
          highlightTop: highlight.style.top,
          highlightWidth: highlight.style.width,
          highlightHeight: highlight.style.height
        },
        difference: {
          left: highlightRect.left - targetRect.left,
          top: highlightRect.top - targetRect.top,
          width: highlightRect.width - targetRect.width,
          height: highlightRect.height - targetRect.height
        }
      };
    });

    if (step4Info) {
      console.log('Target element (#compileXml):');
      console.log('  Position:', `left=${step4Info.target.left}, top=${step4Info.target.top}`);
      console.log('  Size:', `width=${step4Info.target.width}, height=${step4Info.target.height}`);
      console.log('\nHighlight element:');
      console.log('  Position:', `left=${step4Info.highlight.left}, top=${step4Info.highlight.top}`);
      console.log('  Size:', `width=${step4Info.highlight.width}, height=${step4Info.highlight.height}`);
      console.log('\nApplied styles:');
      console.log('  left:', step4Info.styles.highlightLeft);
      console.log('  top:', step4Info.styles.highlightTop);
      console.log('  width:', step4Info.styles.highlightWidth);
      console.log('  height:', step4Info.styles.highlightHeight);
      console.log('\nDifference (highlight - target):');
      console.log('  left offset:', step4Info.difference.left, '(expected: -9)');
      console.log('  top offset:', step4Info.difference.top, '(expected: -9)');
      console.log('  width extra:', step4Info.difference.width, '(expected: 18)');
      console.log('  height extra:', step4Info.difference.height, '(expected: 18)');
    }

    await page.screenshot({ path: '/tmp/step4-debug.png', fullPage: true });

    // Go to step 5
    await page.click('#tutorialNext');
    await page.waitForTimeout(800);

    // Step 5: Capture positioning info
    console.log('\n=== STEP 5: Monitor issues ===');
    const step5Info = await page.evaluate(() => {
      const target = document.querySelector('#statusDetails');
      const highlight = document.querySelector('#tutorialHighlight');

      if (!target || !highlight) return null;

      const targetRect = target.getBoundingClientRect();
      const highlightRect = highlight.getBoundingClientRect();

      return {
        target: {
          left: targetRect.left,
          top: targetRect.top,
          width: targetRect.width,
          height: targetRect.height,
          right: targetRect.right,
          bottom: targetRect.bottom
        },
        highlight: {
          left: highlightRect.left,
          top: highlightRect.top,
          width: highlightRect.width,
          height: highlightRect.height,
          right: highlightRect.right,
          bottom: highlightRect.bottom
        },
        styles: {
          highlightLeft: highlight.style.left,
          highlightTop: highlight.style.top,
          highlightWidth: highlight.style.width,
          highlightHeight: highlight.style.height
        },
        difference: {
          left: highlightRect.left - targetRect.left,
          top: highlightRect.top - targetRect.top,
          width: highlightRect.width - targetRect.width,
          height: highlightRect.height - targetRect.height
        }
      };
    });

    if (step5Info) {
      console.log('Target element (#statusDetails):');
      console.log('  Position:', `left=${step5Info.target.left}, top=${step5Info.target.top}`);
      console.log('  Size:', `width=${step5Info.target.width}, height=${step5Info.target.height}`);
      console.log('\nHighlight element:');
      console.log('  Position:', `left=${step5Info.highlight.left}, top=${step5Info.highlight.top}`);
      console.log('  Size:', `width=${step5Info.highlight.width}, height=${step5Info.highlight.height}`);
      console.log('\nApplied styles:');
      console.log('  left:', step5Info.styles.highlightLeft);
      console.log('  top:', step5Info.styles.highlightTop);
      console.log('  width:', step5Info.styles.highlightWidth);
      console.log('  height:', step5Info.styles.highlightHeight);
      console.log('\nDifference (highlight - target):');
      console.log('  left offset:', step5Info.difference.left, '(expected: -9)');
      console.log('  top offset:', step5Info.difference.top, '(expected: -9)');
      console.log('  width extra:', step5Info.difference.width, '(expected: 18)');
      console.log('  height extra:', step5Info.difference.height, '(expected: 18)');
    }

    await page.screenshot({ path: '/tmp/step5-debug.png', fullPage: true });

    console.log('\n✅ Debug screenshots saved:');
    console.log('  - /tmp/step4-debug.png');
    console.log('  - /tmp/step5-debug.png');

    // Keep browser open for 10 seconds to allow manual inspection
    console.log('\n⏳ Browser will stay open for 10 seconds for manual inspection...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();
