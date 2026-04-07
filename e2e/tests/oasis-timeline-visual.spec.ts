import { test, expect } from '@playwright/test';
import { navigateToPortfolioPage } from '../helpers/pages';
import { scrollToTechSection, scrollToBottom } from '../helpers/scroll';
import { getBox, hasHorizontalOverflow, isContainedInViewport } from '../helpers/geometry';

const OASIS_PATH = '/portfolio/oasis/';

/**
 * Scroll deep enough into the tech-content section that the Row 2
 * GSAP fade-in (trigger: top 85%) has fired and the visual is visible.
 */
async function scrollToRow2(page: import('@playwright/test').Page) {
  await scrollToTechSection(page);
  // Scroll a bit further so Row 2 is well within the viewport
  await page.evaluate(() => {
    const row2 = document.querySelectorAll('#tech-content .row')[1];
    if (row2) {
      const rect = row2.getBoundingClientRect();
      const y = rect.top + window.scrollY - window.innerHeight * 0.5;
      window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
    }
  });
  await page.waitForTimeout(1000);
}

// ── Structure tests ──────────────────────────────────────────────

test('tl-compare container exists with both panels', async ({ page }) => {
  test.setTimeout(60_000);
  await navigateToPortfolioPage(page, OASIS_PATH);

  const tlCompare = page.locator('.tl-compare');
  await expect(tlCompare).toHaveCount(1);
  await expect(tlCompare).toHaveAttribute('aria-hidden', 'true');

  const tlPaper = page.locator('.tl-paper');
  const tlDigital = page.locator('.tl-digital');
  await expect(tlPaper).toHaveCount(1);
  await expect(tlDigital).toHaveCount(1);
});

test('paper SVG has 6 nodes and 5 connectors', async ({ page }) => {
  test.setTimeout(60_000);
  await navigateToPortfolioPage(page, OASIS_PATH);

  const nodes = page.locator('.tl-paper .tl-node-dim');
  await expect(nodes).toHaveCount(6);

  const connectors = page.locator('.tl-paper .tl-dash-dim');
  await expect(connectors).toHaveCount(5);
});

test('paper SVG has 6 step labels', async ({ page }) => {
  test.setTimeout(60_000);
  await navigateToPortfolioPage(page, OASIS_PATH);

  const labels = page.locator('.tl-paper .tl-label-dim');
  // 6 step labels + 1 "Paper" panel label = 7 total
  await expect(labels).toHaveCount(7);
});

test('digital SVG has scan node and 5 fan-out lines', async ({ page }) => {
  test.setTimeout(60_000);
  await navigateToPortfolioPage(page, OASIS_PATH);

  const scanNode = page.locator('.tl-digital .tl-scan-node');
  await expect(scanNode).toHaveCount(1);

  const fanLines = page.locator('.tl-digital .tl-fan-line');
  await expect(fanLines).toHaveCount(5);
});

test('digital SVG has 5 outcome labels and a time badge', async ({ page }) => {
  test.setTimeout(60_000);
  await navigateToPortfolioPage(page, OASIS_PATH);

  const outcomes = page.locator('.tl-digital .tl-label-bright');
  await expect(outcomes).toHaveCount(5);

  const badge = page.locator('.tl-digital .tl-time-badge');
  await expect(badge).toHaveCount(1);
});

test('all fan-out lines have arrow markers', async ({ page }) => {
  test.setTimeout(60_000);
  await navigateToPortfolioPage(page, OASIS_PATH);

  const markerCount = await page.evaluate(() => {
    const lines = document.querySelectorAll('.tl-digital .tl-fan-line');
    let count = 0;
    lines.forEach(line => {
      if (line.getAttribute('marker-end')?.includes('tl-arrow')) count++;
    });
    return count;
  });
  expect(markerCount).toBe(5);
});

// ── Layout tests ─────────────────────────────────────────────────

test('visual is contained within row-visual at desktop width', async ({ page }) => {
  const viewport = page.viewportSize()!;
  test.skip(viewport.width < 800, 'desktop layout test');
  test.setTimeout(60_000);

  await navigateToPortfolioPage(page, OASIS_PATH);
  await scrollToRow2(page);

  const compareBox = await getBox(page.locator('.tl-compare'));
  expect(compareBox.width).toBeGreaterThan(0);
  expect(compareBox.width).toBeLessThanOrEqual(400 + 2); // max-width: 400px + tolerance
});

test('visual respects max-width constraint on mobile', async ({ page }) => {
  const viewport = page.viewportSize()!;
  test.skip(viewport.width >= 800, 'mobile layout test');
  test.setTimeout(60_000);

  await navigateToPortfolioPage(page, OASIS_PATH);
  await scrollToRow2(page);

  const compareBox = await getBox(page.locator('.tl-compare'));
  expect(compareBox.width).toBeGreaterThan(0);
  expect(compareBox.width).toBeLessThanOrEqual(viewport.width + 2);
});

test('no horizontal overflow after scrolling to timeline visual', async ({ page }) => {
  test.setTimeout(60_000);
  await navigateToPortfolioPage(page, OASIS_PATH);
  await scrollToRow2(page);

  const overflow = await hasHorizontalOverflow(page);
  expect(overflow).toBe(false);
});

test('both panels have non-zero dimensions when visible', async ({ page }) => {
  test.setTimeout(60_000);
  await navigateToPortfolioPage(page, OASIS_PATH);
  await scrollToRow2(page);

  const paperBox = await getBox(page.locator('.tl-paper'));
  expect(paperBox.width).toBeGreaterThan(50);
  expect(paperBox.height).toBeGreaterThan(20);

  const digitalBox = await getBox(page.locator('.tl-digital'));
  expect(digitalBox.width).toBeGreaterThan(50);
  expect(digitalBox.height).toBeGreaterThan(20);
});

// ── Height comparison with sibling visuals ───────────────────────

test('timeline visual height is comparable to sibling row visuals', async ({ page }) => {
  test.setTimeout(60_000);
  await navigateToPortfolioPage(page, OASIS_PATH);
  await scrollToBottom(page);

  const heights = await page.evaluate(() => {
    const rows = document.querySelectorAll('#tech-content .row');
    const results: Record<string, number> = {};
    rows.forEach((row, i) => {
      const visual = row.querySelector('.row-visual');
      if (visual) {
        const rect = visual.getBoundingClientRect();
        results[`row${i}`] = rect.height;
      }
    });
    return results;
  });

  const row0Height = heights['row0']; // arch SVG
  const row1Height = heights['row1']; // timeline (our new visual)
  const row2Height = heights['row2']; // recon bars

  expect(row1Height).toBeGreaterThan(0);

  // Timeline visual should be within 3x of sibling heights (generous tolerance
  // since exact heights vary by viewport — we just want to catch gross mismatches)
  if (row0Height > 0) {
    expect(row1Height).toBeLessThan(row0Height * 3);
    expect(row1Height).toBeGreaterThan(row0Height * 0.3);
  }
  if (row2Height > 0) {
    expect(row1Height).toBeLessThan(row2Height * 3);
    expect(row1Height).toBeGreaterThan(row2Height * 0.3);
  }
});

// ── CSS animation tests ──────────────────────────────────────────

test('digital panel has tl-sweep glow animation', async ({ page }) => {
  test.setTimeout(60_000);
  await navigateToPortfolioPage(page, OASIS_PATH);

  const animName = await page.evaluate(() => {
    const el = document.querySelector('.tl-digital');
    if (!el) return '';
    return getComputedStyle(el).animationName;
  });
  expect(animName).toContain('tl-sweep');
});

test('fan-out lines have dash-flow animation', async ({ page }) => {
  test.setTimeout(60_000);
  await navigateToPortfolioPage(page, OASIS_PATH);

  const animName = await page.evaluate(() => {
    const el = document.querySelector('.tl-fan-line');
    if (!el) return '';
    return getComputedStyle(el).animationName;
  });
  expect(animName).toContain('dash-flow');
});

// ── Reduced motion test ──────────────────────────────────────────

test('animations are disabled with prefers-reduced-motion', async ({ page }) => {
  test.setTimeout(60_000);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await navigateToPortfolioPage(page, OASIS_PATH);

  const animations = await page.evaluate(() => {
    const digital = document.querySelector('.tl-digital');
    const fanLine = document.querySelector('.tl-fan-line');
    return {
      digitalAnim: digital ? getComputedStyle(digital).animationName : '',
      fanLineAnim: fanLine ? getComputedStyle(fanLine).animationName : '',
    };
  });

  // With reduced motion, animation-name should be 'none' or the animation duration 0
  const digitalNone = animations.digitalAnim === 'none' || animations.digitalAnim === '';
  const fanLineNone = animations.fanLineAnim === 'none' || animations.fanLineAnim === '';
  expect(digitalNone).toBe(true);
  expect(fanLineNone).toBe(true);
});

// ── No old wf-* classes remain ───────────────────────────────────

test('no residual wf-* classes in the DOM', async ({ page }) => {
  test.setTimeout(60_000);
  await navigateToPortfolioPage(page, OASIS_PATH);

  const wfElements = await page.evaluate(() => {
    const all = document.querySelectorAll('[class*="wf-"]');
    return all.length;
  });
  expect(wfElements).toBe(0);
});
