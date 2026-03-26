import { type Page } from '@playwright/test';

const GSAP_SETTLE_MS = 1000;

/**
 * Scroll the page so that GSAP ScrollTrigger (tied to #runway) reaches
 * the given progress fraction (0–1).
 *
 * The scroll position is: runwayTop + (runwayHeight - viewportHeight) * progress
 */
export async function scrollToProgress(page: Page, progress: number) {
  await page.evaluate(
    (p) => {
      const runway = document.getElementById('runway');
      if (!runway) return;
      const rect = runway.getBoundingClientRect();
      const runwayTop = rect.top + window.scrollY;
      const scrollRange = runway.offsetHeight - window.innerHeight;
      const target = runwayTop + scrollRange * p;
      window.scrollTo({ top: target, behavior: 'instant' as ScrollBehavior });
    },
    progress,
  );
  // Wait for GSAP scrub smoothing (0.8s) to settle
  await page.waitForTimeout(GSAP_SETTLE_MS);
}

/**
 * Scroll past the runway into the tech-content section.
 */
export async function scrollToTechSection(page: Page) {
  await page.evaluate(() => {
    const tech = document.getElementById('tech-content');
    if (tech) {
      const rect = tech.getBoundingClientRect();
      const y = rect.top + window.scrollY - window.innerHeight * 0.3;
      window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
    }
  });
  await page.waitForTimeout(GSAP_SETTLE_MS);
}

/**
 * Scroll to the absolute bottom of the page.
 */
export async function scrollToBottom(page: Page) {
  await page.evaluate(() => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' as ScrollBehavior });
  });
  await page.waitForTimeout(GSAP_SETTLE_MS);
}
