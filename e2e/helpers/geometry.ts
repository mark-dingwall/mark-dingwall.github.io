import { type Page, type Locator } from '@playwright/test';

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

/** Get bounding box for a locator, throwing if invisible. */
export async function getBox(locator: Locator): Promise<Box> {
  const bb = await locator.boundingBox();
  if (!bb) throw new Error(`Element not visible: ${locator}`);
  return {
    x: bb.x,
    y: bb.y,
    width: bb.width,
    height: bb.height,
    right: bb.x + bb.width,
    bottom: bb.y + bb.height,
  };
}

/** Check if two boxes overlap. */
export function rectsOverlap(a: Box, b: Box): boolean {
  return a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y;
}

/** Check if a box extends beyond the viewport. */
export function overflowsViewport(box: Box, viewportWidth: number, viewportHeight: number): boolean {
  return box.right > viewportWidth || box.bottom > viewportHeight || box.x < 0 || box.y < 0;
}

/** Return the smaller of width/height — the minimum touch dimension. */
export function minTouchDimension(box: Box): number {
  return Math.min(box.width, box.height);
}

/** Check if page has horizontal overflow. */
export async function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
}

/** Get the element at a given point (for z-index / clickability checks). */
export async function elementAtPoint(page: Page, x: number, y: number): Promise<string | null> {
  return page.evaluate(
    ([px, py]) => {
      const el = document.elementFromPoint(px, py);
      return el ? el.tagName + (el.id ? '#' + el.id : '') + (el.className ? '.' + String(el.className).split(' ').join('.') : '') : null;
    },
    [x, y] as const,
  );
}
