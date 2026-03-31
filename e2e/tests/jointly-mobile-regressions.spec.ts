import { test, expect } from '@playwright/test';
import { navigateToPortfolioPage } from '../helpers/pages';
import { scrollToProgress, scrollToTechSection } from '../helpers/scroll';
import { getBox, isContainedInViewport } from '../helpers/geometry';

const JOINTLY_PATH = '/portfolio/jointly/';

test('tooltip is not clipped above ranking on mobile', async ({ page }) => {
  const viewport = page.viewportSize()!;
  test.skip(viewport.width > 600, 'mobile-only bug');
  test.setTimeout(60_000);

  await navigateToPortfolioPage(page, JOINTLY_PATH);
  await scrollToProgress(page, 0.8);

  // Find the topmost-ranked bar (smallest offsetTop) and tap it
  const tappedIdx = await page.evaluate(() => {
    const bars = Array.from(document.querySelectorAll('.ranking-bar')) as HTMLElement[];
    if (!bars.length) return -1;
    let topIdx = 0;
    for (let i = 1; i < bars.length; i++) {
      if (bars[i].offsetTop < bars[topIdx].offsetTop) topIdx = i;
    }
    bars[topIdx].dispatchEvent(new TouchEvent('touchstart', { bubbles: true }));
    return topIdx;
  });
  expect(tappedIdx).toBeGreaterThanOrEqual(0);

  // Wait for tooltip to appear
  await page.waitForSelector('#tooltip.visible', { timeout: 3_000 });

  const tooltipBox = await getBox(page.locator('#tooltip'));
  expect(tooltipBox.y).toBeGreaterThanOrEqual(-2); // not clipped above viewport
  expect(isContainedInViewport(tooltipBox, viewport.width, viewport.height)).toBe(true);
});

test('narrative lines fit within container on mobile', async ({ page }) => {
  const viewport = page.viewportSize()!;
  test.skip(viewport.width > 600, 'mobile-only bug');
  test.setTimeout(60_000);

  await navigateToPortfolioPage(page, JOINTLY_PATH);
  await scrollToProgress(page, 1.0);

  const narrativeBox = await getBox(page.locator('#narrative'));

  const clipped = await page.evaluate(() => {
    const container = document.getElementById('narrative');
    if (!container) return [];
    const cRect = container.getBoundingClientRect();
    const violations: string[] = [];
    document.querySelectorAll('.narrative-line').forEach((el, i) => {
      const style = getComputedStyle(el);
      if (parseFloat(style.opacity) === 0) return;
      const r = el.getBoundingClientRect();
      if (r.bottom > cRect.bottom + 2) {
        violations.push(`line ${i} bottom (${Math.round(r.bottom)}) exceeds container (${Math.round(cRect.bottom)})`);
      }
      if (r.top < cRect.top - 2) {
        violations.push(`line ${i} top (${Math.round(r.top)}) above container (${Math.round(cRect.top)})`);
      }
    });
    return violations;
  });

  expect(clipped, `Narrative clipping:\n${clipped.join('\n')}`).toHaveLength(0);
});

test('narrative recovers height after resize during collapse', async ({ page }) => {
  test.setTimeout(60_000);

  await navigateToPortfolioPage(page, JOINTLY_PATH);
  await scrollToProgress(page, 0.3);

  // Verify narrative is visible
  const initialHeight = await page.evaluate(() => {
    const el = document.getElementById('narrative');
    return el ? el.offsetHeight : 0;
  });
  expect(initialHeight).toBeGreaterThan(0);

  // Scroll to tech section to collapse narrative
  await scrollToTechSection(page);

  // Fire a resize event while collapsed (simulates mobile URL bar show/hide)
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  await page.waitForTimeout(200);

  // Scroll back to narrative region
  await scrollToProgress(page, 0.3);

  // Assert narrative has recovered
  const recovered = await page.evaluate(() => {
    const el = document.getElementById('narrative');
    if (!el) return { height: 0, opacity: 0, visibleLines: 0 };
    const style = getComputedStyle(el);
    let visibleLines = 0;
    document.querySelectorAll('.narrative-line').forEach((line) => {
      if (parseFloat(getComputedStyle(line).opacity) > 0) visibleLines++;
    });
    return {
      height: el.offsetHeight,
      opacity: parseFloat(style.opacity),
      visibleLines,
    };
  });

  expect(recovered.height).toBeGreaterThan(0);
  expect(recovered.opacity).toBeGreaterThan(0);
  expect(recovered.visibleLines).toBeGreaterThan(0);
});
