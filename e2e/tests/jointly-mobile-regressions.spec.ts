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

test('tooltip appears above narrative on mobile (z-index)', async ({ page }) => {
  const viewport = page.viewportSize()!;
  test.skip(viewport.width > 600, 'mobile-only bug');
  test.setTimeout(60_000);

  await navigateToPortfolioPage(page, JOINTLY_PATH);
  await scrollToProgress(page, 0.8);

  // Tap the topmost-ranked bar
  await page.evaluate(() => {
    const bars = Array.from(document.querySelectorAll('.ranking-bar')) as HTMLElement[];
    if (!bars.length) return;
    let topIdx = 0;
    for (let i = 1; i < bars.length; i++) {
      if (bars[i].offsetTop < bars[topIdx].offsetTop) topIdx = i;
    }
    bars[topIdx].dispatchEvent(new TouchEvent('touchstart', { bubbles: true }));
  });

  await page.waitForSelector('#tooltip.visible', { timeout: 3_000 });

  const tooltipBox = await getBox(page.locator('#tooltip'));
  const tooltipCenterX = tooltipBox.x + tooltipBox.width / 2;
  const tooltipCenterY = tooltipBox.y + tooltipBox.height / 2;

  // Tooltip has pointer-events:none, so temporarily enable for elementFromPoint check
  const topEl = await page.evaluate(([cx, cy]) => {
    const tip = document.getElementById('tooltip')!;
    tip.style.pointerEvents = 'auto';
    const el = document.elementFromPoint(cx, cy);
    tip.style.pointerEvents = '';
    if (!el) return null;
    return el.id || el.closest('#tooltip')?.id || el.tagName;
  }, [tooltipCenterX, tooltipCenterY]);
  expect(topEl).toBe('tooltip');
});

test('tooltip toggles reliably on repeated taps', async ({ page }) => {
  const viewport = page.viewportSize()!;
  test.skip(viewport.width > 600, 'mobile-only bug');
  test.setTimeout(60_000);

  await navigateToPortfolioPage(page, JOINTLY_PATH);
  await scrollToProgress(page, 0.8);

  const tapBar = (barIndex: number) =>
    page.evaluate((idx) => {
      const bars = document.querySelectorAll('.ranking-bar');
      bars[idx]?.dispatchEvent(new TouchEvent('touchstart', { bubbles: true }));
    }, barIndex);

  const isTooltipVisible = () =>
    page.evaluate(() => document.querySelector('#tooltip')?.classList.contains('visible') ?? false);

  const activeBarIndex = () =>
    page.evaluate(() => {
      const bars = Array.from(document.querySelectorAll('.ranking-bar'));
      const idx = bars.findIndex(b => b.classList.contains('touch-active'));
      return idx;
    });

  // Tap bar 0 → visible, bar 0 outlined
  await tapBar(0);
  await page.waitForSelector('#tooltip.visible', { timeout: 3_000 });
  expect(await isTooltipVisible()).toBe(true);
  expect(await activeBarIndex()).toBe(0);

  // Tap bar 0 again → hidden (toggle off), no bar outlined
  await tapBar(0);
  await page.waitForTimeout(200);
  expect(await isTooltipVisible()).toBe(false);
  expect(await activeBarIndex()).toBe(-1);

  // Tap bar 0 again → visible (toggle back on), bar 0 outlined
  await tapBar(0);
  await page.waitForSelector('#tooltip.visible', { timeout: 3_000 });
  expect(await isTooltipVisible()).toBe(true);
  expect(await activeBarIndex()).toBe(0);

  // Tap bar 1 → switches, bar 1 outlined (not bar 0)
  await tapBar(1);
  await page.waitForSelector('#tooltip.visible', { timeout: 3_000 });
  expect(await isTooltipVisible()).toBe(true);
  expect(await activeBarIndex()).toBe(1);

  // Tap elsewhere → hidden, no bar outlined
  await page.evaluate(() => {
    document.body.dispatchEvent(new TouchEvent('touchstart', { bubbles: true }));
  });
  await page.waitForTimeout(200);
  expect(await isTooltipVisible()).toBe(false);
  expect(await activeBarIndex()).toBe(-1);
});

test('tooltip switches between bars on consecutive taps', async ({ page }) => {
  const viewport = page.viewportSize()!;
  test.skip(viewport.width > 600, 'mobile-only bug');
  test.setTimeout(60_000);

  await navigateToPortfolioPage(page, JOINTLY_PATH);
  await scrollToProgress(page, 0.8);

  const tapBarAndGetName = async (barIndex: number) => {
    await page.evaluate((idx) => {
      const bars = document.querySelectorAll('.ranking-bar');
      bars[idx]?.dispatchEvent(new TouchEvent('touchstart', { bubbles: true }));
    }, barIndex);
    await page.waitForSelector('#tooltip.visible', { timeout: 3_000 });
    return page.evaluate(() => {
      const name = document.querySelector('.tooltip-name');
      return name?.textContent ?? '';
    });
  };

  // Get expected seller names from the data
  const sellerNames = await page.evaluate(() => {
    const bars = document.querySelectorAll('.ranking-bar');
    return Array.from(bars).map((_, i) => {
      // Seller names are embedded in tooltip HTML by index
      const sellers = ['BulkBazaar', 'QuickShip', 'ValueVault', 'TrustTrade', 'BonusBarn'];
      return sellers[i];
    });
  });

  // Tap bar 0, 1, 2 in sequence — each should show the correct seller
  const name0 = await tapBarAndGetName(0);
  expect(name0).toContain(sellerNames[0]);

  const name1 = await tapBarAndGetName(1);
  expect(name1).toContain(sellerNames[1]);

  const name2 = await tapBarAndGetName(2);
  expect(name2).toContain(sellerNames[2]);
});
